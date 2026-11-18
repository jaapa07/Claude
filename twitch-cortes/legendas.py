#!/usr/bin/env python3
"""Legendas automáticas estilo TikTok/Reels (2–3 palavras por vez, grandes, no terço inferior).

Transcreve offline com Whisper (sherpa-onnx) + VAD Silero e queima a legenda com ffmpeg/libass.

Modelos (GitHub releases do k2-fsa/sherpa-onnx, ~640 MB):
  https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models/silero_vad.onnx
  https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models/sherpa-onnx-whisper-small.tar.bz2

Uso:
  python legendas.py --modelos ./models corte1.mp4 corte2.mp4 ...
  → corte1_legendado.mp4 (+ corte1.ass)
"""
from __future__ import annotations

import argparse
import re
import subprocess
from pathlib import Path

import numpy as np

SR = 16000


def carregar_audio(video: Path) -> np.ndarray:
    raw = subprocess.run(["ffmpeg", "-loglevel", "error", "-i", str(video), "-vn", "-ac", "1",
                          "-ar", str(SR), "-f", "f32le", "-"], capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32).copy()


def modelos(d: Path, lingua: str):
    import sherpa_onnx
    w = next(d.glob("sherpa-onnx-whisper-*"))
    nome = w.name.replace("sherpa-onnx-whisper-", "")
    rec = sherpa_onnx.OfflineRecognizer.from_whisper(
        encoder=str(w / f"{nome}-encoder.int8.onnx"), decoder=str(w / f"{nome}-decoder.int8.onnx"),
        tokens=str(w / f"{nome}-tokens.txt"), language=lingua, task="transcribe", num_threads=4)
    cfg = sherpa_onnx.VadModelConfig()
    cfg.silero_vad.model = str(d / "vad.onnx")
    cfg.silero_vad.min_silence_duration = 0.25
    cfg.silero_vad.min_speech_duration = 0.25
    cfg.silero_vad.threshold = 0.3
    cfg.silero_vad.max_speech_duration = 30
    cfg.sample_rate = SR
    return rec, cfg


def transcrever(audio: np.ndarray, rec, vad_cfg) -> list[tuple[float, float, str]]:
    import sherpa_onnx
    vad = sherpa_onnx.VoiceActivityDetector(vad_cfg, buffer_size_in_seconds=120)
    win = vad_cfg.silero_vad.window_size
    segs = []
    for i in range(0, len(audio), win):
        vad.accept_waveform(audio[i:i + win])
        while not vad.empty():
            segs.append(vad.front); vad.pop()
    vad.flush()
    while not vad.empty():
        segs.append(vad.front); vad.pop()
    pieces = []
    for sg in segs:
        pieces += dividir(np.array(sg.samples, dtype=np.float32), sg.start)
    out = []
    for start, samples in pieces:
        st = rec.create_stream()
        st.accept_waveform(SR, samples)
        rec.decode_stream(st)
        txt = limpar(st.result.text)
        if txt:
            t0 = start / SR
            out.append((t0, t0 + len(samples) / SR, txt))
    return out


def dividir(x: np.ndarray, start: int, alvo=(3.0, 7.0)):
    """Quebra trechos longos no ponto mais silencioso entre 3 e 7 s (sincronia melhor)."""
    lo, hi = int(alvo[0] * SR), int(alvo[1] * SR)
    if len(x) <= hi:
        return [(start, x)]
    hop = SR // 50  # 20 ms
    rms = [float(np.sqrt(np.mean(x[i:i + hop] ** 2))) for i in range(lo, hi, hop)]
    cut = lo + int(np.argmin(rms)) * hop
    return [(start, x[:cut])] + dividir(x[cut:], start + cut, alvo)


def limpar(txt: str) -> str:
    txt = re.sub(r"\[[^\]]*\]|\([^)]*\)", " ", txt)          # [MÚSICA], (risos)
    txt = re.sub(r"(^|\s)-+\s*", " ", txt)                     # travessões de diálogo
    txt = re.sub(r"\s+", " ", txt).strip()
    # alucinação em loop ("o que é o que é o que é..."): corta repetições de 1–4 palavras
    txt = re.sub(r"(?i)\b((?:\S+\s+){0,3}\S+)(?:\s+\1\b){3,}.*", r"\1", txt).strip()
    if re.fullmatch(r"(?i)[\W_]*|.*(legendas? pela|obrigado por assistir|inscreva-se).*", txt):
        return ""
    return txt


def blocos(segs, max_palavras=3):
    """Divide cada frase em blocos de até 3 palavras; tempo proporcional ao nº de letras."""
    for t0, t1, txt in segs:
        words = txt.split()
        chunks = [words[i:i + max_palavras] for i in range(0, len(words), max_palavras)]
        total = sum(len("".join(c)) + 1 for c in chunks) or 1
        t = t0
        for c in chunks:
            d = (t1 - t0) * (len("".join(c)) + 1) / total
            yield t, t + d, " ".join(c)
            t += d


def ts(t: float) -> str:
    return f"{int(t // 3600)}:{int(t % 3600 // 60):02d}:{t % 60:05.2f}"


def escrever_ass(segs, path: Path, w: int, h: int):
    vertical = h > w
    size = 92 if vertical else 64
    margin_v = int(h * 0.26) if vertical else 60  # vertical: logo abaixo da faixa do vídeo
    head = f"""[Script Info]
ScriptType: v4.00+
PlayResX: {w}
PlayResY: {h}
WrapStyle: 0

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Cap,Inter Display Black,{size},&H00FFFFFF,&H0000E5FF,&H00000000,&H80000000,1,0,0,0,100,100,0,0,1,7,3,2,60,60,{margin_v},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    lines = []
    for i, (a, b, txt) in enumerate(blocos(segs)):
        txt = txt.upper().replace("{", "(").replace("}", ")")
        # "pop": entra 115% e assenta em 100%; a cada 2 blocos destaca em amarelo
        cor = r"\c&H0000E5FF&" if i % 2 else ""
        lines.append(f"Dialogue: 0,{ts(a)},{ts(b)},Cap,,0,0,0,,"
                     f"{{\\fscx115\\fscy115\\t(0,90,\\fscx100\\fscy100){cor}}}{txt}")
    path.write_text(head + "\n".join(lines) + "\n", encoding="utf-8")


def dims(video: Path) -> tuple[int, int]:
    r = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries",
                        "stream=width,height", "-of", "csv=p=0", str(video)],
                       capture_output=True, text=True, check=True).stdout.strip().split(",")
    return int(r[0]), int(r[1])


def legendar(v: Path, rec, vad_cfg) -> tuple[Path, list]:
    segs = transcrever(carregar_audio(v), rec, vad_cfg)
    ass = v.with_suffix(".ass")
    escrever_ass(segs, ass, *dims(v))
    dst = v.with_name(v.stem + "_legendado.mp4")
    subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", str(v), "-vf", f"ass={ass}",
                    "-c:v", "libx264", "-preset", "veryfast", "-crf", "20", "-c:a", "copy",
                    "-movflags", "+faststart", str(dst)], check=True)
    return dst, segs


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("videos", nargs="+")
    p.add_argument("--modelos", required=True, help="pasta com vad.onnx e sherpa-onnx-whisper-*/")
    p.add_argument("--lingua", default="pt")
    a = p.parse_args()
    rec, vad_cfg = modelos(Path(a.modelos), a.lingua)
    for v in map(Path, a.videos):
        dst, segs = legendar(v, rec, vad_cfg)
        print(f"{dst.name}: {len(segs)} falas")
        for t0, _, txt in segs:
            print(f"   {t0:5.1f}s  {txt}")


if __name__ == "__main__":
    main()
