# Equilíbrio e curva de dificuldade — Regiões 1–5
Gerado por `python3 tools/balanco.py` (não edite à mão). Fórmulas replicadas de `scripts/game.gd`, `scripts/enemy.gd`, `scripts/player.gd`, `scripts/ally.gd` e `scripts/ally_beast.gd`; dados de `data/*.json`.
Dificuldade de referência: **Aventura** (dano inimigo x0.75, avisos x1.20). Modos: História x0.50/avisos x1.35, Aventura x0.75/avisos x1.20, Desafio x1.00/avisos x1.00.

## Metas
- Inimigo comum cai em **3–5 golpes** do herói no nível esperado.
- Herói aguenta **6–10 golpes** comuns (Aventura).
- Chefe de região: **60–150 s** para quem aprende o padrão (minichefes 35–100 s).
- Aliados (Bruna/Ravi e criaturas) fazem **20–30%** do dano do grupo nos contratos.
- Frasco de Seiva e Sementes de Vida contam, mas sem acumular demais; fragmentos sem sobra excessiva.

## Hipóteses do modelo
- Nível esperado (jogador típico): XP de 1.5 passadas pelos inimigos dos mapas da região (ida e volta, atalhos; comuns reaparecem ao descansar) + minichefes + 50% do XP dos contratos da faixa de nível (recompensa e inimigos). Também se mostra o "sem contratos" e o "com todos os contratos". O chefe da região conta para a região seguinte.
- Tempo de chefe calibrado com as lutas do bot do e2e (o bot luta como quem já conhece o padrão: esquiva os avisos e bate nas janelas); a luta real de quem aprende inclui tentativas, por isso a meta começa em 60 s.
- Piso de dificuldade: o bot do e2e joga como um jogador mínimo (sem contratos, espada inicial ou Lança, pouca armadura) e só gasta talentos/compra tônicos ao chegar a um vilarejo (`jogador_sensato`). Os números dos chefes ficam no ponto em que esse jogador ainda vence; por isso os golpes de chefe que o jogador típico aguenta ficam acima dos dos comuns — a dificuldade do chefe está no padrão e na duração, não em um golpe.
- O nível no chefe pode passar até 2 da faixa da região: o guardião é o degrau para a região seguinte. O Salão da Harmonia (pós-jogo, Provas da Harmonia) fica fora da curva principal.
- Talentos: um ponto a cada 3 níveis, metade em Espada e metade em Resistência.
- Equipamento: melhor peça obtível até a região (baús, altares, diálogos, contratos, receitas liberadas); forja +2/+3/+3 (Minas/Pântano/Fortaleza). No meio da região: 25% do kit novo e 75% do kit do fim da região anterior.
- "Golpes" = vida ÷ ataque do herói (golpe simples, 1,0x). TTK usa o combo (2.85 x ataque/s) com 50% do tempo batendo + a criatura representativa (70% do tempo). Chefes: 18% do tempo nas janelas x multiplicador médio de exposição.
- Aliados: golpe de escudo (Bruna, 1,2x/1,19 s), disco (Ravi, 1,1x/1,39 s), criaturas deles a 50% do ataque da espécie a cada 1,2 s; 70% do tempo em combate.

## Resumo da curva
| Região | Faixa | Nv. entrada | Nv. no chefe | Golpes p/ derrubar comum | Golpes que aguenta | Chefe (s) | Aliados (% dano) | Fragmentos acumulados / gasto ref. |
|---|---|---|---|---|---|---|---|---|
| Floresta dos Esquecidos | 1–6 | 1 | 8 | 2.7–4.5 | 7.6–10.6 | 65 | 19–34% | 903 / 823 |
| Minas da Brasa | 7–12 | 9 | 13 | 3.0–4.1 | 8.9–11.8 | 64 | 17–30% | 2056 / 2354 |
| Pântano dos Sussurros | 13–18 | 14 | 19 | 2.6–3.6 | 10.5–11.4 | 70 | 18–18% | 3462 / 3317 |
| Fortaleza do Eclipse | 19–24 | 20 | 23 | 3.1–5.2 | 6.5–10.0 | 71 | 30% | 4791 / 3695 |
| Catedral do Vazio | 25–30 | 24 | 27 | 3.2–5.5 | 7.8–11.9 | 121 | 31% | 6534 / 4873 |

### Antes (claude/clever-brown-jt3sky) → depois
| Região | Nv. no chefe | Golpes p/ derrubar | Golpes que aguenta | Chefe (s) | Aliados | Frag. ganho/gasto |
|---|---|---|---|---|---|---|
| Floresta dos Esquecidos | 10 → 8 | 1.2–3.7 → 2.7–4.5 | 15.3–30.6 → 7.6–10.6 | 21 → 65 | 25–40 → 19–34% | 1093/823 → 903/823 |
| Minas da Brasa | 17 → 13 | 1.4–3.1 → 3.0–4.1 | 27.1–60.3 → 8.9–11.8 | 19 → 64 | 20–36 → 17–30% | 2596/2354 → 2056/2354 |
| Pântano dos Sussurros | 23 → 19 | 1.2–1.6 → 2.6–3.6 | 52.1–69.5 → 10.5–11.4 | 23 → 70 | 19–20 → 18–18% | 4332/3317 → 3462/3317 |
| Fortaleza do Eclipse | 27 → 23 | 1.3–3.6 → 3.1–5.2 | 41.6–67.8 → 6.5–10.0 | 22 → 71 | 34 → 30% | 6051/3695 → 4791/3695 |
| Catedral do Vazio | 30 → 27 | 1.5–3.3 → 3.2–5.5 | 47.0–67.2 → 7.8–11.9 | 65 → 121 | 36 → 31% | 8324/4873 → 6534/4873 |

Outliers antes: 58 · depois: 2

## Floresta dos Esquecidos (níveis 1–6)
**XP**: caminho 504, minichefes 50, contratos 235, chefe 160 → nível de entrada 1, no chefe 8 (sem contratos: 7), com todos os contratos: 9; meio da região 4.

**Kit esperado no chefe**: Lâminas Ocas, Manto do Lenhador, Amuleto de Seiva Viva, forja +0, 6 Sementes de Vida, 0 Frasco(s) de Seiva. Herói no chefe: ataque 29, vida 226, redução 17%. Meio da região: ataque 19.4, vida 138, redução 4%; criatura Brotisco 4.3 dano/s, herói 27.7 dano/s.

| Inimigo | Nv | Qtd | Vida | Golpes p/ derrubar | TTK (s) | Dano base | Dano recebido | Golpes que aguenta | Criatura aguenta |
|---|---|---|---|---|---|---|---|---|---|
| Cogumelo Esporífero | 2 | 6 | 52 | 2.7 | 1.6 | 18 | 13.0 | 10.6 | 12.8 |
| Lobo de Espinhos | 3 | 9 | 54 | 2.8 | 1.7 | 20 | 14.4 | 9.5 | 11.6 |
| Sentinela de Madeira | 4 | 4 | 88 | 4.5 | 2.7 | 25 | 18.0 | 7.6 | 9.2 |

| Chefe | Tipo | Nv. herói | Vida | Golpes | Luta (s) | Maior golpe | Golpes que aguenta | Exposição média |
|---|---|---|---|---|---|---|---|---|
| Lenhador Oco | minichefe | 4 | 700 | 36 | 44 | 43 | 4.4 | 1.10 |
| Cervo de Ossos | chefe | 8 | 1700 | 59 | 65 | 53 | 6.9 | 1.00 |

| Contrato em grupo | Nv | Aliados | Herói dano/s | Criatura dano/s | Aliados dano/s | % aliados | Vida inimiga total | Tempo (s) |
|---|---|---|---|---|---|---|---|---|
| Saqueadores de Selos | 3 | bruna | 23.9 | 3.9 | 6.5 | 19% | 323 | 9 |
| Emboscada nas Ruínas | 5 | bruna, ravi | 27.9 | 4.8 | 16.6 | 34% | 489 | 10 |

| Contrato | Tipo | Nv | XP | XP (% de um nível) | Fragmentos | Itens |
|---|---|---|---|---|---|---|
| Saqueadores de Selos | dupla | 3 | 20 | 33% | 50 | Selo Refinado x2, Essência Rara x1, Coleira de Couro x1 |
| Emboscada nas Ruínas | trio | 5 | 30 | 30% | 90 | Botas do Vento x1, Essência Épica x1 |
| Praga de Cogumelos | caca | 2 | 15 | 38% | 40 | Luvas de Pedra x1, Tônico de Seiva x2 |
| Matilha de Espinhos | caca | 3 | 20 | 33% | 60 | Semente de Vida x1, Essência Rara x2 |
| Sentinelas Despertas | caca | 5 | 25 | 25% | 80 | Semente de Vida x1, Essência Épica x1 |

**Fragmentos**: inimigos 153 (1.5 passadas, média), baús 230, diálogos 60, chefes 140, contratos 320 → **903** (acumulado 903). Gasto de referência: receitas novas de equipamento pela metade, acessórios de criatura, forja do kit nos 3 espaços (materiais que faltam comprados pela metade), 6 tônicos e 6 selos refinados, acessórios de loja → **823** (acumulado 823).

**Captura** (35% de vida, nível 4 do herói): Brotisco Nv.2 52% (refinado 62%); Lumipim Nv.3 42% (refinado 52%); Cascalito Nv.3 42% (refinado 52%).

## Minas da Brasa (níveis 7–12)
**XP**: caminho 564, minichefes 160, contratos 460, chefe 300 → nível de entrada 9, no chefe 13 (sem contratos: 12), com todos os contratos: 15; meio da região 11.

**Kit esperado no chefe**: Galhada Óssea, Couraça de Ossos, Amuleto da Galhada, forja +2, 7 Sementes de Vida, 2 Frasco(s) de Seiva. Herói no chefe: ataque 44, vida 309, redução 30%. Meio da região: ataque 36.5, vida 256, redução 20%; criatura Brasejante 22.0 dano/s, herói 51.9 dano/s.

| Inimigo | Nv | Qtd | Vida | Golpes p/ derrubar | TTK (s) | Dano base | Dano recebido | Golpes que aguenta | Criatura aguenta |
|---|---|---|---|---|---|---|---|---|---|
| Mineiro Corrompido | 8 | 7 | 110 | 3.0 | 1.5 | 37 | 22.3 | 11.5 | 13.5 |
| Lesma de Escória | 7 | 5 | 120 | 3.3 | 1.6 | 36 | 21.7 | 11.8 | 13.8 |
| Autômato de Martelo | 10 | 2 | 150 | 4.1 | 2.0 | 48 | 28.9 | 8.9 | 10.4 |

| Chefe | Tipo | Nv. herói | Vida | Golpes | Luta (s) | Maior golpe | Golpes que aguenta | Exposição média |
|---|---|---|---|---|---|---|---|---|
| Vigia de Escória | minichefe | 11 | 1200 | 33 | 35 | 54 | 7.9 | 0.85 |
| Ferreiro Devorador | chefe | 13 | 2400 | 55 | 64 | 60 | 9.8 | 0.80 |

| Contrato em grupo | Nv | Aliados | Herói dano/s | Criatura dano/s | Aliados dano/s | % aliados | Vida inimiga total | Tempo (s) |
|---|---|---|---|---|---|---|---|---|
| A Ninhada Roubada | 9 | ravi | 45.8 | 10.3 | 12.0 | 18% | 423 | 6 |
| A Caçadora de Ecos | 10 | bruna, ravi | 47.8 | 11.0 | 25.4 | 30% | 1232 | 15 |
| O Irmão da Bruna | 9 | bruna | 45.8 | 10.3 | 11.6 | 17% | 423 | 6 |

| Contrato | Tipo | Nv | XP | XP (% de um nível) | Fragmentos | Itens |
|---|---|---|---|---|---|---|
| A Ninhada Roubada | dupla | 9 | 40 | 22% | 110 | Frasco de Seiva x1, Selo Refinado x3, Pena de Lúmen x1 |
| A Caçadora de Ecos | trio | 10 | 70 | 35% | 200 | Corrente de Vínculo x1, Essência Lendária x1, Selo Ancestral x1 |
| Rastro de Escória | caca | 8 | 30 | 19% | 100 | Frasco de Seiva x1 |
| Autômatos Rebeldes | caca | 10 | 50 | 25% | 140 | Semente de Vida x1, Essência Lendária x1 |
| O Irmão da Bruna | dupla | 9 | 50 | 28% | 130 | Selo Refinado x3, Tônico de Seiva x3 |

**Fragmentos**: inimigos 153 (1.5 passadas, média), baús 60, diálogos 60, chefes 200, contratos 680 → **1153** (acumulado 2056). Gasto de referência: receitas novas de equipamento pela metade, acessórios de criatura, forja do kit nos 3 espaços (materiais que faltam comprados pela metade), 6 tônicos e 6 selos refinados, acessórios de loja → **1531** (acumulado 2354).

**Captura** (35% de vida, nível 11 do herói): Faisquito Nv.8 52% (refinado 62%); Fuligin Nv.8 42% (refinado 52%); Ferrunho Nv.8 42% (refinado 52%).

## Pântano dos Sussurros (níveis 13–18)
**XP**: caminho 1200, minichefes 220, contratos 330, chefe 400 → nível de entrada 14, no chefe 19 (sem contratos: 18), com todos os contratos: 20; meio da região 16.

**Kit esperado no chefe**: Galhada Óssea, Couraça de Ossos, Amuleto da Galhada, forja +3, 10 Sementes de Vida, 2 Frasco(s) de Seiva. Herói no chefe: ataque 56, vida 391, redução 35%. Meio da região: ataque 50.5, vida 337, redução 31%; criatura Brejugo 9.8 dano/s, herói 71.8 dano/s.

| Inimigo | Nv | Qtd | Vida | Golpes p/ derrubar | TTK (s) | Dano base | Dano recebido | Golpes que aguenta | Criatura aguenta |
|---|---|---|---|---|---|---|---|---|---|
| Espectro Refletido | 14 | 6 | 130 | 2.6 | 1.6 | 58 | 30.1 | 11.2 | 10.5 |
| Planta Sementeira | 13 | 6 | 165 | 3.3 | 2.0 | 57 | 29.6 | 11.4 | 10.6 |
| Sapo de Lodo | 13 | 8 | 180 | 3.6 | 2.2 | 62 | 32.2 | 10.5 | 9.8 |

| Chefe | Tipo | Nv. herói | Vida | Golpes | Luta (s) | Maior golpe | Golpes que aguenta | Exposição média |
|---|---|---|---|---|---|---|---|---|
| Barqueiro Sem Sombra | minichefe | 16 | 1100 | 22 | 36 | 36 | 18.0 | 0.85 |
| Bruxa Afogada | chefe | 19 | 2800 | 50 | 70 | 46 | 17.4 | 0.80 |

| Contrato em grupo | Nv | Aliados | Herói dano/s | Criatura dano/s | Aliados dano/s | % aliados | Vida inimiga total | Tempo (s) |
|---|---|---|---|---|---|---|---|---|
| Contrabando no Lago | 14 | ravi | 64.3 | 8.9 | 16.5 | 18% | 636 | 7 |
| O Rastro de Joran | 15 | ravi | 69.1 | 9.3 | 17.4 | 18% | 669 | 7 |

| Contrato | Tipo | Nv | XP | XP (% de um nível) | Fragmentos | Itens |
|---|---|---|---|---|---|---|
| Coaxar Sem Fim | caca | 13 | 60 | 23% | 150 | Pérola do Brejo x2, Semente de Vida x1 |
| Contrabando no Lago | dupla | 14 | 80 | 29% | 180 | Selo Refinado x3, Pérola do Brejo x2, Essência Épica x1 |
| O Rastro de Joran | dupla | 15 | 90 | 30% | 200 | Bússola de Joran x1, Selo Refinado x3, Essência Épica x1 |

**Fragmentos**: inimigos 316 (1.5 passadas, média), baús 180, diálogos 140, chefes 240, contratos 530 → **1406** (acumulado 3462). Gasto de referência: receitas novas de equipamento pela metade, acessórios de criatura, forja do kit nos 3 espaços (materiais que faltam comprados pela metade), 6 tônicos e 6 selos refinados, acessórios de loja → **963** (acumulado 3317).

**Captura** (35% de vida, nível 16 do herói): Nimbelo Nv.14 32% (refinado 42%); Goturim Nv.13 52% (refinado 62%); Brejugo Nv.13 42% (refinado 52%).

## Fortaleza do Eclipse (níveis 19–24)
**XP**: caminho 871, minichefes 300, contratos 230, chefe 600 → nível de entrada 20, no chefe 23 (sem contratos: 22), com todos os contratos: 24; meio da região 21.

**Kit esperado no chefe**: Galhada Óssea, Couraça de Ossos, Amuleto da Galhada, forja +3, 16 Sementes de Vida, 2 Frasco(s) de Seiva. Herói no chefe: ataque 64, vida 475, redução 35%. Meio da região: ataque 61.0, vida 418, redução 35%; criatura Brasardo 18.9 dano/s, herói 86.8 dano/s.

| Inimigo | Nv | Qtd | Vida | Golpes p/ derrubar | TTK (s) | Dano base | Dano recebido | Golpes que aguenta | Criatura aguenta |
|---|---|---|---|---|---|---|---|---|---|
| Arqueiro do Eclipse | 19 | 1 | 189 | 3.1 | 1.8 | 86 | 41.7 | 10.0 | 7.3 |
| Arqueiro do Eclipse | 20 | 3 | 220 | 3.6 | 2.1 | 95 | 46.3 | 9.0 | 6.6 |
| Arqueiro do Eclipse | 21 | 2 | 250 | 4.1 | 2.4 | 105 | 50.9 | 8.2 | 6.0 |
| Lanceiro do Eclipse | 20 | 3 | 270 | 4.4 | 2.6 | 120 | 58.5 | 7.1 | 5.2 |
| Lanceiro do Eclipse | 21 | 2 | 307 | 5.0 | 2.9 | 132 | 64.3 | 6.5 | 4.7 |
| Armadura Vigilante | 21 | 3 | 320 | 5.2 | 3.0 | 115 | 56.1 | 7.5 | 5.4 |

| Chefe | Tipo | Nv. herói | Vida | Golpes | Luta (s) | Maior golpe | Golpes que aguenta | Exposição média |
|---|---|---|---|---|---|---|---|---|
| Gêmeos de Ferro | minichefe | 21 | 2300 | 38 | 46 | 130 | 6.6 | 1.00 |
| Cavaleiro Sem Rosto | chefe | 23 | 3200 | 50 | 71 | 163 | 6.0 | 0.85 |

| Contrato em grupo | Nv | Aliados | Herói dano/s | Criatura dano/s | Aliados dano/s | % aliados | Vida inimiga total | Tempo (s) |
|---|---|---|---|---|---|---|---|---|
| Domadores do Eclipse | 21 | bruna, ravi | 86.8 | 18.9 | 44.8 | 30% | 859 | 6 |

| Contrato | Tipo | Nv | XP | XP (% de um nível) | Fragmentos | Itens |
|---|---|---|---|---|---|---|
| Corredores Livres | caca | 20 | 80 | 20% | 150 | Semente de Vida x1, Lasca Umbral x2 |
| Domadores do Eclipse | trio | 21 | 100 | 24% | 180 | Essência Lendária x1, Selo Refinado x3 |

**Fragmentos**: inimigos 298 (1.5 passadas, média), baús 320, diálogos 120, chefes 260, contratos 330 → **1328** (acumulado 4791). Gasto de referência: receitas novas de equipamento pela metade, acessórios de criatura, forja do kit nos 3 espaços (materiais que faltam comprados pela metade), 6 tônicos e 6 selos refinados, acessórios de loja → **378** (acumulado 3695).

**Captura** (35% de vida, nível 21 do herói): Ventisco Nv.19 52% (refinado 62%); Brasardo Nv.19 42% (refinado 52%); Umbrel Nv.19 52% (refinado 62%).

## Catedral do Vazio (níveis 25–30)
**XP**: caminho 957, minichefes 400, contratos 290, chefe 1400 → nível de entrada 24, no chefe 27 (sem contratos: 26), com todos os contratos: 29; meio da região 25.

**Kit esperado no chefe**: Galhada Óssea, Manto da Aurora, Amuleto da Convergência, forja +3, 24 Sementes de Vida, 2 Frasco(s) de Seiva. Herói no chefe: ataque 71, vida 590, redução 39%. Meio da região: ataque 66.6, vida 514, redução 38%; criatura Velúnio 21.3 dano/s, herói 94.8 dano/s.

| Inimigo | Nv | Qtd | Vida | Golpes p/ derrubar | TTK (s) | Dano base | Dano recebido | Golpes que aguenta | Criatura aguenta |
|---|---|---|---|---|---|---|---|---|---|
| Fragmento Errante | 25 | 2 | 210 | 3.2 | 1.8 | 92 | 43.1 | 11.9 | 6.7 |
| Fragmento Errante | 26 | 3 | 239 | 3.6 | 2.1 | 101 | 47.4 | 10.8 | 6.1 |
| Escriba do Vazio | 25 | 1 | 250 | 3.8 | 2.2 | 100 | 46.9 | 11.0 | 6.2 |
| Escriba do Vazio | 26 | 3 | 285 | 4.3 | 2.5 | 110 | 51.6 | 10.0 | 5.6 |
| Sentinela Prismática | 26 | 3 | 320 | 4.8 | 2.8 | 128 | 60.0 | 8.6 | 4.8 |
| Escriba do Vazio | 27 | 1 | 320 | 4.8 | 2.8 | 120 | 56.2 | 9.1 | 5.1 |
| Sentinela Prismática | 27 | 1 | 364 | 5.5 | 3.1 | 141 | 66.0 | 7.8 | 4.4 |

| Chefe | Tipo | Nv. herói | Vida | Golpes | Luta (s) | Maior golpe | Golpes que aguenta | Exposição média |
|---|---|---|---|---|---|---|---|---|
| Arauto Partido | minichefe | 25 | 2200 | 33 | 44 | 104 | 10.5 | 0.90 |
| Rei dos Ecos | chefe | 27 | 5000 | 70 | 121 | 128 | 10.1 | 0.70 |

| Contrato em grupo | Nv | Aliados | Herói dano/s | Criatura dano/s | Aliados dano/s | % aliados | Vida inimiga total | Tempo (s) |
|---|---|---|---|---|---|---|---|---|
| As Últimas Correntes | 26 | bruna, ravi | 96.7 | 21.9 | 53.6 | 31% | 1055 | 6 |

| Contrato | Tipo | Nv | XP | XP (% de um nível) | Fragmentos | Itens |
|---|---|---|---|---|---|---|
| Silêncio no Jardim | caca | 25 | 110 | 22% | 180 | Semente de Vida x1, Fragmento de Prisma x2 |
| As Últimas Correntes | trio | 26 | 130 | 25% | 200 | Essência Lendária x1, Selo Refinado x3 |

**Fragmentos**: inimigos 333 (1.5 passadas, média), baús 540, diálogos 0, chefes 490, contratos 380 → **1743** (acumulado 6534). Gasto de referência: receitas novas de equipamento pela metade, acessórios de criatura, forja do kit nos 3 espaços (materiais que faltam comprados pela metade), 6 tônicos e 6 selos refinados, acessórios de loja e as peças míticas (Lâmina da Ruína e Selo Ancestral) → **1178** (acumulado 4873).

**Captura** (35% de vida, nível 25 do herói): Gravito Nv.25 42% (refinado 52%); Cristil Nv.25 52% (refinado 62%); Velúnio Nv.26 30% (refinado 40%).

## Pontos fora da faixa
- Minas da Brasa: Vigia de Escória dura ~35 s (meta 35–100 s)
- Catedral do Vazio: fragmentos acumulados 6534 x gasto de referência acumulado 4873 (meta 0,75–1,3x)
