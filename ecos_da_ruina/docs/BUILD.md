# Build

Engine: **Godot 4.3-stable** (`Godot_v4.3-stable_linux.x86_64`) com os export templates 4.3.

```bash
# (opcional) recompilar arte autoral e mapas
python3 tools/pixc.py           # assets/src/*.pxl -> assets/sprites/*.png
python3 tools/gen_maps.py       # data/maps/*.json (verifica alcançabilidade)
python3 tools/gen_audio.py      # assets/audio/*.ogg (requer numpy e ffmpeg); --trilhas [nomes] regrava só as trilhas dinâmicas

godot --headless --path . --import
godot --headless --path . --export-release "Linux"   build/linux/EcosDaRuina.x86_64
godot --headless --path . --export-release "Windows" build/windows/EcosDaRuina.exe
```

## Testes (rodam no executável real, pelo ponto de entrada normal)
```bash
godot --headless --fixed-fps 60 --path . -- --e2e     # percurso completo do capítulo
godot --headless --fixed-fps 60 --path . -- --unit    # testes de sistema
godot --headless --fixed-fps 60 --path . -- --e2e --regiao4   # Região 4 inteira (Fortaleza do Eclipse), a partir do estado de fim do capítulo 3
godot --headless --fixed-fps 60 --path . -- --e2e --musica   # trilha dinâmica (lugar, combate, suspense, chefe, jingles)
./build/linux/EcosDaRuina.x86_64 --headless --fixed-fps 60 -- --e2e   # o mesmo no executável exportado
```
O processo termina com código 0 se tudo passar.
