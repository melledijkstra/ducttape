#!/bin/bash

# Fixes macOS file system timestamps using embedded MP4 metadata from GoPro
# Uses: CreateDate -> FileCreateDate & FileModifyDate

# Requires: exiftool (install via `brew install exiftool`)
# Usage: ./fix_gopro_timestamps.sh /path/to/folder

# Set log file
LOGFILE="$HOME/fix_gopro_timestamp_log.txt"
exec > >(tee -a "$LOGFILE") 2>&1
echo "🔧 Run started at: $(date)"

# Check for dependencies
if ! command -v /opt/homebrew/bin/exiftool &> /dev/null; then
  echo "Error: /opt/homebrew/bin/exiftool not found. Please install it with: brew install exiftool"
  exit 1
fi

# Check input
if [ -z "$1" ]; then
  echo "Usage: $0 /path/to/folder"
  exit 1
fi

FOLDER="$1"

echo "📂 Fixing timestamps in folder: '$FOLDER'"

# Define supported extensions
EXTENSIONS=("MP4" "JPG")

for EXT in "${EXTENSIONS[@]}"; do
  # Find files NOT already processed (system CreateDate still default or empty)
  find "$FOLDER" -type f -iname "*.${EXT}" ! -iname "*_original" | while read -r file; do
    # Check if the system-level timestamp is suspicious (e.g., 1970 or 2000)
    echo "🛠 Fixing: $(basename "$file")"
    /opt/homebrew/bin/exiftool \
      "-FileCreateDate<CreateDate" \
      "-FileModifyDate<CreateDate" \
      "$file"
  done
done

# Optional: remove backup files
# read -p "Delete backup _original files? [y/N] " confirm
# if [[ "$confirm" =~ ^[Yy]$ ]]; then
#   # rm "$FOLDER"/*_original
#   echo "🧹 Backup files deleted."
# else
#   echo "Backup files kept."
# fi

echo "✅ Done."