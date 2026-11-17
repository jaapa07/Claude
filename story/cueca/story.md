# A Noite em que Minha Cueca Virou História: 3 partes (~70–80 s, bonecos palito, formato "Imagine que…")

Comédia: uma noite romântica, 47 fatias de pizza, dez minutos de carro e a cueca favorita que não sobreviveu.
Você: camiseta preta, cabelo preto curto, a barriga cresce com a pizza. A namorada: chanel preto, jaqueta rosa.

- **Parte 1 (77 s):** pizzaria, a casa dela à meia-noite, o primeiro aviso no carro. Enquete: ACELERO PRA CASA / PARO NUM POSTO.
- **Parte 2 (75 s):** lombada pessoal, a cueca lendária no pedestal dourado, dez minutos de tortura. Enquete: CHEGO SIM / NÃO VAI DAR.
- **Parte 3 (84 s):** a chave no chão, o vaso celestial, o PRRRÓÓÓT, o funeral na chuva. Enquete: VOCÊ JÁ PERDEU UM SOLDADO?

Sem imagem de fezes: o estrago só aparece no rosto dele.

Cenários: `world.js` (pizzaria, quarto, altar, portão, corredor e banheiro, funeral); o carro vem de `../meia/world.js`; bonecos e montagens em `stick.js`.

## Como gerar de novo
```bash
python engine/voice.py cueca/partN          # narração + timing.js
python engine/sound.py cueca/partN TOTAL    # mix.wav (TOTAL: 77, 75, 84)
./cueca_render_all.sh                       # capa, quadros, partN.mp4 com a capa no início
```
