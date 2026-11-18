# O Chupa-Cu do Snooker Bar: 5 partes de 61 s (bonecos palito, formato "Imagine que…")

Mistério e comédia de boteco. Você é o Murilo, dono do Snooker Bar (camisa vinho, molho de chaves na cintura).
Toda sexta, às 23h47, o freezer para, a luz apaga e alguém grita. Os ataques ficam sempre na tela preta: só som, reação e depoimento.

Elenco: garçons Zuba, Serjo Pecede e Alex; amigos Didi (lampião), Rocha, Reny (o mapa) e Eduardo (o torresmo); Jorge, o vizinho (roupão, avental, chinelo descolado); a mãe do Murilo.

1. Toda sexta, alguém gritava — enquete: QUEM É O CHUPA-CU?
2. Murilo fecha a lista — QUEM ABRIU A PORTINHOLA?
3. A sexta do Eduardo — DE QUEM É A VOZ?
4. Fecha bar e fecha o cu — O JORGE TINHA RAZÃO?
5. O último apagão — VOCÊ VOLTAVA NESSE BAR?

Cenário em `world.js` (bar, lavanderia do Jorge, calçada), elenco em `stick.js`, telas de celular, mapa e caderno em `common.js`.

## Como gerar de novo
```bash
python engine/voice.py snooker/partN
python engine/sound.py snooker/partN 61
./snooker_render_all.sh
```
