"""Cut every figure out of the Rajesh sheets (column-gap segmentation) + numbered contact sheet."""
import json, os, sys
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

SRC, OUT = sys.argv[1], sys.argv[2]
os.makedirs(OUT, exist_ok=True)

SHEETS = {
    "hoodie": "Chibi Hoodie Hero Sprite Sheet.png",
    "air": "Chibi Hero’s Ten-Move Adventure.png",
    "sit": "Rajesh Chibi Pose Sprite Sheet.png",
    "wall": "Chibi Wall Climbing Adventure Sprite Sheet.png",
    "tech": "Chibi Techie Sticker Pose Collection.png",
    "vig": "Chibi Vigilante Action Pose Sprite Sheet.png",
    "lab": "Chibi Scientist Sticker Sheet.png",
    "noir": "Chibi Noir Detective Sprite Sheet.png",
    "jet": "Futuristic Jet Suit Hero Sprite Sheet.png",
}
# merged neighbours to split at the thinnest column inside [x0, x1]
FORCE_SPLIT = {"tech": [(150, 260)]}

def load(path):
    im = Image.open(path)
    if im.mode == "RGBA":
        return np.array(im)
    # Opaque black background with black outlines: build the silhouette from the
    # non-black pixels, close small gaps, fill enclosed dark areas (visor, suit
    # panels), then grow it so the outline ring is kept.
    rgb = np.array(im.convert("RGB"))
    fg = rgb.max(axis=2) > 14
    fg = ndimage.binary_closing(fg, iterations=4)
    fg = ndimage.binary_fill_holes(fg)
    fg = ndimage.binary_opening(fg, iterations=1)
    fg = ndimage.binary_dilation(fg, iterations=3)
    soft = ndimage.gaussian_filter(fg.astype(float), 0.8)
    alpha = np.clip(soft * 255, 0, 255).astype(np.uint8)
    return np.dstack([rgb, alpha])

meta = {}
for key, fname in SHEETS.items():
    a = load(os.path.join(SRC, fname))
    alpha = a[..., 3]
    solid = alpha > 100
    for x0, x1 in FORCE_SPLIT.get(key, []):  # cut a touching pair apart
        occ = solid.sum(axis=0)
        cut = x0 + int(np.argmin(occ[x0:x1]))
        solid[:, cut - 4:cut + 5] = False  # wider than the 2-px dilation below
    lab, n = ndimage.label(ndimage.binary_dilation(solid, iterations=2) & (alpha > 20))
    sizes = ndimage.sum(solid, lab, range(1, n + 1))
    big_ids = [i + 1 for i in range(n) if sizes[i] > 3000]
    big = np.isin(lab, big_ids)
    # every pixel → nearest big figure (keeps soft edges, zz/stars/smoke bits)
    dist, (iy, ix) = ndimage.distance_transform_edt(~big, return_indices=True)
    owner = lab[iy, ix]
    owner[(alpha <= 8) | (dist > 120)] = 0
    objs = ndimage.find_objects(owner)
    figs = []
    order = sorted(big_ids, key=lambda i: objs[i - 1][1].start)
    for i in order:
        sl = objs[i - 1]
        crop = a[sl].copy()
        crop[..., 3] = np.where(owner[sl] == i, crop[..., 3], 0)
        img = Image.fromarray(crop)
        img = img.crop(img.getchannel("A").point(lambda v: 255 if v > 24 else 0).getbbox())
        figs.append({"x": int(sl[1].start), "y": int(sl[0].start), "w": img.width, "h": img.height})
        img.save(os.path.join(OUT, f"{key}_{len(figs) - 1:02d}.png"))
    meta[key] = figs
    print(f"{key}: {len(figs)} figures  heights: {[f['h'] for f in figs]}")
json.dump(meta, open(os.path.join(OUT, "meta.json"), "w"), indent=1)

# contact sheet: one row per sheet, same scale as the source
rows = []
for key in SHEETS:
    ims = [Image.open(os.path.join(OUT, f"{key}_{i:02d}.png")) for i in range(len(meta[key]))]
    h = max(i.height for i in ims) + 30
    w = sum(i.width + 14 for i in ims)
    row = Image.new("RGBA", (w, h), (225, 228, 235, 255))
    d = ImageDraw.Draw(row)
    x = 0
    for i, im in enumerate(ims):
        row.alpha_composite(im, (x, 26 + (h - 26 - im.height)))
        d.text((x + 4, 4), f"{key}_{i}", fill=(0, 0, 0))
        x += im.width + 14
    rows.append(row)
W = max(r.width for r in rows)
sheet = Image.new("RGBA", (W, sum(r.height for r in rows)), (225, 228, 235, 255))
y = 0
for r in rows:
    sheet.alpha_composite(r, (0, y)); y += r.height
sheet = sheet.resize((W // 3, sheet.height // 3), Image.LANCZOS)
sheet.convert("RGB").save(os.path.join(OUT, "contact.png"))
