# 5 videos, 5 types — from awesome-opus5-5-videos

One video per type, each built from a real prompt in
[yihui-dev/awesome-opus5-5-videos](https://github.com/yihui-dev/awesome-opus5-5-videos).
Every video is a single HTML file (Canvas 2D, Three.js or raw GLSL), rendered
frame-by-frame at 1280×720, 30 fps, with `render.js` (Playwright + ffmpeg).

| # | Type | Video | Source prompt |
|---|------|-------|---------------|
| 1 | Motion graphics | [`out/01-motion-reel.mp4`](out/01-motion-reel.mp4) (15 s) | @reflex_cloud — 15-second motion-designer résumé reel, cut to a beat |
| 2 | Explainer | [`out/02-explainer-cocktail.mp4`](out/02-explainer-cocktail.mp4) (24 s) | @Ror_Fly — recipe motion graphic, empty glass to finished cocktail |
| 3 | 3D scene | [`out/03-3d-bridge.mp4`](out/03-3d-bridge.mp4) (16 s) | @MondemSuraj — Golden Gate Bridge in Three.js with fog, water, traffic |
| 4 | Game / interactive | [`out/04-game-jelly-dice.mp4`](out/04-game-jelly-dice.mp4) (19 s) | @SpacyApps — "Jelly Dice", soft-body gummy dice |
| 5 | Generative shader art | [`out/05-shader-paper-fractal.mp4`](out/05-shader-paper-fractal.mp4) (16 s) | @jrayon — paper-craft fractal visualiser with cinematic post |

The repo groups its videos into four categories (motion, explainer, 3D, interactive); the fifth
type here is GLSL shader art, one of its most common techniques.

Notes
- No audio: the videos are silent.
- The motion reel uses a made-up studio name ("kinetic") instead of the brand in the original prompt.
- Jelly Dice uses Three.js/WebGL rather than raw WebGPU so it records in headless Chromium; the clicks on ROLL are scripted.

## Re-render

```bash
npm i three@0.160.0 playwright   # three.min.js is already copied into src/
node render.js src/01-motion-reel.html out/01-motion-reel.mp4
```

Each page exposes `window.DURATION` and `window.renderFrame(t)`, so open any file in
`src/` in a browser and call `renderFrame` to scrub it.
