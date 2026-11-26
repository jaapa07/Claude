"""Gera ASSETS.md (inventário de TODOS os arquivos em public/assets com origem e licença) e src/data/credits.json."""
import os, json

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
A = os.path.join(ROOT, 'public', 'assets')

KENNEY = 'Kenney (kenney.nl) — CC0 1.0'
OWN = 'Criado para o REI DA PRAIA (scripts deste repositório) — CC0 1.0'

RULES = [
    ('models/players/athlete.glb', 'Malha/rig: Kenney "Animated Characters: Protagonists" (CC0). 40 clipes de captura de movimento retargetados por scripts/blender/retarget.py — Mixamo/Adobe (pacote de futebol fornecido pelo dono do projeto, licença Mixamo; os .fbx originais não são redistribuídos), Quaternius "Universal Animation Library" (CC0) e CMU Graphics Lab Motion Capture Database (mocap.cs.cmu.edu, uso livre; sessões 10, 11, 13, 33, 42, 49) — e clipes autorais (scripts/blender/anims.py)', 'CC0 1.0 / CMU (uso livre) / Mixamo (Adobe)'),
    ('textures/kits/', 'Uniformes pintados por scripts/build_skins.py; rostos/cabelos amostrados das skins Kenney "Animated Characters" Protagonists/Survivors (CC0)', 'CC0 1.0'),
    ('models/arenas/', 'Montado em Blender por scripts/blender/build_arena.py com modelos Kenney City Kit Commercial, Nature Kit, Watercraft Kit, Furniture Kit (CC0)', 'CC0 1.0'),
    ('models/props/crowd.glb', 'Kenney "Mini Characters" (CC0), poses congeladas em Blender por build_props.py', 'CC0 1.0'),
    ('models/props/', 'Modelado em Blender por scripts/blender/build_props.py', OWN),
    ('textures/props/', 'Gerado por scripts/blender/build_props.py', OWN),
    ('textures/arena/', 'Placas de patrocinadores fictícios, rede, fita e faixas: scripts/build_textures.py (fonte Bungee, OFL)', OWN),
    ('textures/sand/field', 'ambientCG Ground080 (ambientcg.com)', 'CC0 1.0'),
    ('textures/sand/beach', 'ambientCG Ground093C (ambientcg.com)', 'CC0 1.0'),
    ('textures/sky/kloofendal', 'Poly Haven "Kloofendal 48d Partly Cloudy (Pure Sky)" — Greg Zaal', 'CC0 1.0'),
    ('textures/sky/qwantani_sunset', 'Poly Haven "Qwantani Sunset (Pure Sky)" — Greg Zaal / Jarod Guest', 'CC0 1.0'),
    ('textures/sky/qwantani_night', 'Poly Haven "Qwantani Night (Pure Sky)" — Greg Zaal / Jarod Guest', 'CC0 1.0'),
    ('vfx/puff', 'Kenney "Smoke Particles" (CC0)', 'CC0 1.0'),
    ('vfx/explosion', 'Kenney "Smoke Particles" (CC0)', 'CC0 1.0'),
    ('vfx/flash', 'Kenney "Smoke Particles" (CC0)', 'CC0 1.0'),
    ('vfx/footprint', 'Gerado por scripts/build_ui.py', OWN),
    ('vfx/blob_shadow', 'Gerado por scripts/build_ui.py', OWN),
    ('vfx/confetti', 'Gerado por scripts/build_ui.py', OWN),
    ('vfx/', 'Kenney "Particle Pack" (CC0)', 'CC0 1.0'),
    ('ui/input/', 'Kenney "Input Prompts" (CC0)', 'CC0 1.0'),
    ('ui/sand_wipe', 'Derivado de ambientCG Ground080 (CC0)', 'CC0 1.0'),
    ('ui/', 'Logo, brasões, bandeiras, crista do medidor, marcadores e cartões: scripts/build_ui.py (fonte Bungee, OFL)', OWN),
    ('audio/music/menu', '"Mad Bossa" — spring-spring (OpenGameArt)', 'CC0 1.0'),
    ('audio/music/select', '"Funky House" — Of Far Different Nature (OpenGameArt)', 'CC0 1.0'),
    ('audio/music/halftime', '"Crystal Beach" — iamoneabe (OpenGameArt)', 'CC0 1.0'),
    ('audio/music/fire', '"Fever Stadium" — mintodog (OpenGameArt)', 'CC0 1.0'),
    ('audio/music/victory', '"Fever Stadium (climax)" — mintodog (OpenGameArt)', 'CC0 1.0'),
    ('audio/crowd/ambience', '"Crowd Shouting/Speaking Ambience" — starninjas (OpenGameArt)', 'CC0 1.0'),
    ('audio/crowd/ooh', '"OoOoOoOoOoOoOo" — nocturnalvanguard (OpenGameArt)', 'CC0 1.0'),
    ('audio/crowd/applause', '"Applause in a large hall" — expl0it3r (OpenGameArt)', 'CC0 1.0'),
    ('audio/crowd/goal', 'Mixagem de applause + crowd shouting (OpenGameArt, CC0) por build_audio.py', 'CC0 1.0'),
    ('audio/ambient/waves', '"Beach Ocean Waves" — qubodup / jasinski (OpenGameArt)', 'CC0 1.0'),
    ('audio/ambient/gull', '"Solo Seagull Sound Effects" — rango-mango (OpenGameArt)', 'CC0 1.0'),
    ('audio/sfx/whistle', 'Apito sintetizado por scripts/build_audio.py', OWN),
    ('audio/sfx/sand_run', '"Water Splash and sand footsteps" — peludo (OpenGameArt)', 'CC0 1.0'),
    ('audio/sfx/ui_', 'Kenney "Interface Sounds" (CC0)', 'CC0 1.0'),
    ('audio/sfx/style', 'Kenney "Interface Sounds" (CC0)', 'CC0 1.0'),
    ('audio/sfx/combo', 'Kenney "Interface Sounds" (CC0)', 'CC0 1.0'),
    ('audio/sfx/fire_on', 'Kenney "Interface Sounds" (CC0)', 'CC0 1.0'),
    ('audio/sfx/', 'Kenney "Impact Sounds" (CC0)', 'CC0 1.0'),
]


def classify(rel):
    for pre, src, lic in RULES:
        if rel.startswith(pre):
            return src, lic
    return None, None


def main():
    rows, missing = [], []
    for d, _, fs in os.walk(A):
        for f in sorted(fs):
            rel = os.path.relpath(os.path.join(d, f), A).replace(os.sep, '/')
            src, lic = classify(rel)
            if not src: missing.append(rel); continue
            rows.append((rel, src, lic, os.path.getsize(os.path.join(d, f))))
    rows.sort()
    groups = {}
    for rel, src, lic, size in rows:
        groups.setdefault((src, lic), []).append((rel, size))
    out = ['# ASSETS — inventário e licenças', '',
           'Todos os arquivos em `public/assets/` listados com origem e licença. Gerado por `scripts/build_credits.py`.',
           'Fontes baixadas por `scripts/fetch-assets.mjs`; derivados gerados por `scripts/build_all.py`.', '',
           f'Total: **{len(rows)} arquivos**, {sum(r[3] for r in rows) / 1e6:.1f} MB. Nenhuma marca real; patrocinadores e jogadores são fictícios.', '',
           'Fontes tipográficas: Bungee (David Jonathan Ross) e Rubik (Hubert & Fischer) via @fontsource — SIL Open Font License 1.1.', '']
    for (src, lic), files in sorted(groups.items(), key=lambda kv: kv[1][0][0]):
        out.append(f'## {src}')
        out.append(f'Licença: **{lic}** · {len(files)} arquivo(s)')
        out.append('')
        if len(files) > 12:
            out.append('<details><summary>arquivos</summary>\n')
        for rel, size in files:
            out.append(f'- `{rel}` ({size / 1024:.0f} KB)')
        if len(files) > 12:
            out.append('\n</details>')
        out.append('')
    if missing:
        out.append('## SEM CLASSIFICAÇÃO (corrigir!)')
        out += [f'- `{m}`' for m in missing]
    open(os.path.join(ROOT, 'ASSETS.md'), 'w').write('\n'.join(out) + '\n')
    credits = {'sections': [
        {'title': 'Jogo', 'items': ['REI DA PRAIA — futebol de praia arcade 3D', 'Design, código, animações e pipeline de assets gerados com Claude Code']},
        {'title': 'Personagens, cenário e interface', 'items': ['Kenney (kenney.nl) — Animated Characters, Mini Characters, City Kit, Nature Kit, Watercraft Kit, Furniture Kit, Particle Pack, Smoke Particles, Input Prompts, Impact & Interface Sounds — CC0']},
        {'title': 'Animações', 'items': ['Mixamo (Adobe) — goleiro (mergulhos, encaixe, saída no alto, reposição, chutão), cabeceio, bicicleta, carrinho, queda, pênalti, lateral, corrida lateral e de costas, freestyle',
                                          'Quaternius — Universal Animation Library (CC0): corrida, trote, sprint, caminhada, parado, dança, conversa, queda',
                                          'CMU Graphics Lab Motion Capture Database — mocap.cs.cmu.edu (financiado pela NSF EIA-0196217): chutes de futebol, estrela, polichinelo, aceno, alongamento, arremesso',
                                          'Retarget e clipes autorais (bicicleta, tesoura, peixinho, goleiro, árbitro) feitos em Blender por script']},
        {'title': 'Texturas e céus', 'items': ['ambientCG — Ground080, Ground093C — CC0', 'Poly Haven — Kloofendal 48d Partly Cloudy, Qwantani Sunset, Qwantani Night (Greg Zaal, Jarod Guest) — CC0']},
        {'title': 'Música', 'items': ['"Mad Bossa" — spring-spring', '"Funky House" — Of Far Different Nature', '"Crystal Beach" — iamoneabe', '"Fever Stadium" — mintodog', '(todas CC0 via OpenGameArt)']},
        {'title': 'Sons', 'items': ['Torcida — starninjas, nocturnalvanguard, expl0it3r', 'Ondas — qubodup / jasinski', 'Gaivotas — rango-mango', 'Areia — peludo', '(todos CC0 via OpenGameArt)', 'Apitos sintetizados para o jogo']},
        {'title': 'Fontes', 'items': ['Bungee — David Jonathan Ross (OFL)', 'Rubik — Hubert & Fischer (OFL)']},
        {'title': 'Tecnologia', 'items': ['three.js', 'Howler.js', 'Vite + TypeScript', 'Blender (bpy) para o pipeline de assets']},
        {'title': 'Seleções', 'items': ['Todos os jogadores, apelidos, brasões e patrocinadores são fictícios.']},
    ]}
    json.dump(credits, open(os.path.join(ROOT, 'src', 'data', 'credits.json'), 'w'), ensure_ascii=False, indent=1)
    print('ASSETS.md:', len(rows), 'arquivos;', 'sem classificação:', len(missing))


if __name__ == '__main__':
    main()
