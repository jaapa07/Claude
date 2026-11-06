"""fetch_vendor.py: download three.js 0.160.0 (the module file plus the post-processing passes), cannon-es 0.20.0 and the
two fonts (Oswald 700, JetBrains Mono 700) into engine/vendor/, once, so renders never depend on the internet.
This copy pulls the npm package tarballs from registry.npmjs.org (the jsdelivr CDN is blocked on this machine).
Run: python engine/fetch_vendor.py"""
import io, os, tarfile, urllib.request
HERE = os.path.dirname(os.path.abspath(__file__)); V = os.path.join(HERE, "vendor")
PKGS = {"three": ("three/-/three-0.160.0.tgz", {"build/three.module.js": "three.module.js"}),
        "cannon": ("cannon-es/-/cannon-es-0.20.0.tgz", {"dist/cannon-es.js": "cannon-es.js"}),
        "oswald": ("@fontsource/oswald/-/oswald-5.0.8.tgz", {"files/oswald-latin-700-normal.woff2": "fonts/oswald-latin-700-normal.woff2"}),
        "mono": ("@fontsource/jetbrains-mono/-/jetbrains-mono-5.0.8.tgz", {"files/jetbrains-mono-latin-700-normal.woff2": "fonts/jetbrains-mono-latin-700-normal.woff2"})}
for f in ["EffectComposer", "RenderPass", "ShaderPass", "UnrealBloomPass", "OutputPass", "MaskPass", "Pass"]:
    PKGS["three"][1][f"examples/jsm/postprocessing/{f}.js"] = f"addons/postprocessing/{f}.js"
for f in ["CopyShader", "LuminosityHighPassShader", "OutputShader"]:
    PKGS["three"][1][f"examples/jsm/shaders/{f}.js"] = f"addons/shaders/{f}.js"
for name, (url, files) in PKGS.items():
    if all(os.path.exists(os.path.join(V, d)) for d in files.values()): continue
    tf = tarfile.open(fileobj=io.BytesIO(urllib.request.urlopen("https://registry.npmjs.org/" + url, timeout=120).read()))
    for src, dst in files.items():
        p = os.path.join(V, dst); os.makedirs(os.path.dirname(p), exist_ok=True)
        open(p, "wb").write(tf.extractfile("package/" + src).read()); print("downloaded", dst)
print("vendor ready:", V)
