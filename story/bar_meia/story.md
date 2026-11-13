# A Meia do Reny: 4 partes de 60 s (bonecos palito, como O Jantar e O Homem Sem Sombra)

Comédia de bar em 4 partes: o Reny (camiseta verde-água, tênis vermelho, meia branca de listra vermelha), o Dudu (boné laranja, o piadista) e o Léo (cacheado, de óculos, não bebe e dirige). Bar da Univel.

Cenários 3D reaproveitados dos curtas (`../sem_agua/world.js`, `../meia/world.js`); bonecos, HUD, PRESSÃO e enquete do motor (`../bar_stick.js`, `../bar_part.js`, `../bar_common_shots.js`).

## Parte 1: Banheiro sem tranca

0. Imagine que o seu nome é Reny e é quarta no Bar da Univel.
1. Mesa de plástico. Cerveja trincando.
2. O Dudu faz piada de tudo. O Léo não bebe. Ele dirige.
3. Brinde. Risada. Mais um brinde.
4. O Dudu imita o garçom. O Léo ri de refrigerante na mão.
5. Aí a sua barriga ronca.
6. O sorriso some do seu rosto.
7. Rapaziada... preciso ir no banheiro. Agora.
8. Vai lá, guerreiro!
9. Banheiro dos fundos. Você entra. Vai trancar...
10. E não tem tranca. Só dois furos.
11. Você fecha a porta. Ela volta. Devagar.
12. Sem tranca... vai ter que ser no modo expresso.
13. Uma mão segura a porta. A outra segura a fé.
14. Lá fora, uma fila começa a crescer.
15. Um. Dois. Três.
16. Três pessoas na fila. Você ouve cada respiração.
17. Vai demorar?
18. Tô finalizando!
19. Você termina. Alívio.
20. Aí você olha pro lado.
21. O suporte de papel.
22. Vazio.

**Final:** O QUE VOCÊ FAZ AGORA? (Grito: tem papel? / Procuro nos bolsos)

## Parte 2: Me perdoa, companheira

0. Imagine que você procura nos bolsos.
1. Bolso da frente: nada.
2. Bolso de trás: nada.
3. Só o celular. Doze por cento de bateria.
4. Você faz tanta coisa... mas agora não ajuda.
5. Toc toc toc. Mais forte.
6. Você pensa em gritar: alguém tem papel? Mas você tem orgulho.
7. Moço, a fila tá grande!
8. Você olha pros seus pés.
9. Tênis. E uma meia branca. Listra vermelha.
10. Presente da sua mãe.
11. Fiel há três anos.
12. Uma música dramática começa a tocar. Só na sua cabeça.
13. Me perdoa, companheira.
14. Você tira o tênis. Tira a meia.
15. O resto fica entre você e Deus.
16. Agora: o que fazer com ela?
17. Lixo? Não tem. Janela? Não tem.
18. Você enrola a meia. Com carinho.
19. E guarda no bolso.
20. Respira fundo. Ajeita a camiseta. Abre a porta.
21. A fila inteira te olha.
22. Você passa sorrindo. Com uma meia a menos.

**Final:** VOCÊ CONTA PROS AMIGOS? (Sim: conto tudo / Não: levo pro túmulo)

## Parte 3: Ele guardou a meia

0. Imagine que você conta tudo pros seus amigos.
1. Que demora foi essa?
2. Você olha pros lados. E cochicha.
3. Não tinha papel. Tive que usar a meia.
4. Silêncio. Três segundos.
5. Aí os dois explodem de rir.
6. Mentira! Você não fez isso!
7. Você puxa a pontinha da meia do bolso.
8. Os dois arrastam a cadeira pra trás. Ao mesmo tempo.
9. Não acredito que você guardou!
10. Eu entrei em pânico!
11. O Dudu tira uma foto. Pra posteridade.
12. A mesa do lado muda de lugar.
13. O garçom traz a conta. E se afasta de ré.
14. Meia-noite. O Léo te dá carona.
15. Ele não bebeu. Ele tá sóbrio. Ele tem olfato.
16. Carro em silêncio. Rádio desligado.
17. O cheirinho de pinheiro do retrovisor perde a batalha.
18. Aí o Léo funga. Uma vez.
19. Duas vezes.
20. Uma nuvem verde sai do seu bolso.
21. Reny... você ainda tá com a meia?

**Final:** O QUE VOCÊ RESPONDE? (Depende… / Que meia?)

## Parte 4: Se livra da meia

0. Imagine que você responde a verdade.
1. Depende. Você vai ficar bravo?
2. O Léo abre todas as janelas.
3. A meia, Reny! Se livra da meia!
4. Vento na cara. Lágrima no olho.
5. Não sabe se é do vento.
6. Uma rua vazia. Você tira a meia do bolso.
7. Olha pra ela uma última vez.
8. Ela te salvou hoje.
9. Você estica o braço pra fora da janela.
10. E solta.
11. Em câmera lenta, ela voa pela noite.
12. Gira. Brilha no poste. Some no escuro.
13. Uma música emocionante toca. De novo, só na sua cabeça.
14. Obrigado pelo serviço prestado.
15. Amanhã você paga a lavagem.
16. E do banco do carona.
17. No dia seguinte, um gari acha uma meia no asfalto.
18. Ele não toca. Ninguém toca.
19. Ela tá lá até hoje.
20. Dizem que, nas noites de quarta, ela ainda cheira.
21. Uma noite. Três amigos. Uma meia a menos.

**Final:** VOCÊ TERIA USADO A MEIA? (Sim: sem pensar / Nunca na vida)

## Como gerar de novo
```bash
python engine/voice.py PASTA/partN         # narração (Kokoro pt-BR) + timing.js
python engine/sound.py PASTA/partN 60      # mix.wav (as risadas e o suspiro vêm de ../sem_agua/vo_extra e ../meia/vo_extra: rode os extra_voice.py de lá antes)
./bar_render_all.sh                        # capa, quadros, partN.mp4 com a capa no início
```
