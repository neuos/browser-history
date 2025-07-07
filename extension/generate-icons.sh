#!/bin/bash

# Script to generate theme-aware icons from SVG files
# Requires: librsvg2-bin (for rsvg-convert)

# Check if rsvg-convert is available
if ! command -v rsvg-convert &> /dev/null; then
    echo "Error: rsvg-convert not found. Please install librsvg2-bin:"
    echo "  macOS: brew install librsvg"
    echo "  Ubuntu/Debian: sudo apt-get install librsvg2-bin"
    exit 1
fi

# Create directories if they don't exist
mkdir -p "public/icon"
mkdir -p "public/icon-dark"

echo "Generating light mode icons..."
# Generate light mode icons (current icons)
rsvg-convert -w 16 -h 16 public/timeline-light.svg > public/icon/16.png
rsvg-convert -w 32 -h 32 public/timeline-light.svg > public/icon/32.png
rsvg-convert -w 48 -h 48 public/timeline-light.svg > public/icon/48.png
rsvg-convert -w 96 -h 96 public/timeline-light.svg > public/icon/96.png
rsvg-convert -w 128 -h 128 public/timeline-light.svg > public/icon/128.png

echo "Generating dark mode icons..."
# Generate dark mode icons
rsvg-convert -w 16 -h 16 public/timeline-dark.svg > public/icon-dark/16.png
rsvg-convert -w 32 -h 32 public/timeline-dark.svg > public/icon-dark/32.png
rsvg-convert -w 48 -h 48 public/timeline-dark.svg > public/icon-dark/48.png
rsvg-convert -w 96 -h 96 public/timeline-dark.svg > public/icon-dark/96.png
rsvg-convert -w 128 -h 128 public/timeline-dark.svg > public/icon-dark/128.png

echo "✅ Theme-aware icons generated successfully!"
echo "Light mode icons: public/icon/"
echo "Dark mode icons: public/icon-dark/"
