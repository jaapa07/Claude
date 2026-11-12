# Sem Água: curta de comédia (≈ 88 s, 9:16)

Animação 3D estilizada, narrada em primeira pessoa pelo protagonista: um cara tímido de óculos redondos, camiseta mostarda, jeans e tênis branco (a mesma roupa o filme inteiro). O humor vem das expressões e do contraste entre a pose tranquila e o pânico por dentro. Nada é mostrado do ato: só enquadramentos acima dos ombros, sons discretos e reações.

| Tempo | Cena | O que acontece | Narração / falas |
|---|---|---|---|
| 0–8 s | 1. A cervejinha inocente | Boteco amarelo e verde, mesa com Beto, Carla e Zé. Brinde, ele sorri. | "Era pra ser só uma cervejinha com os amigos. Eu não sabia que aquela noite ia terminar numa operação de fuga." |
| 8–22 s | 2. O aviso | **RONC!** Close no sorriso que some (dolly zoom). Relógio: 21:12, 21:13, 21:14, 21:15 em cortes rápidos: ele se ajeita, cruza as pernas, sua. | Beto: "Tá tudo bem?" / Ele: "Tô só… prestando atenção." / "Em um único músculo." |
| 22–30 s | 3. A caminhada | HUD vermelho **MISSÃO: BANHEIRO**, distância contando de 12 m a 0. Passinhos curtos e rígidos, desvio do garçom, corredor com lâmpada piscando. Trilha de suspense exagerada que corta na batida da porta. | "Doze metros até o banheiro. Os doze mais longos da minha vida." |
| 30–40 s | 4. O alívio | Só rosto e ombros: suspiro, felicidade, pad quentinho. Mão na descarga: *clic.* Silêncio absoluto. *clic. clic. clic.* Nada. Um grilo. | "Por trinta segundos, eu fui o homem mais feliz do Brasil." |
| 40–51 s | 5. A falsa esperança | Feixe de luz no balde azul, coro celestial. Ele pega o balde, abre a torneira: **PFFF**, um sopro seco. O coro desafina. | "Fiquei segurando um balde vazio diante de uma situação cheia." |
| 51–63 s | 6. A fuga | Olha pro vaso (fora de quadro), olha pra porta, respira fundo. Abre a porta casual. Placa **UNISSEX** e uma mulher esperando. Olhares. Aceno sem graça. Ela acena de volta com a cabeça, natural. Silêncio longo. Ela entra; a porta fecha. | "Só restava uma saída." |
| 63–73 s | 7. A confissão | Na mesa, cochichando. Os amigos explodem de rir; ele esconde o rosto nas mãos. | Ele: "Gente… o banheiro tá sem água, e eu tentei dar a descar…" / "Eles começaram a rir antes de eu terminar a palavra descarga." |
| 73–81 s | 8. A despedida | Sai do bar andando de pernas abertas, queixo erguido. Corte para a porta do banheiro com o aviso **INTERDITADO · sem água**. | "Fui embora com a bunda assada e uma certeza: naquele bar, eu deixei uma impressão muito forte." |
| 81–85 s | Créditos | SEM ÁGUA · um curta de comédia · "baseado em fatos que ninguém admite em voz alta" · "nenhum vaso foi ferido durante as gravações". Fecho de cavaquinho. | |
| 85–88 s | Corte seco | Tela preta. Uma descarga que finalmente funciona. | |

## Como gerar de novo

```bash
pip install kokoro-onnx soundfile numpy
python ../engine/voice.py .            # narração + timing.js
python extra_voice.py                  # suspiro e risadas
node ../engine/render.js film.html stills --at 9.6,31,60   # conferência
# beats.json: os tempos das batidas, lidos da página (window.BEATS)
python sound_bar.py                    # mix.wav (-14 LUFS), todo o som feito em código
node ../engine/render.js film.html frames --from 0 --to 900   # 3 faixas em paralelo
python ../engine/encode.py .           # sem_agua.mp4 + sheet.jpg
node ../engine/render.js "film.html#cover" cover
```
