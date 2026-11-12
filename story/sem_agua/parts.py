"""parts.py : frames/ + mix.wav -> the full film and the three parts, each opening on its cover (0.5 s)
and parts 1-2 closing on an end card (2 s).
needs the stills: cover/ (#cover), stills/cover1..3/ (#cover1..3), stills/end1..2/ (#end1..2) rendered by engine/render.js"""
import json, os, subprocess
HERE = os.path.dirname(os.path.abspath(__file__)); os.chdir(HERE)
B = json.load(open("beats.json")); FPS = 30
PARTS = [(0, B["slam"] + 0.25), (B["slam"] + 0.25, B["breath"]), (B["breath"], B["end"])]
X264 = ["-c:v", "libx264", "-preset", "slow", "-crf", "21", "-pix_fmt", "yuv420p", "-r", "30", "-c:a", "aac", "-b:a", "160k", "-ar", "48000", "-movflags", "+faststart"]
def run(a): subprocess.run(["ffmpeg", "-y", "-loglevel", "error"] + a, check=True)
def build(out, cover, a, b, end=None):
    n0, n1 = round(a * FPS), round(b * FPS); dur = (n1 - n0) / FPS
    inputs = ["-loop", "1", "-framerate", "30", "-t", "0.5", "-i", cover, "-f", "lavfi", "-t", "0.5", "-i", "anullsrc=r=48000:cl=stereo",
              "-start_number", str(n0), "-framerate", "30", "-i", "frames/f%05d.jpg", "-ss", f"{a:.3f}", "-t", f"{dur:.3f}", "-i", "mix.wav"]
    fade = f"afade=t=in:d=0.04,afade=t=out:st={dur - 0.25:.3f}:d=0.25" if end else "afade=t=in:d=0.04"
    fc = f"[0:v]format=yuv420p,setsar=1[c];[2:v]trim=end_frame={n1 - n0},setpts=PTS-STARTPTS,format=yuv420p,setsar=1[m];[3:a]aformat=sample_rates=48000:channel_layouts=stereo,{fade}[ma];"
    if end:
        inputs += ["-loop", "1", "-framerate", "30", "-t", "2.0", "-i", end, "-f", "lavfi", "-t", "2.0", "-i", "anullsrc=r=48000:cl=stereo"]
        fc += "[4:v]format=yuv420p,setsar=1[e];[c][1:a][m][ma][e][5:a]concat=n=3:v=1:a=1[v][a]"
    else:
        fc += "[c][1:a][m][ma]concat=n=2:v=1:a=1[v][a]"
    run(inputs + ["-filter_complex", fc, "-map", "[v]", "-map", "[a]"] + X264 + [out])
    print(out, f"{dur + 0.5 + (2.0 if end else 0):.1f} s", f"{os.path.getsize(out) / 1e6:.1f} MB")
os.makedirs("partes", exist_ok=True)
build("sem_agua.mp4", "cover/at_0.00.jpg", 0, B["end"])
for k, (a, b) in enumerate(PARTS, 1):
    build(f"partes/parte{k}.mp4", f"stills/cover{k}/at_0.00.jpg", a, b, f"stills/end{k}/at_0.00.jpg" if k < 3 else None)
# contact sheet of the full film
run(["-i", "sem_agua.mp4", "-vf", "select='not(mod(n\\,90))',scale=216:-1,tile=8x4", "-frames:v", "1", "-fps_mode", "vfr", "sheet.jpg"])
