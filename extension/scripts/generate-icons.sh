#!/bin/bash

# Generate light and dark mode icons from an svg
# This script creates PNG files in various sizes for both light and dark themes

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PUBLIC_DIR="$SCRIPT_DIR/../public"
SVG_FILE="timeline.svg"
SVG_PATH="$PUBLIC_DIR/$SVG_FILE"

SIZES=(16 32 48 96 128)
LIGHT_MODE_COLOR="#1f1f1f"
DARK_MODE_COLOR="#e0e0e0"

echo "🎨 Generating theme-aware icons from $SVG_FILE"

# Check if ImageMagick is available
if ! command -v magick &> /dev/null; then
    echo "❌ ImageMagick is required but not installed."
    echo "   Install with: brew install imagemagick"
    exit 1
fi

# Create directories
mkdir -p "$PUBLIC_DIR/icon"
mkdir -p "$PUBLIC_DIR/icon-dark"

create_png() {
    local svg_file="$1"
    local size="$2"
    local output_path="$3"
    local color="$4"
    magick \
        -background none "$svg_file" \
        -fill "$color" -colorize 100 \
        -resize "${size}x${size}" \
        "$output_path/${size}.png"
}

# Generate light mode icons
echo "Generating light mode icons"
for size in "${SIZES[@]}"; do
    echo "  Creating ${size}x${size} light mode icon"
    create_png "$SVG_PATH" "$size" "$PUBLIC_DIR/icon" "$LIGHT_MODE_COLOR"
done

# Generate dark mode icons
echo "Generating dark mode icons"
for size in "${SIZES[@]}"; do
    echo "  Creating ${size}x${size} dark mode icon"
    create_png "$SVG_PATH" "$size" "$PUBLIC_DIR/icon-dark" "$DARK_MODE_COLOR"
done

echo "✅ Icon generation complete!"
echo "   Light mode icons: $PUBLIC_DIR/icon/"
echo "   Dark mode icons:  $PUBLIC_DIR/icon-dark/"
