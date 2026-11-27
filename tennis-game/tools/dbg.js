// helpers injected via eval in tools/play.cjs
window.dbgCam = (fx, fy, fz, tx, ty, tz, fov = 40) => { const s = __game.session; const V = s.cam.cam.position.constructor; s.cam.set({ kind: 'track', from: new V(fx, fy, fz), target: () => new V(tx, ty, tz), fov }); return 'ok'; };
