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
| **Rito da Seiva** (antes do Cervo) | canais, pesos, plataformas conectadas | início (mecanismos locais) | Brotisco/Cascalito facilitam; dica opcional | técnica **Golpe Enraizado** + 1 vínculo (1ª vez) | 📐 |
| Fenda do atalho norte (Bosque) — opcional | cipó | Brotisco (capturável no início, habitat garantido) | trilha principal contorna | baú com tônicos | ✅ |
| Atalho Santuário → Vila | porta de raízes de mão única | após o Tesouro | — | retorno rápido | ✅ |
| Segredo atual: parede rachada musgosa no Santuário | observação + ataque carregado | início | Lumipim ilumina a inscrição que aponta a parede | **Diário da expedição I** + Selo Refinado | 📐 |
| Descoberta de criatura: anel de flores incomum no Bosque | observar Lumipins circulando à noite/brilhando | início | — | Lumipim de nível maior + história | 📐 |
| Raízes ao norte da Vila | — (recuam) | após o Cervo | — | Desfiladeiro | ✅ |
| Ravina da Clareira de Vínculo (revisita) | **Raiz Viva** | após o Cervo | — (opcional) | Pedra de Vínculo (+1 vínculo para a equipe) + baú | ✅ |
| Desfiladeiro do Eco | **Raiz Viva** | após o Cervo | — (desbloqueio regional) | entrada das Minas | ✅ |
| **Rito da Seiva avançado** (opcional) | Raiz Viva em sequência com canais | após o Cervo | — | Amuleto de Seiva Viva (regenera vigor mais rápido) | 📐 |
| Mudança explorável pós-Cervo | — | após o Cervo | — | vila transformada, família volta, passagem norte, Clareira de Vínculo | ✅ (parcial: falta nova área explorável dentro da floresta) |

## 2. Minas da Brasa
| Obstáculo | Habilidade necessária | Quando | Alternativa | Recompensa | Status |
|---|---|---|---|---|---|
| Ravina do Desfiladeiro (entrada) | Raiz Viva | após o Cervo | — | Forja de Cobre | ✅ |
| Pisos quentes | válvulas de resfriamento locais | chegada | Luvas Térmicas reduzem dano; Goturim (região 3) facilita na revisita | rotas internas | 🔶 |
| Fornalhas apagadas | tochas/brasas locais | chegada | Faisquito acende à distância | portas da Fundição | 🔶 |
| Trilhos e carrinhos | alavancas de desvio | chegada | Ferrunho move trilho marcado | atalhos internos | 🔶 |
| **Rito da Forja** (antes do Ferreiro) | calor, resfriamento, sincronização | chegada | dica opcional; Faisquito acelera | técnica + 1 vínculo (1ª vez) | 🔶 |
| Rochas fissuradas (opcionais antes do Ferreiro) | **Ruptura Ígnea** | após o Ferreiro | — | segredos e baús | 🔶 |
| Elevador Forja ↔ Pedreira (atalho) | ativar no fundo da pedreira | durante a região | — | retorno rápido | 🔶 |
| Segredo atual | observação (vapor/fumaça vazando) | chegada | Fuligin revela corrente de ar | história/equipamento | 🔶 |
| Segredo de revisita | **Olhar Velado** | após a Bruxa (região 3) | — | inscrição oculta | 🔶 (marcado) |
| **Rito da Forja avançado** (opcional) | Ruptura Ígnea | após o Ferreiro | — | recompensa secundária | 🔶 |

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

## 5. Catedral do Vazio
| Obstáculo | Habilidade necessária | Quando | Alternativa | Recompensa | Status |
|---|---|---|---|---|---|
| Selo externo (sul do Acampamento) | Passo Umbral | após o Cavaleiro | — | Acampamento da Aurora | ✅ |
| Prismas do Jardim e da Sala dos Prismas | espelhos locais (E) | chegada | Cristil gira o prisma (ilha do mirante / nicho com baú) | portões, baús | ✅ |
| Âncoras gravitacionais (Escadaria, Sala das Âncoras) | contrapeso local (bloco na placa) | chegada | Gravito/Monolito sustenta a âncora | escada, ponte de fragmentos | ✅ |
| Câmara das Raízes e Brasas | Raiz Viva + chama do braseiro | chegada | Ruptura Ígnea reaquece direto | saída oeste | ✅ |
| Coro Velado | Olhar Velado + portal (Passo Umbral) | chegada | Velúnio materializa a marca | caminho à arena | ✅ |
| Marcas espirituais, anel do Jardim | Olhar Velado | chegada | Velúnio (ação "marca") | Velúnio (raro), baú | ✅ |
| Cristais rachados (Escadaria, Rito) | Ruptura Ígnea | chegada | — | alcova, porta do rito | ✅ |
| **Rito da Convergência** | os quatro Ecos em salas legíveis (placas explicam cada passo; dica após tentativas; pedra de reinício) | antes do Rei | — | Amuleto da Convergência + vínculo | ✅ |
| Arauto Partido | — (Olhar Velado rasga o véu; sem ele, o véu cai sozinho e ele surge num portal) | antes do Rei | criaturas de luz revelam | página 7 | ✅ |
| Câmara do Eco (quatro elos de Ione) | um Eco por elo (todos já obtidos) | antes do Rei | — | Ione livre, porta do trono | ✅ |
| Rei dos Ecos | — (qualquer equipe evoluída; nenhuma rara exigida) | — | — | Harmonia dos Ecos, quinto artefato | ✅ |
| Segredos (pedra limpa do Acampamento, estrelas invertidas) | observação | chegada | — | baú, Lente Estelar | ✅ |
| Salão da Harmonia (pós-jogo) | Harmonia dos Ecos | após o Rei | — | Provas da Harmonia, Coroa da Harmonia, notas do bestiário (nunca exigida antes do final) | ✅ |

## Verificações automáticas (tests/e2e_bot.gd)
- Ordem sem ciclos: cada Eco só aparece como requisito em regiões posteriores ao seu guardião — checado nos dados de mapa (`requires_eco`).
- Campanha sem raras: o percurso do teste usa só Brotisco/Lumipim/Cascalito (nenhuma rara); no Pântano, o Nimbelo (raro) só acelera — portões não dependem de Goturim/Brejugo/Nimbelo nem do Olhar Velado (teste de unidade "R3: portões obrigatórios...").
- Caminho com exaustas: trecho obrigatório concluído com a criatura ativa exausta (Galeria dos Lobos).
- Recompensas únicas: baús, chefões e Ecos não duplicam após salvar/carregar.
