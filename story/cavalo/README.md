# Põe na Conta do Cavalo

Comédia de boteco em bonecos de papel, feita com o Skill **Papermorph** ([DozenTwelve/Papermorph](https://github.com/DozenTwelve/Papermorph)), tier *picture book*, no palco vertical (900 × 1600 → MP4 1080 × 1920). Dura cerca de 1 min 52 s.

**Sinopse.** No Bar do Zé tem um cavalo no banheiro masculino, porque o feminino estava ocupado. O Valdir ganhou o bicho no jogo do bicho (o bicheiro estava sem troco). A vigilância sanitária vem hoje, e cada plano do Valdir piora a situação: corda, entalo, óleo do pastel. O cavalo atravessa o bar de barriga e quebra a cachaça de vinte anos. Aí a Dona Neide, freguesa há vinte anos, mostra o crachá de fiscal.

| Pasta | O que tem |
|---|---|
| `poe-na-conta-do-cavalo.mp4` | o vídeo final, 9:16, com legendas gravadas na imagem |
| `poe-na-conta-do-cavalo.srt` | as legendas em arquivo, para subir junto na plataforma |
| `site/cavalo/` | o filme como página web (player do Papermorph: pausa, legendas, velocidade) |
| `site/cavalo/ch01/` | `bar.js` (marcas, planos, ajudantes) e `scene1.js`–`scene6.js`, uma cena por arquivo |
| `site/cavalo/lib/cavalo.js` | elenco (Zé, Valdir, Dona Neide, o cavalo Trovão) e objetos de cena |
| `books/cavalo/` | `story.md` (roteiro), `storyboard.md`, `style.json`, `art/sets.js` (o cenário) |
| `content/cavalo/ch01/` | `narration.pt.json`, as falas |
| `tools/cavalo/` | `audio.sh` (todo o som), `tts_kokoro.py`, `sfx_cavalo.py` (relincho, descarga, óleo, samba) |

## Como gerar de novo

```bash
SKILL=<checkout do Papermorph>/.claude/skills/papermorph
pip install kokoro-onnx soundfile numpy
# modelos do Kokoro (uma vez) em tools/cavalo/models/: kokoro-v1.0.onnx e voices-v1.0.bin, do release
# model-files-v1.0 de github.com/thewh1teagle/kokoro-onnx
sh tools/cavalo/audio.sh                                        # vozes, níveis, bocas, cenas, efeitos
uv run --with playwright --with pillow python $SKILL/scripts/bake_sets.py books/cavalo/art/sets.js site/cavalo bar
python3 $SKILL/scripts/serve.py 8765 site &                     # http://localhost:8765/cavalo/ch01/
uv run --with playwright --with pillow python $SKILL/scripts/bake_puppets.py site/cavalo --url http://localhost:8765/cavalo/
uv run --with playwright --with numpy python $SKILL/scripts/export.py ch01 --url http://localhost:8765/cavalo/ --out books/cavalo/export --no-tags --lufs -14
ffmpeg -i books/cavalo/export/ch01.mp4 -vf "subtitles=books/cavalo/export/ch01.srt:force_style='FontName=DejaVu Sans,Bold=1,FontSize=13,Outline=2,Shadow=0,MarginV=70,Alignment=2'" -c:a copy poe-na-conta-do-cavalo.mp4
```

## O que mudou em relação ao Papermorph de fábrica (e por quê)

- **Vozes:** a rede desta máquina bloqueia o Edge TTS e o HuggingFace. `tts_kokoro.py` roda o `tts.py` do Skill, mas sintetiza com o kokoro-onnx (vozes `pm_alex`, `pm_santa` e `pf_dora`, em pt-br). Os tempos das palavras são estimados pelas pausas reais do áudio.
- **Palco vertical:** o kit de papel (`paper.js`) assumia o quadro de 1600 × 900. A cópia deste livro lê `SW` e `SH`, então câmera, vinheta e cintilação funcionam no 900 × 1600.
- **Bigode:** `cast.js` ganhou a chave `stache` nas formas, desenhada no rosto, para acompanhar o `look`.
- **Legendas gravadas:** o `export.py` não grava legendas na imagem. Para Reels, Shorts e TikTok, o `ffmpeg` as grava a partir do `.srt`.
