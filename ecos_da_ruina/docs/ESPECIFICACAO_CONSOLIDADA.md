# Ecos da Ruína — Especificação consolidada (v1.1)

Base: `ECOS_DA_RUINA_RPG_MASTER.md` (v1.0). Este documento **preserva** o nome Ecos da Ruína, o continente de Auralis, a história, as cinco regiões, as 15 espécies e suas evoluções, os cinco guardiões e suas fases, o combate em tempo real e a arquitetura em Godot/GDScript. Ele **acrescenta** as diretrizes de exploração, desbloqueios, Ritos de Sintonia, criaturas exploradoras, masmorras conectadas, combate de posicionamento e mundo vivo. Quando os dois conflitam, vale este documento; o restante do v1.0 continua valendo.

Referências de sensação (sem reutilizar nada): Zelda 2D para ritmo, exploração e clareza; Zelda 3D clássico para atmosfera, arquitetura de masmorras e chefões; Pokémon Gold para descoberta, coleção e vínculo.

Objetivo de experiência: cada nova captura, rito concluído e Eco conquistado muda concretamente o jeito de explorar Auralis.

---

## 1. Exploração com recompensas reais
- Toda área tem **uma função declarada** no seu arquivo de mapa: `ameaca`, `historia`, `mecanica`, `conexao` ou `recompensa`.
- **Segredos por observação**: rachaduras com musgo diferente, anéis de flores incomuns, vapor ou fumaça vazando, sons próximos, reflexos que não batem, inscrições, criaturas que se comportam de modo estranho. Marcadores visuais só depois da descoberta.
- **Obstáculo antes da solução**: o jogador vê a ravina, a rocha fissurada ou a inscrição oculta antes de ter o Eco. A tela de Mapa registra o bloqueio com um símbolo (raízes, ponte, rachadura, olho) e o nome da habilidade, para o jogador pensar "agora consigo voltar".
- **Cada região inclui**: (1) um atalho desbloqueável que reduz o retorno; (2) um segredo acessível com os recursos atuais; (3) um segredo de revisita com Eco posterior; (4) uma descoberta ligada às criaturas locais; (5) uma mudança explorável após a morte do guardião.
- **Recompensas variadas**: técnicas, equipamentos com efeito distinto, histórias (diários da expedição), melhorias e oportunidades de vínculo. Fragmentos só em parte dos baús. Toda recompensa é única, persistente e não duplica ao carregar.

## 2. Disponibilidade e ordem dos desbloqueios
Veja `docs/MATRIZ_DESBLOQUEIOS.md` (região → obstáculo → habilidade → momento → alternativa → recompensa).
- Floresta: recursos básicos; **Raiz Viva** após o Cervo de Ossos.
- Minas: entrada com Raiz Viva; **Ruptura Ígnea** após o Ferreiro.
- Pântano: entrada com Ruptura Ígnea; **Olhar Velado** após a Bruxa.
- Fortaleza: entrada com Olhar Velado; **Passo Umbral** após o Cavaleiro.
- Catedral: entrada com Passo Umbral; **Harmonia dos Ecos** após o Rei (pós-jogo).
- Nunca exigir um Eco para vencer o guardião que o concede.
- Antes de cada desbloqueio, enigmas obrigatórios têm solução por ferramenta, mecanismo local ou observação. Criaturas oferecem alternativa, atalho ou vantagem.
- Espécies comuns essenciais ao aprendizado têm habitat garantido e reposição previsível (reaparecem ao descansar). Nenhuma captura rara, evolução, consumível finito ou sorte bloqueia a campanha.
- Nas Minas não se exige habilidade de água; o resfriamento usa as válvulas locais.

## 3. Ritos de Sintonia
Provas curtas, feitas à mão e integradas à narrativa (guardiões antigos deixaram os ritos para formar Vinculadores). Não substituem guardiões nem antecipam Ecos.
- **Antes do guardião** (no caminho principal ou ao lado dele): ensinam a lógica regional com mecanismos locais.
- **Depois da vitória** (opcional): versão avançada que testa o domínio do Eco recebido e dá recompensa secundária.
- Estrutura fixa: **apresentação segura → aplicação individual → combinação → conclusão** com retorno visual (sigilos acendem, altar desperta) e narrativo (eco de voz do guardião antigo).
- Testam compreensão, não repetição nem coleta. Têm reinício local sem perda de recursos (pedra de reinício), saída sempre segura e dica opcional após 3 erros.
- A primeira conclusão conta como atividade de vínculo para a criatura participante. Repetir não dá vínculo nem recompensa.

| Rito | Antes do guardião ensina | Versão avançada testa |
|---|---|---|
| Rito da Seiva | canais, pesos e conexões entre plataformas | Raiz Viva em sequência com os canais |
| Rito da Forja | calor, resfriamento e sincronização de mecanismos | Ruptura Ígnea em mecanismos térmicos |
| Rito dos Reflexos | observar a água e identificar ilusões | Olhar Velado em plataformas espirituais |
| Rito do Eclipse | luz, sombra, posicionamento e rotas alternadas | Passo Umbral entre portais |
| Rito da Convergência | combinação dos quatro Ecos | Harmonia dos Ecos (pós-jogo) |

## 4. Criaturas como companheiras de exploração
- As 15 espécies e suas evoluções são preservadas. Primeiro se aprofundam as funções existentes; só depois entram espécies novas.
- Toda ação ambiental tem animação, indicação de alvo (o objeto válido brilha quando a criatura certa está ativa) e efeito real no cenário.
- Cada capacidade é reutilizada em contextos diferentes: combate, exploração e missão. Exemplo: o Pulso do Lumipim acende flores, revela inscrições, interrompe ataques e clareia a fase escura do Cervo.
- Desafios opcionais de uma espécie são permitidos se forem claramente sinalizados e abandonáveis.
- O caminho principal sempre é possível com os companheiros exaustos.

## 5. Masmorras como lugares conectados
- De 8 a 12 salas manuais, com uma **sala central reconhecível**, ramificações, conexões visíveis entre salas, atalhos e alterações que afetam outras salas (uma alavanca enche um canal em outra ala, uma válvula resfria o piso do outro lado).
- Pontes, escadas e alturas com leitura clara em 2D (face e topo das paredes, sombras, escadas desenhadas).
- Cada masmorra **apresenta** uma mecânica, **aprofunda** e **combina** com outra antes do chefão.
- Evitar sequências de salas independentes com inimigos e portas idênticas, e deslocamento repetitivo.

## 6. Combate e chefões
- Prioridade: direção do ataque, distância, terreno, defesa, esquiva e comando do companheiro.
- Inimigos com comportamentos distintos e ataques anunciados por forma e cor. A dificuldade sobe combinando padrões, não só aumentando a vida.
- Os cinco guardiões e suas fases são preservados. Cada um testa o que a região ensinou, usando mecanismos disponíveis na arena (pilares, válvulas, reflexos, luz e sombra, portais).
- Criaturas apropriadas abrem janelas de ataque, mas nenhuma espécie é obrigatória.

## 7. Mundo vivo e ritmo
- NPCs com pequenas rotinas (posições e falas que variam com o progresso e a hora do dia) e diálogos ligados ao progresso.
- A hora do dia pode alterar ambientação e encontros opcionais, mas nunca torna perdível uma missão essencial.
- Após cada guardião mudam caminhos, diálogos, atividades e elementos visuais. A consequência aparece no mundo, além da mensagem de vitória.
- O início apresenta exploração, combate e o primeiro contato com uma criatura em poucos minutos, com tutoriais interativos curtos.

## 8. Implementação
- Godot 4.3-stable e GDScript (versão verificada), pixel art autoral em `assets/src/*.pxl`. Assets próprios ou licenciados, com recursos provisórios identificados em `docs/KNOWN_ISSUES.md`.
- Prioridade: uma Floresta completa — Vila Lúmen → rotas → captura → **Rito da Seiva** → masmorra → Cervo → Raiz Viva → transformação regional → retorno a um segredo. Expande-se para as Minas depois de validar esse ciclo.

## 9. Validação
Os testes automáticos verificam: ausência de dependências circulares, campanha sem criaturas raras, caminho principal com companheiros exaustos, saída e reinício seguros em todos os ritos, recompensas únicas e persistentes, atalhos, mudanças regionais e segredos preservados no save, criaturas disponíveis antes dos desafios opcionais que as usam e nenhuma duplicação após carregar.

---
Status da implementação por item: `docs/MATRIZ_DESBLOQUEIOS.md` e `docs/KNOWN_ISSUES.md`.
