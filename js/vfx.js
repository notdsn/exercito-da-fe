// Sistema simples de efeitos "flipbook" (folhas 8x8 de quadros, 64 quadros).
import * as THREE from 'three';

// aditivo = brilho (magia, fogo); normal = fumaça/nuvem
export const EFEITOS = {
  flame_column: true, shockwave_fire: true, shockwave_plasma: true, arcane_bolt: true,
  arcane_burst: true, arcane_swirl: true, arcane_portal: true, energy_burst: true,
  lightning_bolt: true, fire_slash: true, impact_fire: true, explosion_fire: true,
  ember_sparks: true, golden_swirl: true, frost_vapour: true,
  smoke_plume: false, toxic_cloud: false,
};

const vert = `
varying vec2 vUv;
void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`;
const frag = `
uniform sampler2D map; uniform float frame; uniform vec2 grid; uniform float opacity; uniform vec3 tint;
varying vec2 vUv;
void main(){
  float f = floor(frame);
  float cx = mod(f, grid.x); float cy = floor(f / grid.x);
  vec2 uv = (clamp(vUv, 0.004, 0.996) + vec2(cx, grid.y - 1.0 - cy)) / grid;
  vec4 t = texture2D(map, uv);
  gl_FragColor = vec4(t.rgb * tint, t.a * opacity);
}`;

export class VFX {
  constructor(scene, camera, base = 'assets/vfx/') {
    this.scene = scene; this.camera = camera; this.base = base;
    this.tex = {}; this.ativos = [];
    this.loader = new THREE.TextureLoader();
    this.geo = new THREE.PlaneGeometry(1, 1);
  }
  textura(nome) {
    if (!this.tex[nome]) {
      const t = this.loader.load(this.base + nome + '.webp');
      t.colorSpace = THREE.SRGBColorSpace;
      t.generateMipmaps = false; t.minFilter = THREE.LinearFilter; t.magFilter = THREE.LinearFilter;
      this.tex[nome] = t;
    }
    return this.tex[nome];
  }
  precarregar() { Object.keys(EFEITOS).forEach(n => this.textura(n)); }

  // o: tamanho, largura, duracao(s), chao (deitado no chão), tint [r,g,b], seguir (Object3D), altura, atraso(s), opacidade
  tocar(nome, pos, o = {}) {
    if (!(nome in EFEITOS)) return null;
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        map: { value: this.textura(nome) }, frame: { value: 0 }, grid: { value: new THREE.Vector2(8, 8) },
        opacity: { value: o.opacidade ?? 1 }, tint: { value: new THREE.Color(...(o.tint || [1, 1, 1])) },
      },
      vertexShader: vert, fragmentShader: frag, transparent: true, depthWrite: false,
      blending: EFEITOS[nome] ? THREE.AdditiveBlending : THREE.NormalBlending, side: THREE.DoubleSide,
    });
    const m = new THREE.Mesh(this.geo, mat);
    const tam = o.tamanho || 1.5;
    m.scale.set(o.largura || tam, tam, 1);
    m.position.set(pos.x, pos.y || 0, pos.z);
    const altura = o.altura ?? tam * 0.45;
    if (o.chao) { m.rotation.x = -Math.PI / 2; m.position.y += 0.06; m.userData.chao = true; }
    else m.position.y += altura;
    m.renderOrder = 10;
    m.visible = !(o.atraso > 0);
    this.scene.add(m);
    const a = { m, t: -(o.atraso || 0), dur: o.duracao || 1.1, seguir: o.seguir || null };
    this.ativos.push(a);
    return a;
  }

  update(dt) {
    for (let i = this.ativos.length - 1; i >= 0; i--) {
      const a = this.ativos[i];
      a.t += dt;
      if (a.t < 0) continue;
      a.m.visible = true;
      const k = a.t / a.dur;
      if (k >= 1) { this.scene.remove(a.m); a.m.material.dispose(); this.ativos.splice(i, 1); continue; }
      a.m.material.uniforms.frame.value = Math.min(63, Math.floor(k * 64));
      if (a.seguir) { a.m.position.x = a.seguir.position.x; a.m.position.z = a.seguir.position.z; }
      if (!a.m.userData.chao) a.m.quaternion.copy(this.camera.quaternion);
    }
  }
  limpar() { for (const a of this.ativos) { this.scene.remove(a.m); a.m.material.dispose(); } this.ativos = []; }
}
