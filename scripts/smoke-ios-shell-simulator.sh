#!/usr/bin/env bash
set -euo pipefail

bundle_id="com.vini.markdownmemory"
derived_data_path="${RUNNER_TEMP:-/tmp}/markdown-memory-ios-derived-data"
app_path="$derived_data_path/Build/Products/Debug-iphonesimulator/Markdown Memory.app"
screenshot_path="${RUNNER_TEMP:-/tmp}/markdown-memory-ios-shell.png"

run_with_timeout() {
  local seconds="$1"
  shift

  "$@" &
  local command_pid=$!

  (
    sleep "$seconds"
    if kill -0 "$command_pid" >/dev/null 2>&1; then
      echo "Command timed out after ${seconds}s: $*" >&2
      kill -TERM "$command_pid" >/dev/null 2>&1 || true
      sleep 5
      kill -KILL "$command_pid" >/dev/null 2>&1 || true
    fi
  ) &
  local watchdog_pid=$!

  set +e
  wait "$command_pid"
  local command_status=$?
  set -e

  kill "$watchdog_pid" >/dev/null 2>&1 || true
  wait "$watchdog_pid" >/dev/null 2>&1 || true

  return "$command_status"
}

launch_app() {
  local attempt

  for attempt in 1 2; do
    echo "Launching app (attempt $attempt)"
    if run_with_timeout 180 xcrun simctl launch "$device_udid" "$bundle_id"; then
      return 0
    fi

    echo "Warning: simulator launch attempt $attempt failed; preparing retry" >&2
    xcrun simctl terminate "$device_udid" "$bundle_id" >/dev/null 2>&1 || true
    run_with_timeout 120 xcrun simctl bootstatus "$device_udid" -b >/dev/null 2>&1 || true
    sleep 15
  done

  echo "App launch failed after retry" >&2
  return 1
}

if [[ ! -d "$app_path" ]]; then
  scripts/verify-ios-shell.sh
fi

device_udid="$(
  xcrun simctl list devices available -j | python3 -c '
import json
import sys

data = json.load(sys.stdin)
fallback = None
for runtime, devices in data.get("devices", {}).items():
    if "iOS" not in runtime:
        continue
    for device in devices:
        if device.get("isAvailable") and "iPhone" in device.get("name", ""):
            fallback = fallback or device["udid"]
            if device.get("state") == "Shutdown":
                print(device["udid"])
                raise SystemExit(0)
if fallback:
    print(fallback)
    raise SystemExit(0)
raise SystemExit("No available iPhone simulator found")
'
)"

device_name="$(
  xcrun simctl list devices available -j | python3 -c "
import json
import sys

udid = '$device_udid'
data = json.load(sys.stdin)
for devices in data.get('devices', {}).values():
    for device in devices:
        if device.get('udid') == udid:
            print(device.get('name', udid))
            raise SystemExit(0)
print(udid)
"
)"

echo "Using iPhone simulator: $device_name ($device_udid)"

cleanup() {
  run_with_timeout 20 xcrun simctl io "$device_udid" screenshot "$screenshot_path" >/dev/null 2>&1 || true
  xcrun simctl shutdown "$device_udid" >/dev/null 2>&1 || true
}
trap cleanup EXIT

xcrun simctl boot "$device_udid" >/dev/null 2>&1 || true
echo "Waiting for simulator boot"
run_with_timeout 180 xcrun simctl bootstatus "$device_udid" -b
echo "Installing app"
run_with_timeout 240 xcrun simctl install "$device_udid" "$app_path"
launch_app

# Give SFSafariViewController enough time to present and load the Production URL.
sleep 15
echo "Capturing simulator screenshot"
if run_with_timeout 90 xcrun simctl io "$device_udid" screenshot "$screenshot_path"; then
  echo "Simulator screenshot saved to $screenshot_path"
else
  echo "Warning: simulator screenshot capture failed or timed out; launch smoke already completed" >&2
fi
