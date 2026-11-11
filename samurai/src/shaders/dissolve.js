// Dissolução por ruído 3D em espaço de mundo, enxertada em MeshStandardMaterial.
// Usada para personagens virando pétalas, casas e montanhas que o tempo apaga.
const NOISE = /* glsl */`
  uniform float uDissolve, uDisScale; uniform vec3 uDisColor; varying vec3 vDisPos;
  float dHash(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
  float dNoise(vec3 x){ vec3 i = floor(x), f = fract(x); f = f*f*(3.0-2.0*f);
    return mix(mix(mix(dHash(i), dHash(i+vec3(1,0,0)), f.x), mix(dHash(i+vec3(0,1,0)), dHash(i+vec3(1,1,0)), f.x), f.y),
               mix(mix(dHash(i+vec3(0,0,1)), dHash(i+vec3(1,0,1)), f.x), mix(dHash(i+vec3(0,1,1)), dHash(i+vec3(1,1,1)), f.x), f.y), f.z); }
`;
export function patchDissolve(material, uniforms) {
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vDisPos;')
      .replace('#include <project_vertex>', `#include <project_vertex>
        vec4 disP = vec4(transformed, 1.0);
        #ifdef USE_INSTANCING
          disP = instanceMatrix * disP;
        #endif
        vDisPos = (modelMatrix * disP).xyz;`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\n' + NOISE)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        if (uDissolve > 0.0005) {
          float dn = dNoise(vDisPos * uDisScale) * 0.75 + dNoise(vDisPos * uDisScale * 2.7) * 0.25;
          if (dn < uDissolve) discard;
          totalEmissiveRadiance += uDisColor * smoothstep(uDissolve + 0.09, uDissolve, dn) * 5.0;
        }`);
  };
  material.customProgramCacheKey = () => 'dissolve';
  return material;
}
