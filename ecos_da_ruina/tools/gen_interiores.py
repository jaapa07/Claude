#!/usr/bin/env python3
"""Interiores das casas da Vila Lúmen (salas desenhadas à mão). Saída: data/maps/casa_*.json"""
import json, os
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
OUT = os.path.join(ROOT, "data", "maps")

def room(mid, name, rw, rh, floor="1", wall="5"):
    W, H = 30, 17
    g = [["v"] * W for _ in range(H)]
    x0 = (W - rw) // 2
    y0 = (H - rh) // 2
    for j in range(y0 - 2, y0 + rh + 1):
        for i in range(x0 - 1, x0 + rw + 1):
            inside = x0 <= i < x0 + rw and y0 <= j < y0 + rh
            g[j][i] = floor if inside else wall
    door_x = x0 + rw // 2 - 1
    g[y0 + rh][door_x] = "7"; g[y0 + rh][door_x + 1] = "7"
    return {"id": mid, "name": name, "music": "vila", "region": "floresta", "safe": True, "w": W, "h": H, "g": g, "x0": x0, "y0": y0,
            "spawns": {"entrada": [door_x, y0 + rh - 1]}, "entities": [], "conditional": [], "puzzles": {},
            "door": (door_x, y0 + rh)}

def prop(m, frame, x, y, dialog=None, solid=True, **kw):
    e = {"type": "prop", "id": "%s_p%d_%d" % (m["id"], x, y), "sheet": "moveis", "frame": frame, "x": x, "y": y, "solid": solid}
    if dialog: e["dialog"] = dialog
    e.update(kw)
    m["entities"].append(e)

def rug(m, x, y, w, h):
    for j in range(h):
        for i in range(w):
            m["g"][y + j][x + i] = "4"

def finish(m, back_spawn):
    dx, dy = m["door"]
    m["entities"].append({"type": "exit", "x": dx, "y": dy, "w": 2, "h": 1, "to": "vila_lumen", "spawn": back_spawn})
    m["tiles"] = ["".join(r) for r in m.pop("g")]
    for k in ("x0", "y0", "door"):
        m.pop(k)
    with open(os.path.join(OUT, m["id"] + ".json"), "w", encoding="utf-8") as f:
        json.dump(m, f, ensure_ascii=False)

# ---- Casa da Anciã Maru: estudo de ervas e livros
m = room("casa_maru", "Casa da Anciã Maru", 12, 7)
x0, y0 = 9, 5
rug(m, x0 + 4, y0 + 2, 4, 3)
prop(m, 4, x0 + 1, y0, "estante_maru")
prop(m, 4, x0 + 3, y0, "estante_maru")
prop(m, 6, x0 + 9, y0, None)
prop(m, 17, x0 + 10, y0 + 3, "caldeirao")
prop(m, 16, x0 + 1, y0 + 4, None)
prop(m, 2, x0 + 6, y0 + 3, None)
prop(m, 3, x0 + 5, y0 + 3, None, solid=False)
prop(m, 0, x0 + 10, y0 + 5, "cama")
m["entities"].append({"type": "npc", "id": "lia", "sprite": "npc_kid", "dialog": "lia", "x": x0 + 8, "y": y0 + 2, "nome": "Lia"})
finish(m, "from_casa_maru")

# ---- Loja da Ysa (estoque com o Dario)
m = room("loja_ysa", "Loja da Ysa", 12, 7, floor="1")
rug(m, x0 + 3, y0 + 3, 6, 2)
prop(m, 7, x0 + 5, y0 + 1, None)
prop(m, 7, x0 + 7, y0 + 1, None)
prop(m, 8, x0 + 1, y0, None)
prop(m, 8, x0 + 10, y0, None)
prop(m, 10, x0, y0 + 5, None)
prop(m, 11, x0 + 11, y0 + 5, None)
prop(m, 12, x0 + 11, y0 + 2, None)
m["entities"].append({"type": "npc", "id": "dario", "sprite": "npc_ranger", "dialog": "dario", "x": x0 + 6, "y": y0, "nome": "Dario"})
finish(m, "from_loja_ysa")

# ---- Casa dos Corvelo: abandonada antes do Cervo, viva depois
m = room("casa_corvelo", "Casa dos Corvelo", 12, 7, floor="1", wall="6")
m["conditional"].append({"if": "cervo_morto", "chars": {"6": "5"}})
prop(m, 1, x0 + 1, y0 + 1, None)
prop(m, 14, x0 + 4, y0, "berco")
prop(m, 18, x0 + 8, y0 + 3, "carta_corvelo")
prop(m, 19, x0 + 10, y0 + 1, None, unless_flag="cervo_morto")
prop(m, 15, x0 + 10, y0 + 5, None, if_flag="cervo_morto")
prop(m, 6, x0 + 6, y0, None, if_flag="cervo_morto")
prop(m, 5, x0 + 6, y0, None, unless_flag="cervo_morto")
prop(m, 2, x0 + 4, y0 + 4, None, if_flag="cervo_morto")
m["entities"].append({"type": "npc", "id": "corvelo_casa", "sprite": "npc_corvelo", "dialog": "corvelo_casa", "x": x0 + 7, "y": y0 + 4, "nome": "Dona Corvelo", "if_flag": "cervo_morto"})
finish(m, "from_casa_corvelo")

# ---- Casa e oficina do Tobi
m = room("casa_tobi", "Oficina do Tobi", 12, 7, floor="3")
prop(m, 9, x0 + 5, y0 + 2, None, forge=True)
prop(m, 6, x0 + 9, y0, None)
prop(m, 10, x0, y0, None)
prop(m, 10, x0 + 1, y0, None)
prop(m, 11, x0 + 11, y0 + 5, None)
prop(m, 13, x0 + 11, y0 + 1, None)
prop(m, 0, x0, y0 + 5, "cama")
finish(m, "from_casa_tobi")
print("interiores gerados")
