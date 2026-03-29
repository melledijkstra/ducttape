# This is a quick action installable MacOS script
# Make this run as a Shell script "/bin/bash"
# And as input provide the "files or folders" in "Finder.app"
# Ask for confirmation (macOS GUI dialog)
osascript -e 'display dialog "Fix timestamps for selected GoPro files in folder: '"$@"'?" buttons {"Cancel", "OK"} default button "OK"' || exit 1

for f in "$@"; do
  	/Users/dijksmel/Movies/fix_gopro_timestamps.sh "$f"
done

osascript -e 'display dialog "Timestamps fixed!" buttons {"OK"} default button "OK"'