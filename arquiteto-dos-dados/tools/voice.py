"""voice.py: roteiro.json -> audio/ep{N}_{k}.mp3 + audio/narracao.json (duração de cada fala e tempo de cada palavra).
Voz: Kokoro-82M (modelo aberto, roda local na CPU), voz masculina pt-BR "pm_alex".
Uso:  pip install kokoro-onnx soundfile numpy
      python3 tools/voice.py [PASTA_DOS_MODELOS]     # kokoro-v1.0.onnx e voices-v1.0.bin (baixados na 1ª vez)
Sem estes arquivos a aplicação continua funcionando: ela narra com a Web Speech API do navegador."""
import json, os, subprocess, sys, urllib.request
import numpy as np
from kokoro_onnx import Kokoro

HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
MODELS = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, "models")
URL = "https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/"
VOICE, SPEED, SR = "pm_alex", 0.94, 48000
os.makedirs(MODELS, exist_ok=True)
for n in ("kokoro-v1.0.onnx", "voices-v1.0.bin"):
    p = os.path.join(MODELS, n)
    if not os.path.exists(p):
        print("baixando", n); urllib.request.urlretrieve(URL + n, p)
k = Kokoro(os.path.join(MODELS, "kokoro-v1.0.onnx"), os.path.join(MODELS, "voices-v1.0.bin"))
spec = json.load(open(os.path.join(ROOT, "roteiro.json"), encoding="utf-8"))
out = os.path.join(ROOT, "audio"); os.makedirs(out, exist_ok=True)
meta = {}

def word_times(x, sr, words):
    """Distribui as palavras pelo trecho com voz (entre o primeiro e o último som), proporcional ao tamanho de cada uma."""
    env = np.abs(x); idx = np.where(env > 0.02 * env.max())[0]
    a, b = idx[0] / sr, idx[-1] / sr
    w = np.array([len(s) + 1.5 for s in words], float); c = np.concatenate([[0], np.cumsum(w)]) / w.sum()
    return [[round(a + (b - a) * c[i], 3), round(a + (b - a) * c[i + 1], 3)] for i in range(len(words))]

for ep in spec["episodios"]:
    for i, f in enumerate(ep["falas"]):
        x, sr = k.create(f.get("fala", f["texto"]), voice=VOICE, speed=SPEED, lang="pt-br")
        x = x / max(1e-6, np.abs(x).max()) * 0.9
        name = f"ep{ep['id']}_{i}"
        p = subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "f32le", "-ar", str(sr), "-ac", "1", "-i", "-",
                            "-ar", str(SR), "-c:a", "libmp3lame", "-b:a", "128k", os.path.join(out, name + ".mp3")],
                           input=x.astype(np.float32).tobytes(), check=True)
        meta[name] = {"dur": round(len(x) / sr, 3), "palavras": word_times(x, sr, f["texto"].split())}
        print(name, meta[name]["dur"], "s", "|", f["texto"])
json.dump(meta, open(os.path.join(out, "narracao.json"), "w"), ensure_ascii=False, indent=1)
