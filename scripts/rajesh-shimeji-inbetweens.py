"""
In-between frames for the Rajesh Shimeji, derived from existing poses.

The sheets only contain one crawl pose (68), one noir walk pose (110) and two
vigilante walk poses (84, 85). Moving a single pose across the floor looks like
sliding, so this script bakes small body motions into extra frames: a bob, a
lift and a tilt, all rotated around the feet anchor (160, 224) so the character
never jitters relative to the floor.

  python scripts/rajesh-shimeji-inbetweens.py public/shimeji/rajesh

Writes shime121.webp … shime130.webp (re-run safe).
"""
import os, sys
from PIL import Image

DIR = sys.argv[1]
FEET = (160, 224)

def variant(src: int, dst: int, dy: float = 0, rot: float = 0, sx: float = 1.0, sy: float = 1.0):
    im = Image.open(os.path.join(DIR, f"shime{src}.webp")).convert("RGBA")
    w, h = im.size
    if sx != 1.0 or sy != 1.0:  # squash/stretch around the feet
        nw, nh = round(w * sx), round(h * sy)
        scaled = im.resize((nw, nh), Image.LANCZOS)
        im = Image.new("RGBA", (w, h))
        im.alpha_composite(scaled, (round(FEET[0] - FEET[0] * sx), round(FEET[1] - FEET[1] * sy)))
    if rot:
        im = im.rotate(rot, resample=Image.BICUBIC, center=FEET)  # +rot = counter-clockwise
    if dy:
        out = Image.new("RGBA", (w, h))
        out.alpha_composite(im, (0, round(dy)))
        im = out
    im.save(os.path.join(DIR, f"shime{dst}.webp"), "WEBP", quality=86, method=6)

# crawl (frame 68 faces left; + rotation lifts the head end)
variant(68, 121, dy=-3, rot=3)             # reach: head and shoulders lift
variant(68, 122, dy=-1, rot=1.5, sx=1.03)  # stretch forward
variant(68, 123, dy=0, rot=-1.5, sy=0.97)  # knees come forward, body dips
variant(68, 124, dy=-2, rot=-2.5)          # hips lift
# vigilante walk: up-beat versions of the two stride poses
variant(84, 125, dy=-4, rot=1)
variant(85, 126, dy=-4, rot=-1)
# noir walk: a 4-beat strut from the one walking pose
variant(110, 127, dy=-4, rot=1.5)
variant(110, 128, dy=-1, rot=0.5)
variant(110, 129, dy=-4, rot=-1.5)
variant(110, 130, dy=-1, rot=-0.5)
print("wrote shime121–130")
