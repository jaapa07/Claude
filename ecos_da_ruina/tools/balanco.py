#!/usr/bin/env python3
"""Análise de equilíbrio das Regiões 1–5 de "Ecos da Ruína".

Lê os JSON de data/ e replica as fórmulas de scripts/game.gd (herói, criatura, XP, captura,
dificuldade), scripts/enemy.gd (escala por nível do mapa), scripts/ally.gd/ally_beast.gd (aliados)
e scripts/player.gd (combo da espada). Gera docs/BALANCO.md com:
  - nível esperado do herói por região (XP disponível no caminho, com e sem contratos);
  - equipamento esperado (melhor peça obtível até o chefe da região) e forja;
  - golpes para derrubar cada inimigo comum e TTK; golpes que o herói aguenta;
  - chefes: tempo estimado de luta para quem aprende o padrão;
  - contribuição de aliados (Bruna/Ravi + criaturas deles) nos contratos em grupo;
  - economia (fragmentos ganhos x gastos de referência) e recompensas de contratos;
  - lista de pontos fora da faixa (outliers).

Uso:
  python3 tools/balanco.py                 # escreve docs/BALANCO.md
  python3 tools/balanco.py --antes REF     # inclui a comparação com os dados de um commit git (ex.: HEAD~3)
  python3 tools/balanco.py --stdout        # só imprime
  python3 tools/balanco.py --checar        # sai com código 1 se algum alvo da curva ficar fora da faixa

As fórmulas aqui precisam acompanhar o jogo. O teste `-- --unit` confere a mesma curva usando as funções
reais de Game (scripts/game.gd), então uma divergência aparece lá.
"""
import argparse
import json
import math
import os
import re
import subprocess
import sys

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REGIOES = ["floresta", "minas", "pantano", "fortaleza", "catedral"]
ARQUIVOS = ["enemies", "bosses", "species", "skills", "items", "forge", "recipes", "contracts", "allies",
            "regions", "dialogs"]

# ------------------------------------------------------------------ fórmulas (espelham scripts/game.gd)
# Os coeficientes são lidos do próprio GDScript (ver ler_formulas); estes são só os valores de reserva.
F = {
    "hero_hp_base": 100.0, "hero_hp_nivel": 8.0, "hero_hp_resist": 6.0, "semente_hp": 12.0,
    "hero_atk_base": 12.0, "hero_atk_nivel": 1.4, "hero_atk_espada": 2.0,
    "reduc_resist": 0.02, "reduc_max": 0.5,
    "xp_nivel": 20, "cri_xp_nivel": 18,
    "talento_cada": 3,
}
# Dificuldades (Game.enemy_damage_mult / Game.warning_mult): lidas de Game.DIFFICULTY quando existir
DIFICULDADES = {"aventura": (0.75, 1.2), "desafio": (1.0, 1.0)}
DIF_PADRAO = "aventura"

# Combo da espada (scripts/player.gd COMBO): 3 golpes, multiplicadores 1,0/1,0/1,5 em 0,34+0,33+0,56 s
COMBO_MULT = 3.5
COMBO_TEMPO = 1.23
ATK_POR_S = COMBO_MULT / COMBO_TEMPO        # ataque do herói por segundo com 100% do tempo batendo
UPTIME_COMUM = 0.5      # fração do tempo batendo contra comuns (o resto é aproximar, esquivar, defender)
UPTIME_CHEFE = 0.18     # chefes: só nas janelas (calibrado com as lutas do bot do e2e: 0,15–0,20)
PASSADAS = 1.5          # cada mapa é atravessado ~1,5 vez (ida e volta, atalhos; comuns reaparecem ao descansar)
PESO_KIT_NOVO = 0.25    # no meio da região, fração das melhorias novas da região já em uso
FRACAO_CONTRATOS = 0.5  # jogador típico faz metade dos contratos opcionais (mínimo = nenhum, completo = todos)
MAPAS_POS_JOGO = ["salao_harmonia"]   # Provas da Harmonia (depois do Rei): fora da curva principal
KIT_INICIAL = {"arma": "espada_viajante", "protecao": "", "amuleto": "", "forja": 0, "sementes": 0, "frascos": 0}
UPTIME_CRIATURA = 0.7
UPTIME_ALIADO = 0.7

# Multiplicador médio de dano que o chefe recebe de quem joga o padrão (janelas de exposição x couraça).
# Derivado dos campos de data/bosses.json e dos scripts boss_*.gd (comentado por chefe).
CHEFE_EFETIVO = {
    "lenhador": 1.1,    # 1,5x no golpe preso ao chão, 1,0x no resto
    "cervo": 1.0,       # 2,0x exposto / 0,7x protegido
    "vigia": 0.85,      # couraça 0,15 / vulnerável 1,6 após a válvula
    "ferreiro": 0.8,    # fase 1 1,0; fases 2–3 armadura quente 0,25–0,5 / resfriada 1,3
    "barqueiro": 0.85,  # sem sombra 0,2 / com sombra (lanterna) 1,6
    "bruxa": 0.8,       # cópias e plataformas reduzem as janelas
    "gemeos": 1.0,      # 1,35 na recuperação / 0,7 esperando; dois corpos
    "cavaleiro": 0.85,  # guarda frontal 0,15, exausto 1,3, costas 1,6, posturas na fase 2
    "arauto": 0.9,      # véu e raízes; 1,4x na recuperação
    "rei": 0.7,         # protegido 0,06 até quebrar os focos; exposto 1,4 por 8 s; hesita no fim
}
CHEFE_CORPOS = {"gemeos": 2}
# Recompensas de chefe escritas nos scripts (não estão em bosses.json)
DROPS_SCRIPT = {"lenhador": {"casca_oca": 2}, "cervo": {"osso_ancestral": 3}}
# Bandeiras de receita -> região a partir da qual a receita pode ser feita
FLAG_REGIAO = {"lenhador_morto": "floresta", "cervo_morto": "minas", "visitou_forja_cobre": "minas",
               "ferreiro_morto": "pantano", "rei_morto": "pos_jogo"}
# Forja (Ilda, na Forja de Cobre): nível de melhoria esperado no chefe de cada região
FORJA_NIVEL = {"floresta": 0, "minas": 2, "pantano": 3, "fortaleza": 3, "catedral": 3}
# Criatura representativa (atacante típico da equipe) por região
CRIATURA_REP = {"floresta": "brotisco", "minas": "faisquito", "pantano": "brejugo", "fortaleza": "brasardo", "catedral": "velunio"}

# Gasto de referência por região: tônicos+selos refinados, acessórios de loja e reserva para a Região 5
CUSTO_CONSUMO = 6
CUSTO_LOJA = {"floresta": ["coleira_couro"], "minas": ["guizo_eco"]}
CUSTO_RESERVA = {"catedral": ["lamina_ruina", "selo_ancestral"]}   # peças míticas montadas com o que sobra da Catedral

# Metas (docs do pedido de equilíbrio)
META_GOLPES = (3.0, 5.0)        # golpes do nível esperado para derrubar um comum
META_AGUENTA = (6.0, 10.0)      # golpes comuns que o herói aguenta
META_CHEFE_S = (60.0, 150.0)    # duração de luta de chefe de região
META_ALIADO = (0.20, 0.30)      # fração do dano do grupo feita pelos aliados


# ------------------------------------------------------------------ dados
class Dados:
    def __init__(self, ref=None):
        self.ref = ref
        self.d = {}
        for nome in ARQUIVOS:
            self.d[nome] = self._json("data/%s.json" % nome)
        self.mapas = {}
        for arq in self._lista_mapas():
            m = self._json("data/maps/" + arq)
            self.mapas[m["id"]] = m

    def _ler(self, caminho):
        if self.ref is None:
            with open(os.path.join(RAIZ, caminho), encoding="utf-8") as f:
                return f.read()
        return subprocess.check_output(["git", "-C", RAIZ, "show", "%s:%s" % (self.ref, caminho)]).decode("utf-8")

    def _json(self, caminho):
        return json.loads(self._ler(caminho))

    def _lista_mapas(self):
        if self.ref is None:
            return sorted(x for x in os.listdir(os.path.join(RAIZ, "data/maps")) if x.endswith(".json"))
        out = subprocess.check_output(["git", "-C", RAIZ, "ls-tree", "--name-only", self.ref, "data/maps/"]).decode()
        return sorted(os.path.basename(x) for x in out.split() if x.endswith(".json"))

    def __getattr__(self, k):
        if k in ("d", "ref", "mapas"):
            raise AttributeError(k)
        return self.d[k]


# ------------------------------------------------------------------ fórmulas
def xp_para_nivel(nivel):
    """XP acumulado para chegar ao nível (xp_to_next = 20 * nível)."""
    return sum(F["xp_nivel"] * n for n in range(1, nivel))


def nivel_por_xp(xp):
    n = 1
    while n < 30 and xp >= xp_para_nivel(n + 1):
        n += 1
    return n


def talentos(nivel):
    pts = nivel // F["talento_cada"]
    return {"espada": (pts + 1) // 2, "resistencia": pts // 2}


def heroi_atk(D, nivel, arma, forja):
    t = talentos(nivel)
    a = F["hero_atk_base"] + F["hero_atk_nivel"] * (nivel - 1) + F["hero_atk_espada"] * t["espada"]
    if arma:
        a += float(D.items[arma].get("dano", 0)) + float(D.forge["bonus"]["arma"]["dano"]) * forja
    return a


def heroi_hp(D, nivel, amuleto, forja, sementes):
    t = talentos(nivel)
    hp = F["hero_hp_base"] + F["hero_hp_nivel"] * (nivel - 1) + F["hero_hp_resist"] * t["resistencia"] + F["semente_hp"] * sementes
    if amuleto:
        hp += float(D.items[amuleto].get("hp", 0)) + float(D.forge["bonus"]["amuleto"]["hp"]) * forja
    return hp


def heroi_reducao(D, nivel, protecao, forja):
    r = F["reduc_resist"] * talentos(nivel)["resistencia"]
    if protecao:
        r += float(D.items[protecao].get("reducao", 0)) + float(D.forge["bonus"]["protecao"]["reducao"]) * forja
    return min(r, F["reduc_max"])


def criatura_atk(D, sp, nivel):
    s = D.species[sp]
    return float(s["atk_base"]) + float(s["atk_cresc"]) * (nivel - 1)


def criatura_evoluida(D, sp, nivel):
    ev = D.species[sp].get("evolucao")
    if ev and nivel >= int(ev["nivel"]):
        return ev["para"]
    return sp


def criatura_dps(D, sp, nivel):
    """Dano por segundo do companheiro: ataque básico + habilidade padrão (alvo único)."""
    sp = criatura_evoluida(D, sp, nivel)
    s = D.species[sp]
    mult = 1.4 if str(s.get("habitat", "")).startswith("Evolução") else 1.0
    atk = criatura_atk(D, sp, nivel)
    basico = atk * 0.6 * mult / float(s["basic"]["recarga"])
    sk = D.skills.get(s.get("skill", ""), {})
    hab = (float(sk.get("dano", 0)) + atk * 0.6) * mult / float(sk.get("recarga", 8.0))
    return (basico + hab) * UPTIME_CRIATURA, sp


def inimigo_stats(D, kind, nivel_mapa=None):
    """HP/dano de um inimigo comum (scripts/enemy.gd init: +14% de vida e +10% de dano por nível acima do base)."""
    e = D.enemies[kind]
    hp = float(e["hp"])
    dano = float(e["dano"])
    base = int(e.get("nivel", {"lobo": 3, "cogumelo": 2, "sentinela": 4, "lenhador": 6, "cervo": 8}.get(kind, 1)))
    nv = base
    if nivel_mapa is not None:
        dl = int(nivel_mapa) - base
        hp = math.floor(hp * (1.0 + 0.14 * dl))
        dano = dano * (1.0 + 0.1 * dl)
        nv = int(nivel_mapa)
    return hp, dano, nv


def fera_stats(D, sp, nivel):
    s = D.species[sp]
    hp = math.floor(math.floor(float(s["hp_base"]) + float(s["hp_cresc"]) * (nivel - 1)) * 1.35)
    dano = float(s["atk_base"]) + float(s["atk_cresc"]) * (nivel - 1) * 0.9
    return hp, dano


def aliado_dps(D, aid, nivel_heroi):
    a = D.allies[aid]
    atk = float(a["atk_base"]) + float(a["atk_nivel"]) * (nivel_heroi - 1)
    if a.get("estilo") == "escudo":
        humano = atk * 1.2 / (0.95 + 0.24)          # golpe de escudo: recarga 0,95 + preparo 0,24
    else:
        humano = atk * 1.1 / (1.15 + 0.24)          # disco: recarga 1,15 + preparo 0,24
    sp = a["criatura"]["species"]
    lv = max(1, nivel_heroi - 1)
    fera = criatura_atk(D, sp, lv) * ALLY_BEAST_ATK / 1.2
    return (humano + fera) * UPTIME_ALIADO


ALLY_BEAST_ATK = 0.7   # scripts/ally_beast.gd: fração do ataque da espécie usada pela criatura do aliado (lida do script)
RECEBE = {"COMPANION_DAMAGE_TAKEN": 1.0, "ALLY_DAMAGE_TAKEN": 1.0}   # Game.*_DAMAGE_TAKEN (lidas do script)


def ler_formulas(D):
    """Atualiza F, DIFICULDADES e ALLY_BEAST_ATK a partir do GDScript (da árvore atual ou do ref git)."""
    global ALLY_BEAST_ATK, DIFICULDADES
    g = D._ler("scripts/game.gd")
    m = re.search(r'var hp = ([\d.]+) \+ ([\d.]+) \* \(hero_level\(\) - 1\) \+ ([\d.]+) \* hero\["talents"\]\.get\("resistencia", 0\)'
                  r' \+ ([\d.]+) \* item_count\("semente_vida"\)', g)
    if m:
        F["hero_hp_base"], F["hero_hp_nivel"], F["hero_hp_resist"], F["semente_hp"] = map(float, m.groups())
    m = re.search(r'var a = ([\d.]+) \+ ([\d.]+) \* \(hero_level\(\) - 1\) \+ ([\d.]+) \* hero\["talents"\]\.get\("espada", 0\)', g)
    if m:
        F["hero_atk_base"], F["hero_atk_nivel"], F["hero_atk_espada"] = map(float, m.groups())
    m = re.search(r"const DIFFICULTY := \{(.*?)\n\}", g, re.S)
    if m:
        DIFICULDADES = {}
        for nome, dano, aviso in re.findall(r'"(\w+)": \{"dano": ([\d.]+), "aviso": ([\d.]+)', m.group(1)):
            DIFICULDADES[nome] = (float(dano), float(aviso))
    else:
        DIFICULDADES = {"aventura": (0.75, 1.2), "desafio": (1.0, 1.0)}
    for nome in ("COMPANION_DAMAGE_TAKEN", "ALLY_DAMAGE_TAKEN"):
        m = re.search(r"const %s := ([\d.]+)" % nome, g)
        RECEBE[nome] = float(m.group(1)) if m else 1.0
    b = D._ler("scripts/ally_beast.gd")
    m = re.search(r'atk = \(float\(species\["atk_base"\]\) \+ float\(species\["atk_cresc"\]\) \* \(lv - 1\)\) \* ([\d.]+)', b)
    if m:
        ALLY_BEAST_ATK = float(m.group(1))


def captura(D, sp, nivel_selv, nivel_heroi, hp_ratio, selo="selo_basico", bonus=0.0):
    rar = D.species[sp].get("raridade", "comum")
    b = 0.25 if rar == "comum" else (0.15 if rar == "incomum" else 0.05)
    t = float(D.items.get(selo, {}).get("bonus", 0.0)) + bonus
    l = min(0.20, 0.02 * max(0, nivel_selv - nivel_heroi))
    return max(0.08, min(0.95, b - 0.12 + 0.6 * (1.0 - hp_ratio) + t - l))


# ------------------------------------------------------------------ levantamento por região
def levantar(D):
    R = {r: {"comuns": [], "selvagens": [], "chefes": [], "minichefes": [], "contratos": [], "itens": {},
             "frag_bau": 0, "frag_dialogo": 0, "sementes": 0, "frascos": 0, "fontes_semente": []} for r in REGIOES}

    def add_itens(r, loot, origem):
        if r not in R:
            return
        for it, n in loot.items():
            if it == "fragmentos":
                continue
            R[r]["itens"].setdefault(it, []).append(origem)
            if it == "semente_vida":
                R[r]["sementes"] += int(n)
                R[r]["fontes_semente"].append(origem)
            if it == "frasco_seiva":
                R[r]["frascos"] += int(n)

    vistos_dlg = set()
    for mid, m in D.mapas.items():
        r = m.get("region", "")
        if r not in R or mid in MAPAS_POS_JOGO:
            continue
        for e in m.get("entities", []):
            t = e["type"]
            if t == "enemy" and e.get("kind") in D.enemies:
                R[r]["comuns"].append((mid, e["kind"], e.get("nivel")))
            elif t == "wild":
                R[r]["selvagens"].append((mid, e["species"], int(e.get("level", 1))))
            elif t == "miniboss":
                R[r]["minichefes"].append(e.get("boss", e.get("id")))
            elif t == "boss":
                R[r]["chefes"].append(e.get("boss", e.get("id")))
            if "loot" in e:
                add_itens(r, e["loot"], "%s:%s" % (mid, e.get("id")))
                if t == "chest" or t == "altar":
                    R[r]["frag_bau"] += int(e["loot"].get("fragmentos", 0))
            if t == "pickup" and e.get("item") == "semente_vida":
                add_itens(r, {"semente_vida": 1}, "%s:%s" % (mid, e.get("id")))
            dlg = e.get("dialog")
            if dlg and dlg in D.dialogs and dlg not in vistos_dlg:
                vistos_dlg.add(dlg)
                var = D.dialogs[dlg] if isinstance(D.dialogs[dlg], list) else [D.dialogs[dlg]]
                for v in var:
                    give = v.get("give") if isinstance(v, dict) else None
                    if not give:
                        continue
                    # inscrições só são lidas com o Olhar Velado (Eco da Região 3): contam a partir da Região 4
                    rr = "fortaleza" if dlg.startswith("inscricao_") else r
                    add_itens(rr, give, "diálogo:" + dlg)
                    R[rr]["frag_dialogo"] += int(give.get("fragmentos", 0))
    # contratos por faixa de nível da região
    for cid, c in D.contracts.items():
        nv = int(c.get("nivel", 1))
        for r in REGIOES:
            a, b = D.regions[r]["nivel"]
            if a <= nv <= b or (r == "floresta" and nv < a):
                R[r]["contratos"].append(cid)
                add_itens(r, c.get("recompensa", {}).get("itens", {}), "contrato:" + cid)
                break
    for r in REGIOES:
        for b in R[r]["minichefes"] + R[r]["chefes"]:
            rec = D.bosses.get(b, {}).get("recompensa", {})
            dest = r if b in R[r]["minichefes"] else (REGIOES[REGIOES.index(r) + 1] if REGIOES.index(r) + 1 < len(REGIOES) else r)
            add_itens(dest, rec.get("itens", {}), "chefe:" + b)
            add_itens(dest if b in R[r]["chefes"] else r, DROPS_SCRIPT.get(b, {}), "chefe:" + b)
    # receitas: disponíveis a partir da região da bandeira exigida
    for rid, rc in D.recipes.items():
        rr = FLAG_REGIAO.get(rc.get("requer", ""), "floresta")
        if rr in R:
            add_itens(rr, {rid: 1}, "receita")
    return R


def kit(D, R, ate):
    """Melhor peça de cada espaço obtível até a região `ate` (inclusive)."""
    disp = set(["espada_viajante"])
    for r in REGIOES[:REGIOES.index(ate) + 1]:
        disp |= set(R[r]["itens"].keys())
    melhor = {"arma": ("espada_viajante", 0.0), "protecao": ("", 0.0), "amuleto": ("", 0.0)}
    chave = {"arma": "dano", "protecao": "reducao", "amuleto": "hp"}
    for it in disp:
        d = D.items.get(it, {})
        t = d.get("tipo")
        if t in melhor and int(d.get("raridade", 0)) < 4:
            v = float(d.get(chave[t], 0))
            if v > melhor[t][1]:
                melhor[t] = (it, v)
    sementes = sum(R[r]["sementes"] for r in REGIOES[:REGIOES.index(ate) + 1])
    frascos = sum(R[r]["frascos"] for r in REGIOES[:REGIOES.index(ate) + 1])
    return {"arma": melhor["arma"][0], "protecao": melhor["protecao"][0], "amuleto": melhor["amuleto"][0],
            "forja": FORJA_NIVEL[ate], "sementes": sementes, "frascos": frascos}


def xp_regiao(D, R, r):
    caminho = 0
    vistos = {}
    for (_mid, k, nv) in R[r]["comuns"]:
        caminho += int(D.enemies[k].get("xp", 0)) * PASSADAS
        vistos[k] = vistos.get(k, 0) + 1
    mini = sum(int(D.bosses.get(b, {}).get("recompensa", {}).get("xp", 0)) for b in R[r]["minichefes"])
    chefe = sum(int(D.bosses.get(b, {}).get("recompensa", {}).get("xp", 0)) for b in R[r]["chefes"])
    contratos = sum(int(D.contracts[c].get("recompensa", {}).get("xp", 0)) for c in R[r]["contratos"])
    # inimigos dos contratos em grupo também dão XP
    for c in R[r]["contratos"]:
        for e in D.contracts[c].get("inimigos", []):
            if e["kind"] in D.enemies:
                contratos += int(D.enemies[e["kind"]].get("xp", 0))
    return {"caminho": caminho, "mini": mini, "chefe": chefe, "contratos": contratos}


def frag_regiao(D, R, r):
    medio = 0.0
    for (_mid, k, _nv) in R[r]["comuns"]:
        fr = D.enemies[k].get("frag", [0, 0])
        medio += (fr[0] + fr[1]) / 2.0 * PASSADAS
    chefes = sum(int(D.bosses.get(b, {}).get("recompensa", {}).get("frag", 0)) for b in R[r]["minichefes"] + R[r]["chefes"])
    contratos = sum(int(D.contracts[c].get("recompensa", {}).get("fragmentos", 0)) for c in R[r]["contratos"])
    return {"inimigos": medio, "baus": R[r]["frag_bau"], "dialogos": R[r]["frag_dialogo"], "chefes": chefes,
            "contratos": contratos}


def custos_regiao(D, R, r, k_antes, k_agora):
    """Gasto de referência da região (ver CUSTO_* e o relatório)."""
    c = 0
    for rid, rc in D.recipes.items():
        if FLAG_REGIAO.get(rc.get("requer", ""), "floresta") != r or int(D.items.get(rid, {}).get("raridade", 0)) >= 4:
            continue
        tipo = D.items.get(rid, {}).get("tipo")
        if tipo in ("arma", "protecao", "amuleto"):
            c += int(rc.get("fragmentos", 0)) // 2   # metade: o jogador monta só parte das peças
        elif tipo == "acessorio_criatura":
            c += int(rc.get("fragmentos", 0))
    niveis = D.forge["niveis"]
    f0, f1 = k_antes["forja"] if k_antes else 0, k_agora["forja"]
    for lv in range(f0, f1):
        for mat, n in niveis[lv]["custo"].items():
            # arma, proteção e amuleto; materiais faltantes comprados nas bancas (metade do total)
            c += 3 * (int(n) if mat == "fragmentos" else int(n) * int(D.items.get(mat, {}).get("preco", 0)) // 2)
    c += CUSTO_CONSUMO * (int(D.items["pocao"]["preco"]) + int(D.items["selo_refinado"]["preco"]))
    for it in CUSTO_LOJA.get(r, []):
        c += int(D.items[it].get("preco", 0))
    for rid in CUSTO_RESERVA.get(r, []):
        c += int(D.recipes[rid].get("fragmentos", 0))
    return c


# ------------------------------------------------------------------ análise
def analisar(D, dif=DIF_PADRAO):
    ler_formulas(D)
    R = levantar(D)
    mult_dano, _ = DIFICULDADES[dif]
    xp_total = 0          # jogador típico: caminho + metade dos contratos
    xp_total_min = 0      # só o caminho
    xp_total_max = 0      # todos os contratos
    out = {"regioes": {}, "outliers": []}
    k_prev = None
    for r in REGIOES:
        X = xp_regiao(D, R, r)
        entrada = nivel_por_xp(xp_total)
        xp_chefe = xp_total + X["caminho"] + X["mini"] + FRACAO_CONTRATOS * X["contratos"]
        xp_chefe_min = xp_total_min + X["caminho"] + X["mini"]
        xp_chefe_max = xp_total_max + X["caminho"] + X["mini"] + X["contratos"]
        nv_chefe = nivel_por_xp(xp_chefe)
        nv_chefe_min = nivel_por_xp(xp_chefe_min)
        nv_chefe_max = nivel_por_xp(xp_chefe_max)
        nv_meio = max(entrada, (entrada + nv_chefe) // 2)
        K = kit(D, R, r)
        K_meio = kit(D, R, REGIOES[REGIOES.index(r) - 1]) if r != "floresta" else KIT_INICIAL
        # no meio da região o jogador ainda usa quase só o kit do fim da anterior: peso PESO_KIT_NOVO para o kit novo
        w = PESO_KIT_NOVO
        atk_meio = w * heroi_atk(D, nv_meio, K["arma"], K["forja"]) + (1 - w) * heroi_atk(D, nv_meio, K_meio["arma"], K_meio["forja"])
        hp_meio = w * heroi_hp(D, nv_meio, K["amuleto"], K["forja"], K["sementes"]) + (1 - w) * heroi_hp(D, nv_meio, K_meio["amuleto"], K_meio["forja"], K_meio["sementes"])
        red_meio = w * heroi_reducao(D, nv_meio, K["protecao"], K["forja"]) + (1 - w) * heroi_reducao(D, nv_meio, K_meio["protecao"], K_meio["forja"])
        cdps, csp = criatura_dps(D, CRIATURA_REP[r], max(1, nv_meio - 1))
        hdps = atk_meio * ATK_POR_S * UPTIME_COMUM
        s_cri = D.species[csp]
        cri_hp = float(s_cri["hp_base"]) + float(s_cri["hp_cresc"]) * (max(1, nv_meio - 1) - 1)
        cri_red = float(s_cri.get("reducao_dano", 0.0))
        comuns = {}
        for (mid, k, nv) in R[r]["comuns"]:
            key = (k, nv)
            if key in comuns:
                comuns[key]["n"] += 1
                continue
            hp, dano, nvi = inimigo_stats(D, k, nv)
            recebido = dano * mult_dano * (1.0 - red_meio)
            comuns[key] = {"kind": k, "nome": D.enemies[k]["nome"], "nivel": nvi, "hp": hp, "dano": dano, "n": 1,
                           "golpes": hp / atk_meio, "ttk": hp / (hdps + cdps), "recebido": recebido,
                           "aguenta": hp_meio / max(0.1, recebido), "mapa": mid,
                           "cri_aguenta": cri_hp / max(0.1, dano * mult_dano * RECEBE["COMPANION_DAMAGE_TAKEN"] * (1.0 - cri_red))}
        # chefes e minichefes
        bosses = []
        hp_chefe = heroi_hp(D, nv_chefe, K["amuleto"], K["forja"], K["sementes"])
        red_chefe = heroi_reducao(D, nv_chefe, K["protecao"], K["forja"])
        atk_chefe = heroi_atk(D, nv_chefe, K["arma"], K["forja"])
        cdps_c, _ = criatura_dps(D, CRIATURA_REP[r], max(1, nv_chefe - 1))
        for b in R[r]["minichefes"] + R[r]["chefes"]:
            bd = D.bosses[b]
            hpb = float(bd["hp"]) * CHEFE_CORPOS.get(b, 1)
            nv_b = nv_chefe if b in R[r]["chefes"] else nv_meio
            atk_b = atk_chefe if b in R[r]["chefes"] else atk_meio
            dps = (atk_b * ATK_POR_S * UPTIME_CHEFE + (cdps_c if b in R[r]["chefes"] else cdps)) * CHEFE_EFETIVO.get(b, 1.0)
            danos = [float(v) for kk, v in bd.items() if kk.startswith("dano_") and kk != "dano_queda"]
            if not danos:
                danos = [float(D.enemies.get(b, {}).get("dano", 0))]
            maior = max(danos)
            hp_h = hp_chefe if b in R[r]["chefes"] else hp_meio
            red_h = red_chefe if b in R[r]["chefes"] else red_meio
            bosses.append({"id": b, "nome": bd["nome"], "hp": hpb, "tipo": "chefe" if b in R[r]["chefes"] else "minichefe",
                           "nivel": nv_b, "tempo": hpb / dps, "golpes": hpb / atk_b,
                           "maior": maior, "aguenta": hp_h / max(0.1, maior * mult_dano * (1.0 - red_h))})
        # aliados nos contratos em grupo
        aliados = []
        for c in R[r]["contratos"]:
            cd = D.contracts[c]
            if cd.get("tipo") == "caca":
                continue
            nv_c = int(cd.get("nivel", nv_meio))
            K_c = K_meio
            h_atk = heroi_atk(D, nv_c, K_c["arma"], K_c["forja"]) * ATK_POR_S * UPTIME_COMUM
            c_dps, _ = criatura_dps(D, CRIATURA_REP[r], max(1, nv_c - 1))
            a_dps = sum(aliado_dps(D, a, nv_c) for a in cd.get("aliados", []))
            hp_inim = 0.0
            for e in cd.get("inimigos", []):
                if e["kind"] == "fera":
                    hp_inim += fera_stats(D, e["species"], int(e["level"]))[0]
                else:
                    hp_inim += inimigo_stats(D, e["kind"], e.get("nivel"))[0]
            tot = h_atk + c_dps + a_dps
            aliados.append({"id": c, "nome": cd["nome"], "nivel": nv_c, "aliados": ", ".join(cd.get("aliados", [])),
                            "heroi": h_atk, "criatura": c_dps, "aliado": a_dps, "frac": a_dps / tot,
                            "hp_inimigos": hp_inim, "tempo": hp_inim / tot})
        FR = frag_regiao(D, R, r)
        ganho = sum(FR.values())
        custo = custos_regiao(D, R, r, k_prev, K)
        contratos = []
        for c in R[r]["contratos"]:
            cd = D.contracts[c]
            rec = cd.get("recompensa", {})
            contratos.append({"id": c, "nome": cd["nome"], "tipo": cd["tipo"], "nivel": cd["nivel"],
                              "xp": rec.get("xp", 0), "frag": rec.get("fragmentos", 0),
                              "itens": ", ".join("%s x%d" % (D.items.get(i, {}).get("nome", i), n) for i, n in rec.get("itens", {}).items()),
                              "xp_pct": 100.0 * rec.get("xp", 0) / max(1, F["xp_nivel"] * int(cd["nivel"]))})
        selv = {}
        for (_m, sp, lv) in R[r]["selvagens"]:
            if sp not in selv:
                selv[sp] = (lv, captura(D, sp, lv, nv_meio, 0.35), captura(D, sp, lv, nv_meio, 0.35, "selo_refinado"))
        out["regioes"][r] = {"nome": D.regions[r]["nome"], "faixa": D.regions[r]["nivel"], "xp": X, "entrada": entrada,
                             "nv_chefe": nv_chefe, "nv_chefe_min": nv_chefe_min, "nv_meio": nv_meio, "kit": K,
                             "atk_meio": atk_meio, "hp_meio": hp_meio, "red_meio": red_meio, "criatura": csp,
                             "cdps": cdps, "hdps": hdps, "comuns": list(comuns.values()), "chefes": bosses,
                             "aliados": aliados, "frag": FR, "ganho": ganho, "custo": custo, "contratos": contratos,
                             "atk_chefe": atk_chefe, "hp_chefe": hp_chefe, "red_chefe": red_chefe, "selvagens": selv}
        out["regioes"][r]["nv_chefe_max"] = nv_chefe_max
        out["regioes"][r]["kit_antes"] = K_meio
        xp_total = xp_chefe + X["chefe"]
        xp_total_min = xp_chefe_min + X["chefe"]
        xp_total_max = xp_chefe_max + X["chefe"]
        k_prev = K
    ga = ca = 0.0
    for r in REGIOES:
        ga += out["regioes"][r]["ganho"]
        ca += out["regioes"][r]["custo"]
        out["regioes"][r]["ganho_acum"] = ga
        out["regioes"][r]["custo_acum"] = ca
    # outliers
    for r, Rg in out["regioes"].items():
        a, b = Rg["faixa"]
        if not (a <= Rg["nv_chefe"] <= b + 2):
            out["outliers"].append("%s: nível esperado no chefe %d fora da faixa da região (%d–%d)" % (Rg["nome"], Rg["nv_chefe"], a, b))
        for c in Rg["comuns"]:
            if not (META_GOLPES[0] - 0.5 <= c["golpes"] <= META_GOLPES[1] + 1.5):
                out["outliers"].append("%s: %s Nv.%d cai em %.1f golpes (meta %g–%g)" % (Rg["nome"], c["nome"], c["nivel"], c["golpes"], *META_GOLPES))
            if not (META_AGUENTA[0] <= c["aguenta"] <= META_AGUENTA[1] + 2):
                out["outliers"].append("%s: herói aguenta %.1f golpes de %s (meta %g–%g)" % (Rg["nome"], c["aguenta"], c["nome"], *META_AGUENTA))
        for bo in Rg["chefes"]:
            lo, hi = META_CHEFE_S if bo["tipo"] == "chefe" else (35.0, 100.0)
            if not (lo <= bo["tempo"] <= hi):
                out["outliers"].append("%s: %s dura ~%.0f s (meta %g–%g s)" % (Rg["nome"], bo["nome"], bo["tempo"], lo, hi))
        for al in Rg["aliados"]:
            if not (META_ALIADO[0] - 0.03 <= al["frac"] <= META_ALIADO[1] + 0.05):
                out["outliers"].append("%s: aliados fazem %.0f%% do dano em %s (meta 20–30%%)" % (Rg["nome"], 100 * al["frac"], al["nome"]))
        if Rg["ganho_acum"] > 1.3 * Rg["custo_acum"] or Rg["ganho_acum"] < 0.75 * Rg["custo_acum"]:
            out["outliers"].append("%s: fragmentos acumulados %.0f x gasto de referência acumulado %.0f (meta 0,75–1,3x)" % (
                Rg["nome"], Rg["ganho_acum"], Rg["custo_acum"]))
        if Rg["kit"]["frascos"] > 3:
            out["outliers"].append("%s: %d Frascos de Seiva acumulados" % (Rg["nome"], Rg["kit"]["frascos"]))
    return out


# ------------------------------------------------------------------ relatório
def nome_item(D, it):
    return D.items.get(it, {}).get("nome", it) if it else "—"


def resumo(D, A):
    linhas = []
    for r in REGIOES:
        g = A["regioes"][r]
        gol = [c["golpes"] for c in g["comuns"]]
        agu = [c["aguenta"] for c in g["comuns"]]
        chefe = [b for b in g["chefes"] if b["tipo"] == "chefe"]
        linhas.append({"regiao": g["nome"], "faixa": "%d–%d" % tuple(g["faixa"]), "entrada": g["entrada"],
                       "chefe": g["nv_chefe"], "golpes": (min(gol), max(gol)), "aguenta": (min(agu), max(agu)),
                       "tempo_chefe": chefe[0]["tempo"] if chefe else 0.0,
                       "aliados": (min([a["frac"] for a in g["aliados"]] or [0]), max([a["frac"] for a in g["aliados"]] or [0])),
                       "ganho": g["ganho_acum"], "custo": g["custo_acum"]})
    return linhas


def tabela(cab, linhas):
    s = "| " + " | ".join(cab) + " |\n|" + "|".join("---" for _ in cab) + "|\n"
    for l in linhas:
        s += "| " + " | ".join(str(x) for x in l) + " |\n"
    return s


def faixa(t, fmt="%.1f"):
    return (fmt + "–" + fmt) % t if abs(t[0] - t[1]) > 1e-6 else fmt % t[0]


def relatorio(D, A, antes=None, A_antes=None):
    md = []
    md.append("# Equilíbrio e curva de dificuldade — Regiões 1–5\n")
    md.append("Gerado por `python3 tools/balanco.py` (não edite à mão). Fórmulas replicadas de `scripts/game.gd`, "
              "`scripts/enemy.gd`, `scripts/player.gd`, `scripts/ally.gd` e `scripts/ally_beast.gd`; dados de `data/*.json`.\n")
    md.append("Dificuldade de referência: **%s** (dano inimigo x%.2f, avisos x%.2f). Modos: %s.\n" % (
        DIF_PADRAO.capitalize(), DIFICULDADES[DIF_PADRAO][0], DIFICULDADES[DIF_PADRAO][1],
        ", ".join("%s x%.2f/avisos x%.2f" % (k.replace("historia", "história").capitalize(), v[0], v[1]) for k, v in DIFICULDADES.items())))
    md.append("\n## Metas\n")
    md.append("- Inimigo comum cai em **%g–%g golpes** do herói no nível esperado.\n" % META_GOLPES)
    md.append("- Herói aguenta **%g–%g golpes** comuns (Aventura).\n" % META_AGUENTA)
    md.append("- Chefe de região: **%g–%g s** para quem aprende o padrão (minichefes 35–100 s).\n" % META_CHEFE_S)
    md.append("- Aliados (Bruna/Ravi e criaturas) fazem **20–30%** do dano do grupo nos contratos.\n")
    md.append("- Frasco de Seiva e Sementes de Vida contam, mas sem acumular demais; fragmentos sem sobra excessiva.\n")
    md.append("\n## Hipóteses do modelo\n")
    md.append("- Nível esperado (jogador típico): XP de %.1f passadas pelos inimigos dos mapas da região (ida e volta, atalhos; "
              "comuns reaparecem ao descansar) + minichefes + %d%% do XP dos contratos da faixa de nível (recompensa e inimigos). "
              "Também se mostra o \"sem contratos\" e o \"com todos os contratos\". O chefe da região conta para a região seguinte.\n" % (
                  PASSADAS, FRACAO_CONTRATOS * 100))
    md.append("- Tempo de chefe calibrado com as lutas do bot do e2e (o bot luta como quem já conhece o padrão: esquiva os avisos e "
              "bate nas janelas); a luta real de quem aprende inclui tentativas, por isso a meta começa em 60 s.\n")
    md.append("- Piso de dificuldade: o bot do e2e joga como um jogador mínimo (sem contratos, espada inicial ou Lança, "
              "pouca armadura) e só gasta talentos/compra tônicos ao chegar a um vilarejo (`jogador_sensato`). Os números "
              "dos chefes ficam no ponto em que esse jogador ainda vence; por isso os golpes de chefe que o jogador típico "
              "aguenta ficam acima dos dos comuns — a dificuldade do chefe está no padrão e na duração, não em um golpe.\n")
    md.append("- O nível no chefe pode passar até 2 da faixa da região: o guardião é o degrau para a região seguinte. "
              "O Salão da Harmonia (pós-jogo, Provas da Harmonia) fica fora da curva principal.\n")
    md.append("- Talentos: um ponto a cada 3 níveis, metade em Espada e metade em Resistência.\n")
    md.append("- Equipamento: melhor peça obtível até a região (baús, altares, diálogos, contratos, receitas liberadas); "
              "forja +%d/+%d/+%d (Minas/Pântano/Fortaleza). No meio da região: %d%% do kit novo e %d%% do kit do fim da região anterior.\n" % (
                  FORJA_NIVEL["minas"], FORJA_NIVEL["pantano"], FORJA_NIVEL["fortaleza"], PESO_KIT_NOVO * 100, (1 - PESO_KIT_NOVO) * 100))
    md.append("- \"Golpes\" = vida ÷ ataque do herói (golpe simples, 1,0x). TTK usa o combo (%.2f x ataque/s) com %d%% do tempo batendo "
              "+ a criatura representativa (%d%% do tempo). Chefes: %d%% do tempo nas janelas x multiplicador médio de exposição.\n" % (
                  ATK_POR_S, UPTIME_COMUM * 100, UPTIME_CRIATURA * 100, UPTIME_CHEFE * 100))
    md.append("- Aliados: golpe de escudo (Bruna, 1,2x/1,19 s), disco (Ravi, 1,1x/1,39 s), criaturas deles a %.0f%% do ataque da espécie a cada 1,2 s; %d%% do tempo em combate.\n" % (ALLY_BEAST_ATK * 100, UPTIME_ALIADO * 100))
    # resumo
    md.append("\n## Resumo da curva\n")
    cab = ["Região", "Faixa", "Nv. entrada", "Nv. no chefe", "Golpes p/ derrubar comum", "Golpes que aguenta", "Chefe (s)", "Aliados (% dano)", "Fragmentos acumulados / gasto ref."]
    rows = []
    for l in resumo(D, A):
        rows.append([l["regiao"], l["faixa"], l["entrada"], l["chefe"], faixa(l["golpes"]), faixa(l["aguenta"]),
                     "%.0f" % l["tempo_chefe"], "%s%%" % faixa((l["aliados"][0] * 100, l["aliados"][1] * 100), "%.0f"),
                     "%.0f / %.0f" % (l["ganho"], l["custo"])])
    md.append(tabela(cab, rows))
    if A_antes is not None:
        md.append("\n### Antes (%s) → depois\n" % antes)
        rows = []
        for a, b in zip(resumo(D, A_antes), resumo(D, A)):
            rows.append([b["regiao"], "%d → %d" % (a["chefe"], b["chefe"]), "%s → %s" % (faixa(a["golpes"]), faixa(b["golpes"])),
                         "%s → %s" % (faixa(a["aguenta"]), faixa(b["aguenta"])), "%.0f → %.0f" % (a["tempo_chefe"], b["tempo_chefe"]),
                         "%s → %s%%" % (faixa((a["aliados"][0] * 100, a["aliados"][1] * 100), "%.0f"), faixa((b["aliados"][0] * 100, b["aliados"][1] * 100), "%.0f")),
                         "%.0f/%.0f → %.0f/%.0f" % (a["ganho"], a["custo"], b["ganho"], b["custo"])])
        md.append(tabela(["Região", "Nv. no chefe", "Golpes p/ derrubar", "Golpes que aguenta", "Chefe (s)", "Aliados", "Frag. ganho/gasto"], rows))
        md.append("\nOutliers antes: %d · depois: %d\n" % (len(A_antes["outliers"]), len(A["outliers"])))
    # por região
    for r in REGIOES:
        g = A["regioes"][r]
        K = g["kit"]
        md.append("\n## %s (níveis %d–%d)\n" % (g["nome"], g["faixa"][0], g["faixa"][1]))
        X = g["xp"]
        md.append("**XP**: caminho %d, minichefes %d, contratos %d, chefe %d → nível de entrada %d, no chefe %d (sem contratos: %d), "
                  "com todos os contratos: %d; meio da região %d.\n\n" % (X["caminho"], X["mini"], X["contratos"], X["chefe"], g["entrada"], g["nv_chefe"], g["nv_chefe_min"], g["nv_chefe_max"], g["nv_meio"]))
        md.append("**Kit esperado no chefe**: %s, %s, %s, forja +%d, %d Sementes de Vida, %d Frasco(s) de Seiva. "
                  "Herói no chefe: ataque %.0f, vida %.0f, redução %.0f%%. Meio da região: ataque %.1f, vida %.0f, redução %.0f%%; "
                  "criatura %s %.1f dano/s, herói %.1f dano/s.\n\n" % (
                      nome_item(D, K["arma"]), nome_item(D, K["protecao"]), nome_item(D, K["amuleto"]), K["forja"], K["sementes"], K["frascos"],
                      g["atk_chefe"], g["hp_chefe"], g["red_chefe"] * 100, g["atk_meio"], g["hp_meio"], g["red_meio"] * 100,
                      D.species[g["criatura"]]["nome"], g["cdps"], g["hdps"]))
        rows = []
        for c in sorted(g["comuns"], key=lambda c: c["hp"]):
            rows.append([c["nome"], c["nivel"], c["n"], "%.0f" % c["hp"], "%.1f" % c["golpes"], "%.1f" % c["ttk"], "%.0f" % c["dano"],
                         "%.1f" % c["recebido"], "%.1f" % c["aguenta"], "%.1f" % c["cri_aguenta"]])
        md.append(tabela(["Inimigo", "Nv", "Qtd", "Vida", "Golpes p/ derrubar", "TTK (s)", "Dano base", "Dano recebido", "Golpes que aguenta", "Criatura aguenta"], rows))
        if g["chefes"]:
            md.append("\n")
            rows = []
            for b in g["chefes"]:
                rows.append([b["nome"], b["tipo"], b["nivel"], "%.0f" % b["hp"], "%.0f" % b["golpes"], "%.0f" % b["tempo"],
                             "%.0f" % b["maior"], "%.1f" % b["aguenta"], "%.2f" % CHEFE_EFETIVO.get(b["id"], 1.0)])
            md.append(tabela(["Chefe", "Tipo", "Nv. herói", "Vida", "Golpes", "Luta (s)", "Maior golpe", "Golpes que aguenta", "Exposição média"], rows))
        if g["aliados"]:
            md.append("\n")
            rows = [[a["nome"], a["nivel"], a["aliados"], "%.1f" % a["heroi"], "%.1f" % a["criatura"], "%.1f" % a["aliado"],
                     "%.0f%%" % (100 * a["frac"]), "%.0f" % a["hp_inimigos"], "%.0f" % a["tempo"]] for a in g["aliados"]]
            md.append(tabela(["Contrato em grupo", "Nv", "Aliados", "Herói dano/s", "Criatura dano/s", "Aliados dano/s", "% aliados", "Vida inimiga total", "Tempo (s)"], rows))
        md.append("\n")
        rows = [[c["nome"], c["tipo"], c["nivel"], c["xp"], "%.0f%%" % c["xp_pct"], c["frag"], c["itens"]] for c in g["contratos"]]
        md.append(tabela(["Contrato", "Tipo", "Nv", "XP", "XP (% de um nível)", "Fragmentos", "Itens"], rows))
        FR = g["frag"]
        md.append("\n**Fragmentos**: inimigos %.0f (%.1f passadas, média), baús %d, diálogos %d, chefes %d, contratos %d → **%.0f** "
                  "(acumulado %.0f). Gasto de referência: receitas novas de equipamento pela metade, acessórios de criatura, forja do kit nos "
                  "3 espaços (materiais que faltam comprados pela metade), %d tônicos e %d selos refinados, acessórios de loja%s → **%.0f** "
                  "(acumulado %.0f).\n" % (
                      FR["inimigos"], PASSADAS, FR["baus"], FR["dialogos"], FR["chefes"], FR["contratos"], g["ganho"], g["ganho_acum"],
                      CUSTO_CONSUMO, CUSTO_CONSUMO, " e as peças míticas (Lâmina da Ruína e Selo Ancestral)" if r in CUSTO_RESERVA else "",
                      g["custo"], g["custo_acum"]))
        if g["selvagens"]:
            md.append("\n**Captura** (35%% de vida, nível %d do herói): %s.\n" % (g["nv_meio"], "; ".join(
                "%s Nv.%d %.0f%% (refinado %.0f%%)" % (D.species[sp]["nome"], v[0], v[1] * 100, v[2] * 100) for sp, v in g["selvagens"].items())))
    md.append("\n## Pontos fora da faixa\n")
    if A["outliers"]:
        for o in A["outliers"]:
            md.append("- %s\n" % o)
    else:
        md.append("- Nenhum: todos os alvos da curva dentro da faixa (com a tolerância do modelo).\n")
    return "".join(md)


ALVO_GOLPES = {"floresta": 3.5, "minas": 3.4, "pantano": 3.5, "fortaleza": 3.8, "catedral": 4.0}
ALVO_AGUENTA = {"floresta": 10.0, "minas": 10.5, "pantano": 10.5, "fortaleza": 9.0, "catedral": 8.5}


def sugerir(D, A):
    """Vida e dano-base (antes da escala por nível do mapa) que acertariam o centro das metas."""
    mult = DIFICULDADES[DIF_PADRAO][0]
    for r in REGIOES:
        g = A["regioes"][r]
        print("== %s (nível meio %d, ataque %.1f, vida %.0f, redução %.0f%%)" % (g["nome"], g["nv_meio"], g["atk_meio"], g["hp_meio"], g["red_meio"] * 100))
        for c in g["comuns"]:
            hp, dano, nv = inimigo_stats(D, c["kind"], c["nivel"])
            e = D.enemies[c["kind"]]
            fhp = hp / float(e["hp"])
            fd = dano / float(e["dano"])
            hp_alvo = ALVO_GOLPES[r] * g["atk_meio"] / fhp
            dano_alvo = g["hp_meio"] / ALVO_AGUENTA[r] / (mult * (1.0 - g["red_meio"])) / fd
            print("  %-22s Nv%2d vida %4d -> %4.0f   dano %3d -> %4.1f" % (c["nome"], nv, e["hp"], hp_alvo, e["dano"], dano_alvo))
        for b in g["chefes"]:
            alvo = 100.0 if b["tipo"] == "chefe" else 60.0
            print("  %-22s vida %5.0f -> %5.0f (alvo %d s)   maior golpe %3.0f aguenta %.1f -> x%.2f para 4,5" % (
                b["nome"], b["hp"], b["hp"] * alvo / b["tempo"], alvo, b["maior"], b["aguenta"], b["aguenta"] / 4.5))


def exportar_curva(A):
    """tests/curva_regioes.json: nível e kit do meio de cada região para o teste -- --unit conferir a curva
    com as funções reais de Game (ataque, vida, redução) e de Enemy (escala por nível do mapa)."""
    out = {"_doc": "Gerado por tools/balanco.py; usado por tests/e2e_bot.gd (run_unit). Não edite à mão.",
           "metas": {"golpes": list(META_GOLPES), "aguenta": list(META_AGUENTA), "tolerancia_golpes": [0.5, 1.5],
                     "tolerancia_aguenta": [0.5, 2.5]}, "regioes": {}}
    for r in REGIOES:
        g = A["regioes"][r]
        K = g["kit_antes"]
        out["regioes"][r] = {"nivel": g["nv_meio"], "arma": K["arma"], "protecao": K["protecao"], "amuleto": K["amuleto"],
                              "forja": K["forja"], "sementes": K["sementes"],
                              "comuns": sorted({"%s:%s" % (c["kind"], c["nivel"]) for c in g["comuns"]})}
    with open(os.path.join(RAIZ, "tests", "curva_regioes.json"), "w", encoding="utf-8") as f:
        f.write(json.dumps(out, indent=1, ensure_ascii=False) + "\n")


def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--antes", help="ref git com os dados antigos para comparação (ex.: HEAD~3)")
    ap.add_argument("--stdout", action="store_true")
    ap.add_argument("--checar", action="store_true")
    ap.add_argument("--sugerir", action="store_true", help="imprime vida/dano-base que acertariam o centro das metas")
    ap.add_argument("--saida", default=os.path.join(RAIZ, "docs", "BALANCO.md"))
    args = ap.parse_args()
    A0 = analisar(Dados(args.antes)) if args.antes else None
    D = Dados()
    A = analisar(D)
    md = relatorio(D, A, args.antes, A0)
    if args.stdout:
        print(md)
    else:
        with open(args.saida, "w", encoding="utf-8") as f:
            f.write(md)
        print("escrito %s (%d outliers)" % (os.path.relpath(args.saida, RAIZ), len(A["outliers"])))
        exportar_curva(A)
    if args.sugerir:
        sugerir(D, A)
    if args.checar and A["outliers"]:
        for o in A["outliers"]:
            print("FORA:", o)
        sys.exit(1)


if __name__ == "__main__":
    main()
