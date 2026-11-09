"""
Build the Rajesh Shimeji frames from the extracted figures.

Canvas 320x320. The engine adds +96,+96 to every pose anchor, so the original
Shimeji anchor (64,128) is the feet point (160,224); ceiling anchor (64,48) is
the ceiling line y=144; edge-sitting anchor (64,112) puts the seat at y=208.
Sheets face right; everything is mirrored to the engine's left-facing default,
except the cursor-swing frames whose direction matters (see 7-10).
"""
import os, sys
from PIL import Image, ImageDraw

FIG, OUT, PREVIEW = sys.argv[1], sys.argv[2], sys.argv[3]
os.makedirs(OUT, exist_ok=True)
C, OFF, H_STAND = 320, 96, 140
FEET = (160, 224)
CEIL_Y = 48 + OFF
SEAT_Y = 112 + OFF
HOLD_Y = FEET[1] - 120 - 4  # the cursor sits 120 world px above the feet anchor

# standing height of the character on each sheet (head/hat included as drawn)
REF = {"hoodie": 339, "air": 339, "sit": 339, "wall": 352, "tech": 400, "vig": 385, "lab": 426, "noir": 452, "jet": 398}

def fig(key, i, mirror=True):
    im = Image.open(os.path.join(FIG, f"{key}_{i:02d}.png")).convert("RGBA")
    s = H_STAND / REF[key]
    im = im.resize((max(1, round(im.width * s)), max(1, round(im.height * s))), Image.LANCZOS)
    return im.transpose(Image.FLIP_LEFT_RIGHT) if mirror else im

def canvas():
    return Image.new("RGBA", (C, C), (0, 0, 0, 0))

def stand(im, foot_y=FEET[1], cx=FEET[0]):
    c = canvas(); c.alpha_composite(im, (cx - im.width // 2, foot_y - im.height)); return c

def hang(im, top_y):
    c = canvas(); c.alpha_composite(im, (FEET[0] - im.width // 2, top_y)); return c

def on_wall(im):
    c = canvas(); c.alpha_composite(im, (FEET[0], FEET[1] - im.height)); return c

def edge_sit(im, seat_frac):
    """Place so the seat (fraction of the figure height from the top) is on SEAT_Y."""
    c = canvas(); c.alpha_composite(im, (FEET[0] - im.width // 2, SEAT_Y - round(im.height * seat_frac))); return c

F = {}
idle = fig("hoodie", 0)
# ---- original Shimeji slot meanings (1-46)
F[1] = stand(idle)
F[2] = stand(fig("hoodie", 5)); F[3] = stand(fig("hoodie", 7))
F[4] = stand(fig("air", 2))                                   # falling (flail)
F[5] = hang(fig("wall", 6), HOLD_Y); F[6] = hang(fig("wall", 7), HOLD_Y)   # struggling while held
F[7] = hang(fig("wall", 5, mirror=False), HOLD_Y)            # swing: feet lag left (mild)
F[8] = hang(fig("wall", 5, mirror=True), HOLD_Y)             #        feet lag right (mild)
F[9] = hang(fig("wall", 6, mirror=False), HOLD_Y)            #        feet far left
F[10] = hang(fig("wall", 6, mirror=True), HOLD_Y)            #        feet far right
F[11] = stand(fig("sit", 0))                                  # sit cross-legged
F[12] = on_wall(fig("wall", 1)); F[13] = on_wall(fig("wall", 0)); F[14] = on_wall(fig("wall", 2))
for k, (key, i) in zip((15, 16, 17, 27, 28, 29), [("sit", 0), ("sit", 1), ("sit", 0), ("sit", 1), ("sit", 0), ("sit", 1)]):
    F[k] = stand(fig(key, i))
F[18] = stand(fig("air", 5)); F[19] = stand(fig("air", 6))    # landing squash / standing up
F[20] = stand(fig("air", 8))                                  # lying face down
F[21] = stand(fig("sit", 5))                                  # lying on stomach, propped up
F[22] = stand(fig("air", 1))                                  # jump
F[23] = hang(fig("wall", 4), CEIL_Y)                          # hanging from the ceiling
F[24] = hang(fig("wall", 5), CEIL_Y); F[25] = hang(fig("wall", 7), CEIL_Y)
F[26] = stand(fig("sit", 1))                                  # sit, looking up
F[30] = edge_sit(fig("sit", 2), 0.62)                         # sitting on an edge, legs dangling
F[31] = edge_sit(fig("sit", 2), 0.62)
F[32] = edge_sit(fig("sit", 3), 0.66)
F[33] = edge_sit(fig("sit", 4), 0.62)
for k in range(34, 47):                                       # carry-window / cloning slots: unused
    F[k] = F[1]
# ---- extras
for k, i in zip(range(47, 51), range(0, 4)):
    F[k] = stand(fig("hoodie", i))                            # 47-50 idle cycle
for k, i in zip(range(51, 55), range(4, 8)):
    F[k] = stand(fig("hoodie", i))                            # 51-54 walk
for k, i in zip(range(55, 59), range(8, 12)):
    F[k] = stand(fig("hoodie", i))                            # 55-58 run
F[59] = stand(fig("hoodie", 12))                              # sprint
F[60] = stand(fig("air", 0)); F[61] = stand(fig("air", 3)); F[62] = stand(fig("air", 4))
F[63] = stand(fig("air", 7)); F[64] = stand(fig("air", 9))
F[65] = stand(fig("sit", 6)); F[66] = stand(fig("sit", 7)); F[67] = stand(fig("sit", 8)); F[68] = stand(fig("sit", 9))
F[69] = on_wall(fig("wall", 3)); F[70] = hang(fig("wall", 4), HOLD_Y)
for n, key, count in ((71, "tech", 12), (83, "vig", 8), (91, "lab", 10), (101, "noir", 10), (111, "jet", 10)):
    for i in range(count):
        F[n + i] = stand(fig(key, i))

total = 0
for k, im in F.items():
    p = os.path.join(OUT, f"shime{k}.webp")
    im.save(p, "WEBP", quality=86, method=6)
    total += os.path.getsize(p)
print(len(F), "frames,", round(total / 1024), "KB")

# preview with anchors
mark = {k: FEET for k in F}
for k in (23, 24, 25):
    mark[k] = (FEET[0], CEIL_Y)
for k in (30, 31, 32, 33):
    mark[k] = (FEET[0], SEAT_Y)
for k in (5, 6, 7, 8, 9, 10, 70):
    mark[k] = (FEET[0], FEET[1] - 120)
cell, cols = 162, 12
keys = sorted(F)
pv = Image.new("RGBA", (cols * cell, ((len(keys) + cols - 1) // cols) * cell), (205, 210, 220, 255))
d = ImageDraw.Draw(pv)
for idx, k in enumerate(keys):
    cx, cy = (idx % cols) * cell, (idx // cols) * cell
    pv.alpha_composite(F[k].resize((160, 160), Image.LANCZOS), (cx + 1, cy + 1))
    ax, ay = mark[k]
    d.line([cx + 1, cy + 1 + ay // 2, cx + 160, cy + 1 + ay // 2], fill=(120, 140, 210))
    d.ellipse([cx + 1 + ax // 2 - 3, cy + 1 + ay // 2 - 3, cx + 1 + ax // 2 + 3, cy + 1 + ay // 2 + 3], fill=(230, 30, 60))
    d.rectangle([cx, cy, cx + cell - 1, cy + cell - 1], outline=(150, 150, 165))
    d.text((cx + 4, cy + 3), str(k), fill=(0, 0, 0))
pv.convert("RGB").save(PREVIEW)
