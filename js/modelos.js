// Modelos: usa o .glb da Tripo se existir (listado em assets/models/modelos.json),
// senão cria um boneco low-poly provisório. A "frente" dos modelos é o eixo +Z.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { caminhoModelo } from './units.js';
import { Rig } from './rig.js';

const PELE = '#c99a6e';
export const ALTURA_PADRAO = 1.85;

// Alguns GLBs da Tripo (os exportados com 'RootNode') vêm com as matrizes de ligação
// do esqueleto erradas e a malha "explode" em estilhaços. Como o arquivo está em T-pose
// (pose de repouso = pose de ligação), recalculamos as inversas a partir da pose atual.
function consertarPele(cena) {
  cena.updateMatrixWorld(true);
  cena.traverse(o => { if (o.isSkinnedMesh) { o.skeleton.calculateInverses(); o.bind(o.skeleton, o.matrixWorld); } });
}
const mats = {};
function mat(cor, extra = {}) {
  const k = cor + JSON.stringify(extra);
  if (!mats[k]) mats[k] = new THREE.MeshStandardMaterial({ color: cor, flatShading: true, roughness: 0.8, ...extra });
  return mats[k];
}
function malha(geo, m, x = 0, y = 0, z = 0) {
  const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = true; return o;
}

export class Modelos {
  constructor() {
    this.disponiveis = new Set(); this.gltfs = {}; this.porArquivo = {};
    this.loader = new GLTFLoader(); this.loader.setMeshoptDecoder(MeshoptDecoder);
  }

  // Lê assets/models/modelos.json (gerado pelo servidor.py) e carrega os GLBs listados.
  async iniciar(defs, aoProgredir) {
    try {
      const r = await fetch('assets/models/modelos.json', { cache: 'no-store' });
      if (r.ok) { const lista = await r.json(); (Array.isArray(lista) ? lista : Object.keys(lista)).forEach(id => this.disponiveis.add(id)); }
    } catch (e) { /* sem lista: usa só bonecos */ }
    // cada unidade aponta para um arquivo; só carrega os que existem na pasta (lista gerada pelo servidor.py)
    const arquivoDe = id => caminhoModelo(id, defs[id]).split('/').pop().replace(/\.glb$/i, '');
    const ids = Object.keys(defs).filter(id => this.disponiveis.has(arquivoDe(id)));
    const caminhos = [...new Set(ids.map(id => caminhoModelo(id, defs[id])))];
    let n = 0;
    await Promise.all(caminhos.map(c => new Promise(res => {
      this.loader.load(c, g => { consertarPele(g.scene); this.porArquivo[c] = g; aoProgredir?.(++n, caminhos.length); res(); },
        undefined, err => { console.warn('Não consegui carregar o modelo', c, err); aoProgredir?.(++n, caminhos.length); res(); });
    })));
    for (const id of ids) { const g = this.porArquivo[caminhoModelo(id, defs[id])]; if (g) this.gltfs[id] = g; }
  }

  // Retorna { obj, mixer|null, altura }
  criar(id, def, inimigo) {
    const g = this.gltfs[id];
    if (g) return this.criarGLB(g, def);
    const obj = this.boneco(id, def);
    const alt = new THREE.Box3().setFromObject(obj).max.y;
    return { obj, mixer: null, rig: null, altura: Math.min(ALTURA_PADRAO, alt || ALTURA_PADRAO) };
  }

  criarGLB(g, def) {
    const cena = cloneSkinned(g.scene);
    cena.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = false; o.frustumCulled = false; } });
    const rig = Rig.criar(cena);
    const pivo = new THREE.Group();
    pivo.add(cena);
    cena.rotation.y = THREE.MathUtils.degToRad(def.rotY || 0);
    cena.updateMatrixWorld(true);
    const caixa = new THREE.Box3().setFromObject(cena);
    const tam = caixa.getSize(new THREE.Vector3());
    const alvo = def.altura || ALTURA_PADRAO; // todos do mesmo tamanho
    const esc = alvo / Math.max(0.0001, tam.y);
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
