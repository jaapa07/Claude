# Ecos da Ruína

RPG 2D de ação e captura de criaturas, em pixel art, feito em **Godot 4.3 (GDScript)** a partir de `ECOS_DA_RUINA_RPG_MASTER.md`.

**Estado: Capítulo 1 (Floresta dos Esquecidos) jogável do início ao fim.** As outras quatro regiões ainda não foram implementadas (veja `docs/KNOWN_ISSUES.md`).

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
