# Matriz de desbloqueios — Ecos da Ruína

Formato: **região → obstáculo → habilidade necessária → quando se obtém → solução alternativa → recompensa**.
Status: ✅ implementado e testado • 🔶 em implementação • 📐 especificado (não implementado).

Regra global: um Eco só é exigido **depois** do guardião que o concede e **nunca** para vencer esse guardião. Antes do desbloqueio, todo enigma obrigatório se resolve com ferramenta do herói, mecanismo local ou observação. Criaturas oferecem alternativas, atalhos e vantagens; nenhuma criatura rara, evolução, consumível finito ou sorte bloqueia a campanha.

## Ordem de progressão (sem ciclos)
```
Floresta (recursos básicos) ── Cervo de Ossos ──► Raiz Viva
Raiz Viva ──► entrada das Minas ── Ferreiro Devorador ──► Ruptura Ígnea
Ruptura Ígnea ──► entrada do Pântano ── Bruxa Afogada ──► Olhar Velado
Olhar Velado ──► entrada da Fortaleza ── Cavaleiro Sem Rosto ──► Passo Umbral
Passo Umbral ──► entrada da Catedral ── Rei dos Ecos ──► Harmonia dos Ecos (pós-jogo)
```
Cada Rito pré-guardião usa só mecanismos locais; cada Rito avançado (opcional) exige o Eco recém-obtido e nunca bloqueia nada.

## 1. Floresta dos Esquecidos
| Obstáculo | Habilidade necessária | Quando | Alternativa | Recompensa | Status |
|---|---|---|---|---|---|
| Portão de flores-lanterna (Bosque) | Acender 3 flores (E) | início | Pulso do Lumipim acende à distância | rota A ao Santuário | ✅ |
| Portão de raízes da Clareira | 2 placas de peso | início (caixas) | Cascalito segura uma placa | rota B ao Santuário | ✅ |
| Salão das Flores (Santuário) | acender flores | início | Lumipim | acesso à Galeria | ✅ |
| Galeria dos Lobos (portas fecham) | combate | início | companheiro ajuda; Raízes prendem pequenos | saída para os Canais | ✅ |
| Canais de Seiva | alavancas + inscrição | início | dica após 3 tentativas | Tesouro + atalho | ✅ |
| Câmara dos Pesos | empurrar caixas | início | Cascalito segura placa | preparação do minichefe | ✅ |
| **Rito da Seiva** (`rito_seiva`, pela Câmara dos Pesos, antes do Cervo) | canais (alavancas), pesos (caixas nas placas), passarelas conectadas | início (mecanismos locais) | Cascalito segura placas; Brotisco estende cipós da ilha; pedra da dica após 3 tentativas; pedra de reinício; saída sempre aberta | técnica **Golpe Enraizado** (golpe carregado prende inimigos pequenos) + 1 vínculo (1ª vez) | ✅ |
| Fenda do atalho norte (Bosque) — opcional | cipó | Brotisco (capturável no início, habitat garantido) | trilha principal contorna | baú com tônicos | ✅ |
| Atalho Santuário → Vila | porta de raízes de mão única | após o Tesouro | — | retorno rápido | ✅ |
| Segredo atual: parede rachada de musgo pálido no corredor de entrada do Santuário | observação + golpe carregado | início | Lumipim (ação ou Pulso) ilumina a inscrição de raízes que aponta a parede e a marca | **Diário da Expedição I** + Selo Refinado | ✅ |
| Descoberta de criatura: anel de flores incomum no sudoeste do Bosque | observar o anel com neblina (Lumipins giram e brilham) | início | com um Lumipim na equipe o anel também se revela (sem depender do clima) | Lumipim Nv. 8 (único, capturável) + história (a fita azul de Ione) | ✅ |
| Raízes ao norte da Vila | — (recuam) | após o Cervo | — | Desfiladeiro | ✅ |
| Ravina da Clareira de Vínculo (revisita) | **Raiz Viva** | após o Cervo | — (opcional) | Pedra de Vínculo (+1 vínculo para a equipe) + baú | ✅ |
| Desfiladeiro do Eco | **Raiz Viva** | após o Cervo | — (desbloqueio regional) | entrada das Minas | ✅ |
| **Rito da Seiva avançado** (opcional, acima do altar) | Raiz Viva em sequência com dois canais (a raiz só cresce depois que a alavanca enche o canal) | após o Cervo | — | **Amuleto de Seiva Viva** (épico; +18 de vida, vigor 60% mais rápido) | ✅ |
| Mudança explorável pós-Cervo | — | após o Cervo | — | vila transformada, família volta, passagem norte, Clareira de Vínculo | ✅ |
| **Grota das Raízes Antigas** (`grota_seiva`, a leste da Clareira) | — (as raízes antigas recuam) | após o Cervo | — | área nova: criaturas Nv. 6–7, lobos/cogumelos/sentinela, baú com **Diário da Expedição II** | ✅ |
| Segredo da Grota: tronco oco | observação (examinar a casca solta) | após o Cervo | — | toca escondida com Semente de Vida | ✅ |

## 2. Minas da Brasa
| Obstáculo | Habilidade necessária | Quando | Alternativa | Recompensa | Status |
|---|---|---|---|---|---|
| Ravina do Desfiladeiro (entrada) | Raiz Viva | após o Cervo | — | Forja de Cobre | ✅ |
| Pisos quentes | válvulas de resfriamento locais | chegada | Luvas Térmicas (Rito da Forja) reduzem o dano à metade; na revisita, Goturim/Marulume perto do herói molham o piso (calor fere metade) | rotas internas | ✅ |
| Fornalhas apagadas | chama do braseiro levada pelo herói | chegada | Faisquito acende de perto, sem braseiro | portas da Fundição, ninho da Pedreira, lava da Grande Caldeira | ✅ |
| Trilhos e carrinhos | alavancas de desvio + batente | chegada | Ferrunho arrasta o trilho marcado (ilha opcional) | portão dos Trilhos, tesouro da Fundição | ✅ |
| **Rito da Forja** (antes do Ferreiro) | calor, resfriamento, sincronização | chegada | dica opcional; pedra de reinício; Faisquito acelera | técnica **Luvas Térmicas** + 1 vínculo (1ª vez) | ✅ |
| Rochas fissuradas (opcionais antes do Ferreiro) | **Ruptura Ígnea** | após o Ferreiro | — | depósito da Forja (Caderno da Ilda), veio esquecido (Couraça de Placas de Cobre), Passagem Sul ao Pântano | ✅ |
| Elevador Forja ↔ Pedreira (atalho) | vapor da grande forja (o Manual do Elevador, no nicho da Pedreira, explica) | após o Ferreiro (forja reacesa) | — | retorno rápido nos dois sentidos | ✅ |
| Segredo atual | observação (vapor vazando nos Trilhos) | chegada | Fuligin revela a corrente de ar da Pedreira | Bilhete da Tessa, veio esquecido | ✅ |
| Segredo de revisita | **Olhar Velado** | após a Bruxa (região 3) | — | inscrição oculta da praça da Forja (lingotes e Semente de Vida); a Fundição tem outra | ✅ |
| **Rito da Forja avançado** (opcional) | Ruptura Ígnea em mecanismos térmicos | após o Ferreiro | — | Amuleto da Brasa | ✅ |

## 3. Pântano dos Sussurros
| Obstáculo | Habilidade necessária | Quando | Alternativa | Recompensa | Status |
|---|---|---|---|---|---|
| Bloqueio de pedra da Passagem Sul (Entrada das Minas, encosta sudeste) | **Ruptura Ígnea** | após o Ferreiro (visível desde o Capítulo 1) | — | Porto das Lanternas | ✅ |
| Lodo instável da Passarela e da Câmara do Lodo | estacas locais | chegada | Brejugo firma o lodo marcado (o do templo tem as duas soluções) | caminho ao templo / atalho noroeste | ✅ |
| Níveis de água (Lago, Sala das Marés, tanque do rito) | comportas locais | chegada | — | rotas do lago, ala norte do templo | ✅ |
| Rodas d'água (Passarela e Lago) | Goturim (comum, habitat fixo) | chegada | — (opcional) | baús com Semente de Vida e materiais | ✅ |
| Sala dos Espelhos | girar três espelhos | chegada | dica após várias tentativas | porta ao Templo B + diário | ✅ |
| Reflexos falsos (Rito dos Reflexos, Bruxa fase 2) | observação (reflexo consistente) | chegada | Nimbelo (raro) faz as falsas tremularem e marca a Bruxa verdadeira — nunca obrigatório | caminho correto | ✅ |
| Espectros refletidos | observação (vulneráveis ao atacar) | chegada | Nimbelo/Clarão revelam; Lente de Orvalho (rito) | — | ✅ |
| **Rito dos Reflexos** | observação da água e ilusões | antes da Bruxa | dica opcional, pedra de reinício, saída sempre aberta | **Lente de Orvalho** + 1 vínculo (1ª vez) | ✅ |
| Barqueiro Sem Sombra | lanternas da arena | antes da Bruxa | — | Pérolas, juncos | ✅ |
| Canal Submerso (Templo B ↔ Porto) | alavanca no tesouro | durante a região | — | retorno rápido | ✅ |
| Segredo atual: juncos sussurrantes (Passarela), reflexo que mostra uma lanterna (Lago) | observação | chegada | — | Diário da Faroleira, Manto de Juncos | ✅ |
| Descoberta de criatura: anel de lanternas do Lago | acender as três | chegada | — | Nimbelo (raro) | ✅ |
| Plataformas/inscrições espirituais | **Olhar Velado** | após a Bruxa | — | ponte à Região 4, rito avançado (Amuleto do Reflexo), inscrições da Forja, Fundição e Vila (revisita) | ✅ |
| Mudança explorável pós-Bruxa | — | após a Bruxa | — | água clara, travessia, margem nova no Lago, ponte espiritual | ✅ |

## 4. Fortaleza do Eclipse
| Obstáculo | Habilidade necessária | Quando | Alternativa | Recompensa | Status |
|---|---|---|---|---|---|
| Ponte espiritual nas montanhas (`ponte_espiritual`) | Olhar Velado | após a Bruxa | — | Refúgio da Muralha | ✅ (ligação com a Região 3 pendente do merge) |
| Corredores guardados por lanceiros | combate (esperar a estocada) | chegada | criatura flanqueia | caminho das rotas; caçada "Corredores Livres" | ✅ |
| Brecha da Muralha Partida | mecanismo antigo + chama do braseiro | chegada | Brasardo/Solarco reaquece direto (ação ou salto explosivo) | ponte levadiça | ✅ |
| Grade da Muralha | alavanca no fim da plataforma sul | chegada | Umbrel entra na fresta e aciona por dentro (atalho) | caminho ao bastião | ✅ |
| Grade da torre (bastião) | balestra dispara no receptor | chegada | — (alavanca interna do lado da torre) | subida à torre | ✅ |
| Névoa cortante (Jardins e torre) | manivela gira a hélice | chegada | Ventisco dispersa a névoa / gira a hélice de longe | terraços e corredor | ✅ |
| Ilha da hélice / névoa lateral da torre (opcionais) | Ventisco (Rajada à distância) | chegada | — (opcional, sinalizado) | baús | ✅ |
| Luz e sombra (Salão do Eclipse) | espelhos e persianas locais | chegada | — | porta norte | ✅ |
| Plataformas de sol e de lua (Ala da Sombra) | alavanca do eclipse | chegada | — | atalho Torre ↔ Refúgio | ✅ |
| Receptores de luz + disparo | persiana + balestra | chegada | — | arena dos Gêmeos | ✅ |
| **Rito do Eclipse** | luz, sombra, posicionamento, rotas alternadas | chegada | dica após 3 tentativas; pedra de reinício | Manto Umbral + vínculo | ✅ |
| Segredo atual: ar frio entre as pedras (Refúgio) | observação | chegada | — | Semente de Vida + Lente do Observatório | ✅ |
| Descoberta de criatura: anel de flores (Jardins) | observação | chegada | — | Ventisco mais velho | ✅ |
| Cavaleiro Sem Rosto | — (nenhuma espécie obrigatória; balestras na arena) | — | criaturas à distância e flanqueio | Passo Umbral | ✅ |
| Fissuras e portais marcados (Refúgio, Muralha, Estrada, Rito avançado) | **Passo Umbral** | após o Cavaleiro | — | segredos e Amuleto do Eclipse | ✅ |
| Mudança pós-guardião | — | após o Cavaleiro | — | guarnição volta, rotinas mudam, música, Estrada Final aberta | ✅ |

## 5. Catedral do Vazio 📐
| Obstáculo | Habilidade necessária | Quando | Alternativa | Recompensa |
|---|---|---|---|---|
| Selo externo | Passo Umbral | após o Cavaleiro | — | Acampamento da Aurora |
| Salas combinadas | Raiz Viva + Ruptura Ígnea + Olhar Velado + Passo Umbral (todos já obtidos) | antes do Rei | criaturas de cada região facilitam | caminho ao Rei |
| Prismas | espelhos locais | chegada | Cristil redireciona feixes | — |
| Âncoras gravitacionais | contrapesos locais | chegada | Gravito mantém âncoras | — |
| **Rito da Convergência** | os quatro Ecos combinados | antes do Rei (opcional avançado após) | dica opcional | técnica final + vínculo |
| Desafios pós-jogo | Harmonia dos Ecos | após o Rei | — | bestiário expandido (nunca exigida antes do final) |

## Verificações automáticas (tests/e2e_bot.gd)
- Ordem sem ciclos: cada Eco só aparece como requisito em regiões posteriores ao seu guardião — checado nos dados de mapa (`requires_eco`).
- Campanha sem raras: o percurso do teste usa só Brotisco/Lumipim/Cascalito (nenhuma rara); no Pântano, o Nimbelo (raro) só acelera — portões não dependem de Goturim/Brejugo/Nimbelo nem do Olhar Velado (teste de unidade "R3: portões obrigatórios...").
- Caminho com exaustas: trecho obrigatório concluído com a criatura ativa exausta (Galeria dos Lobos).
- Recompensas únicas: baús, chefões e Ecos não duplicam após salvar/carregar.
- Floresta completa (`-- --e2e --floresta`): Rito da Seiva (três lições, dica, reinício, saída segura, técnica e vínculo únicos), Golpe Enraizado em combate, segredo da parede musgosa, anel de flores (neblina e Lumipim), Grota pós-Cervo, rito avançado com Raiz Viva, Amuleto de Seiva Viva (vigor medido), Goturim nos pisos quentes e save/load sem duplicação. As Minas são cobertas pelos estágios `r2_*` do e2e completo.
