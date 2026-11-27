import * as THREE from 'three';

// Two-handed backhand built from the forehand:
//  1) the whole forehand clip is mirrored left<->right in model space (correcting for each bone's rest frame), so the
//     body performs the swing on the left side;
//  2) the racket path of the forehand is sampled and mirrored, and at runtime the right hand is pulled onto the
//     left hand with two-bone IK and oriented so the racket follows that mirrored path.

const mirrorQ = (q: THREE.Quaternion) => new THREE.Quaternion(q.x, -q.y, -q.z, q.w);
const partner = (n: string) => (/_l$/.test(n) ? n.replace(/_l$/, '_r') : /_r$/.test(n) ? n.replace(/_r$/, '_l') : n);

export interface BackhandData {
  clip: THREE.AnimationClip;
  fps: number;
  dir: THREE.Vector3[]; // racket axis (grip -> head), model space
  normal: THREE.Vector3[]; // string-face normal, model space
}

/** Mirror a clip on a skeleton (model must be at the origin, unrotated, in its rest pose). */
export function mirrorClip(src: THREE.AnimationClip, model: THREE.Object3D, name: string, fps = 60): THREE.AnimationClip {
  const bones: THREE.Bone[] = [];
  model.traverse((o) => { if ((o as THREE.Bone).isBone) bones.push(o as THREE.Bone); });
  const byName = new Map(bones.map((b) => [b.name, b]));
  model.updateMatrixWorld(true);
  const restW = new Map(bones.map((b) => [b.name, b.getWorldQuaternion(new THREE.Quaternion())]));
  const restLocal = new Map(bones.map((b) => [b.name, { q: b.quaternion.clone(), p: b.position.clone() }]));
  const mixer = new THREE.AnimationMixer(model);
  const act = mixer.clipAction(src);
  act.play();
  const n = Math.max(2, Math.ceil(src.duration * fps) + 1);
  const times = new Float32Array(n);
  const qv = new Map(bones.map((b) => [b.name, new Float32Array(n * 4)]));
  const posTracks = src.tracks.filter((t) => t.name.endsWith('.position')).map((t) => t.name.replace('.position', ''));
  const pv = new Map(posTracks.map((b) => [b, new Float32Array(n * 3)]));
  for (let i = 0; i < n; i++) {
    const t = Math.min(src.duration, i / fps);
    times[i] = t;
    mixer.setTime(t);
    model.updateMatrixWorld(true);
    const W = new Map(bones.map((b) => [b.name, b.getWorldQuaternion(new THREE.Quaternion())]));
    const Wm = new Map<string, THREE.Quaternion>();
    for (const b of bones) {
      const s = partner(b.name);
      const ws = W.get(s) ?? W.get(b.name)!;
      const rs = restW.get(s) ?? restW.get(b.name)!;
      // mirrored world rotation, re-expressed in the destination bone's own rest frame
      Wm.set(b.name, mirrorQ(ws).multiply(mirrorQ(rs).invert()).multiply(restW.get(b.name)!));
    }
    for (const b of bones) {
      const parent = b.parent as THREE.Object3D;
      const pw = (parent as THREE.Bone).isBone ? Wm.get(parent.name)! : parent.getWorldQuaternion(new THREE.Quaternion());
      const local = pw.clone().invert().multiply(Wm.get(b.name)!);
      local.toArray(qv.get(b.name)!, i * 4);
    }
    for (const bn of posTracks) {
      const s = byName.get(partner(bn)) ?? byName.get(bn)!;
      const p = s.position;
      pv.get(bn)!.set([-p.x, p.y, p.z], i * 3);
    }
  }
  mixer.stopAllAction();
  mixer.uncacheRoot(model);
  for (const b of bones) { const r = restLocal.get(b.name)!; b.quaternion.copy(r.q); b.position.copy(r.p); }
  model.updateMatrixWorld(true);
  const tracks: THREE.KeyframeTrack[] = [];
  for (const b of bones) tracks.push(new THREE.QuaternionKeyframeTrack(`${b.name}.quaternion`, times, qv.get(b.name)!));
  for (const bn of posTracks) tracks.push(new THREE.VectorKeyframeTrack(`${bn}.position`, times, pv.get(bn)!));
  return new THREE.AnimationClip(name, src.duration, tracks);
}

/** Sample the forehand racket path (model space) and mirror it. */
export function sampleMirroredRacket(model: THREE.Object3D, src: THREE.AnimationClip, racket: THREE.Object3D, head: THREE.Object3D, fps = 60) {
  const mixer = new THREE.AnimationMixer(model);
  mixer.clipAction(src).play();
  const n = Math.max(2, Math.ceil(src.duration * fps) + 1);
  const dir: THREE.Vector3[] = [], normal: THREE.Vector3[] = [];
  const restLocal: { b: THREE.Object3D; q: THREE.Quaternion; p: THREE.Vector3 }[] = [];
  model.traverse((o) => { if ((o as THREE.Bone).isBone) restLocal.push({ b: o, q: o.quaternion.clone(), p: o.position.clone() }); });
  for (let i = 0; i < n; i++) {
    mixer.setTime(Math.min(src.duration, i / fps));
    model.updateMatrixWorld(true);
    const g = racket.getWorldPosition(new THREE.Vector3());
    const h = head.getWorldPosition(new THREE.Vector3());
    const d = h.sub(g).normalize();
    const nz = new THREE.Vector3(0, 0, 1).applyQuaternion(racket.getWorldQuaternion(new THREE.Quaternion())).normalize();
    dir.push(new THREE.Vector3(-d.x, d.y, d.z));
    normal.push(new THREE.Vector3(-nz.x, nz.y, nz.z));
  }
  mixer.stopAllAction();
  mixer.uncacheRoot(model);
  for (const r of restLocal) { r.b.quaternion.copy(r.q); r.b.position.copy(r.p); }
  model.updateMatrixWorld(true);
  return { dir, normal, fps };
}

const tq = new THREE.Quaternion();
function rotateToward(bone: THREE.Object3D, from: THREE.Vector3, to: THREE.Vector3, w: number) {
  if (from.lengthSq() < 1e-8 || to.lengthSq() < 1e-8) return;
  const q = new THREE.Quaternion().setFromUnitVectors(from.clone().normalize(), to.clone().normalize());
  if (w < 1) q.slerp(new THREE.Quaternion(), 1 - w);
  const world = bone.getWorldQuaternion(new THREE.Quaternion()).premultiply(q);
  const pw = bone.parent!.getWorldQuaternion(tq).invert();
  bone.quaternion.copy(pw.multiply(world));
  bone.updateMatrixWorld(true);
}

/** Analytic two-bone IK (shoulder-elbow-wrist) toward `target`, bending toward `pole`. */
export function twoBoneIK(a: THREE.Bone, b: THREE.Bone, c: THREE.Bone, target: THREE.Vector3, pole: THREE.Vector3, w = 1) {
  const pa = a.getWorldPosition(new THREE.Vector3());
  const pb = b.getWorldPosition(new THREE.Vector3());
  const pc = c.getWorldPosition(new THREE.Vector3());
  const lab = pa.distanceTo(pb), lbc = pb.distanceTo(pc);
  const toT = target.clone().sub(pa);
  const dist = THREE.MathUtils.clamp(toT.length(), 0.05, lab + lbc - 0.002);
  const dir = toT.normalize();
  const cosA = THREE.MathUtils.clamp((lab * lab + dist * dist - lbc * lbc) / (2 * lab * dist), -1, 1);
  const poleDir = pole.clone().sub(pa);
  poleDir.sub(dir.clone().multiplyScalar(poleDir.dot(dir))).normalize();
  const elbow = pa.clone().add(dir.clone().multiplyScalar(lab * cosA)).add(poleDir.multiplyScalar(lab * Math.sqrt(1 - cosA * cosA)));
  rotateToward(a, pb.clone().sub(pa), elbow.clone().sub(pa), w);
  const pb2 = b.getWorldPosition(new THREE.Vector3());
  const pc2 = c.getWorldPosition(new THREE.Vector3());
  const goal = pa.clone().add(dir.clone().multiplyScalar(dist));
  rotateToward(b, pc2.clone().sub(pb2), goal.sub(pb2), w);
}

/** Set a bone's world rotation (blended by w). */
export function setWorldQuat(bone: THREE.Object3D, q: THREE.Quaternion, w: number) {
  const cur = bone.getWorldQuaternion(new THREE.Quaternion());
  cur.slerp(q, w);
  const pw = bone.parent!.getWorldQuaternion(tq).invert();
  bone.quaternion.copy(pw.multiply(cur));
  bone.updateMatrixWorld(true);
}
