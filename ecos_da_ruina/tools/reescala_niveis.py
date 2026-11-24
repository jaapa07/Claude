#!/usr/bin/env python3
"""Reescala de níveis (aplicada UMA vez; guardada para referência — não rode de novo).

Pedido: subir de nível com menos frequência mantendo a curva de poder. A XP por nível passou de
20*n para 50 + 28*n (herói) e de 18*n para 45 + 25*n (criaturas). Cada nível antigo vira o nível novo
alcançado com a MESMA XP acumulada (tabela NOVO abaixo). Os ganhos por nível (herói, criaturas, aliados,
escala de inimigos por nível do mapa) foram multiplicados por ~1,27 para o poder em cada ponto da campanha
ficar igual. Tudo que depende de nível (evolução, habilidades, inimigos, contratos, selvagens nos geradores
de mapa, técnicas do herói) passa pela mesma tabela.
"""
import json
import os
import re

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MARCA = os.path.join(RAIZ, "tools", ".niveis_reescalados")

# nível antigo -> nível novo (mesma XP acumulada: 10*o*(o-1) na curva antiga)
NOVO = {1: 1, 2: 1, 3: 2, 4: 2, 5: 3, 6: 4, 7: 4, 8: 5, 9: 6, 10: 7, 11: 8, 12: 8, 13: 9, 14: 10, 15: 11, 16: 12,
        17: 12, 18: 13, 19: 14, 20: 15, 21: 16, 22: 16, 23: 17, 24: 18, 25: 19, 26: 20, 27: 20, 28: 21, 29: 22, 30: 23}
CRESC = 1.27     # ganho por nível novo = 1,27 x ganho por nível antigo


def nv(o):
    return NOVO[int(o)]


def load(n):
    with open(os.path.join(RAIZ, "data", n + ".json"), encoding="utf-8") as f:
        s = f.read()
    return json.loads(s), s.endswith("\n")


def save(n, d, nl):
    with open(os.path.join(RAIZ, "data", n + ".json"), "w", encoding="utf-8") as f:
        f.write(json.dumps(d, indent=1, ensure_ascii=False) + ("\n" if nl else ""))


def dados():
    en, nl = load("enemies")
    for k, e in en.items():
        if "nivel" in e:
            e["nivel"] = nv(e["nivel"])
    save("enemies", en, nl)
    sp, nl = load("species")
    for k, s in sp.items():
        for c in ("hp_cresc", "atk_cresc"):
            if c in s:
                s[c] = round(float(s[c]) * CRESC, 2)
        if s.get("evolucao"):
            s["evolucao"]["nivel"] = nv(s["evolucao"]["nivel"])
        for h in s.get("habilidades", []):
            h["nivel"] = nv(h["nivel"])
    save("species", sp, nl)
    ct, nl = load("contracts")
    for k, c in ct.items():
        c["nivel"] = nv(c["nivel"])
        for e in c.get("inimigos", []):
            if "nivel" in e:
                e["nivel"] = nv(e["nivel"])
            if "level" in e:
                e["level"] = nv(e["level"])
    save("contracts", ct, nl)
    rg, nl = load("regions")
    faixas = {"floresta": [1, 5], "minas": [5, 9], "pantano": [9, 13], "fortaleza": [14, 17], "catedral": [18, 22]}
    for k, f in faixas.items():
        rg[k]["nivel"] = f
    save("regions", rg, nl)
    # aliados (formato compacto): só os números de crescimento
    p = os.path.join(RAIZ, "data", "allies.json")
    s = open(p, encoding="utf-8").read()
    s = re.sub(r'"hp_nivel": ([\d.]+)', lambda m: '"hp_nivel": %g' % round(float(m.group(1)) * CRESC, 1), s)
    s = re.sub(r'"atk_nivel": ([\d.]+)', lambda m: '"atk_nivel": %g' % round(float(m.group(1)) * CRESC, 2), s)
    open(p, "w", encoding="utf-8").write(s)


def geradores():
    for g in ("gen_maps.py", "gen_regiao4.py", "gen_regiao5.py"):
        p = os.path.join(RAIZ, "tools", g)
        s = open(p, encoding="utf-8").read()
        s = re.sub(r"\blevel=(\d+)", lambda m: "level=%d" % nv(m.group(1)), s)
        s = re.sub(r"\bnivel=(\d+)\b(?! \+)", lambda m: "nivel=%d" % nv(m.group(1)), s)
        open(p, "w", encoding="utf-8").write(s)
    p = os.path.join(RAIZ, "tools", "dados_regiao5.py")
    s = open(p, encoding="utf-8").read()
    s = re.sub(r'"nivel": (\d+)', lambda m: '"nivel": %d' % nv(m.group(1)), s)
    s = re.sub(r'"(hp_cresc|atk_cresc)": ([\d.]+)', lambda m: '"%s": %g' % (m.group(1), round(float(m.group(2)) * CRESC, 2)), s)
    open(p, "w", encoding="utf-8").write(s)


if __name__ == "__main__":
    if os.path.exists(MARCA):
        raise SystemExit("já aplicado (tools/.niveis_reescalados); não rode duas vezes")
    dados()
    geradores()
    open(MARCA, "w").write("niveis reescalados por tools/reescala_niveis.py\n")
    print("ok")
