// autopele.mjs — conserta a "pele" (skinning) dos humanoides da Tripo cujo auto-rig saiu quebrado.
//
// Diagnóstico (arquivos crus da Tripo, antes de qualquer otimização):
//   * todos os ossos vêm com transformação identidade (sem pose de repouso);
//   * ~99% dos vértices ficam com peso 1.0 num único osso (Hips) e nenhum vértice tem 2+ influências;
//   * em vários, as inverseBindMatrices são lixo (valores ~1e30, determinante ~0).
// Ou seja: não há pesos aproveitáveis. Este script refaz tudo a partir da malha (que vem em pose T):
//   1) acha ombros/braços, mãos, virilha/pernas, pescoço e cabeça pela geometria;
//   2) posiciona os ossos Mixamo existentes (mesmos nomes; dedos/ombros ficam colados ao pai);
//   3) grava matrizes de ligação coerentes (osso = translação; IBM = inversa);
//   4) recalcula JOINTS_0/WEIGHTS_0 por região (cabeça, braço E/D, perna E/D, tronco) e distância
//      ao segmento de cada osso (até 3 influências, transição suave nas juntas).
// Quadrúpedes/"other" (dragão, javali, leão-lobo, leviatã) não são humanoides: ficam como estão
// (o jogo usa animação procedural neles).
//
// uso: node tools/autopele.mjs entrada.glb saida.glb [--forcar]
// requer @gltf-transform/core, @gltf-transform/extensions e meshoptimizer (npm i)
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder, MeshoptEncoder } from 'meshoptimizer';

const [ent, sai, ...ops] = process.argv.slice(2);
const forcar = ops.includes('--forcar');
if (!ent || !sai) { console.error('uso: node autopele.mjs entrada.glb saida.glb [--forcar]'); process.exit(2); }
await MeshoptDecoder.ready; await MeshoptEncoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder, 'meshopt.encoder': MeshoptEncoder });
const doc = await io.read(ent);
const root = doc.getRoot();
const skin = root.listSkins()[0];
const nome = ent.split('/').pop();
if (!skin) { await io.write(sai, doc); console.log(nome, ': sem pele — copiado'); process.exit(0); }
const joints = skin.listJoints();
const nomeJ = joints.map(j => j.getName().replace(/^.*:/, ''));
const idx = n => nomeJ.indexOf(n);
const prims = root.listMeshes().flatMap(m => m.listPrimitives());

// ---------- diagnóstico ----------
function diagnostico() {
  let tot = 0, dom = new Map(), multi = 0;
  for (const p of prims) {
    const J = p.getAttribute('JOINTS_0'), W = p.getAttribute('WEIGHTS_0'); if (!J || !W) continue;
    const j = [], w = [];
    for (let i = 0; i < J.getCount(); i++) {
      J.getElement(i, j); W.getElement(i, w); let mk = 0, mw = -1, n = 0;
      for (let k = 0; k < 4; k++) { if (w[k] > 0.01) n++; if (w[k] > mw) { mw = w[k]; mk = j[k]; } }
      if (n > 1) multi++; dom.set(mk, (dom.get(mk) || 0) + 1); tot++;
    }
  }
  const ibm = skin.getInverseBindMatrices(), el = [];
  let lixo = 0; for (let i = 0; i < ibm.getCount(); i++) { ibm.getElement(i, el); if (!el.every(x => isFinite(x) && Math.abs(x) < 1e4)) lixo++; }
  const pico = Math.max(...dom.values()) / Math.max(1, tot);
  return { pico, multi, lixo, tot };
}
const dg = diagnostico();
const quebrada = dg.pico > 0.85 || dg.lixo > joints.length * 0.25;
const humanoide = ['Hips', 'Head', 'LeftArm', 'LeftForeArm', 'RightArm', 'RightForeArm', 'LeftUpLeg', 'LeftLeg', 'RightUpLeg', 'RightLeg'].every(n => idx(n) >= 0);
// ossos que faltam na pele (ex.: Samuel sem LeftHand): o peso vai para o osso anterior da cadeia
const RESERVA = { LeftHand: 'LeftForeArm', RightHand: 'RightForeArm', LeftFoot: 'LeftLeg', RightFoot: 'RightLeg', Neck: 'Spine2', Spine2: 'Spine1', Spine1: 'Spine', Spine: 'Hips' };
const idxOu = n => { while (n && idx(n) < 0) n = RESERVA[n]; return n ? idx(n) : idx('Hips'); };
console.log(`${nome}: osso dominante ${(dg.pico * 100).toFixed(1)}% | vértices c/ 2+ influências ${dg.multi}/${dg.tot} | IBM lixo ${dg.lixo}/${joints.length} -> ${quebrada ? 'QUEBRADA' : 'ok'}${humanoide ? '' : ' (não humanoide)'}`);
if ((!quebrada && !forcar) || !humanoide) { await io.write(sai, doc); console.log('  mantido como está'); process.exit(0); }

// ---------- vértices ----------
const V = [];
for (const p of prims) { const P = p.getAttribute('POSITION'), v = []; for (let i = 0; i < P.getCount(); i++) { P.getElement(i, v); V.push([v[0], v[1], v[2]]); } }
const pct = (arr, q) => { if (!arr.length) return 0; const s = [...arr].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.max(0, Math.floor(q * (s.length - 1))))]; };
const ys = V.map(v => v[1]), y0 = Math.min(...ys), y1 = Math.max(...ys), H = y1 - y0;
const maxX = Math.max(...V.map(v => Math.abs(v[0])));
// faixa dos braços (pose T): fatias com muitos vértices longe do centro
const NF = 100, cont = new Array(NF).fill(0);
for (const v of V) if (Math.abs(v[0]) > 0.55 * maxX) cont[Math.min(NF - 1, Math.floor((v[1] - y0) / H * NF))]++;
const picoF = cont.indexOf(Math.max(...cont));
let fa = picoF, fb = picoF; while (fa > 0 && cont[fa - 1] > 0.35 * cont[picoF]) fa--; while (fb < NF - 1 && cont[fb + 1] > 0.35 * cont[picoF]) fb++;
const bandaA = y0 + fa / NF * H, bandaB = y0 + (fb + 1) / NF * H;
// largura do tronco logo abaixo dos braços
const tronco = V.filter(v => v[1] > bandaA - 0.16 * H && v[1] < bandaA - 0.02 * H && Math.abs(v[0]) < 0.6 * maxX).map(v => Math.abs(v[0]));
const tH = Math.max(0.05 * maxX, pct(tronco, 0.9));
const zc = pct(V.filter(v => v[1] > bandaA - 0.2 * H && v[1] < bandaB).map(v => v[2]), 0.5);
// braços: vértices entre o tronco e 75% da envergadura
const braco = V.filter(v => Math.abs(v[0]) > 1.2 * tH && Math.abs(v[0]) < 0.8 * maxX && v[1] > bandaA - 0.05 * H && v[1] < bandaB + 0.05 * H);
const yOmbro = pct(braco.map(v => v[1]), 0.5) || (bandaA + bandaB) / 2;
const meiaEsp = Math.max(0.03 * H, (pct(braco.map(v => v[1]), 0.9) - pct(braco.map(v => v[1]), 0.1)) / 2);
const zBraco = pct(braco.map(v => v[2]), 0.5);
const pontaE = pct(V.filter(v => v[0] > tH && Math.abs(v[1] - yOmbro) < meiaEsp * 1.6).map(v => v[0]), 0.97) || maxX;
const pontaD = -(pct(V.filter(v => v[0] < -tH && Math.abs(v[1] - yOmbro) < meiaEsp * 1.6).map(v => -v[0]), 0.97) || maxX);
// pescoço/cabeça
const yPesc = Math.min(y1 - 0.15 * H, yOmbro + meiaEsp * 1.1);
// virilha: fatias com um vão no meio (duas pernas)
let yVir = null;
for (let k = 1; k < 60; k++) {
  const ya = y0 + k * 0.01 * H; if (ya > yOmbro - 0.1 * H) break;
  const fat = V.filter(v => Math.abs(v[1] - ya) < 0.006 * H && Math.abs(v[0]) < tH);
  if (fat.length < 25) continue;
  const meio = fat.filter(v => Math.abs(v[0]) < 0.035 * tH * 2).length;
  if (meio / fat.length < 0.02) yVir = ya; else if (yVir !== null) break;
}
const robe = yVir === null;
if (robe) yVir = y0 + 0.3 * (yOmbro - y0);
const pernas = V.filter(v => v[1] < y0 + (yVir - y0) * 0.6 && Math.abs(v[0]) < tH);
const xPerna = Math.max(0.08 * tH, pct(pernas.map(v => Math.abs(v[0])), 0.5));
const zPe = pct(pernas.map(v => v[2]), 0.5);
const zPeFrente = pct(V.filter(v => v[1] < y0 + 0.06 * H).map(v => v[2]), 0.95);

// ---------- esqueleto (espaço da malha) ----------
const P = {};
const lerp = (a, b, t) => a.map((x, i) => x + (b[i] - x) * t);
P.Hips = [0, yVir + 0.04 * H, zc];
P.Neck = [0, yPesc, zc];
P.Spine = lerp(P.Hips, P.Neck, 0.25); P.Spine1 = lerp(P.Hips, P.Neck, 0.5); P.Spine2 = lerp(P.Hips, P.Neck, 0.75);
P.Head = [0, yPesc + 0.05 * H, zc]; P.HeadTop_End = [0, y1, zc];
for (const [L, s, ponta] of [['Left', 1, pontaE], ['Right', -1, pontaD]]) {
  const ombro = [s * tH * 0.92, yOmbro, zBraco], tip = [ponta, yOmbro, zBraco];
  P[L + 'Shoulder'] = lerp(P.Spine2, ombro, 0.6); P[L + 'Shoulder'][1] = yOmbro;
  P[L + 'Arm'] = ombro; P[L + 'ForeArm'] = lerp(ombro, tip, 0.45); P[L + 'Hand'] = lerp(ombro, tip, 0.78);
  P[L + 'UpLeg'] = [s * xPerna, yVir, zc]; P[L + 'Foot'] = [s * xPerna, y0 + 0.07 * H, zPe];
  P[L + 'Leg'] = lerp(P[L + 'UpLeg'], P[L + 'Foot'], 0.5);
  P[L + 'ToeBase'] = [s * xPerna, y0 + 0.02 * H, (zPe + zPeFrente) / 2]; P[L + 'Toe_End'] = [s * xPerna, y0 + 0.02 * H, zPeFrente];
}
// segmentos que recebem peso: [osso, ponta]
const SEG = { Hips: ['Hips', 'Spine'], Spine: ['Spine', 'Spine1'], Spine1: ['Spine1', 'Spine2'], Spine2: ['Spine2', 'Neck'], Neck: ['Neck', 'Head'], Head: ['Head', 'HeadTop_End'] };
for (const L of ['Left', 'Right']) {
  SEG[L + 'Arm'] = [L + 'Arm', L + 'ForeArm']; SEG[L + 'ForeArm'] = [L + 'ForeArm', L + 'Hand']; SEG[L + 'Hand'] = [L + 'Hand', null];
  SEG[L + 'UpLeg'] = [L + 'UpLeg', L + 'Leg']; SEG[L + 'Leg'] = [L + 'Leg', L + 'Foot']; SEG[L + 'Foot'] = [L + 'Foot', L + 'ToeBase'];
}
const fimMao = L => { const s = L === 'Left' ? 1 : -1; return [(L === 'Left' ? pontaE : pontaD) + s * 0.02, yOmbro, zBraco]; };
const seg = n => { const [a, b] = SEG[n]; return [P[a], b ? P[b] : fimMao(n.replace('Hand', ''))]; };
function distSeg(v, a, b) {
  const ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], av = [v[0] - a[0], v[1] - a[1], v[2] - a[2]];
  const l2 = ab[0] ** 2 + ab[1] ** 2 + ab[2] ** 2 || 1e-9; const t = Math.max(0, Math.min(1, (av[0] * ab[0] + av[1] * ab[1] + av[2] * ab[2]) / l2));
  return Math.hypot(av[0] - ab[0] * t, av[1] - ab[1] * t, av[2] - ab[2] * t);
}
const TRONCO = ['Hips', 'Spine', 'Spine1', 'Spine2', 'Neck'];
function candidatos(v) {
  const [x, y] = v, s = x >= 0 ? 'Left' : 'Right', ax = Math.abs(x);
  const ponta = Math.abs(x >= 0 ? pontaE : pontaD);
  if (ax > 0.8 * ponta || (ax > 1.05 * tH && y > yOmbro - meiaEsp * 2.2 && y > yVir)) { // braço (ou arma na mão)
    if (ax > 0.55 * ponta && Math.abs(y - yOmbro) > 1.6 * meiaEsp) return [s + 'Hand']; // cajado/arma em pé: rígido na mão
    return ax < 1.5 * tH ? [s + 'Arm', s + 'ForeArm', 'Spine2', 'Neck'] : [s + 'Arm', s + 'ForeArm', s + 'Hand'];
  }
  if (y > yPesc) return y < yPesc + 0.04 * H ? ['Neck', 'Head', 'Spine2'] : ['Head'];
  if (y < yVir) {
    if (ax < 0.35 * xPerna) return ['LeftUpLeg', 'RightUpLeg', 'LeftLeg', 'RightLeg', 'Hips'];
    return [s + 'UpLeg', s + 'Leg', s + 'Foot', 'Hips'];
  }
  if (y > yOmbro - meiaEsp * 2.2) return [...TRONCO, s + 'Arm'];
  return y < yVir + 0.06 * H ? [...TRONCO, s + 'UpLeg'] : TRONCO;
}

// ---------- grava ossos e matrizes de ligação ----------
const mundo = new Map();
const pai = j => j.getParentNode ? j.getParentNode() : root.listNodes().find(n => n.listChildren().includes(j));
function posMundo(j) {
  if (mundo.has(j)) return mundo.get(j);
  const n = j.getName().replace(/^.*:/, ''); let p = P[n];
  if (!p) { // dedos, ombros extras etc.: colados ao pai
    const pj = pai(j); p = pj && joints.includes(pj) ? posMundo(pj) : [0, 0, 0];
  }
  mundo.set(j, p); return p;
}
for (const j of joints) {
  const p = posMundo(j), pj = pai(j), pp = pj && joints.includes(pj) ? posMundo(pj) : [0, 0, 0];
  j.setTranslation([p[0] - pp[0], p[1] - pp[1], p[2] - pp[2]]).setRotation([0, 0, 0, 1]).setScale([1, 1, 1]);
}
const ibmArr = new Float32Array(joints.length * 16);
joints.forEach((j, i) => { const p = posMundo(j); ibmArr.set([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, -p[0], -p[1], -p[2], 1], i * 16); });
skin.getInverseBindMatrices().setArray(ibmArr);

// ---------- pesos ----------
const hist = {};
for (const p of prims) {
  const Pa = p.getAttribute('POSITION'), n = Pa.getCount(), J = new Uint16Array(n * 4), W = new Float32Array(n * 4), v = [];
  for (let i = 0; i < n; i++) {
    Pa.getElement(i, v);
    const cs = candidatos(v).map(b => ({ b, d: distSeg(v, ...seg(b)) })).sort((a, b) => a.d - b.d).slice(0, 3);
    const d0 = cs[0].d + 0.01 * H;
    let ws = cs.map(c => Math.pow(d0 / (c.d + 0.01 * H), 6)); // decai rápido: só mistura perto das juntas
    const s = ws.reduce((a, b) => a + b, 0); ws = ws.map(w => w / s);
    cs.forEach((c, k) => { J[i * 4 + k] = idxOu(c.b); W[i * 4 + k] = ws[k]; });
    hist[cs[0].b] = (hist[cs[0].b] || 0) + 1;
  }
  p.getAttribute('JOINTS_0').setType('VEC4').setArray(J);
  p.getAttribute('WEIGHTS_0').setType('VEC4').setArray(W).setNormalized(false);
}
await io.write(sai, doc);
const f = x => x.toFixed(3);
console.log(`  ajuste: altura ${f(H)} ombro y=${f(yOmbro)} meia-espessura ${f(meiaEsp)} tronco ±${f(tH)} mãos ${f(pontaD)}..${f(pontaE)} pescoço ${f(yPesc)} virilha ${f(yVir)}${robe ? ' (manto: estimada)' : ''} pernas ±${f(xPerna)}`);
console.log('  ossos dominantes:', Object.entries(hist).sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k} ${n}`).join(', '));
