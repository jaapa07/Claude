# Ecos da Ruína

RPG 2D de ação e captura de criaturas, em pixel art, feito em **Godot 4.3 (GDScript)** a partir de `ECOS_DA_RUINA_RPG_MASTER.md`.

**Estado: Capítulos 1 (Floresta dos Esquecidos) e 2 (Minas da Brasa) jogáveis do início ao fim; Região 4 (Fortaleza do Eclipse) jogável a partir da ponte espiritual** (a ligação com a Região 3 está descrita em `docs/REGIAO4_CONTRATO.md`). Pântano e Catedral ainda em desenvolvimento (veja `docs/KNOWN_ISSUES.md`).

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

## Clima

Mapas externos têm clima (`data/weather.json`, regras em `scripts/weather.gd`, visual em `scripts/weather_fx.gd`, sprites em `assets/src/80_clima.pxl`): Floresta (sol/chuva/neblina), Desfiladeiro (sol/frio/neve) e Minas externas (calor/sol). Interiores, casas e masmorras não têm clima. O tempo é sorteado ao entrar na zona e ao descansar no santuário, muda sozinho a cada 4–6 min de jogo e vai para o save. Efeitos (±15% de dano por afinidade, lentidão no frio, vigor mais lento no calor, percepção menor na neblina) aparecem no menu de pausa e no bestiário; algumas criaturas só surgem com certo clima. Teste: `-- --e2e --clima` (os demais modos travam o clima em "sol" sem efeitos).

## Região 4 — Fortaleza do Eclipse

Níveis 19–24. Entrada pelo mapa `ponte_espiritual` (a ponte só aparece com o Olhar Velado). Núcleo seguro: **Refúgio da Muralha** (Capitã Ilse, Tália, Lume, o mascate Odo, quadro de contratos, santuário, segredos). Rotas: **Jardins Suspensos** (hélices, névoa cortante, Ninho dos Ventos) e **Muralha Partida** (lanceiros de corredor, fresta do Umbrel, mecanismo antigo do Brasardo, balestra e receptor). Masmorra: **Torre das Duas Sombras** (10 salas em 4 mapas: Salão do Eclipse com feixes de luz e espelhos, Galeria dos Lanceiros, Ala da Sombra com plataformas de sol/lua e atalho ao Refúgio, Câmara das Hélices, Sala dos Receptores, **Gêmeos de Ferro**, tesouro, **Rito do Eclipse** e o trono do **Cavaleiro Sem Rosto**). Vitória: a guarnição volta ao Refúgio, abre-se a **Estrada Final** (gancho da Região 5) e o herói ganha o Eco **Passo Umbral** (atravessa só fissuras violeta e portais marcados).
Criaturas novas jogáveis: Umbrel→Umbrafel, Ventisco→Vendraco, Brasardo→Solarco. Mapas: `python3 tools/gen_regiao4.py`. Teste: `-- --e2e --regiao4`. Contrato de nomes: `docs/REGIAO4_CONTRATO.md`.
