# Banheiro Sem Água: 3 partes de 60 s (bonecos palito, como O Jantar e O Homem Sem Sombra)

Comédia de bar: uma cervejinha, uma barriga traidora e um banheiro sem água. Boteco do Tonho; você (camiseta mostarda e óculos), o Beto (bigode, camisa vermelha), a Carla (cabelo chanel, jaqueta verde) e o Zé (boné azul).

Cenários 3D reaproveitados dos curtas (`../sem_agua/world.js`, `../meia/world.js`); bonecos, HUD, PRESSÃO e enquete do motor (`../bar_stick.js`, `../bar_part.js`, `../bar_common_shots.js`).

## Parte 1: A missão

0. Imagine que é sexta, 22:10, e era pra ser só uma cervejinha.
1. Boteco do Tonho. Você e três amigos.
2. O Beto conta a mesma piada de sempre.
3. Todo mundo ri. Você ri mais alto.
4. Aí a sua barriga ronca.
5. Mais alto que a risada.
6. Foi trovão?
7. O céu tá limpo. Estrelado.
8. 22:12. Você cruza as pernas.
9. 22:13. Você se ajeita na cadeira.
10. 22:14. Você começa a suar.
11. Tá tudo bem?
12. Você sorri, travado: tô só prestando atenção.
13. Em um único músculo.
14. Missão: banheiro. Doze metros.
15. Passinho curto. Joelho colado. Postura de estátua.
16. Cada passo, uma oração.
17. O garçom passa. Você desvia sem dobrar o corpo.
18. Corredor dos fundos. Uma lâmpada piscando.
19. Você entra. Tranca. Senta.
20. Alívio. Trinta segundos de paz.
21. Aí você puxa a descarga.
22. Clic.
23. Nada.

**Final:** VOCÊ PUXA DE NOVO? (Sim: com força / Não: espero um milagre)

## Parte 2: O balde

0. Imagine que você puxa a descarga de novo. Com força.
1. Clic. Clic. Clic.
2. Nada. Nem um pingo.
3. Silêncio absoluto. Só um grilo, em algum lugar.
4. Aí uma luz acende no canto.
5. Um balde. Azul. Brilhando.
6. Um coral de anjos começa a cantar.
7. Você pega o balde. Abre a torneira.
8. E sai um sopro.
9. Seco. Quente. Debochado.
10. O coral desafina.
11. Você fica ali, segurando um balde vazio diante de uma situação cheia.
12. Na parede, um aviso que você não tinha visto.
13. Falta água desde terça.
14. Você olha pro vaso. Olha pra porta.
15. Só existe uma saída.
16. Você respira fundo. Ajeita a camiseta.
17. Abre a porta como quem não fez nada.
18. E dá de cara com uma fila.
19. Na frente, uma moça. Olhando pra você.
20. Do lado da porta, a placa: unissex.
21. Ela sorri. Educada.
22. E você acena. Ninguém sabe por quê.

**Final:** VOCÊ AVISA ELA? (Sim: tá sem água / Não: saio andando)

## Parte 3: A impressão

0. Imagine que você não avisa. Só sai andando.
1. Rápido. Sem olhar pra trás.
2. Atrás de você, a porta fecha.
3. Clic. Ela também tentou.
4. Você senta na mesa como se nada tivesse acontecido.
5. Demorou, hein?
6. Você se inclina. E cochicha.
7. Gente, o banheiro tá sem água. E eu tentei dar a descar...
8. Eles começam a rir antes de você terminar a palavra.
9. O Beto chora. A Carla bate na mesa. O Zé quase cai da cadeira.
10. Você esconde o rosto nas mãos.
11. Aí a moça da fila passa pela mesa.
12. Ela te olha. Sorri. Não fala nada.
13. Não precisava.
14. Ela tava carregando um balde.
15. O garçom chega com a conta.
16. Essa é por conta da casa, campeão.
17. Você sai andando de perna aberta.
18. Bunda assada. Dignidade zero.
19. Na porta do banheiro, um papel novo: interditado.
20. Naquele bar, você deixou uma impressão muito forte.

**Final:** VOCÊ VOLTA NESSE BAR? (Sim: sexta que vem / Não: nunca mais)

## Como gerar de novo
```bash
python engine/voice.py PASTA/partN         # narração (Kokoro pt-BR) + timing.js
python engine/sound.py PASTA/partN 60      # mix.wav (as risadas e o suspiro vêm de ../sem_agua/vo_extra e ../meia/vo_extra: rode os extra_voice.py de lá antes)
./bar_render_all.sh                        # capa, quadros, partN.mp4 com a capa no início
```
