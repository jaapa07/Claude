"""estudio.py: o estúdio de histórias interativas. Uma história = um arquivo historia.json; este script gera o resto.

  python historias/estudio.py historias/historia_001            tudo (narração, trilha, roteiros, prompts, legendas, textos)
  python historias/estudio.py historias/historia_001 --sem-voz   só os textos (usa a narração já gerada)

Para cada episódio (episodio_01, episodio_02, ...):
  narracao.wav / .mp3            a voz Kokoro (pt-BR), sozinha
  narracao_com_trilha.wav / .mp3 voz + trilha original + efeitos, a -14 LUFS (pronto para a edição)
  roteiro.txt                    a narração completa, com o tempo de entrada e saída de cada fala e quem fala
  prompts_visuais.txt            cada cena com duração, trecho da narração, câmera, efeitos e o prompt para Veo/Flow
  legendas.srt                   legendas de 1 a 3 palavras, sincronizadas com a voz
  cenas/                         onde entram os clipes gerados (cena_01.mp4, ...), mais o cartão final
Na raiz da história: conceito.md, personagem_principal.txt, identidade_visual.txt, trilha_sonora.txt, descricao_tiktok.txt

Usa o motor em ../engine (voice.py com Kokoro, sound.py para a trilha). Nada aqui inventa vozes: os nomes vêm de historia.json
e são conferidos contra a lista real do Kokoro antes de gerar."""
import json, os, re, shutil, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE); ENGINE = os.path.join(ROOT, "engine")
FF = shutil.which("ffmpeg") or "ffmpeg"
STYLE = ("Vertical 9:16 frame, 4K, cinematic realism, 35mm anamorphic look, shallow depth of field, dramatic low-key lighting, "
         "deep shadows, cold green neon and warm amber palette, light film grain, consistent characters, "
         "no subtitles, no captions, no watermark, no on-screen text unless described.")
CARD_PAD = 3.6            # segundos de cartão final depois da voz (o episódio fica com voz + ~3,6 s, perto de 65 s)


def ts(t, srt=False):
    m, s = divmod(max(0.0, t), 60)
    return f"00:{int(m):02d}:{s:06.3f}".replace(".", ",") if srt else f"{int(m):02d}:{s:04.1f}"


def kokoro_voices():
    sys.path.insert(0, ENGINE)
    from kokoro_onnx import Kokoro
    k = Kokoro(os.path.join(ENGINE, "models", "kokoro-v1.0.onnx"), os.path.join(ENGINE, "models", "voices-v1.0.bin"))
    return set(k.get_voices())


def load_timing(ep_dir):
    raw = open(os.path.join(ep_dir, "timing.js"), encoding="utf-8").read().strip()
    return json.loads(re.sub(r"^window\.TIMING\s*=\s*|;\s*$", "", raw))


FUNC = set(("a o as os um uma uns umas de do da dos das em no na nos nas num numa pra pro para por pelo pela com sem e ou mas "
             "que se seu sua meu minha te me não ao à é").split())


def chunks(T):
    """legenda por sentido: até 3 palavras, quebra na pontuação, nunca termina em palavra de ligação ('de', 'e', 'que'...)"""
    out = []
    for L in T["lines"]:
        cur = []
        ws = L["words"]; raw = L["text"].split(); same = len(raw) == len(ws)
        for i, w in enumerate(ws):
            w = dict(w, w=raw[i] if same else w["w"]); cur.append(w)
            bare = re.sub(r"[^\wÀ-ú]", "", w["w"].lower())
            last = i == len(ws) - 1
            punct = re.search(r"[.,!?:;…]$", w["w"])
            if last or punct or (len(cur) >= 3 and bare not in FUNC) or len(cur) >= 4:
                out.append((cur[0]["s"], cur[-1]["e"], " ".join(x["w"] for x in cur).rstrip(" ,.;:…")))
                cur = []
    fixed = []
    for i, (s, e, txt) in enumerate(out):
        nxt = out[i + 1][0] if i + 1 < len(out) else e + 0.6
        fixed.append((s, max(s + 0.3, min(nxt - 0.02, e + 0.4)), txt.upper()))
    return fixed


def write(path, text):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    open(path, "w", encoding="utf-8").write(text.rstrip() + "\n")


def mp3(src):
    subprocess.run([FF, "-y", "-loglevel", "error", "-i", src, "-codec:a", "libmp3lame", "-b:a", "192k", src[:-4] + ".mp3"], check=True)


def main():
    story = os.path.abspath(sys.argv[1]); H = json.load(open(os.path.join(story, "historia.json"), encoding="utf-8"))
    with_voice = "--sem-voz" not in sys.argv
    V = H["vozes"]
    if with_voice:
        have = kokoro_voices()
        missing = [v for v in V.values() if v not in have]
        if missing: sys.exit(f"Vozes que não existem nesta instalação do Kokoro: {missing}. Portuguesas disponíveis: {sorted(x for x in have if x[0] == 'p')}")
        print("vozes conferidas no Kokoro:", V)
    P = H["personagens"]
    tag = {"LIA": P.get("lia"), "RECEPTIONIST": P.get("recepcionista"), "CAT": P.get("gato"), "ROOM 313": P.get("quarto"), "WORKSHOP": P.get("oficina")}
    resumo_eps = []
    for E in H["episodios"]:
        ep = os.path.join(story, f"episodio_{E['n']:02d}"); os.makedirs(os.path.join(ep, "cenas"), exist_ok=True)
        # ---- narração (Kokoro) ----
        lines = [{**{k: v for k, v in F.items() if k not in ("voz",)}, "voice": V[F.get("voz", "narrador")],
                  "speed": round(H.get("velocidade_base", 1.0) * E.get("velocidade", 1.0) * F.get("speed", 1.0), 3),
                  "pause": round(F.get("pause", 0.3) + E.get("pausa_extra", 0.0), 3)} for F in E["falas"]]
        spec = {"voice": V["narrador"], "speed": H.get("velocidade_base", 1.0), "lang": "pt-br", "align": "estimate", "lines": lines}
        json.dump(spec, open(os.path.join(ep, "lines.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
        if with_voice:
            subprocess.run([sys.executable, os.path.join(ENGINE, "voice.py"), ep], check=True, stdout=subprocess.DEVNULL)
            shutil.copy(os.path.join(ep, "narration.wav"), os.path.join(ep, "narracao.wav")); mp3(os.path.join(ep, "narracao.wav"))
        T = load_timing(ep); total = round(T["voice_end"] + CARD_PAD, 2)
        # ---- trilha + efeitos (originais, feitos em código) ----
        sfx = {"mixkit": False, "roomtone": False, "music": {"level": -13}, "bed": E.get("bed", [{"at": 0, "level": 0.7}]),
               "sfx": E.get("sfx", []) + [{"at": round(T["voice_end"] + 0.25, 2), "type": "hit", "vol": 0.8}]}
        json.dump(sfx, open(os.path.join(ep, "sfx.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
        if with_voice:
            subprocess.run([sys.executable, os.path.join(ENGINE, "sound.py"), ep, str(total)], check=True, stdout=subprocess.DEVNULL)
            shutil.move(os.path.join(ep, "mix.wav"), os.path.join(ep, "narracao_com_trilha.wav")); mp3(os.path.join(ep, "narracao_com_trilha.wav"))
        # ---- roteiro.txt ----
        who = {v: k for k, v in V.items()}
        r = [f"{H['titulo']} — EPISÓDIO {E['n']}: {E['titulo']}", "=" * 60, "", "RESUMO", E["resumo"], "",
             f"DURAÇÃO: {total:.1f} s (voz {T['voice_end']:.1f} s + cartão final {CARD_PAD:.1f} s)", "", "NARRAÇÃO (entrada → saída · voz · fala)", ""]
        for L in T["lines"]:
            v = L.get("voice", V["narrador"]); r.append(f"[{ts(L['start'])} → {ts(L['end'])}]  {who.get(v, v).upper()} ({v}): {L['text']}")
        r += ["", f"CARTÃO FINAL ({ts(T['voice_end'] + 0.3)} → {ts(total)}): " + " / ".join(E['card'].get('titulo', [])) +
              ("  ·  " + " | ".join(E['card']['opcoes']) if E['card'].get('opcoes') else ""), "", "GANCHO PARA O PRÓXIMO EPISÓDIO", E["gancho_final"]]
        write(os.path.join(ep, "roteiro.txt"), "\n".join(r))
        # ---- prompts_visuais.txt ----
        starts = [T["lines"][S["de"]]["start"] if S["de"] else 0.0 for S in E["cenas"]]
        ends = starts[1:] + [T["voice_end"] + 0.3]
        p = [f"{H['titulo']} — EPISÓDIO {E['n']}: PROMPTS VISUAIS (Google Flow / Veo, 9:16)", "=" * 60, "",
             "COMO USAR: gere cada cena separadamente, com o áudio da ferramenta desligado. A narração e a trilha vêm de",
             "narracao_com_trilha.wav. Monte as cenas na ordem e nos tempos abaixo (CapCut ou Premiere) e coloque legendas.srt por cima.",
             "ESPELHAR = SIM: depois de gerar, inverta o clipe na horizontal na edição (é a regra do espelho; veja identidade_visual.txt).",
             "Cenas com mais de 8 s: gere em 2 tomadas, porque o Veo faz no máximo 8 s por clipe.", ""]
        for i, (S, a, b) in enumerate(zip(E["cenas"], starts, ends)):
            li = S["de"]; nxt = E["cenas"][i + 1]["de"] if i + 1 < len(E["cenas"]) else len(T["lines"])
            narr = " ".join(T["lines"][k]["text"] for k in range(li, nxt))
            chars = " ".join(f"{k}: {v}." for k, v in tag.items() if v and k in S["prompt"])
            d = b - a
            p += [f"CENA {i + 1:02d} — {S['plano']}", f"  tempo: {ts(a)} → {ts(b)}  ({d:.1f} s){'  · GERAR EM 2 TOMADAS' if d > 8 else ''}",
                  f"  espelhar na edição: {'SIM' if S.get('espelhar') else 'NÃO'}",
                  f"  narração entra em {ts(T['lines'][li]['start'])}: \"{narr}\"",
                  f"  câmera: {S['camera']}", f"  efeitos: {S['sfx']}",
                  f"  arquivo: cenas/cena_{i + 1:02d}.mp4", "  PROMPT:", f"  {STYLE} {S['prompt']} {chars}".rstrip(), ""]
        p += [f"CARTÃO FINAL — {ts(T['voice_end'] + 0.3)} → {ts(total)}: use cenas/cartao_final.jpg (gerado pelo estúdio)."]
        write(os.path.join(ep, "prompts_visuais.txt"), "\n".join(p))
        # ---- legendas.srt ----
        srt = []
        for k, (s, e, txt) in enumerate(chunks(T), 1): srt += [str(k), f"{ts(s, True)} --> {ts(e, True)}", txt, ""]
        write(os.path.join(ep, "legendas.srt"), "\n".join(srt))
        write(os.path.join(ep, "cenas", "LEIA-ME.txt"), f"Coloque aqui os clipes gerados: cena_01.mp4 a cena_{len(E['cenas']):02d}.mp4 (veja ../prompts_visuais.txt).\n"
              "cartao_final.jpg é o cartão de escolha do fim do episódio.")
        resumo_eps.append((E, total))
        print(f"episódio {E['n']}: voz {T['voice_end']:.1f} s, total {total:.1f} s, {len(E['cenas'])} cenas")
    # ---- arquivos da história ----
    write(os.path.join(story, "personagem_principal.txt"), "\n".join([
        "LIA MORENO — personagem principal", "", "Idade: 31 anos. Profissão: restauradora de espelhos antigos (São Paulo).",
        "Aparência fixa: pele morena clara; cabelo preto liso, chanel na altura do queixo, com franja reta; olhos castanho-escuros;",
        "  cicatriz fina e clara atravessando a sobrancelha ESQUERDA; argolas pequenas de prata.",
        "Roupa fixa (todos os episódios): jaqueta de veludo vinho sobre camiseta branca lisa, jeans escuro reto, coturno preto de amarrar,",
        "  relógio dourado de ponteiros no pulso ESQUERDO, aliança fina de prata no anelar ESQUERDO.",
        "Personalidade: metódica, observadora, calma sob pressão; fala pouco; repara em detalhes (é o trabalho dela).",
        "", "IMPORTANTE: gere a Lia sempre com cicatriz, relógio e aliança do lado ESQUERDO. A inversão para o lado direito acontece",
        "na edição (veja a regra do espelho em identidade_visual.txt). É isso que esconde a reviravolta.",
        "", "Bloco para colar nos prompts (inglês):", P["lia"], "",
        "SECUNDÁRIOS", "Recepcionista: " + P["recepcionista"], "Gato: " + P["gato"], "", "LUGARES", "Quarto 313: " + P["quarto"], "Oficina: " + P["oficina"]]))
    write(os.path.join(story, "identidade_visual.txt"), "\n".join([
        f"{H['titulo']} — IDENTIDADE VISUAL", "",
        "Formato: vertical 9:16, 4K, realismo cinematográfico, lente anamórfica de 35 mm, profundidade de campo rasa, grão de filme leve.",
        "Paleta: verde neon frio (da farmácia), âmbar quente (abajures), sombras quase pretas; o vinho da jaqueta da Lia é a única cor forte.",
        "Luz: low-key, uma fonte dura por cena; chuva na janela projetando sombras que escorrem; poeira visível só dentro dos feixes de luz.",
        "Câmera: push-ins lentos nos mistérios, planos abertos de cima para o isolamento, macros nas pistas, cortes secos nos sustos.",
        "", "A REGRA DO ESPELHO (o truque de produção que esconde a reviravolta)",
        "1. Gere TODOS os clipes normalmente, com a Lia de cicatriz, relógio e aliança do lado ESQUERDO.",
        "2. Na edição, inverta na horizontal todo clipe marcado com 'espelhar: SIM' (tudo que acontece no lado do espelho: o quarto, o",
        "   recepcionista, a Lia que nós acompanhamos). Com isso a aliança vai para a mão direita, o relógio da parede gira ao contrário e",
        "   as palavras dentro do quarto ficam invertidas, sem a IA precisar escrever nada ao contrário.",
        "3. NÃO inverta o mundo real: a farmácia, a rua, a placa do espelho, a 'verdadeira Lia' dentro do vidro, o arquivo de 1974.",
        "   A narração diz que a placa da farmácia está 'escrita ao contrário', mas o espectador vê a placa normal: essa contradição é a pista.",
        "", "Textos na tela: escreva na edição, não peça para a IA. Os geradores de vídeo erram letras. Isso vale para o bilhete, a placa",
        "NÃO PERTURBE e as letras A, B e C. Fonte das legendas e dos cartões: Oswald Bold, maiúsculas, contorno preto, a palavra-chave",
        "em amarelo ou vermelho. Use legendas.srt.",
        "Cartão final: cenas/cartao_final.jpg de cada episódio (fundo escuro, pergunta e opções coloridas).",
        "Continuidade: use a mesma imagem de referência da Lia (ingredients / reference image) em todas as cenas do Flow."]))
    trilha = [f"{H['titulo']} — TRILHA SONORA E EFEITOS", "",
              "Identidade: um drone grave em ré menor e o tique-taque do relógio do quarto 313 como assinatura (aparece toda vez que o tempo importa).",
              "Batimento cardíaco nas decisões; chuva constante no quarto; silêncio total antes de cada revelação.",
              "Toda a trilha e todos os efeitos são originais, gerados em código (sem samples de terceiros): pode usar à vontade.",
              "Mixagem: a música fica 13 dB abaixo da voz enquanto ela fala e cresce nos silêncios; o resultado sai em -14 LUFS (padrão das redes).",
              "Arquivos: narracao_com_trilha.wav/.mp3 (pronto) e narracao.wav/.mp3 (voz sozinha, se quiser usar outra trilha).", ""]
    for E, total in resumo_eps:
        trilha += [f"Episódio {E['n']} ({total:.1f} s):"] + [f"  {s['at']}: {s['type']} (vol {s.get('vol', 0.7)})" for s in E.get("sfx", [])] + [""]
    write(os.path.join(story, "trilha_sonora.txt"), "\n".join(trilha))
    desc = [f"{H['titulo']} — TEXTOS PARA TIKTOK / REELS / SHORTS", ""]
    capt = {1: "Ela acordou às 3:13… e o reflexo dela continuou dormindo. Todas as pistas estão neste vídeo. Você viu? 👁️",
            2: "Três saídas. Só uma salva a Lia. A resposta estava no episódio 1. Comente A, B ou C 🚪🪞🪟",
            3: "Vocês escolheram… e agora? Quem é a verdadeira Lia? 😶",
            4: "Final. Volte ao episódio 1 depois de assistir. Você vai ver tudo diferente. 🪞"}
    pin = {1: "Comente o que tem de ERRADO nesse quarto. Quem achar as 5 pistas ganha o fixado 👇",
           2: "A, B ou C? Explique o porquê nos comentários. 🧠",
           3: "Time 'a de fora' ou time 'a de dentro'? 👇",
           4: "Quantas pistas você tinha percebido? 0 a 5 👇"}
    for E, total in resumo_eps:
        desc += [f"EPISÓDIO {E['n']}: {E['titulo']}", f"Legenda: {capt.get(E['n'], '')}", "Hashtags: #suspense #misterio #terror #plottwist #historias",
                 f"Comentário fixado: {pin.get(E['n'], '')}", "Postagem: 19h–22h; o próximo episódio em 24–48 h, como 'responder comentário com vídeo'.", ""]
    write(os.path.join(story, "descricao_tiktok.txt"), "\n".join(desc))
    print("pronto:", story)


if __name__ == "__main__":
    main()
