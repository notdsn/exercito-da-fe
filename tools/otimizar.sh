#!/bin/bash
# Otimiza os GLBs da Tripo (originais em ~/Downloads ficam intactos)
SRC="${1:-$HOME/Downloads}"; DST="$(dirname "$0")/../assets/models"
for f in "$SRC"/*.glb; do
  n=$(basename "$f")
  npx gltf-transform optimize "$f" "$DST/$n" --texture-compress webp --texture-size 1024 --compress meshopt \
    --flatten false --simplify false --palette false --instance false --join false > /dev/null 2>"/tmp/opt_$n.log" || echo "FALHOU $n"
done
