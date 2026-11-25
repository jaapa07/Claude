"""Gera todos os assets do AREIA QUENTE a partir de .cache/src (rode antes: node scripts/fetch-assets.mjs).
Blender: usa o módulo `bpy` (pip install bpy, Python 3.11) via a variável BLENDER_PY (padrão: python3.11)."""
import os, subprocess, sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
BPY = os.environ.get('BLENDER_PY', 'python3.11')
PY = sys.executable


def run(*cmd):
    print('>>', ' '.join(cmd), flush=True)
    subprocess.run(cmd, check=True, cwd=ROOT)


run(PY, 'scripts/build_data.py')
run(BPY, 'scripts/blender/build_player.py')
run(PY, 'scripts/build_skins.py')
run(PY, 'scripts/build_textures.py')
run(BPY, 'scripts/blender/build_props.py')
run(BPY, 'scripts/blender/build_arena.py')
run(PY, 'scripts/build_ui.py')
run(PY, 'scripts/build_audio.py')
run(PY, 'scripts/build_credits.py')
print('Todos os assets gerados em public/assets')
