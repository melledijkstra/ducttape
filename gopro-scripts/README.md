# Solution: Extract and Sync GoPro Internal Date → File System Date
You can use ExifTool to read the correct timestamp from the GoPro video metadata, and set the macOS file's modification and creation date accordingly.

## 🤨 Why This Happens
GoPro embeds correct metadata inside the MP4

macOS Finder uses file system-level timestamps, which often reset to 1 Jan 1970 if the GoPro clock was off or the internal battery is not working correctly anymore.

ExifTool can sync these so everything matches.

## 🛠 Step-by-Step

### 1. Install ExifTool (if not yet done)
```bash
brew install exiftool
```

### 2. Test on One Video
Run this to see the embedded creation date:
```bash
exiftool -time:all -a -G1 -s /path/to/your/video.mp4
```

Look for fields like:

- `QuickTime:CreateDate` 
- `MediaCreateDate`
- `TrackCreateDate`
- `ContentCreateDate`

One of these should reflect the correct date.

### 3. Update the File System Timestamp Based on Metadata
Let’s say CreateDate is accurate. Then run:

```bash
exiftool "-FileCreateDate<CreateDate" "-FileModifyDate<CreateDate" /path/to/video.mp4
```

This copies the internal metadata to the macOS file timestamps.

### 4. Verify in Finder
Now Finder’s “Created” and “Modified” fields should show the correct values.

### 5. (Optional) Batch All Videos
If it worked:

```bash
exiftool "-FileCreateDate<CreateDate" "-FileModifyDate<CreateDate" /your/folder/*.MP4
```
