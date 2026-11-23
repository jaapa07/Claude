#!/usr/bin/env python3
"""Acrescenta os dados da Região 5 — Catedral do Vazio — aos JSON do jogo (idempotente: reescreve só as chaves da região).
Espécies, habilidades, inimigos, chefes, itens, missões, diálogos, contratos, lojas, memórias/epílogo, regiões e música.
Uso: python3 tools/dados_regiao5.py"""
import json, os

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "data")


def load(n):
    with open(os.path.join(ROOT, n), encoding="utf-8") as f:
        return json.load(f)


def save(n, d, nl):
    with open(os.path.join(ROOT, n), "w", encoding="utf-8") as f:
        f.write(json.dumps(d, ensure_ascii=False, indent=1) + ("\n" if nl else ""))


# ================================================================== ESPÉCIES
SPECIES = {
    "cristil": {"nome": "Cristil", "afinidade": "luz", "raridade": "comum", "papel": "Suporte", "hp_base": 48, "hp_cresc": 4.8, "atk_base": 8, "atk_cresc": 1.1,
                "skill": "barreira_prisma", "habilidades": [{"id": "barreira_prisma", "nivel": 1}, {"id": "centelha_prisma", "nivel": 24}, {"id": "lampejo", "nivel": 25}],
                "passiva": "Faceta dura: recebe 10% menos dano.", "reducao_dano": 0.1,
                "acao_ambiental": "Redireciona feixes em prismas", "acao_id": "prisma", "evolucao": {"para": "prismal", "nivel": 26},
                "habitat": "Jardim Invertido (terraço das flores pendentes)", "sprite": "cristil", "frame": [20, 20],
                "basic": {"tipo": "ranged", "alcance": 90, "recarga": 1.0}, "regiao": 5, "status": "jogavel", "pequeno": True,
                "descricao": "Um cristalzinho azul, de coração marfim, com três pernas de vidro. Quando canta, a luz entorta para onde ele quer."},
    "prismal": {"nome": "Prismal", "afinidade": "luz", "raridade": "comum", "papel": "Suporte", "hp_base": 74, "hp_cresc": 6, "atk_base": 11, "atk_cresc": 1.4,
                "skill": "barreira_prisma", "habilidades": [{"id": "barreira_prisma", "nivel": 1}, {"id": "centelha_prisma", "nivel": 24}, {"id": "lampejo", "nivel": 25},
                                                             {"id": "refracao", "nivel": 26}, {"id": "aurora_prisma", "nivel": 28}],
                "passiva": "Faceta dura: recebe 15% menos dano.", "reducao_dano": 0.15,
                "acao_ambiental": "Redireciona feixes em prismas", "acao_id": "prisma", "evolucao": None, "habitat": "Evolução de Cristil",
                "sprite": "prismal", "frame": [28, 28], "basic": {"tipo": "ranged", "alcance": 100, "recarga": 0.9}, "regiao": 5, "status": "jogavel",
                "descricao": "Coroa de prismas sobre um corpo de marfim. Divide um raio em sete e devolve cada um no lugar certo."},
    "gravito": {"nome": "Gravito", "afinidade": "pedra", "raridade": "incomum", "papel": "Controle", "hp_base": 58, "hp_cresc": 5.5, "atk_base": 8, "atk_cresc": 1.1,
                "skill": "pulso_gravitacional", "habilidades": [{"id": "pulso_gravitacional", "nivel": 1}, {"id": "orbita_pedra", "nivel": 24}, {"id": "estilhaco", "nivel": 25}],
                "passiva": "Peso de pedra: recebe 15% menos dano.", "reducao_dano": 0.15,
                "acao_ambiental": "Mantém âncoras gravitacionais", "acao_id": "ancora", "evolucao": {"para": "monolito", "nivel": 26},
                "habitat": "Escadaria dos Fragmentos (patamar da âncora)", "sprite": "gravito", "frame": [20, 20],
                "basic": {"tipo": "melee", "alcance": 18, "recarga": 1.1}, "regiao": 5, "status": "jogavel", "pequeno": True,
                "descricao": "Uma pedrinha redonda com um anel de cascalho girando em volta. Tudo o que é leve acaba orbitando ela."},
    "monolito": {"nome": "Monolito", "afinidade": "pedra", "raridade": "incomum", "papel": "Controle", "hp_base": 92, "hp_cresc": 7.5, "atk_base": 10, "atk_cresc": 1.3,
                 "skill": "pulso_gravitacional", "habilidades": [{"id": "pulso_gravitacional", "nivel": 1}, {"id": "orbita_pedra", "nivel": 24}, {"id": "estilhaco", "nivel": 25},
                                                                  {"id": "colapso", "nivel": 26}, {"id": "monolito_vivo", "nivel": 28}],
                 "passiva": "Peso de pedra: recebe 20% menos dano.", "reducao_dano": 0.2,
                 "acao_ambiental": "Mantém âncoras gravitacionais", "acao_id": "ancora", "evolucao": None, "habitat": "Evolução de Gravito",
                 "sprite": "monolito", "frame": [28, 28], "basic": {"tipo": "melee", "alcance": 22, "recarga": 1.0}, "regiao": 5, "status": "jogavel",
                 "descricao": "Um obelisco de marfim que anda sobre anéis de pedra. Onde ele finca o pé, nada mais cai."},
    "velunio": {"nome": "Velúnio", "afinidade": "sombra", "raridade": "rara", "papel": "Distância", "hp_base": 42, "hp_cresc": 4.2, "atk_base": 9, "atk_cresc": 1.3,
                "skill": "dardo_veu", "habilidades": [{"id": "dardo_veu", "nivel": 1}, {"id": "asa_veu", "nivel": 25}, {"id": "nevoa_astral", "nivel": 26}],
                "passiva": "Véu: 15% de chance de evitar golpes.", "esquiva": 0.15,
                "acao_ambiental": "Materializa marcas espirituais", "acao_id": "marca", "evolucao": {"para": "astraveu", "nivel": 27},
                "habitat": "Jardim Invertido (anel de marcas revelado pelo Olhar Velado)", "sprite": "velunio", "frame": [20, 20],
                "basic": {"tipo": "ranged", "alcance": 100, "recarga": 1.0}, "regiao": 5, "status": "jogavel", "pequeno": True,
                "descricao": "Uma mariposa de véu azul-escuro com olhos de estrela. Onde ela pousa, as marcas dos espíritos ganham corpo."},
    "astraveu": {"nome": "Astravéu", "afinidade": "sombra", "raridade": "rara", "papel": "Distância", "hp_base": 66, "hp_cresc": 5.6, "atk_base": 13, "atk_cresc": 1.6,
                 "skill": "dardo_veu", "habilidades": [{"id": "dardo_veu", "nivel": 1}, {"id": "asa_veu", "nivel": 25}, {"id": "nevoa_astral", "nivel": 26},
                                                       {"id": "chuva_astral", "nivel": 27}, {"id": "lanca_astral", "nivel": 29}],
                 "passiva": "Véu estrelado: 20% de chance de evitar golpes.", "esquiva": 0.2,
                 "acao_ambiental": "Materializa marcas espirituais", "acao_id": "marca", "evolucao": None, "habitat": "Evolução de Velúnio",
                 "sprite": "astraveu", "frame": [28, 28], "basic": {"tipo": "ranged", "alcance": 110, "recarga": 0.9}, "regiao": 5, "status": "jogavel",
                 "descricao": "As asas viraram um céu noturno inteiro. Seus dardos atravessam o primeiro alvo e procuram o próximo."},
}

SKILLS = {
    "barreira_prisma": {"nome": "Barreira de Prisma", "descricao": "Barreira breve de cristal: o herói e a criatura recebem 30% menos dano por 3,5 s.",
                        "exec": "escudo", "recarga": 12.0, "dano": 0, "duracao": 3.5, "reducao": 0.3, "fx": "parry", "luz": True, "som": "guard"},
    "centelha_prisma": {"nome": "Centelha de Prisma", "descricao": "Leque de luz partida à frente.", "exec": "cone", "recarga": 5.0, "alcance": 56, "arco": 34,
                        "dano": 12, "fx": "sparkle", "som": "skill", "knock": 40},
    "refracao": {"nome": "Refração", "descricao": "Raio de luz que se divide e salta entre até 4 inimigos.", "exec": "cadeia", "recarga": 7.0, "alcance": 120,
                 "raio": 70, "dano": 13, "saltos": 4, "fx": "sparkle", "luz": True, "som": "skill"},
    "aurora_prisma": {"nome": "Aurora de Prisma", "descricao": "Domo de prismas: 40% menos dano por 5 s e luz ao redor.", "exec": "escudo", "recarga": 18.0,
                      "dano": 0, "duracao": 5.0, "reducao": 0.4, "fx": "bond", "luz": True, "som": "guard"},
    "pulso_gravitacional": {"nome": "Pulso Gravitacional", "descricao": "Pulso que puxa inimigos pequenos para perto da criatura por 2,5 s.",
                            "exec": "ima", "recarga": 9.0, "raio": 72, "dano": 8, "duracao": 2.5, "som": "skill"},
    "estilhaco": {"nome": "Estilhaço", "descricao": "Pedras orbitais explodem em volta: interrompe e atordoa por 0,8 s.", "exec": "pulso", "recarga": 8.0,
                  "raio": 52, "dano": 11, "fx": "shards", "atordoa": 0.8, "som": "thud"},
    "colapso": {"nome": "Colapso", "descricao": "Gravidade densa: puxa inimigos pequenos de longe por 3,5 s e os fere.", "exec": "ima", "recarga": 11.0,
                "raio": 100, "dano": 14, "duracao": 3.5, "som": "skill"},
    "monolito_vivo": {"nome": "Monólito Vivo", "descricao": "Vira pedra viva: o herói e a criatura recebem 45% menos dano por 5 s.", "exec": "escudo",
                      "recarga": 20.0, "dano": 0, "duracao": 5.0, "reducao": 0.45, "fx": "shards", "som": "guard"},
    "dardo_veu": {"nome": "Dardo de Véu", "descricao": "Dardo de sombra em linha que atravessa o primeiro inimigo e fere o seguinte.", "exec": "perfura",
                  "recarga": 5.0, "alcance": 120, "dano": 12, "atravessa": 1, "fx": "vortex", "som": "dodge"},
    "nevoa_astral": {"nome": "Névoa Astral", "descricao": "Véu de estrelas por 5 s: inimigos dentro erram metade dos ataques.", "exec": "nuvem",
                     "recarga": 10.0, "alcance": 70, "raio": 46, "dano": 6, "duracao": 5.0, "som": "dodge"},
    "chuva_astral": {"nome": "Chuva Astral", "descricao": "Estrelas que saltam entre até 4 inimigos.", "exec": "cadeia", "recarga": 8.0, "alcance": 120,
                     "raio": 72, "dano": 15, "saltos": 4, "fx": "vortex", "som": "dodge"},
    "lanca_astral": {"nome": "Lança Astral", "descricao": "Lança de céu noturno que atravessa até três inimigos em linha.", "exec": "perfura", "recarga": 7.0,
                     "alcance": 150, "dano": 20, "atravessa": 2, "fx": "vortex", "som": "dodge"},
    "orbita_pedra": {"nome": "Órbita de Pedra", "descricao": "O anel de cascalho gira para a frente e acerta tudo em leque.", "exec": "cone", "recarga": 5.0,
                     "alcance": 44, "arco": 60, "dano": 12, "fx": "shards", "som": "thud", "knock": 70},
    "asa_veu": {"nome": "Asa de Véu", "descricao": "Golpe de asa em leque que deixa um rastro de estrelas.", "exec": "cone", "recarga": 5.0, "alcance": 46,
                "arco": 55, "dano": 12, "fx": "slash", "som": "swing", "knock": 50},
    "harmonia": {"nome": "Harmonia dos Ecos", "descricao": "Os cinco Ecos em uníssono: cura 12% da vida do herói e da equipe, revela espíritos e abre os selos da Harmonia (desafios opcionais).",
                 "recarga": 14.0, "custo": 20, "raio": 96, "duracao": 6.0, "cura": 0.12, "som": "heal"},
}

ENEMIES = {
    "escriba": {"nome": "Escriba do Vazio", "hp": 150, "dano": 22, "vel": 46, "xp": 46, "frag": [12, 20], "sprite": "escriba", "frame": [24, 32],
                "ataque": "selo", "raio": 8, "percepcao": 140, "relevante": True, "pequeno": False, "capturavel": False, "nivel": 25,
                "drops": {"fragmento_prisma": [0.35, 1]}},
    "sentinela_prisma": {"nome": "Sentinela Prismática", "hp": 230, "dano": 26, "vel": 22, "xp": 52, "frag": [14, 22], "sprite": "sentinela_prisma",
                         "frame": [24, 32], "ataque": "prisma", "raio": 10, "percepcao": 150, "relevante": True, "pequeno": False, "capturavel": False,
                         "nivel": 26, "guarda_frontal": 0.3, "drops": {"fragmento_prisma": [0.5, 1]}},
    "fragmento": {"nome": "Fragmento Errante", "hp": 120, "dano": 20, "vel": 58, "xp": 40, "frag": [10, 18], "sprite": "fragmento", "frame": [20, 20],
                  "ataque": "fragmento", "raio": 8, "percepcao": 130, "relevante": True, "pequeno": True, "capturavel": False, "nivel": 25,
                  "drops": {"fragmento_prisma": [0.3, 1]}},
    "arauto": {"nome": "Arauto Partido", "hp": 980, "dano": 22, "vel": 54, "xp": 0, "frag": [0, 0], "sprite": "arauto_partido", "frame": [48, 48],
               "ataque": "arauto", "raio": 14, "percepcao": 600, "nivel": 27},
    "rei": {"nome": "Rei dos Ecos", "hp": 4000, "dano": 26, "vel": 50, "xp": 0, "frag": [0, 0], "sprite": "rei", "frame": [72, 72],
            "ataque": "rei", "raio": 18, "percepcao": 800, "nivel": 30},
    "foco_rei": {"nome": "Foco do Rei", "hp": 190, "dano": 0, "vel": 0, "xp": 0, "frag": [0, 0], "sprite": "rei_foco", "frame": [24, 32],
                 "ataque": "nenhum", "raio": 10, "percepcao": 0, "pequeno": False, "capturavel": False, "nivel": 30},
}

BOSSES = {
    "arauto": {"nome": "Arauto Partido", "hp": 980, "fases": [1.0, 0.5], "recompensa": {"xp": 600, "frag": 200, "itens": {"fragmento_prisma": 3, "essencia_roxa": 1}},
               "flag_morte": "arauto_morto", "aviso_raiz": 1.0, "alcance_raiz": 130, "dano_raiz": 24, "brasa_s": 3.5, "veu_s": 1.6, "revelado_s": 2.6,
               "aviso_corte": 0.7, "raio_corte": 52, "dano_corte": 26, "dano_selo": 22, "armar_selo": 1.1, "recupera_s": 1.8, "mult_recupera": 1.4},
    "rei": {"nome": "Rei dos Ecos", "hp": 4000, "fases": [1.0, 0.65, 0.3], "hesita": 0.06,
            "recompensa": {"eco": "harmonia", "xp": 1400, "frag": 500}, "flag_morte": "rei_morto", "flag_regiao": "catedral_liberta",
            "aviso_raiz": 1.0, "alcance_raiz": 150, "dano_raiz": 26, "aviso_martelo": 1.0, "alcance_martelo": 170, "dano_martelo": 26,
            "aviso_orbes": 0.9, "dano_orbe": 20, "poca_s": 4.0, "aviso_estocada": 0.95, "vel_estocada": 330, "dano_estocada": 32, "exausto_s": 1.8,
            "recupera_s": 1.3, "intervalo_s": 1.4, "mult_exausto": 1.4, "mult_recupera": 1.2, "mult_protegido": 0.06, "mult_exposto": 1.4,
            "ataque_focos_s": 3.6, "exposto_s": 8.0, "aviso_ruina": 2.5, "respiro_s": 3.5, "cura_ione": 0.12, "dano_queda": 8},
}

ITEMS = {
    "eco_perdido": {"nome": "Eco Perdido", "tipo": "missao", "icone": 0, "folha": "icons_catedral",
                    "desc": "Uma voz presa num caco de cristal: o riso de uma criança, um barqueiro cantando. O noviço Caio quer devolvê-las."},
    "fragmento_prisma": {"nome": "Fragmento de Prisma", "tipo": "material", "preco": 50, "icone": 1, "folha": "icons_catedral",
                         "desc": "Lasca de marfim que ainda dobra a luz. Usada nas peças mais finas da forja."},
    "amuleto_convergencia": {"nome": "Amuleto da Convergência", "tipo": "amuleto", "hp": 40, "raridade": 3, "icone": 2, "folha": "icons_catedral",
                             "desc": "+40 de vida máxima. Técnica do Rito da Convergência: raiz, brasa, véu e sombra num só fio."},
    "coroa_harmonia": {"nome": "Coroa da Harmonia", "tipo": "amuleto", "hp": 60, "raridade": 3, "icone": 3, "folha": "icons_catedral",
                       "desc": "+60 de vida máxima. Prêmio das Provas da Harmonia, guardado no velho arquivo da Catedral."},
    "lente_estelar": {"nome": "Lente Estelar", "tipo": "amuleto", "hp": 25, "raridade": 2, "icone": 4, "folha": "icons_catedral",
                      "desc": "+25 de vida máxima. A cartógrafa Mira a lapidou com o desenho das estrelas invertidas."},
    "manto_aurora": {"nome": "Manto da Aurora", "tipo": "protecao", "reducao": 0.22, "raridade": 3, "icone": 5, "folha": "icons_catedral",
                     "desc": "Reduz 22% do dano recebido. Tecido marfim do acampamento, costurado por quem desistiu da Ordem."},
    "pagina_ione_7": {"nome": "Diário de Ione — Página da Catedral", "tipo": "historia", "icone": 6,
                      "desc": "\"O Arauto me deixou passar, partido ao meio pelo Eco que tentou carregar. Ivar está no trono. Ele me olha e não me reconhece — e eu fui aprendiz dele, antes de você ser o meu. Se eu não voltar, aprendiz: o nome dele é Ivar. Diga a ele.\""},
    "lembranca_ivar": {"nome": "Pena de Ivar", "tipo": "historia", "icone": 6, "folha": "icons_catedral",
                       "desc": "Uma pena de arquivista, de marfim, ainda morna. Ivar guardou o Eco para que nada se perdesse. No fim, a única coisa que ele precisava guardar era o próprio nome."},
}

QUESTS = {
    "principal5": {"nome": "O Coração do Vazio", "tipo": "principal", "ativa_se": "visitou_acampamento_aurora", "etapas": [
        {"texto": "Cruze o selo externo com o Passo Umbral até o Acampamento da Aurora.", "flag": "cruzou_selo_externo"},
        {"texto": "Fale com a Arquivista Sena, junto à fogueira do Acampamento.", "flag": "falou_sena"},
        {"texto": "Siga pela Escadaria dos Fragmentos (oeste) ou pelo Jardim Invertido (leste) até a Catedral do Vazio.", "flag": "visitou_catedral_a"},
        {"texto": "Atravesse a Nave dos Prismas e o andar das âncoras e derrote o Arauto Partido.", "flag": "arauto_morto"},
        {"texto": "Complete o Rito da Convergência, com os quatro Ecos.", "flag": "rito_convergencia_ok"},
        {"texto": "Quebre os quatro elos da Câmara do Eco e liberte a Mestra Ione.", "flag": "ione_livre"},
        {"texto": "Suba ao trono e devolva ao Rei dos Ecos o que é dele.", "flag": "rei_morto"},
        {"texto": "Veja o que mudou nas cinco comunidades.", "flag": "epilogo_visto"}]},
    "vozes": {"nome": "Vozes Perdidas", "tipo": "secundaria", "etapas": [
        {"texto": "Junte 3 Ecos Perdidos na Escadaria, no Jardim e na Catedral para o noviço Caio.", "item": "eco_perdido", "alvo": 3, "flag": "vozes_ok"},
        {"texto": "Leve os Ecos Perdidos a Caio, na enfermaria do Acampamento.", "flag": "vozes_entregue"}]},
    "estrelas": {"nome": "Estrelas Invertidas", "tipo": "secundaria", "etapas": [
        {"texto": "Observe as três estrelas invertidas (Escadaria, Jardim e o Coro da Catedral) para a cartógrafa Mira.", "flag": "estrelas_ok"},
        {"texto": "Conte a Mira o desenho das estrelas.", "flag": "estrelas_entregue"}]},
    "provas_harmonia": {"nome": "Provas da Harmonia", "tipo": "secundaria", "ativa_se": "harmonia_aberta", "etapas": [
        {"texto": "Vença a Prova da Floresta e das Minas no Salão da Harmonia.", "flag": "prova1_ok"},
        {"texto": "Vença a Prova do Pântano e da Fortaleza.", "flag": "prova2_ok"},
        {"texto": "Vença a Prova do Vazio e abra o arquivo.", "flag": "prova3_ok"}]},
}

CONTRACTS = {
    "caca_escribas": {"nome": "Silêncio no Jardim", "tipo": "caca", "aliados": [], "nivel": 25, "requer": ["visitou_jardim_invertido"],
                      "alvo": {"kind": "escriba", "qtd": 3},
                      "texto": "Os Escribas do Vazio ainda selam o Jardim Invertido para a Ordem. Vesna, agora do lado de cá, paga por cada pena quebrada.",
                      "objetivo": "Caçada: derrote 3 Escribas do Vazio.",
                      "recompensa": {"fragmentos": 320, "xp": 420, "itens": {"semente_vida": 1, "fragmento_prisma": 2}}},
    "ultimas_correntes": {"nome": "As Últimas Correntes", "tipo": "trio", "aliados": ["bruna", "ravi"], "nivel": 26, "requer": ["visitou_escadaria_fragmentos"],
                          "mapa": "escadaria_fragmentos",
                          "texto": "Domadores contratados pela Ordem levam feras acorrentadas pela Escadaria dos Fragmentos até a Catedral. Leve Bruna e Ravi e corte as últimas correntes.",
                          "objetivo": "Derrote os domadores da Escadaria (trio: Bruna e Ravi) e liberte as feras.",
                          "inimigos": [{"kind": "domador", "id": "uc_d1", "x": 12, "y": 22, "nivel": 26}, {"kind": "domadora", "id": "uc_d2", "x": 19, "y": 25, "nivel": 26},
                                       {"kind": "fera", "dono": "uc_d1", "species": "gravito", "level": 25, "x": 13, "y": 24},
                                       {"kind": "fera", "dono": "uc_d2", "species": "cristil", "level": 25, "x": 20, "y": 22}],
                          "recompensa": {"fragmentos": 380, "xp": 480, "itens": {"essencia_laranja": 1, "selo_refinado": 3}}},
}

STORY_MEM = {
    "arauto_morto": {"titulo": "Memória do Arauto Partido", "item": "pagina_ione_7", "linhas": [
        "Memória do Eco: o Arauto da Ordem do Vazio, de manto branco e olho fechado bordado, levava às vilas a palavra do Arquivista: \"guardem tudo, nada se perde\".",
        "Memória do Eco: um dia tentou carregar o Eco de um guardião inteiro dentro do livro. O livro rachou — e ele com o livro.",
        "Memória do Eco: anos depois, uma vinculadora de capa azul atravessou o andar das âncoras. O Arauto ergueu o livro... e abaixou. Deixou-a passar.",
        "Memória do Eco: \"Ele se chamava Ivar\", disse Ione ao Arauto. \"Lembra? Você lia os nomes dos guardiões para ele à noite.\" O Arauto chorou páginas.",
        "Das páginas que caem, uma não é dele: tem a letra da sua mestra."]},
    "rei_morto": {"titulo": "Memória de Ivar", "item": "lembranca_ivar", "linhas": [
        "Memória do Eco: Ivar era o primeiro Arquivista de Auralis. Escrevia o nome de cada criatura, de cada rio, de cada canção — para que nada se perdesse.",
        "Memória do Eco: quando o Eco começou a se espalhar demais, ele o recolheu inteiro para dentro da Catedral. E depois, para dentro de si.",
        "Memória do Eco: guardou tanto que não sobrou lugar para ele mesmo. Esqueceu o rosto, a casa, o nome. Virou o Rei dos Ecos.",
        "Memória do Eco: as correntes nunca foram por poder. Cada guardião acorrentado era uma memória emprestada — Ivar procurando, entre milhões de vozes, a própria.",
        "Memória do Eco: e foi você quem a devolveu. Uma palavra só: Ivar.",
        "No lugar do trono, uma pena de arquivista, de marfim, ainda morna. Ao lado dela, metade de uma coroa: o último artefato."]},
}

# quinto artefato (sistema de artefatos de scripts/historia.gd): a lembrança que faltava
COROA_LEMBRANCA = {"titulo": "Lembrança: a fenda", "linhas": [
    "Dia 4 da expedição. O Santuário da Seiva treme; as raízes se retorcem e uma corrente de metal escuro serpenteia pelo chão, procurando.",
    "Ione: Teodoro, leve os Corvelo! Joran, as lanternas! Aprendiz — fique atrás de mim.",
    "Você: Eu quero ajudar! Eu consigo!",
    "A corrente se ergue na sua direção. Ela não quer o seu corpo: quer as suas lembranças. Você sente o nome da sua mãe começar a escorregar.",
    "Ione se ajoelha na sua frente e faz o sinal: palma aberta, dois dedos dobrados. \"Estou aqui.\" A mão dela brilha azul na sua testa.",
    "Ione: Vou esconder tudo o que você é, para a corrente não achar. Vai doer esquecer. Mas você vai lembrar de novo, um pedaço de cada vez. Eu prometo.",
    "A fenda se abre ao norte. Ela segura a corrente com as duas mãos e te empurra para a luz.",
    "Você acorda na grama, perto de Lúmen, sem saber o próprio nome — só com uma carta no bolso e o sinal da mão gravado na memória do corpo.",
    "Agora você lembra. Ela não te deixou para trás. Ela te escondeu do mundo para poder te devolver a ele.",
]}

RESGATE = [
    "Os quatro elos se partem. O cristal racha de cima a baixo — e uma mulher de capa azul cai de joelhos no chão de runas.",
    "Você: Mestra! Eu... cheguei tarde?",
    "Ione: ...Aprendiz? Não. Chegou na hora. Teimoso como sempre. Eu ouvi seus passos em cada guardião: o Cervo, o Ferreiro, a Bruxa, Aldren...",
    "Ione segura o seu rosto com as duas mãos, como fazia depois do treino. Por um momento, ninguém diz nada.",
    "Ione: Eu entrei aqui para conversar com ele. O Eco me engoliu antes. Fiquei presa dentro das lembranças que ele roubou.",
    "Ione: Escute. O Rei dos Ecos é Ivar, o primeiro Arquivista. Eu fui aprendiz dele, muito antes de você ser o meu.",
    "Ione: Ele guardou o Eco inteiro dentro de si e esqueceu quem era. Bater nele não basta: a força só o cansa.",
    "Ione: Quando ele hesitar — e ele vai hesitar —, devolva a ele uma memória que seja dele. O nome dele. Eu fico do seu lado.",
    "Você: Eu também esqueci quem eu era, mestra. Só sobrou a sua carta.",
    "Ione: Eu sei. Depois eu te conto tudo, prometo. Agora, ele precisa de você mais do que eu.",
    "A Mestra Ione se levanta e aponta a escada para o trono. A porta, antes lacrada, está aberta.",
]

NOME_IVAR = [
    "O Rei dos Ecos flutua, imóvel. As correntes que saem do peito dele afrouxam uma a uma.",
    "Rei: ...Raiz. Brasa. Água. Sombra. Eu guardei tudo. Tudo! Por que não consigo lembrar quem eu sou?",
    "Ione: Porque você guardou tudo, menos você. Olhe para mim, mestre. Lembra da aprendiz que derrubava tinta nos seus livros?",
    "Você dá um passo à frente, como Ione ensinou no treino, com a mão erguida.",
    "Você: Eu sei como é acordar sem saber quem se é. Foram os vínculos que me trouxeram de volta.",
    "{EQUIPE}",
    "Você: O seu nome é Ivar.",
    "Rei: ...I...var.",
    "Rei: Ivar. Eu sou Ivar. Eu era o Arquivista. Eu escrevia os nomes... e esqueci o meu.",
    "Ivar: Ione. Pequena Ione. Você cresceu. E trouxe alguém que sabe devolver as coisas ao lugar.",
    "Ivar: Devolvam o Eco às terras. Eu não preciso mais guardá-lo. Eu lembrei.",
    "O Rei dos Ecos sorri. A coroa se desfaz em luz, depois as mãos, depois o rosto — em paz, como neve derretendo.",
]

EPILOGO = {
    "abertura": [
        "As correntes de metal-eco se soltam ao mesmo tempo, em todas as terras. Lá fora, uma por uma, as fissuras do céu se fecham.",
        "No seu bolso, os cinco artefatos dos guardiões brilham juntos. As cinco lembranças se encaixam — e o resto volta de uma vez.",
        "Você fazia parte da expedição. Quando a fenda se abriu no Santuário, a corrente da Ordem veio buscar a sua memória.",
        "Ione: Eu selei suas lembranças para que a corrente não as levasse. Você acordou perto de Lúmen só com a minha carta. Me perdoe, aprendiz.",
        "Você: Não tem o que perdoar. Você me protegeu. E eu achei o caminho de volta — como o Ivar.",
        "Ione: Acabou, aprendiz. O Eco voltou para onde sempre morou: nas criaturas, nos rios, nas pessoas.",
        "Ione: Venha. Quero ver com você o que mudou.",
    ],
    "paradas": [
        {"mapa": "vila_lumen", "spawn": "from_santuario", "titulo": "Vila Lúmen", "linhas": [
            "Na Vila Lúmen, as flores-lanterna ficaram acesas de dia. A festa da colheita, cancelada havia três luas, voltou.",
            "Maru pendurou a carta de Ione na porta da casa, para todos lerem. Pipo ensina os Lumipins a dançar em roda.",
            "Teo, um noviço da Ordem que fugiu da Catedral, voltou para casa — e os vizinhos lhe deram um prato de sopa."]},
        {"mapa": "forja_cobre", "spawn": "default", "pos": [24, 17], "titulo": "Forja de Cobre", "linhas": [
            "Na Forja de Cobre, os ferreiros derreteram as últimas correntes de metal-eco e fizeram sinos com elas.",
            "Doran pendurou o maior sino na praça. Quando toca, os Faisquitos acendem as fornalhas sozinhos."]},
        {"mapa": "porto_lanternas", "spawn": "default", "pos": [24, 17], "titulo": "Porto das Lanternas", "linhas": [
            "No Porto das Lanternas, a água refletiu as estrelas certas pela primeira vez em anos.",
            "Bruna e Ravi ajudam Arão a acender lanternas novas no cais: uma para cada guardião libertado.",
            "Bruna: Pendurei o escudo na parede. Pela primeira vez, ele fica lá por vontade minha.",
            "Ravi: E eu aposentei os discos. Agora só jogo pedrinha no lago, com a Faísca."]},
        {"mapa": "refugio_muralha", "spawn": "default", "pos": [24, 19], "titulo": "Refúgio da Muralha", "linhas": [
            "No Refúgio da Muralha, a Capitã Ilse abriu o portão norte para sempre. A guarnição agora escolta viajantes até a Catedral.",
            "Tália plantou flores marfim do Jardim Invertido no canteiro da praça. Elas crescem para cima, como deve ser.",
            {"if": "vesna_ok", "t": "Vesna: A Ilse me deu um posto na guarnição. Minhas feras dormem em paz. Acho que eu também."},
            {"unless": "vesna_ok", "t": "Dizem que Vesna, a caçadora, soltou as últimas feras que guardava e foi embora sem correntes."}]},
        {"mapa": "acampamento_aurora", "spawn": "from_epilogo", "titulo": "Acampamento da Aurora", "linhas": [
            "No Acampamento da Aurora, a fogueira continua acesa — mas agora é festa, não vigília.",
            "A Arquivista Sena abriu o velho arquivo da Catedral: os nomes que Ivar escreveu serão lidos de novo, em voz alta, um por noite."]},
    ],
    "fecho": [
        "Ione: Ivar me ensinou a escrever nomes. Eu te ensinei a ouvi-los. Acho que nós dois aprendemos alguma coisa com você.",
        "Ione: Os cinco Ecos agora cantam juntos em você: é a HARMONIA DOS ECOS. Ela abre o Salão da Harmonia, ao norte do Acampamento, e completa as notas do bestiário.",
        "Ione: Nada do que você fez depende dela. É só um presente — para quem ainda quer explorar.",
        "Eco obtido: HARMONIA DOS ECOS (tecla de Eco). Cura um pouco a equipe, revela espíritos e abre os selos da Harmonia.",
    ],
    "mudancas": {
        "vila_lumen": {"entidades": [
            {"type": "adorno", "id": "fim_vila_l1", "frame": "lanterna_festa", "x": 16, "y": 12},
            {"type": "adorno", "id": "fim_vila_l2", "frame": "lanterna_festa", "x": 27, "y": 12},
            {"type": "adorno", "id": "fim_vila_f1", "frame": "fita_festa", "x": 20, "y": 16},
            {"type": "adorno", "id": "fim_vila_f2", "frame": "flores_festa", "x": 24, "y": 19},
            {"type": "npc", "id": "teo_vila", "sprite": "npc_aurora3", "dialog": "teo_vila", "x": 23, "y": 17, "nome": "Teo"}],
            "dialogos": {"anciao": "anciao_fim", "pipo": "pipo_fim"}},
        "forja_cobre": {"entidades": [
            {"type": "adorno", "id": "fim_forja_l1", "frame": "lanterna_festa", "x": 19, "y": 13},
            {"type": "adorno", "id": "fim_forja_l2", "frame": "lanterna_festa", "x": 29, "y": 13},
            {"type": "adorno", "id": "fim_forja_e1", "frame": "estandarte", "x": 22, "y": 19},
            {"type": "adorno", "id": "fim_forja_f1", "frame": "fita_festa", "x": 26, "y": 11}],
            "dialogos": {"doran_forja": "doran_fim", "nino_praca": "nino_fim"}},
        "porto_lanternas": {"entidades": [
            {"type": "adorno", "id": "fim_porto_l1", "frame": "lanterna_festa", "x": 18, "y": 14},
            {"type": "adorno", "id": "fim_porto_l2", "frame": "lanterna_festa", "x": 29, "y": 14},
            {"type": "adorno", "id": "fim_porto_f1", "frame": "fita_festa", "x": 23, "y": 20},
            {"type": "npc", "id": "bruna_porto", "sprite": "aliada_bruna", "human": True, "dialog": "bruna_fim", "x": 25, "y": 18, "nome": "Bruna"},
            {"type": "npc", "id": "ravi_porto", "sprite": "aliado_ravi", "human": True, "dialog": "ravi_fim", "x": 20, "y": 18, "nome": "Ravi"}],
            "dialogos": {"arao_cais": "arao_fim", "nina": "nina_fim"}},
        "refugio_muralha": {"entidades": [
            {"type": "adorno", "id": "fim_ref_l1", "frame": "lanterna_festa", "x": 20, "y": 12},
            {"type": "adorno", "id": "fim_ref_l2", "frame": "lanterna_festa", "x": 30, "y": 12},
            {"type": "adorno", "id": "fim_ref_e1", "frame": "estandarte", "x": 24, "y": 23},
            {"type": "adorno", "id": "fim_ref_f1", "frame": "flores_festa", "x": 12, "y": 24},
            {"type": "npc", "id": "vesna_refugio", "sprite": "vesna", "human": True, "dialog": "vesna_fim", "x": 27, "y": 14, "nome": "Vesna", "if_flag": "vesna_ok"}],
            "dialogos": {"ilse_portao": "ilse_fim", "talia": "talia_fim"}},
    },
    "creditos": [
        {"titulo": "Ecos da Ruína", "linhas": ["Um RPG de ação e captura de criaturas em Auralis.", "Feito em Godot 4.3 (GDScript)."]},
        {"titulo": "Arte", "linhas": ["Pixel art autoral, desenhada à mão pixel a pixel em arquivos .pxl", "(tiles, criaturas, chefes, moradores e efeitos)."]},
        {"titulo": "Música e sons", "linhas": ["Trilhas e efeitos sintetizados nota a nota (tools/gen_audio.py):", "Floresta, Minas, Pântano, Fortaleza, Catedral, Aurora e o Rei dos Ecos."]},
        {"titulo": "Elenco", "linhas": ["Mestra Ione, a vinculadora de capa azul", "Ivar, o primeiro Arquivista (o Rei dos Ecos)", "Anciã Maru e Pipo, da Vila Lúmen",
                                         "Doran, Ilda e Nino, da Forja de Cobre", "Arão, Iara e Cora, do Porto das Lanternas", "Capitã Ilse, Tália e Lume, do Refúgio da Muralha",
                                         "Arquivista Sena, Mira e Caio, do Acampamento da Aurora", "Vesna, Bruna e Ravi"]},
        {"titulo": "Os guardiões", "linhas": ["Cervo de Ossos • Ferreiro Devorador • Bruxa Afogada", "Cavaleiro Sem Rosto (Aldren) • Rei dos Ecos (Ivar)"]},
        {"titulo": "E você", "linhas": ["que ouviu cada eco até o fim.", "Obrigado por jogar!"]},
    ],
}

D = {}


def dl(key, *variants):
    D[key] = list(variants)


def v(lines, **kw):
    d = {"lines": lines}
    d.update(kw)
    return d


# ---------------------------------------------------------------- placas
dl("placa_selo_externo", v(["O SELO EXTERNO DA CATEDRAL: uma parede de luz vermelha, firme como pedra. No meio, uma fissura violeta do tamanho de um passo.",
                            "(Passo Umbral: aperte E diante da fissura ou use a tecla do Eco ao lado dela.)"]))
dl("placa_aurora", v(["Placa: \"ACAMPAMENTO DA AURORA. Oeste: Escadaria dos Fragmentos. Leste: Jardim Invertido. Norte: a Catedral (o portão abre por dentro).\""]))
dl("placa_escadaria", v(["Placa: \"ESCADARIA DOS FRAGMENTOS. Os degraus flutuam. Onde a escada quebrou, uma âncora a segurava.\""]))
dl("placa_ancora", v(["Inscrição: \"A ÂNCORA SEGURA O QUE O VAZIO QUER LEVAR. Dê peso a ela.\"",
                      "Um bloco de pedra e uma placa ao lado da âncora. Empurre o bloco até a placa — ou peça a um Gravito que sustente a âncora."]))
dl("placa_jardim", v(["Placa: \"JARDIM INVERTIDO. As flores crescem para o vazio. Cuidado com os escribas: o selo fecha onde você está.\"",
                      "Quando um Escriba ergue a pena, um círculo aparece no chão. Saia do círculo antes que ele feche."]))
dl("placa_prismas", v(["Inscrição: \"O OLHO DE CRISTAL VÊ; OS ESPELHOS GUIAM; O CRISTAL DO PORTÃO ESPERA.\"",
                       "Gire os espelhos (E) para levar o feixe até o cristal ao lado do portão. O prisma gira com o canto de um Cristil e leva a luz a outro lugar."]))
dl("placa_catedral_nave", v(["Placa: \"NAVE DA CATEDRAL DO VAZIO. Oeste: Escadaria. Leste: Jardim. Norte: Sala dos Prismas.\"",
                             "Uma alavanca ao sul abre o portão do Acampamento por dentro (atalho)."]))
dl("placa_elevador", v(["Um elevador de fragmentos, parado. Do outro lado, no tesouro do andar das âncoras, há uma alavanca que o faria subir e descer."]))
dl("placa_elevador_b", v(["A alavanca move o elevador de fragmentos até a Nave da Catedral: um atalho de volta ao começo."]))
dl("placa_sala_prismas", v(["Inscrição: \"A LUZ DESCE PELO PRIMEIRO, DOBRA NO SEGUNDO E SEGUE ATÉ O CRISTAL.\"",
                            "O prisma no caminho deixa a luz passar reto. Um Cristil o faria apontar para o alto, onde há outro cristal."]))
dl("placa_raizes", v(["Inscrição: \"RAIZ SOBRE O VAZIO, BRASA NO METAL FRIO.\"",
                      "Erga a ponte com a Raiz Viva (E no suporte). Leve a chama do braseiro até o mecanismo frio do outro lado — ou use a Ruptura Ígnea nele."]))
dl("placa_ancoras", v(["Inscrição: \"DUAS ÂNCORAS, DUAS METADES.\" Cada âncora segura metade da ponte de fragmentos.",
                       "Ponha um bloco em cada placa — ou deixe um Gravito sustentar as âncoras."]))
dl("placa_coro", v(["Inscrição: \"O QUE OS OLHOS NÃO VEEM, O VÉU MOSTRA. O QUE OS PÉS NÃO ALCANÇAM, A SOMBRA ATRAVESSA.\"",
                    "O Olhar Velado firma a marca espiritual num caminho até a ilha; de lá, o portal marcado leva ao outro lado."]))
dl("placa_arauto", v(["Uma página arrancada, presa na porta: \"O Arauto anuncia cada combinação pelo nome. Quando ele virar véu, o Olhar Velado rasga o véu.\""]))
dl("placa_coracao", v(["Inscrição: \"AQUI DORME O CORAÇÃO DO ECO.\" Ao leste, a Câmara do Eco. Acima dela, o trono."]))
dl("placa_elos", v(["Quatro elos prendem o cristal ao chão, cada um com uma marca gravada:",
                    "RAIZ (noroeste) — a Raiz Viva o arranca. BRASA (nordeste) — a Ruptura Ígnea o derrete.",
                    "VÉU (sudoeste) — invisível: o Olhar Velado o mostra. SOMBRA (leste) — atrás da fissura: o Passo Umbral leva até ele."]))
dl("cristal_ione", v(["Dentro do cristal, de olhos fechados, a Mestra Ione. A capa azul flutua como se estivesse debaixo d'água.",
                      "Quatro correntes prendem o cristal. Leia a placa ao sul: cada elo cede a um Eco."]))
dl("rc_placa1", v(["RITO DA CONVERGÊNCIA — primeira sala: \"RAIZ E BRASA.\"",
                   "Erga a ponte com a Raiz Viva e estilhace o cristal da porta com a Ruptura Ígnea."]))
dl("rc_placa2", v(["Segunda sala: \"VÉU E SOMBRA.\" O Olhar Velado firma o caminho; o portal marcado cruza o selo até a alavanca.",
                   "A pedra de reinício recoloca a sala, se precisar."]))
dl("rc_placa3", v(["Terceira sala: \"OS QUATRO.\" Raiz até a ilha. Brasa no cristal que esconde a marca. Véu na marca. Sombra na fissura.",
                   "Do outro lado da fissura, a alavanca abre o altar."]))
dl("placa_harmonia", v(["SALÃO DA HARMONIA. Três provas: Floresta e Minas; Pântano e Fortaleza; o Vazio.",
                        "Cada sala fecha as portas até a prova acabar. Descanse antes no Acampamento."]))
dl("inscricao_catedral", v(["Inscrição revelada: \"Eu, Ivar, Arquivista, guardo aqui o Eco de Auralis para que nada se perca.\"",
                            "Abaixo, em letra mais nova e trêmula: \"...e quem guardará o meu nome?\""]))
dl("arquivo_harmonia", v(["O velho arquivo de Ivar: prateleiras de marfim com o nome de cada criatura, rio e canção de Auralis.",
                          "Na última estante, um nome escrito com letra de criança: Ione. E, ao lado, um espaço em branco — para o seu."], set=["arquivo_lido"]))
# ---------------------------------------------------------------- o Arauto da Ordem e o Eco de Ione (figura azul, sempre um passo à frente)
dl("arauto_aurora", v(["Arauto: Ouçam, desertores da Aurora! O Rei dos Ecos guarda tudo para que nada se perca. Devolvam as vozes que roubaram!",
                       "Você: Ninguém aqui roubou nada. São vocês que acorrentam os guardiões.",
                       "Arauto: Criança sem lembranças... falando de correntes. O Rei vai lembrar de você também.",
                       "O Arauto fecha o livro rachado e some pelo portão da Catedral, deixando um rastro de páginas brancas."], set=["arauto_partiu"]))
dl("arauto_nave", v(["Arauto: Você atravessou a Nave. O livro já não aguenta tantas vozes... está rachando.",
                     "Arauto: Suba, se quiser. No andar das âncoras eu leio o seu nome — e o apago.",
                     "Ele recua para a escuridão, e a rachadura do manto brilha vermelha."], set=["arauto_nave_partiu"]))
dl("eco_ione_1", v(["Uma figura azul e translúcida, de capa, está parada diante do portão da Catedral.",
                    "Eco de Ione: ...você veio. Não pare agora.",
                    "Você: Mestra? Espere!",
                    "A figura se desfaz em luz azul — um passo à sua frente."], set=["eco_ione_1_visto"]))
dl("eco_ione_2", v(["Eco de Ione: A luz desce, dobra e segue. Você sabe disso. Eu te ensinei.",
                    "Você: Eu não lembro de você me ensinando... mas meu corpo lembra.",
                    "O Eco sorri e some na direção da Galeria."], set=["eco_ione_2_visto"]))
dl("eco_ione_3", v(["Eco de Ione: O Arauto não é mau. Só carregou vozes demais.",
                    "Eco de Ione: Mais acima. Estou presa no coração do Eco."], set=["eco_ione_3_visto"]))
dl("eco_ione_4", v(["Eco de Ione: Quatro elos. Quatro Ecos. Você já tem todos.",
                    "Você: Aguenta só mais um pouco, mestra. Eu tô chegando.",
                    "A figura azul encosta a mão no seu ombro — quase quente — e se desfaz."], set=["eco_ione_4_visto"]))

# ---------------------------------------------------------------- moradores do Acampamento
dl("sena",
   v(["Sena: Abri o arquivo de Ivar. Cada noite, lemos um nome em voz alta. Ontem foi o de um Lumipim que viveu há trezentos anos.",
      "Sena: Se quiser um desafio de verdade, o Salão da Harmonia fica ao norte. E me conte quando tiver registrado todas as criaturas de Auralis."],
     **{"if": "bestiario_entregue"}),
   v(["Sena: Você conheceu todas! O bestiário está completo. Tome: sementes e prismas guardados no arquivo de Ivar."],
     **{"if": "bestiario_completo", "set": ["bestiario_entregue"], "give": {"semente_vida": 2, "fragmento_prisma": 5}}),
   v(["Sena: Vinculador. Ivar lembrou. Eu servi a Ordem por vinte anos e nunca soube o que ele procurava.",
      "Sena: Agora que a Harmonia canta em você, o bestiário mostra as notas que Ivar escreveu. Registre todas as criaturas — capture uma de cada — e volte aqui."],
     **{"if": "rei_morto", "set": ["quest_bestiario"]}),
   v(["Sena: A Mestra Ione está livre? Então vá, rápido: o trono fica logo acima da Câmara do Eco. Lembre do que ela disse."], **{"if": "ione_livre"}),
   v(["Sena: O Arauto caiu! Ele era o mensageiro da Ordem quando eu era noviça. Lia os nomes dos guardiões em voz alta para o Arquivista.",
      "Sena: Depois dele vem o Rito da Convergência: quatro salas, quatro Ecos. E então a Câmara do Eco."], **{"if": "arauto_morto"}),
   v(["Sena: Duas rotas levam à Catedral: a Escadaria dos Fragmentos, a oeste, e o Jardim Invertido, a leste.",
      "Sena: Lá dentro, a luz e as âncoras mudam o caminho. Os Ecos que você carrega — raiz, brasa, véu e sombra — abrem o resto.",
      "Sena: Mira vende o que sobrou do nosso estoque. O quadro de contratos tem trabalho para quem quiser."], **{"if": "falou_sena"}),
   v(["Sena: Mais um que cruza o selo! E com o sinal de mão da Mestra Ione... Você é o aprendiz dela.",
      "Sena: Sou Sena. Fui arquivista da Ordem do Vazio — até entender o que o Arquivista estava fazendo com os guardiões. Fugi e fundei este acampamento.",
      "Sena: Ione passou por aqui há três luas. Disse que o Rei dos Ecos é o próprio Arquivista, Ivar, e que ia conversar com ele. Entrou na Catedral e não saiu.",
      "Sena: Leve isto. E tome cuidado: lá dentro, a Ordem ainda tem escribas, sentinelas e fragmentos que mudam de lugar."],
     set=["falou_sena"], give={"pocao": 4, "selo_refinado": 3}))
dl("mira",
   v(["Mira: As estrelas invertidas estão no meu mapa, agora. Obrigada! Volte sempre que quiser comprar."], **{"if": "estrelas_entregue", "shop": "aurora"}),
   v(["Mira: Três estrelas! Deixa eu desenhar... Escadaria, Jardim, Coro. É um olho aberto! O contrário da insígnia da Ordem.",
      "Mira: Tome esta Lente Estelar: lapidei com o mesmo desenho."],
     **{"if": "estrelas_ok", "set": ["estrelas_entregue"], "give": {"lente_estelar": 1}, "bond": "missao:estrelas"}),
   v(["Mira: As estrelas invertidas aparecem onde as coisas flutuam ou crescem para cima: na Escadaria, no Jardim e no Coro da Catedral. Olhe com calma."],
     **{"if": "quest_estrelas", "shop": "aurora"}),
   v(["Mira: Sou Mira, cartógrafa. Mapeio o que ninguém consegue: o céu daqui é de cabeça para baixo.",
      "Mira: Se observar três estrelas invertidas pelo caminho, me conta? Tenho um presente para quem completar meu mapa.",
      "Mira: E vendo selos, tônicos e fragmentos de prisma. Dê uma olhada."], set=["quest_estrelas"], shop="aurora"))
dl("caio",
   v(["Caio: As vozes voltaram para casa. À noite eu escuto as criaturas cantando lá embaixo, nas terras. É bom."], **{"if": "vozes_entregue"}),
   v(["Caio: Três Ecos Perdidos! Escute... é o riso de uma criança da Vila Lúmen. E este, um barqueiro do Porto.",
      "Caio: Eu vou soltá-los no vento da Aurora. Tome este Manto: costurei enquanto esperava."],
     **{"if": "vozes_ok", "set": ["vozes_entregue"], "take": {"eco_perdido": 3}, "give": {"manto_aurora": 1}, "bond": "missao:vozes"}),
   v(["Caio: Os Ecos Perdidos brilham como cacos de cristal. Um na Escadaria, um no Jardim, um na Galeria da Catedral."], **{"if": "quest_vozes"}),
   v(["Caio: Eu era noviço da Ordem. Meu trabalho era guardar vozes em cristais: risos, cantos, nomes... para o Arquivista.",
      "Caio: Quando fugi, deixei cair três. Ficaram pelo caminho. Você me ajuda a encontrá-las? Quero devolvê-las."], set=["quest_vozes"]))
dl("vesna_aurora",
   v(["Vesna: As feras são livres agora. As minhas também: vivem comigo, mas porque querem."], **{"if": "rei_morto"}),
   v(["Vesna: De novo você. Calma: larguei as correntes. Agora caço os que ainda trabalham para a Ordem.",
      "Vesna: Os Escribas do Vazio ainda selam o Jardim. Tem contrato no quadro — eu pago. E Bruna e Ravi estão aqui, se precisar de trio."], contratos=True))
dl("ione",
   v(["Ione: Descanse um pouco, aprendiz. Eu vou ficar no acampamento um tempo, ajudando a Sena a ler os nomes do arquivo.",
      "Ione: Quando quiser treinar, o Salão da Harmonia espera. E se passar pela Vila Lúmen, diga à Maru que eu volto para a festa."]))
dl("ione_camara", v(["Ione: Estou fraca, mas inteira. Vá: o trono fica logo acima. Eu subo atrás de você.",
                     "Ione: Lembre: quando ele hesitar, devolva o nome. Ivar."]))
dl("ione_arena", v(["Ione: Estou aqui. Entre as quedas do chão eu cuido de você. Quando ele parar, diga o nome!"]))
dl("teo_vila", v(["Teo: Eu vigiava os portões da Catedral. Agora vigio as flores-lanterna da minha avó. Prefiro mil vezes."]))
dl("anciao_fim", v(["Maru: Você voltou! E a carta da Ione está ali, na minha porta, para todo mundo ler.",
                    "Maru: Eu sabia que você ia trazê-la. Tem festa hoje à noite. E amanhã. E depois de amanhã também."]))
dl("pipo_fim", v(["Pipo: Os Lumipins aprenderam a dançar em roda! Olha, olha! Quando eu crescer, quero ser vinculador igual a você."]))
dl("doran_fim", v(["Doran: Derretemos as correntes da Ordem e fizemos sinos. Escute! Cada badalada é um guardião que voltou para casa."]))
dl("nino_fim", v(["Nino: O maior sino tem o seu nome gravado. Fui eu que escrevi. Tá meio torto, mas tá lá."]))
dl("arao_fim", v(["Arão: Lanternas novas no cais, uma para cada guardião. E uma extra, maior: para a Mestra Ione voltar sempre."]))
dl("nina_fim", v(["Nina: A água reflete as estrelas certas agora! A Mira disse que antes elas estavam de cabeça para baixo."]))
dl("bruna_fim", v(["Bruna: Escudo guardado — por enquanto. Se aparecer domador de novo, já sabe onde me achar."]))
dl("ravi_fim", v(["Ravi: Estou ensinando o Faísca a acender as lanternas do cais. Ele erra metade, mas se diverte."]))
dl("ilse_fim", v(["Ilse: O portão norte não fecha mais. A guarnição escolta quem quiser ir até a Catedral — agora é só um arquivo bonito."]))
dl("talia_fim", v(["Tália: Plantei as flores do Jardim Invertido aqui. Aqui elas crescem para cima. Acho que estavam com saudade."]))
dl("vesna_fim", v(["Vesna: Vim ver a Ilse. Ela me ofereceu um posto na guarnição. Disse que uma caçadora que larga as correntes merece um teto."]))

MUSIC_CHEFES = {"arauto": "chefe_catedral", "rei": "rei"}
MUSIC_VARIANTES = {"acampamento_aurora": [{"if": "rei_morto", "music": "vila_festa"}]}
SHOP = {"aurora": {"nome": "Barraca da Mira", "itens": ["selo_basico", "selo_refinado", "pocao", "tonico_criatura", "fragmento_prisma", "lasca_umbral"]}}


def main():
    sp = load("species.json")
    out = {}
    for k, val in sp.items():
        if k in ("prismal", "monolito", "astraveu"):
            continue
        out[k] = SPECIES.get(k, val)
        if k == "velunio":
            for e in ("prismal", "monolito", "astraveu"):
                out[e] = SPECIES[e]
    save("species.json", out, True)
    sk = load("skills.json"); sk.update(SKILLS); save("skills.json", sk, True)
    en = load("enemies.json"); en.update(ENEMIES); save("enemies.json", en, True)
    bo = load("bosses.json"); bo.update(BOSSES); save("bosses.json", bo, True)
    it = load("items.json"); it.update(ITEMS); save("items.json", it, False)
    qu = load("quests.json")
    # bestiário completo: todas as espécies-base jogáveis (calculado dos dados)
    base = [k for k, s in out.items() if s.get("status") == "jogavel" and not str(s.get("habitat", "")).startswith("Evolução")]
    qu.update(QUESTS)
    qu["bestiario_completo"] = {"nome": "O Arquivo Vivo", "tipo": "secundaria", "ativa_se": "quest_bestiario", "etapas": [
        {"texto": "Capture uma criatura de cada espécie de Auralis.", "contador_especies": base, "flag": "bestiario_completo"},
        {"texto": "Mostre o bestiário completo à Arquivista Sena.", "flag": "bestiario_entregue"}]}
    save("quests.json", qu, True)
    ct = load("contracts.json"); ct.update(CONTRACTS); save("contracts.json", ct, True)
    dg = load("dialogs.json")
    dg.update(D)
    dg["placa_catedral"] = [{"lines": ["O selo externo da Catedral do Vazio pulsa, frio. Riscado na pedra, o sinal de mão do seu treino com Ione.",
                                       "Ela passou por aqui. Mais acima, o Acampamento da Aurora espera do outro lado do selo."], "set": ["viu_selo_catedral"]}]
    save("dialogs.json", dg, False)
    st = load("story.json")
    st["memorias"].update(STORY_MEM)
    st["resgate_ione"] = RESGATE
    st["nome_ivar"] = NOME_IVAR
    st["epilogo"] = EPILOGO
    for a in st.get("artefatos", []):
        if a.get("id") == "coroa_partida":
            a.pop("placeholder", None)
            a.pop("_doc", None)
            a["lembranca"] = COROA_LEMBRANCA
    save("story.json", st, False)
    rg = load("regions.json")
    rg["catedral"]["mapas"] = ["acampamento_aurora", "escadaria_fragmentos", "jardim_invertido", "catedral_a", "catedral_b", "rito_convergencia",
                               "catedral_c", "salao_harmonia"]
    rg["catedral"]["status"] = "jogavel"
    save("regions.json", rg, True)
    mu = load("music.json")
    mu["chefes"].update(MUSIC_CHEFES)
    mu["variantes"].update(MUSIC_VARIANTES)
    save("music.json", mu, False)
    fo = load("forge.json"); fo["lojas"].update(SHOP); save("forge.json", fo, True)
    print("dados da Região 5 gravados (%d espécies-base no bestiário completo)" % len(base))


if __name__ == "__main__":
    main()
