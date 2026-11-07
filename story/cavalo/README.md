# Põe na Conta do Cavalo (série em 3 partes)

Comédia de boteco em bonecos de papel, feita com o Skill **Papermorph** ([DozenTwelve/Papermorph](https://github.com/DozenTwelve/Papermorph)), tier *picture book*, no palco vertical (900 × 1600 → MP4 1080 × 1920). Cada parte tem mais de 60 s.

| Parte | Vídeo | Duração | Gancho final |
|---|---|---|---|
| 1 — O cavalo no banheiro | `parte1.mp4` | 1:52 | "Põe na conta do cavalo." → CONTINUA NA PARTE 2 |
| 2 — Bar do Trovão | `parte2.mp4` | 1:16 | o cavalo é égua e está prenha; quem é o pai? Dois olhos no banheiro feminino → CONTINUA NA PARTE 3 |
| 3 — Deu Zebra | `parte3.mp4` | 1:05 | o pai é uma zebra, a potrinha nasce listrada, e o pai se tranca no banheiro → FIM |

**Sinopse.** No Bar do Zé tem um cavalo no banheiro masculino, porque o feminino estava ocupado. O Valdir ganhou o bicho no jogo do bicho (o bicheiro estava sem troco). A vigilância sanitária vem hoje, e cada plano do Valdir piora a situação: corda, entalo, óleo do pastel. O cavalo atravessa o bar de barriga e quebra a cachaça de vinte anos. Aí a Dona Neide, freguesa há vinte anos, mostra o crachá de fiscal.

| Pasta | O que tem |
|---|---|
| `parte1.mp4` … `parte3.mp4` | os vídeos finais, 9:16, com legendas gravadas na imagem |
| `parte1.srt` … `parte3.srt` | as legendas em arquivo, para subir junto na plataforma |
| `parte1-capa.jpg` … `parte3-capa.jpg` | as capas 1080 × 1920: faixa PÕE NA CONTA DO CAVALO · PT N e título (`tools/cavalo/covers.js`, fonte Oswald, OFL) |
| `site/cavalo/` | a série como páginas web (player do Papermorph: pausa, legendas, velocidade); `ch01`–`ch03` são as partes |
| `site/cavalo/ch01/bar.js` | o que as três partes compartilham: marcas, planos, câmera do bar |
| `site/cavalo/chNN/sceneN.js` | uma cena por arquivo |
| `site/cavalo/lib/cavalo.js` | elenco (Zé, Valdir, Dona Neide, o Trovão; a zebra e a potrinha são o mesmo boneco com outras cores e listras) e objetos |
| `site/cavalo/lib/series.js` | o que as partes 2 e 3 acrescentam: faixa BAR DO TROVÃO, plaquinha do fiado, caixa de geladeira, porta do banheiro feminino, etiqueta PARTE N |
| `books/cavalo/` | `story.md` (roteiro das 3 partes), `storyboard.md`, `style.json`, `art/sets.js` (o cenário) |
| `content/cavalo/chNN/` | `narration.pt.json`, as falas de cada parte |
| `tools/cavalo/` | `audio.sh` (som da parte 1), `audio23.sh` (partes 2 e 3), `export.sh` (MP4 + legendas), `tts_kokoro.py`, `sfx_cavalo.py` |

## Como gerar de novo

```bash
SKILL=<checkout do Papermorph>/.claude/skills/papermorph
pip install kokoro-onnx soundfile numpy
# modelos do Kokoro (uma vez) em tools/cavalo/models/: kokoro-v1.0.onnx e voices-v1.0.bin, do release
# model-files-v1.0 de github.com/thewh1teagle/kokoro-onnx
sh tools/cavalo/audio.sh && sh tools/cavalo/audio23.sh          # vozes, níveis, bocas, cenas, efeitos
uv run --with playwright --with pillow python $SKILL/scripts/bake_sets.py books/cavalo/art/sets.js site/cavalo bar
python3 $SKILL/scripts/serve.py 8765 site &                     # http://localhost:8765/cavalo/ch01/
uv run --with playwright --with pillow python $SKILL/scripts/bake_puppets.py site/cavalo --url http://localhost:8765/cavalo/
sh tools/cavalo/export.sh 1 2 3                                 # parte1.mp4 … parte3.mp4 com legendas
node tools/cavalo/covers.js                                     # parte1-capa.jpg … parte3-capa.jpg
```

## O que mudou em relação ao Papermorph de fábrica (e por quê)

- **Vozes:** a rede desta máquina bloqueia o Edge TTS e o HuggingFace. `tts_kokoro.py` roda o `tts.py` do Skill, mas sintetiza com o kokoro-onnx (vozes `pm_alex`, `pm_santa` e `pf_dora`, em pt-br). Os tempos das palavras são estimados pelas pausas reais do áudio.
- **Palco vertical:** o kit de papel (`paper.js`) assumia o quadro de 1600 × 900. A cópia deste livro lê `SW` e `SH`, então câmera, vinheta e cintilação funcionam no 900 × 1600.
- **Bigode:** `cast.js` ganhou a chave `stache` nas formas, desenhada no rosto, para acompanhar o `look`.
- **Legendas gravadas:** o `export.py` não grava legendas na imagem. Para Reels, Shorts e TikTok, o `ffmpeg` as grava a partir do `.srt`.
