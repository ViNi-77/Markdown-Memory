#!/usr/bin/env bash
set -euo pipefail

project_path="ios/MarkdownMemory/MarkdownMemory.xcodeproj"
target_name="MarkdownMemory"
derived_data_path="${RUNNER_TEMP:-/tmp}/markdown-memory-ios-derived-data"

xcodebuild -version
xcodebuild -showsdks
xcodebuild -list -project "$project_path"
xcodebuild \
  -project "$project_path" \
  -target "$target_name" \
  -configuration Debug \
  -sdk iphonesimulator \
  -derivedDataPath "$derived_data_path" \
  CODE_SIGNING_ALLOWED=NO \
  clean build
