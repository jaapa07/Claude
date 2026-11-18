#!/usr/bin/env python3
"""Cortes automáticos de lives/VODs da Twitch.

Detecta os melhores momentos por dois sinais e corta com ffmpeg:
  * chat  – picos de mensagens por segundo + palavras de hype (KKKK, LUL, KEKW, CLIP...)
  * áudio – picos de volume (gritos, risadas, explosões)

Modos:
  vod   URL_DO_VOD        baixa o chat do VOD, acha os picos e baixa só os trechos
  live  CANAL             grava a live em segmentos e corta sozinho quando o chat explode
  local VIDEO [--chat J]  usa um vídeo já baixado (e opcionalmente o chat em JSON)

Dependências: ffmpeg, yt-dlp, chat-downloader  (pip install -r requirements.txt)
"""
from __future__ import annotations

import argparse
import json
import re
import shutil
import statistics
import subprocess
import sys
import threading
import time
from collections import deque
from dataclasses import dataclass, asdict
from pathlib import Path

HYPE = re.compile(
    r"(k{4,}|(ha){3,}|rs{3,}|lul|omegalul|kekw|lmao|pog|poggers|pogchamp|clip|"
    r"monkas|pepelaugh|icant|kappa|wtf|caralho|nossa|que isso|gg|\?{3,}|!{3,})",
    re.IGNORECASE,
)


# --------------------------------------------------------------------------- sinais
def chat_signal(messages: list[tuple[float, str]], duration: int) -> list[float]:
    """Mensagens por segundo, com peso extra para mensagens de hype."""
    s = [0.0] * (duration + 1)
    for t, text in messages:
        i = int(t)
        if 0 <= i <= duration:
            s[i] += 1.0 + 1.5 * len(HYPE.findall(text or ""))
    return s


def audio_signal(video: Path) -> list[float]:
    """Volume RMS (dB) por segundo via ffmpeg astats."""
    cmd = [
        "ffmpeg", "-hide_banner", "-nostats", "-i", str(video), "-vn", "-ac", "1",
        "-af", "aresample=8000,asetnsamples=8000,astats=metadata=1:reset=1,"
               "ametadata=print:key=lavfi.astats.Overall.RMS_level:file=-",
        "-f", "null", "-",
    ]
    out = subprocess.run(cmd, capture_output=True, text=True).stdout
    vals = []
    for m in re.finditer(r"RMS_level=(-?[\d.]+|-inf)", out):
        v = m.group(1)
        vals.append(-90.0 if v == "-inf" else max(float(v), -90.0))
    return vals


def zscore(sig: list[float], window: int = 10, baseline: int = 300) -> list[float]:
    """Soma em janela deslizante, normalizada contra a mediana local (robusto a lives longas)."""
    n = len(sig)
    if n == 0:
        return []
    # média em janela CENTRADA (o pico cai no meio do momento, sem viés nas bordas)
    pref = [0.0]
    for v in sig:
        pref.append(pref[-1] + v)
    h = window // 2
    acc = []
    for i in range(n):
        lo, hi = max(0, i - h), min(n, i - h + window)
        acc.append((pref[hi] - pref[lo]) / (hi - lo))
    out = []
    step = max(1, baseline // 20)
    cache: dict[int, tuple[float, float]] = {}
    for i in range(n):
        k = i // step
        if k not in cache:
            lo, hi = max(0, i - baseline), min(n, i + baseline)
            chunk = acc[lo:hi:3] or [0.0]
            med = statistics.median(chunk)
            mad = statistics.median(abs(x - med) for x in chunk) or 1.0
            cache[k] = (med, mad)
        med, mad = cache[k]
        out.append((acc[i] - med) / (1.4826 * mad))
    return out


@dataclass
class Corte:
    inicio: float
    fim: float
    pico: float
    score: float
    arquivo: str = ""


def escolher_picos(score: list[float], top: int, gap: int, pre: int, post: int,
                   min_score: float, duration: float) -> list[Corte]:
    """Non-max suppression: pega os maiores picos separados por pelo menos `gap` s."""
    order = sorted(range(len(score)), key=lambda i: score[i], reverse=True)
    picked: list[int] = []
    for i in order:
        if score[i] < min_score or len(picked) >= top:
            break
        if all(abs(i - p) >= gap for p in picked):
            picked.append(i)
    cortes = [Corte(max(0.0, p - pre), min(duration, p + post), float(p), round(score[p], 2))
              for p in picked]
    return sorted(cortes, key=lambda c: c.inicio)


def combinar(chat_z: list[float], audio_z: list[float], chat_lag: int,
             w_chat: float, w_audio: float) -> list[float]:
    """O chat reage alguns segundos DEPOIS do momento: desloca o sinal para trás."""
    n = max(len(chat_z), len(audio_z))
    out = []
    for i in range(n):
        c = chat_z[i + chat_lag] if i + chat_lag < len(chat_z) else 0.0
        a = audio_z[i] if i < len(audio_z) else 0.0
        out.append(w_chat * max(c, 0) + w_audio * max(a, 0))
    return out


# --------------------------------------------------------------------------- ffmpeg
def cortar(src: str, c: Corte, dst: Path, vertical: bool, headers: str | None = None):
    vf = []
    if vertical:  # 9:16 com fundo desfocado (formato Shorts/Reels/TikTok)
        vf = ["-filter_complex",
              "[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,"
              "boxblur=20:2[bg];[0:v]scale=1080:-2[fg];[bg][fg]overlay=(W-w)/2:(H-h)/2[v]",
              "-map", "[v]", "-map", "0:a?"]
    cmd = ["ffmpeg", "-hide_banner", "-loglevel", "error", "-y"]
    if headers:
        cmd += ["-headers", headers]
    cmd += ["-ss", f"{c.inicio:.2f}", "-i", src, "-t", f"{c.fim - c.inicio:.2f}", *vf,
            "-c:v", "libx264", "-preset", "veryfast", "-crf", "21",
            "-c:a", "aac", "-b:a", "160k", "-movflags", "+faststart", str(dst)]
    subprocess.run(cmd, check=True)
    c.arquivo = str(dst)


def duracao(video: Path) -> float:
    r = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                        "-of", "csv=p=0", str(video)], capture_output=True, text=True)
    return float(r.stdout.strip() or 0)


def hhmmss(t: float) -> str:
    t = int(t)
    return f"{t // 3600:02d}-{t % 3600 // 60:02d}-{t % 60:02d}"


# --------------------------------------------------------------------------- chat
def baixar_chat(url: str) -> list[tuple[float, str]]:
    from chat_downloader import ChatDownloader
    msgs = []
    for m in ChatDownloader().get_chat(url):
        if "time_in_seconds" in m:
            msgs.append((float(m["time_in_seconds"]), m.get("message", "")))
            if len(msgs) % 5000 == 0:
                print(f"  chat: {len(msgs)} mensagens…", file=sys.stderr)
    return msgs


def ler_chat_json(p: Path) -> list[tuple[float, str]]:
    """Aceita JSON do chat-downloader ou do TwitchDownloader (lay295)."""
    data = json.loads(p.read_text(encoding="utf-8"))
    if isinstance(data, dict) and "comments" in data:  # TwitchDownloader
        return [(c["content_offset_seconds"], c["message"]["body"]) for c in data["comments"]]
    return [(m["time_in_seconds"], m.get("message", "")) for m in data]


# --------------------------------------------------------------------------- modos
def salvar_relatorio(out: Path, cortes: list[Corte]):
    (out / "cortes.json").write_text(json.dumps([asdict(c) for c in cortes], indent=2,
                                                ensure_ascii=False), encoding="utf-8")
    print(f"\n{len(cortes)} cortes em {out}/")
    for c in cortes:
        print(f"  {hhmmss(c.inicio)} → {hhmmss(c.fim)}  score {c.score:6.2f}  {Path(c.arquivo).name}")


def modo_local(a):
    video = Path(a.video)
    dur = duracao(video)
    msgs = ler_chat_json(Path(a.chat)) if a.chat else []
    print(f"vídeo {dur:.0f}s, {len(msgs)} mensagens de chat")
    chat_z = zscore(chat_signal(msgs, int(dur)), a.janela) if msgs else []
    audio_z = zscore(audio_signal(video), a.janela) if a.w_audio > 0 else []
    score = combinar(chat_z, audio_z, a.chat_lag, a.w_chat if msgs else 0, a.w_audio)
    cortes = escolher_picos(score, a.top, a.gap, a.pre, a.post, a.min_score, dur)
    out = Path(a.saida); out.mkdir(parents=True, exist_ok=True)
    for n, c in enumerate(cortes, 1):
        cortar(str(video), c, out / f"corte_{n:02d}_{hhmmss(c.pico)}.mp4", a.vertical)
    salvar_relatorio(out, cortes)


def modo_vod(a):
    import yt_dlp
    print("lendo informações do VOD…")
    with yt_dlp.YoutubeDL({"quiet": True, "format": a.qualidade}) as y:
        info = y.extract_info(a.url, download=False)
    dur = float(info.get("duration") or 0)
    print(f"'{info.get('title')}' – {dur / 3600:.1f} h. Baixando chat (pode demorar)…")
    msgs = baixar_chat(a.url)
    print(f"{len(msgs)} mensagens")
    chat_z = zscore(chat_signal(msgs, int(dur)), a.janela)
    score = combinar(chat_z, [], a.chat_lag, 1.0, 0.0)
    cortes = escolher_picos(score, a.top, a.gap, a.pre, a.post, a.min_score, dur)
    out = Path(a.saida); out.mkdir(parents=True, exist_ok=True)
    # Só baixa os trechos escolhidos, direto do HLS – não precisa baixar a live inteira.
    src = info["url"]
    hdr = "".join(f"{k}: {v}\r\n" for k, v in (info.get("http_headers") or {}).items())
    for n, c in enumerate(cortes, 1):
        print(f"  cortando {n}/{len(cortes)} @ {hhmmss(c.pico)}")
        cortar(src, c, out / f"corte_{n:02d}_{hhmmss(c.pico)}.mp4", a.vertical, hdr or None)
    salvar_relatorio(out, cortes)


def modo_live(a):
    """Grava em segmentos de 10 s; quando o chat explode, junta os segmentos e corta."""
    import yt_dlp
    from chat_downloader import ChatDownloader
    url = f"https://www.twitch.tv/{a.canal}"
    with yt_dlp.YoutubeDL({"quiet": True, "format": a.qualidade}) as y:
        info = y.extract_info(url, download=False)
    out = Path(a.saida); seg_dir = out / "_segmentos"
    seg_dir.mkdir(parents=True, exist_ok=True)
    SEG = 10
    t0 = time.time()
    rec = subprocess.Popen(["ffmpeg", "-hide_banner", "-loglevel", "error", "-i", info["url"],
                            "-c", "copy", "-f", "segment", "-segment_time", str(SEG),
                            "-reset_timestamps", "1", str(seg_dir / "s%06d.ts")])
    print(f"gravando {a.canal}… Ctrl+C para parar")

    counts: deque[float] = deque(maxlen=a.janela)   # mensagens/s recentes
    hist: deque[float] = deque(maxlen=600)          # base dos últimos 10 min (somas da janela)
    cortes: list[Corte] = []
    last_clip = -1e9
    bucket, bucket_t = 0.0, int(time.time())

    def fazer_corte(pico: float, score: float):
        c = Corte(max(0, pico - a.pre), pico + a.post, pico, round(score, 2))
        time.sleep(a.post + SEG + 2)  # espera os segmentos do "depois" serem gravados
        first, last = int(c.inicio // SEG), int(c.fim // SEG)
        parts = [seg_dir / f"s{i:06d}.ts" for i in range(first, last + 1)]
        parts = [p for p in parts if p.exists()]
        if not parts:
            return
        lst = seg_dir / f"lista_{int(pico)}.txt"
        lst.write_text("".join(f"file '{p.resolve()}'\n" for p in parts))
        joined = seg_dir / f"j_{int(pico)}.ts"
        subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-f", "concat", "-safe", "0",
                        "-i", str(lst), "-c", "copy", str(joined)], check=True)
        local = Corte(c.inicio - first * SEG, c.fim - first * SEG, pico, c.score)
        dst = out / f"corte_{len(cortes) + 1:02d}_{hhmmss(pico)}.mp4"
        cortar(str(joined), local, dst, a.vertical)
        c.arquivo = str(dst); cortes.append(c)
        print(f"✂  corte salvo: {dst.name} (score {c.score})")

    try:
        for m in ChatDownloader().get_chat(url):
            now = int(time.time())
            text = m.get("message", "")
            if now == bucket_t:
                bucket += 1.0 + 1.5 * len(HYPE.findall(text))
                continue
            for _ in range(now - bucket_t):  # fecha os segundos que passaram
                counts.append(bucket); bucket = 0.0
                s = sum(counts); hist.append(s)
            bucket_t = now
            bucket = 1.0 + 1.5 * len(HYPE.findall(text))
            if len(hist) < 60:
                continue
            med = statistics.median(hist)
            mad = statistics.median(abs(x - med) for x in hist) or 1.0
            z = (sum(counts) - med) / (1.4826 * mad)
            elapsed = time.time() - t0
            if z >= a.min_score and elapsed - last_clip > a.gap:
                last_clip = elapsed
                pico = elapsed - a.chat_lag
                print(f"🔥 pico de chat (z={z:.1f}) em {hhmmss(pico)}")
                threading.Thread(target=fazer_corte, args=(pico, z), daemon=True).start()
    except KeyboardInterrupt:
        pass
    finally:
        rec.terminate()
        time.sleep(1)
        salvar_relatorio(out, cortes)
        if not a.manter_segmentos:
            shutil.rmtree(seg_dir, ignore_errors=True)


# --------------------------------------------------------------------------- CLI
def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = p.add_subparsers(dest="modo", required=True)

    def comuns(sp):
        sp.add_argument("--saida", default="cortes")
        sp.add_argument("--top", type=int, default=10, help="máx. de cortes")
        sp.add_argument("--pre", type=int, default=25, help="segundos antes do pico")
        sp.add_argument("--post", type=int, default=10, help="segundos depois do pico")
        sp.add_argument("--gap", type=int, default=90, help="distância mínima entre cortes (s)")
        sp.add_argument("--janela", type=int, default=10, help="janela de soma do sinal (s)")
        sp.add_argument("--chat-lag", type=int, default=6, help="atraso de reação do chat (s)")
        sp.add_argument("--min-score", type=float, default=6.0, help="z-score mínimo do pico")
        sp.add_argument("--vertical", action="store_true", help="exporta 9:16 (Shorts/Reels)")
        sp.add_argument("--qualidade", default="best[height<=1080]/best")

    sp = sub.add_parser("vod"); sp.add_argument("url"); comuns(sp)
    sp = sub.add_parser("live"); sp.add_argument("canal"); comuns(sp)
    sp.add_argument("--manter-segmentos", action="store_true")
    sp = sub.add_parser("local"); sp.add_argument("video"); comuns(sp)
    sp.add_argument("--chat", help="JSON do chat (chat-downloader ou TwitchDownloader)")
    sp.add_argument("--w-chat", type=float, default=1.0)
    sp.add_argument("--w-audio", type=float, default=0.6)

    a = p.parse_args()
    {"vod": modo_vod, "live": modo_live, "local": modo_local}[a.modo](a)


if __name__ == "__main__":
    main()
