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


def db(x: np.ndarray) -> float:
    return 20 * np.log10(float(np.sqrt(np.mean(x ** 2))) + 1e-9) if len(x) else -120.0


def transcrever(audio: np.ndarray, rec, vad_cfg, faixa_db: float = 12.0) -> list[tuple[float, float, str]]:
    """Transcreve só a voz DOMINANTE: trechos muito mais baixos que a fala mais alta
    do corte (conversa de fundo, jogo baixinho atrás do streamer) são descartados."""
    import sherpa_onnx
    vad = sherpa_onnx.VoiceActivityDetector(vad_cfg, buffer_size_in_seconds=120)
    win = vad_cfg.silero_vad.window_size
    segs = []
    def colher():  # copia JÁ: o buffer de vad.front é liberado no pop()
        while not vad.empty():
            f = vad.front
            segs.append((f.start, np.array(f.samples, dtype=np.float32)))
            vad.pop()
    for i in range(0, len(audio), win):
        vad.accept_waveform(audio[i:i + win])
        colher()
    vad.flush()
    colher()
    pieces = []
    for start, x in segs:
        pieces += dividir(x, start)
    if not pieces:
        return []
    # nível de cada trecho = percentil 90 do volume em janelas de 100 ms (pega a voz, não as pausas)
    def nivel(x):
        hop = SR // 10
        v = [db(x[i:i + hop]) for i in range(0, max(1, len(x) - hop + 1), hop)] or [db(x)]
        return float(np.percentile(v, 90))
    niveis = [nivel(x) for _, x in pieces]
    ref = max(niveis)
    out = []
    for (start, samples), nv in zip(pieces, niveis):
        if nv < ref - faixa_db:
            continue  # voz de fundo
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
    # frases inteiras repetidas ("X. X. X") → uma vez só
    frases, vistas = re.split(r"(?<=[.!?…])\s+", txt), set()
    uniq = []
    for f in frases:
        k = re.sub(r"\W+", "", f.lower())
        if k and k not in vistas:
            vistas.add(k); uniq.append(f)
    txt = " ".join(uniq)
    if re.fullmatch(r"(?i)[\W_]*|.*(legendas? pela|obrigado por assistir|inscreva-se).*", txt):
        return ""
    return txt


def blocos(segs, audio: np.ndarray | None = None, max_palavras=3):
    """Divide cada frase em blocos de até 3 palavras. O tempo de cada bloco é proporcional
    ao nº de letras, mas contado só nos quadros COM voz (pausas não empurram a legenda)."""
    hop = SR // 50  # 20 ms
    for t0, t1, txt in segs:
        words = txt.split()
        chunks = [words[i:i + max_palavras] for i in range(0, len(words), max_palavras)]
        pesos = [len("".join(c)) + 1 for c in chunks]
        total = sum(pesos) or 1
        # linha do tempo "falada": instantes de quadros com voz
        tempos = None
        if audio is not None:
            x = audio[int(t0 * SR):int(t1 * SR)]
            lv = np.array([db(x[i:i + hop]) for i in range(0, max(1, len(x) - hop + 1), hop)])
            if len(lv) > 5:
                voz = lv > np.percentile(lv, 90) - 18
                tempos = t0 + np.flatnonzero(voz) * hop / SR
        acc = 0.0
        for c, w in zip(chunks, pesos):
            f0, f1 = acc / total, (acc + w) / total
            acc += w
            if tempos is not None and len(tempos) > 2:
                a = float(tempos[min(len(tempos) - 1, int(f0 * len(tempos)))])
                b = float(tempos[min(len(tempos) - 1, max(0, int(f1 * len(tempos)) - 1))]) + hop / SR
                b = max(b, a + 0.25)
            else:
                a, b = t0 + (t1 - t0) * f0, t0 + (t1 - t0) * f1
            yield a, b, " ".join(c)


def ts(t: float) -> str:
    return f"{int(t // 3600)}:{int(t % 3600 // 60):02d}:{t % 60:05.2f}"


def escrever_ass(segs, path: Path, w: int, h: int, audio: np.ndarray | None = None):
    vertical = h > w
    size = 92 if vertical else 64
    # vertical: ancora pelo TOPO logo abaixo da faixa 16:9 (cresce p/ baixo, nunca cobre o jogo)
    al, margin_v = (8, int(h / 2 + w * 9 / 16 / 2 + 40)) if vertical else (2, 60)
    head = f"""[Script Info]
ScriptType: v4.00+
PlayResX: {w}
PlayResY: {h}
WrapStyle: 0

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Cap,Inter Display Black,{size},&H00FFFFFF,&H0000E5FF,&H00000000,&H80000000,1,0,0,0,100,100,0,0,1,7,3,{al},60,60,{margin_v},1
Style: Grito,Inter Display Black,{int(size * 1.3)},&H003C3CFF,&H0000E5FF,&H00000000,&H80000000,1,0,0,0,100,100,0,0,1,9,4,{al},40,40,{margin_v},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    bl = list(blocos(segs, audio))
    # emenda: cada bloco fica na tela até o próximo começar (sem piscar), máx. +0,6 s
    bl = [(a, min(bl[i + 1][0], b + 0.6) if i + 1 < len(bl) else b + 0.4, t) for i, (a, b, t) in enumerate(bl)]

    def pico(a, b):  # percentil 90 do volume em janelas de 50 ms → mede o grito, não as pausas
        x = audio[int(a * SR):int(b * SR)]
        h = SR // 20
        w = [db(x[i:i + h]) for i in range(0, max(1, len(x) - h + 1), h)]
        return float(np.percentile(w, 90)) if w else -120.0
    vols = [pico(a, b) if audio is not None else -120.0 for a, b, _ in bl]
    if vols:
        corte = float(np.median(vols)) + 5  # 5 dB acima da fala normal do corte = grito
    lines = []
    for i, ((a, b, txt), v) in enumerate(zip(bl, vols)):
        txt = txt.upper().replace("{", "(").replace("}", ")")
        if audio is not None and v >= corte:
            prox_grito = i + 1 < len(bl) and vols[i + 1] >= corte
            if not prox_grito:  # "!" só no fim da sequência gritada
                txt = re.sub(r"[.,;:…]+$", "", txt)
                if not re.search(r"[!?]$", txt):
                    txt += "!"
            # entra 145% girando, tremidinha e assenta
            fx = (r"{\fscx145\fscy145\frz-4\t(0,80,\fscx100\fscy100\frz3)"
                  r"\t(80,160,\frz-2)\t(160,240,\frz0)}")
            lines.append(f"Dialogue: 1,{ts(a)},{ts(b)},Grito,,0,0,0,,{fx}{txt}")
        else:
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
    audio = carregar_audio(v)
    segs = transcrever(audio, rec, vad_cfg)
    ass = v.with_suffix(".ass")
    escrever_ass(segs, ass, *dims(v), audio=audio)
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
