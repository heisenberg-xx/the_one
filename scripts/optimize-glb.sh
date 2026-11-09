#!/usr/bin/env bash
# Shrinks a GLB for the web (meshopt geometry + WebP textures, 1024px max).
# Check `npx @gltf-transform/cli optimize --help` if a flag has changed in your version.
set -euo pipefail
in="${1:?usage: scripts/optimize-glb.sh in.glb out.glb}"
out="${2:?usage: scripts/optimize-glb.sh in.glb out.glb}"
npx --yes @gltf-transform/cli optimize "$in" "$out" --compress meshopt --texture-compress webp --texture-size 1024
ls -lh "$in" "$out"
