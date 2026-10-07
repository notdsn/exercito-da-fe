#!/bin/bash
# Importa personagens gerados na Tripo (estilo chibi) para o jogo.
#   uso: bash tools/importar_personagens.sh [pasta_origem ...]
# Pastas padrão: ~/Downloads/tripo_personagens e ~/Downloads/tripo_chibi  (originais NÃO são alterados)
# Cada <slug>.glb vira assets/models/<slug>.glb otimizado (texturas WebP 1024 + malha meshopt).
# Atualiza assets/models/modelos.json (o jogo só carrega o que está listado) e
# assets/models/chibi.json (esses não recebem o ajuste "chibi" por ossos no jogo).
# Qual arquivo cada unidade usa: tabela ARQUIVO em js/units.js (ex.: davi -> davi.glb, senão
# arqueiro_capa_vermelha.glb; esqueleto_chifres -> esqueleto_chifrudo; figura_sombria -> mago_sombrio).
set -u
RAIZ="$(cd "$(dirname "$0")/.." && pwd)"; DST="$RAIZ/assets/models"
if [ $# -gt 0 ]; then PASTAS=("$@"); else PASTAS=("$HOME/Downloads/tripo_personagens" "$HOME/Downloads/tripo_chibi"); fi
if command -v gltf-transform >/dev/null; then GT=(gltf-transform)
elif [ -x "$RAIZ/../tools/node_modules/.bin/gltf-transform" ]; then GT=("$RAIZ/../tools/node_modules/.bin/gltf-transform")
elif [ -x "$RAIZ/node_modules/.bin/gltf-transform" ]; then GT=("$RAIZ/node_modules/.bin/gltf-transform")
else GT=(npx --yes @gltf-transform/cli); fi
IMPORTADOS=()
for SRC in "${PASTAS[@]}"; do
  [ -d "$SRC" ] || { echo "pasta não existe (ainda): $SRC"; continue; }
  for f in "$SRC"/*.glb; do
    [ -f "$f" ] || continue
    s=$(basename "$f" .glb); IMPORTADOS+=("$s")
    if [ -f "$DST/$s.glb" ] && [ "$DST/$s.glb" -nt "$f" ]; then echo "já importado: $s"; continue; fi
    if "${GT[@]}" optimize "$f" "$DST/$s.glb" --texture-compress webp --texture-size 1024 --compress meshopt \
        --flatten false --simplify false --palette false --instance false --join false > /tmp/importar_$s.log 2>&1; then
      echo "ok: $s ($(du -h "$f" | cut -f1) -> $(du -h "$DST/$s.glb" | cut -f1))"
    else echo "FALHOU: $s (veja /tmp/importar_$s.log)"; fi
  done
done
python3 - "$DST" "${IMPORTADOS[@]}" <<'PY'
import json, os, sys
d, novos = sys.argv[1], sys.argv[2:]
ids = sorted(f[:-4] for f in os.listdir(d) if f.lower().endswith('.glb'))
json.dump(ids, open(os.path.join(d, 'modelos.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
cj = os.path.join(d, 'chibi.json')
chibi = set(json.load(open(cj, encoding='utf-8'))) if os.path.exists(cj) else set()
chibi |= set(novos)
json.dump(sorted(c for c in chibi if c in ids), open(cj, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('modelos.json:', len(ids), 'modelos | chibi.json:', len(chibi), 'chibi')
PY
