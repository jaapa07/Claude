"""encode.py N : episodes/epN/frames/*.jpg + episodes/epN/mix.wav -> out/epN.mp4 (1080x1920, 30 fps, H.264 + AAC),
then checks the file it wrote (streams, size, duration, frame count, audio level) and makes a contact sheet.
encode.py season : joins out/ep1..5.mp4 into out/temporada_completa.mp4 and checks it the same way."""
import json, os, subprocess, sys
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE); OUT = os.path.join(ROOT, 'out')
os.makedirs(OUT, exist_ok=True)
def run(*a): return subprocess.run(a, check=True, capture_output=True, text=True)
def probe(path, want_dur):
    p = json.loads(run('ffprobe', '-v', 'error', '-show_streams', '-show_format', '-of', 'json', path).stdout)
    v = [s for s in p['streams'] if s['codec_type'] == 'video'][0]; a = [s for s in p['streams'] if s['codec_type'] == 'audio']
    dur = float(p['format']['duration']); nb = int(run('ffprobe', '-v', 'error', '-count_packets', '-select_streams', 'v:0', '-show_entries', 'stream=nb_read_packets', '-of', 'csv=p=0', path).stdout.strip())
    vol = run('ffmpeg', '-hide_banner', '-i', path, '-af', 'volumedetect', '-vn', '-f', 'null', '-').stderr
    mean = [l.split(':')[1].strip() for l in vol.splitlines() if 'mean_volume' in l]
    ok = v['width'] == 1080 and v['height'] == 1920 and a and abs(dur - want_dur) < .2 and abs(nb - round(want_dur * 30)) <= 2
    print(f"{os.path.basename(path)}: {v['width']}x{v['height']} {v['codec_name']} {v['r_frame_rate']} fps, {nb} frames, audio {a[0]['codec_name'] if a else 'NONE'} "
          f"{a[0].get('sample_rate', '') if a else ''} Hz, {dur:.2f} s, {os.path.getsize(path) / 1e6:.1f} MB, mean volume {mean[0] if mean else '?'} -> {'OK' if ok else 'PROBLEM'}")
    if not ok: sys.exit(1)
ep = sys.argv[1]
if ep == 'season':
    lst = os.path.join(OUT, 'list.txt'); open(lst, 'w').write(''.join(f"file 'ep{i}.mp4'\n" for i in range(1, 6)))
    out = os.path.join(OUT, 'temporada_completa.mp4')
    # re-encoded with two passes so the whole season fits in one file under 100 MB
    common = ['-f', 'concat', '-safe', '0', '-i', lst, '-c:v', 'libx264', '-preset', 'slow', '-tune', 'animation', '-b:v', '1550k', '-maxrate', '3000k', '-bufsize', '6000k', '-pix_fmt', 'yuv420p', '-r', '30']
    run('ffmpeg', '-y', '-loglevel', 'error', *common, '-pass', '1', '-passlogfile', os.path.join(OUT, 'p'), '-an', '-f', 'mp4', '/dev/null')
    run('ffmpeg', '-y', '-loglevel', 'error', *common, '-pass', '2', '-passlogfile', os.path.join(OUT, 'p'), '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', out)
    for f in os.listdir(OUT):
        if f.startswith('p-0'): os.remove(os.path.join(OUT, f))
    os.remove(lst); probe(out, 450.0); sys.exit(0)
d = os.path.join(ROOT, 'episodes', f'ep{ep}'); out = os.path.join(OUT, f'ep{ep}.mp4')
n = len([f for f in os.listdir(os.path.join(d, 'frames')) if f.endswith('.jpg')])
if n != 2700: sys.exit(f'STOP: ep{ep} has {n} frames, needs 2700')
run('ffmpeg', '-y', '-loglevel', 'error', '-framerate', '30', '-i', os.path.join(d, 'frames', 'f%05d.jpg'), '-i', os.path.join(d, 'mix.wav'),
    '-vf', 'scale=out_range=tv:out_color_matrix=bt709,format=yuv420p', '-c:v', 'libx264', '-preset', 'slow', '-crf', '23', '-maxrate', '4200k', '-bufsize', '8400k', '-profile:v', 'high', '-tune', 'animation',
    '-x264-params', 'colorprim=bt709:transfer=bt709:colormatrix=bt709:range=tv', '-r', '30', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000',
    '-t', '90', '-movflags', '+faststart', out)
run('ffmpeg', '-y', '-loglevel', 'error', '-i', out, '-vf', r"select='not(mod(n\,90))',scale=216:384,tile=10x3", '-frames:v', '1', '-fps_mode', 'vfr', os.path.join(OUT, f'ep{ep}_sheet.jpg'))
probe(out, 90.0)
