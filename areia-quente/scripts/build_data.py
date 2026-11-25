"""Gera src/data/teams.json: 8 seleções com jogadores fictícios, uniformes e estilo de IA.
Os nomes são inventados para o AREIA QUENTE (nenhum jogador real)."""
import json, os, random

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))

# kit: shirt, shirt2 (detalhe), pattern, shorts, trim, number color
TEAMS = [
    dict(id='BRA', name='Brasil', nick='Canarinhos da Areia', flag='BR', style='firula', colors=['#FFD21F', '#0B9B4A'],
         stats=dict(ataque=5, defesa=3, tecnica=5, velocidade=4),
         home=dict(shirt='#FFD21F', shirt2='#0B9B4A', pattern='sash', shorts='#1D4FC4', trim='#0B9B4A', num='#0B6B35'),
         away=dict(shirt='#1D4FC4', shirt2='#FFD21F', pattern='chevron', shorts='#FFFFFF', trim='#FFD21F', num='#FFFFFF'),
         gk=dict(shirt='#FF6A1A', shirt2='#202020', pattern='shoulders', shorts='#202020', trim='#202020', num='#202020'),
         players=['Tatuí', 'Marolinha', 'Caju', 'Zé Coqueiro', 'Pipoca', 'Tubarão', 'Biscoito', 'Raio Laser', 'Dendê', 'Guaraná']),
    dict(id='ARG', name='Argentina', nick='Albicelestes del Sol', flag='AR', style='raça', colors=['#7CC6F2', '#FFFFFF'],
         stats=dict(ataque=4, defesa=4, tecnica=4, velocidade=4),
         home=dict(shirt='#FFFFFF', shirt2='#7CC6F2', pattern='stripes', shorts='#1B1B2A', trim='#1B1B2A', num='#1B1B2A'),
         away=dict(shirt='#2C2F6B', shirt2='#7CC6F2', pattern='hoop', shorts='#2C2F6B', trim='#7CC6F2', num='#FFFFFF'),
         gk=dict(shirt='#7DE34B', shirt2='#1B1B2A', pattern='shoulders', shorts='#1B1B2A', trim='#1B1B2A', num='#1B1B2A'),
         players=['Chiche Ferreyra', 'Tano Lunardi', 'Pampa Ríos', 'Mono Quiroga', 'Gringo Sosa', 'Lalo Benítez', 'Toto Ibarra', 'Facha Correa', 'Pocho Medina', 'Nacho Arrieta']),
    dict(id='POR', name='Portugal', nick='Navegadores', flag='PT', style='posse', colors=['#C8102E', '#046A38'],
         stats=dict(ataque=4, defesa=4, tecnica=4, velocidade=3),
         home=dict(shirt='#C8102E', shirt2='#046A38', pattern='sleeves', shorts='#046A38', trim='#FFD100', num='#FFD100'),
         away=dict(shirt='#F4F1E6', shirt2='#C8102E', pattern='sash', shorts='#F4F1E6', trim='#C8102E', num='#C8102E'),
         gk=dict(shirt='#3B3B3B', shirt2='#FFD100', pattern='shoulders', shorts='#3B3B3B', trim='#FFD100', num='#FFD100'),
         players=['Zeca Amaral', 'Tiago Brandão', 'Nuno Seixas', 'Rui Faneca', 'Duarte Pinho', 'Vasco Lemos', 'Gil Peixoto', 'Bruno Areal', 'Hugo Marés', 'Lino Abreu']),
    dict(id='ESP', name='Espanha', nick='La Furia Playera', flag='ES', style='toque', colors=['#C60B1E', '#FFC400'],
         stats=dict(ataque=4, defesa=3, tecnica=5, velocidade=3),
         home=dict(shirt='#C60B1E', shirt2='#FFC400', pattern='side', shorts='#14285E', trim='#FFC400', num='#FFC400'),
         away=dict(shirt='#FFF3D6', shirt2='#C60B1E', pattern='hoop', shorts='#C60B1E', trim='#C60B1E', num='#C60B1E'),
         gk=dict(shirt='#1FB6A6', shirt2='#0B3B37', pattern='shoulders', shorts='#0B3B37', trim='#0B3B37', num='#0B3B37'),
         players=['Quique Morales', 'Paco Ledesma', 'Íker Salvatierra', 'Rafa Cuenca', 'Toni Barral', 'Chema Ojeda', 'Dani Montoro', 'Juanma Llorente', 'Pau Ferrán', 'Nando Gil']),
    dict(id='ITA', name='Itália', nick='Gli Azzurri di Sabbia', flag='IT', style='ferrolho', colors=['#1C64C8', '#FFFFFF'],
         stats=dict(ataque=3, defesa=5, tecnica=4, velocidade=3),
         home=dict(shirt='#1C64C8', shirt2='#FFFFFF', pattern='shoulders', shorts='#FFFFFF', trim='#FFFFFF', num='#FFFFFF'),
         away=dict(shirt='#FFFFFF', shirt2='#1C64C8', pattern='chevron', shorts='#1C64C8', trim='#1C64C8', num='#1C64C8'),
         gk=dict(shirt='#2F2F2F', shirt2='#9ADB2E', pattern='shoulders', shorts='#2F2F2F', trim='#9ADB2E', num='#9ADB2E'),
         players=['Gigi Fontana', 'Totò Mancuso', 'Nico Barbagallo', 'Pippo Rinaldi', 'Ciro Esposito', 'Lele Martinelli', 'Sandro Vitale', 'Michi Ferraro', 'Beppe Lazzari', 'Dodo Caruso']),
    dict(id='FRA', name='França', nick='Les Bleus du Sable', flag='FR', style='velocidade', colors=['#1F2A5C', '#E3263B'],
         stats=dict(ataque=4, defesa=4, tecnica=3, velocidade=5),
         home=dict(shirt='#1F2A5C', shirt2='#E3263B', pattern='hoop', shorts='#FFFFFF', trim='#E3263B', num='#FFFFFF'),
         away=dict(shirt='#FFFFFF', shirt2='#1F2A5C', pattern='side', shorts='#1F2A5C', trim='#E3263B', num='#1F2A5C'),
         gk=dict(shirt='#F6C531', shirt2='#1F2A5C', pattern='shoulders', shorts='#1F2A5C', trim='#1F2A5C', num='#1F2A5C'),
         players=['Bastien Roulet', 'Yannick Morel', 'Loïc Dufresne', 'Théo Garnier', 'Kévin Lamarre', 'Mathis Perrot', 'Rémi Chauvet', 'Sacha Belmont', 'Enzo Delattre', 'Jules Ferrand']),
    dict(id='JPN', name='Japão', nick='Samurais da Praia', flag='JP', style='coletivo', colors=['#0E2F8A', '#E60026'],
         stats=dict(ataque=3, defesa=4, tecnica=4, velocidade=5),
         home=dict(shirt='#0E2F8A', shirt2='#E60026', pattern='chevron', shorts='#0E2F8A', trim='#FFFFFF', num='#FFFFFF'),
         away=dict(shirt='#FFFFFF', shirt2='#E60026', pattern='sun', shorts='#FFFFFF', trim='#0E2F8A', num='#0E2F8A'),
         gk=dict(shirt='#FF8A00', shirt2='#0E2F8A', pattern='shoulders', shorts='#0E2F8A', trim='#0E2F8A', num='#0E2F8A'),
         players=['Kaito Hamada', 'Ren Oshiro', 'Sora Ikeda', 'Daichi Mori', 'Haruto Kanda', 'Yuma Takeshi', 'Riku Nishi', 'Shun Arakawa', 'Kenta Umino', 'Taiga Sasaki']),
    dict(id='SEN', name='Senegal', nick='Leões da Teranga', flag='SN', style='força', colors=['#00853F', '#FDEF42'],
         stats=dict(ataque=5, defesa=3, tecnica=3, velocidade=5),
         home=dict(shirt='#FFFFFF', shirt2='#00853F', pattern='tricolor', shorts='#FFFFFF', trim='#00853F', num='#00853F'),
         away=dict(shirt='#00853F', shirt2='#FDEF42', pattern='chevron', shorts='#00853F', trim='#E31B23', num='#FDEF42'),
         gk=dict(shirt='#E31B23', shirt2='#1A1A1A', pattern='shoulders', shorts='#1A1A1A', trim='#FDEF42', num='#FDEF42'),
         players=['Mamadou Ndour', 'Ousmane Faye', 'Cheikh Diallo', 'Ibou Sarr', 'Pape Gueye', 'Abdou Seck', 'Lamine Sow', 'Modou Cissé', 'Babacar Niang', 'Saliou Mbaye']),
]

HEADS = ['skaterMaleA', 'criminalMaleA', 'skaterMaleA', 'survivorMaleB']
# tons de pele (multiplicadores RGB aplicados ao tom original do Kenney) e cores de cabelo
SKIN = {'BRA': [0, 1, 2, 3, 4], 'ARG': [0, 1, 1, 2], 'POR': [0, 1, 2], 'ESP': [0, 1, 2], 'ITA': [0, 1, 1],
        'FRA': [0, 1, 3, 4, 2], 'JPN': [0, 1], 'SEN': [4, 5, 5, 4, 3]}
HAIR = ['#2A1B12', '#140D09', '#5A3A1E', '#8A5A2B', '#B8925A', '#151515', '#8E3A22']
HAIRS = {'BRA': [0, 1, 2, 4, 5], 'ARG': [0, 1, 2, 3], 'POR': [0, 1, 2], 'ESP': [0, 1, 2, 3], 'ITA': [0, 1, 2],
         'FRA': [0, 2, 3, 4, 5], 'JPN': [1, 5], 'SEN': [1, 5]}
POS = ['GOL', 'FIXO', 'ALA', 'ALA', 'PIVÔ', 'GOL', 'FIXO', 'ALA', 'ALA', 'PIVÔ']


def short(n):
    parts = n.split()
    s = parts[-1] if len(parts) > 1 and len(parts[0]) <= 4 and n not in ('Zé Coqueiro', 'Raio Laser') else parts[0]
    if n in ('Zé Coqueiro', 'Raio Laser'): s = n
    return s.upper()


def main():
    rnd = random.Random(2026)
    out = []
    for t in TEAMS:
        players = []
        nums = [1, 4, 7, 10, 9, 12, 5, 8, 11, 6]
        for i, name in enumerate(t['players']):
            base = t['stats']
            jit = lambda v: max(1, min(5, v + rnd.choice([-1, 0, 0, 1])))
            players.append(dict(
                id=f"{t['id']}{i}", name=name, short=short(name), number=nums[i], pos=POS[i],
                stats=dict(chute=jit(base['ataque']), passe=jit(base['tecnica']), tecnica=jit(base['tecnica']),
                           velocidade=jit(base['velocidade']), defesa=jit(base['defesa']), folego=jit(4)),
                head=HEADS[rnd.randrange(len(HEADS))], skin=rnd.choice(SKIN[t['id']]), hair=rnd.choice(HAIRS[t['id']]),
                ankle=rnd.random() < 0.6))
        players[4]['stats']['chute'] = 5  # o pivô é sempre o artilheiro
        d = {k: v for k, v in t.items() if k != 'players'}
        d['players'] = players
        out.append(d)
    os.makedirs(os.path.join(ROOT, 'src', 'data'), exist_ok=True)
    json.dump({'teams': out, 'hairColors': HAIR}, open(os.path.join(ROOT, 'src', 'data', 'teams.json'), 'w'), ensure_ascii=False, indent=1)
    print('teams.json', len(out))


if __name__ == '__main__':
    main()
