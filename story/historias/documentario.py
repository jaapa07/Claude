"""documentario.py: um documentário narrado (16:9) a partir de um doc.json com seções de tempo fixo.

  python historias/documentario.py historias/doc_001_carro

Gera, na pasta do documentário:
  narracao.wav/.mp3            voz Kokoro (pt-BR); cada bloco entra no início exato da sua seção
  narracao_com_trilha.wav/.mp3 voz + trilha documental crescente + sons de fábrica e motor (-14 LUFS)
  legendas_palavra.srt         uma palavra por vez, centralizada (estilo dos explicativos 3D)
  legendas_frases.srt          legendas de frases curtas (alternativa)
  roteiro.txt                  narração com tempos de entrada e saída de cada bloco
  prompts_visuais.txt          cada cena (até 8 s) com tempo, câmera, sons e o prompt completo para Veo/Flow
  guia_de_montagem.txt         ordem de montagem na edição"""
import json, os, re, shutil, subprocess, sys
HERE = os.path.dirname(os.path.abspath(__file__)); ENGINE = os.path.join(os.path.dirname(HERE), "engine")
FF = shutil.which("ffmpeg") or "ffmpeg"
LEAD = 0.6                                                  # cada bloco entra 0,6 s depois do início da seção


def ts(t, srt=False):
    m, s = divmod(max(0.0, t), 60)
    return f"00:{int(m):02d}:{s:06.3f}".replace(".", ",") if srt else f"{int(m)}:{s:04.1f}"


def timing(d):
    raw = open(os.path.join(d, "timing.js"), encoding="utf-8").read().strip()
    return json.loads(re.sub(r"^window\.TIMING\s*=\s*|;\s*$", "", raw))


def voice(d, D, pauses):
    lines = [{"text": S["narracao"], "pause": round(p, 3)} for S, p in zip(D["secoes"], pauses)]
    json.dump({"voice": D["voz"], "speed": D["velocidade"], "lang": "pt-br", "align": "estimate", "lead": D["secoes"][0]["inicio"] + LEAD, "lines": lines},
              open(os.path.join(d, "lines.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    subprocess.run([sys.executable, os.path.join(ENGINE, "voice.py"), d], check=True, stdout=subprocess.DEVNULL)
    return timing(d)


def write(path, text): open(path, "w", encoding="utf-8").write(text.rstrip() + "\n")


def mp3(src): subprocess.run([FF, "-y", "-loglevel", "error", "-i", src, "-codec:a", "libmp3lame", "-b:a", "192k", src[:-4] + ".mp3"], check=True)


def main():
    d = os.path.abspath(sys.argv[1]); D = json.load(open(os.path.join(d, "doc.json"), encoding="utf-8")); S = D["secoes"]
    total = S[-1]["fim"]
    # 1) first pass: block durations; 2) second pass: pauses that put each block at its section start
    T = voice(d, D, [0.5] * len(S))
    durs = [L["end"] - L["start"] for L in T["lines"]]
    pauses, warn = [], []
    for i in range(len(S)):
        if i + 1 < len(S):
            p = (S[i + 1]["inicio"] + LEAD) - (S[i]["inicio"] + LEAD + durs[i])
            if p < 0.3: warn.append(f"bloco {i + 1} passa {0.3 - p:.1f} s da sua seção"); p = 0.3
        else: p = 0.3
        pauses.append(p)
    T = voice(d, D, pauses)
    end = max(total, T["voice_end"] + 2.5)
    shutil.copy(os.path.join(d, "narration.wav"), os.path.join(d, "narracao.wav")); mp3(os.path.join(d, "narracao.wav"))
    # sound: the documentary bed rises section by section; factory and engine sounds at their times
    json.dump({"mixkit": False, "roomtone": False, "music": {"level": -15}, "bed": D["bed"], "sfx": D["sfx"]},
              open(os.path.join(d, "sfx.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    subprocess.run([sys.executable, os.path.join(ENGINE, "sound.py"), d, str(end)], check=True, stdout=subprocess.DEVNULL)
    shutil.move(os.path.join(d, "mix.wav"), os.path.join(d, "narracao_com_trilha.wav")); mp3(os.path.join(d, "narracao_com_trilha.wav"))
    # subtitles: one word at a time (the 3D-explainer style), and short phrases
    w1, w3 = [], []
    for L in T["lines"]:
        raw = L["text"].split(); ws = L["words"]; same = len(raw) == len(ws)
        for i, x in enumerate(ws):
            nxt = ws[i + 1]["s"] if i + 1 < len(ws) else x["e"] + 0.3
            w1.append((x["s"], max(x["s"] + 0.15, nxt - 0.02), re.sub(r"[.,;:!?]+$", "", raw[i] if same else x["w"]).upper()))
        cur = []
        for i, x in enumerate(ws):
            word = raw[i] if same else x["w"]; cur.append((x, word))
            if len(cur) >= 4 or re.search(r"[.,;:!?]$", word) or i == len(ws) - 1:
                w3.append((cur[0][0]["s"], cur[-1][0]["e"] + 0.25, " ".join(c[1] for c in cur).rstrip(",.;:"))); cur = []
    for name, rows in (("legendas_palavra.srt", w1), ("legendas_frases.srt", w3)):
        out = []
        for k, (a, b, txt) in enumerate(rows, 1): out += [str(k), f"{ts(a, True)} --> {ts(b, True)}", txt, ""]
        write(os.path.join(d, name), "\n".join(out))
    # script with times
    r = [D["titulo"], "=" * 60, f"Formato: {D['formato']} · duração final {ts(end)} · voz Kokoro {D['voz']} (pt-BR, masculina, a mais grave)", ""]
    for Sx, L in zip(S, T["lines"]):
        r += [f"{Sx['n']}. {Sx['titulo']}  [{ts(Sx['inicio'])} – {ts(Sx['fim'])}]", f"   narração: {ts(L['start'])} → {ts(L['end'])}", f"   \"{L['text']}\"", ""]
    if warn: r += ["AVISO: " + "; ".join(warn)]
    write(os.path.join(d, "roteiro.txt"), "\n".join(r))
    # visual prompts: each scene placed inside its section window
    F = D["fichas"]; p = [f"{D['titulo']}: PROMPTS VISUAIS (Google Flow / Veo, 16:9)", "=" * 60, "",
                          "Gere cada cena separadamente, com o áudio da ferramenta desligado; o som vem de narracao_com_trilha.wav.",
                          "Use a MESMA imagem de referência do carro (e do Rafael) em todas as cenas do Flow para manter o modelo idêntico.",
                          "Cada cena tem no máximo 8 s (o limite do Veo). Monte na ordem e nos tempos abaixo.", "",
                          "FICHAS FIXAS (já incluídas em cada prompt quando o personagem ou o lugar aparece):"] + [f"  {v}" for v in F.values()] + [""]
    k = 0
    for Sx, L in zip(S, T["lines"]):
        t0 = Sx["inicio"]; span = Sx["fim"] - Sx["inicio"]; tot = sum(c["dur"] for c in Sx["cenas"]); scale = span / tot
        p += [f"── {Sx['n']}. {Sx['titulo']} ({ts(Sx['inicio'])} – {ts(Sx['fim'])}) ──", f"   narração entra em {ts(L['start'])}: \"{L['text']}\"", ""]
        for C in Sx["cenas"]:
            k += 1; dur = C["dur"] * scale
            chars = " ".join(v + "." for key, v in F.items() if key in C["prompt"])
            p += [f"CENA {k:02d} — {C['plano']}", f"  tempo: {ts(t0)} → {ts(t0 + dur)}  ({dur:.1f} s)", f"  câmera: {C['camera']}", f"  sons: {C['sfx']}",
                  f"  arquivo: cenas/cena_{k:02d}.mp4", "  PROMPT:", f"  {D['estilo']} {C['prompt']} {chars}".rstrip(), ""]
            t0 += dur
    write(os.path.join(d, "prompts_visuais.txt"), "\n".join(p))
    write(os.path.join(d, "guia_de_montagem.txt"), "\n".join([
        f"{D['titulo']}: GUIA DE MONTAGEM", "",
        "1. Gere as cenas de prompts_visuais.txt no Veo/Flow (16:9). Salve em cenas/cena_01.mp4 ... na ordem.",
        "2. No editor (CapCut, Premiere ou DaVinci), crie uma sequência 16:9 em 4K e 30 fps.",
        "3. Coloque narracao_com_trilha.wav como faixa de áudio principal, começando em 0:00.",
        "4. Coloque cada cena no tempo indicado; corte ou acelere para caber na janela de cada seção.",
        "5. Transições: corte seco dentro de uma seção; fusão de 0,5 s entre seções (a cena 04 já termina num 'match cut' do desenho).",
        "6. Legendas: legendas_palavra.srt (uma palavra por vez, no centro, fonte bold branca com contorno preto, no estilo do",
        "   vídeo de referência) ou legendas_frases.srt (frases curtas, embaixo).",
        "7. Opcional no estilo de referência: uma barra de progresso fina no topo; os títulos das 9 etapas como cartelas de 1,5 s.",
        "8. Exporte em 4K, H.264 ou H.265, áudio AAC 320 kbps. Para Reels/TikTok, faça um corte vertical de 60 s com as etapas 3, 4, 6 e 8."]))
    print(f"pronto: {d} · {ts(end)} · {k} cenas" + (" · " + "; ".join(warn) if warn else ""))


if __name__ == "__main__":
    main()
