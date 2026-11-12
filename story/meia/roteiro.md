# A Meia: curta de comédia adulta em 3D (≈ 94 s, 9:16)

**Elenco** (mesma roupa, mesmo rosto e mesma voz o filme todo)
- **Reny:** camiseta verde-água, calça jeans, tênis vermelho, meia branca com listra vermelha, cabelo preto curto e barba rala. Voz: Kokoro `pm_alex`.
- **Dudu:** o piadista, boné laranja e camiseta amarela. Voz: Kokoro `pm_santa`.
- **Léo:** cabelo cacheado, óculos e camisa azul; não bebeu e dirige. Voz: `pm_alex` com o tom bem mais grave.
- **Fila:** a moça de blusa roxa. Voz: `pf_dora`.

| Tempo | Cena | O que acontece | Falas |
|---|---|---|---|
| 0–15 s | 1. A noite começa bem | Fachada **BAR DA UNIVEL**. Brinde nas mesas de plástico; Léo com refrigerante. **RONC!** O sorriso some (dolly zoom). | Reny: "Rapaziada… preciso ir no banheiro. Agora." / Dudu: "Vai lá, guerreiro!" |
| 15–30 s | 2. Banheiro sem segurança | Ele bate a porta. No lugar da tranca, só dois furos. A porta volta a abrir sozinha: **NHÉÉÉC**. Olha pra câmera. Só rosto e tênis; ele segura a porta com uma mão. A fila cresce. **TOC TOC TOC.** | Reny: "Sem tranca… vai ter que ser no modo expresso." / Fila: "Vai demorar?" / Reny: "Tô finalizando!" |
| 30–44 s | 3. A descoberta | Suspiro de alívio. O suporte de papel: **VAZIO**, só o rolinho de papelão. A música corta. Zoom lento no rosto. Bolsos: só o celular (bateria 12%). **TOC TOC!** Ele pula, olha pros pés. Close na meia, música dramática. | Reny: "Você faz tanta coisa… mas agora não ajuda." / "Me perdoa, companheira." |
| 44–52 s | 4. O sacrifício da meia | A meia sai do pé, com uma batida dramática. Rosto constrangido. Placa do banheiro e a fila. A meia enrolada entra no bolso com cuidado exagerado, ao som de uma harpinha. Respira, ajeita a camiseta e sai. | |
| 52–66 s | 5. A confissão | Volta pra mesa. Silêncio, a música para… e eles caem na risada. Ele puxa a pontinha da meia (limpa) do bolso. Os dois afastam as cadeiras ao mesmo tempo. | Dudu: "Que demora foi essa?" / Reny: "Não tinha papel. Tive que usar a meia." / Dudu: "Mentira! Você não fez isso!" / Léo: "NÃO ACREDITO QUE VOCÊ GUARDOU!" / Reny: "Eu entrei em pânico!" |
| 66–80 s | 6. A viagem de volta | Carro à noite, silêncio. Léo fareja (*FUNGA FUNGA*) e faz careta. Nuvem verde perto do bolso. Reny imóvel. As janelas descem; vento. | Léo: "Reny… você ainda tá com a meia?" / Reny: "Depende. Você vai ficar bravo?" / Léo: "A MEIA, RENY! SE LIVRA DA MEIA!" |
| 80–94 s | 7. A despedida | Rua vazia. Ele joga a meia pela janela; ela voa em câmera lenta (com a mancha marrom), ao som de uma balada de despedida. Close no tornozelo sem meia. Na tela: **Uma noite. Três amigos. Uma meia a menos.** | Reny: "Obrigado pelo serviço prestado." / Léo: "Amanhã você paga a lavagem." |

Nada de nudez nem do ato: no banheiro só aparecem o rosto, os ombros, o braço segurando a porta e os tênis. A sujeira só aparece de relance, como mancha de desenho na meia voando.

## Como gerar de novo
```bash
python ../engine/voice.py .         # falas + timing.js (Léo = pm_alex com "pitch": 0.84)
python extra_voice.py               # suspiro e risadas
# beats.json = window.BEATS lido da página
python sound_meia.py                # mix.wav (-14 LUFS)
node ../engine/render.js film.html frames
for m in cover1 cover2 cover3 end1 end2; do node ../engine/render.js "film.html#$m" stills/$m; done
node ../engine/render.js "film.html#cover" cover
python parts.py                     # a_meia.mp4 + partes/parte1..3.mp4 + sheet.jpg
```
