"""Biblioteca de animações autorais do REI DA PRAIA para o rig characterMedium (Kenney, CC0).
Cada clipe é uma lista de keyframes (tempo_s, pose). Poses são montadas com body(...),
que traduz parâmetros semânticos (graus) para rotações por osso no espaço do personagem.
Altura do personagem ~3.77 un; quadril em z=1.24."""

def body(lean=0, twist=0, side=0, chest=0, head=0, headTurn=0, headSide=0,
         lArm=(72, 0), rArm=(72, 0), lElbow=15, rElbow=15, lArmOut=0, rArmOut=0,
         lThigh=0, rThigh=0, lAbd=0, rAbd=0, lKnee=0, rKnee=0, lFoot=0, rFoot=0,
         hip=None, hipRot=None, lForeTwist=0, rForeTwist=0):
    """lArm=(abaixar, balançar p/ frente). lArmOut gira o braço para fora/dentro (eixo z)."""
    p = {}
    p['Spine'] = [('x', lean), ('y', side), ('z', twist)]
    p['Chest'] = [('x', chest)]
    p['Neck'] = [('x', head * 0.4)]
    p['Head'] = [('x', head * 0.6), ('y', headSide), ('z', headTurn)]
    p['LeftArm'] = [('y', lArm[0]), ('z', -lArmOut), ('x', -lArm[1])]
    p['RightArm'] = [('y', -rArm[0]), ('z', rArmOut), ('x', -rArm[1])]
    p['LeftForeArm'] = [('x', lForeTwist), ('z', -lElbow)]
    p['RightForeArm'] = [('x', rForeTwist), ('z', rElbow)]
    p['LeftUpLeg'] = [('y', -lAbd), ('x', -lThigh)]
    p['RightUpLeg'] = [('y', rAbd), ('x', -rThigh)]
    p['LeftLeg'] = [('x', lKnee)]
    p['RightLeg'] = [('x', rKnee)]
    p['LeftFoot'] = [('x', lFoot)]
    p['RightFoot'] = [('x', rFoot)]
    if hipRot:
        p['Hips'] = hipRot
    return p, hip


def K(t, pose):
    p, hip = pose
    return (t, p, hip)


def mirror_body(**kw):
    """Troca esquerda/direita dos parâmetros de body()."""
    m = {}
    for k, v in kw.items():
        if k.startswith('l') and k[1].isupper():
            m['r' + k[1:]] = v
        elif k.startswith('r') and k[1].isupper():
            m['l' + k[1:]] = v
        elif k in ('twist', 'side', 'headTurn', 'headSide'):
            m[k] = -v
        elif k == 'hip' and v:
            m[k] = (-v[0], v[1], v[2])
        elif k == 'hipRot' and v:
            m[k] = [(a, d if a == 'x' else -d) for a, d in v]
        else:
            m[k] = v
    return m

STAND = dict(lArm=(74, 0), rArm=(74, 0), lElbow=12, rElbow=12)


def cycle(phases, period):
    n = len(phases)
    keys = [K(i * period / n, body(**phases[i])) for i in range(n)]
    keys.append(K(period, body(**phases[0])))
    return keys


def run_cycle(amp=1.0, lean=12, period=0.62, arms_out=0, elbow=75, bounce=0.06):
    a = amp
    c1 = dict(lean=lean, twist=-6 * a, lThigh=38 * a, lKnee=18, rThigh=-28 * a, rKnee=75 * a, rFoot=10,
              lArm=(70, -32 * a), rArm=(70, 38 * a), lElbow=elbow, rElbow=elbow, lArmOut=arms_out, rArmOut=arms_out,
              hip=(0, 0, -bounce))
    c2 = dict(lean=lean, twist=0, lThigh=2, lKnee=25, rThigh=22 * a, rKnee=105 * a,
              lArm=(70, 0), rArm=(70, 0), lElbow=elbow, rElbow=elbow, lArmOut=arms_out, rArmOut=arms_out,
              hip=(0, 0, bounce))
    return cycle([c1, c2, mirror_body(**c1), mirror_body(**c2)], period)


def build():
    C = {}
    meta = {}

    # ---------------- locomoção ----------------
    C['idle'] = [K(0, body(**STAND, lean=3, lKnee=6, rKnee=6, lThigh=-3, rThigh=-3, hip=(0, 0, -0.02))),
                 K(1.0, body(lArm=(72, 3), rArm=(72, 3), lElbow=16, rElbow=16, lean=5, head=4, lKnee=8, rKnee=8, lThigh=-4, rThigh=-4, hip=(0, 0, -0.04))),
                 K(2.0, body(**STAND, lean=3, lKnee=6, rKnee=6, lThigh=-3, rThigh=-3, hip=(0, 0, -0.02)))]
    C['idle_ready'] = [K(0, body(lean=14, head=-8, lArm=(62, 18), rArm=(62, 18), lElbow=55, rElbow=55, lThigh=18, rThigh=18, lKnee=32, rKnee=32, lFoot=-12, rFoot=-12, lAbd=8, rAbd=8, hip=(0, 0, -0.12))),
                       K(0.4, body(lean=16, head=-8, lArm=(62, 20), rArm=(62, 20), lElbow=58, rElbow=58, lThigh=22, rThigh=22, lKnee=40, rKnee=40, lFoot=-14, rFoot=-14, lAbd=8, rAbd=8, hip=(0, 0, -0.17))),
                       K(0.8, body(lean=14, head=-8, lArm=(62, 18), rArm=(62, 18), lElbow=55, rElbow=55, lThigh=18, rThigh=18, lKnee=32, rKnee=32, lFoot=-12, rFoot=-12, lAbd=8, rAbd=8, hip=(0, 0, -0.12)))]
    C['idle_tired'] = [K(0, body(lean=42, head=-25, lArm=(55, 45), rArm=(55, 45), lElbow=20, rElbow=20, lThigh=22, rThigh=22, lKnee=35, rKnee=35, lFoot=-12, rFoot=-12, lAbd=6, rAbd=6, hip=(0, 0.05, -0.16))),
                       K(0.6, body(lean=46, head=-22, lArm=(55, 48), rArm=(55, 48), lElbow=22, rElbow=22, lThigh=22, rThigh=22, lKnee=37, rKnee=37, lFoot=-12, rFoot=-12, lAbd=6, rAbd=6, hip=(0, 0.05, -0.18))),
                       K(1.2, body(lean=42, head=-25, lArm=(55, 45), rArm=(55, 45), lElbow=20, rElbow=20, lThigh=22, rThigh=22, lKnee=35, rKnee=35, lFoot=-12, rFoot=-12, lAbd=6, rAbd=6, hip=(0, 0.05, -0.16)))]
    C['walk'] = run_cycle(amp=0.55, lean=3, period=1.0, elbow=15, bounce=0.03)
    C['jog'] = run_cycle(amp=0.8, lean=8, period=0.7, elbow=60, bounce=0.05)
    C['run'] = run_cycle(amp=1.0, lean=12, period=0.62, elbow=75)
    C['sprint'] = run_cycle(amp=1.25, lean=22, period=0.5, elbow=85, bounce=0.08)
    C['run_airplane'] = run_cycle(amp=0.9, lean=10, period=0.6, elbow=5, arms_out=0)
    for k in C['run_airplane']:
        p = k[1]
        p['LeftArm'] = [('y', -2), ('x', 0)]
        p['RightArm'] = [('y', 2), ('x', 0)]
        p['Spine'] = [('x', 10), ('y', 14 if k[0] < 0.3 else -14)]

    # ---------------- chutes e passes (pé direito) ----------------
    stance = dict(lean=6, lArm=(70, 0), rArm=(70, 0), lElbow=25, rElbow=25, lKnee=12, rKnee=12, lThigh=4, rThigh=4)
    C['shot'] = [K(0, body(**stance)),
                 K(0.18, body(lean=0, twist=18, side=-6, lArm=(40, 20), rArm=(62, -25), lElbow=35, rElbow=30, lThigh=10, lKnee=22, rThigh=-48, rKnee=95, rFoot=25, hip=(0, 0, -0.05))),
                 K(0.30, body(lean=-12, twist=-12, side=-4, lArm=(30, 10), rArm=(55, 35), lElbow=30, rElbow=40, lThigh=8, lKnee=25, rThigh=62, rKnee=8, rFoot=30, hip=(0, 0, -0.02))),
                 K(0.46, body(lean=-6, twist=-22, lArm=(40, -10), rArm=(55, 40), lElbow=30, rElbow=45, lThigh=4, lKnee=12, rThigh=88, rKnee=8, rFoot=30, hip=(0, 0, 0.06))),
                 K(0.75, body(**stance))]
    meta['shot'] = {'contact': 0.30}
    C['pass_short'] = [K(0, body(**stance)),
                       K(0.14, body(lean=4, twist=10, lArm=(55, 10), rArm=(62, -10), lElbow=30, rElbow=30, lKnee=18, lThigh=8, rThigh=-25, rKnee=45, rAbd=-10)),
                       K(0.24, body(lean=2, twist=-8, lArm=(55, 0), rArm=(62, 15), lElbow=30, rElbow=30, lKnee=18, lThigh=8, rThigh=32, rKnee=10, rAbd=20, rFoot=10)),
                       K(0.36, body(lean=3, twist=-10, lArm=(60, 0), rArm=(62, 18), lElbow=30, rElbow=30, lKnee=14, rThigh=36, rKnee=12, rAbd=18)),
                       K(0.55, body(**stance))]
    meta['pass_short'] = {'contact': 0.24}
    C['pass_lob'] = [K(0, body(**stance)),
                     K(0.18, body(lean=-2, twist=14, lArm=(40, 15), rArm=(62, -20), lElbow=35, rElbow=30, lThigh=10, lKnee=22, rThigh=-40, rKnee=85, rFoot=20, hip=(0, 0, -0.06))),
                     K(0.30, body(lean=-20, twist=-6, lArm=(30, 15), rArm=(50, 30), lElbow=30, rElbow=40, lThigh=8, lKnee=28, rThigh=55, rKnee=20, rFoot=-10, hip=(0, 0.06, -0.08))),
                     K(0.46, body(lean=-12, lArm=(40, 0), rArm=(55, 25), lElbow=30, rElbow=40, lKnee=15, rThigh=70, rKnee=15)),
                     K(0.7, body(**stance))]
    meta['pass_lob'] = {'contact': 0.30}
    C['volley'] = [K(0, body(**stance)),
                   K(0.16, body(lean=-4, side=18, twist=24, lArm=(20, 0), rArm=(30, 0), lElbow=20, rElbow=20, lKnee=30, lThigh=12, rThigh=-20, rKnee=90, rAbd=30, hip=(0, 0, -0.06), hipRot=[('y', 14)])),
                   K(0.30, body(lean=0, side=34, twist=-18, lArm=(0, 0), rArm=(20, 20), lElbow=15, rElbow=30, lKnee=24, lThigh=8, rThigh=45, rKnee=12, rAbd=70, rFoot=25, hip=(0.08, 0, 0.04), hipRot=[('y', 24)])),
                   K(0.48, body(lean=4, side=20, twist=-26, lArm=(10, -10), rArm=(40, 30), lElbow=20, rElbow=30, lKnee=20, rThigh=40, rKnee=20, rAbd=40, hipRot=[('y', 12)])),
                   K(0.8, body(**stance))]
    meta['volley'] = {'contact': 0.30}
    C['header'] = [K(0, body(**stance)),
                   K(0.14, body(lean=10, lArm=(55, 20), rArm=(55, 20), lElbow=60, rElbow=60, lThigh=30, rThigh=30, lKnee=60, rKnee=60, lFoot=-20, rFoot=-20, hip=(0, 0, -0.3))),
                   K(0.30, body(lean=-22, head=-20, lArm=(20, 10), rArm=(20, 10), lElbow=50, rElbow=50, lThigh=-8, rThigh=10, lKnee=30, rKnee=50, lFoot=30, rFoot=30, hip=(0, 0, 0.6))),
                   K(0.42, body(lean=24, head=32, lArm=(30, -20), rArm=(30, -20), lElbow=40, rElbow=40, lThigh=10, rThigh=20, lKnee=40, rKnee=50, lFoot=20, rFoot=20, hip=(0, 0, 0.55))),
                   K(0.62, body(lean=10, lArm=(60, 0), rArm=(60, 0), lElbow=30, rElbow=30, lThigh=25, rThigh=25, lKnee=50, rKnee=50, hip=(0, 0, -0.22))),
                   K(0.8, body(**stance))]
    meta['header'] = {'contact': 0.42}
    C['diving_header'] = [K(0, body(lean=20, **{k: v for k, v in stance.items() if k != 'lean'})),
                          K(0.15, body(lean=30, lArm=(40, -30), rArm=(40, -30), lElbow=30, rElbow=30, lThigh=40, lKnee=70, rThigh=-20, rKnee=40, hip=(0, 0, -0.2))),
                          K(0.34, body(lean=8, head=-40, lArm=(20, -70), rArm=(20, -70), lElbow=10, rElbow=10, lThigh=-20, rThigh=-30, lKnee=20, rKnee=30, lFoot=40, rFoot=40, hip=(0, 0, -0.35), hipRot=[('x', 78)])),
                          K(0.62, body(lean=0, head=-55, lArm=(-10, -80), rArm=(-10, -80), lElbow=10, rElbow=10, lThigh=-5, rThigh=-10, lKnee=30, rKnee=40, lFoot=40, rFoot=40, hip=(0, 0, -0.98), hipRot=[('x', 90)])),
                          K(1.0, body(lean=0, head=-50, lArm=(10, -60), rArm=(10, -60), lElbow=40, rElbow=40, lKnee=20, rKnee=30, lFoot=40, rFoot=40, hip=(0, 0, -1.06), hipRot=[('x', 90)]))]
    meta['diving_header'] = {'contact': 0.34, 'endsLying': 'front'}
    C['bicycle_kick'] = [K(0, body(**stance)),
                         K(0.16, body(lean=-10, lArm=(50, 10), rArm=(50, 10), lElbow=40, rElbow=40, lThigh=30, rThigh=10, lKnee=60, rKnee=40, hip=(0, 0, -0.25))),
                         K(0.32, body(lean=-15, head=10, lArm=(0, 0), rArm=(0, 0), lElbow=20, rElbow=20, lThigh=70, rThigh=-10, lKnee=80, rKnee=60, rFoot=20, hip=(0, 0.2, 0.55), hipRot=[('x', -75)])),
                         K(0.46, body(lean=-10, head=25, lArm=(-10, 10), rArm=(-10, 10), lElbow=10, rElbow=10, lThigh=20, rThigh=130, lKnee=90, rKnee=5, rFoot=30, hip=(0, 0.3, 0.75), hipRot=[('x', -140)])),
                         K(0.62, body(lean=-5, head=30, lArm=(-20, 30), rArm=(-20, 30), lElbow=20, rElbow=20, lThigh=70, rThigh=90, lKnee=40, rKnee=10, hip=(0, 0.25, 0.3), hipRot=[('x', -120)])),
                         K(0.82, body(lean=10, head=30, lArm=(10, 60), rArm=(10, 60), lElbow=20, rElbow=20, lThigh=60, rThigh=40, lKnee=60, rKnee=40, hip=(0, 0.0, -0.95), hipRot=[('x', -88)])),
                         K(1.15, body(lean=6, head=20, lArm=(20, 70), rArm=(20, 70), lElbow=30, rElbow=30, lThigh=40, rThigh=30, lKnee=60, rKnee=50, hip=(0, 0.0, -1.05), hipRot=[('x', -90)]))]
    meta['bicycle_kick'] = {'contact': 0.46, 'endsLying': 'back'}
    C['scissor_kick'] = [K(0, body(**stance)),
                         K(0.16, body(lean=0, side=10, lArm=(40, 10), rArm=(40, 10), lElbow=30, rElbow=30, lThigh=30, lKnee=60, rThigh=10, rKnee=30, hip=(0, 0, -0.25))),
                         K(0.34, body(side=20, lArm=(-10, 0), rArm=(0, 0), lElbow=10, rElbow=10, lThigh=60, lKnee=70, rThigh=20, rKnee=40, rAbd=30, hip=(0.2, 0, 0.5), hipRot=[('y', -70)])),
                         K(0.48, body(side=25, lArm=(-10, 0), rArm=(10, 20), lElbow=10, rElbow=20, lThigh=10, lKnee=60, rThigh=110, rKnee=5, rFoot=30, hip=(0.3, 0, 0.55), hipRot=[('y', -85)])),
                         K(0.78, body(side=10, lArm=(-20, 20), rArm=(30, 20), lElbow=40, rElbow=20, lThigh=40, rThigh=40, lKnee=50, rKnee=40, hip=(0.3, 0, -0.95), hipRot=[('y', -88)])),
                         K(1.1, body(side=5, lArm=(-30, 20), rArm=(40, 20), lElbow=60, rElbow=30, lThigh=30, rThigh=40, lKnee=60, rKnee=50, hip=(0.3, 0, -1.05), hipRot=[('y', -90)]))]
    meta['scissor_kick'] = {'contact': 0.48, 'endsLying': 'side'}
    C['chest_control'] = [K(0, body(**stance)),
                          K(0.18, body(lean=-24, head=20, lArm=(35, -10), rArm=(35, -10), lElbow=30, rElbow=30, lArmOut=20, rArmOut=20, lKnee=25, rKnee=25, lThigh=10, rThigh=10, hip=(0, 0.05, -0.08))),
                          K(0.3, body(lean=-8, head=25, lArm=(45, -5), rArm=(45, -5), lElbow=30, rElbow=30, lKnee=15, rKnee=15)),
                          K(0.5, body(**stance))]
    meta['chest_control'] = {'contact': 0.18}
    jug_a = dict(lean=8, head=25, lArm=(55, 10), rArm=(55, 10), lElbow=60, rElbow=60, lThigh=2, lKnee=14, rThigh=8, rKnee=20, hip=(0, 0, -0.04))
    jug_b = dict(lean=6, head=30, lArm=(45, 15), rArm=(50, 5), lElbow=60, rElbow=60, lThigh=2, lKnee=14, rThigh=48, rKnee=60, rFoot=-15, hip=(0, 0, 0.0))
    C['juggle'] = [K(0, body(**jug_a)), K(0.18, body(**jug_b)), K(0.36, body(**jug_a)),
                   K(0.54, body(**mirror_body(**jug_b))), K(0.72, body(**jug_a))]
    meta['juggle'] = {'contact': 0.18, 'contact2': 0.54}
    C['sombrero_flick'] = [K(0, body(**stance)),
                           K(0.14, body(lean=4, head=10, lArm=(50, 15), rArm=(55, -10), lElbow=40, rElbow=40, lKnee=25, lThigh=10, rThigh=-30, rKnee=110, rFoot=40, hip=(0, 0, -0.06))),
                           K(0.28, body(lean=-6, head=-15, lArm=(40, 10), rArm=(50, 10), lElbow=40, rElbow=40, lKnee=15, rThigh=20, rKnee=40, rFoot=-25, hip=(0, 0, 0.12))),
                           K(0.45, body(lean=10, head=-20, lArm=(60, 20), rArm=(60, 20), lElbow=50, rElbow=50, lThigh=20, lKnee=40, rThigh=10, rKnee=60, hip=(0, 0, 0.05))),
                           K(0.65, body(**stance))]
    meta['sombrero_flick'] = {'contact': 0.28}

    # ---------------- defesa / contato ----------------
    C['slide_tackle'] = [K(0, body(lean=15, **{k: v for k, v in stance.items() if k != 'lean'})),
                         K(0.14, body(lean=5, lArm=(40, -10), rArm=(40, 20), lElbow=40, rElbow=40, lThigh=30, lKnee=50, rThigh=-10, rKnee=40, hip=(0, 0, -0.35), hipRot=[('x', -20)])),
                         K(0.3, body(lean=10, head=15, lArm=(30, 40), rArm=(55, 60), lElbow=20, rElbow=20, lThigh=82, lKnee=8, lFoot=-20, rThigh=40, rKnee=110, rAbd=10, hip=(0, 0, -0.92), hipRot=[('x', -55), ('y', -15)])),
                         K(0.6, body(lean=16, head=15, lArm=(30, 40), rArm=(55, 55), lElbow=20, rElbow=20, lThigh=78, lKnee=10, lFoot=-20, rThigh=40, rKnee=105, rAbd=10, hip=(0, 0, -0.95), hipRot=[('x', -55), ('y', -15)])),
                         K(0.95, body(lean=30, lArm=(60, 20), rArm=(60, 20), lElbow=40, rElbow=40, lThigh=60, lKnee=90, rThigh=20, rKnee=100, hip=(0, 0, -0.6), hipRot=[('x', -10)])),
                         K(1.2, body(**stance))]
    meta['slide_tackle'] = {'contact': 0.3}
    C['shoulder_charge'] = [K(0, body(**stance)),
                            K(0.15, body(lean=14, side=-22, twist=10, lArm=(80, -10), rArm=(55, 20), lElbow=40, rElbow=50, lThigh=20, lKnee=30, rThigh=-10, rKnee=30, hip=(0.05, 0, -0.08))),
                            K(0.3, body(lean=10, side=-16, twist=6, lArm=(80, -10), rArm=(55, 20), lElbow=40, rElbow=50, lKnee=20, rKnee=20)),
                            K(0.5, body(**stance))]
    C['fall_hit'] = [K(0, body(**stance)),
                     K(0.18, body(lean=-25, head=30, lArm=(20, -40), rArm=(20, -40), lElbow=20, rElbow=20, lThigh=20, rThigh=40, lKnee=20, rKnee=30, hip=(0, 0.1, -0.2), hipRot=[('x', -20)])),
                     K(0.45, body(lean=-10, head=20, lArm=(0, -20), rArm=(0, -20), lElbow=20, rElbow=20, lThigh=50, rThigh=70, lKnee=30, rKnee=40, hip=(0, 0.2, -0.8), hipRot=[('x', -70)])),
                     K(0.8, body(lean=0, head=10, lArm=(10, 30), rArm=(10, 30), lElbow=20, rElbow=20, lThigh=30, rThigh=45, lKnee=40, rKnee=50, hip=(0, 0.0, -1.05), hipRot=[('x', -90)]))]
    meta['fall_hit'] = {'endsLying': 'back'}
    C['get_up'] = [K(0, body(lean=0, head=10, lArm=(10, 30), rArm=(10, 30), lElbow=20, rElbow=20, lThigh=30, rThigh=45, lKnee=40, rKnee=50, hip=(0, 0.0, -1.05), hipRot=[('x', -90)])),
                   K(0.3, body(lean=40, head=10, lArm=(60, 40), rArm=(60, 40), lElbow=10, rElbow=10, lThigh=90, rThigh=60, lKnee=120, rKnee=90, hip=(0, 0.0, -0.95), hipRot=[('x', -40)])),
                   K(0.6, body(lean=45, lArm=(60, 30), rArm=(60, 30), lElbow=20, rElbow=20, lThigh=70, rThigh=40, lKnee=110, rKnee=70, hip=(0, 0, -0.6))),
                   K(0.9, body(**stance))]
    C['get_up_front'] = [K(0, body(lean=0, head=-50, lArm=(10, -60), rArm=(10, -60), lElbow=40, rElbow=40, lKnee=20, rKnee=30, lFoot=40, rFoot=40, hip=(0, 0, -1.06), hipRot=[('x', 90)])),
                         K(0.35, body(lean=-30, head=-30, lArm=(70, -60), rArm=(70, -60), lElbow=10, rElbow=10, lThigh=60, rThigh=20, lKnee=110, rKnee=60, hip=(0, 0, -0.85), hipRot=[('x', 50)])),
                         K(0.65, body(lean=30, lArm=(60, 10), rArm=(60, 10), lElbow=30, rElbow=30, lThigh=50, rThigh=30, lKnee=80, rKnee=60, hip=(0, 0, -0.45))),
                         K(0.95, body(**stance))]

    # ---------------- comemorações e emoções ----------------
    C['celebrate_knee_slide'] = [K(0, body(lean=10, lArm=(30, 20), rArm=(30, 20), lElbow=20, rElbow=20, lThigh=30, rThigh=-20, lKnee=40, rKnee=60)),
                                 K(0.3, body(lean=-28, head=-25, lArm=(-60, 10), rArm=(-60, 10), lElbow=10, rElbow=10, lArmOut=20, rArmOut=20, lThigh=0, rThigh=0, lKnee=92, rKnee=92, lFoot=60, rFoot=60, hip=(0, 0.1, -0.62))),
                                 K(1.0, body(lean=-34, head=-35, lArm=(-75, 15), rArm=(-75, 15), lElbow=20, rElbow=20, lArmOut=10, rArmOut=10, lThigh=-4, rThigh=-4, lKnee=95, rKnee=95, lFoot=60, rFoot=60, hip=(0, 0.12, -0.64))),
                                 K(1.8, body(lean=-30, head=-30, lArm=(-60, 10), rArm=(-60, 10), lElbow=10, rElbow=10, lArmOut=20, rArmOut=20, lThigh=0, rThigh=0, lKnee=92, rKnee=92, lFoot=60, rFoot=60, hip=(0, 0.1, -0.62)))]
    samba_a = dict(lean=4, side=10, twist=12, head=-4, lArm=(20, 40), rArm=(55, -20), lElbow=90, rElbow=60, lThigh=10, lKnee=30, rThigh=-6, rKnee=10, hip=(0.08, 0, -0.08))
    C['celebrate_samba'] = [K(0, body(**samba_a)), K(0.25, body(lean=2, lArm=(40, 20), rArm=(40, 20), lElbow=70, rElbow=70, lKnee=20, rKnee=20, hip=(0, 0, -0.02))),
                            K(0.5, body(**mirror_body(**samba_a))), K(0.75, body(lean=2, lArm=(40, 20), rArm=(40, 20), lElbow=70, rElbow=70, lKnee=20, rKnee=20, hip=(0, 0, -0.02))),
                            K(1.0, body(**samba_a))]
    C['celebrate_point_sky'] = [K(0, body(**stance)),
                                K(0.3, body(lean=-12, head=-35, lArm=(-150, 10), rArm=(-150, 10), lElbow=5, rElbow=5, lKnee=6, rKnee=6)),
                                K(1.0, body(lean=-16, head=-40, lArm=(-158, 6), rArm=(-158, 6), lElbow=0, rElbow=0, lKnee=4, rKnee=4)),
                                K(1.6, body(lean=-12, head=-35, lArm=(-150, 10), rArm=(-150, 10), lElbow=5, rElbow=5, lKnee=6, rKnee=6))]
    C['celebrate_fist'] = [K(0, body(**stance)),
                           K(0.2, body(lean=8, head=10, lArm=(70, 10), rArm=(40, 40), lElbow=30, rElbow=140, lThigh=20, lKnee=40, rKnee=20, hip=(0, 0, -0.1))),
                           K(0.45, body(lean=-6, head=-20, lArm=(70, 0), rArm=(-140, 0), lElbow=30, rElbow=20, lKnee=10, rKnee=10, hip=(0, 0, 0.35))),
                           K(0.7, body(lean=10, head=10, lArm=(70, 10), rArm=(40, 40), lElbow=30, rElbow=140, lThigh=20, lKnee=40, rKnee=20, hip=(0, 0, -0.1))),
                           K(0.95, body(lean=-6, head=-20, lArm=(70, 0), rArm=(-140, 0), lElbow=30, rElbow=20, lKnee=10, rKnee=10, hip=(0, 0, 0.35))),
                           K(1.2, body(lean=8, head=10, lArm=(70, 10), rArm=(40, 40), lElbow=30, rElbow=140, lThigh=20, lKnee=40, rKnee=20, hip=(0, 0, -0.1)))]
    C['celebrate_trophy'] = [K(0, body(lean=-8, head=-25, lArm=(-130, -20), rArm=(-130, -20), lElbow=40, rElbow=40, lArmOut=-25, rArmOut=-25)),
                             K(0.5, body(lean=-12, head=-30, lArm=(-140, -15), rArm=(-140, -15), lElbow=30, rElbow=30, lArmOut=-25, rArmOut=-25, hip=(0, 0, 0.25))),
                             K(1.0, body(lean=-8, head=-25, lArm=(-130, -20), rArm=(-130, -20), lElbow=40, rElbow=40, lArmOut=-25, rArmOut=-25))]
    C['sad'] = [K(0, body(lean=20, head=35, lArm=(80, 0), rArm=(80, 0), lElbow=5, rElbow=5, lKnee=5, rKnee=5)),
                K(1.5, body(lean=24, head=40, lArm=(82, 2), rArm=(82, 2), lElbow=5, rElbow=5, lKnee=6, rKnee=6, hip=(0, 0, -0.03))),
                K(3.0, body(lean=20, head=35, lArm=(80, 0), rArm=(80, 0), lElbow=5, rElbow=5, lKnee=5, rKnee=5))]
    C['hands_on_head'] = [K(0, body(**stance)),
                          K(0.3, body(lean=-10, head=-10, lArm=(-110, 30), rArm=(-110, 30), lElbow=150, rElbow=150, lArmOut=40, rArmOut=40)),
                          K(1.2, body(lean=-14, head=-15, lArm=(-112, 32), rArm=(-112, 32), lElbow=150, rElbow=150, lArmOut=40, rArmOut=40)),
                          K(1.6, body(**stance))]
    C['argue_ref'] = [K(0, body(lean=10, lArm=(55, 50), rArm=(55, 50), lElbow=40, rElbow=40, lArmOut=10, rArmOut=10)),
                      K(0.3, body(lean=14, head=10, lArm=(50, 60), rArm=(50, 60), lElbow=20, rElbow=20, lArmOut=-20, rArmOut=-20)),
                      K(0.6, body(lean=10, lArm=(55, 50), rArm=(55, 50), lElbow=40, rElbow=40, lArmOut=10, rArmOut=10)),
                      K(0.9, body(lean=14, head=10, lArm=(50, 60), rArm=(50, 60), lElbow=20, rElbow=20, lArmOut=-20, rArmOut=-20)),
                      K(1.2, body(lean=10, lArm=(55, 50), rArm=(55, 50), lElbow=40, rElbow=40, lArmOut=10, rArmOut=10))]
    C['clap'] = [K(0, body(lean=2, lArm=(60, 50), rArm=(60, 50), lElbow=70, rElbow=70, lArmOut=-10, rArmOut=-10)),
                 K(0.15, body(lean=2, lArm=(60, 55), rArm=(60, 55), lElbow=60, rElbow=60, lArmOut=-38, rArmOut=-38)),
                 K(0.3, body(lean=2, lArm=(60, 50), rArm=(60, 50), lElbow=70, rElbow=70, lArmOut=-10, rArmOut=-10))]
    C['wave'] = [K(0, body(**stance)),
                 K(0.3, body(lean=-2, lArm=(74, 0), rArm=(-60, 10), lElbow=12, rElbow=50, rArmOut=-10)),
                 K(0.6, body(lean=-2, lArm=(74, 0), rArm=(-60, 10), lElbow=12, rElbow=20, rArmOut=20)),
                 K(0.9, body(lean=-2, lArm=(74, 0), rArm=(-60, 10), lElbow=12, rElbow=50, rArmOut=-10)),
                 K(1.2, body(**stance))]

    # ---------------- goleiro ----------------
    gk = dict(lean=18, head=-10, lArm=(55, 30), rArm=(55, 30), lElbow=45, rElbow=45, lArmOut=-5, rArmOut=-5, lThigh=24, rThigh=24, lKnee=42, rKnee=42, lFoot=-15, rFoot=-15, lAbd=12, rAbd=12, hip=(0, 0, -0.17))
    gk2 = dict(gk, hip=(0, 0, -0.21), lKnee=48, rKnee=48, lThigh=28, rThigh=28)
    C['gk_idle'] = [K(0, body(**gk)), K(0.45, body(**gk2)), K(0.9, body(**gk))]
    dive = [K(0, body(**gk)),
            K(0.14, body(lean=10, side=12, lArm=(30, 30), rArm=(30, 30), lElbow=30, rElbow=30, lThigh=30, rThigh=10, lKnee=60, rKnee=30, lAbd=20, rAbd=20, hip=(0.1, 0, -0.3))),
            K(0.38, body(lean=0, side=10, head=0, lArm=(-150, 10), rArm=(-150, 10), lElbow=5, rElbow=5, lThigh=0, rThigh=15, lKnee=5, rKnee=25, hip=(0.6, 0, 0.35), hipRot=[('y', 75)])),
            K(0.62, body(lean=0, side=5, lArm=(-140, 10), rArm=(-140, 10), lElbow=15, rElbow=15, lThigh=10, rThigh=25, lKnee=15, rKnee=35, hip=(0.6, 0, -0.95), hipRot=[('y', 88)])),
            K(1.0, body(lean=10, side=0, lArm=(-20, 40), rArm=(-110, 30), lElbow=60, rElbow=50, lThigh=30, rThigh=40, lKnee=40, rKnee=60, hip=(0.6, 0, -1.02), hipRot=[('y', 90)]))]
    C['gk_dive_left'] = dive
    C['gk_dive_right'] = [K(t, body(**mirror_body(**kw))) for t, kw in [
        (0, gk),
        (0.14, dict(lean=10, side=12, lArm=(30, 30), rArm=(30, 30), lElbow=30, rElbow=30, lThigh=30, rThigh=10, lKnee=60, rKnee=30, lAbd=20, rAbd=20, hip=(0.1, 0, -0.3))),
        (0.38, dict(lean=0, side=10, head=0, lArm=(-150, 10), rArm=(-150, 10), lElbow=5, rElbow=5, lThigh=0, rThigh=15, lKnee=5, rKnee=25, hip=(0.6, 0, 0.35), hipRot=[('y', 75)])),
        (0.62, dict(lean=0, side=5, lArm=(-140, 10), rArm=(-140, 10), lElbow=15, rElbow=15, lThigh=10, rThigh=25, lKnee=15, rKnee=35, hip=(0.6, 0, -0.95), hipRot=[('y', 88)])),
        (1.0, dict(lean=10, side=0, lArm=(-20, 40), rArm=(-110, 30), lElbow=60, rElbow=50, lThigh=30, rThigh=40, lKnee=40, rKnee=60, hip=(0.6, 0, -1.02), hipRot=[('y', 90)]))]]
    meta['gk_dive_left'] = {'endsLying': 'side', 'reach': 0.38}
    meta['gk_dive_right'] = {'endsLying': 'side', 'reach': 0.38}
    C['gk_catch'] = [K(0, body(**gk)),
                     K(0.15, body(lean=10, head=0, lArm=(30, 75), rArm=(30, 75), lElbow=50, rElbow=50, lArmOut=-30, rArmOut=-30, lThigh=10, rThigh=10, lKnee=20, rKnee=20, hip=(0, 0, -0.05))),
                     K(0.4, body(lean=14, head=15, lArm=(50, 50), rArm=(50, 50), lElbow=110, rElbow=110, lArmOut=-35, rArmOut=-35, lThigh=12, rThigh=12, lKnee=20, rKnee=20)),
                     K(0.8, body(lean=8, head=5, lArm=(55, 45), rArm=(55, 45), lElbow=115, rElbow=115, lArmOut=-35, rArmOut=-35, lKnee=8, rKnee=8))]
    C['gk_hold'] = [K(0, body(lean=6, head=5, lArm=(55, 45), rArm=(55, 45), lElbow=115, rElbow=115, lArmOut=-35, rArmOut=-35, lKnee=8, rKnee=8)),
                    K(1.0, body(lean=8, head=8, lArm=(56, 46), rArm=(56, 46), lElbow=112, rElbow=112, lArmOut=-35, rArmOut=-35, lKnee=10, rKnee=10, hip=(0, 0, -0.02))),
                    K(2.0, body(lean=6, head=5, lArm=(55, 45), rArm=(55, 45), lElbow=115, rElbow=115, lArmOut=-35, rArmOut=-35, lKnee=8, rKnee=8))]
    C['gk_punch'] = [K(0, body(**gk)),
                     K(0.12, body(lean=0, head=-20, lArm=(40, 40), rArm=(40, 40), lElbow=120, rElbow=120, lThigh=20, rThigh=10, lKnee=50, rKnee=20, hip=(0, 0, -0.1))),
                     K(0.26, body(lean=-12, head=-30, lArm=(-120, 30), rArm=(-120, 30), lElbow=0, rElbow=0, lArmOut=-20, rArmOut=-20, lThigh=30, rThigh=-5, lKnee=70, rKnee=10, hip=(0, 0, 0.45))),
                     K(0.6, body(**gk))]
    meta['gk_punch'] = {'contact': 0.26}
    C['gk_throw'] = [K(0, body(lean=6, head=5, lArm=(55, 45), rArm=(55, 45), lElbow=115, rElbow=115, lArmOut=-35, rArmOut=-35, lKnee=8, rKnee=8)),
                     K(0.25, body(lean=-12, twist=25, lArm=(30, 60), rArm=(-120, -60), lElbow=20, rElbow=60, lThigh=30, lKnee=20, rThigh=-10, rKnee=20)),
                     K(0.42, body(lean=14, twist=-20, lArm=(60, -20), rArm=(-60, 80), lElbow=20, rElbow=10, lThigh=30, lKnee=25, rThigh=-20, rKnee=30)),
                     K(0.8, body(**STAND))]
    meta['gk_throw'] = {'contact': 0.42}
    C['throw_in'] = [K(0, body(**STAND)),
                     K(0.3, body(lean=-22, head=-15, lArm=(-150, -40), rArm=(-150, -40), lElbow=110, rElbow=110, lThigh=-10, rThigh=25, lKnee=5, rKnee=20, hip=(0, 0.05, -0.04))),
                     K(0.48, body(lean=18, head=10, lArm=(-80, 40), rArm=(-80, 40), lElbow=10, rElbow=10, lThigh=-6, rThigh=20, lKnee=10, rKnee=30)),
                     K(0.8, body(**STAND))]
    meta['throw_in'] = {'contact': 0.48}

    # ---------------- árbitro ----------------
    C['ref_whistle'] = [K(0, body(**STAND)),
                        K(0.25, body(lean=-4, head=-5, lArm=(74, 0), rArm=(70, 55), lElbow=12, rElbow=150, rArmOut=-30)),
                        K(0.9, body(lean=-6, head=-8, lArm=(-80, 0), rArm=(70, 55), lElbow=0, rElbow=150, rArmOut=-30)),
                        K(1.3, body(**STAND))]
    C['ref_card'] = [K(0, body(**STAND)),
                     K(0.3, body(lean=-4, head=-10, lArm=(74, 0), rArm=(-155, 5), lElbow=12, rElbow=0)),
                     K(1.4, body(lean=-6, head=-12, lArm=(74, 0), rArm=(-158, 5), lElbow=12, rElbow=0)),
                     K(1.8, body(**STAND))]
    C['ref_point'] = [K(0, body(**STAND)),
                      K(0.3, body(lean=-2, twist=-10, lArm=(0, 0), rArm=(74, 0), lElbow=0, rElbow=12)),
                      K(1.2, body(lean=-2, twist=-10, lArm=(0, 2), rArm=(74, 0), lElbow=0, rElbow=12)),
                      K(1.5, body(**STAND))]

    # ---------------- dançarinas (intervalo / gol) ----------------
    d1a = dict(lean=-4, side=14, twist=10, head=-6, lArm=(-130, 0), rArm=(-130, 0), lElbow=30, rElbow=30, lArmOut=-20, rArmOut=-20, lThigh=20, lKnee=40, rThigh=-4, rKnee=5, hip=(0.12, 0, -0.06))
    C['dance_1'] = [K(0, body(**d1a)), K(0.3, body(lean=0, lArm=(-110, 0), rArm=(-110, 0), lElbow=40, rElbow=40, lKnee=25, rKnee=25, hip=(0, 0, -0.12))),
                    K(0.6, body(**mirror_body(**d1a))), K(0.9, body(lean=0, lArm=(-110, 0), rArm=(-110, 0), lElbow=40, rElbow=40, lKnee=25, rKnee=25, hip=(0, 0, -0.12))),
                    K(1.2, body(**d1a))]
    d2a = dict(lean=6, side=-10, twist=-20, lArm=(10, 30), rArm=(60, -30), lElbow=90, rElbow=80, lThigh=30, lKnee=60, rThigh=0, rKnee=10, hip=(-0.1, 0, -0.04))
    C['dance_2'] = [K(0, body(**d2a)), K(0.25, body(lean=2, lArm=(30, 20), rArm=(30, 20), lElbow=90, rElbow=90, lKnee=20, rKnee=20, hip=(0, 0, 0.05))),
                    K(0.5, body(**mirror_body(**d2a))), K(0.75, body(lean=2, lArm=(30, 20), rArm=(30, 20), lElbow=90, rElbow=90, lKnee=20, rKnee=20, hip=(0, 0, 0.05))),
                    K(1.0, body(**d2a))]
    d3a = dict(lean=-6, head=-10, lArm=(-60, 0), rArm=(0, 0), lElbow=20, rElbow=0, lKnee=15, rKnee=15, side=12, hip=(0.1, 0, -0.04))
    C['dance_3'] = [K(0, body(**d3a)), K(0.4, body(lean=0, lArm=(0, 0), rArm=(0, 0), lElbow=0, rElbow=0, lKnee=40, rKnee=40, lThigh=20, rThigh=20, hip=(0, 0, -0.25))),
                    K(0.8, body(**mirror_body(**d3a))), K(1.2, body(lean=0, lArm=(0, 0), rArm=(0, 0), lElbow=0, rElbow=0, lKnee=40, rKnee=40, lThigh=20, rThigh=20, hip=(0, 0, -0.25))),
                    K(1.6, body(**d3a))]

    # ---------------- apresentação ----------------
    C['lineup'] = [K(0, body(lean=0, head=-4, lArm=(78, -8), rArm=(78, -8), lElbow=30, rElbow=30, lArmOut=-20, rArmOut=-20)),
                   K(1.5, body(lean=1, head=-6, lArm=(78, -9), rArm=(78, -9), lElbow=32, rElbow=32, lArmOut=-20, rArmOut=-20, hip=(0, 0, -0.02))),
                   K(3.0, body(lean=0, head=-4, lArm=(78, -8), rArm=(78, -8), lElbow=30, rElbow=30, lArmOut=-20, rArmOut=-20))]
    C['stretch'] = [K(0, body(**STAND)),
                    K(0.6, body(lean=60, head=10, lArm=(70, 70), rArm=(70, 70), lElbow=0, rElbow=0, lAbd=15, rAbd=15, hip=(0, 0.1, -0.03))),
                    K(1.4, body(lean=64, head=12, lArm=(70, 75), rArm=(70, 75), lElbow=0, rElbow=0, lAbd=15, rAbd=15, hip=(0, 0.1, -0.03))),
                    K(2.0, body(lean=-8, side=20, lArm=(-150, 0), rArm=(30, 0), lElbow=10, rElbow=30)),
                    K(2.8, body(lean=-8, side=-20, lArm=(30, 0), rArm=(-150, 0), lElbow=30, rElbow=10)),
                    K(3.4, body(**STAND))]
    return C, meta

LOOPING = {'idle', 'idle_ready', 'idle_tired', 'walk', 'jog', 'run', 'sprint', 'run_airplane', 'juggle',
           'celebrate_knee_slide', 'celebrate_samba', 'celebrate_point_sky', 'celebrate_fist', 'celebrate_trophy',
           'sad', 'argue_ref', 'clap', 'gk_idle', 'gk_hold', 'dance_1', 'dance_2', 'dance_3', 'lineup'}
