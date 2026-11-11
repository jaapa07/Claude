"""tools/voice.py — generate the PT-BR narration with Kokoro-82M (local, offline).

  pip install kokoro-onnx soundfile numpy
  python tools/voice.py            # all lines      (models download once into tools/models/)
  python tools/voice.py e3b e4b    # only some lines

Writes assets/voice/<id>.wav (48 kHz mono, processed per character) and
assets/voice/manifest.json with duration + estimated word timings used by the
synchronized subtitles. Lines are read from src/data/script.js.
"""
import json, os, re, shutil, subprocess, sys, urllib.request
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODELS = os.path.join(ROOT, 'tools', 'models'); OUT = os.path.join(ROOT, 'assets', 'voice')
URL = 'https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/'
SR = 48000
FX = {  # ffmpeg filter chains per character
    'young': 'asetrate=24000*1.24,aresample=24000,atempo=0.92,highpass=f=140,acompressor=threshold=-18dB:ratio=3,loudnorm=I=-15:TP=-1.5',
    'big': 'asetrate=24000*0.9,aresample=24000,atempo=1.06,lowshelf=g=5:f=150,acompressor=threshold=-16dB:ratio=3,loudnorm=I=-14:TP=-1.5',
    'fairy': 'asetrate=24000*1.2,aresample=24000,atempo=0.93,chorus=0.7:0.9:25:0.3:0.4:2,aecho=0.8:0.4:35:0.12,loudnorm=I=-15:TP=-1.5',
    'king': 'asetrate=24000*1.1,aresample=24000,vibrato=f=6.5:d=0.25,acompressor=threshold=-16dB:ratio=3,loudnorm=I=-14:TP=-1.5',
    'bubble': 'asetrate=24000*0.9,aresample=24000,lowpass=f=2400,aecho=0.8:0.7:45|90:0.4|0.25,loudnorm=I=-15:TP=-1.5',
    'monster': 'asetrate=24000*0.72,aresample=24000,atempo=1.12,lowshelf=g=7:f=140,aecho=0.8:0.7:80|160:0.35|0.2,loudnorm=I=-14:TP=-1.5',
    'narrator': 'highpass=f=70,acompressor=threshold=-18dB:ratio=3:attack=5:release=120,aecho=0.8:0.5:60:0.08,loudnorm=I=-16:TP=-1.5',
    'giant': 'asetrate=24000*0.78,aresample=24000,lowshelf=g=6:f=160,aecho=0.8:0.7:90|180:0.35|0.22,chorus=0.6:0.9:50|60:0.4|0.32:0.25|0.4:2|1.3,loudnorm=I=-15:TP=-1.5',
    'machine': 'asetrate=24000*0.92,aresample=24000,flanger=delay=2:depth=3:speed=0.4,aecho=0.8:0.6:40|110:0.3|0.2,highpass=f=120,loudnorm=I=-15:TP=-1.5',
}

def load_script():
    src = open(os.path.join(ROOT, 'src', 'data', 'script.js'), encoding='utf-8').read()
    if 'export const SCRIPT' in src:
        body = src.split('export const SCRIPT =', 1)[1].rsplit('};', 1)[0] + '}'
        data = json.loads(body)
        return data['voices'], data['lines']
    voices = {}
    for m in re.finditer(r"(\w+): \{ kokoro: '(\w+)', speed: ([\d.]+), fx: '(\w+)'", src):
        voices[m.group(1)] = dict(kokoro=m.group(2), speed=float(m.group(3)), fx=m.group(4))
    lines = []
    for m in re.finditer(r"\{ id: '(\w+)', ep: (\d), start: ([\d.]+), voice: '(\w+)', text: '([^']+)' \}", src):
        lines.append(dict(id=m.group(1), ep=int(m.group(2)), start=float(m.group(3)), voice=m.group(4), text=m.group(5)))
    return voices, lines

def syllables(w):
    return max(1, len(re.findall(r"[aeiouáéíóúâêôãõàAEIOUÁÉÍÓÚÂÊÔÃÕ]+", w)))

def word_times(text, audio):
    """Spread the words over the voiced span, split at real pauses for punctuation."""
    env = np.abs(audio); hop = SR // 100
    e = np.array([env[i:i + hop].mean() for i in range(0, len(env) - hop, hop)])
    loud = e > max(1e-3, e.max() * 0.05); idx = np.where(loud)[0]
    a, b = (idx[0], idx[-1] + 1) if len(idx) else (0, len(e))
    words = text.split(); w = np.array([syllables(x) + (0.6 if re.search(r'[,.;…]$', x) else 0) for x in words], float)
    cum = np.concatenate([[0], np.cumsum(w)]) / w.sum()
    out = []
    for i, word in enumerate(words):
        out.append(dict(text=word, start=round((a + (b - a) * cum[i]) / 100, 3), end=round((a + (b - a) * cum[i + 1]) / 100, 3)))
    return out

def main():
    from kokoro_onnx import Kokoro
    import soundfile as sf
    os.makedirs(MODELS, exist_ok=True); os.makedirs(OUT, exist_ok=True)
    for n in ('kokoro-v1.0.onnx', 'voices-v1.0.bin'):
        p = os.path.join(MODELS, n)
        if not os.path.exists(p):
            print('downloading', n); urllib.request.urlretrieve(URL + n, p + '.part'); os.replace(p + '.part', p)
    k = Kokoro(os.path.join(MODELS, 'kokoro-v1.0.onnx'), os.path.join(MODELS, 'voices-v1.0.bin'))
    voices, lines = load_script()
    only = set(sys.argv[1:])
    mpath = os.path.join(OUT, 'manifest.json')
    manifest = json.load(open(mpath)) if os.path.exists(mpath) else {}
    ff = shutil.which('ffmpeg')
    for L in lines:
        if only and L['id'] not in only: continue
        v = voices[L['voice']]
        spoken = L.get('say', L['text']).replace('…', ', ').strip(' ,')
        samples, sr = k.create(spoken, voice=v['kokoro'], speed=v['speed'], lang='pt-br')
        raw = os.path.join(OUT, L['id'] + '.raw.wav'); sf.write(raw, samples, sr)
        dst = os.path.join(OUT, L['id'] + '.wav')
        subprocess.run([ff, '-y', '-loglevel', 'error', '-i', raw, '-af', FX[v['fx']] + f',aresample={SR}', '-ar', str(SR), '-ac', '1', dst], check=True)
        os.remove(raw)
        data, _ = sf.read(dst)
        manifest[L['id']] = dict(duration=round(len(data) / SR, 3), words=word_times(L['text'], data))
        print(f"{L['id']}: {manifest[L['id']]['duration']:.2f}s  {L['text']}")
    json.dump(manifest, open(mpath, 'w'), ensure_ascii=False, indent=1)

if __name__ == '__main__':
    main()
