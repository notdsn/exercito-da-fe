// Modelos: usa o .glb da Tripo se existir (listado em assets/models/modelos.json),
// senão cria um boneco low-poly provisório. A "frente" dos modelos é o eixo +Z.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { caminhoModelo, CHIBI_NATIVO } from './units.js';
import { Rig } from './rig.js';

const PELE = '#c99a6e';
export const ALTURA_PADRAO = 1.4;   // tropas baixinhas: cabem num hexágono

// Conserto da pele (skinning) dos GLBs da Tripo.
// 1) Os exportados com 'RootNode' (Hamã, Acabe, Dalila, Lami, Herodes) vêm com TODOS os ossos na
//    origem (transformações vazias); só as matrizes inversas de ligação (IBM) guardam a pose real.
//    Antes recalculávamos as IBM a partir desses ossos vazios: a malha aparecia, mas os ossos não
//    batiam com ela, e a animação procedural torcia braços/armas ("unidades finas e espetadas").
//    Agora reconstruímos a pose dos ossos a partir das IBM (osso = malha · IBM⁻¹).
// 2) Nos demais, a pose de repouso já é a de ligação; só recalculamos as inversas.
const _X = new THREE.Matrix4(), _X0 = new THREE.Matrix4(), _L = new THREE.Matrix4();
// Nesses arquivos a malha e as IBM também não estão no mesmo espaço (eixos/escala do FBX).
// Achamos a transformação C (uma das 24 rotações de eixos + escala + translação) que leva o
// esqueleto das IBM para cima da malha: compara o meio de cada osso com o centro dos vértices
// que ele move.
const ROT24 = (() => {
  const out = [], v = [new THREE.Vector3(1, 0, 0), new THREE.Vector3(-1, 0, 0), new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, -1, 0), new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0, -1)];
  for (const a of v) for (const b of v) { if (Math.abs(a.dot(b)) > 0.5) continue; const c = new THREE.Vector3().crossVectors(a, b); out.push(new THREE.Matrix4().makeBasis(a, b, c)); }
  return out;
})();
function ajustarEspacoIBM(o, bom) {
  const s = o.skeleton, geo = o.geometry, P = geo.attributes.position, SI = geo.attributes.skinIndex, SW = geo.attributes.skinWeight;
  const n = s.bones.length, soma = Array.from({ length: n }, () => new THREE.Vector3()), cont = new Float32Array(n), v = new THREE.Vector3();
  for (let i = 0; i < P.count; i++) for (let k = 0; k < 4; k++) {
    const w = SW.getComponent(i, k); if (w < 0.6) continue;
    const b = SI.getComponent(i, k); v.fromBufferAttribute(P, i); soma[b].addScaledVector(v, w); cont[b] += w;
  }
  const pos = s.boneInverses.map((m, i) => bom[i] ? new THREE.Vector3().setFromMatrixPosition(m.clone().invert()) : null);
  const A = [], B = [];
  s.bones.forEach((b, i) => {
    if (cont[i] < 15 || !pos[i]) return;
    const f = b.children.find(c => c.isBone); let j = f ? s.bones.indexOf(f) : -1; if (j >= 0 && !pos[j]) j = -1;
    A.push(j >= 0 ? pos[i].clone().add(pos[j]).multiplyScalar(0.5) : pos[i].clone()); B.push(soma[i].divideScalar(cont[i]));
  });
  if (A.length < 4) return new THREE.Matrix4();
  const mA = A.reduce((t, p) => t.add(p), new THREE.Vector3()).divideScalar(A.length), mB = B.reduce((t, p) => t.add(p), new THREE.Vector3()).divideScalar(B.length);
  const rA = Math.sqrt(A.reduce((t, p) => t + p.distanceToSquared(mA), 0)), rB = Math.sqrt(B.reduce((t, p) => t + p.distanceToSquared(mB), 0));
  const esc = rB / Math.max(rA, 1e-9);
  let melhor = null, menor = Infinity;
  for (const R of ROT24) {
    let e = 0; for (let i = 0; i < A.length; i++) { v.copy(A[i]).sub(mA).applyMatrix4(R).multiplyScalar(esc).add(mB); e += v.distanceToSquared(B[i]); }
    if (e < menor) { menor = e; melhor = R; }
  }
  // C(p) = esc * R * (p - mA) + mB
  return new THREE.Matrix4().makeTranslation(mB.x, mB.y, mB.z).multiply(melhor.clone()).multiply(new THREE.Matrix4().makeScale(esc, esc, esc)).multiply(new THREE.Matrix4().makeTranslation(-mA.x, -mA.y, -mA.z));
}
// 3) Alguns personagens novos (Gideão, Sansão, Faraó...) trazem IBM degeneradas (determinante ~0)
//    em ossos como dedos/pernas: elas são ignoradas e refeitas a partir da pose de repouso.
const detOk = m => { const e = m.elements, d = m.determinant(); return isFinite(d) && Math.abs(d) > 1e-12 && e.every(isFinite); };
// 4) Outros (vários dos 16 novos) vêm com IBM totalmente corrompidas (valores ~1e30) E ossos sem
//    pose: não há esqueleto aproveitável. Viram malha estática (sem pele) e são animadas pelo
//    movimento procedural de reserva (balanço/estocada), como os quadrúpedes.
function consertarPele(cena) {
  cena.updateMatrixWorld(true);
  const estaticos = [];
  cena.traverse(o => {
    if (!o.isSkinnedMesh) return;
    const s = o.skeleton, n = s.bones.length;
    const lixo = s.boneInverses.filter(m => !m.elements.every(x => isFinite(x) && Math.abs(x) < 1e4)).length;
    if (lixo > n * 0.25) { estaticos.push(o); return; }
    // 5) Pele "rígida": quase todos os vértices presos a um único osso (auto-rig da Tripo falhou
    //    nos 16 personagens chibi novos: ~97% dos vértices só nos quadris). Mexer nos braços não
    //    teria efeito; usamos a animação procedural de reserva.
    { const SI = o.geometry.attributes.skinIndex, SW = o.geometry.attributes.skinWeight, h = new Map(); let tot = 0;
      if (SI && SW) { for (let i = 0; i < SI.count; i += 3) { let mk = 0, mw = -1; for (let k = 0; k < 4; k++) { const w = SW.getComponent(i, k); if (w > mw) { mw = w; mk = SI.getComponent(i, k); } } h.set(mk, (h.get(mk) || 0) + 1); tot++; }
        if (tot && Math.max(...h.values()) / tot > 0.85) { estaticos.push(o); return; } } }
    const bom = s.boneInverses.map(detOk);
    const ref = bom.indexOf(true);
    let difere = false;
    if (ref >= 0) {
      _X0.multiplyMatrices(s.bones[ref].matrixWorld, s.boneInverses[ref]);
      for (let i = 0; i < n && !difere; i++) {
        if (!bom[i] || i === ref) continue;
        _X.multiplyMatrices(s.bones[i].matrixWorld, s.boneInverses[i]);
        for (let k = 0; k < 16; k++) if (Math.abs(_X.elements[k] - _X0.elements[k]) > 2e-3 * Math.max(1, Math.abs(_X0.elements[k]))) { difere = true; break; }
      }
    }
    if (difere) {
      const C = ajustarEspacoIBM(o, bom);
      const W = new Array(n);
      // processa pais antes dos filhos
      const ordem = [...s.bones.keys()].sort((a, b) => profundidade(s.bones[a]) - profundidade(s.bones[b]));
      for (const i of ordem) {
        const b = s.bones[i], pi = s.bones.indexOf(b.parent);
        const pw = pi >= 0 ? W[pi] : (b.parent ? b.parent.matrixWorld : new THREE.Matrix4());
        if (bom[i]) W[i] = o.matrixWorld.clone().multiply(C).multiply(s.boneInverses[i].clone().invert());
        else W[i] = pw.clone().multiply(b.matrix); // IBM ruim: mantém a posição local de repouso
        _L.copy(pw).invert().multiply(W[i]).decompose(b.position, b.quaternion, b.scale);
      }
      cena.updateMatrixWorld(true);
      o.userData.peleReconstruida = true;
    }
    s.calculateInverses(); o.bind(s, o.matrixWorld);
  });
  for (const o of estaticos) {
    const geo = o.geometry.clone(); geo.deleteAttribute('skinIndex'); geo.deleteAttribute('skinWeight');
    const m = new THREE.Mesh(geo, o.material); m.name = o.name; m.matrix.copy(o.matrix); m.matrix.decompose(m.position, m.quaternion, m.scale);
    o.parent.add(m); o.parent.remove(o);
  }
  return estaticos.length > 0;
}
function profundidade(o) { let d = 0; while (o.parent) { d++; o = o.parent; } return d; }
const mats = {};
function mat(cor, extra = {}) {
  const k = cor + JSON.stringify(extra);
  if (!mats[k]) mats[k] = new THREE.MeshStandardMaterial({ color: cor, flatShading: true, roughness: 0.8, ...extra });
  return mats[k];
}
function malha(geo, m, x = 0, y = 0, z = 0) {
  const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = true; return o;
}


// ---- memória de GPU (iPhone) ----
const TEX_MAX = 512;
// o arquivo pede textura de cor mas o material ficou sem (decodificação falhou em silêncio → boneco cinza)
function texturasFaltando(g) {
  const js = g.parser && g.parser.json; if (!js || !js.materials) return false;
  const pedem = new Set(); js.materials.forEach((m, i) => { if (m.pbrMetallicRoughness && m.pbrMetallicRoughness.baseColorTexture) pedem.add(i); });
  if (!pedem.size) return false;
  let falta = false;
  g.scene.traverse(o => { if (!o.isMesh) return; for (const m of [].concat(o.material)) { const ref = g.parser.associations.get(m); if (ref && pedem.has(ref.materials) && (!m.map || !m.map.image)) falta = true; } });
  return falta;
}
function liberar(g) { g.scene.traverse(o => { if (o.isMesh) { o.geometry.dispose(); for (const m of [].concat(o.material)) { for (const k in m) if (m[k] && m[k].isTexture) m[k].dispose(); m.dispose(); } } }); }
// personagens são pequenos na tela: só a textura de cor (e emissiva), no máximo 512 px
function aliviarTexturas(raiz) {
  const feitas = new Map();
  const reduzir = t => {
    if (!t || !t.image) return t; if (feitas.has(t)) return feitas.get(t);
    const im = t.image, w = im.width || 0, h = im.height || 0;
    if (Math.max(w, h) > TEX_MAX && typeof document !== 'undefined') {
      const k = TEX_MAX / Math.max(w, h), cv = document.createElement('canvas');
      cv.width = Math.round(w * k); cv.height = Math.round(h * k);
      cv.getContext('2d').drawImage(im, 0, 0, cv.width, cv.height);
      if (im.close) im.close();
      t.image = cv; t.needsUpdate = true;
    }
    feitas.set(t, t); return t;
  };
  raiz.traverse(o => {
    if (!o.isMesh) return;
    for (const m of [].concat(o.material)) {
      for (const k of ['normalMap', 'roughnessMap', 'metalnessMap', 'aoMap', 'bumpMap', 'displacementMap']) if (m[k]) { m[k].dispose(); m[k] = null; }
      if ('metalness' in m) { m.metalness = 0; m.roughness = Math.max(0.7, m.roughness); }
      reduzir(m.map); reduzir(m.emissiveMap);
      m.needsUpdate = true;
    }
  });
}


// pesos "de longe" (ex.: ponta do cajado meio na mão, meio na coluna; manga meio no braço, meio no quadril)
// esticam a malha quando o braço gira. Só mantemos influências do osso dominante, do pai e dos filhos dele.
function pesosVizinhos(raiz) {
  raiz.traverse(o => {
    if (!o.isSkinnedMesh) return;
    const B = o.skeleton.bones, g = o.geometry, SI = g.attributes.skinIndex, SW = g.attributes.skinWeight; if (!SI || !SW) return;
    const viz = B.map(b => new Set([b, b.parent, ...b.children].filter(x => x && x.isBone).map(x => B.indexOf(x)).filter(i => i >= 0)));
    let mexidos = 0;
    for (let i = 0; i < SI.count; i++) {
      let dom = -1, wd = 0; for (let c = 0; c < 4; c++) { const w = SW.getComponent(i, c); if (w > wd) { wd = w; dom = SI.getComponent(i, c); } }
      if (dom < 0) continue; let soma = 0, mudou = false; const ws = [0, 0, 0, 0];
      for (let c = 0; c < 4; c++) { const w = SW.getComponent(i, c); if (w > 0 && !viz[dom].has(SI.getComponent(i, c))) { mudou = true; continue; } ws[c] = w; soma += w; }
      if (!mudou || soma <= 0) continue;
      for (let c = 0; c < 4; c++) SW.setComponent(i, c, ws[c] / soma); mexidos++;
    }
    if (mexidos) SW.needsUpdate = true;
  });
}

export class Modelos {
  constructor() {
    this.disponiveis = new Set(); this.chibi = new Set(); this.gltfs = {}; this.porArquivo = {};
    this.loader = new GLTFLoader(); this.loader.setMeshoptDecoder(MeshoptDecoder);
  }

  // Lê assets/models/modelos.json (gerado pelo servidor.py) e carrega os GLBs listados.
  async iniciar(defs, aoProgredir) {
    try {
      const r = await fetch('assets/models/modelos.json', { cache: 'no-store' });
      if (r.ok) { const lista = await r.json(); (Array.isArray(lista) ? lista : Object.keys(lista)).forEach(id => this.disponiveis.add(id)); }
    } catch (e) { /* sem lista: usa só bonecos */ }
    try { // arquivos já em estilo chibi (escritos pelo tools/importar_personagens.sh)
      const r = await fetch('assets/models/chibi.json', { cache: 'no-store' });
      if (r.ok) (await r.json()).forEach(id => this.chibi.add(id));
    } catch (e) { /* opcional */ }
    // cada unidade aponta para um arquivo; só carrega os que existem na pasta (lista gerada pelo servidor.py)
    const D = this.disponiveis, cam = id => caminhoModelo(id, defs[id], D);
    const arquivoDe = id => cam(id).split('/').pop().replace(/\.glb$/i, '');
    const ids = Object.keys(defs).filter(id => this.disponiveis.has(arquivoDe(id)));
    const caminhos = [...new Set(ids.map(cam))];
    let n = 0;
    // no máximo 3 arquivos por vez (decodificar dezenas de texturas juntas estoura a memória do iPhone)
    // e, se alguma textura falhar ao decodificar (o boneco ficaria cinza), tenta o arquivo de novo
    const carregar = c => new Promise(res => this.loader.load(c, res, undefined, err => { console.warn('Não consegui carregar o modelo', c, err); res(null); }));
    const fila = [...caminhos];
    const trabalhador = async () => {
      while (fila.length) {
        const c = fila.shift();
        let g = await carregar(c);
        for (let tent = 0; g && texturasFaltando(g) && tent < 2; tent++) {
          console.warn('Texturas faltando em', c, '— tentando de novo'); liberar(g); g = await carregar(c);
        }
        if (g) { aliviarTexturas(g.scene); g.semPele = consertarPele(g.scene); if (!g.semPele) pesosVizinhos(g.scene); this.porArquivo[c] = g; }
        aoProgredir?.(++n, caminhos.length);
      }
    };
    await Promise.all([0, 1, 2].map(trabalhador));
    for (const id of ids) { const g = this.porArquivo[cam(id)]; if (g) { g.chibiNativo = CHIBI_NATIVO.has(arquivoDe(id)) || this.chibi.has(arquivoDe(id)); this.gltfs[id] = g; } }
  }

  // Retorna { obj, mixer|null, altura }
  criar(id, def, inimigo) {
    const g = this.gltfs[id];
    if (g) return this.criarGLB(g, def);
    const obj = this.boneco(id, def);
    const alt0 = new THREE.Box3().setFromObject(obj).max.y || ALTURA_PADRAO;
    obj.scale.multiplyScalar(ALTURA_PADRAO * (def.forma === 'humanoide' || !def.forma ? 1 : 0.95) / alt0);
    const alt = new THREE.Box3().setFromObject(obj).max.y;
    return { obj, mixer: null, rig: null, altura: Math.min(ALTURA_PADRAO, alt || ALTURA_PADRAO) };
  }

  criarGLB(g, def) {
    const cena = cloneSkinned(g.scene);
    cena.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = false; o.frustumCulled = false; } });
    const rig = g.semPele ? null : Rig.criar(cena, { bracos: def.rigBracos, chibi: def.chibi ?? !g.chibiNativo });
    // a caixa de malhas com pele precisa ser recalculada depois de mexer nos ossos (chibi)
    cena.updateMatrixWorld(true);
    cena.traverse(o => { if (o.isSkinnedMesh) { o.skeleton.update(); o.boundingBox = null; o.boundingSphere = null; } });
    const pivo = new THREE.Group();
    pivo.add(cena);
    cena.rotation.y = THREE.MathUtils.degToRad(def.rotY || 0);
    cena.updateMatrixWorld(true);
    const caixa = new THREE.Box3().setFromObject(cena);
    const tam = caixa.getSize(new THREE.Vector3());
    const alvo = def.altura || ALTURA_PADRAO; // todos do mesmo tamanho
    let esc = alvo / Math.max(0.0001, tam.y);
    // criaturas sem esqueleto humano (quadrúpedes, dragões, golens): também limitamos a "pegada"
    // no chão para todas ocuparem um hexágono do mesmo jeito
    if (!rig && !def.gigante) esc = Math.min(esc, 1.55 / Math.max(0.0001, tam.x, tam.z));
    cena.scale.multiplyScalar(esc);
    cena.updateMatrixWorld(true);
    const c2 = new THREE.Box3().setFromObject(cena);
    const centro = c2.getCenter(new THREE.Vector3());
    cena.position.x -= centro.x; cena.position.z -= centro.z; cena.position.y -= c2.min.y;
    let mixer = null;
    if (g.animations && g.animations.length) {
      mixer = new THREE.AnimationMixer(cena);
      const clip = g.animations.find(a => /idle|parad|stand/i.test(a.name)) || g.animations[0];
      mixer.clipAction(clip).play();
    }
    return { obj: pivo, mixer, rig, altura: alvo };
  }

  // ---------- Bonecos provisórios ----------
  boneco(id, def) {
    const grp = new THREE.Group();
    const trevas = def.lado === 'trevas';
    const f = def.forma || 'humanoide';
    if (f === 'fera' || f === 'dragao') this.fera(grp, def, f === 'dragao', id === 'leao');
    else if (f === 'serpente') this.serpente(grp, def);
    else this.humanoide(grp, def, trevas);
    grp.scale.multiplyScalar(f === 'humanoide' ? 1.33 : 1.45);
    return grp;
  }

  humanoide(g, def, trevas) {
    const manto = mat(def.cor, def.brilho ? { emissive: def.cor, emissiveIntensity: 0.8 } : {});
    g.add(malha(new THREE.CylinderGeometry(0.2, 0.34, 0.85, 8), manto, 0, 0.43, 0));
    g.add(malha(new THREE.CylinderGeometry(0.24, 0.2, 0.2, 8), manto, 0, 0.9, 0)); // ombros
    const pele = trevas ? mat(def.cor === '#d8d0b8' ? '#e8e0c8' : '#3a3440') : mat(PELE);
    const cabeca = malha(new THREE.IcosahedronGeometry(0.17, 1), pele, 0, 1.12, 0);
    g.add(cabeca);
    // braços
    for (const s of [-1, 1]) {
      const b = malha(new THREE.CylinderGeometry(0.06, 0.07, 0.5, 6), manto, s * 0.29, 0.72, 0.02);
      b.rotation.z = s * 0.15; g.add(b);
    }
    if (trevas) {
      const olho = mat('#ff3020', { emissive: '#ff2010', emissiveIntensity: 2 });
      for (const s of [-1, 1]) g.add(malha(new THREE.SphereGeometry(0.03, 6, 4), olho, s * 0.06, 1.14, 0.15));
      if (def.cor !== '#d9531e' && def.cor !== '#d9b43a') { // capacete/armadura escura
        g.add(malha(new THREE.CylinderGeometry(0.19, 0.19, 0.12, 8), mat('#3a3a44', { metalness: 0.6 }), 0, 1.22, 0));
      }
    } else {
      // olhos e cabelo/barba
      for (const s of [-1, 1]) g.add(malha(new THREE.SphereGeometry(0.022, 6, 4), mat('#222'), s * 0.06, 1.15, 0.15));
      g.add(malha(new THREE.SphereGeometry(0.175, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2), mat('#3a2a1a'), 0, 1.15, -0.01));
      if (def.barba) { const b = malha(new THREE.ConeGeometry(0.12, 0.28, 6), mat(def.barba), 0, 0.96, 0.08); b.rotation.x = Math.PI; g.add(b); }
    }
    this.acessorio(g, def);
  }

  acessorio(g, def) {
    const ouro = mat('#e8c040', { metalness: 0.7, roughness: 0.3 });
    const madeira = mat('#6a4a2a');
    const a = def.acessorio;
    if (a === 'coroa' || def.coroaFarao) {
      if (def.coroaFarao) {
        g.add(malha(new THREE.CylinderGeometry(0.1, 0.2, 0.32, 8), ouro, 0, 1.36, 0));
        g.add(malha(new THREE.BoxGeometry(0.42, 0.3, 0.06), mat('#2a4a9a'), 0, 1.1, -0.12));
      } else {
        g.add(malha(new THREE.CylinderGeometry(0.15, 0.15, 0.08, 10, 1, true), ouro, 0, 1.28, 0));
        for (let i = 0; i < 5; i++) { const ang = i / 5 * Math.PI * 2; g.add(malha(new THREE.ConeGeometry(0.03, 0.09, 4), ouro, Math.cos(ang) * 0.15, 1.35, Math.sin(ang) * 0.15)); }
      }
    }
    if (a === 'cajado') { g.add(malha(new THREE.CylinderGeometry(0.025, 0.03, 1.55, 6), madeira, 0.36, 0.78, 0.08)); g.add(malha(new THREE.TorusGeometry(0.06, 0.02, 4, 8), madeira, 0.36, 1.58, 0.08)); }
    if (a === 'lanca') { g.add(malha(new THREE.CylinderGeometry(0.02, 0.02, 1.7, 6), madeira, 0.36, 0.85, 0.1)); g.add(malha(new THREE.ConeGeometry(0.05, 0.18, 6), mat('#cfcfd8', { metalness: 0.8 }), 0.36, 1.78, 0.1)); }
    if (a === 'arco') { const t = malha(new THREE.TorusGeometry(0.38, 0.02, 4, 12, Math.PI), madeira, -0.36, 0.8, 0.1); t.rotation.z = -Math.PI / 2; g.add(t); g.add(malha(new THREE.BoxGeometry(0.06, 0.6, 0.12), mat('#a8322d'), 0, 0.75, -0.25)); }
    if (a === 'funda') g.add(malha(new THREE.SphereGeometry(0.07, 6, 4), mat('#8a8a8a'), 0.33, 0.5, 0.12));
    if (a === 'tocha') { g.add(malha(new THREE.CylinderGeometry(0.03, 0.03, 0.5, 6), madeira, 0.34, 0.75, 0.12)); g.add(malha(new THREE.IcosahedronGeometry(0.09, 0), mat('#ff9020', { emissive: '#ff7010', emissiveIntensity: 3 }), 0.34, 1.05, 0.12)); g.add(malha(new THREE.CylinderGeometry(0.08, 0.06, 0.14, 8), mat('#a0603a'), -0.33, 0.5, 0.1)); }
    if (a === 'capuz') { g.add(malha(new THREE.ConeGeometry(0.22, 0.42, 8), mat(def.cor), 0, 1.25, -0.03)); }
    if (a === 'cabelo') { g.add(malha(new THREE.BoxGeometry(0.3, 0.55, 0.08), mat('#2a1a10'), 0, 1.0, -0.15)); }
    if (a === 'chifre') { const c = malha(new THREE.ConeGeometry(0.05, 0.22, 6), mat('#e8dcc0'), 0.33, 0.6, 0.12); c.rotation.z = 0.5; g.add(c); }
    if (a === 'livro') g.add(malha(new THREE.BoxGeometry(0.16, 0.2, 0.05), mat('#5a2a1a'), 0.3, 0.62, 0.16));
    if (a === 'asas') {
      const asa = mat('#ffffff', { emissive: '#d8e8ff', emissiveIntensity: 0.6, side: THREE.DoubleSide });
      for (const s of [-1, 1]) { const w = malha(new THREE.ConeGeometry(0.28, 1.0, 3), asa, s * 0.3, 1.05, -0.2); w.rotation.z = s * -0.9; w.scale.z = 0.15; g.add(w); }
      g.add(malha(new THREE.TorusGeometry(0.15, 0.02, 4, 16), mat('#ffe080', { emissive: '#ffd040', emissiveIntensity: 2 }), 0, 1.38, 0)).rotation.x = Math.PI / 2;
      g.add(malha(new THREE.BoxGeometry(0.04, 0.9, 0.02), mat('#e0e8ff', { metalness: 0.9, emissive: '#80a0ff', emissiveIntensity: 0.6 }), 0.36, 0.85, 0.12));
    }
    if (def.chifres) for (const s of [-1, 1]) { const c = malha(new THREE.ConeGeometry(0.045, 0.26, 6), mat('#e8e0c8'), s * 0.13, 1.32, 0); c.rotation.z = -s * 0.5; g.add(c); }
  }

  fera(g, def, dragao, leao) {
    const corpo = mat(def.cor);
    const tronco = malha(new THREE.IcosahedronGeometry(0.34, 1), corpo, 0, 0.5, 0); tronco.scale.set(0.9, 0.8, 1.35); g.add(tronco);
    g.add(malha(new THREE.IcosahedronGeometry(0.2, 1), corpo, 0, 0.72, 0.42));
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(malha(new THREE.CylinderGeometry(0.06, 0.05, 0.38, 6), corpo, sx * 0.18, 0.19, sz * 0.25));
    const olho = mat(leao ? '#222' : '#ff3020', leao ? {} : { emissive: '#ff2010', emissiveIntensity: 2 });
    for (const s of [-1, 1]) g.add(malha(new THREE.SphereGeometry(0.03, 6, 4), olho, s * 0.08, 0.78, 0.6));
    if (leao) { const juba = malha(new THREE.TorusGeometry(0.2, 0.09, 6, 10), mat('#8a5a1a'), 0, 0.72, 0.36); g.add(juba); }
    if (def.cor === '#5a3a2a') for (const s of [-1, 1]) { const p = malha(new THREE.ConeGeometry(0.03, 0.2, 5), mat('#f0e8d0'), s * 0.1, 0.62, 0.62); p.rotation.x = 1.2; g.add(p); }
    if (dragao) {
      const asa = mat('#5a1010', { side: THREE.DoubleSide });
      for (const s of [-1, 1]) { const w = malha(new THREE.ConeGeometry(0.5, 0.9, 3), asa, s * 0.5, 0.85, -0.05); w.rotation.z = s * 1.2; w.scale.z = 0.12; g.add(w); }
      const pesc = malha(new THREE.CylinderGeometry(0.1, 0.14, 0.4, 6), corpo, 0, 0.72, 0.38); pesc.rotation.x = 0.8; g.add(pesc);
      for (const s of [-1, 1]) { const c = malha(new THREE.ConeGeometry(0.04, 0.2, 5), mat('#2a2a2a'), s * 0.1, 0.94, 0.38); c.rotation.x = -0.5; g.add(c); }
      const cauda = malha(new THREE.ConeGeometry(0.12, 0.7, 6), corpo, 0, 0.45, -0.7); cauda.rotation.x = -1.4; g.add(cauda);
    }
  }

  serpente(g, def) {
    const corpo = mat(def.cor, { metalness: 0.3 });
    for (let i = 0; i < 6; i++) {
      const r = 0.22 - i * 0.02;
      g.add(malha(new THREE.IcosahedronGeometry(r, 1), corpo, Math.sin(i * 1.1) * 0.25, 0.25 + (i < 2 ? i * 0.35 : 0.2), 0.2 - i * 0.22 + (i < 2 ? 0.25 : 0)));
    }
    const cab = malha(new THREE.IcosahedronGeometry(0.2, 1), corpo, 0, 1.05, 0.5); cab.scale.set(1, 0.8, 1.4); g.add(cab);
    const olho = mat('#ffe040', { emissive: '#ffd020', emissiveIntensity: 2 });
    for (const s of [-1, 1]) g.add(malha(new THREE.SphereGeometry(0.035, 6, 4), olho, s * 0.11, 1.1, 0.68));
    for (const s of [-1, 1]) { const b = malha(new THREE.ConeGeometry(0.16, 0.3, 3), mat('#2a8a8a', { side: THREE.DoubleSide }), s * 0.2, 1.05, 0.35); b.rotation.z = s * 1.3; b.scale.z = 0.15; g.add(b); }
  }
}
