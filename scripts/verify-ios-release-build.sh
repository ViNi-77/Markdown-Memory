#!/usr/bin/env bash
set -euo pipefail

project_path="ios/MarkdownMemory/MarkdownMemory.xcodeproj"
target_name="MarkdownMemory"
derived_data_path="${RUNNER_TEMP:-/tmp}/markdown-memory-ios-release-derived-data"

xcodebuild -version
xcodebuild \
  -project "$project_path" \
  -scheme "$target_name" \
  -configuration Release \
  -sdk iphonesimulator \
  -destination "generic/platform=iOS Simulator" \
  -derivedDataPath "$derived_data_path" \
  CODE_SIGNING_ALLOWED=NO \
  clean build
