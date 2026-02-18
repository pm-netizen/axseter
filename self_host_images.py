#!/usr/bin/env python3
"""
Run locally: python3 self_host_images.py
Downloads all 12 Unsplash images, saves to images/, and updates HTML references sitewide.
"""
import os, re, subprocess

REPO = os.path.dirname(os.path.abspath(__file__))

# Map: Unsplash URL fragment → local filename
IMAGES = {
    "photo-1544197150-b99a580bb7a8?w=1920&q=75": "hero-cabling-panel.jpg",
    "photo-1519494026892-80bbd2d6fd0d?w=800&q=75":  "industry-healthcare.jpg",
    "photo-1486406146926-c627a92ad1ab?w=800&q=75":  "industry-financial.jpg",
    "photo-1441986300917-64674bd600d8?w=800&q=75":  "industry-retail.jpg",
    "photo-1497366216548-37526070297c?w=800&q=75":  "office-modern.jpg",
    "photo-1556742049-0cfed4f6a45d?w=800&q=75":    "retail-checkout.jpg",
    "photo-1557597774-9d273605dfa9?w=800&q=75":    "surveillance-camera-ext.jpg",
    "photo-1558002038-bb4237bb5a2c?w=800&q=75":    "access-control-reader.jpg",
    "photo-1558494949-ef010cbdcc31?w=800&q=75":    "cabling-server-room.jpg",
    "photo-1560472354-b33ff0c44a43?w=800&q=75":    "financial-office-modern.jpg",
    "photo-1581092580497-e0d23cbdf1dc?w=800&q=75":  "engineering-blueprints.jpg",
    "photo-1581092918056-0c4c3acd3789?w=800&q=75":  "technician-repair.jpg",
}

# Also map the q=80 variants (what's actually in the HTML)
URL_REPLACEMENTS = {}
for url_frag, filename in IMAGES.items():
    photo_id = url_frag.split("?")[0]
    # Match any w= and q= params for this photo
    URL_REPLACEMENTS[photo_id] = filename

print(f"Downloading {len(IMAGES)} images...")
img_dir = os.path.join(REPO, "images")
os.makedirs(img_dir, exist_ok=True)

for url_frag, filename in IMAGES.items():
    url = f"https://images.unsplash.com/{url_frag}"
    dest = os.path.join(img_dir, filename)
    print(f"  ↓ {filename}...", end=" ", flush=True)
    result = subprocess.run(["curl", "-sL", "-o", dest, url], capture_output=True, timeout=30)
    if os.path.exists(dest) and os.path.getsize(dest) > 1000:
        print(f"{os.path.getsize(dest)//1024}KB ✓")
    else:
        print("FAILED ✗")

print("\nUpdating HTML references...")
count = 0
for root, _, files in os.walk(REPO):
    for f in files:
        if not f.endswith(".html"):
            continue
        filepath = os.path.join(root, f)
        with open(filepath) as fh:
            content = fh.read()
        original = content
        
        for photo_id, filename in URL_REPLACEMENTS.items():
            # Replace any Unsplash URL containing this photo ID
            pattern = rf'https://images\.unsplash\.com/{re.escape(photo_id)}\?[^"]*'
            content = re.sub(pattern, f'/images/{filename}', content)
        
        if content != original:
            with open(filepath, "w") as fh:
                fh.write(content)
            count += 1
            print(f"  ✓ {os.path.relpath(filepath, REPO)}")

print(f"\nDone. Updated {count} files.")
print("Run: git add -A && git commit -m 'self-host Unsplash images' && git push")
