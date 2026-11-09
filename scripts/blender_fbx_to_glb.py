"""
Convert Mixamo FBX downloads to GLB with Blender (no UI).

  blender -b -P scripts/blender_fbx_to_glb.py -- <input_dir> <output_dir>

- The character itself: download from Mixamo "With Skin" (T-pose) -> rajesh.fbx -> rajesh.glb
- Each animation: download "Without Skin", In Place ticked where offered -> <name>.fbx -> <name>.glb
Every output keeps the Mixamo bone names, so the clips drive the character directly.
"""
import bpy, os, sys

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
if len(argv) < 2:
    print("usage: blender -b -P blender_fbx_to_glb.py -- <input_dir> <output_dir>")
    sys.exit(1)
src, dst = argv[0], argv[1]
os.makedirs(dst, exist_ok=True)

for name in sorted(os.listdir(src)):
    if not name.lower().endswith(".fbx"):
        continue
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.fbx(filepath=os.path.join(src, name), automatic_bone_orientation=False)
    # one clip per file: name it after the file so CLIP_CANDIDATES can match it
    clip = os.path.splitext(name)[0]
    for action in bpy.data.actions:
        action.name = clip
    out = os.path.join(dst, clip.lower().replace(" ", "-") + ".glb")
    bpy.ops.export_scene.gltf(
        filepath=out,
        export_format="GLB",
        export_animations=True,
        export_skins=True,
        export_morph=True,
        export_yup=True,
        export_apply=False,
    )
    print("wrote", out)
