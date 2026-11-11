// core.js: paleta, utilitários, GLSL compartilhado e as peças reutilizadas pelos episódios
// (campo de código flutuante, cidade de código, fluxos de dados, painéis holográficos, rótulos).
import * as THREE from '../vendor/three.module.js';

export const W = 1080, H = 1920, EP_DUR = 20, N_EPS = 5, TOTAL = EP_DUR * N_EPS;

export const PAL = {
  blue: new THREE.Color(0x1f7bff), cyan: new THREE.Color(0x3fd8ff), purple: new THREE.Color(0x8a4dff),
  violet: new THREE.Color(0xb46bff), silver: new THREE.Color(0xc9d6ea), red: new THREE.Color(0xff2a4d), dark: new THREE.Color(0x03050c),
};
export const css = c => '#' + c.getHexString();

// uniforms globais: o tempo do filme e a escala mundo -> pixel dos pontos
export const U = { uTime: { value: 0 }, uPx: { value: H / (2 * Math.tan(THREE.MathUtils.degToRad(25))) } };

export const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
export const pulse = (x, a, b, f = 0.4) => sstep(a, a + f, x) * (1 - sstep(b - f, b, x));
export const rng = seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
export const V3 = (x, y, z) => new THREE.Vector3(x, y, z);

export const GLSL_NOISE = /* glsl */`
float hash11(float p){p=fract(p*.1031);p*=p+33.33;p*=p+p;return fract(p);}
float hash21(vec2 p){vec3 p3=fract(vec3(p.xyx)*.1031);p3+=dot(p3,p3.yzx+33.33);return fract((p3.x+p3.y)*p3.z);}
float hash31(vec3 p){p=fract(p*.1031);p+=dot(p,p.zyx+31.32);return fract((p.x+p.y)*p.z);}
float noise3(vec3 x){vec3 i=floor(x),f=fract(x);f=f*f*(3.-2.*f);
  return mix(mix(mix(hash31(i),hash31(i+vec3(1,0,0)),f.x),mix(hash31(i+vec3(0,1,0)),hash31(i+vec3(1,1,0)),f.x),f.y),
             mix(mix(hash31(i+vec3(0,0,1)),hash31(i+vec3(1,0,1)),f.x),mix(hash31(i+vec3(0,1,1)),hash31(i+vec3(1,1,1)),f.x),f.y),f.z);}
float fbm(vec3 p){float a=.5,s=0.;for(int i=0;i<4;i++){s+=a*noise3(p);p*=2.02;a*=.5;}return s;}
`;

const ADD = { transparent: true, depthWrite: false, blending: THREE.AdditiveBlending };

// ---------------------------------------------------------------------------------------------- texto em canvas
export function canvas2d(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; }
export function texFrom(c) { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; }

export function makeLabel(text, { size = 0.3, color = '#3fd8ff', font = '700 64px Orbitron', pad = 24, glow = 18 } = {}) {
  const [m, mx] = canvas2d(8, 8); mx.font = font;
  const tw = Math.ceil(mx.measureText(text).width), th = parseInt(font.match(/(\d+)px/)[1]);
  const [c, x] = canvas2d(tw + pad * 2, Math.ceil(th * 1.5) + pad);
  x.font = font; x.textBaseline = 'middle'; x.fillStyle = color; x.shadowColor = color; x.shadowBlur = glow;
  x.fillText(text, pad, c.height / 2);
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: texFrom(c), ...ADD, depthTest: false }));
  s.scale.set(size * c.width / c.height, size, 1); s.userData.aspect = c.width / c.height;
  return s;
}

// painel holográfico: um plano com textura de canvas, linhas de varredura e leve tremulação
export function makeHolo(w, h, canvas, { opacity = 1 } = {}) {
  const tex = texFrom(canvas);
  const mat = new THREE.ShaderMaterial({
    ...ADD, side: THREE.DoubleSide,
    uniforms: { map: { value: tex }, uTime: U.uTime, uOpacity: { value: opacity }, uReveal: { value: 1 } },
    vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: `uniform sampler2D map; uniform float uTime,uOpacity,uReveal; varying vec2 vUv; ${GLSL_NOISE}
      void main(){ vec2 uv=vUv; float band=step(.985,hash11(floor(uv.y*60.)+floor(uTime*9.)));
        uv.x+=band*.012; vec4 t=texture2D(map,uv);
        float scan=.82+.18*sin(uv.y*420.-uTime*6.); float fl=.93+.07*sin(uTime*31.);
        float rv=smoothstep(0.,.08,uReveal-(1.-uv.y)); float edge=smoothstep(.06,0.,abs(uReveal-(1.-uv.y)))*step(uReveal,.999);
        gl_FragColor=vec4(t.rgb*scan*fl*rv+vec3(.2,.6,1.)*edge, 1.)*uOpacity*max(t.a,edge); }`,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  mesh.userData = { tex, u: mat.uniforms };
  return mesh;
}

// ---------------------------------------------------------------------------------------------- atlas de código
export const CODE = [
  'flowFile = session.get(); if (!flowFile) return', 'def json = new JsonSlurper().parseText(text)', 'SELECT id, status FROM integracao.pedido WHERE lote = ?',
  '{"pedido": 48213, "status": "ENTREGUE", "peso": 12.4}', 'session.transfer(flowFile, REL_SUCCESS)', 'GET /api/v2/embarques?page=3 HTTP/1.1',
  'INSERT INTO etl.carga (origem, payload) VALUES ($1, $2)', '<cte><infCte versao="4.00"><ide><cUF>41</cUF>', 'attrs.put("http.status", resp.statusCode as String)',
  'UPDATE fila SET tentativas = tentativas + 1 WHERE id = :id', 'JoltTransformJSON -> RouteOnAttribute -> PutDatabaseRecord', '"transportadora": {"cnpj": "00.000.000/0001-00"}',
  'POST /oauth/token grant_type=client_credentials', 'CREATE INDEX idx_evento_data ON evento USING brin (data)', 'if (resp.code == 429) { retry(backoff * 2) }',
  'def rows = sql.rows("SELECT * FROM rota WHERE ativo")', 'Content-Type: application/json; charset=utf-8', 'ConsumeKafka -> EvaluateJsonPath -> InvokeHTTP',
  '${filename:substringBefore(".xml")}', 'WITH lote AS (SELECT * FROM fila LIMIT 500 FOR UPDATE)', 'flowFile = session.putAttribute(flowFile, "rota", id)',
  '[{"operation": "shift", "spec": {"nfe": "doc.&"}}]', 'ListenHTTP :8443 /webhook/ocorrencias', 'ON CONFLICT (chave) DO UPDATE SET payload = EXCLUDED.payload',
  'def out = JsonOutput.toJson(pedidos.collect { map(it) })', 'x-request-id: 7f3a9c1e-22b4-4d7b-9a51', 'MergeContent  bin=1000  max.age=30s',
  'EXPLAIN ANALYZE SELECT count(*) FROM evento', '"eventos": [{"tipo": "COLETA"}, {"tipo": "ENTREGA"}]', 'log.info("lote {} integrado em {} ms", id, dt)',
  'back pressure: 10000 flowfiles / 1 GB', 'curl -X PUT $API/embarques/8842 -d @payload.json', 'provenance: RECEIVE -> ROUTE -> SEND',
  'ALTER TABLE carga ADD COLUMN processado_em timestamptz', 'try { validar(xml) } catch (e) { REL_FAILURE }', 'HTTP/1.1 200 OK',
  'QueryDatabaseTable  max-value-column=updated_at', 'def ns = new XmlSlurper().parseText(body)', '{"origem": "ERP", "destino": "TMS", "ok": true}',
  'SELECT jsonb_agg(e) FROM evento e WHERE lote = 77', 'ConvertRecord  JsonTreeReader -> AvroRecordSetWriter', 'while (it.hasNext()) emit(transform(it.next()))',
  'PUT /api/v1/notas/3519/status', 'VACUUM (ANALYZE) integracao.pedido', 'SplitJson $.itens[*] -> UpdateAttribute',
  'return [status: 200, body: resposta]', '"lat": -25.4284, "lng": -49.2733', 'retries=3 timeout=30s keepalive=on',
  'GenerateTableFetch -> ExecuteSQLRecord', 'def token = cache.get("oauth") ?: renovar()', 'COPY staging.evento FROM STDIN (FORMAT csv)',
  'RouteOnAttribute  ${http.status:ge(500)}', '{"erro": null, "integrado": true}', 'session.commitAsync()',
  'SELECT pg_notify(\'carga\', id::text)', 'HandleHttpRequest -> ExecuteGroovyScript', 'Authorization: Bearer eyJhbGciOi...',
  'map.each { k, v -> out[k.toLowerCase()] = v }', 'LIMIT 1000 OFFSET ${pagina:multiply(1000)}', 'PublishKafka  topic=integracao.eventos',
  'assert payload.itens.size() > 0', 'CREATE MATERIALIZED VIEW painel AS SELECT ...', 'ControlRate  100 flowfiles / s', 'schema.name=pedido_v3',
];
let _atlas;
export function codeAtlas() {
  if (_atlas) return _atlas;
  const [c, x] = canvas2d(2048, 2048); x.font = '500 22px "JetBrains Mono"'; x.textBaseline = 'middle'; x.fillStyle = '#fff';
  const widths = [];
  for (let r = 0; r < 64; r++) { const s = CODE[r % CODE.length]; x.fillText(s, 6, r * 32 + 17); widths.push(Math.min(1, (x.measureText(s).width + 12) / 2048)); }
  const tex = new THREE.CanvasTexture(c); tex.anisotropy = 8; tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return (_atlas = { tex, widths });
}

// linhas de código flutuando no espaço (billboards), que se "digitam" ao aparecer e se repetem numa caixa em volta de uOrigin
export function makeCodeField({ count = 400, seed = 1, box = [30, 20, 40], size = [0.16, 0.42], drift = [0, 0.25, 0], color = PAL.cyan, color2 = PAL.purple, near = 1.5 }) {
  const { tex, widths } = codeAtlas(), r = rng(seed);
  const center = new Float32Array(count * 12), corner = new Float32Array(count * 8), info = new Float32Array(count * 16), idx = [];
  for (let i = 0; i < count; i++) {
    const c = [(r() - .5) * box[0], (r() - .5) * box[1], (r() - .5) * box[2]], row = Math.floor(r() * 64), s = lerp(size[0], size[1], r() * r()), sd = r();
    [[-.5, -.5], [.5, -.5], [.5, .5], [-.5, .5]].forEach((q, k) => {
      center.set(c, (i * 4 + k) * 3); corner.set(q, (i * 4 + k) * 2); info.set([row, widths[row], s, sd], (i * 4 + k) * 4);
    });
    idx.push(i * 4, i * 4 + 1, i * 4 + 2, i * 4, i * 4 + 2, i * 4 + 3);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(center, 3)); g.setAttribute('aCorner', new THREE.BufferAttribute(corner, 2));
  g.setAttribute('aInfo', new THREE.BufferAttribute(info, 4)); g.setIndex(idx);
  const mat = new THREE.ShaderMaterial({
    ...ADD,
    uniforms: { map: { value: tex }, uTime: U.uTime, uReveal: { value: 1 }, uOpacity: { value: 1 }, uDrift: { value: V3(...drift) }, uBox: { value: V3(...box) },
      uOrigin: { value: V3(0, 0, 0) }, uNear: { value: near }, uFar: { value: Math.max(...box) * 0.55 }, uColor: { value: color }, uColor2: { value: color2 }, uAlert: { value: 0 } },
    vertexShader: `attribute vec2 aCorner; attribute vec4 aInfo; uniform float uTime,uReveal,uOpacity,uNear,uFar; uniform vec3 uDrift,uBox,uOrigin;
      varying vec2 vUv; varying float vA,vX,vT,vS;
      void main(){ vec3 c=position+uDrift*uTime*(.4+aInfo.w); c=mod(c-uOrigin+uBox*.5,uBox)-uBox*.5+uOrigin;
        vec4 mv=viewMatrix*modelMatrix*vec4(c,1.); float w=aInfo.y*64.*aInfo.z; mv.xy+=aCorner*vec2(w,aInfo.z);
        gl_Position=projectionMatrix*mv; vUv=vec2((aCorner.x+.5)*aInfo.y, 1.-(aInfo.x+.5-aCorner.y)/64.);
        vX=aCorner.x+.5; vT=clamp((uReveal*1.35-aInfo.w)*3.,0.,1.); vS=aInfo.w;
        vA=uOpacity*smoothstep(uNear,uNear*3.,-mv.z)*smoothstep(uFar,uFar*.45,-mv.z)*(.35+.65*aInfo.w); }`,
    fragmentShader: `uniform sampler2D map; uniform vec3 uColor,uColor2; uniform float uAlert; varying vec2 vUv; varying float vA,vX,vT,vS;
      void main(){ if(vX>vT) discard; float t=texture2D(map,vUv).r; float cur=smoothstep(.04,0.,vT-vX)*step(vT,.999);
        vec3 c=mix(uColor,uColor2,step(.62,vS)); c=mix(c,vec3(1.,.12,.2),uAlert*step(.5,fract(vS*7.)));
        gl_FragColor=vec4(c*(t+cur*.8)*vA*.55,1.); }`,
  });
  const mesh = new THREE.Mesh(g, mat); mesh.frustumCulled = false; mesh.userData.u = mat.uniforms;
  return mesh;
}

// ---------------------------------------------------------------------------------------------- cidade de código
export function makeCity({ seed = 3, cols = 34, rows = 44, cell = 3.4, avenue = 3.2, hBase = 2, hVar = 16, color = PAL.blue, color2 = PAL.cyan, origin = [0, 0, 0], plaza = 0, spires = 0.06 }) {
  const { tex } = codeAtlas(), r = rng(seed), list = [];
  for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
    const x = (i - cols / 2 + .5) * cell, z = -j * cell;
    if (Math.abs(x) < avenue || (plaza && Math.hypot(x, z + plaza * 2) < plaza) || r() < 0.12) continue;
    const far = Math.hypot(x, z) / (rows * cell), tall = r() < spires;
    const w = cell * lerp(.45, .82, r()), d = cell * lerp(.45, .82, r());
    const h = hBase + Math.pow(r(), 2.2) * hVar * (.5 + far * 1.2) + (tall ? hVar * (1 + r()) : 0) + Math.abs(x) * .12;
    list.push({ x: x + (r() - .5) * .5, z: z + (r() - .5) * .5, w: tall ? w * .6 : w, d: tall ? d * .6 : d, h, delay: far * 2.6 + r() * .9, sd: r() });
  }
  const g = new THREE.BoxGeometry(1, 1, 1); g.translate(0, .5, 0);
  const seeds = new Float32Array(list.length * 3);
  const mat = new THREE.ShaderMaterial({
    uniforms: { map: { value: tex }, uTime: U.uTime, uGrow: { value: 0 }, uColor: { value: color }, uColor2: { value: color2 }, uFog: { value: 0.012 }, uGain: { value: 1 } },
    vertexShader: `attribute vec3 aSeed; uniform float uGrow; varying vec2 vUv; varying vec3 vSize,vN; varying float vG,vSd,vDist,vY;
      void main(){ float g=smoothstep(aSeed.x,aSeed.x+1.3,uGrow); g=g*(1.+.12*sin(g*3.14159));
        vec3 p=position; p.y*=g; vec4 w=modelMatrix*instanceMatrix*vec4(p,1.); vec4 mv=viewMatrix*w; gl_Position=projectionMatrix*mv;
        vSize=vec3(length(instanceMatrix[0].xyz),length(instanceMatrix[1].xyz)*g,length(instanceMatrix[2].xyz));
        vUv=uv; vN=normal; vG=g; vSd=aSeed.y; vDist=-mv.z; vY=position.y; }`,
    fragmentShader: `uniform sampler2D map; uniform vec3 uColor,uColor2; uniform float uTime,uFog,uGain; varying vec2 vUv; varying vec3 vSize,vN; varying float vG,vSd,vDist,vY;
      void main(){ if(vG<.002) discard; vec3 base=vec3(.004,.008,.022); vec3 col=base;
        vec3 tint=mix(uColor,uColor2,step(.7,vSd));
        if(abs(vN.y)<.5){ float fw=abs(vN.x)>.5?vSize.z:vSize.x; float rowH=.34;
          float y=vUv.y*vSize.y/rowH - uTime*(.25+vSd*.9); float row=floor(y);
          vec2 uv=vec2(fract(vUv.x*fw/(rowH*64.)+fract(row*.37+vSd)), (floor(mod(row*7.+vSd*64.,64.))+1.-fract(y))/64.);
          float on=step(.25,fract(row*.618+vSd*3.)); float t=texture2D(map,vec2(uv.x,1.-uv.y)).r*on;
          float edge=smoothstep(.035,.0,min(vUv.x,1.-vUv.x)*fw)+smoothstep(.05,0.,(1.-vUv.y)*vSize.y);
          float head=smoothstep(.6,0.,(1.-vUv.y)*vSize.y)*step(vG,.98)*2.;
          col+=tint*(t*(.55+.45*fract(row*.31+vSd))+edge*.5+head); }
        else { col+=tint*.12; }
        float fog=exp(-vDist*uFog); gl_FragColor=vec4(col*uGain*fog,1.); }`,
  });
  const mesh = new THREE.InstancedMesh(g, mat, list.length), m = new THREE.Matrix4();
  list.forEach((b, i) => { m.makeScale(b.w, b.h, b.d).setPosition(b.x + origin[0], origin[1], b.z + origin[2]); mesh.setMatrixAt(i, m); seeds.set([b.delay, b.sd, 0], i * 3); });
  g.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seeds, 3));
  mesh.frustumCulled = false; mesh.userData = { u: mat.uniforms, list };
  return mesh;
}

// chão em grade que se perde no horizonte
export function makeGrid({ size = 400, cell = 2, color = PAL.blue, y = 0 }) {
  const mat = new THREE.ShaderMaterial({
    ...ADD, side: THREE.DoubleSide,
    uniforms: { uColor: { value: color }, uCell: { value: cell }, uOpacity: { value: 1 }, uTime: U.uTime, uPulse: { value: 0 } },
    vertexShader: `varying vec3 vW; varying float vD; void main(){ vec4 w=modelMatrix*vec4(position,1.); vW=w.xyz; vec4 mv=viewMatrix*w; vD=-mv.z; gl_Position=projectionMatrix*mv; }`,
    fragmentShader: `uniform vec3 uColor; uniform float uCell,uOpacity,uTime,uPulse; varying vec3 vW; varying float vD;
      void main(){ vec2 g=abs(fract(vW.xz/uCell-.5)-.5)/fwidth(vW.xz/uCell); float l=1.-min(min(g.x,g.y),1.);
        float ring=smoothstep(1.5,0.,abs(length(vW.xz)-uPulse*60.))*step(.001,uPulse);
        gl_FragColor=vec4(uColor*(l*.55+ring*l*2.)*exp(-vD*.03)*uOpacity,1.); }`,
    extensions: { derivatives: true },
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(size, size), mat); mesh.rotation.x = -Math.PI / 2; mesh.position.y = y; mesh.userData.u = mat.uniforms;
  return mesh;
}

// ---------------------------------------------------------------------------------------------- fluxos de dados
// cada fluxo é uma curva de Bézier (a -> c -> b) com um traço fino e partículas correndo por ela.
// uReveal avança em "segundos": o traço de um fluxo se desenha a partir de delay e as partículas entram em seguida.
export function makeFlows(list, { size = 0.09, lineOpacity = 0.35, segs = 20 } = {}) {
  let nP = 0; list.forEach(f => nP += f.n ?? 6);
  const p0 = new Float32Array(nP * 3), p1 = new Float32Array(nP * 3), p2 = new Float32Array(nP * 3), inf = new Float32Array(nP * 4), col = new Float32Array(nP * 3);
  const L = list.length * segs * 2, lp0 = new Float32Array(L * 3), lp1 = new Float32Array(L * 3), lp2 = new Float32Array(L * 3), linf = new Float32Array(L * 2), lcol = new Float32Array(L * 3);
  let k = 0; const r = rng(99);
  list.forEach((f, fi) => {
    const c = f.color ?? PAL.cyan, n = f.n ?? 6, sp = f.speed ?? 0.25, dl = f.delay ?? 0;
    for (let i = 0; i < n; i++, k++) {
      p0.set(f.a.toArray(), k * 3); p1.set(f.c.toArray(), k * 3); p2.set(f.b.toArray(), k * 3);
      inf.set([(i + r() * .6) / n, sp, dl, .6 + r() * .8], k * 4); col.set([c.r, c.g, c.b], k * 3);
    }
    for (let s = 0; s < segs; s++) for (let e = 0; e < 2; e++) {
      const j = (fi * segs + s) * 2 + e;
      lp0.set(f.a.toArray(), j * 3); lp1.set(f.c.toArray(), j * 3); lp2.set(f.b.toArray(), j * 3);
      linf.set([(s + e) / segs, dl], j * 2); lcol.set([c.r, c.g, c.b], j * 3);
    }
  });
  const bez = `vec3 bez(vec3 a,vec3 c,vec3 b,float t){ float u=1.-t; return u*u*a+2.*u*t*c+t*t*b; }`;
  const uni = { uTime: U.uTime, uPx: U.uPx, uReveal: { value: 0 }, uOpacity: { value: 1 }, uLine: { value: lineOpacity }, uSize: { value: size }, uTint: { value: new THREE.Color(1, 0.1, 0.2) }, uTintAmt: { value: 0 }, uJitter: { value: 0 }, uSpeed: { value: 1 } };
  const pg = new THREE.BufferGeometry();
  pg.setAttribute('position', new THREE.BufferAttribute(p0, 3)); pg.setAttribute('aC', new THREE.BufferAttribute(p1, 3)); pg.setAttribute('aB', new THREE.BufferAttribute(p2, 3));
  pg.setAttribute('aInf', new THREE.BufferAttribute(inf, 4)); pg.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const pts = new THREE.Points(pg, new THREE.ShaderMaterial({
    ...ADD, uniforms: uni,
    vertexShader: `attribute vec3 aC,aB,color; attribute vec4 aInf; uniform float uTime,uPx,uReveal,uOpacity,uSize,uJitter,uSpeed; varying vec3 vC; varying float vA; ${bez} ${GLSL_NOISE}
      void main(){ float t=fract(aInf.x+uTime*aInf.y*uSpeed); vec3 p=bez(position,aC,aB,t);
        p+=uJitter*(vec3(hash11(aInf.x*91.+floor(uTime*12.)),hash11(aInf.x*37.+floor(uTime*12.)),hash11(aInf.x*53.+floor(uTime*12.)))-.5);
        vec4 mv=viewMatrix*modelMatrix*vec4(p,1.); gl_Position=projectionMatrix*mv;
        float on=smoothstep(aInf.z+.3,aInf.z+.9,uReveal)*step(t,clamp((uReveal-aInf.z-.2)*1.4,0.,1.)+step(aInf.z+1.2,uReveal));
        vA=on*uOpacity*sin(3.14159*t); vC=color; gl_PointSize=max(1.5,uSize*aInf.w*uPx/-mv.z); }`,
    fragmentShader: `uniform vec3 uTint; uniform float uTintAmt; varying vec3 vC; varying float vA;
      void main(){ float d=length(gl_PointCoord-.5); float a=smoothstep(.5,.05,d); gl_FragColor=vec4(mix(vC,uTint,uTintAmt)*a*a*vA*1.6,1.); }`,
  }));
  const lg = new THREE.BufferGeometry();
  lg.setAttribute('position', new THREE.BufferAttribute(lp0, 3)); lg.setAttribute('aC', new THREE.BufferAttribute(lp1, 3)); lg.setAttribute('aB', new THREE.BufferAttribute(lp2, 3));
  lg.setAttribute('aInf', new THREE.BufferAttribute(linf, 2)); lg.setAttribute('color', new THREE.BufferAttribute(lcol, 3));
  const lines = new THREE.LineSegments(lg, new THREE.ShaderMaterial({
    ...ADD, uniforms: uni,
    vertexShader: `attribute vec3 aC,aB,color; attribute vec2 aInf; uniform float uReveal,uOpacity,uLine,uTime,uJitter; varying vec3 vC; varying float vA; ${bez} ${GLSL_NOISE}
      void main(){ vec3 p=bez(position,aC,aB,aInf.x); p+=uJitter*.5*(vec3(hash11(aInf.x*91.+aInf.y+floor(uTime*14.)),hash11(aInf.x*37.+floor(uTime*14.)),0.)-.5);
        gl_Position=projectionMatrix*viewMatrix*modelMatrix*vec4(p,1.);
        float wave=.6+.4*sin(aInf.x*12.-uTime*5.+aInf.y*3.);
        vA=step(aInf.x,(uReveal-aInf.y)*1.4)*uOpacity*uLine*wave; vC=color; }`,
    fragmentShader: `uniform vec3 uTint; uniform float uTintAmt; varying vec3 vC; varying float vA; void main(){ gl_FragColor=vec4(mix(vC,uTint,uTintAmt)*vA,1.); }`,
  }));
  pts.frustumCulled = lines.frustumCulled = false;
  const group = new THREE.Group(); group.add(lines, pts); group.userData.u = uni;
  return group;
}

// nuvem de pontos genérica (posições fixas), para halos, poeira e brilhos
export function makePoints(positions, { size = 0.08, color = PAL.cyan, opacity = 1, sizes = null, twinkle = 0 }) {
  const g = new THREE.BufferGeometry(), n = positions.length / 3;
  g.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const sd = new Float32Array(n); const r = rng(n); for (let i = 0; i < n; i++) sd[i] = sizes ? sizes[i] : .5 + r();
  g.setAttribute('aS', new THREE.BufferAttribute(sd, 1));
  const mat = new THREE.ShaderMaterial({
    ...ADD, uniforms: { uTime: U.uTime, uPx: U.uPx, uSize: { value: size }, uColor: { value: color }, uOpacity: { value: opacity }, uTw: { value: twinkle } },
    vertexShader: `attribute float aS; uniform float uPx,uSize,uTime,uTw; varying float vA;
      void main(){ vec4 mv=modelViewMatrix*vec4(position,1.); gl_Position=projectionMatrix*mv; gl_PointSize=max(1.,uSize*aS*uPx/-mv.z);
        vA=mix(1.,.5+.5*sin(uTime*(1.+aS*3.)+aS*40.),uTw); }`,
    fragmentShader: `uniform vec3 uColor; uniform float uOpacity; varying float vA; void main(){ float d=length(gl_PointCoord-.5); float a=smoothstep(.5,0.,d); gl_FragColor=vec4(uColor*a*a*vA*uOpacity,1.); }`,
  });
  const p = new THREE.Points(g, mat); p.frustumCulled = false; p.userData.u = mat.uniforms; return p;
}

// nó de rede: octaedro em arame com núcleo luminoso
export function makeNode(size = 0.3, color = PAL.cyan, shape = 'octa') {
  const geo = shape === 'box' ? new THREE.BoxGeometry(size * 1.3, size * 1.8, size * 1.3) : shape === 'ico' ? new THREE.IcosahedronGeometry(size, 0) : new THREE.OctahedronGeometry(size, 0);
  const g = new THREE.Group();
  const wire = new THREE.LineSegments(new THREE.EdgesGeometry(geo), new THREE.LineBasicMaterial({ color, ...ADD }));
  const core = new THREE.Mesh(shape === 'box' ? new THREE.BoxGeometry(size * 1.1, size * 1.6, size * 1.1) : new THREE.OctahedronGeometry(size * .45, 0), new THREE.MeshBasicMaterial({ color: color.clone().multiplyScalar(shape === 'box' ? .12 : 1.2), transparent: true }));
  g.add(wire, core); g.userData = { wire, core };
  return g;
}

// cartão no estilo de um processador do NiFi, desenhado em canvas
export function processorCanvas(name, sub = 'processor', accent = '#3fd8ff') {
  const [c, x] = canvas2d(512, 192);
  x.fillStyle = 'rgba(6,16,40,.92)'; x.strokeStyle = accent; x.lineWidth = 4;
  x.beginPath(); x.roundRect(4, 4, 504, 184, 14); x.fill(); x.stroke();
  x.fillStyle = accent; x.fillRect(22, 26, 34, 34); x.fillStyle = '#04102a'; x.beginPath(); x.moveTo(32, 34); x.lineTo(48, 43); x.lineTo(32, 52); x.fill();
  x.fillStyle = '#fff'; x.font = '700 34px Rajdhani'; x.textBaseline = 'middle'; x.fillText(name, 72, 44);
  x.fillStyle = accent; x.font = '500 20px "JetBrains Mono"'; x.fillText(sub, 24, 96);
  x.strokeStyle = 'rgba(120,180,255,.35)'; x.lineWidth = 2; x.beginPath(); x.moveTo(22, 122); x.lineTo(490, 122); x.stroke();
  x.fillStyle = 'rgba(200,220,255,.8)'; x.fillText('in 12.480   out 12.480   5 min', 24, 154);
  return c;
}

export { THREE, ADD };
