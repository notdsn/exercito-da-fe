// Animação procedural para modelos da Tripo sem animações (esqueleto estilo Mixamo).
// Os ossos são encontrados pelo nome; as rotações são dadas no espaço do modelo
// (X = esquerda do personagem, Y = cima, Z = frente) e convertidas para o espaço local.
import * as THREE from 'three';

const NOMES = {
  hips: /hips$/i, spine: /spine$/i, spine1: /spine1$/i, spine2: /spine2$/i, neck: /neck$/i, head: /head$/i,
  lArm: /leftarm$/i, lFore: /leftforearm$/i, rArm: /rightarm$/i, rFore: /rightforearm$/i,
  lHand: /lefthand$/i, rHand: /righthand$/i,
  lUp: /leftupleg$/i, lLeg: /leftleg$/i, rUp: /rightupleg$/i, rLeg: /rightleg$/i,
};
const D = THREE.MathUtils.degToRad;
const _q = new THREE.Quaternion(), _qa = new THREE.Quaternion(), _qb = new THREE.Quaternion(), _e = new THREE.Euler();

export class Rig {
  static criar(raiz, opcoes = {}) {
    const ossos = {};
    raiz.traverse(o => {
      if (!o.isBone) return;
      const n = o.name.replace(/[^a-z0-9]/gi, '');
      for (const k in NOMES) if (!ossos[k] && NOMES[k].test(n)) ossos[k] = o;
    });
    if (!ossos.lArm || !ossos.rArm || !ossos.hips) return null;
    return new Rig(raiz, ossos, opcoes);
  }
  constructor(raiz, ossos, opcoes = {}) {
    this.raiz = raiz; this.ossos = ossos;
    if (opcoes.chibi !== false) Rig.chibi(ossos);
    // Quanto baixar os braços: a animação supunha pose em "T"; muitos modelos da Tripo vêm em pose "A"
    // (braços já inclinados) ou com arma de duas mãos erguida. Baixar 72° nesses casos enfiava os braços
    // no corpo e torcia a malha (unidades "finas/espetadas"). Agora medimos o ângulo de cada braço.
    raiz.updateMatrixWorld(true);
    const inv = new THREE.Matrix4().copy(raiz.matrixWorld).invert();
    const anguloBraco = (a, f) => {
      if (!a || !f) return 0;
      const p0 = a.getWorldPosition(new THREE.Vector3()).applyMatrix4(inv), p1 = f.getWorldPosition(new THREE.Vector3()).applyMatrix4(inv);
      return THREE.MathUtils.radToDeg(Math.atan2(p0.y - p1.y, Math.hypot(p1.x - p0.x, p1.z - p0.z))); // >0 = abaixo da horizontal
    };
    const ang = (anguloBraco(ossos.lArm, ossos.lFore) + anguloBraco(ossos.rArm, ossos.rFore)) / 2;
    this.anguloBraco = ang; this.bracosFixos = opcoes.bracos === 0; // arma de duas mãos: braços ficam na pose original
    this.baixo0 = opcoes.bracos ?? (ang < -25 ? 0 : THREE.MathUtils.clamp(68 - ang, 0, 72));
    raiz.updateMatrixWorld(true);
    const qRaizInv = new THREE.Quaternion(); raiz.getWorldQuaternion(qRaizInv).invert();
    this.info = {};
    for (const k in ossos) {
      const b = ossos[k];
      const qp = new THREE.Quaternion(); b.parent.getWorldQuaternion(qp); qp.premultiply(qRaizInv); // pai no espaço do modelo
      this.info[k] = { rest: b.quaternion.clone(), qp, qpInv: qp.clone().invert() };
    }
    // cajado/cetro/lança em pé na mão (modelos em "T"): ao baixar o braço, a arma deitava (Moisés, Elias,
    // Jonas, Acabe...). Nessas mãos giramos o pulso ao contrário para a arma continuar em pé.
    this.armaEmPe = { l: Rig.armaVertical(raiz, ossos.lHand), r: Rig.armaVertical(raiz, ossos.rHand) };
    // modelos chibi da Tripo: pele refeita automaticamente; golpes muito abertos esticavam capas/asas/mangas
    this.amp = opcoes.chibi === false ? 0.5 : 1;
    this.restHipsY = ossos.hips.position.y;
    this.t = Math.random() * 10;
    this.ataque = 0; this.conjuro = 0; this.susto = 0; this.lado = Math.random() < 0.5 ? 1 : -1;
    this.atualizar(0, false);
  }
  // proporções "chibi" (tropas do Combinações Táticas): cabeça maior, tronco um pouco mais largo,
  // pernas mais curtas e grossas. Escala no eixo do osso (direção do filho) = comprimento.
  static chibi(ossos, k = { cabeca: 1.2, tronco: 1.04, pernaComp: 0.9, pernaGross: 1.08 }) {
    const eixoDe = b => {
      const f = b.children.find(c => c.isBone); if (!f) return 'y';
      const p = f.position, ax = Math.abs(p.x), ay = Math.abs(p.y), az = Math.abs(p.z);
      return ax > ay && ax > az ? 'x' : az > ay ? 'z' : 'y';
    };
    const esticar = (b, comp, gross) => {
      if (!b) return; const e = eixoDe(b);
      b.scale.set(gross, gross, gross); b.scale[e] = comp;
    };
    if (ossos.head) ossos.head.scale.setScalar(k.cabeca);
    if (ossos.spine) esticar(ossos.spine, 0.97, k.tronco);
    esticar(ossos.lUp, k.pernaComp, k.pernaGross); esticar(ossos.rUp, k.pernaComp, k.pernaGross);
    // compensa no osso filho para não "achatar" pés/canelas em dobro
    for (const b of [ossos.lLeg, ossos.rLeg]) if (b) { const e = eixoDe(b); b.scale.setScalar(1 / k.pernaGross); b.scale[e] = 1; }
  }
  // a mão segura algo comprido na vertical? (vértices presos ao osso da mão espalhados para cima/baixo)
  static armaVertical(raiz, mao) {
    if (!mao) return false;
    raiz.updateMatrixWorld(true);
    const inv = new THREE.Matrix4().copy(raiz.matrixWorld).invert(), v = new THREE.Vector3();
    const pm = mao.getWorldPosition(new THREE.Vector3()).applyMatrix4(inv);
    let hMin = Infinity, hMax = -Infinity; const ys = [];
    raiz.traverse(o => {
      if (!o.isSkinnedMesh) return;
      const j = o.skeleton.bones.indexOf(mao); const g = o.geometry, P = g.attributes.position, SI = g.attributes.skinIndex, SW = g.attributes.skinWeight;
      const m = new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld);
      for (let i = 0; i < P.count; i++) {
        v.fromBufferAttribute(P, i).applyMatrix4(m); hMin = Math.min(hMin, v.y); hMax = Math.max(hMax, v.y);
        if (j < 0 || !SI) continue;
        let best = 0, bj = -1; for (let c = 0; c < 4; c++) { const w = SW.getComponent(i, c); if (w > best) { best = w; bj = SI.getComponent(i, c); } }
        if (bj === j && best > 0.5) ys.push(v.x - pm.x, v.y - pm.y, v.z - pm.z);
      }
    });
    const H = hMax - hMin; if (!(H > 0)) return false;
    // haste acima da mão (cajado, cetro, lança): muitos vértices bem acima dela e perto na horizontal
    let acima = 0; const n = ys.length / 3;
    for (let i = 0; i < ys.length; i += 3) if (ys[i + 1] > 0.16 * H && Math.hypot(ys[i], ys[i + 2]) < 0.12 * H) acima++;
    return acima >= 150 && acima >= 0.25 * n;
  }
  girarQ(k, q) {
    const b = this.ossos[k]; if (!b) return; const i = this.info[k];
    b.quaternion.copy(i.qpInv).multiply(q).multiply(i.qp).multiply(i.rest);
  }
  // aplica rotação (euler XYZ em graus, espaço do modelo) por cima da pose de descanso
  girar(k, x, y, z) {
    const b = this.ossos[k]; if (!b) return;
    const i = this.info[k];
    _e.set(D(x), D(y), D(z), 'XYZ'); _q.setFromEuler(_e);
    // local' = qp^-1 * delta * qp * rest
    _qa.copy(i.qpInv).multiply(_q).multiply(i.qp).multiply(i.rest);
    b.quaternion.copy(_qa);
  }
  atacar() { this.ataque = 1; this.lado = -this.lado; }
  conjurar() { this.conjuro = 1; }
  sustar() { this.susto = 1; }

  atualizar(dt, andando) {
    this.t += dt * (andando ? 9 : 2.2);
    this.ataque = Math.max(0, this.ataque - dt * 3.2);
    this.conjuro = Math.max(0, this.conjuro - dt * 1.1);
    this.susto = Math.max(0, this.susto - dt * 5);
    const s = Math.sin(this.t), resp = Math.sin(this.t * 0.9);
    const passo = andando ? s : 0;
    // ataque: sobe e desce (0..1..0)
    const a = this.ataque > 0 ? Math.sin((1 - this.ataque) * Math.PI) : 0;
    const c = this.conjuro > 0 ? Math.min(1, Math.sin((1 - this.conjuro) * Math.PI) * 1.6) : 0;
    const f = this.susto;
    // tronco
    this.girar('spine', (andando ? 6 : 2 + resp * 1.5) - f * 14 + a * 10, a * 18 * this.lado, 0);
    this.girar('spine1', resp * 1.2 - c * 8, 0, 0);
    this.girar('head', -c * 12 + f * 8, 0, 0);
    // braços: T-pose -> relaxado (~72° para baixo), balanço ao andar, golpe, conjuro (para cima)
    const baixo = this.baixo0 * (1 - c) - Math.min(60, this.baixo0 + 20) * c * this.amp;   // c=1 => braços erguidos
    const balL = -passo * 22, balR = passo * 22;
    const golpeR = this.lado > 0 ? a : 0, golpeL = this.lado < 0 ? a : 0;
    if (!this.bracosFixos) {
    this.girar('lArm', balL - golpeL * 95 * this.amp + c * 20 * this.amp, 0, -baixo + 6 * resp * (1 - c));
    this.girar('rArm', balR - golpeR * 95 * this.amp + c * 20 * this.amp, 0, baixo - 6 * resp * (1 - c));
    this.girar('lFore', 0, -20 - golpeL * 30 - (andando ? 15 : 0), 0);
    this.girar('rFore', 0, 20 + golpeR * 30 + (andando ? 15 : 0), 0);
    // pulso: desfaz a descida do braço e a torção do antebraço (fica só o golpe) => arma continua em pé
    for (const [lado, k, sz, sy] of [['l', 'lHand', -1, -1], ['r', 'rHand', 1, 1]]) {
      if (!this.armaEmPe[lado]) continue;
      _e.set(0, 0, D(sz * (baixo - 6 * resp * (1 - c))), 'XYZ'); _qa.setFromEuler(_e);
      _e.set(0, D(sy * (20 + (andando ? 15 : 0))), 0, 'XYZ'); _qb.setFromEuler(_e);
      _qa.multiply(_qb).invert(); this.girarQ(k, _qa);
    }
    }
    // pernas
    this.girar('lUp', -passo * 28 - a * 8, 0, 0);
    this.girar('rUp', passo * 28 + a * 8, 0, 0);
    this.girar('lLeg', andando ? Math.max(0, s) * 35 : 0, 0, 0);
    this.girar('rLeg', andando ? Math.max(0, -s) * 35 : 0, 0, 0);
    // respiração / passo (sobe e desce os quadris)
    const h = this.ossos.hips;
    h.position.y = this.restHipsY * (1 + (andando ? Math.abs(s) * 0.03 : resp * 0.006) - c * 0.0);
  }
}
