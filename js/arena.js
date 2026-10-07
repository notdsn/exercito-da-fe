// Arena 3D estilo Clash Royale / Combinações Táticas:
// plataforma elevada de pedra, azulejos de grama chanfrados, muralhas com faixa azul/vermelha,
// rio animado com pontes, torres com telhado e bandeira, praça de pedra e cenário ao redor.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

let semente = 20261007;
const rnd = () => (semente = (semente * 16807) % 2147483647) / 2147483647;
const entre = (a, b) => a + rnd() * (b - a);

// ---------------- Texturas desenhadas em canvas (nada externo) ----------------
function canvasTex(w, h, desenhar, rep = [1, 1]) {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  desenhar(cv.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep[0], rep[1]);
  t.anisotropy = 4;
  return t;
}
// desenha repetindo nas bordas para a textura ficar sem emenda
function semEmenda(w, h, x, y, r, f) {
  for (const dx of [-w, 0, w]) for (const dy of [-h, 0, h]) {
    if (x + dx + r < 0 || x + dx - r > w || y + dy + r < 0 || y + dy - r > h) continue;
    f(x + dx, y + dy);
  }
}
function texGrama(tam = 256, manchas = 0) {
  return canvasTex(tam, tam, (g, w, h) => {
    g.fillStyle = '#f4f4f0'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < manchas; i++) {
      const x = rnd() * w, y = rnd() * h, r = entre(30, 90), esc = rnd() < 0.5;
      semEmenda(w, h, x, y, r, (px, py) => {
        const gr = g.createRadialGradient(px, py, 0, px, py, r);
        gr.addColorStop(0, esc ? 'rgba(30,70,10,0.13)' : 'rgba(255,255,220,0.16)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = gr; g.fillRect(px - r, py - r, r * 2, r * 2);
      });
    }
    const n = tam * tam / 45;
    for (let i = 0; i < n; i++) {
      const x = rnd() * w, y = rnd() * h, l = entre(3, 7), claro = rnd() < 0.45;
      g.strokeStyle = claro ? `rgba(255,255,225,${entre(0.15, 0.32)})` : `rgba(30,75,15,${entre(0.1, 0.22)})`;
      g.lineWidth = entre(1.1, 2.2);
      semEmenda(w, h, x, y, 8, (px, py) => { g.beginPath(); g.moveTo(px, py); g.lineTo(px + entre(-2, 2), py - l); g.stroke(); });
    }
  });
}
function texPedraRuido() {
  return canvasTex(128, 128, (g, w, h) => {
    g.fillStyle = '#e8e4da'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 700; i++) {
      const x = rnd() * w, y = rnd() * h, r = entre(0.6, 2.6);
      g.fillStyle = rnd() < 0.5 ? `rgba(70,60,50,${entre(0.05, 0.16)})` : `rgba(255,255,255,${entre(0.1, 0.3)})`;
      semEmenda(w, h, x, y, r, (px, py) => { g.beginPath(); g.arc(px, py, r, 0, 7); g.fill(); });
    }
  });
}
// tijolos: 1 repetição = 1 m (4 fileiras x 3 tijolos)
function texTijolos(base = '#ece3cf') {
  return canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#8c7f6c'; g.fillRect(0, 0, w, h);
    const fil = 4, col = 3, bh = h / fil, bw = w / col, m = 5;
    const c0 = new THREE.Color(base);
    for (let r = 0; r < fil; r++) for (let c = -1; c <= col; c++) {
      const x = c * bw + (r % 2 ? bw / 2 : 0), y = r * bh;
      const cor = c0.clone().offsetHSL(entre(-0.01, 0.01), entre(-0.05, 0.05), entre(-0.07, 0.05));
      const gr = g.createLinearGradient(0, y, 0, y + bh);
      gr.addColorStop(0, '#' + cor.clone().offsetHSL(0, 0, 0.08).getHexString());
      gr.addColorStop(0.25, '#' + cor.getHexString());
      gr.addColorStop(1, '#' + cor.clone().offsetHSL(0, 0, -0.12).getHexString());
      g.fillStyle = gr;
      const rr = 7; const x0 = x + m / 2, y0 = y + m / 2, ww = bw - m, hh = bh - m;
      g.beginPath(); g.roundRect(x0, y0, ww, hh, rr); g.fill();
      for (let k = 0; k < 12; k++) { g.fillStyle = `rgba(80,65,50,${entre(0.05, 0.14)})`; g.beginPath(); g.arc(x0 + rnd() * ww, y0 + rnd() * hh, entre(0.8, 2.2), 0, 7); g.fill(); }
    }
  });
}
function texLajotas() {
  return canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#a99a7c'; g.fillRect(0, 0, w, h);
    const n = 4, s = w / n, m = 6;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      const cor = new THREE.Color('#f3e7c8').offsetHSL(entre(-0.01, 0.01), entre(-0.08, 0.05), entre(-0.08, 0.03));
      const x = i * s + m / 2, y = j * s + m / 2;
      const gr = g.createLinearGradient(x, y, x, y + s);
      gr.addColorStop(0, '#' + cor.clone().offsetHSL(0, 0, 0.05).getHexString()); gr.addColorStop(1, '#' + cor.clone().offsetHSL(0, 0, -0.08).getHexString());
      g.fillStyle = gr; g.beginPath(); g.roundRect(x, y, s - m, s - m, 10); g.fill();
      for (let k = 0; k < 10; k++) { g.fillStyle = `rgba(90,70,40,${entre(0.04, 0.12)})`; g.beginPath(); g.arc(x + rnd() * (s - m), y + rnd() * (s - m), entre(1, 3), 0, 7); g.fill(); }
    }
  });
}
function texMadeira() {
  return canvasTex(128, 128, (g, w, h) => {
    g.fillStyle = '#c8894a'; g.fillRect(0, 0, w, h);
    const n = 4, s = w / n;
    for (let i = 0; i < n; i++) {
      const cor = new THREE.Color('#d39a5a').offsetHSL(0, entre(-0.05, 0.05), entre(-0.07, 0.05));
      g.fillStyle = '#' + cor.getHexString(); g.fillRect(i * s + 2, 0, s - 4, h);
      for (let k = 0; k < 6; k++) { g.strokeStyle = `rgba(110,60,20,${entre(0.12, 0.3)})`; g.lineWidth = 1; const x = i * s + 4 + rnd() * (s - 8); g.beginPath(); g.moveTo(x, 0); g.bezierCurveTo(x + 3, h * 0.3, x - 3, h * 0.6, x + 1, h); g.stroke(); }
      g.fillStyle = 'rgba(70,35,10,0.55)'; g.fillRect(i * s, 0, 2, h); g.fillRect(i * s + s - 2, 0, 2, h);
    }
  });
}
function texEstandarte(cor, emblema) {
  return canvasTex(128, 192, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.beginPath(); g.moveTo(4, 4); g.lineTo(w - 4, 4); g.lineTo(w - 4, h - 30); g.lineTo(w / 2, h - 4); g.lineTo(4, h - 30); g.closePath();
    const gr = g.createLinearGradient(0, 0, w, 0); const c = new THREE.Color(cor);
    gr.addColorStop(0, '#' + c.clone().offsetHSL(0, 0, -0.12).getHexString()); gr.addColorStop(0.5, cor); gr.addColorStop(1, '#' + c.clone().offsetHSL(0, 0, -0.12).getHexString());
    g.fillStyle = gr; g.fill(); g.lineWidth = 8; g.strokeStyle = '#ffd23a'; g.stroke();
    g.fillStyle = '#ffd23a'; g.strokeStyle = '#7a4a00'; g.lineWidth = 3;
    const cx = w / 2, cy = 82;
    if (emblema === 'cruz') { g.beginPath(); g.rect(cx - 9, cy - 42, 18, 84); g.rect(cx - 30, cy - 20, 60, 18); g.fill(); g.stroke(); }
    else { // coroa
      g.beginPath(); g.moveTo(cx - 34, cy + 20); g.lineTo(cx - 34, cy - 18); g.lineTo(cx - 17, cy); g.lineTo(cx, cy - 30); g.lineTo(cx + 17, cy); g.lineTo(cx + 34, cy - 18); g.lineTo(cx + 34, cy + 20); g.closePath(); g.fill(); g.stroke();
    }
  });
}
function texBlob(suave = 0.0) {
  return canvasTex(128, 128, (g, w, h) => {
    const gr = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(0.45 + suave, 'rgba(0,0,0,0.75)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
  });
}
// sombra suave retangular (contato da plataforma com o chão)
function texSombraRet() {
  return canvasTex(128, 128, (g, w, h) => {
    g.filter = 'blur(14px)'; g.fillStyle = '#000'; g.fillRect(26, 26, w - 52, h - 52);
  });
}

// ---------------- Geometrias ----------------
function retArred(w, d, r) {
  const s = new THREE.Shape(), x = -w / 2, y = -d / 2;
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + d - r); s.quadraticCurveTo(x + w, y + d, x + w - r, y + d);
  s.lineTo(x + r, y + d); s.quadraticCurveTo(x, y + d, x, y + d - r);
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  return s;
}
// bloco com cantos e arestas arredondados; base em y=0, topo em y=h
export function blocoArred(w, h, d, r = 0.06, seg = 2) {
  r = Math.min(r, w / 2 - 0.001, d / 2 - 0.001, h / 2 - 0.001);
  const geo = new THREE.ExtrudeGeometry(retArred(w - 2 * r, d - 2 * r, Math.min(r, (w - 2 * r) / 2, (d - 2 * r) / 2) * 0.9),
    { depth: Math.max(0.001, h - 2 * r), bevelEnabled: true, bevelThickness: r, bevelSize: r, bevelSegments: seg, curveSegments: 3 });
  geo.rotateX(-Math.PI / 2); geo.translate(0, r, 0);
  return geo;
}

// junta várias malhas estáticas por material (poucas chamadas de desenho = leve no celular)
class Lote {
  constructor() { this.grupos = new Map(); }
  add(obj, semSombra = false) {
    obj.updateMatrixWorld(true);
    obj.traverse(o => {
      if (!o.isMesh) return;
      if (semSombra) o.castShadow = false;
      let g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
      for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
      if (!g.attributes.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
      g.applyMatrix4(o.matrixWorld);
      const k = o.material.uuid + (o.castShadow ? 'c' : '') + (o.receiveShadow ? 'r' : '');
      if (!this.grupos.has(k)) this.grupos.set(k, { mat: o.material, geos: [], cast: o.castShadow, rec: o.receiveShadow });
      this.grupos.get(k).geos.push(g);
    });
  }
  montar(scene) {
    for (const { mat, geos, cast, rec } of this.grupos.values()) {
      const m = new THREE.Mesh(mergeGeometries(geos, false), mat);
      m.castShadow = cast; m.receiveShadow = rec; m.matrixAutoUpdate = false; m.updateMatrix();
      scene.add(m);
    }
  }
}
const M = (geo, mat, x = 0, y = 0, z = 0, sombra = true, recebe = true) => {
  const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = sombra; m.receiveShadow = recebe; return m;
};

// ---------------- Arena ----------------
// cfg: { T, COLS, LINHAS, BANCO, G, posQuadrado, posBanco, X0, ZB, ZBANCO }
export function criarArena(scene, cfg) {
  const { T, COLS, LINHAS, BANCO, G, posQuadrado, posBanco } = cfg;
  const lote = new Lote();
  const animados = { bandeiras: [], chamas: [], agua: null };
  const WT = 0.42;                       // espessura da muralha
  const X0 = cfg.X0, ZB = cfg.ZB;        // borda interna do tabuleiro
  const XW = X0 + WT;                    // borda externa da muralha
  const ZDIV = ZB + 0.3;                 // fim do meio-fio entre tabuleiro e banco
  const ZFR = cfg.ZBANCO;                // fim do deque do banco
  const Y_CHAO = -0.62, Y_AGUA = -0.86, Y_LAJE = -0.14;
  const RIO = 1.25;                      // meia largura do rio fora da plataforma

  // materiais
  const tGrama = texGrama(256, 0); tGrama.repeat.set(1 / 1.3, 1 / 1.3);
  const tChao = texGrama(512, 40); tChao.repeat.set(1 / 6, 1 / 6);
  const tPedra = texPedraRuido(); tPedra.repeat.set(1.2, 1.2);
  const tTij = texTijolos(); tTij.repeat.set(1, 1);
  const tTijT = texTijolos('#f1eadb'); tTijT.repeat.set(4, 1.4);
  const tLaj = texLajotas(); tLaj.repeat.set(0.5, 0.5);
  const tMad = texMadeira(); tMad.repeat.set(1.2, 1.2);
  const mat = (o) => new THREE.MeshStandardMaterial({ roughness: 0.9, metalness: 0, ...o });
  const mPedra = mat({ color: '#d9d2c2', map: tPedra });
  const mPedraEsc = mat({ color: '#b3aa98', map: tPedra });
  const mTij = mat({ color: '#ffffff', map: tTij });
  const mLaj = mat({ color: '#ffffff', map: tLaj });
  const mMad = mat({ color: '#ffffff', map: tMad, roughness: 0.8 });
  const mMadEsc = mat({ color: '#8a5a32', roughness: 0.85 });
  const mTerra = mat({ color: '#6f5434', roughness: 1 });
  const mChao = mat({ color: '#8fd35e', map: tChao, roughness: 1 });
  const mAreia = mat({ color: '#ead39a', map: tPedra, roughness: 1 });
  const AZUL = '#2f7ff0', VERM = '#ec3b33';
  const mAzul = mat({ color: AZUL, roughness: 0.45, emissive: '#0a2a6a', emissiveIntensity: 0.25 });
  const mVerm = mat({ color: VERM, roughness: 0.45, emissive: '#6a0a0a', emissiveIntensity: 0.25 });
  const mOuro = mat({ color: '#ffcc33', roughness: 0.3, metalness: 0.6, emissive: '#5a3a00', emissiveIntensity: 0.3 });
  const mEscuro = mat({ color: '#3a2a20', roughness: 1 });

  // ---- céu em degradê + neblina ----
  {
    const t = canvasTex(4, 256, (g) => { const gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, '#3f9fe8'); gr.addColorStop(0.55, '#8fd0ff'); gr.addColorStop(1, '#d9f1ff'); g.fillStyle = gr; g.fillRect(0, 0, 4, 256); });
    t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; scene.background = t;
    scene.fog = new THREE.Fog('#cfeaff', 34, 75);
  }

  // ---- chão ao redor (duas metades separadas pelo rio) ----
  for (const s of [-1, 1]) {
    const g = new THREE.PlaneGeometry(150, 75); g.rotateX(-Math.PI / 2);
    const m = M(g, mChao, 0, Y_CHAO, s * (RIO + 37.5), false, true); lote.add(m);
  }
  // margens de areia + leito do rio
  for (const s of [-1, 1]) {
    const g = blocoArred(150, 0.38, 0.55, 0.12); lote.add(M(g, mAreia, 0, Y_CHAO - 0.33, s * (RIO + 0.1), false, true));
  }
  lote.add(M(new THREE.BoxGeometry(150, 0.1, RIO * 2 + 0.4), mat({ color: '#2a6f8a' }), 0, Y_AGUA - 0.35, 0, false, false));
  // água animada (shader leve, sem texturas)
  {
    const uni = { t: { value: 0 } };
    const mAgua = new THREE.ShaderMaterial({
      uniforms: uni, transparent: false, fog: false,
      vertexShader: `varying vec2 vUv; varying vec3 vW; void main(){ vUv = uv; vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
      fragmentShader: `uniform float t; varying vec2 vUv; varying vec3 vW;
        void main(){
          vec2 p = vW.xz;
          float a = sin(p.x*1.9 - t*2.0 + sin(p.y*4.0 + t*0.7)*1.2)*0.5+0.5;
          float b = sin(p.x*3.3 - t*2.6 + p.y*6.0)*0.5+0.5;
          vec3 fundo = vec3(0.10,0.52,0.86), claro = vec3(0.36,0.80,1.0);
          vec3 c = mix(fundo, claro, a*0.55 + b*0.25);
          float borda = 1.0 - smoothstep(0.0, 0.14, min(vUv.y, 1.0 - vUv.y));
          float risco = smoothstep(0.90, 0.97, fract(p.x*0.55 - t*0.45 + sin(p.y*5.0 + p.x*0.3)*0.25));
          float brilho = smoothstep(0.82, 1.0, a*b);
          c = mix(c, vec3(1.0), clamp(borda*0.85 + risco*0.35 + brilho*0.35, 0.0, 1.0));
          gl_FragColor = vec4(c, 1.0);
        }`,
    });
    const g = new THREE.PlaneGeometry(150, RIO * 2, 1, 1); g.rotateX(-Math.PI / 2);
    const agua = new THREE.Mesh(g, mAgua); agua.position.y = Y_AGUA; scene.add(agua);
    animados.agua = uni;
  }

  // ---- praça de lajotas ao redor da plataforma (onde ficam as torres) ----
  {
    const XP = XW + 2.3, ZP1 = ZFR + 7.0, ZP0 = -ZB - WT - 3.4;
    const mk = (z0, z1) => {
      const g = blocoArred(XP * 2, 0.14, z1 - z0, 0.06, 1);
      // UV em metros (para as lajotas não esticarem)
      const pos = g.attributes.position, uv = g.attributes.uv;
      for (let i = 0; i < pos.count; i++) uv.setXY(i, pos.getX(i), pos.getZ(i));
      lote.add(M(g, mLaj, 0, Y_CHAO - 0.08, (z0 + z1) / 2, false, true));
    };
    mk(RIO, ZP1); mk(ZP0, -RIO);
    // sombra de contato da plataforma
    const s = new THREE.Mesh(new THREE.PlaneGeometry(XW * 2 + 1.6, ZFR + ZB + WT + 1.6), new THREE.MeshBasicMaterial({ map: texSombraRet(), transparent: true, opacity: 0.38, depthWrite: false, color: '#000' }));
    s.rotation.x = -Math.PI / 2; s.position.set(0, Y_CHAO + 0.075, (ZFR - ZB - WT) / 2); s.renderOrder = 1; scene.add(s);
  }

  // ---- plataforma elevada (duas lajes, separadas pelo canal do rio) ----
  const laje = (z0, z1) => {
    const g = blocoArred(XW * 2, Y_LAJE - (Y_AGUA - 0.4), z1 - z0, 0.05, 1);
    const pos = g.attributes.position, uv = g.attributes.uv, nor = g.attributes.normal;
    for (let i = 0; i < pos.count; i++) { // tijolos em metros, alinhados por face
      const nx = Math.abs(nor.getX(i)), nz = Math.abs(nor.getZ(i));
      uv.setXY(i, nx > nz ? pos.getZ(i) + z0 : pos.getX(i), pos.getY(i));
    }
    lote.add(M(g, mTij, 0, Y_AGUA - 0.4, (z0 + z1) / 2, true, true));
    // terra escura entre os azulejos
    const t = new THREE.PlaneGeometry(X0 * 2, z1 - z0); t.rotateX(-Math.PI / 2);
    lote.add(M(t, mTerra, 0, Y_LAJE + 0.002, (z0 + z1) / 2, false, true));
  };
  laje(-ZB - WT, -G / 2); laje(G / 2, ZFR + WT);

  // ---- azulejos de grama chanfrados (dois verdes alternados) ----
  const quadrados = [];
  const geoQ = blocoArred(T * 0.92, 0.3, T * 0.92, 0.075, 2); geoQ.translate(0, -0.3, 0);
  {
    const pos = geoQ.attributes.position, uv = geoQ.attributes.uv;
    for (let i = 0; i < pos.count; i++) uv.setXY(i, pos.getX(i), pos.getZ(i));
  }
  for (let l = 0; l < LINHAS * 2; l++) for (let c = 0; c < COLS; c++) {
    const jog = l >= LINHAS, claro = (c + l) % 2 === 0;
    const cor = claro ? '#9ee05f' : '#7fcb4a';
    const m = new THREE.Mesh(geoQ, mat({ color: cor, map: tGrama, roughness: 0.95, emissive: '#000' }));
    m.position.copy(posQuadrado(c, l)); m.position.y = 0;
    m.rotation.y = Math.floor(rnd() * 4) * Math.PI / 2;
    m.receiveShadow = true; scene.add(m);
    quadrados.push({ malha: m, c, l, jogador: jog, corBase: cor });
  }

  // ---- pontes de tábuas sobre o canal (uma por coluna) ----
  for (let c = 0; c < COLS; c++) {
    const x = (c - (COLS - 1) / 2) * T, larg = T * 0.8, n = 4;
    for (let i = 0; i < n; i++) {
      const g = blocoArred(larg / n - 0.03, 0.09, G + 0.34, 0.025, 1);
      const m = M(g, mMad, x - larg / 2 + (i + 0.5) * larg / n, -0.1, 0, true, true); m.rotation.z = entre(-0.03, 0.03); lote.add(m);
    }
    for (const s of [-1, 1]) lote.add(M(new THREE.BoxGeometry(larg + 0.1, 0.1, 0.12), mMadEsc, x, -0.16, s * (G / 2 + 0.02), false, false));
  }

  // ---- muralhas de pedra com faixa colorida ----
  const muro = (x0, z0, x1, z1, topo, faixa) => {
    const comp = Math.hypot(x1 - x0, z1 - z0), ang = Math.atan2(x1 - x0, z1 - z0);
    const n = Math.max(1, Math.round(comp / 0.95)); let acc = 0;
    const lens = []; for (let i = 0; i < n; i++) lens.push(entre(0.8, 1.2)); const soma = lens.reduce((a, b) => a + b, 0);
    for (let i = 0; i < n; i++) {
      const L = lens[i] / soma * comp, k = (acc + L / 2) / comp; acc += L;
      const h = topo - Y_LAJE + entre(-0.03, 0.04) + 0.06;
      const g = blocoArred(WT + entre(-0.02, 0.03), h, L - 0.04, 0.07, 2);
      const m = M(g, rnd() < 0.15 ? mPedraEsc : mPedra, x0 + (x1 - x0) * k, Y_LAJE - 0.06, z0 + (z1 - z0) * k);
      m.rotation.y = ang; lote.add(m);
    }
    if (faixa) {
      const g = blocoArred(0.18, 0.08, comp + 0.02, 0.035, 1);
      const m = M(g, faixa, (x0 + x1) / 2, topo + 0.035, (z0 + z1) / 2, false, true); m.rotation.y = ang; lote.add(m);
    }
  };
  const TOPO = 0.3;
  for (const s of [-1, 1]) {
    const x = s * (X0 + WT / 2);
    muro(x, -ZB - WT, x, -0.02, TOPO, mVerm);      // laterais do lado inimigo (a última pedra cobre o canal = ponte)
    muro(x, 0.02, x, ZB, TOPO, mAzul);              // laterais do lado do jogador
    muro(x, ZB, x, ZFR + WT, TOPO - 0.06, null);    // laterais do banco
  }
  muro(-X0 - WT, -ZB - WT / 2, X0 + WT, -ZB - WT / 2, TOPO, null); // fundo
  { const g = blocoArred(X0 * 2 + WT * 2, 0.08, 0.18, 0.035, 1); lote.add(M(g, mVerm, 0, TOPO + 0.035, -ZB - WT / 2, false, true)); }
  muro(-X0, ZFR + WT / 2, X0, ZFR + WT / 2, TOPO - 0.06, mAzul); // frente (atrás do banco)
  // meio-fio entre o tabuleiro e o banco
  {
    const g = blocoArred(X0 * 2, 0.33, ZDIV - ZB, 0.06, 2); lote.add(M(g, mPedra, 0, Y_LAJE - 0.04, (ZB + ZDIV) / 2));
    const f = blocoArred(X0 * 2, 0.07, 0.14, 0.03, 1); lote.add(M(f, mAzul, 0, 0.18, (ZB + ZDIV) / 2, false, true));
  }
  // marco dourado no meio do rio (pontas das muralhas)
  for (const s of [-1, 1]) {
    lote.add(M(new THREE.CylinderGeometry(0.2, 0.24, 0.5, 10), mPedra, s * (X0 + WT / 2), TOPO + 0.2, 0));
    lote.add(M(new THREE.SphereGeometry(0.16, 12, 8), mOuro, s * (X0 + WT / 2), TOPO + 0.55, 0));
  }

  // ---- banco: deque de madeira com 5 vagas ----
  const slotsBanco = [];
  {
    const g = blocoArred(X0 * 2, 0.16, ZFR - ZDIV, 0.04, 1);
    const pos = g.attributes.position, uv = g.attributes.uv; for (let i = 0; i < pos.count; i++) uv.setXY(i, pos.getX(i) * 0.9, pos.getZ(i) * 0.9);
    lote.add(M(g, mMad, 0, -0.22, (ZDIV + ZFR) / 2, false, true));
  }
  const geoVaga = blocoArred(T * 0.84, 0.12, T * 0.84, 0.06, 2); geoVaga.translate(0, -0.12, 0);
  for (let i = 0; i < BANCO; i++) {
    const m = new THREE.Mesh(geoVaga, mat({ color: '#f6e2b8', map: tPedra, roughness: 0.85, emissive: '#000' }));
    m.position.copy(posBanco(i)); m.position.y = 0.0; m.receiveShadow = true; scene.add(m); slotsBanco.push(m);
  }

  // ---- braseiros nos cantos ----
  const geoChama = new THREE.ConeGeometry(0.16, 0.42, 7);
  const mChama = new THREE.MeshBasicMaterial({ color: '#ffb02e' });
  const mChama2 = new THREE.MeshBasicMaterial({ color: '#fff1a0' });
  for (const [x, z] of [[-(X0 + WT / 2), -ZB - WT / 2], [X0 + WT / 2, -ZB - WT / 2], [-(X0 + WT / 2), ZFR + WT / 2], [X0 + WT / 2, ZFR + WT / 2]]) {
    lote.add(M(blocoArred(0.62, 0.5, 0.62, 0.08), mPedra, x, TOPO - 0.05, z));
    lote.add(M(new THREE.CylinderGeometry(0.32, 0.2, 0.22, 10), mEscuro, x, TOPO + 0.55, z));
    lote.add(M(new THREE.TorusGeometry(0.32, 0.05, 6, 14).rotateX(Math.PI / 2), mOuro, x, TOPO + 0.66, z, false, false));
    const c1 = new THREE.Mesh(geoChama, mChama); c1.position.set(x, TOPO + 0.86, z); scene.add(c1);
    const c2 = new THREE.Mesh(geoChama, mChama2); c2.scale.setScalar(0.55); c2.position.set(x, TOPO + 0.8, z); scene.add(c2);
    animados.chamas.push(c1, c2);
  }

  // ---- torres ----
  const mTijT = mat({ color: '#ffffff', map: tTijT });
  const estAzul = texEstandarte(AZUL, 'cruz'), estVerm = texEstandarte(VERM, 'coroa');
  const mEstA = new THREE.MeshStandardMaterial({ map: estAzul, transparent: true, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.8 });
  const mEstV = new THREE.MeshStandardMaterial({ map: estVerm, transparent: true, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.8 });
  const geoBand = new THREE.PlaneGeometry(0.75, 0.45, 4, 1); geoBand.translate(0.375, 0, 0);
  const bandeira = (grp, y, mCor, x = 0, z = 0) => {
    lote.add(M(new THREE.CylinderGeometry(0.035, 0.035, 1.2, 6), mMadEsc, grp.position.x + x, grp.position.y + y + 0.6, grp.position.z + z));
    lote.add(M(new THREE.SphereGeometry(0.07, 8, 6), mOuro, grp.position.x + x, grp.position.y + y + 1.22, grp.position.z + z, false));
    const b = new THREE.Mesh(geoBand, new THREE.MeshStandardMaterial({ color: mCor.color, side: THREE.DoubleSide, roughness: 0.7, emissive: mCor.emissive, emissiveIntensity: 0.3 }));
    b.position.set(grp.position.x + x, grp.position.y + y + 0.95, grp.position.z + z); b.castShadow = true; scene.add(b);
    animados.bandeiras.push(b);
  };
  const torrePrincesa = (x, z, lado) => {
    const mc = lado === 'azul' ? mAzul : mVerm, est = lado === 'azul' ? mEstA : mEstV;
    const g = new THREE.Group(); g.position.set(x, Y_CHAO, z);
    const face = Math.atan2(-x, -z * 0.3); // olha para o centro
    g.add(M(new THREE.CylinderGeometry(1.15, 1.3, 0.3, 12), mPedraEsc, 0, 0.15, 0));
    g.add(M(new THREE.CylinderGeometry(0.82, 0.95, 1.9, 12), mTijT, 0, 1.25, 0));
    g.add(M(new THREE.CylinderGeometry(1.02, 0.86, 0.3, 12), mPedra, 0, 2.3, 0));
    for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; const b = M(blocoArred(0.3, 0.3, 0.26, 0.05, 1), mPedra, Math.cos(a) * 0.9, 2.42, Math.sin(a) * 0.9); b.rotation.y = -a; g.add(b); }
    g.add(M(new THREE.CylinderGeometry(0.98, 0.98, 0.12, 12), mc, 0, 2.47, 0));
    const teto = M(new THREE.ConeGeometry(1.08, 1.25, 12), mc, 0, 3.15, 0); g.add(teto);
    g.add(M(new THREE.SphereGeometry(0.13, 10, 8), mOuro, 0, 3.82, 0));
    // porta e janelas viradas para o tabuleiro
    const frente = new THREE.Group(); frente.rotation.y = face; g.add(frente);
    const porta = M(blocoArred(0.5, 0.75, 0.2, 0.08), mEscuro, 0, 0.3, 0.86); frente.add(porta);
    frente.add(M(blocoArred(0.62, 0.1, 0.24, 0.04), mOuro, 0, 1.05, 0.86, false));
    const estd = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.93), est); estd.position.set(0, 1.62, 0.93); frente.add(estd);
    lote.add(g);
    bandeira(g, 3.7, mc);
  };
  const torreRei = (x, z, lado) => {
    const mc = lado === 'azul' ? mAzul : mVerm, est = lado === 'azul' ? mEstA : mEstV;
    const g = new THREE.Group(); g.position.set(x, Y_CHAO, z);
    const vira = lado === 'azul' ? Math.PI : 0;
    g.add(M(blocoArred(3.2, 0.3, 3.0, 0.1), mPedraEsc, 0, 0, 0));
    g.add(M(blocoArred(2.5, 2.1, 2.3, 0.1), mTijT, 0, 0.3, 0));
    g.add(M(blocoArred(2.8, 0.26, 2.6, 0.08), mPedra, 0, 2.38, 0));
    for (let i = 0; i < 6; i++) for (const s of [-1, 1]) {
      g.add(M(blocoArred(0.3, 0.32, 0.28, 0.05, 1), mPedra, -1.15 + i * 0.46, 2.62, s * 1.15));
      if (i > 0 && i < 5) g.add(M(blocoArred(0.28, 0.32, 0.3, 0.05, 1), mPedra, s * 1.25, 2.62, -1.15 + i * 0.46));
    }
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      g.add(M(new THREE.CylinderGeometry(0.45, 0.5, 3.0, 10), mTijT, sx * 1.3, 1.5, sz * 1.2));
      g.add(M(new THREE.CylinderGeometry(0.56, 0.48, 0.2, 10), mPedra, sx * 1.3, 3.05, sz * 1.2));
      g.add(M(new THREE.ConeGeometry(0.58, 0.9, 10), mc, sx * 1.3, 3.6, sz * 1.2));
      g.add(M(new THREE.SphereGeometry(0.09, 8, 6), mOuro, sx * 1.3, 4.1, sz * 1.2, false));
    }
    const piramide = M(new THREE.ConeGeometry(1.45, 1.4, 4), mc, 0, 3.4, 0); piramide.rotation.y = Math.PI / 4; g.add(piramide);
    if (lado === 'azul') { g.add(M(new THREE.BoxGeometry(0.12, 0.7, 0.12), mOuro, 0, 4.4, 0)); g.add(M(new THREE.BoxGeometry(0.42, 0.12, 0.12), mOuro, 0, 4.5, 0)); }
    else for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; g.add(M(new THREE.ConeGeometry(0.07, 0.3, 5), mOuro, Math.cos(a) * 0.18, 4.25, Math.sin(a) * 0.18)); g.add(M(new THREE.CylinderGeometry(0.22, 0.22, 0.12, 10), mOuro, 0, 4.1, 0)); }
    const frente = new THREE.Group(); frente.rotation.y = vira; g.add(frente);
    frente.add(M(blocoArred(0.9, 1.2, 0.2, 0.12), mEscuro, 0, 0.3, 1.12));
    frente.add(M(blocoArred(1.05, 0.12, 0.26, 0.05), mOuro, 0, 1.52, 1.12, false));
    for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 1.05), est); e.position.set(s * 0.82, 1.55, 1.17); frente.add(e); }
    lote.add(g);
    bandeira(g, 4.3, mc, 0.0, 0.0);
  };
  const XT = XW + 1.25;
  torrePrincesa(-XT, -ZB + 1.6, 'verm'); torrePrincesa(XT, -ZB + 1.6, 'verm');
  torrePrincesa(-XT, ZB - 1.0, 'azul'); torrePrincesa(XT, ZB - 1.0, 'azul');
  torreRei(0, -ZB - WT - 1.9, 'verm'); torreRei(0, ZFR + WT + 4.6, 'azul');

  // ---- cenário: árvores redondas, palmeiras, arbustos, pedras, tendas, colinas ----
  const mCopa = ['#3a9a3c', '#4cb046', '#2f8a37', '#5cbf4c'].map(c => mat({ color: c, roughness: 0.85 }));
  const mTronco = mat({ color: '#8a5a32' });
  const mPalma = mat({ color: '#4fae3c', roughness: 0.8, side: THREE.DoubleSide });
  const mRocha = mat({ color: '#aab1b6', roughness: 0.85, flatShading: true });
  const mRochaA = mat({ color: '#d8bf8a', roughness: 0.9, flatShading: true });
  const longe = (x, z) => Math.abs(x) > 13 || z < -15 || z > 15;
  const geoCopa = new THREE.IcosahedronGeometry(1, 1);
  const arvore = (x, z, s) => {
    const g = new THREE.Group(); g.position.set(x, Y_CHAO, z); g.scale.setScalar(s);
    g.add(M(new THREE.CylinderGeometry(0.16, 0.24, 1.2, 7), mTronco, 0, 0.6, 0));
    const mc = mCopa[Math.floor(rnd() * mCopa.length)];
    const blobs = [[0, 1.65, 0, 0.85], [0.5, 1.35, 0.2, 0.6], [-0.45, 1.4, -0.1, 0.62], [0.05, 2.2, -0.05, 0.6]];
    for (const [bx, by, bz, br] of blobs) { const b = M(geoCopa, mc, bx, by, bz); b.scale.set(br, br * 0.9, br); g.add(b); }
    lote.add(g, longe(x, z));
  };
  const palmeira = (x, z, s) => {
    const g = new THREE.Group(); g.position.set(x, Y_CHAO, z); g.scale.setScalar(s); g.rotation.y = rnd() * 6;
    const curva = entre(0.15, 0.35); let px = 0, py = 0;
    for (let i = 0; i < 6; i++) { const seg = M(new THREE.CylinderGeometry(0.11 - i * 0.008, 0.14 - i * 0.008, 0.62, 6), mTronco, px, py + 0.31, 0); seg.rotation.z = -curva * i * 0.25; g.add(seg); px += Math.sin(curva * i * 0.25) * 0.62; py += 0.6; }
    for (let i = 0; i < 7; i++) {
      const f = new THREE.Group(); f.position.set(px, py, 0); f.rotation.y = i / 7 * Math.PI * 2;
      const folha = M(new THREE.ConeGeometry(0.28, 1.6, 4), mPalma, 0, 0, 0.8); folha.rotation.x = Math.PI / 2 + 0.5; folha.scale.set(1, 1, 0.18); f.add(folha); g.add(f);
    }
    g.add(M(new THREE.SphereGeometry(0.16, 8, 6), mTronco, px, py - 0.05, 0));
    lote.add(g, longe(x, z));
  };
  const arbusto = (x, z, s) => {
    const g = new THREE.Group(); g.position.set(x, Y_CHAO, z); g.scale.setScalar(s);
    const mc = mCopa[Math.floor(rnd() * mCopa.length)];
    for (let i = 0; i < 3; i++) { const b = M(geoCopa, mc, entre(-0.35, 0.35), 0.3, entre(-0.25, 0.25)); b.scale.setScalar(entre(0.35, 0.5)); g.add(b); }
    lote.add(g, longe(x, z));
  };
  const pedra = (x, z, s, areia) => {
    const p = M(new THREE.DodecahedronGeometry(1, 0), areia ? mRochaA : mRocha, x, Y_CHAO + 0.15 * s, z);
    p.scale.set(s * entre(0.8, 1.3), s * entre(0.5, 0.8), s * entre(0.8, 1.2)); p.rotation.set(rnd(), rnd() * 6, rnd()); lote.add(p);
  };
  const tenda = (x, z, mc) => {
    const g = new THREE.Group(); g.position.set(x, Y_CHAO, z); g.rotation.y = rnd() * 6;
    g.add(M(new THREE.ConeGeometry(1.15, 1.6, 8), mc === mAzul ? mTendaA : mTendaV, 0, 0.8, 0));
    g.add(M(new THREE.CylinderGeometry(1.17, 1.17, 0.08, 8), mMadEsc, 0, 0.04, 0));
    g.add(M(new THREE.CylinderGeometry(0.02, 0.02, 0.6, 5), mMadEsc, 0, 1.75, 0));
    lote.add(g);
  };
  const listras = (cor) => { const t = canvasTex(128, 32, (g, w, h) => { for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? '#f6eedb' : cor; g.fillRect(i * w / 8, 0, w / 8, h); } }); t.wrapT = THREE.ClampToEdgeWrapping; return t; };
  const mTendaA = mat({ map: listras(AZUL), roughness: 0.9 }), mTendaV = mat({ map: listras(VERM), roughness: 0.9 });
  const livre = (x, z, folga = 0) => {
    if (Math.abs(z) < RIO + 0.9 + folga) return false;
    if (Math.abs(x) < XW + 2.9 + folga && z > -ZB - WT - 4.0 - folga && z < ZFR + 7.6 + folga) return false;
    return true;
  };
  // fileiras de árvores emoldurando a arena (como no Clash), mais densas perto
  for (let i = 0; i < 150; i++) {
    const x = entre(-26, 26), z = entre(-24, 22);
    if (!livre(x, z)) continue;
    const d = Math.hypot(x * 0.8, z * 0.6), r = rnd();
    if (Math.abs(z) < 4 && r < 0.6) palmeira(x, z, entre(0.9, 1.2));
    else if (r < 0.62) arvore(x, z, entre(1.0, 1.5) * (d > 14 ? 1.25 : 1));
    else if (r < 0.75) palmeira(x, z, entre(0.9, 1.25));
    else if (r < 0.88) arbusto(x, z, entre(0.9, 1.4));
    else pedra(x, z, entre(0.35, 0.8), rnd() < 0.5);
  }
  // arbustos encostados na praça
  for (let i = 0; i < 26; i++) { const s = rnd() < 0.5 ? -1 : 1; const x = s * entre(XW + 2.5, XW + 3.4), z = entre(-ZB - 6, ZFR + 5); if (Math.abs(z) > RIO + 0.7) arbusto(x, z, entre(0.7, 1.1)); }
  // pedras nas margens do rio
  for (let i = 0; i < 24; i++) { const s = rnd() < 0.5 ? -1 : 1; const x = s * entre(XW + 0.6, 24); pedra(x, (rnd() < 0.5 ? -1 : 1) * entre(RIO - 0.1, RIO + 0.4), entre(0.2, 0.42), false); }
  // tendas dos acampamentos (azul atrás do jogador, vermelho atrás do inimigo)
  for (const [x, z] of [[-9, 9.5], [9.2, 11.5], [-11.5, 14], [11, 7]]) tenda(x, z, mAzul);
  for (const [x, z] of [[-9.2, -9.5], [9, -10.8], [-11.8, -6.5], [11.5, -13]]) tenda(x, z, mVerm);
  // pontezinhas de madeira no rio, longe da arena
  for (const x of [-13, 13]) {
    for (let i = 0; i < 6; i++) lote.add(M(blocoArred(0.32, 0.1, RIO * 2 + 0.9, 0.03, 1), mMad, x - 0.9 + i * 0.36, Y_CHAO - 0.02, 0));
    for (const s of [-1, 1]) for (const sz of [-1, 1]) lote.add(M(new THREE.CylinderGeometry(0.06, 0.06, 0.6, 6), mMadEsc, x + s * 1.05, Y_CHAO + 0.25, sz * (RIO + 0.4)));
  }
  // colinas e dunas ao longe (fecham o horizonte)
  const mColina = mat({ color: '#6fb04a', roughness: 1 }), mDuna = mat({ color: '#e2c98e', roughness: 1 });
  for (let i = 0; i < 22; i++) {
    const a = i / 22 * Math.PI * 2 + entre(-0.1, 0.1), r = entre(36, 48);
    const h = M(new THREE.SphereGeometry(1, 14, 8), i % 3 === 0 ? mDuna : mColina, Math.cos(a) * r, Y_CHAO - 1, Math.sin(a) * r, false, false);
    h.scale.set(entre(8, 14), entre(3, 7), entre(6, 10)); lote.add(h);
  }

  lote.montar(scene);

  // ---------------- animação ----------------
  function atualizar(tempo) {
    if (animados.agua) animados.agua.t.value = tempo;
    for (const b of animados.bandeiras) b.rotation.y = Math.sin(tempo * 3 + b.position.x) * 0.35 + (b.position.z < 0 ? 0 : Math.PI);
    animados.chamas.forEach((c, i) => { const f = 1 + Math.sin(tempo * 13 + i * 1.7) * 0.12 + Math.sin(tempo * 21 + i) * 0.06; c.scale.set((i % 2 ? 0.55 : 1) * (2 - f), (i % 2 ? 0.55 : 1) * f, (i % 2 ? 0.55 : 1) * (2 - f)); });
  }
  return { quadrados, slotsBanco, atualizar, alturaRei: 4.4 + Y_CHAO, zRei: -ZB - WT - 1.9, XW, ZFR: ZFR + WT };
}

// sombra arredondada sob as unidades (sensação de oclusão de ambiente)
let _blob;
export function blobSombra() {
  if (!_blob) _blob = { geo: new THREE.PlaneGeometry(1.35, 1.35).rotateX(-Math.PI / 2), mat: new THREE.MeshBasicMaterial({ map: texBlob(), transparent: true, opacity: 0.5, depthWrite: false, color: '#000' }) };
  const m = new THREE.Mesh(_blob.geo, _blob.mat); m.position.y = 0.012; m.renderOrder = 1; return m;
}
