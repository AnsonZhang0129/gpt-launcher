#!/bin/sh
set -eu
ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
BUILD="${GPT_LAUNCHER_NATIVE_BUILD_DIR:-$ROOT/build}"
APP="$BUILD/GPT Launcher.app"
mkdir -p "$APP/Contents/MacOS" "$APP/Contents/Resources" "$BUILD/AppIcon.iconset"
if [ ! -f "$ROOT/build/Animation.html" ]; then
  echo 'Build Animation.html first (web build). Expected build/Animation.html.' >&2
  exit 1
fi
for ARCH in arm64 x86_64; do
  swiftc -O -target "${ARCH}-apple-macos13.0" "$ROOT/native/Launcher.swift" -o "$BUILD/GPTLauncher-$ARCH" -framework AppKit -framework WebKit -framework UniformTypeIdentifiers
done
lipo -create "$BUILD/GPTLauncher-arm64" "$BUILD/GPTLauncher-x86_64" -output "$APP/Contents/MacOS/GPTLauncher"
swift "$ROOT/native/MakeIcon.swift" "$BUILD/icon-1024.png"
for SIZE in 16 32 128 256 512; do
  sips -z "$SIZE" "$SIZE" "$BUILD/icon-1024.png" --out "$BUILD/AppIcon.iconset/icon_${SIZE}x${SIZE}.png" >/dev/null
  DOUBLE=$((SIZE * 2))
  sips -z "$DOUBLE" "$DOUBLE" "$BUILD/icon-1024.png" --out "$BUILD/AppIcon.iconset/icon_${SIZE}x${SIZE}@2x.png" >/dev/null
done
iconutil -c icns "$BUILD/AppIcon.iconset" -o "$APP/Contents/Resources/AppIcon.icns"
cp "$ROOT/build/Animation.html" "$APP/Contents/Resources/Animation.html"
cp "$ROOT/LICENSE" "$APP/Contents/Resources/LICENSE"
if [ -d "$ROOT/docs/licenses" ]; then cp -R "$ROOT/docs/licenses" "$APP/Contents/Resources/"; fi
if [ -f "$ROOT/THIRD_PARTY_NOTICES.md" ]; then cp "$ROOT/THIRD_PARTY_NOTICES.md" "$APP/Contents/Resources/"; fi
cat > "$APP/Contents/Info.plist" <<'PLIST'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
<key>CFBundleName</key><string>GPT Launcher</string>
<key>CFBundleDisplayName</key><string>GPT Launcher</string>
<key>CFBundleExecutable</key><string>GPTLauncher</string>
<key>CFBundleIdentifier</key><string>org.anson.gptlauncher</string>
<key>CFBundleVersion</key><string>3</string>
<key>CFBundleShortVersionString</key><string>0.1.0</string>
<key>CFBundleDevelopmentRegion</key><string>en</string>
<key>CFBundleLocalizations</key><array><string>en</string><string>zh-Hans</string></array>
<key>CFBundlePackageType</key><string>APPL</string>
<key>CFBundleIconFile</key><string>AppIcon.icns</string>
<key>LSMinimumSystemVersion</key><string>13.0</string>
<key>NSHighResolutionCapable</key><true/>
<key>NSPrincipalClass</key><string>NSApplication</string>
</dict></plist>
PLIST
xattr -cr "$APP"
codesign --force --sign - "$APP"
codesign --verify --deep --strict "$APP"
printf '%s\n' "$APP"
