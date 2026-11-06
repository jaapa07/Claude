# QUARTO 313: conceito

**Gênero:** suspense psicológico com terror sobrenatural. **Formato:** 4 episódios de cerca de 65 s, vertical 9:16.

**Logline:** uma restauradora de espelhos acorda num quarto de hotel onde o reflexo dela continua dormindo. Há três saídas e só uma é real. Todas as pistas aparecem no primeiro minuto.

**O elemento único (o que faz compartilhar):** a resposta "certa" é a errada. Quem acertar a escolha descobre no fim que ajudou o reflexo a fugir, e a vontade de rever o episódio 1 vira comentário e compartilhamento.

## Personagem principal
**Lia Moreno**, 31 anos, restauradora de espelhos antigos em São Paulo. É metódica, observadora e calma sob pressão.

**Visual fixo:**
- cabelo preto chanel com franja;
- cicatriz na sobrancelha **esquerda**;
- jaqueta de veludo vinho e camiseta branca;
- jeans escuro e coturno preto;
- relógio dourado e aliança de prata, os dois do lado **esquerdo**.

Detalhes em `personagem_principal.txt`.

## A verdade (só se revela no ep. 4)
- O espelho do quarto 313 do Hotel Aurora, que pegou fogo em 1974, prende **reflexos**, não pessoas.
- Lia comprou o espelho para restaurar. Às 3:13, **o reflexo dela acordou primeiro** e se convenceu de que era a Lia.
- A Lia que acompanhamos é o reflexo. A "outra Lia", que dorme e depois chama do outro lado do vidro, é a verdadeira.

## Mapa de pistas (todas no episódio 1)
| # | Pista | O que parece | O que significa |
|---|---|---|---|
| 1 | Aliança na mão **direita** ("ela sempre usou na esquerda") | descuido | reflexos são invertidos |
| 2 | O narrador diz que a placa da farmácia está "escrita ao contrário", mas **o espectador vê a placa normal** | erro de edição | ela enxerga o mundo real invertido porque é o reflexo |
| 3 | O relógio da parede marca 3:13 e o ponteiro gira **ao contrário** | o tempo parado | ela está do lado do espelho |
| 4 | O bilhete na letra dela: "não confie em quem te chama pelo nome" | um aviso contra o hotel | foi escrito por um reflexo que fugiu antes, para o próximo |
| 5 | O telefone a chama de "Senhora Moreno" | o hotel quer prendê-la | quem chama pelo nome quer o reflexo de volta, ou o recepcionista, também reflexo, quer mantê-la presa |

## As três escolhas (ep. 2) e as consequências (ep. 3)
- **A, a porta:** um corredor infinito de quartos 313, cada um com uma mulher acordando com a aliança na mão direita. O recepcionista é um reflexo que escolheu a porta em 1974. *(Pesadelo: virar funcionário do loop.)*
- **B, o espelho:** o reflexo puxa a Lia e as duas trocam de lugar. Daí em diante ela só pode copiar cada gesto, para sempre, até cobrirem o espelho com um pano. *(Pesadelo: virar reflexo.)*
- **C, a janela:** é a única saída real, porque a farmácia está escrita "do jeito certo" e ninguém ali chama Lia pelo nome. Ela foge até a oficina, onde está o mesmo espelho, com a placa "Hotel Aurora, quarto 313", e dentro dele a outra Lia grita "me devolve!".

## A reviravolta (ep. 4)
Quem escolheu C acertou a saída e libertou o reflexo. O episódio volta às 5 pistas, e todas se encaixam. Ela cobre o espelho, escreve um bilhete novo (ao contrário) para o próximo reflexo e agradece ao público.

**Última frase:** *"Hoje, às 3:13, olhe pro seu espelho. Se ele piscar depois de você… não abra a janela."*

## Roteiro dos episódios
| Ep | Título | Gancho dos 2 primeiros segundos | Fim |
|---|---|---|---|
| 1 | O reflexo que dorme | "Imagine que você acorda num quarto de hotel… e o seu reflexo continua dormindo." | o reflexo abre os olhos e sorri |
| 2 | As três saídas | "Imagine que existem três saídas. E só uma é real." | 3:59, a maçaneta gira; comente A, B ou C |
| 3 | As consequências | "Imagine que você escolhe a porta." | quem está dentro e quem está fora? |
| 4 | O final | "Imagine que você ajudou a pessoa errada a fugir." | a última frase e o espelho que pisca depois |

O roteiro completo, com o tempo de cada fala, está em `episodio_0N/roteiro.txt`.

## Identidade visual
- **Visual:** realismo cinematográfico com verde neon e âmbar, chuva e sombras profundas.
- **Regra do espelho:** todos os clipes do lado do espelho são invertidos na edição. Assim a aliança muda de mão, o relógio gira para trás e o texto fica invertido sem depender da IA.

Detalhes em `identidade_visual.txt`.

## Requisitos técnicos do Kokoro (conferidos nesta máquina)
- **Instalação:** `kokoro-onnx 0.6.1` com o modelo `kokoro-v1.0.onnx` e `voices-v1.0.bin`, com 54 vozes no total. O português usa `lang="pt-br"` (fonemas do espeak-ng).
- **Vozes de português disponíveis de fato:** `pf_dora` (feminina), `pm_alex` e `pm_santa` (masculinas). Não existe outra voz pt-BR nesta versão, e o estúdio recusa nomes que não estejam nessa lista.
- **Narrador:** `pm_alex`, a mais grave. Medi a frequência fundamental: cerca de 133 Hz, contra 143 Hz da `pm_santa`. É a mesma voz nos 4 episódios.
- **Personagens:** Lia usa `pf_dora`, a mesma voz para as duas Lias, como deve ser. O recepcionista usa `pm_santa`.
- **Limitação:** o Kokoro **não tem controle de emoção**. A interpretação é feita por:
  - velocidade por fala: mais lenta nas revelações (0,85–0,92) e mais rápida no perigo (1,05–1,08);
  - pausas dramáticas por fala (0,3–0,6 s);
  - reticências no texto;
  - trilha que abaixa antes das revelações.
- **Sincronia:** o modelo de alinhamento de palavras (faster-whisper) não está acessível nesta rede. O tempo de cada palavra é estimado pelas pausas reais do áudio. Isso basta para legendas de 1 a 3 palavras; um desvio pequeno é possível.

## Pipeline de produção
- `historias/estudio.py` lê o `historia.json`, gera a narração no Kokoro e a trilha, e escreve os roteiros, os prompts, as legendas e os textos de postagem.
- Os vídeos realistas em 4K **não são gerados aqui**, porque esta máquina não tem integração com Veo/Flow. Cada cena tem o prompt pronto para gerar lá e montar na edição.
