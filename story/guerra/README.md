# A Grande Guerra do Cocô — temporada 1

Série de comédia adulta absurda em bonecos de papel, feita com o Skill **Papermorph** ([DozenTwelve/Papermorph](https://github.com/DozenTwelve/Papermorph)), tier *picture book*, no palco vertical. São 5 episódios de cerca de 60 s, em sequência; só os personagens falam, sem narrador.

| Ep. | Título | Duração | Vídeo | Legendas | Capa |
|---|---|---|---|---|---|
| 1 | O cocô que se recusou a descer | 1:00 | `videos/ep1.mp4` | `videos/ep1.srt` | `videos/ep1-capa.jpg` |
| 2 | A revolta do esgoto | 1:00 | `videos/ep2.mp4` | `videos/ep2.srt` | `videos/ep2-capa.jpg` |
| 3 | O papel higiênico pede demissão | 1:00 | `videos/ep3.mp4` | `videos/ep3.srt` | `videos/ep3-capa.jpg` |
| 4 | A invasão dos puns | 1:00 | `videos/ep4.mp4` | `videos/ep4.srt` | `videos/ep4-capa.jpg` |
| 5 | O julgamento do cocô | 1:00 | `videos/ep5.mp4` | `videos/ep5.srt` | `videos/ep5-capa.jpg` |

Os MP4 são 1080 × 1920, 30 fps, com as legendas gravadas na imagem; os `.srt` vão junto para as plataformas. O primeiro quadro de cada episódio já é a capa (selo da série e título).

**Para assistir a temporada no navegador:** `python3 <SKILL>/scripts/serve.py 8766 site` e abra `http://localhost:8766/guerra/`. A página tem os 5 episódios no player do Papermorph (pausa, legendas, velocidade, próximo episódio).

## O que tem aqui

| Pasta | Conteúdo |
|---|---|
| `books/guerra/plan.md` | plano da temporada: personagens, vozes, cenários, continuidade, o que foi acrescentado ao roteiro |
| `books/guerra/art/sets.js` | os 6 cenários (banheiro, esgoto, escritório de RH, fábrica, sala, tribunal) |
| `content/guerra/chNN/narration.pt.json` | as falas de cada episódio, por personagem |
| `site/guerra/lib/toons.js` | o construtor de bonecos de papel e os 11 personagens |
| `site/guerra/lib/fx.js` | efeitos: cartão de título, alarme, linhas de velocidade, onda da descarga, KABUM, gotas, fedor |
| `site/guerra/lib/guerra.js` | marcas, planos e montagem de cada cenário com o elenco |
| `site/guerra/chNN/sceneN.js` | as cenas, uma por arquivo (6 por episódio) |
| `tools/guerra/` | `audio.sh N` (vozes, níveis, eco, bocas, cenas), `export.sh N…` (MP4 + SRT), `sfx_guerra.py` (descarga, peidos, sirene, explosão, martelo, torcida, marchinha), `tts_kokoro.py` (Kokoro local com tom por personagem), `mkpages.py` |
| `post.md` | descrição pronta para cada episódio |

## Como gerar de novo

```bash
SKILL=<checkout do Papermorph>/.claude/skills/papermorph
pip install kokoro-onnx soundfile numpy
# modelos do Kokoro em tools/guerra/models/ (kokoro-v1.0.onnx e voices-v1.0.bin, release model-files-v1.0 do kokoro-onnx)
for n in 1 2 3 4 5; do sh tools/guerra/audio.sh $n; done
uv run --with numpy python $SKILL/scripts/sfx.py site/guerra/audio/sfx all --recipes tools/guerra/sfx_guerra.py
uv run --with playwright --with pillow python $SKILL/scripts/bake_sets.py books/guerra/art/sets.js site/guerra
python3 $SKILL/scripts/serve.py 8766 site &
uv run --with playwright --with pillow python $SKILL/scripts/bake_puppets.py site/guerra --url http://localhost:8766/guerra/
sh tools/guerra/export.sh 1 2 3 4 5
```

## Decisões técnicas

- **Vozes:** Kokoro local, só vozes pt-br (`pm_alex`, `pm_santa`, `pf_dora`). Como são só três, cada personagem tem um fator de tom (`voz@fator`, ex.: `pm_santa@0.86` para o Tonhão): o clipe é sintetizado mais rápido ou mais lento e reamostrado, então o tom muda e a velocidade da fala fica a mesma. A voz do Tonhão no encanamento (ep. 1) e a gravação (ep. 5) recebem eco.
- **Sincronia:** as bocas seguem os tempos das palavras (`mouths.py`); as legendas vêm dos mesmos tempos; cada cena é um clipe juntado (`join.py`) com silêncios marcados para as pausas cômicas.
- **Kit de papel na vertical:** o `paper.js` do livro lê `SW`/`SH` (900 × 1600) em vez do quadro 1600 × 900.
