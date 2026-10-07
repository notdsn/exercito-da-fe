// Arena 3D no estilo do modo Combinações Táticas (Merge Tactics): campo retangular de grama com
// hexágonos suaves, banco de madeira com moldura dourada embaixo (seu) e em cima (do adversário),
// plataformas octogonais de pedra para os Governantes (reis) nos cantos, piso de pedra clara e
// prédios coloridos de castelo com bandeirolas em volta. Palmeiras/rochas podem vir de GLB da Tripo.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

let semente = 20261007;
const rnd = () => (semente = (semente * 16807) % 2147483647) / 2147483647;
const entre = (a, b) => a + rnd() * (b - a);
const hex = c => '#' + c.getHexString();

// ---------------- Texturas pintadas em canvas ----------------
function canvasTex(w, h, desenhar, rep = [1, 1], repetir = true) {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  desenhar(cv.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  if (repetir) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep[0], rep[1]); }
  t.anisotropy = 8;
  return t;
}
function semEmenda(w, h, x, y, r, f) {
  for (const dx of [-w, 0, w]) for (const dy of [-h, 0, h]) {
    if (x + dx + r < 0 || x + dx - r > w || y + dy + r < 0 || y + dy - r > h) continue;
    f(x + dx, y + dy);
  }
}
function pinceladas(g, w, h, n, claro, escuro, emenda = true) {
  for (let i = 0; i < n; i++) {
    const x = rnd() * w, y = rnd() * h, l = entre(4, 9), c = rnd() < 0.5;
    g.strokeStyle = c ? claro(entre(0.10, 0.24)) : escuro(entre(0.06, 0.16));
    g.lineWidth = entre(1.4, 2.6); g.lineCap = 'round';
    const f = (px, py) => { g.beginPath(); g.moveTo(px, py); g.quadraticCurveTo(px + entre(-2, 2), py - l * 0.6, px + entre(-3, 3), py - l); g.stroke(); };
    if (emenda) semEmenda(w, h, x, y, 10, f); else f(x, y);
  }
}
function manchas(g, w, h, n, rMin, rMax, a1, a2, emenda = true) {
  for (let i = 0; i < n; i++) {
    const x = rnd() * w, y = rnd() * h, r = entre(rMin, rMax), esc = rnd() < 0.5;
    const f = (px, py) => {
      const gr = g.createRadialGradient(px, py, 0, px, py, r);
      gr.addColorStop(0, esc ? `rgba(20,60,10,${a1})` : `rgba(255,255,210,${a2})`); gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr; g.fillRect(px - r, py - r, r * 2, r * 2);
    };
    if (emenda) semEmenda(w, h, x, y, r, f); else f(x, y);
  }
}
// campo de uma metade: xadrez suave pintado + sombreado nas bordas
function texCampo(cols, linhas, px = 160) {
  return canvasTex(cols * px, linhas * px, (g, w, h) => {
    const A = new THREE.Color('#97d85a'), B = new THREE.Color('#86cb4a');
    for (let l = 0; l < linhas; l++) for (let c = 0; c < cols; c++) {
      const base = (c + l) % 2 ? B : A;
      const gr = g.createRadialGradient(c * px + px / 2, l * px + px / 2, px * 0.1, c * px + px / 2, l * px + px / 2, px * 0.75);
      gr.addColorStop(0, hex(base.clone().offsetHSL(0, 0.02, 0.025))); gr.addColorStop(1, hex(base.clone().offsetHSL(0, 0, -0.015)));
      g.fillStyle = gr; g.fillRect(c * px, l * px, px, px);
    }
    manchas(g, w, h, 26, 30, 80, 0.06, 0.07, false);
    pinceladas(g, w, h, w * h / 90, a => `rgba(235,255,190,${a})`, a => `rgba(40,95,20,${a})`, false);
    // trevos e florzinhas
    for (let i = 0; i < 22; i++) {
      const x = rnd() * w, y = rnd() * h, br = rnd() < 0.7;
      g.fillStyle = br ? 'rgba(255,255,255,0.85)' : 'rgba(255,225,80,0.9)';
      for (let k = 0; k < 4; k++) { g.beginPath(); g.arc(x + Math.cos(k * 1.57) * 2.2, y + Math.sin(k * 1.57) * 2.2, 1.8, 0, 7); g.fill(); }
      g.fillStyle = 'rgba(255,200,40,0.9)'; g.beginPath(); g.arc(x, y, 1.3, 0, 7); g.fill();
    }
    // sombra suave junto ao meio-fio (oclusão pintada)
    const borda = (x0, y0, x1, y1, ww, hh) => { const gr = g.createLinearGradient(x0, y0, x1, y1); gr.addColorStop(0, 'rgba(25,60,10,0.30)'); gr.addColorStop(1, 'rgba(25,60,10,0)'); g.fillStyle = gr; g.fillRect(Math.min(x0, x1), Math.min(y0, y1), ww, hh); };
    const s = 26;
    borda(0, 0, s, 0, s, h); borda(w, 0, w - s, 0, s, h); borda(0, 0, 0, s, w, s); borda(0, h, 0, h - s, w, s);
  }, [1, 1], false);
}
function texGrama(tam = 512, nManchas = 40) {
  return canvasTex(tam, tam, (g, w, h) => {
    g.fillStyle = '#f2f4ea'; g.fillRect(0, 0, w, h);
    manchas(g, w, h, nManchas, 30, 90, 0.12, 0.15);
    pinceladas(g, w, h, w * h / 60, a => `rgba(255,255,225,${a + 0.06})`, a => `rgba(30,75,15,${a})`);
  });
}
function texPedra() {
  return canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#ece7dc'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 40; i++) {
      const x = rnd() * w, y = rnd() * h, r = entre(10, 40), esc = rnd() < 0.5;
      semEmenda(w, h, x, y, r, (px, py) => { const gr = g.createRadialGradient(px, py, 0, px, py, r); gr.addColorStop(0, esc ? 'rgba(120,105,85,0.10)' : 'rgba(255,255,255,0.22)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(px - r, py - r, 2 * r, 2 * r); });
    }
    for (let i = 0; i < 500; i++) {
      const x = rnd() * w, y = rnd() * h, r = entre(0.6, 2.2);
      g.fillStyle = rnd() < 0.5 ? `rgba(90,80,65,${entre(0.06, 0.16)})` : `rgba(255,255,255,${entre(0.12, 0.3)})`;
      semEmenda(w, h, x, y, r, (px, py) => { g.beginPath(); g.arc(px, py, r, 0, 7); g.fill(); });
    }
  });
}
function texTijolos(base = '#efe6d2', fil = 4, col = 3) {
  return canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#9b8e78'; g.fillRect(0, 0, w, h);
    const bh = h / fil, bw = w / col, m = 6, c0 = new THREE.Color(base);
    for (let r = 0; r < fil; r++) for (let c = -1; c <= col; c++) {
      const x = c * bw + (r % 2 ? bw / 2 : 0), y = r * bh;
      const cor = c0.clone().offsetHSL(entre(-0.01, 0.01), entre(-0.05, 0.04), entre(-0.06, 0.04));
      const gr = g.createLinearGradient(0, y, 0, y + bh);
      gr.addColorStop(0, hex(cor.clone().offsetHSL(0, 0, 0.07))); gr.addColorStop(0.3, hex(cor)); gr.addColorStop(1, hex(cor.clone().offsetHSL(0, 0, -0.11)));
      g.fillStyle = gr; g.beginPath(); g.roundRect(x + m / 2, y + m / 2, bw - m, bh - m, 9); g.fill();
    }
  });
}
function texLajotas() {
  return canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#b4a586'; g.fillRect(0, 0, w, h);
    // pedras irregulares em 3 fileiras deslocadas
    const fil = 4;
    for (let r = 0; r < fil; r++) {
      let x = r % 2 ? -32 : 0; const y = r * h / fil;
      while (x < w) {
        const ww = entre(48, 80), cor = new THREE.Color('#f1e4c3').offsetHSL(entre(-0.01, 0.015), entre(-0.08, 0.04), entre(-0.07, 0.03));
        const gr = g.createLinearGradient(0, y, 0, y + h / fil);
        gr.addColorStop(0, hex(cor.clone().offsetHSL(0, 0, 0.05))); gr.addColorStop(1, hex(cor.clone().offsetHSL(0, 0, -0.08)));
        g.fillStyle = gr;
        const f = px => { g.beginPath(); g.roundRect(px + 3, y + 3, ww - 6, h / fil - 6, 12); g.fill(); };
        f(x); if (x + ww > w) f(x - w);
        x += ww;
      }
    }
  });
}
function texMadeira(horizontal = false) {
  return canvasTex(256, 256, (g, w, h) => {
    if (horizontal) { g.translate(w, 0); g.rotate(Math.PI / 2); }
    g.fillStyle = '#8a5428'; g.fillRect(0, 0, w, h);
    const n = 4, s = w / n;
    for (let i = 0; i < n; i++) {
      const cor = new THREE.Color('#d49656').offsetHSL(0, entre(-0.05, 0.05), entre(-0.06, 0.04));
      const gr = g.createLinearGradient(i * s, 0, i * s + s, 0);
      gr.addColorStop(0, hex(cor.clone().offsetHSL(0, 0, 0.06))); gr.addColorStop(1, hex(cor.clone().offsetHSL(0, 0, -0.07)));
      g.fillStyle = gr; g.beginPath(); g.roundRect(i * s + 3, -4, s - 6, h + 8, 6); g.fill();
      for (let k = 0; k < 5; k++) { g.strokeStyle = `rgba(110,60,20,${entre(0.12, 0.28)})`; g.lineWidth = 1.5; const x = i * s + 8 + rnd() * (s - 16); g.beginPath(); g.moveTo(x, 0); g.bezierCurveTo(x + 4, h * 0.3, x - 4, h * 0.6, x + 1, h); g.stroke(); }
      g.fillStyle = 'rgba(60,30,10,0.5)'; g.beginPath(); g.arc(i * s + s / 2, 16, 2.5, 0, 7); g.arc(i * s + s / 2, h - 16, 2.5, 0, 7); g.fill();
    }
  });
}
function texEstandarte(cor, emblema) {
  return canvasTex(128, 192, (g, w, h) => {
    g.beginPath(); g.moveTo(4, 4); g.lineTo(w - 4, 4); g.lineTo(w - 4, h - 30); g.lineTo(w / 2, h - 4); g.lineTo(4, h - 30); g.closePath();
    const gr = g.createLinearGradient(0, 0, w, 0); const c = new THREE.Color(cor);
    gr.addColorStop(0, hex(c.clone().offsetHSL(0, 0, -0.12))); gr.addColorStop(0.5, cor); gr.addColorStop(1, hex(c.clone().offsetHSL(0, 0, -0.12)));
    g.fillStyle = gr; g.fill(); g.lineWidth = 9; g.strokeStyle = '#ffd23a'; g.stroke();
    g.fillStyle = '#ffd23a'; g.strokeStyle = '#7a4a00'; g.lineWidth = 3;
    const cx = w / 2, cy = 82;
    if (emblema === 'cruz') { g.beginPath(); g.rect(cx - 9, cy - 42, 18, 84); g.rect(cx - 30, cy - 20, 60, 18); g.fill(); g.stroke(); }
    else { g.beginPath(); g.moveTo(cx - 34, cy + 20); g.lineTo(cx - 34, cy - 18); g.lineTo(cx - 17, cy); g.lineTo(cx, cy - 30); g.lineTo(cx + 17, cy); g.lineTo(cx + 34, cy - 18); g.lineTo(cx + 34, cy + 20); g.closePath(); g.fill(); g.stroke(); }
  }, [1, 1], false);
}
function texBlob() {
  return canvasTex(128, 128, (g, w, h) => {
    const gr = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(0.45, 'rgba(0,0,0,0.75)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
  }, [1, 1], false);
}
function texDestaque() {
  return canvasTex(128, 128, (g, w, h) => {
    g.fillStyle = 'rgba(255,255,255,0.35)'; g.beginPath(); g.roundRect(6, 6, w - 12, h - 12, 18); g.fill();
    g.strokeStyle = 'rgba(255,255,255,1)'; g.lineWidth = 7; g.beginPath(); g.roundRect(8, 8, w - 16, h - 16, 16); g.stroke();
  }, [1, 1], false);
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
// bloco arredondado; base em y=0, topo em y=h
export function blocoArred(w, h, d, r = 0.06, seg = 2) {
  r = Math.min(r, w / 2 - 0.001, d / 2 - 0.001, h / 2 - 0.001);
  const geo = new THREE.ExtrudeGeometry(retArred(w - 2 * r, d - 2 * r, Math.min(r, (w - 2 * r) / 2, (d - 2 * r) / 2) * 0.9),
    { depth: Math.max(0.001, h - 2 * r), bevelEnabled: true, bevelThickness: r, bevelSize: r, bevelSegments: seg, curveSegments: 3 });
  geo.rotateX(-Math.PI / 2); geo.translate(0, r, 0);
  return geo;
}
function uvMetros(g, esc = 1, eixos = 'xz') {
  const pos = g.attributes.position, uv = g.attributes.uv, nor = g.attributes.normal;
  for (let i = 0; i < pos.count; i++) {
    if (eixos === 'auto') { const nx = Math.abs(nor.getX(i)), ny = Math.abs(nor.getY(i)), nz = Math.abs(nor.getZ(i));
      if (ny > nx && ny > nz) uv.setXY(i, pos.getX(i) * esc, pos.getZ(i) * esc);
      else if (nx > nz) uv.setXY(i, pos.getZ(i) * esc, pos.getY(i) * esc); else uv.setXY(i, pos.getX(i) * esc, pos.getY(i) * esc); }
    else uv.setXY(i, pos.getX(i) * esc, pos.getZ(i) * esc);
  }
  return g;
}

// junta malhas estáticas por material (poucas chamadas de desenho)
class Lote {
  constructor() { this.grupos = new Map(); }
  add(obj, semSombra = false) {
    obj.updateMatrixWorld(true);
    obj.traverse(o => {
      if (!o.isMesh) return;
      let g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
      for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
      if (!g.attributes.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
      g.applyMatrix4(o.matrixWorld);
      const cast = o.castShadow && !semSombra;
      const k = o.material.uuid + (cast ? 'c' : '') + (o.receiveShadow ? 'r' : '');
      if (!this.grupos.has(k)) this.grupos.set(k, { mat: o.material, geos: [], cast, rec: o.receiveShadow });
      this.grupos.get(k).geos.push(g);
    });
  }
  montar(alvo) {
    const out = [];
    for (const { mat, geos, cast, rec } of this.grupos.values()) {
      const m = new THREE.Mesh(mergeGeometries(geos, false), mat);
      m.castShadow = cast; m.receiveShadow = rec; m.matrixAutoUpdate = false; m.updateMatrix();
      alvo.add(m); out.push(m);
    }
    this.grupos.clear();
    return out;
  }
}
const M = (geo, mat, x = 0, y = 0, z = 0, sombra = true, recebe = true) => {
  const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = sombra; m.receiveShadow = recebe; return m;
};

// ---------------- Arena ----------------
// cfg: { T, RS, COLS, LINHAS, BANCO, posQuadrado, posBanco, X0, ZB, ZDIV, ZBANCO, XBANCO }
function texHexCampo(cfg, W, D) {
  const { T, COLS, LINHAS, posQuadrado } = cfg;
  const px = 96;                                   // pixels por metro
  const cw = Math.round(W * px), ch = Math.round(D * px);
  return canvasTex(cw, ch, (g, w, h) => {
    g.fillStyle = '#8fd157'; g.fillRect(0, 0, w, h);
    const R = T / Math.sqrt(3) * px;               // raio do hexágono (ponta para cima)
    const hexa = (cx, cy, r) => { g.beginPath(); for (let k = 0; k < 6; k++) { const a = Math.PI / 6 + k * Math.PI / 3; g.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); } g.closePath(); };
    // hexágonos (inclui uma volta extra para preencher as bordas)
    const tons = ['#97d65d', '#89cc50', '#92d257'];
    for (let l = -1; l <= LINHAS * 2; l++) for (let c = -2; c <= COLS + 1; c++) {
      const p = posQuadrado(c, ((l % 2) + 2) % 2 === 1 ? l : l); // usa a mesma fórmula do jogo
      const x = (p.x + W / 2) * px, y = (p.z + D / 2) * px;
      const t = ((c + l * 2) % 3 + 3) % 3;
      g.fillStyle = tons[t]; hexa(x, y, R * 0.995); g.fill();
      // leve brilho no topo de cada hexágono (volume suave)
      const gr = g.createRadialGradient(x, y - R * 0.3, R * 0.1, x, y, R);
      gr.addColorStop(0, 'rgba(255,255,230,0.10)'); gr.addColorStop(1, 'rgba(0,40,0,0.06)');
      g.fillStyle = gr; hexa(x, y, R * 0.97); g.fill();
    }
    // pinceladas de grama
    for (let i = 0; i < 2600; i++) {
      const x = rnd() * w, y = rnd() * h, c = rnd() < 0.5 ? 'rgba(200,240,140,0.16)' : 'rgba(40,110,30,0.10)';
      g.strokeStyle = c; g.lineWidth = 1.5; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (rnd() - 0.5) * 4, y - 5 - rnd() * 5); g.stroke();
    }
    // sombra suave junto às bordas
    const v = 0.5 * px;
    for (const [x0, y0, x1, y1] of [[0, 0, 0, v], [0, h, 0, h - v], [0, 0, v, 0], [w, 0, w - v, 0]]) {
      const gr = g.createLinearGradient(x0, y0, x1, y1); gr.addColorStop(0, 'rgba(20,60,10,0.28)'); gr.addColorStop(1, 'rgba(20,60,10,0)');
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
    }
  }, [1, 1], false);
}
function texHexDestaque() {
  return canvasTex(128, 128, (g, w, h) => {
    const hexa = r => { g.beginPath(); for (let k = 0; k < 6; k++) { const a = Math.PI / 6 + k * Math.PI / 3; g.lineTo(64 + Math.cos(a) * r, 64 + Math.sin(a) * r); } g.closePath(); };
    g.fillStyle = 'rgba(255,255,255,0.35)'; hexa(58); g.fill();
    g.strokeStyle = '#fff'; g.lineWidth = 6; hexa(57); g.stroke();
  }, [1, 1], false);
}
function texTexto() {
  const c = document.createElement('canvas'); c.width = 512; c.height = 160;
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return { c, t };
}
function texPlanchas() { // tábuas do banco
  return canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#c98a4f'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 40; i++) { g.strokeStyle = rnd() < 0.5 ? 'rgba(120,60,20,0.35)' : 'rgba(255,220,170,0.25)'; g.lineWidth = 1 + rnd() * 2; const y = rnd() * h; g.beginPath(); g.moveTo(0, y); g.bezierCurveTo(w * 0.3, y + (rnd() - 0.5) * 8, w * 0.7, y + (rnd() - 0.5) * 8, w, y); g.stroke(); }
    for (let i = 0; i < 4; i++) { g.fillStyle = 'rgba(110,55,20,0.5)'; g.beginPath(); g.ellipse(rnd() * w, rnd() * h, 6, 3, 0, 0, 7); g.fill(); }
    g.strokeStyle = 'rgba(90,45,15,0.8)'; g.lineWidth = 6; g.strokeRect(3, 3, w - 6, h - 6);
  });
}
function texPiso() { // piso de pedra clara do castelo
  return canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#d6d3cc'; g.fillRect(0, 0, w, h);
    const n = 4, s = w / n;
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
      const off = j % 2 ? s / 2 : 0, x = i * s + off, y = j * s, tom = 205 + Math.floor(rnd() * 22);
      for (const dx of [0, -w]) { g.fillStyle = `rgb(${tom},${tom - 2},${tom - 8})`; g.beginPath(); g.roundRect(x + dx + 4, y + 4, s - 8, s - 8, 10); g.fill(); }
    }
    manchas(g, w, h, 60, 6, 22, 0.04, 0.10);
  });
}
function texParede(cor) {
  return canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = cor; g.fillRect(0, 0, w, h);
    for (let j = 0; j < 8; j++) for (let i = 0; i < 4; i++) { const off = j % 2 ? 32 : 0; g.strokeStyle = 'rgba(0,0,0,0.10)'; g.lineWidth = 3; g.strokeRect(i * 64 + off, j * 32, 64, 32); }
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(255,255,255,0.12)'); gr.addColorStop(1, 'rgba(0,0,0,0.12)'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
  });
}

export function criarArena(scene, cfg) {
  const { T, COLS, LINHAS, BANCO, posQuadrado, posBanco, X0, ZB, ZDIV, ZBANCO } = cfg;
  const XBANCO = cfg.XBANCO || 0;
  const lote = new Lote();
  const raiz = new THREE.Group(); raiz.name = 'arena'; scene.add(raiz);
  const animados = { bandeiras: [], bandeirolas: [] };
  const mat = o => new THREE.MeshStandardMaterial({ roughness: 0.9, metalness: 0, ...o });
  const W = X0 * 2, D = ZB * 2;
  const XP = X0 + 1.35, ZP = ZBANCO + 1.0;           // fim do piso
  const tPedra = texPedra();
  const mPiso = mat({ map: texPiso() });
  const mPedra = mat({ color: '#e9e6df', map: tPedra });
  const mPedra2 = mat({ color: '#cfcac0', map: tPedra });
  const mPedraEsc = mat({ color: '#a8a296', map: tPedra });
  const mOuro = mat({ color: '#ffc93a', roughness: 0.35, metalness: 0.5, emissive: '#5a3a00', emissiveIntensity: 0.3 });
  const mOuroEsc = mat({ color: '#d99a1e', roughness: 0.45, metalness: 0.4 });
  const mPlancha = mat({ map: texPlanchas(), roughness: 0.8 });
  const mMadEsc = mat({ color: '#7a4a26' });
  const AZUL = '#2f7ff0', VERM = '#e8443a', AMAR = '#f6c32c';
  const mAzul = mat({ color: AZUL, roughness: 0.5 }), mVerm = mat({ color: VERM, roughness: 0.5 }), mAmar = mat({ color: AMAR, roughness: 0.5 });
  const mBranco = mat({ color: '#f4f1ea', map: tPedra });

  // ---- céu / fundo ----
  {
    const t = canvasTex(4, 256, g => { const gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, '#6fb7f0'); gr.addColorStop(1, '#d9efff'); g.fillStyle = gr; g.fillRect(0, 0, 4, 256); }, [1, 1], false);
    scene.background = t; scene.fog = new THREE.Fog('#cfe6f7', 40, 90);
    const chao = new THREE.PlaneGeometry(200, 200); chao.rotateX(-Math.PI / 2);
    lote.add(M(chao, mat({ color: '#7cc04c', map: (() => { const t = texGrama(512, 40); t.repeat.set(30, 30); return t; })() }), 0, -0.4, 0, false, true));
  }
  // ---- piso de pedra clara em volta do campo ----
  {
    const g = blocoArred(XP * 2, 0.3, ZP * 2, 0.12, 2); uvMetros(g, 0.32, 'auto');
    lote.add(M(g, mPiso, 0, -0.32, 0, false, true));
  }
  // ---- campo de grama com hexágonos ----
  {
    const g = new THREE.PlaneGeometry(W, D); g.rotateX(-Math.PI / 2);
    const m = M(g, mat({ map: texHexCampo(cfg, W, D), roughness: 1 }), 0, 0.0, 0, false, true); raiz.add(m);
    // meio-fio baixo de pedra em volta
    const borda = 0.32;
    for (const [x, z, w, d] of [[0, -ZB - borda / 2, W + borda * 2, borda], [0, ZB + borda / 2, W + borda * 2, borda], [-X0 - borda / 2, 0, borda, D], [X0 + borda / 2, 0, borda, D]]) {
      const b = blocoArred(w, 0.16, d, 0.07, 2); uvMetros(b, 0.8, 'auto'); lote.add(M(b, mPedra, x, -0.1, z, true, true));
    }
  }
  const quadrados = [];
  const geoDest = new THREE.PlaneGeometry(T * 1.15, T * 1.15); geoDest.rotateX(-Math.PI / 2);
  const texDest = texHexDestaque();
  for (let l = 0; l < LINHAS * 2; l++) for (let c = 0; c < COLS; c++) {
    const m = new THREE.Mesh(geoDest, new THREE.MeshBasicMaterial({ map: texDest, transparent: true, opacity: 0, depthWrite: false, color: '#fff' }));
    m.position.copy(posQuadrado(c, l)); m.position.y = 0.02; m.visible = false; m.renderOrder = 2; raiz.add(m);
    quadrados.push({ malha: m, c, l, jogador: l >= LINHAS });
  }

  // ---- bancos de madeira com moldura dourada (seu embaixo, do adversário em cima) ----
  const slotsBanco = [];
  const PASSO = cfg.passoBanco || T;
  const banco = (zc, xc, funcional) => {
    const larg = BANCO * PASSO + 0.36, prof = ZBANCO - ZDIV;
    const f = blocoArred(larg, 0.2, prof, 0.1, 2); lote.add(M(f, mOuro, xc, -0.12, zc, true, true));
    const f2 = blocoArred(larg - 0.16, 0.2, prof - 0.16, 0.06, 1); lote.add(M(f2, mOuroEsc, xc, -0.1, zc, false, true));
    for (let i = 0; i < BANCO; i++) {
      const x = xc + (i - (BANCO - 1) / 2) * PASSO;
      const g = blocoArred(PASSO - 0.08, 0.12, prof - 0.3, 0.04, 1);
      const pos = g.attributes.position, uv = g.attributes.uv; for (let k = 0; k < pos.count; k++) uv.setXY(k, pos.getX(k) / PASSO + 0.5, pos.getZ(k) / prof + 0.5);
      if (funcional) { const m = new THREE.Mesh(g, mat({ map: mPlancha.map, roughness: 0.8, emissive: '#000' })); m.position.set(x, -0.02, zc); m.receiveShadow = true; raiz.add(m); slotsBanco.push(m); }
      else lote.add(M(g, mPlancha, x, -0.02, zc, false, true));
    }
  };
  const zBanco = (ZDIV + ZBANCO) / 2;
  banco(zBanco, XBANCO, true);
  banco(-zBanco, -XBANCO, false);

  // ---- plataformas octogonais dos Governantes ----
  const plataforma = (x, z, cor) => {
    const g = new THREE.Group(); g.position.set(x, 0, z);
    g.add(M(new THREE.CylinderGeometry(1.42, 1.5, 0.3, 8), mPedraEsc, 0, -0.1, 0));
    g.add(M(new THREE.CylinderGeometry(1.25, 1.32, 0.42, 8), mPedra2, 0, 0.12, 0));
    g.add(M(new THREE.CylinderGeometry(1.12, 1.12, 0.06, 8), mBranco, 0, 0.35, 0));
    g.add(M(new THREE.TorusGeometry(0.85, 0.035, 4, 8).rotateX(Math.PI / 2), cor === 'azul' ? mAzul : mVerm, 0, 0.385, 0, false));
    g.rotation.y = Math.PI / 8;
    lote.add(g);
    return new THREE.Vector3(x, 0.38, z);
  };
  const xPlat = X0 + 0.15, zPlat = zBanco - 0.1;
  const platJogador = plataforma(xPlat, zPlat, 'azul');
  const platInimigo = plataforma(-xPlat, -zPlat, 'verm');

  // ---- prédios coloridos do castelo em volta ----
  const predio = (x, z, w, d, h, mParede, mTeto, rotY = 0) => {
    const g = new THREE.Group(); g.position.set(x, -0.2, z); g.rotation.y = rotY;
    const p = blocoArred(w, h, d, 0.08, 1); uvMetros(p, 0.5, 'auto'); g.add(M(p, mParede, 0, 0, 0));
    g.add(M(blocoArred(w + 0.2, 0.22, d + 0.2, 0.06, 1), mBranco, 0, h, 0));
    const n = Math.max(2, Math.round(w / 0.55));
    for (let i = 0; i < n; i++) g.add(M(blocoArred(0.32, 0.3, 0.32, 0.05, 1), mBranco, -w / 2 + 0.2 + i * (w - 0.4) / (n - 1), h + 0.22, d / 2 - 0.08));
    if (mTeto) { const t = M(new THREE.ConeGeometry(Math.max(w, d) * 0.62, h * 0.55, 4), mTeto, 0, h + 0.22 + h * 0.27, 0); t.rotation.y = Math.PI / 4; t.scale.z = d / w; g.add(t); }
    lote.add(g);
  };
  const tParA = texParede('#3f86e8'), tParV = texParede('#e2493d'), tParY = texParede('#f2c23a'), tParB = texParede('#efe9dc');
  const mParA = mat({ map: tParA }), mParV = mat({ map: tParV }), mParY = mat({ map: tParY }), mParB = mat({ map: tParB });
  const ladoX = XP + 1.3;
  const seqL = [[mParY, mVerm], [mParB, null], [mParV, mAmar], [mParY, null], [mParA, mVerm], [mParB, mAzul], [mParY, null]];
  const seqR = [[mParV, null], [mParY, mAzul], [mParB, null], [mParA, mAmar], [mParV, null], [mParY, mVerm], [mParB, mAzul]];
  const n = seqL.length, passo = (ZP * 2 + 2) / n;
  for (let i = 0; i < n; i++) {
    const z = -ZP - 1 + passo * (i + 0.5);
    predio(-ladoX - (i % 2) * 0.4, z, 2.0, passo - 0.1, 1.6 + (i % 3) * 0.5, seqL[i][0], seqL[i][1]);
    predio(ladoX + ((i + 1) % 2) * 0.4, z, 2.0, passo - 0.1, 1.6 + ((i + 1) % 3) * 0.5, seqR[i][0], seqR[i][1]);
  }
  // muralha com portão ao fundo e telhado azul à frente (atrás da sua loja)
  predio(-3.2, -ZP - 1.4, 4.5, 1.6, 2.0, mParY, null); predio(3.2, -ZP - 1.4, 4.5, 1.6, 2.0, mParY, null);
  predio(0, -ZP - 1.9, 2.0, 1.4, 2.8, mParV, mAmar);
  predio(-2.5, ZP + 1.6, 4.2, 1.8, 1.2, mParB, mAzul); predio(2.8, ZP + 1.6, 3.8, 1.8, 1.4, mParA, mAzul);
  // estandartes nas paredes
  const geoEst = new THREE.PlaneGeometry(0.55, 1.1, 1, 4); geoEst.translate(0, -0.55, 0);
  const estandarte = (x, z, cor, rotY) => {
    const m = new THREE.Mesh(geoEst, mat({ color: cor, side: THREE.DoubleSide, roughness: 0.7 }));
    m.position.set(x, 1.9, z); m.rotation.y = rotY; m.castShadow = true; raiz.add(m); animados.bandeiras.push(m);
  };
  for (let i = 0; i < 5; i++) {
    const z = -ZP + 0.6 + i * (ZP * 2 - 1.2) / 4;
    estandarte(-ladoX + 1.05, z, i % 2 ? AZUL : VERM, Math.PI / 2);
    estandarte(ladoX - 1.05, z, i % 2 ? VERM : AMAR, -Math.PI / 2);
  }
  // cordões de bandeirolas cruzando a arena (em cima e embaixo)
  const geoBand = new THREE.BufferGeometry(); geoBand.setAttribute('position', new THREE.Float32BufferAttribute([-0.16, 0, 0, 0.16, 0, 0, 0, -0.36, 0], 3)); geoBand.computeVertexNormals();
  const cordao = (z, y0, flecha) => {
    const pts = []; const x0 = -ladoX + 0.8, x1 = ladoX - 0.8;
    for (let i = 0; i <= 24; i++) { const k = i / 24; pts.push(new THREE.Vector3(x0 + (x1 - x0) * k, y0 - Math.sin(k * Math.PI) * flecha, z)); }
    const linha = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.015, 4), mMadEsc); raiz.add(linha);
    const cores = [mVerm, mAzul, mAmar, mat({ color: '#ffffff' })];
    for (let i = 1; i < 24; i++) { const b = new THREE.Mesh(geoBand, new THREE.MeshStandardMaterial({ color: cores[i % 4].color, side: THREE.DoubleSide, roughness: 0.8 })); b.position.copy(pts[i]); raiz.add(b); animados.bandeirolas.push(b); }
  };
  cordao(-ZP - 0.6, 3.4, 0.8);
  cordao(ZP + 0.5, 2.6, 0.6);

  // ---- cenário fora do castelo (palmeiras/rochas; trocáveis por GLB) ----
  const mCopa = ['#3d9e3c', '#4fb546', '#33903a'].map(c => mat({ color: c, roughness: 0.85 }));
  const mTronco = mat({ color: '#8a5a32' });
  const geoCopa = new THREE.IcosahedronGeometry(1, 1);
  const enfeites = { palmeira: [], pedra: [], arbusto: [] };
  const loteE = { palmeira: new Lote(), pedra: new Lote(), arbusto: new Lote() };
  const arvore = (x, z, s, tipo) => {
    const g = new THREE.Group(); g.position.set(x, -0.4, z); g.scale.setScalar(s);
    g.add(M(new THREE.CylinderGeometry(0.16, 0.24, 1.2, 7), mTronco, 0, 0.6, 0));
    const mc = mCopa[Math.floor(rnd() * mCopa.length)];
    for (const [bx, by, bz, br] of [[0, 1.65, 0, 0.88], [0.52, 1.35, 0.2, 0.62], [-0.46, 1.4, -0.1, 0.64], [0.05, 2.22, -0.05, 0.6]]) { const b = M(geoCopa, mc, bx, by, bz); b.scale.set(br, br * 0.9, br); g.add(b); }
    loteE[tipo].add(g, true); enfeites[tipo].push({ x, z, s, r: rnd() * 6, altura: (tipo === 'palmeira' ? 3.4 : 1.0) * s });
  };
  for (let i = 0; i < 16; i++) { const s = i % 2 ? 1 : -1; arvore(s * entre(ladoX + 2.2, ladoX + 4.5), entre(-ZP - 3, ZP + 3), entre(0.9, 1.3), 'palmeira'); }
  for (let i = 0; i < 14; i++) { const s = rnd() < 0.5 ? -1 : 1; arvore(s * entre(ladoX + 1.6, ladoX + 6), entre(-ZP - 4, ZP + 4), entre(0.5, 0.8), 'pedra'); }

  // ---- marcador de unidades no campo (👤 1/2) ----
  const txt = texTexto();
  const placa = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.81), new THREE.MeshBasicMaterial({ map: txt.t, transparent: true, depthWrite: false, opacity: 0.85 }));
  placa.rotation.x = -Math.PI / 2; placa.position.set(0, 0.03, -ZB * 0.55); placa.renderOrder = 3; placa.visible = false; raiz.add(placa);
  let txtAtual = '';
  function mostrarContagem(t) {
    if (!t) { placa.visible = false; return; }
    placa.visible = true; if (t === txtAtual) return; txtAtual = t;
    const g = txt.c.getContext('2d'); g.clearRect(0, 0, 512, 160);
    g.fillStyle = 'rgba(255,255,255,0.92)';
    // ícone de pessoa
    g.beginPath(); g.arc(120, 52, 26, 0, 7); g.fill(); g.beginPath(); g.roundRect(78, 84, 84, 56, [40, 40, 6, 6]); g.fill();
    g.font = 'bold 104px "Lilita One", sans-serif'; g.textBaseline = 'middle'; g.fillText(t, 190, 88);
    txt.t.needsUpdate = true;
  }

  lote.montar(raiz);
  const malhasEnfeite = {};
  for (const k in loteE) { const g = new THREE.Group(); raiz.add(g); loteE[k].montar(g); malhasEnfeite[k] = g; }

  // ---------------- troca por modelos GLB (só cenário) ----------------
  function normalizar(obj, altura, largura) {
    const o = obj.clone(true);
    o.traverse(m => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
    const caixa = new THREE.Box3().setFromObject(o), tam = caixa.getSize(new THREE.Vector3());
    const esc = Math.min(altura / Math.max(tam.y, 1e-4), largura ? largura / Math.max(tam.x, tam.z, 1e-4) : Infinity);
    o.scale.multiplyScalar(esc);
    const c2 = new THREE.Box3().setFromObject(o), centro = c2.getCenter(new THREE.Vector3());
    o.position.x -= centro.x; o.position.z -= centro.z; o.position.y -= c2.min.y;
    const g = new THREE.Group(); g.add(o); return g;
  }
  function cortarBase(g, frac) {
    const caixa = new THREE.Box3().setFromObject(g), corte = caixa.min.y + (caixa.max.y - caixa.min.y) * frac;
    g.updateMatrixWorld(true);
    g.traverse(m => {
      if (!m.isMesh || !m.geometry.index) return;
      const geo = m.geometry.clone(), p = geo.attributes.position, idx = geo.index.array, v = new THREE.Vector3(), novo = [];
      const y = i => v.fromBufferAttribute(p, i).applyMatrix4(m.matrixWorld).y;
      for (let i = 0; i < idx.length; i += 3) if ((y(idx[i]) + y(idx[i + 1]) + y(idx[i + 2])) / 3 > corte) novo.push(idx[i], idx[i + 1], idx[i + 2]);
      geo.setIndex(novo); m.geometry = geo;
    });
    g.position.y -= (corte - caixa.min.y) * 0.85; g.updateMatrixWorld(true);
  }
  function usarModelos(mapa) {
    const usados = [];
    for (const k of ['palmeira', 'pedra', 'arbusto']) {
      if (!mapa[k] || !enfeites[k].length) continue;
      malhasEnfeite[k].visible = false;
      const base = normalizar(mapa[k], 1, null); base.updateMatrixWorld(true);
      if (k === 'palmeira') cortarBase(base, 0.1);
      const lista = enfeites[k], mt = new THREE.Matrix4(), q = new THREE.Quaternion(), eixo = new THREE.Vector3(0, 1, 0);
      base.traverse(m => {
        if (!m.isMesh) return;
        const im = new THREE.InstancedMesh(m.geometry, m.material, lista.length);
        lista.forEach((e, i) => { q.setFromAxisAngle(eixo, e.r); mt.compose(new THREE.Vector3(e.x, -0.4, e.z), q, new THREE.Vector3(e.altura, e.altura, e.altura)); im.setMatrixAt(i, mt.multiply(m.matrixWorld)); });
        im.castShadow = false; im.receiveShadow = true; raiz.add(im);
      });
      usados.push(k);
    }
    return usados;
  }

  // ---------------- destaque ao arrastar ----------------
  function destacar(slot, arrastando) {
    for (const q of quadrados) q.malha.visible = false;
    for (const m of slotsBanco) m.material.emissive.set('#000');
    if (arrastando) for (const q of quadrados) if (q.jogador) { q.malha.visible = true; q.malha.material.opacity = 0.3; q.malha.material.color.set('#ffffff'); }
    if (!slot) return;
    if (slot.tipo === 'tab') { const q = quadrados.find(q => q.c === slot.c && q.l === slot.l); q.malha.visible = true; q.malha.material.opacity = 0.9; q.malha.material.color.set('#ffe14a'); }
    else slotsBanco[slot.i].material.emissive.set('#5a4a10');
  }
  function atualizar(tempo) {
    for (const b of animados.bandeiras) b.rotation.x = Math.sin(tempo * 2.4 + b.id) * 0.12;
    animados.bandeirolas.forEach((b, i) => { b.rotation.x = Math.sin(tempo * 3 + i * 0.7) * 0.3; });
  }
  return {
    quadrados, slotsBanco, atualizar, destacar, usarModelos, mostrarContagem,
    XW: X0 + 0.32, ZF: ZBANCO + 0.15, ZT: -ZBANCO - 0.15, XP, ZP,
    plataformas: { jogador: platJogador, inimigo: platInimigo },
    torresV: [], torresA: [],
  };
}

// sombra arredondada sob as unidades
let _blob;
export function blobSombra() {
  if (!_blob) _blob = { geo: new THREE.PlaneGeometry(1.35, 1.35).rotateX(-Math.PI / 2), mat: new THREE.MeshBasicMaterial({ map: texBlob(), transparent: true, opacity: 0.45, depthWrite: false, color: '#000' }) };
  const m = new THREE.Mesh(_blob.geo, _blob.mat); m.position.y = 0.05; m.renderOrder = 1; return m;
}
