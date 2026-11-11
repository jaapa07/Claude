// Passe final: distorção temporal (onda de choque + ondulação), congelamento, raios volumétricos, flash, vinheta e grão.
export const TimePostShader = {
  uniforms: {
    tDiffuse: { value: null }, uTime: { value: 0 }, uAspect: { value: 9 / 16 },
    uFreeze: { value: 0 },                       // 0..1: mundo congelado (dessatura, tinge de azul, aberração)
    uWarp: { value: 0 },                         // ondulação temporal contínua
    uWave: { value: [0.5, 0.5, -1, 0] },         // onda de choque: centro xy, raio, força
    uWave2: { value: [0.5, 0.5, -1, 0] },
    uSun: { value: [0.5, 0.8] }, uRays: { value: 0 }, uRayColor: { value: [1, 0.85, 0.6] },
    uFlash: { value: [0.6, 0.8, 1, 0] },         // cor + quantidade
    uFade: { value: 0 }, uVignette: { value: 0.9 }, uSat: { value: 1.08 }, uSplit: { value: 0 },
  },
  vertexShader: /* glsl */`varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
  fragmentShader: /* glsl */`
    precision highp float;
    uniform sampler2D tDiffuse; uniform float uTime, uAspect, uFreeze, uWarp, uRays, uFade, uVignette, uSat, uSplit;
    uniform vec4 uWave, uWave2, uFlash; uniform vec2 uSun; uniform vec3 uRayColor;
    varying vec2 vUv;
    float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
    float vnoise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
      return mix(mix(hash(i), hash(i+vec2(1,0)), f.x), mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), f.x), f.y); }
    vec2 shock(vec2 uv, vec4 w, out float ring){
      vec2 d = uv - w.xy; d.x *= uAspect; float r = length(d);
      float x = (r - w.z) / 0.09; ring = exp(-x*x) * step(0.0, w.z);
      return normalize(d + 1e-5) * ring * w.w * vec2(1.0/uAspect, 1.0);
    }
    void main(){
      vec2 uv = vUv; float r1, r2;
      vec2 off = shock(uv, uWave, r1) + shock(uv, uWave2, r2);
      // ondulação temporal: o espaço "respira" em faixas que giram ao redor do centro
      vec2 c = uv - 0.5; float ang = atan(c.y, c.x), rad = length(c);
      float rip = sin(rad * 38.0 - uTime * 5.0 + sin(ang * 3.0 + uTime) * 2.0);
      off += normalize(c + 1e-5) * rip * 0.006 * uWarp * smoothstep(0.05, 0.6, rad);
      off += (vec2(vnoise(uv * 6.0 + uTime * 0.7), vnoise(uv * 6.0 - uTime * 0.6 + 9.0)) - 0.5) * 0.012 * uWarp;
      // "passado e futuro": duas metades da tela deslocadas no tempo (ep. 3)
      float side = smoothstep(-0.02, 0.02, (uv.x - 0.5) + (uv.y - 0.5) * 0.35);
      off.y += (side - 0.5) * 0.02 * uSplit * sin(uv.y * 60.0 + uTime * 8.0);
      uv -= off;
      float ab = 0.0015 + 0.004 * uFreeze + 0.02 * (r1 * abs(uWave.w) + r2 * abs(uWave2.w)) * 8.0 + 0.004 * uWarp + 0.006 * uSplit;
      vec2 dir = normalize(c + 1e-5) * ab * (0.4 + rad);
      vec3 col = vec3(texture2D(tDiffuse, uv + dir).r, texture2D(tDiffuse, uv).g, texture2D(tDiffuse, uv - dir).b);
      // raios volumétricos em espaço de tela, a partir do sol / fonte de energia
      if (uRays > 0.001) {
        vec2 delta = (uv - uSun) / 22.0; vec2 p = uv; float acc = 0.0, w = 1.0;
        float jitter = hash(uv * 911.0 + fract(uTime) * 13.0);
        p -= delta * jitter;
        for (int i = 0; i < 22; i++) { p -= delta; vec3 s = texture2D(tDiffuse, p).rgb;
          acc += smoothstep(1.15, 2.6, dot(s, vec3(0.299, 0.587, 0.114))) * w; w *= 0.94; }
        col += uRayColor * acc * uRays * 0.085;
      }
      float l = dot(col, vec3(0.299, 0.587, 0.114));
      col = mix(vec3(l), col, uSat);
      // congelamento: cor fria, contraste, cristais nas bordas
      vec3 frozen = mix(vec3(l), col, 0.45) * vec3(0.72, 0.92, 1.25) + vec3(0.0, 0.015, 0.05);
      frozen += vec3(0.1, 0.25, 0.5) * smoothstep(0.35, 0.8, rad) * (0.6 + 0.4 * vnoise(vUv * 5.0 + uTime * 0.2));
      col = mix(col, frozen, uFreeze);
      col += vec3(0.5, 0.8, 1.0) * (r1 + r2) * 0.35;
      // metade "passado" sépia / metade "futuro" azul
      col = mix(col, mix(vec3(l) * vec3(1.25, 1.0, 0.7), vec3(l) * vec3(0.6, 0.85, 1.4) , side), uSplit * 0.45);
      float vig = smoothstep(1.05, 0.25, length(c * vec2(1.0, 0.82)));
      col *= mix(1.0, vig, uVignette);
      col += (hash(vUv * 1733.0 + fract(uTime * 7.31) * 91.0) - 0.5) * 0.018;
      col = mix(col, uFlash.rgb * 1.5, clamp(uFlash.a, 0.0, 1.0));
      col *= 1.0 - uFade;
      gl_FragColor = vec4(max(col, 0.0), 1.0);
    }`,
};
