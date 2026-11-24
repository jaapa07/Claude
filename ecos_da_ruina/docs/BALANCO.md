# Equilíbrio e curva de dificuldade — Regiões 1–5
Gerado por `python3 tools/balanco.py` (não edite à mão). Fórmulas replicadas de `scripts/game.gd`, `scripts/enemy.gd`, `scripts/player.gd`, `scripts/ally.gd` e `scripts/ally_beast.gd`; dados de `data/*.json`.
Dificuldade de referência: **Aventura** (dano inimigo x0.75, avisos x1.20). Modos: História x0.50/avisos x1.35, Aventura x0.75/avisos x1.20, Desafio x1.00/avisos x1.00.

## Metas
- Inimigo comum cai em **3–5 golpes** do herói no nível esperado.
- Herói aguenta **6–10 golpes** comuns (Aventura).
- Chefe de região: **60–150 s** para quem aprende o padrão (minichefes 35–100 s).
- Aliados (Bruna/Ravi e criaturas) fazem **20–30%** do dano do grupo nos contratos.
- Frasco de Seiva e Sementes de Vida contam, mas sem acumular demais; fragmentos sem sobra excessiva.

## Ritmo de nível
XP para o próximo nível: **50 + 28 x nível** (herói; criaturas 0,9x). Antes era 20 x nível: o 1→2 saía com 1–2 inimigos e o herói chegava ao Cervo no nível 8. Os ganhos por nível (vida, ataque, criaturas, aliados, escala de inimigos por nível do mapa) foram multiplicados por ~1,27 e todos os níveis de conteúdo (evolução, habilidades, inimigos, contratos, selvagens, técnicas) foram convertidos pela mesma XP acumulada (`tools/reescala_niveis.py`), então o poder em cada ponto da campanha ficou igual.

| Região | Nível | XP | Inimigo típico | Inimigos por nível |
|---|---|---|---|---|
| Floresta dos Esquecidos | 1→2 | 78 | Lobo de Espinhos (16 XP) | 4.9 |
| Floresta dos Esquecidos | 6→7 | 218 | Lobo de Espinhos (16 XP) | 13.6 |
| Minas da Brasa | 6→7 | 218 | Mineiro Corrompido (26 XP) | 8.4 |
| Minas da Brasa | 10→11 | 330 | Mineiro Corrompido (26 XP) | 12.7 |
| Pântano dos Sussurros | 11→12 | 358 | Sapo de Lodo (40 XP) | 8.9 |
| Pântano dos Sussurros | 15→16 | 470 | Sapo de Lodo (40 XP) | 11.8 |
| Fortaleza do Eclipse | 15→16 | 470 | Lanceiro do Eclipse (40 XP) | 11.8 |
| Fortaleza do Eclipse | 18→19 | 554 | Lanceiro do Eclipse (40 XP) | 13.8 |
| Catedral do Vazio | 19→20 | 582 | Escriba do Vazio (46 XP) | 12.7 |
| Catedral do Vazio | 21→22 | 638 | Escriba do Vazio (46 XP) | 13.9 |

No começo: o 1→2 custa 78 XP = 5 Lobos de Espinhos (antes 20 XP, pouco mais de 1 lobo).

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
| Floresta dos Esquecidos | 1–5 | 1 | 6 | 2.7–4.6 | 7.5–10.4 | 65 | 20–34% | 1003 / 823 |
| Minas da Brasa | 5–9 | 6 | 10 | 3.1–4.2 | 9.2–12.0 | 64 | 17–27% | 2206 / 2354 |
| Pântano dos Sussurros | 9–13 | 11 | 15 | 2.9–3.4 | 11.0–11.4 | 68 | 17–18% | 3462 / 3317 |
| Fortaleza do Eclipse | 14–17 | 15 | 18 | 2.9–5.2 | 6.6–10.8 | 61 | 30% | 4791 / 3695 |
| Catedral do Vazio | 18–22 | 19 | 21 | 3.0–4.5 | 8.3–11.6 | 90 | 30% | 6534 / 4873 |

### Antes (5399704) → depois
| Região | Nv. no chefe | Golpes p/ derrubar | Golpes que aguenta | Chefe (s) | Aliados | Frag. ganho/gasto |
|---|---|---|---|---|---|---|
| Floresta dos Esquecidos | 8 → 6 | 2.7–4.5 → 2.7–4.6 | 7.6–10.6 → 7.5–10.4 | 65 → 65 | 19–34 → 20–34% | 903/823 → 1003/823 |
| Minas da Brasa | 13 → 10 | 3.0–4.1 → 3.1–4.2 | 8.9–11.8 → 9.2–12.0 | 64 → 64 | 17–30 → 17–27% | 2056/2354 → 2206/2354 |
| Pântano dos Sussurros | 19 → 15 | 2.6–3.6 → 2.9–3.4 | 10.5–11.4 → 11.0–11.4 | 70 → 68 | 18–18 → 17–18% | 3462/3317 → 3462/3317 |
| Fortaleza do Eclipse | 23 → 18 | 3.1–5.2 → 2.9–5.2 | 6.5–10.0 → 6.6–10.8 | 71 → 61 | 30 → 30% | 4791/3695 → 4791/3695 |
| Catedral do Vazio | 27 → 21 | 3.2–5.5 → 3.0–4.5 | 7.8–11.9 → 8.3–11.6 | 121 → 90 | 31 → 30% | 6534/4873 → 6534/4873 |

Outliers antes: 2 · depois: 2

## Floresta dos Esquecidos (níveis 1–5)
**XP**: caminho 504, minichefes 50, contratos 265, chefe 160 → nível de entrada 1, no chefe 6 (sem contratos: 5), com todos os contratos: 6; meio da região 3.

**Kit esperado no chefe**: Lâminas Ocas, Manto do Lenhador, Amuleto de Seiva Viva, forja +0, 6 Sementes de Vida, 1 Frasco(s) de Seiva. Herói no chefe: ataque 30, vida 224, redução 17%. Meio da região: ataque 19.1, vida 136, redução 4%; criatura Brotisco 4.0 dano/s, herói 27.1 dano/s.

| Inimigo | Nv | Qtd | Vida | Golpes p/ derrubar | TTK (s) | Dano base | Dano recebido | Golpes que aguenta | Criatura aguenta |
|---|---|---|---|---|---|---|---|---|---|
| Cogumelo Esporífero | 2 | 6 | 52 | 2.7 | 1.7 | 18 | 13.0 | 10.4 | 11.9 |
| Lobo de Espinhos | 2 | 9 | 54 | 2.8 | 1.7 | 20 | 14.4 | 9.4 | 10.7 |
| Sentinela de Madeira | 2 | 4 | 88 | 4.6 | 2.8 | 25 | 18.0 | 7.5 | 8.6 |

| Chefe | Tipo | Nv. herói | Vida | Golpes | Luta (s) | Maior golpe | Golpes que aguenta | Exposição média |
|---|---|---|---|---|---|---|---|---|
| Lenhador Oco | minichefe | 3 | 700 | 37 | 46 | 43 | 4.4 | 1.10 |
| Cervo de Ossos | chefe | 6 | 1700 | 56 | 65 | 53 | 6.8 | 1.00 |

| Contrato em grupo | Nv | Aliados | Herói dano/s | Criatura dano/s | Aliados dano/s | % aliados | Vida inimiga total | Tempo (s) |
|---|---|---|---|---|---|---|---|---|
| Saqueadores de Selos | 2 | bruna | 22.6 | 3.4 | 6.5 | 20% | 296 | 9 |
| Emboscada nas Ruínas | 3 | bruna, ravi | 25.3 | 4.0 | 15.1 | 34% | 459 | 10 |

| Contrato | Tipo | Nv | XP | XP (% de um nível) | Fragmentos | Itens |
|---|---|---|---|---|---|---|
| Saqueadores de Selos | dupla | 2 | 20 | 19% | 50 | Selo Refinado x2, Essência Rara x1, Coleira de Couro x1 |
| Emboscada nas Ruínas | trio | 3 | 30 | 22% | 90 | Botas do Vento x1, Essência Épica x1 |
| Praga de Cogumelos | caca | 1 | 15 | 19% | 40 | Luvas de Pedra x1, Tônico de Seiva x2 |
| Matilha de Espinhos | caca | 2 | 20 | 19% | 60 | Semente de Vida x1, Essência Rara x2 |
| Sentinelas Despertas | caca | 3 | 25 | 19% | 80 | Semente de Vida x1, Essência Épica x1 |
| Rastro de Escória | caca | 5 | 30 | 16% | 100 | Frasco de Seiva x1 |

**Fragmentos**: inimigos 153 (1.5 passadas, média), baús 230, diálogos 60, chefes 140, contratos 420 → **1003** (acumulado 1003). Gasto de referência: receitas novas de equipamento pela metade, acessórios de criatura, forja do kit nos 3 espaços (materiais que faltam comprados pela metade), 6 tônicos e 6 selos refinados, acessórios de loja → **823** (acumulado 823).

**Captura** (35% de vida, nível 3 do herói): Brotisco Nv.1 52% (refinado 62%); Lumipim Nv.2 42% (refinado 52%); Cascalito Nv.2 42% (refinado 52%).

## Minas da Brasa (níveis 5–9)
**XP**: caminho 564, minichefes 160, contratos 490, chefe 300 → nível de entrada 6, no chefe 10 (sem contratos: 9), com todos os contratos: 11; meio da região 8.

**Kit esperado no chefe**: Galhada Óssea, Couraça de Ossos, Amuleto da Galhada, forja +2, 8 Sementes de Vida, 2 Frasco(s) de Seiva. Herói no chefe: ataque 46, vida 319, redução 30%. Meio da região: ataque 35.8, vida 260, redução 22%; criatura Brasejante 20.3 dano/s, herói 50.9 dano/s.

| Inimigo | Nv | Qtd | Vida | Golpes p/ derrubar | TTK (s) | Dano base | Dano recebido | Golpes que aguenta | Criatura aguenta |
|---|---|---|---|---|---|---|---|---|---|
| Mineiro Corrompido | 5 | 7 | 110 | 3.1 | 1.5 | 37 | 21.7 | 12.0 | 12.5 |
| Lesma de Escória | 4 | 5 | 120 | 3.4 | 1.7 | 40 | 23.5 | 11.1 | 11.5 |
| Autômato de Martelo | 7 | 2 | 150 | 4.2 | 2.1 | 48 | 28.2 | 9.2 | 9.6 |

| Chefe | Tipo | Nv. herói | Vida | Golpes | Luta (s) | Maior golpe | Golpes que aguenta | Exposição média |
|---|---|---|---|---|---|---|---|---|
| Vigia de Escória | minichefe | 8 | 1200 | 34 | 36 | 54 | 8.2 | 0.85 |
| Ferreiro Devorador | chefe | 10 | 2400 | 52 | 64 | 60 | 10.1 | 0.80 |

| Contrato em grupo | Nv | Aliados | Herói dano/s | Criatura dano/s | Aliados dano/s | % aliados | Vida inimiga total | Tempo (s) |
|---|---|---|---|---|---|---|---|---|
| A Ninhada Roubada | 6 | ravi | 43.4 | 9.0 | 11.0 | 17% | 405 | 6 |
| A Caçadora de Ecos | 7 | bruna, ravi | 46.1 | 18.8 | 24.1 | 27% | 1206 | 14 |
| O Irmão da Bruna | 6 | bruna | 43.4 | 9.0 | 10.9 | 17% | 405 | 6 |

| Contrato | Tipo | Nv | XP | XP (% de um nível) | Fragmentos | Itens |
|---|---|---|---|---|---|---|
| A Ninhada Roubada | dupla | 6 | 40 | 18% | 110 | Frasco de Seiva x1, Selo Refinado x3, Pena de Lúmen x1 |
| A Caçadora de Ecos | trio | 7 | 70 | 28% | 200 | Corrente de Vínculo x1, Essência Lendária x1, Selo Ancestral x1 |
| Autômatos Rebeldes | caca | 7 | 50 | 20% | 140 | Semente de Vida x1, Essência Lendária x1 |
| Coaxar Sem Fim | caca | 9 | 60 | 20% | 150 | Pérola do Brejo x2, Semente de Vida x1 |
| O Irmão da Bruna | dupla | 6 | 50 | 23% | 130 | Selo Refinado x3, Tônico de Seiva x3 |

**Fragmentos**: inimigos 153 (1.5 passadas, média), baús 60, diálogos 60, chefes 200, contratos 730 → **1203** (acumulado 2206). Gasto de referência: receitas novas de equipamento pela metade, acessórios de criatura, forja do kit nos 3 espaços (materiais que faltam comprados pela metade), 6 tônicos e 6 selos refinados, acessórios de loja → **1531** (acumulado 2354).

**Captura** (35% de vida, nível 8 do herói): Faisquito Nv.5 52% (refinado 62%); Fuligin Nv.5 42% (refinado 52%); Ferrunho Nv.5 42% (refinado 52%).

## Pântano dos Sussurros (níveis 9–13)
**XP**: caminho 1200, minichefes 220, contratos 270, chefe 400 → nível de entrada 11, no chefe 15 (sem contratos: 13), com todos os contratos: 16; meio da região 13.

**Kit esperado no chefe**: Galhada Óssea, Couraça de Ossos, Amuleto da Galhada, forja +3, 10 Sementes de Vida, 2 Frasco(s) de Seiva. Herói no chefe: ataque 60, vida 395, redução 35%. Meio da região: ataque 52.3, vida 356, redução 33%; criatura Musgoral 18.7 dano/s, herói 74.4 dano/s.

| Inimigo | Nv | Qtd | Vida | Golpes p/ derrubar | TTK (s) | Dano base | Dano recebido | Golpes que aguenta | Criatura aguenta |
|---|---|---|---|---|---|---|---|---|---|
| Espectro Refletido | 10 | 6 | 150 | 2.9 | 1.6 | 64 | 32.3 | 11.0 | 15.1 |
| Planta Sementeira | 9 | 6 | 165 | 3.2 | 1.8 | 62 | 31.3 | 11.4 | 15.5 |
| Sapo de Lodo | 9 | 8 | 180 | 3.4 | 1.9 | 62 | 31.3 | 11.4 | 15.5 |

| Chefe | Tipo | Nv. herói | Vida | Golpes | Luta (s) | Maior golpe | Golpes que aguenta | Exposição média |
|---|---|---|---|---|---|---|---|---|
| Barqueiro Sem Sombra | minichefe | 13 | 1250 | 24 | 32 | 36 | 19.6 | 0.85 |
| Bruxa Afogada | chefe | 15 | 2800 | 47 | 68 | 46 | 17.6 | 0.80 |

| Contrato em grupo | Nv | Aliados | Herói dano/s | Criatura dano/s | Aliados dano/s | % aliados | Vida inimiga total | Tempo (s) |
|---|---|---|---|---|---|---|---|---|
| Contrabando no Lago | 10 | ravi | 65.6 | 8.0 | 15.6 | 17% | 622 | 7 |
| O Rastro de Joran | 11 | ravi | 68.3 | 8.6 | 16.7 | 18% | 664 | 7 |

| Contrato | Tipo | Nv | XP | XP (% de um nível) | Fragmentos | Itens |
|---|---|---|---|---|---|---|
| Contrabando no Lago | dupla | 10 | 80 | 24% | 180 | Selo Refinado x3, Pérola do Brejo x2, Essência Épica x1 |
| O Rastro de Joran | dupla | 11 | 90 | 25% | 200 | Bússola de Joran x1, Selo Refinado x3, Essência Épica x1 |

**Fragmentos**: inimigos 316 (1.5 passadas, média), baús 180, diálogos 140, chefes 240, contratos 380 → **1256** (acumulado 3462). Gasto de referência: receitas novas de equipamento pela metade, acessórios de criatura, forja do kit nos 3 espaços (materiais que faltam comprados pela metade), 6 tônicos e 6 selos refinados, acessórios de loja → **963** (acumulado 3317).

**Captura** (35% de vida, nível 13 do herói): Nimbelo Nv.10 32% (refinado 42%); Goturim Nv.9 52% (refinado 62%); Brejugo Nv.9 42% (refinado 52%).

## Fortaleza do Eclipse (níveis 14–17)
**XP**: caminho 871, minichefes 300, contratos 230, chefe 600 → nível de entrada 15, no chefe 18 (sem contratos: 17), com todos os contratos: 19; meio da região 16.

**Kit esperado no chefe**: Galhada Óssea, Couraça de Ossos, Amuleto da Galhada, forja +3, 16 Sementes de Vida, 2 Frasco(s) de Seiva. Herói no chefe: ataque 67, vida 485, redução 37%. Meio da região: ataque 61.5, vida 424, redução 37%; criatura Brasardo 18.1 dano/s, herói 87.5 dano/s.

| Inimigo | Nv | Qtd | Vida | Golpes p/ derrubar | TTK (s) | Dano base | Dano recebido | Golpes que aguenta | Criatura aguenta |
|---|---|---|---|---|---|---|---|---|---|
| Arqueiro do Eclipse | 14 | 1 | 180 | 2.9 | 1.7 | 83 | 39.2 | 10.8 | 7.2 |
| Arqueiro do Eclipse | 15 | 3 | 220 | 3.6 | 2.1 | 95 | 44.9 | 9.4 | 6.3 |
| Arqueiro do Eclipse | 16 | 2 | 259 | 4.2 | 2.5 | 107 | 50.6 | 8.4 | 5.6 |
| Lanceiro do Eclipse | 15 | 3 | 270 | 4.4 | 2.6 | 120 | 56.7 | 7.5 | 5.0 |
| Lanceiro do Eclipse | 16 | 2 | 318 | 5.2 | 3.0 | 135 | 63.9 | 6.6 | 4.4 |
| Armadura Vigilante | 16 | 3 | 320 | 5.2 | 3.0 | 115 | 54.3 | 7.8 | 5.2 |

| Chefe | Tipo | Nv. herói | Vida | Golpes | Luta (s) | Maior golpe | Golpes que aguenta | Exposição média |
|---|---|---|---|---|---|---|---|---|
| Gêmeos de Ferro | minichefe | 16 | 2300 | 37 | 46 | 130 | 6.9 | 1.00 |
| Cavaleiro Sem Rosto | chefe | 18 | 3700 | 55 | 61 | 163 | 6.3 | 0.85 |

| Contrato em grupo | Nv | Aliados | Herói dano/s | Criatura dano/s | Aliados dano/s | % aliados | Vida inimiga total | Tempo (s) |
|---|---|---|---|---|---|---|---|---|
| Domadores do Eclipse | 16 | bruna, ravi | 87.5 | 18.1 | 44.4 | 30% | 859 | 6 |

| Contrato | Tipo | Nv | XP | XP (% de um nível) | Fragmentos | Itens |
|---|---|---|---|---|---|---|
| Corredores Livres | caca | 15 | 80 | 17% | 150 | Semente de Vida x1, Lasca Umbral x2 |
| Domadores do Eclipse | trio | 16 | 100 | 20% | 180 | Essência Lendária x1, Selo Refinado x3 |

**Fragmentos**: inimigos 298 (1.5 passadas, média), baús 320, diálogos 120, chefes 260, contratos 330 → **1328** (acumulado 4791). Gasto de referência: receitas novas de equipamento pela metade, acessórios de criatura, forja do kit nos 3 espaços (materiais que faltam comprados pela metade), 6 tônicos e 6 selos refinados, acessórios de loja → **378** (acumulado 3695).

**Captura** (35% de vida, nível 16 do herói): Ventisco Nv.14 52% (refinado 62%); Brasardo Nv.14 42% (refinado 52%); Umbrel Nv.14 52% (refinado 62%).

## Catedral do Vazio (níveis 18–22)
**XP**: caminho 957, minichefes 400, contratos 290, chefe 1400 → nível de entrada 19, no chefe 21 (sem contratos: 20), com todos os contratos: 23; meio da região 20.

**Kit esperado no chefe**: Galhada Óssea, Manto da Aurora, Amuleto da Convergência, forja +3, 24 Sementes de Vida, 2 Frasco(s) de Seiva. Herói no chefe: ataque 73, vida 600, redução 41%. Meio da região: ataque 71.1, vida 528, redução 40%; criatura Velúnio 21.2 dano/s, herói 101.2 dano/s.

| Inimigo | Nv | Qtd | Vida | Golpes p/ derrubar | TTK (s) | Dano base | Dano recebido | Golpes que aguenta | Criatura aguenta |
|---|---|---|---|---|---|---|---|---|---|
| Fragmento Errante | 19 | 2 | 210 | 3.0 | 1.7 | 100 | 45.4 | 11.6 | 6.1 |
| Fragmento Errante | 20 | 3 | 247 | 3.5 | 2.0 | 113 | 51.1 | 10.3 | 5.4 |
| Escriba do Vazio | 19 | 1 | 250 | 3.5 | 2.0 | 100 | 45.4 | 11.6 | 6.1 |
| Escriba do Vazio | 20 | 4 | 295 | 4.1 | 2.4 | 113 | 51.1 | 10.3 | 5.4 |
| Sentinela Prismática | 20 | 4 | 320 | 4.5 | 2.6 | 140 | 63.5 | 8.3 | 4.4 |

| Chefe | Tipo | Nv. herói | Vida | Golpes | Luta (s) | Maior golpe | Golpes que aguenta | Exposição média |
|---|---|---|---|---|---|---|---|---|
| Arauto Partido | minichefe | 20 | 2200 | 31 | 42 | 104 | 11.2 | 0.90 |
| Rei dos Ecos | chefe | 21 | 5000 | 68 | 90 | 128 | 10.6 | 0.70 |

| Contrato em grupo | Nv | Aliados | Herói dano/s | Criatura dano/s | Aliados dano/s | % aliados | Vida inimiga total | Tempo (s) |
|---|---|---|---|---|---|---|---|---|
| As Últimas Correntes | 20 | bruna, ravi | 101.2 | 21.2 | 53.5 | 30% | 1059 | 6 |

| Contrato | Tipo | Nv | XP | XP (% de um nível) | Fragmentos | Itens |
|---|---|---|---|---|---|---|
| Silêncio no Jardim | caca | 19 | 110 | 19% | 180 | Semente de Vida x1, Fragmento de Prisma x2 |
| As Últimas Correntes | trio | 20 | 130 | 21% | 200 | Essência Lendária x1, Selo Refinado x3 |

**Fragmentos**: inimigos 333 (1.5 passadas, média), baús 540, diálogos 0, chefes 490, contratos 380 → **1743** (acumulado 6534). Gasto de referência: receitas novas de equipamento pela metade, acessórios de criatura, forja do kit nos 3 espaços (materiais que faltam comprados pela metade), 6 tônicos e 6 selos refinados, acessórios de loja e as peças míticas (Lâmina da Ruína e Selo Ancestral) → **1178** (acumulado 4873).

**Captura** (35% de vida, nível 20 do herói): Gravito Nv.19 42% (refinado 52%); Cristil Nv.19 52% (refinado 62%); Velúnio Nv.20 32% (refinado 42%).

## Pontos fora da faixa
- Pântano dos Sussurros: Barqueiro Sem Sombra dura ~32 s (meta 35–100 s)
- Catedral do Vazio: fragmentos acumulados 6534 x gasto de referência acumulado 4873 (meta 0,75–1,3x)
