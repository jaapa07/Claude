#!/usr/bin/env python3
"""Ajustes numéricos do equilíbrio das Regiões 1–5 (ver docs/BALANCO.md, gerado por tools/balanco.py).

Idempotente: define valores absolutos nos JSON de data/. Os danos de chefe são escritos como
"valor original x multiplicador" (tabelas *_BASE abaixo), então rodar de novo não acumula.
Uso: python3 tools/ajustes_balanco.py && python3 tools/balanco.py
"""
import json
import os

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def load(n):
    with open(os.path.join(RAIZ, "data", n + ".json"), encoding="utf-8") as f:
        return json.load(f)


def save(n, d, nl=True):
    with open(os.path.join(RAIZ, "data", n + ".json"), "w", encoding="utf-8") as f:
        f.write(json.dumps(d, indent=1, ensure_ascii=False) + ("\n" if nl else ""))


# ---------------------------------------------------------------- inimigos comuns: vida / dano-base / xp
# Dano-base antes da dificuldade (Aventura x0,75) e da escala por nível do mapa (+10%/nível; vida +14%/nível).
EN = {
    # Floresta (níveis 1–6): acolhedora
    "lobo":      {"hp": 54, "dano": 20, "xp": 16},
    "cogumelo":  {"hp": 52, "dano": 18, "xp": 12},
    "sentinela": {"hp": 88, "dano": 25, "xp": 30},
    # Minas (7–12)
    "mineiro":   {"hp": 110, "dano": 37},
    "lesma":     {"hp": 120, "dano": 40},
    "automato":  {"hp": 150, "dano": 48},
    # Pântano (13–18)
    "sapo":      {"hp": 180, "dano": 62},
    "espectro":  {"hp": 150, "dano": 64},
    "planta":    {"hp": 165, "dano": 62},
    # Fortaleza (19–24)
    "arqueiro":  {"hp": 220, "dano": 95},
    "lanceiro":  {"hp": 270, "dano": 120},
    "armadura":  {"hp": 320, "dano": 115},
    # Catedral (25–30)
    "escriba":   {"hp": 250, "dano": 100},
    "sentinela_prisma": {"hp": 320, "dano": 140},
    "fragmento": {"hp": 210, "dano": 100},
    # Domadores (contratos; escalam pelo nível do contrato)
    "domador":   {"hp": 76, "dano": 20, "xp": 15},
    "domadora":  {"hp": 66, "dano": 18, "xp": 15},
    "vesna":     {"hp": 520, "dano": 32, "xp": 60},
}
# ---------------------------------------------------------------- chefes
BOSS_HP = {"lenhador": 700, "cervo": 1700, "vigia": 1200, "ferreiro": 2400, "barqueiro": 1250, "bruxa": 2800,
           "gemeos": 1150, "cavaleiro": 3700, "arauto": 2200, "rei": 5000}
BOSS_DANO_MULT = {"lenhador": 1.8, "cervo": 2.2, "vigia": 3.0, "ferreiro": 2.0, "barqueiro": 1.8, "bruxa": 3.5,
                  "gemeos": 5.0, "cavaleiro": 4.8, "arauto": 4.0, "rei": 4.0}
BOSS_DANO_BASE = {  # valores originais
    "cervo": {"dano_investida": 24, "dano_raizes": 18, "dano_contato": 10},
    "vigia": {"dano_golpe": 18, "dano_escoria": 14},
    "ferreiro": {"dano_onda": 16, "dano_golpe": 18, "dano_grande": 30, "dano_queda": 8},
    "gemeos": {"dano_onda": 22, "dano_golpe": 24, "dano_corrente": 26},
    "cavaleiro": {"dano_estocada": 34, "dano_corte": 26},
    "barqueiro": {"dano_remo": 20, "dano_onda": 14},
    "bruxa": {"dano_orbe": 13, "dano_poca": 9, "dano_queda": 8},
    "arauto": {"dano_raiz": 24, "dano_corte": 26, "dano_selo": 22},
    "rei": {"dano_raiz": 26, "dano_martelo": 26, "dano_orbe": 20, "dano_estocada": 32, "dano_queda": 8},
}
ENEMY_DANO_BASE = {"lenhador": 24, "cervo": 24, "vigia": 18, "ferreiro": 18, "gemeos": 22, "cavaleiro": 30,
                   "barqueiro": 20, "bruxa": 14, "copia": 8, "arauto": 22, "rei": 26}
BOSS_REC = {  # xp / fragmentos: o guardião vale ~1 nível; minichefe ~0,5
    "lenhador": (50, 40), "cervo": (160, 100), "vigia": (160, 60), "ferreiro": (300, 140),
    "barqueiro": (220, 80), "bruxa": (400, 160), "gemeos": (300, 80), "cavaleiro": (600, 180),
    "arauto": (400, 140), "rei": (1400, 350),
}
# ---------------------------------------------------------------- contratos: xp / fragmentos
# O XP de contrato era 140–225% de um nível cada (o herói chegava ao Cervo no nível 11). Agora vale ~10–30%;
# a recompensa principal são os itens (Sementes, Frascos, essências, itens-chave).
CT = {
    "caca_cogumelos": (15, 40), "caca_lobos": (20, 60), "saqueadores": (20, 50), "caca_sentinelas": (25, 80),
    "emboscada": (30, 90),
    "caca_lesmas": (30, 100), "ninhada": (40, 110), "caca_automatos": (50, 140), "vesna": (70, 200),
    "irmao_bruna": (50, 130),
    "caca_sapos": (60, 150), "contrabando": (80, 180), "mestre_ravi": (90, 200),
    "caca_lanceiros": (80, 150), "domadores_eclipse": (100, 180),
    "caca_escribas": (110, 180), "ultimas_correntes": (130, 200),
}
ITEMS = {"galhada_ossea": {"dano": 7, "desc": "Espada forjada com a galhada do Cervo. +7 de dano e alcance maior."},
         "pocao": {"cura": 60, "desc": "Restaura 60 de vida do herói. Tecla R."},
         "semente_vida": {"desc": "Cada semente aumenta a vida máxima em 10, para sempre. Há sementes escondidas sob pedras, em segredos e como recompensa de contratos."}}
FORGE_BONUS = {"arma": {"dano": 2}, "protecao": {"reducao": 0.03}, "amuleto": {"hp": 10}}


def main():
    en = load("enemies")
    for k, v in EN.items():
        en[k].update(v)
    for k, hp in BOSS_HP.items():
        en[k]["hp"] = hp
    for k, d in ENEMY_DANO_BASE.items():
        en[k]["dano"] = int(round(d * BOSS_DANO_MULT.get("bruxa" if k == "copia" else k, 2.0)))
    save("enemies", en)
    bo = load("bosses")
    for k, hp in BOSS_HP.items():
        bo[k]["hp"] = hp
    for k, ds in BOSS_DANO_BASE.items():
        for kk, v in ds.items():
            bo[k][kk] = int(round(v * BOSS_DANO_MULT[k]))
    for k, (xp, fr) in BOSS_REC.items():
        bo[k]["recompensa"]["xp"] = xp
        bo[k]["recompensa"]["frag"] = fr
    save("bosses", bo)
    ct = load("contracts")
    for k, (xp, fr) in CT.items():
        ct[k]["recompensa"]["xp"] = xp
        ct[k]["recompensa"]["fragmentos"] = fr
    save("contracts", ct)
    it = load("items")
    for k, v in ITEMS.items():
        it[k].update(v)
    save("items", it, nl=False)
    fo = load("forge")
    fo["bonus"] = FORGE_BONUS
    save("forge", fo)


if __name__ == "__main__":
    main()
