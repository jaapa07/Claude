"""cover.py N : the 2.5 s cover in front of episode N.
  1. renders film.html?ep=cN (75 frames) into episodes/epN/cover/frames, plus out/capas/capa_epN.jpg (frame 0, the thumbnail)
  2. voices the announcement with the Controle's robot voice (Kokoro PT-BR + the same ffmpeg chain as tools/voice.py)
     over a fanfare, sparkle and whoosh from tools/mix.py
  3. encodes it with the episode's exact settings and joins it to out/corpo/epN.mp4 -> out/epN.mp4 (92.5 s), then checks it"""
import os, shutil, subprocess, sys
import numpy as np, soundfile as sf
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE); OUT = os.path.join(ROOT, 'out')
sys.path.insert(0, HERE)
n = sys.argv[1]; d = os.path.join(ROOT, 'episodes', f'ep{n}', 'cover'); fr = os.path.join(d, 'frames')
def run(*a): return subprocess.run(a, check=True, capture_output=True, text=True)
shutil.rmtree(fr, ignore_errors=True); os.makedirs(fr); os.makedirs(os.path.join(OUT, 'capas'), exist_ok=True)
run('node', os.path.join(HERE, 'render.js'), f'c{n}', fr)
shutil.copy(os.path.join(fr, 'f00000.jpg'), os.path.join(OUT, 'capas', f'capa_ep{n}.jpg'))
# --- audio
import mix
from kokoro_onnx import Kokoro
spec = open(os.path.join(HERE, 'voice.py'), encoding='utf-8').read()
V = eval(spec[spec.index("    'controle':") + len("    'controle':"):].split('\n')[0].rstrip(','))
K = os.environ.get('KOKORO_DIR', os.path.join(ROOT, 'models'))
k = Kokoro(os.path.join(K, 'kokoro-v1.0.onnx'), os.path.join(K, 'voices-v1.0.bin'))
words = ['', 'um', 'dois', 'três', 'quatro', 'cinco'][int(n)]
a, sr = k.create(f'O multiverso da burrice. Episódio {words}.', voice=V['voice'], speed=1.15, lang='pt-br')
raw = os.path.join(d, 'raw.wav'); vo = os.path.join(d, 'voice.wav'); sf.write(raw, a, sr)
run('ffmpeg', '-y', '-loglevel', 'error', '-i', raw, '-af', f"rubberband=pitch={2 ** (V['pitch'] / 12):.4f}:formant=preserved,{V['fx']},silenceremove=start_periods=1:start_threshold=-45dB,loudnorm=I=-16:TP=-1.5", '-ac', '1', '-ar', '48000', vo)
os.remove(raw)
x, _ = sf.read(vo); N = int(2.5 * mix.SR); bus = np.zeros(N)
mix.mixin(bus, x[:int(2.1 * mix.SR)] * 1.3, .25)
for t, name, gn in [(0, 'fanfare', .5), (0, 'sparkle', .4), (2.15, 'whoosh', .7)]: mix.mixin(bus, mix.sfx(name), t, gn)
bus *= .5 / (np.max(np.abs(bus)) + 1e-9) * 1.8; bus = np.tanh(bus) * .95
wav = os.path.join(d, 'cover.wav'); sf.write(wav, np.stack([bus, bus], 1).astype(np.float32), mix.SR, subtype='PCM_16')
# --- video, same settings as the episode body, then join without re-encoding
cv = os.path.join(d, 'cover.mp4')
run('ffmpeg', '-y', '-loglevel', 'error', '-framerate', '30', '-i', os.path.join(fr, 'f%05d.jpg'), '-i', wav,
    '-vf', 'scale=out_range=tv:out_color_matrix=bt709,format=yuv420p', '-c:v', 'libx264', '-preset', 'slow', '-crf', '23', '-maxrate', '4200k', '-bufsize', '8400k',
    '-profile:v', 'high', '-tune', 'animation', '-x264-params', 'colorprim=bt709:transfer=bt709:colormatrix=bt709:range=tv', '-r', '30',
    '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-ac', '2', '-t', '2.5', '-movflags', '+faststart', cv)
body = os.path.join(OUT, 'corpo', f'ep{n}.mp4'); out = os.path.join(OUT, f'ep{n}.mp4'); lst = os.path.join(d, 'list.txt')
open(lst, 'w').write(f"file '{cv}'\nfile '{body}'\n")
run('ffmpeg', '-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', lst, '-c', 'copy', '-movflags', '+faststart', out)
os.remove(lst); shutil.rmtree(fr)
exec(open(os.path.join(HERE, 'encode.py')).read().split('ep = sys.argv[1]')[0].replace('__file__', repr(os.path.join(HERE, 'encode.py'))))
probe(out, 92.5)
