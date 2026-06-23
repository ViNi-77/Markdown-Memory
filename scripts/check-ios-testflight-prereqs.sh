#!/usr/bin/env bash
set -euo pipefail

project_path="ios/MarkdownMemory/MarkdownMemory.xcodeproj"
target_name="MarkdownMemory"
expected_bundle_id="com.vini.markdownmemory"
expected_marketing_version="1.0.0"
expected_build_number="1"

failures=0
xcodebuild_available=false
xcode_project_readable=false
release_build_settings_file=""
release_build_settings_available=false

cleanup() {
  rm -f "$release_build_settings_file"
}
trap cleanup EXIT

pass() {
  printf 'PASS %s\n' "$1"
}

warn() {
  printf 'WARN %s\n' "$1"
}

fail() {
  printf 'FAIL %s\n' "$1"
  failures=$((failures + 1))
}

read_project_build_setting_values() {
  local key="$1"
  { grep -E "^[[:space:]]*${key} = " "$project_path/project.pbxproj" || true; } \
    | sed -E "s/^[[:space:]]*${key} = //; s/;[[:space:]]*$//" \
    | sort -u
}

load_release_build_settings() {
  local attempt

  release_build_settings_file="$(mktemp)"
  for attempt in 1 2 3; do
    if xcodebuild \
      -project "$project_path" \
      -scheme "$target_name" \
      -configuration Release \
      -destination 'generic/platform=iOS' \
      -showBuildSettings >"$release_build_settings_file" 2>/dev/null; then
      release_build_settings_available=true
      return 0
    fi
    sleep 2
  done

  release_build_settings_file=""
  return 1
}

read_release_build_setting() {
  local key="$1"
  awk -F ' = ' -v key="$key" '$1 ~ "^[[:space:]]*" key "$" && !seen { print $2; seen = 1 }' \
    "$release_build_settings_file"
}

check_build_setting() {
  local key="$1"
  local expected="$2"
  local label="$3"

  if [[ "$release_build_settings_available" == true ]]; then
    local value
    value="$(read_release_build_setting "$key")"
    if [[ "$value" == "$expected" ]]; then
      pass "$label is $expected for Release"
    else
      fail "$label is '$value' for Release; expected '$expected'"
    fi
    return
  fi

  local values
  values="$(read_project_build_setting_values "$key")"
  if [[ "$values" == "$expected" ]]; then
    pass "$label is $expected in all project configurations"
  else
    fail "$label values are '$values'; expected only '$expected'"
  fi
}

printf 'Markdown Memory iOS TestFlight preflight\n'
printf 'Project: %s\n\n' "$project_path"

developer_dir="$(xcode-select -p 2>/dev/null || true)"
if [[ -n "$developer_dir" && -d "$developer_dir/Platforms/iPhoneOS.platform" ]]; then
  pass "xcode-select points to a full Xcode developer directory"
elif [[ -n "$developer_dir" ]]; then
  fail "xcode-select points to '$developer_dir', which does not look like a full Xcode developer directory"
  printf '     Run after installing Xcode: sudo xcode-select -s /Applications/Xcode.app/Contents/Developer\n'
else
  fail "xcode-select did not return a developer directory"
fi

if command -v xcodebuild >/dev/null 2>&1 && xcodebuild -version >/dev/null 2>&1; then
  pass "xcodebuild is available"
  xcodebuild -version | sed 's/^/     /'
  xcodebuild_available=true
else
  fail "xcodebuild is not available with the selected developer directory"
fi

if [[ -d "$project_path" ]]; then
  pass "Xcode project exists"
else
  fail "Xcode project is missing at $project_path"
fi

if [[ "$xcodebuild_available" == true ]] && xcodebuild -list -project "$project_path" >/dev/null 2>&1; then
  pass "xcodebuild can read the project"
  xcode_project_readable=true
  if ! load_release_build_settings; then
    warn "Release build settings could not be read directly; falling back to project configuration values"
  fi
else
  fail "xcodebuild cannot read the project yet"
fi

check_build_setting PRODUCT_BUNDLE_IDENTIFIER "$expected_bundle_id" "Bundle ID"
check_build_setting MARKETING_VERSION "$expected_marketing_version" "Marketing version"
check_build_setting CURRENT_PROJECT_VERSION "$expected_build_number" "Build number"

if command -v security >/dev/null 2>&1; then
  identities="$(security find-identity -v -p codesigning 2>/dev/null || true)"
  apple_distribution_count="$(printf '%s\n' "$identities" | grep -c 'Apple Distribution' || true)"
  apple_development_count="$(printf '%s\n' "$identities" | grep -c 'Apple Development' || true)"

  if [[ "$apple_distribution_count" -gt 0 ]]; then
    pass "Apple Distribution signing identity is available"
  elif [[ "$apple_development_count" -gt 0 ]]; then
    warn "Apple Development signing identity exists, but no Apple Distribution identity was found"
  else
    warn "No Apple signing identity was found yet; Xcode may create one after Team selection"
  fi
else
  warn "security command is unavailable; signing identity was not checked"
fi

printf '\n'
if [[ "$failures" -eq 0 ]]; then
  pass "Phase 16B local preflight checks passed"
  printf 'Next: open %s, select your Team, then Archive for App Store Connect upload.\n' "$project_path"
else
  fail "$failures required preflight check(s) failed"
  exit 1
fi
