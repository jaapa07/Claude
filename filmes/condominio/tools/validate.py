"""Validate the five episodes and the full series: duration, frame rate, size, audio (loudness, no dead air where voices play),
black frames, and the continuity between the last frame of each episode and the first frame of the next.
python tools/validate.py  → prints a report and writes out/validacao.json; exit 1 if anything fails."""
import json, os, subprocess, sys, tempfile
import numpy as np
from PIL import Image
HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FF = os.environ.get('FFMPEG', 'ffmpeg'); FP = os.environ.get('FFPROBE', 'ffprobe')
def run(a): return subprocess.run(a, capture_output=True, text=True)
def probe(p):
    r = json.loads(run([FP, '-v', 'error', '-show_streams', '-show_format', '-of', 'json', p]).stdout)
    v = next(s for s in r['streams'] if s['codec_type'] == 'video'); a = [s for s in r['streams'] if s['codec_type'] == 'audio']
    n = int(run([FP, '-v', 'error', '-count_packets', '-select_streams', 'v:0', '-show_entries', 'stream=nb_read_packets', '-of', 'csv=p=0', p]).stdout.strip().strip(',').split(',')[0])
    return dict(dur=float(r['format']['duration']), w=v['width'], h=v['height'], fps=v['r_frame_rate'], frames=n, audio=len(a) > 0)
def loud(p):
    out = run([FF, '-hide_banner', '-i', p, '-af', 'ebur128', '-f', 'null', '-']).stderr
    for l in out.splitlines()[::-1]:
        if l.strip().startswith('I:'): return float(l.split()[1])
def blacks(p):
    out = run([FF, '-hide_banner', '-i', p, '-vf', 'blackdetect=d=0.5:pix_th=0.02', '-an', '-f', 'null', '-']).stderr
    return [l.split('black_start:')[1].split()[0] + '–' + l.split('black_end:')[1].split()[0] for l in out.splitlines() if 'black_start' in l]
def frame(p, last, dst):
    n = 2699 if last else 0   # the exact last / first frame by index
    run([FF, '-v', 'error', '-y', '-i', p, '-vf', f'select=eq(n\\,{n})', '-fps_mode', 'passthrough', '-frames:v', '1', dst]); return np.asarray(Image.open(dst).convert('RGB'), dtype=np.float32)
rep, ok = {'episodios': []}, True
tmp = tempfile.mkdtemp()
for ep in range(1, 6):
    p = os.path.join(HERE, f'ep{ep}.mp4'); i = probe(p); i['lufs'] = loud(p); i['black'] = blacks(p)
    ev = json.load(open(os.path.join(HERE, 'out', f'ev{ep}.json')))
    a = subprocess.run([FF, '-v', 'error', '-i', p, '-ac', '1', '-ar', '16000', '-f', 'f32le', '-'], capture_output=True).stdout; x = np.frombuffer(a, np.float32)
    silent = [l['id'] for l in ev['ev'] if l['type'] == 'line' and np.sqrt(np.mean(x[int(l['t'] * 16000):int((l['t'] + l['d']) * 16000)] ** 2) + 1e-12) < 10 ** (-40 / 20)]
    i['linhas'] = sum(1 for l in ev['ev'] if l['type'] == 'line'); i['falas_mudas'] = silent
    i['srt_cues'] = open(os.path.join(HERE, f'ep{ep}.srt'), encoding='utf-8').read().count(' --> ')
    good = abs(i['dur'] - 90) < .05 and i['frames'] == 2700 and i['fps'] == '30/1' and (i['w'], i['h']) == (1080, 1920) and i['audio'] and -15.5 < i['lufs'] < -12.5 and not silent and i['srt_cues'] == i['linhas']
    i['ok'] = bool(good); ok &= good; i['ep'] = ep; rep['episodios'].append(i)
    print(f"EP{ep}: {i['dur']:.3f}s {i['frames']} quadros {i['fps']} {i['w']}x{i['h']} áudio={i['audio']} {i['lufs']} LUFS falas={i['linhas']} mudas={silent} srt={i['srt_cues']} preto={i['black']} → {'OK' if good else 'FALHOU'}")
rep['continuidade'] = []
for ep in range(1, 5):
    a = frame(os.path.join(HERE, f'ep{ep}.mp4'), True, os.path.join(tmp, f'l{ep}.png')); b = frame(os.path.join(HERE, f'ep{ep + 1}.mp4'), False, os.path.join(tmp, f'f{ep + 1}.png'))
    d = float(np.abs(a - b).mean()); good = d < 3.0; ok &= good
    rep['continuidade'].append({'de': ep, 'para': ep + 1, 'diferenca_media': round(d, 3), 'ok': good})
    print(f"continuidade EP{ep} último quadro → EP{ep + 1} primeiro quadro: diferença média {d:.3f} (0–255) → {'OK' if good else 'FALHOU'}")
full = os.path.join(HERE, 'serie-completa.mp4')
if os.path.exists(full):
    i = probe(full); i['lufs'] = loud(full); good = abs(i['dur'] - 450) < .2 and i['audio']; ok &= good; rep['serie'] = i
    print(f"SÉRIE: {i['dur']:.3f}s {i['frames']} quadros {i['lufs']} LUFS → {'OK' if good else 'FALHOU'}")
json.dump(rep, open(os.path.join(HERE, 'out', 'validacao.json'), 'w'), indent=1, ensure_ascii=False)
print('TUDO OK' if ok else 'HÁ FALHAS'); sys.exit(0 if ok else 1)
