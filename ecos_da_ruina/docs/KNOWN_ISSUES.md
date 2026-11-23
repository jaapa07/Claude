# Estado do projeto e pendências

## Pronto e jogável — Etapas A, B e C (Região 1: Floresta dos Esquecidos)
- Vila Lúmen com tutorial durante a exploração, loja, santuário e NPCs.
- Duas rotas: Bosque das Lanternas e Clareira das Raízes.
- Santuário da Seiva com 10 salas: átrio, Salão das Flores, Galeria dos Lobos (portas fecham), Canais de Seiva (alavancas com dica), Tesouro com atalho para a vila, Câmara dos Pesos (caixas e placas), preparação, arena do Lenhador Oco, preparação e arena do Cervo de Ossos.
- 3 espécies capturáveis (Brotisco, Lumipim, Cascalito) e as 3 evoluções (Galhardo, Auripim, Rocantor), com habilidade comandada, passiva e ação ambiental.
- Lenhador Oco (minichefe) e Cervo de Ossos (3 fases: investida anunciada com pilares, faixas de raízes e escuridão).
- Raiz Viva: pontes contextuais e raízes em combate. Vila transformada após o chefão e passagem às Minas aberta.
- Sistemas: combo de 3 golpes, ataque carregado, defesa, esquiva com janela de invulnerabilidade, captura, equipe de 3, santuário com 90 vagas, evolução por nível e vínculo, inventário, equipamentos, talentos, bestiário, diário, mapa, 3 slots de save com autosave, backup e escrita atômica, opções (volume, remapeamento, acessibilidade e dificuldade).

## Pronto e jogável — Região 2 (Capítulo 2: Minas da Brasa)
- Forja de Cobre (núcleo seguro): santuário, Mestra Ilda (forja +1..+3 com tela antes/depois), Bento (loja), Doran, Tessa, Nino; moradores mudam de lugar com o progresso; depois do Ferreiro: forjas acesas, família Ruivo, mercador Joca, elevador para a Pedreira e piso da vila renovado.
- Rotas: Pedreira Oca (válvula da galeria quente, veios de minério, ninho de Faisquitos que aparece com a fornalha acesa, Fuligin revela o Veio Esquecido) e Trilhos Fundidos (carrinho + alavanca de desvio, alas quentes alternadas por duas válvulas, Ferrunho move trilho marcado, depósito secreto achado pelo vapor que vaza).
- Fundição do Último Fogo (11 salas em 3 mapas + Rito): átrio, Grande Caldeira (sala central: lava baixa quando as fornalhas acendem), Galeria das Bigornas (portas de metal; a válvula dela resfria a passagem da Ala de Escória), Ala de Escória, Câmara das Fornalhas, Pátio dos Carrinhos (desvio numa ilha quente), Tesouro (Lança de Cobre), Passagem de Carga (atalho que abre o portão norte da Forja), arena do Vigia de Escória, preparação e arena do Ferreiro Devorador.
- Rito da Forja (obrigatório antes do Ferreiro): 4 salas (apresentação, aplicação, combinação com válvula temporizada, altar), pedra do recomeço, saída sempre aberta, dica após 3 erros; recompensa Luvas Térmicas + vínculo uma vez. Ala avançada opcional (rocha fissurada + mecanismos que só a Ruptura Ígnea acende) com Amuleto da Brasa.
- Criaturas: Faisquito, Ferrunho, Fuligin e evoluções Brasejante, Ferragor, Cinzavéu (nível 10/11/10 + 3 vínculos). Habilidades: Cone de Brasa, Ímã de Ferro (absorve ferramentas), Nuvem de Fuligem (inimigos erram metade).
- Inimigos: Mineiro Corrompido (arremessa picaretas que batem nas paredes e podem ser defendidas), Lesma de Escória (deixa poças quentes), Autômato de Martelo (onda de choque anunciada; a defesa segura só 30%).
- Chefes: Vigia de Escória (couraça; válvulas de vapor alternadas) e Ferreiro Devorador (ondas; armadura incandescente resfriada pelas válvulas de água; piso central desaba e martelada grande anunciada por 1,2 s). Eco Ruptura Ígnea (rochas fissuradas, mecanismos térmicos, dano em área).
- Missões: principal "Brasas da Forja", secundárias "Ferramentas Perdidas" e "Calor de Vínculo", segredo "O Veio Esquecido"; 5 diários de história.

## Não implementado
- **Regiões 3 a 5** (Pântano dos Sussurros, Fortaleza do Eclipse, Catedral do Vazio).
- 9 das 15 espécies-base e suas evoluções: estão só cadastradas nos dados, como "planejadas", sem sprite nem habitat.
- Camada espiritual (Entre-Ecos), Olhar Velado (as inscrições ocultas da Forja e da Fundição já esperam por ele), Passo Umbral e Harmonia dos Ecos.
- Suporte a controle, lâminas rápidas, revisão de cenas e diálogos acelerados por opção.

## Provisório / limitações conhecidas
- Áudio: composições escritas nota a nota e sintetizadas no próprio projeto (as trilhas dinâmicas usam síntese aditiva com reverb; as cinco originais ainda são chiptune); não é uma trilha gravada com instrumentos reais.
- Ataques em arco dos inimigos usam um aviso retangular à frente, não um cone exato.
- Arte autoral feita pixel a pixel em texto: coerente, mas um artista dedicado pode refinar animações (mais quadros de passo e ataque).
- O bot vence o Cervo com facilidade usando a isca dos pilares; o equilíbrio para jogadores humanos não foi testado.
- O idioma da interface é só português do Brasil.
- Região 2: a Lança de Cobre usa o sprite da espada esticado (falta um sprite `fx_lanca.png`); o ícone da lança e dos diários reusa ícones existentes.
- Região 2: os sprites da Região 2 foram desenhados pelo artista em paralelo; durante o desenvolvimento usei cópias provisórias com o mesmo tamanho de quadro, já substituídas pelos PNGs do contrato.
- Região 2: no teste automatizado o companheiro evoluído causa mais dano ao Ferreiro do que o herói; o equilíbrio do chefe para jogadores humanos não foi medido.
- Os testes ponta a ponta usam semente fixa (`--seed=N` muda); com outras sementes o fluxo do Capítulo 1 já era sensível ao acaso (capturas e flanqueio).
