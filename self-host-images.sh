#!/bin/bash
# Downloads 12 stock images from Unsplash to /images/stock/
# HTML references already updated — just need the files.
# Run from repo root: bash self-host-images.sh

set -e
mkdir -p images/stock

echo "Downloading 12 images..."

curl -sL "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&q=80" -o images/stock/retail-store.jpg && echo "  ✓ retail-store.jpg"
curl -sL "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&q=80" -o images/stock/office-building.jpg && echo "  ✓ office-building.jpg"
curl -sL "https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&q=80" -o images/stock/modern-office.jpg && echo "  ✓ modern-office.jpg"
curl -sL "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=800&q=80" -o images/stock/hospital.jpg && echo "  ✓ hospital.jpg"
curl -sL "https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=1920&q=80" -o images/stock/network-cables.jpg && echo "  ✓ network-cables.jpg"
curl -sL "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&q=80" -o images/stock/retail-checkout.jpg && echo "  ✓ retail-checkout.jpg"
curl -sL "https://images.unsplash.com/photo-1557597774-9d273605dfa9?w=800&q=80" -o images/stock/server-room.jpg && echo "  ✓ server-room.jpg"
curl -sL "https://images.unsplash.com/photo-1558002038-bb4237bb5a2c?w=800&q=80" -o images/stock/security-camera.jpg && echo "  ✓ security-camera.jpg"
curl -sL "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800&q=80" -o images/stock/data-center.jpg && echo "  ✓ data-center.jpg"
curl -sL "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=800&q=80" -o images/stock/business-meeting.jpg && echo "  ✓ business-meeting.jpg"
curl -sL "https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc?w=800&q=80" -o images/stock/engineering.jpg && echo "  ✓ engineering.jpg"
curl -sL "https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?w=800&q=80" -o images/stock/construction.jpg && echo "  ✓ construction.jpg"

echo ""
echo "Done. Now run:"
echo "  git add -A"
echo "  git commit -m 'Add self-hosted stock images'"
echo "  git push origin main"

