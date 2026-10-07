// Efeitos visuais leves: partículas instanciadas (atlas Kenney, CC0), folhas animadas (Unity Labs, CC0)
// e malhas procedurais (paredes de água, onda, feixes de luz). Tudo em uma ou duas chamadas de desenho.
import * as THREE from 'three';

// células do atlas assets/vfx/particulas.webp (8x8, 256 px)
export const SP = {
  anel: 0, anelGrosso: 1, brilho: 2, luz1: 3, luz2: 4, runa: 5, estrelaAnel: 6, cruzLuz: 7, estrela4: 8,
  estrela1: 9, estrela6: 10, estrela7: 11, estrela8: 12, estrela9: 13, raioNuvem: 14, raio: 15, raioV: 16,
  raioV2: 17, raioH: 18, chama1: 19, chama2: 20, labareda: 21, jato: 22, fogo1: 23, fogo2: 24,
  fumaca1: 25, fumaca4: 26, fumaca7: 27, anelFumaca1: 28, anelFumaca2: 29, terra1: 30, terra2: 31, terra3: 32,
  queimado: 33, queimado2: 34, corte1: 35, corte2: 36, corte3: 37, corte4: 38, arranhao: 39,
  giro1: 40, giro2: 41, giro3: 42, rastro1: 43, rastro2: 44, rastro3: 45, coracao: 46, reflexo: 47,
  anelSuave: 48, anel4: 49, fumaca5: 50, brilho2: 51, luz3: 52, explosaoLuz: 53, estrela4b: 54,
};
// folhas animadas: grade, quadros, aditivo
const FOLHAS = {
  explosao: { g: [5, 5], n: 25, add: false }, poeira: { g: [5, 5], n: 25, add: false },
  chama: { g: [16, 4], n: 64, add: false }, nuvem: { g: [8, 8], n: 64, add: false }, bola_fogo: { g: [8, 8], n: 64, add: true },
};

const rnd = (a, b) => a + Math.random() * (b - a);
const C = c => new THREE.Color(c);
const suave = k => k * k * (3 - 2 * k);

const vertPart = `
attribute vec3 iPos; attribute vec4 iP; attribute vec4 iCor; attribute vec3 iVel;
uniform float grade; varying vec2 vUv; varying vec4 vCor;
void main(){
  float cel = iP.z; vec2 c = vec2(mod(cel, grade), floor(cel / grade));
  vUv = (uv * 0.98 + 0.01 + vec2(c.x, grade - 1.0 - c.y)) / grade;
  vCor = iCor;
  float s = iP.x, r = iP.y, cr = cos(r), sr = sin(r);
  int modo = int(iP.w + 0.5);
  vec2 q = position.xy * vec2(1.0, modo == 3 ? 1.0 : iVel.x);
  q = vec2(q.x * cr - q.y * sr, q.x * sr + q.y * cr) * s;
  vec4 mv;
  if (modo == 1) { mv = viewMatrix * vec4(iPos + vec3(q.x, 0.0, -q.y), 1.0); }
  else if (modo == 2) {
    vec3 d = cameraPosition - iPos; d.y = 0.0; d = normalize(d + vec3(1e-5));
    mv = viewMatrix * vec4(iPos + vec3(d.z, 0.0, -d.x) * q.x + vec3(0.0, q.y, 0.0), 1.0);
  } else if (modo == 3) {
    vec4 c0 = viewMatrix * vec4(iPos, 1.0), c1 = viewMatrix * vec4(iPos + iVel, 1.0);
    vec2 d = c1.xy - c0.xy; float L = length(d); vec2 ax = L > 1e-4 ? d / L : vec2(0.0, 1.0); vec2 ay = vec2(ax.y, -ax.x);
    vec2 p = position.xy * s;
    mv = c0 + vec4(ax * p.y * (1.0 + L) + ay * p.x, 0.0, 0.0);
  } else { mv = viewMatrix * vec4(iPos, 1.0); mv.xy += q; }
  gl_Position = projectionMatrix * mv;
}`;
const fragPart = `
uniform sampler2D map; varying vec2 vUv; varying vec4 vCor;
void main(){
  vec4 t = texture2D(map, vUv); float a = t.a * vCor.a; if (a < 0.003) discard;
  gl_FragColor = linearToOutputTexel(vec4(t.rgb * vCor.rgb, a));
}`;

class Lote {
  constructor(scene, tex, aditivo, max) {
    this.max = max; this.lista = [];
    const base = new THREE.PlaneGeometry(1, 1);
    const g = new THREE.InstancedBufferGeometry();
    g.index = base.index; g.attributes.position = base.attributes.position; g.attributes.uv = base.attributes.uv;
    this.aPos = new THREE.InstancedBufferAttribute(new Float32Array(max * 3), 3).setUsage(THREE.DynamicDrawUsage);
    this.aP = new THREE.InstancedBufferAttribute(new Float32Array(max * 4), 4).setUsage(THREE.DynamicDrawUsage);
    this.aCor = new THREE.InstancedBufferAttribute(new Float32Array(max * 4), 4).setUsage(THREE.DynamicDrawUsage);
    this.aVel = new THREE.InstancedBufferAttribute(new Float32Array(max * 3), 3).setUsage(THREE.DynamicDrawUsage);
    g.setAttribute('iPos', this.aPos); g.setAttribute('iP', this.aP); g.setAttribute('iCor', this.aCor); g.setAttribute('iVel', this.aVel);
    g.instanceCount = 0;
    const m = new THREE.ShaderMaterial({
      uniforms: { map: { value: tex }, grade: { value: 8 } }, vertexShader: vertPart, fragmentShader: fragPart,
      transparent: true, depthWrite: false, blending: aditivo ? THREE.AdditiveBlending : THREE.NormalBlending,
    });
    this.malha = new THREE.Mesh(g, m); this.malha.frustumCulled = false; this.malha.renderOrder = aditivo ? 12 : 11;
    scene.add(this.malha); this.g = g;
  }
}

export class VFX {
  constructor(scene, camera, base = 'assets/vfx/', opc = {}) {
    this.scene = scene; this.camera = camera; this.base = base;
    this.q = opc.leve ? 0.6 : 1;               // fração de partículas (celular)
    this.loader = new THREE.TextureLoader();
    this.tex = {}; this.folhasAtivas = []; this.objetos = []; this.emissores = [];
    const atlas = this.textura('particulas', true);
    const max = opc.leve ? 900 : 1800;
    this.add = new Lote(scene, atlas, true, max); this.norm = new Lote(scene, atlas, false, Math.round(max * 0.6));
    this.geo = new THREE.PlaneGeometry(1, 1);
    this.tempo = 0; this.escala = 1.35;
  }
  textura(nome, mip) {
    if (!this.tex[nome]) {
      const t = this.loader.load(this.base + nome + '.webp');
      t.colorSpace = THREE.SRGBColorSpace;
      if (!mip) { t.generateMipmaps = false; t.minFilter = THREE.LinearFilter; }
      this.tex[nome] = t;
    }
    return this.tex[nome];
  }
  precarregar() { Object.keys(FOLHAS).forEach(n => this.textura(n)); }

  // ---------------- partícula ----------------
  // o: pos, vel, g(gravidade), arrasto, vida, tam, tam1, rot, vr, cel, cor, cor1, a, modo(0 tela,1 chão,2 vertical,3 esticada),
  //    asp, seguir(Object3D), fadeIn, fadeOut, add(aditivo), atraso, fn(p,dt)
  part(o) {
    const lote = o.add === false ? this.norm : this.add;
    if (lote.lista.length >= lote.max) return null;
    const cor = o.cor instanceof THREE.Color ? o.cor : C(o.cor || '#ffffff');
    const p = {
      x: o.pos.x, y: o.pos.y, z: o.pos.z, vx: o.vel?.x || 0, vy: o.vel?.y || 0, vz: o.vel?.z || 0,
      g: o.g || 0, arr: o.arrasto || 0, vida: o.vida || 0.6, t: -(o.atraso || 0), s0: o.tam ?? 0.5, s1: o.tam1 ?? o.tam ?? 0.5,
      rot: o.rot ?? Math.random() * 6.28, vr: o.vr || 0, cel: typeof o.cel === 'string' ? SP[o.cel] : (o.cel ?? SP.brilho),
      cor, cor1: o.cor1 ? C(o.cor1) : null, a: o.a ?? 1, modo: o.modo || 0, asp: o.asp || 1, seguir: o.seguir || null,
      fi: o.fadeIn ?? 0.08, fo: o.fadeOut ?? 0.55, fn: o.fn || null, est: o.esticar || 0.08,
    };
    lote.lista.push(p); return p;
  }
  // várias partículas com um gerador
  jorro(n, f) { n = Math.max(1, Math.round(n * this.q)); for (let i = 0; i < n; i++) { const o = f(i, n); if (o) this.part(o); } }

  // ---------------- folha animada (flipbook) ----------------
  folha(nome, pos, o = {}) {
    const F = FOLHAS[nome]; if (!F) return null;
    const mat = new THREE.ShaderMaterial({
      uniforms: { map: { value: this.textura(nome) }, frame: { value: 0 }, grid: { value: new THREE.Vector2(...F.g) }, opacity: { value: o.a ?? 1 }, tint: { value: C(o.cor || '#ffffff') } },
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `uniform sampler2D map; uniform float frame, opacity; uniform vec2 grid; uniform vec3 tint; varying vec2 vUv;
        void main(){ float f = floor(frame); vec2 c = vec2(mod(f, grid.x), floor(f / grid.x));
          vec4 t = texture2D(map, (clamp(vUv, 0.004, 0.996) + vec2(c.x, grid.y - 1.0 - c.y)) / grid);
          gl_FragColor = linearToOutputTexel(vec4(t.rgb * tint * ${(o.brilho ?? 1).toFixed(2)}, t.a * opacity)); }`,
      transparent: true, depthWrite: false, blending: F.add ? THREE.AdditiveBlending : THREE.NormalBlending, side: THREE.DoubleSide,
    });
    const m = new THREE.Mesh(this.geo, mat); const tam = o.tam || 1.5;
    m.scale.set(tam * (o.largura || 1), tam * (o.asp || 1), 1); m.position.set(pos.x, (pos.y || 0) + (o.chao ? 0.07 : (o.altura ?? tam * (o.asp || 1) * 0.45)), pos.z);
    if (o.chao) m.rotation.x = -Math.PI / 2;
    m.renderOrder = 10; m.visible = !(o.atraso > 0); this.scene.add(m);
    const a = { m, F, t: -(o.atraso || 0), dur: o.dur || 1, seguir: o.seguir || null, chao: !!o.chao, vertical: !!o.vertical, laco: !!o.laco, fade: o.fade ?? 0.15, a0: o.a ?? 1, alt: m.position.y - (pos.y || 0) };
    this.folhasAtivas.push(a); return a;
  }
  // objeto animado temporário: fn(k, obj, dt); removido e descartado ao final
  objeto(obj, dur, fn, atraso = 0) { obj.visible = atraso <= 0; this.scene.add(obj); this.objetos.push({ obj, t: -atraso, dur, fn }); fn?.(0, obj, 0); return obj; }
  // emissor: chama f(e, dt) a cada quadro durante dur
  emissor(dur, f, atraso = 0) { const e = { t: -atraso, dur, f, acc: 0 }; this.emissores.push(e); return e; }

  // =================================================================
  // BLOCOS DE EFEITO
  // =================================================================
  brilho(pos, cor = '#fff2b0', tam = 1.4, vida = 0.35, y = 0.9) {
    this.part({ pos: v3(pos, y), cel: SP.brilho, cor, tam: tam * 0.6, tam1: tam, vida, fadeIn: 0.02, fadeOut: 0.3 });
  }
  faiscas(pos, cor = '#ffd27a', n = 10, vel = 4, y = 0.9, tam = 0.22) {
    this.jorro(n, () => { const d = esfera(); return { pos: v3(pos, y), vel: d.multiplyScalar(rnd(0.5, 1) * vel), g: -9, arrasto: 2.5, vida: rnd(0.25, 0.5), cel: SP.rastro1, modo: 3, tam, cor, esticar: 0.06 }; });
  }
  anelChao(pos, cor = '#ffffff', r0 = 0.3, r1 = 2.5, vida = 0.5, cel = SP.anel, a = 1, add = true) {
    this.part({ pos: v3(pos, 0.08), modo: 1, cel, cor, tam: r0 * 2, tam1: r1 * 2, vida, a, fadeIn: 0.02, fadeOut: 0.35, add, rot: 0 });
  }
  marca(pos, tam = 1.6, vida = 2.5, cor = '#2a1a10', a = 0.55) {
    this.part({ pos: v3(pos, 0.06), modo: 1, cel: SP.queimado, cor, tam, vida, a, add: false, fadeIn: 0.02, fadeOut: 0.6 });
  }
  fumaca(pos, cor = '#d8d0c0', n = 8, tam = 1.0, raio = 0.5, sobe = 0.8, a = 0.7, vida = 1.0) {
    this.jorro(n, () => { const ang = Math.random() * 6.28, r = Math.random() * raio; return { pos: v3(pos, 0.35 + Math.random() * 0.4, Math.cos(ang) * r, Math.sin(ang) * r), vel: new THREE.Vector3(Math.cos(ang) * 0.8, sobe * rnd(0.5, 1.2), Math.sin(ang) * 0.8), arrasto: 2, vida: vida * rnd(0.7, 1.2), cel: [SP.fumaca1, SP.fumaca4, SP.fumaca7, SP.fumaca5][Math.floor(Math.random() * 4)], cor, a, tam: tam * 0.6, tam1: tam * 1.3, vr: rnd(-1, 1), add: false, fadeIn: 0.12, fadeOut: 0.45 }; });
  }
  detritos(pos, cor = '#8a6a44', n = 10, vel = 4.5) {
    this.jorro(n, () => { const a = Math.random() * 6.28; return { pos: v3(pos, 0.2), vel: new THREE.Vector3(Math.cos(a) * rnd(1, vel * 0.6), rnd(vel * 0.6, vel * 1.2), Math.sin(a) * rnd(1, vel * 0.6)), g: -14, vida: rnd(0.5, 0.8), cel: [SP.terra1, SP.terra2][Math.floor(Math.random() * 2)], cor, tam: rnd(0.25, 0.45), vr: rnd(-8, 8), add: false, fadeIn: 0.01, fadeOut: 0.75 }; });
  }
  subir(pos, cor, n = 10, raio = 0.5, alt = 1.8, cel = SP.estrela1, tam = 0.22, dur = 0.9, seguir = null) {
    this.jorro(n, () => { const a = Math.random() * 6.28, r = Math.sqrt(Math.random()) * raio; return { pos: seguir ? new THREE.Vector3(Math.cos(a) * r, 0.1 + Math.random() * 0.6, Math.sin(a) * r) : v3(pos, 0.1 + Math.random() * 0.6, Math.cos(a) * r, Math.sin(a) * r), seguir, vel: new THREE.Vector3(0, alt * rnd(0.6, 1.2), 0), arrasto: 0.8, vida: dur * rnd(0.6, 1.2), cel, cor, tam: tam * rnd(0.7, 1.3), atraso: Math.random() * 0.25, fadeIn: 0.15, fadeOut: 0.5 }; });
  }
  feixe(pos, cor = '#fff0a0', raio = 0.6, altura = 9, dur = 0.8, atraso = 0) {
    const mat = new THREE.ShaderMaterial({
      uniforms: { t: { value: 0 }, op: { value: 0 }, cor: { value: C(cor) } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      vertexShader: `varying vec2 vUv; varying vec3 vN, vV; void main(){ vUv = uv; vec4 mv = modelViewMatrix * vec4(position,1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `uniform float t, op; uniform vec3 cor; varying vec2 vUv; varying vec3 vN, vV;
        void main(){ float centro = pow(abs(dot(vN, vV)), 1.5); float faixa = 0.75 + 0.25 * sin(vUv.y * 24.0 - t * 18.0);
          float a = op * centro * faixa * smoothstep(0.0, 0.08, vUv.y) * (1.0 - smoothstep(0.55, 1.0, vUv.y));
          gl_FragColor = linearToOutputTexel(vec4(mix(cor, vec3(1.0), centro * 0.6) * a, a)); }`,
    });
    const g = new THREE.CylinderGeometry(raio, raio * 0.8, altura, 20, 1, true); g.translate(0, altura / 2, 0);
    const m = new THREE.Mesh(g, mat); m.position.set(pos.x, 0, pos.z); m.renderOrder = 13;
    this.objeto(m, dur, (k, o, dt) => { mat.uniforms.t.value += dt; mat.uniforms.op.value = Math.min(1, k * 8) * (1 - suave(Math.max(0, (k - 0.6) / 0.4))) * 1.4; o.scale.set(1 - k * 0.4, 1, 1 - k * 0.4); }, atraso);
  }

  // ---------------- efeitos compostos ----------------
  conjurar(pos, cor = '#ffe27a') {               // brilho de conjuração aos pés + subida
    this.anelChao(pos, cor, 0.3, 1.5, 0.55, SP.runa, 0.9);
    this.anelChao(pos, cor, 0.2, 1.2, 0.4, SP.anel, 0.8);
    this.subir(pos, cor, 8, 0.5, 2.2, SP.estrela1, 0.2, 0.7);
    this.brilho(pos, cor, 1.3, 0.3, 1.0);
  }
  explosao(pos, esc = 1, comMarca = true) {
    this.folha('explosao', pos, { tam: 2.4 * esc, dur: 0.85, altura: 0.9 * esc });
    this.brilho(pos, '#ffcf6a', 2.4 * esc, 0.25, 0.7);
    this.faiscas(pos, '#ffb040', 14, 6 * esc, 0.6);
    this.anelChao(pos, '#ffb060', 0.3, 1.8 * esc, 0.4, SP.anel4, 0.7);
    if (comMarca) this.marca(pos, 1.9 * esc);
  }
  onda(pos, r = 2.5, cor = '#e8d6b0', poeira = true) {  // onda de choque no chão
    this.anelChao(pos, '#fff4c0', 0.3, r, 0.45, SP.anelGrosso, 1);
    this.anelChao(pos, '#8a6a40', 0.3, r * 1.1, 0.8, SP.anelFumaca2, 0.85, false);
    this.part({ pos: v3(pos, 0.07), modo: 1, cel: SP.queimado2, cor: '#4a3420', tam: r * 0.6, tam1: r * 1.3, vida: 1.6, a: 0.6, add: false, fadeIn: 0.02, fadeOut: 0.5 });
    if (poeira) this.jorro(14, (i, n) => { const a = i / n * 6.28; return { pos: v3(pos, 0.3, Math.cos(a) * 0.4, Math.sin(a) * 0.4), vel: new THREE.Vector3(Math.cos(a) * r * 2.6, 0.6, Math.sin(a) * r * 2.6), arrasto: 4, vida: 0.75, cel: SP.fumaca4, cor, a: 0.9, tam: 0.6, tam1: 1.4, add: false, fadeOut: 0.4 }; });
    this.marca(pos, r * 0.9, 2, '#5a4630', 0.35);
  }
  respingo(pos, esc = 1) {
    this.jorro(18, () => { const a = Math.random() * 6.28, s = rnd(0.6, 1.5); return { pos: v3(pos, 0.15), vel: new THREE.Vector3(Math.cos(a) * s * 1.6 * esc, rnd(3, 6) * esc, Math.sin(a) * s * 1.6 * esc), g: -16, vida: rnd(0.45, 0.75), cel: SP.brilho, cor: '#bfe9ff', tam: rnd(0.14, 0.26) * esc, fadeOut: 0.7 }; });
    this.anelChao(pos, '#d8f4ff', 0.2, 1.4 * esc, 0.5, SP.anelGrosso, 0.9);
    this.anelChao(pos, '#7fd2ff', 0.2, 1.0 * esc, 0.7, SP.anelSuave, 0.6);
    this.part({ pos: v3(pos, 0.5 * esc), cel: SP.fumaca5, cor: '#e8f8ff', tam: 0.6 * esc, tam1: 1.8 * esc, vida: 0.6, a: 0.7, add: false });
  }
  nuvemToxica(pos, cor = '#9ad040', raio = 1.2, dur = 2.5) {
    this.emissor(dur, (e, dt) => {
      e.acc += dt * 10 * this.q; while (e.acc > 1) { e.acc--; const a = Math.random() * 6.28, r = Math.sqrt(Math.random()) * raio;
        this.part({ pos: v3(pos, rnd(0.2, 0.8), Math.cos(a) * r, Math.sin(a) * r), vel: new THREE.Vector3(rnd(-0.3, 0.3), rnd(0.15, 0.5), rnd(-0.3, 0.3)), vida: rnd(0.9, 1.4), cel: [SP.fumaca1, SP.fumaca7, SP.fumaca5][Math.floor(Math.random() * 3)], cor, a: 0.8, tam: 0.8, tam1: 1.5, vr: rnd(-0.6, 0.6), add: false, fadeIn: 0.25, fadeOut: 0.5 });
        if (Math.random() < 0.3) this.part({ pos: v3(pos, rnd(0.2, 1.0), Math.cos(a) * r, Math.sin(a) * r), vel: new THREE.Vector3(0, 0.4, 0), vida: 0.7, cel: SP.brilho, cor: '#d8ff70', tam: 0.12 }); }
    });
    this.anelChao(pos, cor, raio * 0.6, raio * 1.1, dur, SP.anelSuave, 0.5);
  }
  aura(obj, cor = '#ffe27a', dur = 4, cel = SP.estrela1) {  // aura de bônus que acompanha a unidade
    this.part({ pos: new THREE.Vector3(0, 0.09, 0), seguir: obj, modo: 1, cel: SP.anel4, cor, tam: 1.3, tam1: 1.5, vida: dur, a: 0.7, fadeIn: 0.05, fadeOut: 0.85, vr: 1.2 });
    this.emissor(dur, (e, dt) => {
      if (!obj.visible) return; e.acc += dt * 6 * this.q; while (e.acc > 1) { e.acc--; const a = Math.random() * 6.28;
        this.part({ pos: new THREE.Vector3(Math.cos(a) * 0.5, 0.15, Math.sin(a) * 0.5), seguir: obj, vel: new THREE.Vector3(0, rnd(1.2, 2), 0), vida: 0.7, cel, cor, tam: rnd(0.12, 0.22), fadeOut: 0.5 }); }
    });
  }
  escudo(obj, cor = '#9fd8ff', dur = 1.0) {
    this.part({ pos: new THREE.Vector3(0, 1.0, 0), seguir: obj, cel: SP.anelGrosso, cor, tam: 1.2, tam1: 2.1, vida: dur, a: 0.8, fadeIn: 0.1, fadeOut: 0.5 });
    this.part({ pos: new THREE.Vector3(0, 1.0, 0), seguir: obj, cel: SP.luz2, cor, tam: 1.9, tam1: 2.2, vida: dur * 0.8, a: 0.5 });
    this.subir(null, cor, 6, 0.6, 1.4, SP.estrela4, 0.25, 0.8, obj);
  }
  cura(obj, cor = '#8dff9a') {
    this.subir(null, cor, 10, 0.55, 1.6, SP.estrela4b, 0.24, 0.9, obj);
    this.part({ pos: new THREE.Vector3(0, 0.09, 0), seguir: obj, modo: 1, cel: SP.anelSuave, cor, tam: 0.5, tam1: 1.6, vida: 0.6, a: 0.8 });
  }
  atordoado(obj, dur = 1) {  // estrelinhas girando sobre a cabeça
    const alt = 2.1 * (obj.userData.escalaY || 1);
    for (let i = 0; i < 3; i++) this.part({ pos: new THREE.Vector3(0, alt, 0), seguir: obj, cel: SP.estrela6, cor: '#ffe060', tam: 0.28, vida: dur, fadeIn: 0.1, fadeOut: 0.8,
      fn: (p, dt) => { p.ang = (p.ang ?? i * 2.09) + dt * 6; p.ox = Math.cos(p.ang) * 0.38; p.oz = Math.sin(p.ang) * 0.38; p.oy = alt + Math.sin(p.ang * 2) * 0.05; } });
  }
  teleporte(pos, cor = '#b89cff') {
    this.fumaca(pos, '#7a6a90', 6, 0.9, 0.3, 1.0, 0.6, 0.7);
    this.part({ pos: v3(pos, 0.9), cel: SP.giro2, cor, tam: 0.6, tam1: 1.8, vida: 0.45, vr: 8 });
  }
  morte(pos, trevas) {
    this.fumaca(pos, trevas ? '#5a4a6a' : '#e8e0d0', 7, 1.0, 0.35, 0.9, 0.7, 0.9);
    this.subir(pos, trevas ? '#c080ff' : '#fff4c0', 6, 0.4, 1.6, SP.brilho, 0.16, 0.8);
  }
  fusao(pos) {                                  // explosão de luz da fusão
    this.part({ pos: v3(pos, 1.0), cel: SP.estrela9, cor: '#fff3b0', tam: 0.8, tam1: 4.2, vida: 0.6, fadeIn: 0.05, fadeOut: 0.4, vr: 1 });
    this.part({ pos: v3(pos, 1.0), cel: SP.luz1, cor: '#ffd860', tam: 1.0, tam1: 3.6, vida: 0.8, fadeIn: 0.05, fadeOut: 0.4, vr: -0.8 });
    this.part({ pos: v3(pos, 1.0), cel: SP.cruzLuz, cor: '#ffffff', tam: 1.4, tam1: 3.0, vida: 0.5, rot: 0, fadeIn: 0.05 });
    this.anelChao(pos, '#ffe27a', 0.3, 3.2, 0.7, SP.anelGrosso);
    this.anelChao(pos, '#ffffff', 0.3, 2.2, 0.5, SP.runa, 0.9);
    this.feixe(pos, '#ffe9a0', 0.55, 7, 0.9);
    this.jorro(22, () => { const d = esfera(); d.y = Math.abs(d.y) + 0.3; return { pos: v3(pos, 0.9), vel: d.multiplyScalar(rnd(2, 5)), g: -3, arrasto: 1.6, vida: rnd(0.6, 1.1), cel: SP.estrela1, cor: '#ffe27a', tam: rnd(0.18, 0.32), fadeOut: 0.5 }; });
  }
  compra(pos) { this.anelChao(pos, '#7fc8ff', 0.2, 1.3, 0.45, SP.anelGrosso, 0.9); this.subir(pos, '#a8dcff', 8, 0.45, 2, SP.estrela4, 0.2, 0.7); this.brilho(pos, '#bfe4ff', 1.4, 0.3, 0.9); }
  venda(pos) { this.subir(pos, '#ffd860', 12, 0.5, 2.4, SP.estrela1, 0.24, 0.8); this.part({ pos: v3(pos, 0.9), cel: SP.estrela9, cor: '#ffe27a', tam: 0.5, tam1: 1.6, vida: 0.4 }); }

  // ---------------- golpes básicos ----------------
  golpe(pos, estilo = 'corte', cor = '#fff2c0', dirY = 0) {
    const p = v3(pos, 0.95);
    if (estilo === 'garra') { this.part({ pos: p, cel: SP.arranhao, cor: '#ffffff', tam: 0.9, tam1: 1.1, vida: 0.22, rot: rnd(-0.6, 0.6), fadeIn: 0.01 }); this.faiscas(pos, '#ff9a7a', 4, 3, 0.95, 0.16); return; }
    if (estilo === 'pesado') { this.part({ pos: v3(pos, 0.6), cel: SP.estrela9, cor, tam: 0.6, tam1: 1.4, vida: 0.2 }); this.anelChao(pos, '#ffffff', 0.2, 1.0, 0.3, SP.anel, 0.7); this.detritos(pos, '#9a7a50', 4, 3); return; }
    this.part({ pos: p, cel: [SP.corte1, SP.corte2][Math.floor(Math.random() * 2)], cor, tam: 0.8, tam1: 1.1, vida: 0.2, rot: dirY + rnd(-1, 1), fadeIn: 0.01, fadeOut: 0.3 });
    this.part({ pos: p, cel: SP.estrela8, cor: '#ffffff', tam: 0.35, tam1: 0.6, vida: 0.12, fadeIn: 0.01 });
    this.faiscas(pos, cor, 4, 3, 0.95, 0.15);
  }
  // rastro do projétil (chamado a cada quadro) e impacto ao chegar
  rastro(estilo, p, cor) {
    const E = ESTILOS[estilo] || ESTILOS.magia;
    this.part({ pos: p.clone(), cel: E.cabeca, cor: cor || E.cor, tam: E.tam, vida: 0.06, fadeIn: 0, fadeOut: 0.5, rot: Math.random() * 6.28 });
    if (Math.random() < E.taxa * this.q) this.part({ pos: p.clone().add(new THREE.Vector3(rnd(-0.05, 0.05), rnd(-0.05, 0.05), rnd(-0.05, 0.05))), vel: new THREE.Vector3(0, E.sobe || 0, 0), cel: E.rastro, cor: E.cor2 || cor || E.cor, tam: E.tam * 0.8, tam1: E.tam * 0.2, vida: E.vida, add: E.addRastro !== false, a: E.a ?? 0.9, vr: rnd(-3, 3), fadeIn: 0 });
  }
  impacto(estilo, pos, esc = 1) {
    const E = ESTILOS[estilo] || ESTILOS.magia;
    if (estilo === 'fogo') { this.part({ pos: v3(pos, 0.8), cel: SP.labareda, cor: '#ffb040', tam: 0.6 * esc, tam1: 1.4 * esc, vida: 0.3 }); this.faiscas(pos, '#ffa040', 6, 3.5, 0.8, 0.18); this.fumaca(pos, '#6a5a50', 2, 0.6 * esc, 0.2, 0.8, 0.5, 0.6); return; }
    if (estilo === 'agua') { this.jorro(8, () => { const d = esfera(); d.y = Math.abs(d.y); return { pos: v3(pos, 0.8), vel: d.multiplyScalar(rnd(2, 3.5)), g: -10, vida: 0.4, cel: SP.brilho, cor: '#bfe9ff', tam: 0.15 }; }); this.part({ pos: v3(pos, 0.8), cel: SP.anelGrosso, cor: '#cfefff', tam: 0.3, tam1: 1.1 * esc, vida: 0.3 }); return; }
    if (estilo === 'pedra') { this.part({ pos: v3(pos, 0.8), cel: SP.estrela9, cor: '#fff0c0', tam: 0.4, tam1: 1.0 * esc, vida: 0.18 }); this.detritos(v3(pos, 0.5), '#a08a6a', 5, 3); return; }
    if (estilo === 'flecha') { this.part({ pos: v3(pos, 0.8), cel: SP.estrela8, cor: '#fff0c8', tam: 0.3, tam1: 0.8, vida: 0.15 }); this.faiscas(pos, '#ffe0a0', 3, 2.5, 0.8, 0.13); return; }
    this.part({ pos: v3(pos, 0.8), cel: SP.estrela9, cor: E.cor, tam: 0.4, tam1: 1.3 * esc, vida: 0.25 });
    this.part({ pos: v3(pos, 0.8), cel: SP.anel, cor: E.cor, tam: 0.2, tam1: 1.1 * esc, vida: 0.3, a: 0.8 });
    this.faiscas(pos, E.cor, 5, 3, 0.8, 0.15);
  }

  // ---------------- poderes especiais ----------------
  colunaFogo(pos, esc = 1, atraso = 0) {      // fogo do céu (Elias)
    this.feixe(pos, '#ffb040', 0.55 * esc, 10, 0.75, atraso);
    this.folha('chama', pos, { tam: 1.5 * esc, asp: 2.4, dur: 0.9, atraso: atraso + 0.08, altura: 1.6 * esc, vertical: true, brilho: 1.4 });
    const p0 = pos.clone();
    this.emissor(0.6, (e, dt) => { e.acc += dt * 40 * this.q; while (e.acc > 1) { e.acc--; const a = Math.random() * 6.28, r = Math.random() * 0.45 * esc;
      this.part({ pos: v3(p0, rnd(0, 0.4), Math.cos(a) * r, Math.sin(a) * r), vel: new THREE.Vector3(0, rnd(3, 6), 0), vida: rnd(0.3, 0.55), cel: [SP.chama1, SP.chama2, SP.fogo2][Math.floor(Math.random() * 3)], cor: '#ffc040', cor1: '#e8320a', tam: rnd(0.5, 0.8) * esc, tam1: 0.2, rot: rnd(-0.3, 0.3), fadeIn: 0.05, add: Math.random() < 0.4 }); } }, atraso + 0.05);
    this.emissor(0.01, () => { this.explosao(p0, 0.75 * esc); this.anelChao(p0, '#ffcf6a', 0.3, 2.2 * esc, 0.5, SP.anelGrosso); }, atraso + 0.12);
  }
  raioCeu(pos, cor = '#cfe0ff', atraso = 0) {  // relâmpago vertical
    this.part({ pos: v3(pos, 3.2), cel: SP.raioV, cor, tam: 1.6, asp: 4.4, modo: 2, vida: 0.32, atraso, fadeIn: 0.01, fadeOut: 0.3, rot: 0 });
    this.part({ pos: v3(pos, 3.2), cel: SP.raioV2, cor: '#ffffff', tam: 1.1, asp: 5.5, modo: 2, vida: 0.2, atraso: atraso + 0.05, fadeIn: 0.01, rot: 0 });
    this.part({ pos: v3(pos, 0.6), cel: SP.estrela9, cor, tam: 1.0, tam1: 2.8, vida: 0.3, atraso });
  }
  espadaLuz(pos, dirY = 0) {                 // golpe de espada sagrada (Miguel)
    this.feixe(pos, '#fff2b0', 0.7, 10, 0.7);
    this.part({ pos: v3(pos, 1.1), cel: SP.corte3, cor: '#fff6c8', tam: 1.0, tam1: 3.0, vida: 0.35, rot: dirY, fadeIn: 0.01 });
    this.part({ pos: v3(pos, 1.1), cel: SP.cruzLuz, cor: '#ffe27a', tam: 1.0, tam1: 3.6, vida: 0.55, rot: 0, fadeIn: 0.02 });
    this.part({ pos: v3(pos, 1.0), cel: SP.luz1, cor: '#ffffff', tam: 1.0, tam1: 4.0, vida: 0.45 });
    this.anelChao(pos, '#ffe9a0', 0.3, 3.4, 0.55, SP.anelGrosso);
    this.anelChao(pos, '#ffffff', 0.3, 2.4, 0.5, SP.runa, 0.8);
    this.jorro(18, () => { const d = esfera(); d.y = Math.abs(d.y); return { pos: v3(pos, 1), vel: d.multiplyScalar(rnd(3, 6)), arrasto: 2, vida: rnd(0.4, 0.8), cel: SP.rastro3, modo: 3, cor: '#fff2a0', tam: 0.3, esticar: 0.08 }; });
  }
  paredesAgua(origem, dir, comp = 8, larg = 1.0, dur = 1.6) {  // o mar se abre (Moisés)
    const ang = Math.atan2(dir.x, dir.z), H = 1.9;
    for (const lado of [-1, 1]) {
      // perfil (x = transversal, y = altura) da muralha, inclinada para fora; extrudado ao longo do corredor
      const f = new THREE.Shape(); const L = lado;
      f.moveTo(-0.55 * L, 0); f.quadraticCurveTo(-0.45 * L, H * 0.7, -0.05 * L, H); f.quadraticCurveTo(0.35 * L, H * 1.06, 0.5 * L, H * 0.8); f.quadraticCurveTo(0.6 * L, H * 0.4, 0.7 * L, 0); f.lineTo(-0.55 * L, 0);
      const g = new THREE.ExtrudeGeometry(f, { depth: comp, bevelEnabled: false, curveSegments: 10, steps: 12 });
      const p = g.attributes.position;
      for (let i = 0; i < p.count; i++) { const z = p.getZ(i) / comp, y = p.getY(i); const ponta = Math.min(1, Math.min(z, 1 - z) * 6); p.setY(i, y * (0.35 + 0.65 * ponta) + Math.sin(z * 25) * 0.05 * (y / H)); }
      g.computeVertexNormals();
      const mat = matAgua(false, H); const m = new THREE.Mesh(g, mat); m.renderOrder = 9;
      const grp = new THREE.Group(); grp.add(m); m.position.set(lado * larg, 0, 0.2);
      grp.position.set(origem.x, 0, origem.z); grp.rotation.y = ang;
      this.objeto(grp, dur, (k, o, dt) => {
        mat.uniforms.t.value += dt;
        const sobe = k < 0.18 ? suave(k / 0.18) : k > 0.75 ? 1 - suave((k - 0.75) / 0.25) : 1;
        o.scale.set(1, Math.max(0.01, sobe * (1 + Math.sin(k * 18) * 0.03)), 1); mat.uniforms.op.value = Math.min(1, sobe * 1.5);
      });
      const cx = origem.x + Math.cos(ang) * lado * larg, cz = origem.z - Math.sin(ang) * lado * larg;
      this.emissor(dur * 0.75, (e, dt) => { e.acc += dt * 26 * this.q; while (e.acc > 1) { e.acc--; const d = rnd(0.3, comp);
        this.part({ pos: new THREE.Vector3(cx + dir.x * d, H * 0.95, cz + dir.z * d), vel: new THREE.Vector3(rnd(-0.6, 0.6), rnd(0.8, 2), rnd(-0.6, 0.6)), g: -5, vida: 0.6, cel: SP.fumaca5, cor: '#f4fcff', a: 0.9, tam: 0.35, tam1: 0.7, add: false }); } }, 0.15);
    }
    this.respingo(origem, 1.3);
  }
  maremoto(origem, dir, larg = 6, dist = 6, dur = 1.3, cor = 'agua') {  // onda gigante (Leviatã / Jonas)
    const H = 2.4, f = new THREE.Shape();
    // perfil de uma onda quebrando (x = para frente, y = altura)
    f.moveTo(-1.9, 0); f.quadraticCurveTo(-0.8, 0.5, -0.2, H * 0.8); f.quadraticCurveTo(0.2, H * 1.05, 0.75, H * 0.85);
    f.quadraticCurveTo(1.0, H * 0.7, 0.75, H * 0.58); f.quadraticCurveTo(0.45, H * 0.6, 0.4, H * 0.4); f.quadraticCurveTo(0.45, 0.2, 0.9, 0); f.lineTo(-1.9, 0);
    const g = new THREE.ExtrudeGeometry(f, { depth: larg, bevelEnabled: false, curveSegments: 10, steps: 16 }); g.translate(0, 0, -larg / 2);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const z = p.getZ(i) / (larg / 2); p.setY(i, p.getY(i) * (1 - 0.65 * Math.pow(Math.abs(z), 3))); }
    g.computeVertexNormals();
    const mat = matAgua(cor === 'trevas', H); const m = new THREE.Mesh(g, mat); m.renderOrder = 9; m.rotation.y = Math.atan2(-dir.z, dir.x);
    const ini = origem.clone().addScaledVector(dir, 0.3); ini.y = 0;
    const lat = new THREE.Vector3(-dir.z, 0, dir.x);
    this.objeto(m, dur, (k, o, dt) => {
      mat.uniforms.t.value += dt;
      o.position.copy(ini).addScaledVector(dir, dist * suave(Math.min(1, k * 1.1)));
      const h = Math.sin(Math.min(1, k * 1.15) * Math.PI); o.scale.set(0.7 + 0.3 * h, Math.max(0.01, h), 1); mat.uniforms.op.value = Math.min(1, h * 2);
      if (Math.random() < 0.95 * this.q) for (let i = 0; i < 3; i++) { const q = rnd(-0.45, 0.45) * larg; this.part({ pos: o.position.clone().addScaledVector(lat, q).addScaledVector(dir, 0.6).setY(H * 0.9 * h), vel: new THREE.Vector3(dir.x * 2.5 + rnd(-0.5, 0.5), rnd(1, 2.5), dir.z * 2.5 + rnd(-0.5, 0.5)), g: -7, vida: 0.55, cel: SP.fumaca5, cor: '#f2fcff', a: 0.9, tam: 0.45, tam1: 1.0, add: false }); }
    });
  }
  gafanhotos(obj, dur = 2.2, n = 22) {        // nuvem de gafanhotos (praga do Egito)
    n = Math.round(n * this.q);
    for (let i = 0; i < n; i++) {
      const r = rnd(0.35, 0.9), h = rnd(0.5, 2.0), w = rnd(3, 6) * (Math.random() < 0.5 ? -1 : 1), f = Math.random() * 6.28;
      this.part({ pos: new THREE.Vector3(0, h, 0), seguir: obj, cel: SP.terra3, cor: i % 3 ? '#2a1c06' : '#5a4a10', tam: rnd(0.55, 0.85), vida: dur, a: 1, add: false, fadeIn: 0.1, fadeOut: 0.8, vr: 10,
        fn: (p, dt) => { p.ang = (p.ang ?? f) + w * dt; p.ox = Math.cos(p.ang) * r; p.oz = Math.sin(p.ang) * r; p.oy = h + Math.sin(p.ang * 3 + f) * 0.2; } });
    }
  }
  coracoes(de, para, cor = '#ff6fb0') {        // encanto de Dalila
    const a = v3(de, 1.3), b = v3(para, 1.3);
    this.jorro(8, (i) => ({ pos: a.clone(), atraso: i * 0.06, cel: SP.coracao, cor, tam: 0.75, tam1: 0.95, vida: 0.6, rot: 0, fadeIn: 0.1, fadeOut: 0.75, add: false,
      fn: (p) => { const k = Math.min(1, Math.max(0, p.t) / p.vida); p.x = a.x + (b.x - a.x) * k + Math.sin(k * 9 + i) * 0.25; p.y = a.y + (b.y - a.y) * k + Math.sin(k * Math.PI) * 0.8; p.z = a.z + (b.z - a.z) * k; } }));
    this.emissor(0.01, () => { this.part({ pos: b.clone(), cel: SP.giro1, cor, tam: 0.6, tam1: 2.0, vida: 0.6, vr: 6 }); this.jorro(8, () => { const d = esfera(); return { pos: b.clone(), vel: d.multiplyScalar(2), vida: 0.8, cel: SP.coracao, cor: '#ff7ab8', tam: 0.5, rot: 0, g: 1, add: false }; }); this.part({ pos: b.clone(), cel: SP.brilho, cor: '#ff70b0', tam: 1, tam1: 2.2, vida: 0.5 }); }, 0.5);
  }
  garras(pos, cor = '#ffd27a') {               // garras do leão (Daniel)
    for (let i = 0; i < 3; i++) this.part({ pos: v3(pos, 1.0 + i * 0.1, rnd(-0.2, 0.2), 0), cel: SP.arranhao, cor: i ? '#ffffff' : cor, tam: 1.1, tam1: 1.4, vida: 0.3, atraso: i * 0.09, rot: rnd(-0.7, 0.7), fadeIn: 0.01 });
  }
  rugido(pos, cor = '#ffcf6a') {               // rugido: anéis que se expandem + poeira
    for (let i = 0; i < 3; i++) this.part({ pos: v3(pos, 1.1), cel: SP.anelSuave, cor, tam: 0.6, tam1: 3.6, vida: 0.6, atraso: i * 0.12, a: 0.8 });
    this.onda(pos, 2.4, '#e6d0a0');
  }
  raiosDivinos(pos, cor = '#fff0a0') {         // luz sagrada com raios girando
    this.part({ pos: v3(pos, 1.2), cel: SP.luz2, cor, tam: 1.2, tam1: 3.2, vida: 0.8, vr: 1.5 });
    this.part({ pos: v3(pos, 1.2), cel: SP.estrela9, cor: '#ffffff', tam: 0.8, tam1: 2.4, vida: 0.5 });
  }

  // compatibilidade com nomes antigos
  tocar(nome, pos, o = {}) {
    const t = o.tamanho || 1.5;
    switch (nome) {
      case 'smoke_plume': return this.fumaca(pos, '#d8d0c0', 6, t * 0.7);
      case 'ember_sparks': return this.faiscas(pos, '#ffcf6a', 10, 3);
      case 'golden_swirl': return this.subir(pos, '#ffe27a', 12, 0.5, 2, SP.estrela1, 0.24, 0.9);
      case 'explosion_fire': return this.explosao(pos, t / 2.2);
      default: return this.brilho(pos, '#ffffff', t);
    }
  }

  // ---------------- atualização ----------------
  update(dt) {
    this.tempo += dt;
    for (let i = this.emissores.length - 1; i >= 0; i--) {
      const e = this.emissores[i]; e.t += dt; if (e.t < 0) continue;
      e.f(e, dt); if (e.t >= e.dur) this.emissores.splice(i, 1);
    }
    for (let i = this.objetos.length - 1; i >= 0; i--) {
      const a = this.objetos[i]; a.t += dt; if (a.t < 0) continue; a.obj.visible = true;
      const k = a.t / a.dur;
      if (k >= 1) { this.descartar(a.obj); this.objetos.splice(i, 1); continue; }
      a.fn?.(k, a.obj, dt);
    }
    for (let i = this.folhasAtivas.length - 1; i >= 0; i--) {
      const a = this.folhasAtivas[i]; a.t += dt; if (a.t < 0) continue;
      a.m.visible = true; const k = a.t / a.dur;
      if (k >= 1) { this.scene.remove(a.m); a.m.material.dispose(); this.folhasAtivas.splice(i, 1); continue; }
      a.m.material.uniforms.frame.value = Math.min(a.F.n - 1, Math.floor(k * a.F.n));
      a.m.material.uniforms.opacity.value = a.a0 * (1 - suave(Math.max(0, (k - (1 - a.fade)) / a.fade)));
      if (a.seguir) { a.m.position.x = a.seguir.position.x; a.m.position.z = a.seguir.position.z; }
      if (a.chao) continue;
      if (a.vertical) { a.m.rotation.set(0, Math.atan2(this.camera.position.x - a.m.position.x, this.camera.position.z - a.m.position.z), 0); }
      else a.m.quaternion.copy(this.camera.quaternion);
    }
    this.atualizarLote(this.add, dt); this.atualizarLote(this.norm, dt);
  }
  atualizarLote(L, dt) {
    const P = L.aPos.array, Q = L.aP.array, K = L.aCor.array, V = L.aVel.array;
    let n = 0; const lista = L.lista;
    for (let i = lista.length - 1; i >= 0; i--) {
      const p = lista[i]; p.t += dt;
      if (p.t >= p.vida || (p.seguir && !p.seguir.parent)) { lista[i] = lista[lista.length - 1]; lista.pop(); continue; }
      if (p.t < 0) continue;
      const k = p.t / p.vida;
      if (p.arr) { const f = Math.max(0, 1 - p.arr * dt); p.vx *= f; p.vy *= f; p.vz *= f; }
      p.vy += p.g * dt;
      if (p.fn) p.fn(p, dt);
      if (p.seguir) {
        if (p.ox === undefined) { p.ox = p.x; p.oy = p.y; p.oz = p.z; }
        if (!p.fn) { p.ox += p.vx * dt; p.oy += p.vy * dt; p.oz += p.vz * dt; }
        const s = p.seguir.position; p.x = s.x + p.ox; p.y = s.y + p.oy; p.z = s.z + p.oz;
      } else if (!p.fn || p.vx || p.vy || p.vz) { p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; }
      p.rot += p.vr * dt;
      const ek = 1 - (1 - k) * (1 - k);
      const s = (p.s0 + (p.s1 - p.s0) * ek) * (p.modo === 1 ? 1 : this.escala);
      let a = p.a * Math.min(1, p.fi > 0 ? k / p.fi : 1);
      if (k > p.fo) a *= 1 - (k - p.fo) / (1 - p.fo);
      let r = p.cor.r, g = p.cor.g, b = p.cor.b;
      if (p.cor1) { r += (p.cor1.r - r) * k; g += (p.cor1.g - g) * k; b += (p.cor1.b - b) * k; }
      if (n >= L.max) continue;
      P[n * 3] = p.x; P[n * 3 + 1] = p.y; P[n * 3 + 2] = p.z;
      Q[n * 4] = s; Q[n * 4 + 1] = p.rot; Q[n * 4 + 2] = p.cel; Q[n * 4 + 3] = p.modo;
      K[n * 4] = r; K[n * 4 + 1] = g; K[n * 4 + 2] = b; K[n * 4 + 3] = Math.max(0, a);
      if (p.modo === 3) { V[n * 3] = p.vx * p.est; V[n * 3 + 1] = p.vy * p.est; V[n * 3 + 2] = p.vz * p.est; } else { V[n * 3] = p.asp; V[n * 3 + 1] = 0; V[n * 3 + 2] = 0; }
      n++;
    }
    L.g.instanceCount = n;
    if (n) { for (const at of [L.aPos, L.aP, L.aCor, L.aVel]) { at.clearUpdateRanges(); at.addUpdateRange(0, n * at.itemSize); at.needsUpdate = true; } }
  }
  descartar(o) { this.scene.remove(o); o.traverse(m => { if (m.isMesh) { m.geometry.dispose(); m.material.dispose(); } }); }
  limpar() {
    for (const a of this.folhasAtivas) { this.scene.remove(a.m); a.m.material.dispose(); }
    for (const a of this.objetos) this.descartar(a.obj);
    this.folhasAtivas = []; this.objetos = []; this.emissores = []; this.add.lista = []; this.norm.lista = [];
    this.add.g.instanceCount = 0; this.norm.g.instanceCount = 0;
  }
}

// estilos de projétil
export const ESTILOS = {
  flecha: { cabeca: SP.rastro2, cor: '#fff3d0', tam: 0.32, rastro: SP.rastro1, taxa: 0.6, vida: 0.12, a: 0.6 },
  pedra: { cabeca: SP.brilho, cor: '#fff0c8', tam: 0.18, rastro: SP.fumaca4, cor2: '#d8c8a8', taxa: 0.5, vida: 0.25, addRastro: false, a: 0.5 },
  fogo: { cabeca: SP.labareda, cor: '#ffb040', tam: 0.55, rastro: SP.fogo2, cor2: '#ff6a20', taxa: 1, vida: 0.3, sobe: 0.6 },
  luz: { cabeca: SP.estrela9, cor: '#fff0a0', tam: 0.5, rastro: SP.estrela1, taxa: 0.9, vida: 0.3 },
  profecia: { cabeca: SP.estrela9, cor: '#8ff0e0', tam: 0.45, rastro: SP.brilho, taxa: 0.9, vida: 0.25 },
  agua: { cabeca: SP.brilho, cor: '#9fe0ff', tam: 0.42, rastro: SP.brilho, cor2: '#d8f4ff', taxa: 1, vida: 0.3 },
  sombra: { cabeca: SP.giro2, cor: '#c070ff', tam: 0.5, rastro: SP.fumaca1, cor2: '#3a1a5a', taxa: 1, vida: 0.35, addRastro: false, a: 0.6 },
  veneno: { cabeca: SP.brilho, cor: '#c8f060', tam: 0.45, rastro: SP.fumaca7, cor2: '#7a9a30', taxa: 1, vida: 0.35, addRastro: false, a: 0.6 },
  arcano: { cabeca: SP.estrela6, cor: '#d090ff', tam: 0.45, rastro: SP.brilho, taxa: 1, vida: 0.25 },
  sangue: { cabeca: SP.giro1, cor: '#ff5a5a', tam: 0.45, rastro: SP.brilho, cor2: '#a01a2a', taxa: 1, vida: 0.25 },
  ouro: { cabeca: SP.estrela6, cor: '#ffd860', tam: 0.42, rastro: SP.estrela1, taxa: 0.8, vida: 0.25 },
  magia: { cabeca: SP.brilho, cor: '#ffe28a', tam: 0.4, rastro: SP.brilho, taxa: 0.8, vida: 0.2 },
};

function v3(p, y = 0, dx = 0, dz = 0) { return new THREE.Vector3(p.x + dx, (p.y || 0) + y, p.z + dz); }
function esfera() { const u = Math.random() * 2 - 1, a = Math.random() * 6.28, s = Math.sqrt(1 - u * u); return new THREE.Vector3(s * Math.cos(a), u, s * Math.sin(a)); }

function matAgua(trevas, H = 2) {
  return new THREE.ShaderMaterial({
    uniforms: { t: { value: 0 }, op: { value: 1 } }, transparent: true, depthWrite: false, side: THREE.DoubleSide,
    vertexShader: `varying vec3 vP, vN, vV; void main(){ vP = position; vec4 mv = modelViewMatrix * vec4(position,1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform float t, op; varying vec3 vP, vN, vV;
      void main(){ float y = clamp(vP.y / ${H.toFixed(2)}, 0.0, 1.0), x = vP.x * 0.6 + vP.z;
        float s = sin(x * 6.0 + t * 7.0 + y * 6.0) * 0.5 + 0.5, s2 = sin(x * 2.7 - t * 4.0 + y * 13.0) * 0.5 + 0.5;
        vec3 fundo = ${trevas ? 'vec3(0.06,0.30,0.55)' : 'vec3(0.06,0.40,0.82)'}, claro = ${trevas ? 'vec3(0.30,0.62,0.80)' : 'vec3(0.38,0.84,1.0)'};
        vec3 c = mix(fundo, claro, y * 0.8 + s * 0.2);
        float risco = smoothstep(0.82, 0.96, fract(y * 3.5 - t * 1.8 + s2 * 0.35));
        float espuma = smoothstep(0.78, 0.92, y + s * 0.07);
        float fres = pow(1.0 - abs(dot(vN, vV)), 2.0);
        c = mix(c, vec3(1.0), clamp(espuma + risco * 0.3 + fres * 0.3, 0.0, 1.0));
        float a = op * (0.86 + espuma * 0.14);
        gl_FragColor = vec4(c, a); }`,
  });
}
