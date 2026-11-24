# Ecos da Ruína

RPG 2D de ação e captura de criaturas, em pixel art, feito em **Godot 4.3 (GDScript)** a partir de `ECOS_DA_RUINA_RPG_MASTER.md`.

**Estado: as cinco regiões são jogáveis — Floresta dos Esquecidos, Minas da Brasa, Pântano dos Sussurros, Fortaleza do Eclipse e a Catedral do Vazio (final, com epílogo e créditos).** Contratos por região: `docs/REGIAO2_CONTRATO.md`, `docs/REGIAO3_CONTRATO.md`, `docs/REGIAO4_CONTRATO.md`, `docs/REGIAO5_CONTRATO.md`.

## Como jogar (executável)

| Sistema | Arquivo | Como abrir |
|---|---|---|
| Linux x86_64 | `releases/EcosDaRuina-linux.zip` → `EcosDaRuina.x86_64` | `chmod +x EcosDaRuina.x86_64 && ./EcosDaRuina.x86_64` |
| Windows x86_64 | `releases/EcosDaRuina-windows.zip` → `EcosDaRuina.exe` | clique duplo (o Windows pode avisar sobre app não assinado) |

Não precisa de rede nem de instalação. Saves ficam em `user://saves` (Linux: `~/.local/share/godot/app_userdata/Ecos da Ruína/`, Windows: `%APPDATA%\Godot\app_userdata\Ecos da Ruína\`).

## Como abrir o projeto-fonte

1. Instale o Godot **4.3-stable** (versão fixada).
2. Abra `ecos_da_ruina/project.godot` e aperte F5.

Controles: `docs/CONTROLS.md`. Build: `docs/BUILD.md`. Testes: `docs/TEST_REPORT.md`.

## Estrutura

```
project.godot, export_presets.cfg
scenes/main.tscn                 ponto de entrada
scripts/                         jogo (game, world, player, companion, enemy, boss_*, entity, ui, hud, menu_screen, save_system...)
data/*.json, data/maps/*.json    espécies, habilidades, inimigos, chefes, itens, missões, diálogos, mapas
assets/src/*.pxl                 pixel art autoral (fonte editável, pixel a pixel)
assets/sprites/*.png             folhas compiladas a partir de assets/src
assets/audio/*.ogg               efeitos e trilhas
tools/pixc.py                    compila .pxl -> .png (não gera formas; só converte o desenho)
tools/gen_maps.py                layouts dos mapas, desenhados sala a sala
tools/gen_audio.py               sintetiza as trilhas/efeitos a partir das notas escritas no script
tests/e2e_bot.gd                 teste ponta a ponta e testes de sistema (rodam no próprio jogo)
docs/                            CONTROLS, BUILD, ASSET_LICENSES, KNOWN_ISSUES, TEST_REPORT
```

## Floresta completa (Capítulo 1)

Além do caminho principal (Vila Lúmen → Bosque/Clareira → Santuário da Seiva → Lenhador → Cervo), a Floresta tem:
- **Rito da Seiva** (`rito_seiva`, pela Câmara dos Pesos do Santuário, antes do Cervo): canal com alavanca → pesos que erguem trechos de passarela até uma ilha → alavancas em cascata + caixa atravessando o canal. Pedra de reinício, pedra da dica (fala após 3 tentativas), saída sempre aberta; Cascalito segura placas e Brotisco estende cipós como alternativas. Recompensa: técnica **Golpe Enraizado** (o golpe carregado prende inimigos pequenos com raízes) + 1 vínculo para a criatura ativa.
- **Rito da Seiva avançado** (mesmo mapa, depois do Cervo): Raiz Viva em sequência com dois canais de seiva → **Amuleto de Seiva Viva** (vigor 60% mais rápido).
- **Segredo por observação**: parede de musgo pálido no corredor de entrada do Santuário; a inscrição de raízes (legível com a luz do Lumipim) aponta para ela e o golpe carregado a rompe → **Diário da Expedição I** + Selo Refinado.
- **Descoberta de criatura**: anel de flores no sudoeste do Bosque; com neblina, ou com um Lumipim na equipe, os Lumipins giram sobre ele e revelam um Lumipim mais velho (Nv. 5, capturável) e a fita azul de Ione.
- **Grota das Raízes Antigas** (`grota_seiva`, a leste da Clareira; as raízes recuam depois do Cervo): criaturas e inimigos, tronco oco que esconde uma toca (Semente de Vida) e baú com o **Diário da Expedição II**.
Código: `scripts/floresta.gd` e `scripts/floresta_ent.gd`; arte: `assets/src/88_floresta_extra.pxl`. Teste: `-- --e2e --floresta`.

## Clima

Mapas externos têm clima (`data/weather.json`, regras em `scripts/weather.gd`, visual em `scripts/weather_fx.gd`, sprites em `assets/src/80_clima.pxl`): Floresta (sol/chuva/neblina), Desfiladeiro (sol/frio/neve) e Minas externas (calor/sol). Interiores, casas e masmorras não têm clima. O tempo é sorteado ao entrar na zona e ao descansar no santuário, muda sozinho a cada 4–6 min de jogo e vai para o save. Efeitos (±15% de dano por afinidade, lentidão no frio, vigor mais lento no calor, percepção menor na neblina) aparecem no menu de pausa e no bestiário; algumas criaturas só surgem com certo clima. Teste: `-- --e2e --clima` (os demais modos travam o clima em "sol" sem efeitos).

## Região 4 — Fortaleza do Eclipse

Níveis 14–17. Entrada pelo mapa `ponte_espiritual` (a ponte só aparece com o Olhar Velado). Núcleo seguro: **Refúgio da Muralha** (Capitã Ilse, Tália, Lume, o mascate Odo, quadro de contratos, santuário, segredos). Rotas: **Jardins Suspensos** (hélices, névoa cortante, Ninho dos Ventos) e **Muralha Partida** (lanceiros de corredor, fresta do Umbrel, mecanismo antigo do Brasardo, balestra e receptor). Masmorra: **Torre das Duas Sombras** (10 salas em 4 mapas: Salão do Eclipse com feixes de luz e espelhos, Galeria dos Lanceiros, Ala da Sombra com plataformas de sol/lua e atalho ao Refúgio, Câmara das Hélices, Sala dos Receptores, **Gêmeos de Ferro**, tesouro, **Rito do Eclipse** e o trono do **Cavaleiro Sem Rosto**). Vitória: a guarnição volta ao Refúgio, abre-se a **Estrada Final** (gancho da Região 5) e o herói ganha o Eco **Passo Umbral** (atravessa só fissuras violeta e portais marcados).
Criaturas novas jogáveis: Umbrel→Umbrafel, Ventisco→Vendraco, Brasardo→Solarco. Mapas: `python3 tools/gen_regiao4.py`. Teste: `-- --e2e --regiao4`. Contrato de nomes: `docs/REGIAO4_CONTRATO.md`.

## Região 5 — Catedral do Vazio (final)

Níveis 18–22. Acesso pela Estrada Final: o **Passo Umbral** cruza o selo externo até o **Acampamento da Aurora** (Arquivista Sena, Mira, Caio, Vesna, Bruna e Ravi; quadro de contratos, santuário, segredos). Rotas: **Escadaria dos Fragmentos** (âncoras gravitacionais, fragmentos errantes, Gravito) e **Jardim Invertido** (prismas, escribas do vazio, Cristil e o raro Velúnio). Masmorra: **Catedral do Vazio** (11 salas em 3 mapas + Rito da Convergência, dois atalhos): Sala dos Prismas, Galeria dos Escribas, Câmara das Raízes e Brasas, Sala das Âncoras, Coro Velado, **Arauto Partido**, Câmara do Eco (resgate da Mestra Ione) e o trono do **Rei dos Ecos** (Ivar). Vitória: o nome devolvido, o quinto artefato, a revelação final, o epílogo nas cinco comunidades, créditos e a **Harmonia dos Ecos** (Salão da Harmonia e notas do bestiário).
Criaturas: Cristil→Prismal, Gravito→Monolito, Velúnio→Astravéu. Mapas: `python3 tools/gen_regiao5.py`; dados: `python3 tools/dados_regiao5.py`. Teste: `-- --e2e --regiao5`. Contrato: `docs/REGIAO5_CONTRATO.md`.
