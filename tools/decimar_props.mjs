// Decima os props da Tripo: cor da textura -> cor por vértice, solda por posição, simplifica (meshoptimizer)
import { NodeIO, Document } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptSimplifier } from 'meshoptimizer';
import sharp from 'sharp';
import fs from 'fs';
await MeshoptSimplifier.ready;
const [src, dst, alvoTris] = process.argv.slice(2);
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc = await io.read(src);
const lin = c => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
let P = [], Cc = [], I = [], base = 0;
for (const mesh of doc.getRoot().listMeshes()) for (const prim of mesh.listPrimitives()) {
  const pos = prim.getAttribute('POSITION'), uv = prim.getAttribute('TEXCOORD_0'), idx = prim.getIndices();
  const mat = prim.getMaterial(); const tex = mat?.getBaseColorTexture(); const fator = mat?.getBaseColorFactor() || [1, 1, 1, 1];
  let img = null, W = 0, H = 0;
  if (tex) { const r = await sharp(Buffer.from(tex.getImage())).resize(1024, 1024, { fit: 'fill' }).removeAlpha().raw().toBuffer({ resolveWithObject: true }); img = r.data; W = r.info.width; H = r.info.height; }
  const n = pos.getCount(), v = [0, 0, 0], t = [0, 0];
  for (let i = 0; i < n; i++) {
    pos.getElement(i, v); P.push(v[0], v[1], v[2]);
    let r = 1, g = 1, b = 1;
    if (img && uv) { uv.getElement(i, t); const x = Math.min(W - 1, Math.max(0, Math.floor((t[0] - Math.floor(t[0])) * W))), y = Math.min(H - 1, Math.max(0, Math.floor((t[1] - Math.floor(t[1])) * H))); const o = (y * W + x) * 3; r = img[o] / 255; g = img[o + 1] / 255; b = img[o + 2] / 255; }
    Cc.push(lin(r) * fator[0], lin(g) * fator[1], lin(b) * fator[2]);
  }
  if (idx) for (let i = 0; i < idx.getCount(); i++) I.push(idx.getScalar(i) + base); else for (let i = 0; i < n; i++) I.push(i + base);
  base += n;
}
// solda por posição
let min = [1e9, 1e9, 1e9], max = [-1e9, -1e9, -1e9];
for (let i = 0; i < P.length; i += 3) for (let k = 0; k < 3; k++) { min[k] = Math.min(min[k], P[i + k]); max[k] = Math.max(max[k], P[i + k]); }
const ext = Math.max(max[0] - min[0], max[1] - min[1], max[2] - min[2]), q = 20000 / ext;
const mapa = new Map(), remap = new Uint32Array(P.length / 3); const P2 = [], C2 = [], cont = [];
for (let i = 0; i < P.length / 3; i++) {
  const k = Math.round(P[i * 3] * q) + ',' + Math.round(P[i * 3 + 1] * q) + ',' + Math.round(P[i * 3 + 2] * q);
  let j = mapa.get(k);
  if (j === undefined) { j = P2.length / 3; mapa.set(k, j); P2.push(P[i * 3], P[i * 3 + 1], P[i * 3 + 2]); C2.push(0, 0, 0); cont.push(0); }
  C2[j * 3] += Cc[i * 3]; C2[j * 3 + 1] += Cc[i * 3 + 1]; C2[j * 3 + 2] += Cc[i * 3 + 2]; cont[j]++; remap[i] = j;
}
for (let j = 0; j < cont.length; j++) for (let k = 0; k < 3; k++) C2[j * 3 + k] /= cont[j];
const idx = new Uint32Array(I.length); for (let i = 0; i < I.length; i++) idx[i] = remap[I[i]];
const pos = new Float32Array(P2), cor = new Float32Array(C2);
console.log('tris', I.length / 3, 'verts soldados', pos.length / 3);
const alvo = Math.floor(Number(alvoTris) * 3);
let [novo, erro] = MeshoptSimplifier.simplifyWithAttributes(idx, pos, 3, cor, 3, [0.6, 0.6, 0.6], null, alvo, 0.08, []);
if (novo.length > alvo * 1.5) [novo, erro] = MeshoptSimplifier.simplifySloppy(idx, pos, 3, null, alvo, 0.05);
console.log('tris finais', novo.length / 3, 'erro', erro.toFixed(4));
// compacta
const usado = new Int32Array(pos.length / 3).fill(-1); const fp = [], fc = []; const fi = new Uint32Array(novo.length);
for (let i = 0; i < novo.length; i++) { let v = novo[i]; if (usado[v] < 0) { usado[v] = fp.length / 3; fp.push(pos[v * 3], pos[v * 3 + 1], pos[v * 3 + 2]); fc.push(cor[v * 3], cor[v * 3 + 1], cor[v * 3 + 2]); } fi[i] = usado[v]; }
// normais suaves
const N = new Float32Array(fp.length);
for (let i = 0; i < fi.length; i += 3) {
  const a = fi[i] * 3, b = fi[i + 1] * 3, c = fi[i + 2] * 3;
  const ux = fp[b] - fp[a], uy = fp[b + 1] - fp[a + 1], uz = fp[b + 2] - fp[a + 2], vx = fp[c] - fp[a], vy = fp[c + 1] - fp[a + 1], vz = fp[c + 2] - fp[a + 2];
  const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
  for (const o of [a, b, c]) { N[o] += nx; N[o + 1] += ny; N[o + 2] += nz; }
}
for (let i = 0; i < N.length; i += 3) { const l = Math.hypot(N[i], N[i + 1], N[i + 2]) || 1; N[i] /= l; N[i + 1] /= l; N[i + 2] /= l; }
const out = new Document(); const buf = out.createBuffer();
const acc = (arr, tipo) => out.createAccessor().setArray(arr).setType(tipo).setBuffer(buf);
const prim = out.createPrimitive().setAttribute('POSITION', acc(new Float32Array(fp), 'VEC3')).setAttribute('NORMAL', acc(N, 'VEC3')).setAttribute('COLOR_0', acc(new Float32Array(fc), 'VEC3')).setIndices(acc(fp.length / 3 > 65535 ? fi : new Uint16Array(fi), 'SCALAR'))
  .setMaterial(out.createMaterial('prop').setRoughnessFactor(0.85).setMetallicFactor(0));
const m = out.createMesh('prop').addPrimitive(prim);
out.createScene().addChild(out.createNode('prop').setMesh(m));
await new NodeIO().write(dst, out);
console.log('ok', dst);
