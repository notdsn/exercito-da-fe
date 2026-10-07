// Animação procedural para modelos da Tripo sem animações (esqueleto estilo Mixamo).
// Os ossos são encontrados pelo nome; as rotações são dadas no espaço do modelo
// (X = esquerda do personagem, Y = cima, Z = frente) e convertidas para o espaço local.
import * as THREE from 'three';

const NOMES = {
  hips: /hips$/i, spine: /spine$/i, spine1: /spine1$/i, spine2: /spine2$/i, neck: /neck$/i, head: /head$/i,
  lArm: /leftarm$/i, lFore: /leftforearm$/i, rArm: /rightarm$/i, rFore: /rightforearm$/i,
  lUp: /leftupleg$/i, lLeg: /leftleg$/i, rUp: /rightupleg$/i, rLeg: /rightleg$/i,
};
const D = THREE.MathUtils.degToRad;
const _q = new THREE.Quaternion(), _qa = new THREE.Quaternion(), _qb = new THREE.Quaternion(), _e = new THREE.Euler();

export class Rig {
  static criar(raiz) {
    const ossos = {};
    raiz.traverse(o => {
      if (!o.isBone) return;
      const n = o.name.replace(/[^a-z0-9]/gi, '');
      for (const k in NOMES) if (!ossos[k] && NOMES[k].test(n)) ossos[k] = o;
    });
    if (!ossos.lArm || !ossos.rArm || !ossos.hips) return null;
    return new Rig(raiz, ossos);
  }
  constructor(raiz, ossos) {
    this.raiz = raiz; this.ossos = ossos;
    raiz.updateMatrixWorld(true);
    const qRaizInv = new THREE.Quaternion(); raiz.getWorldQuaternion(qRaizInv).invert();
    this.info = {};
    for (const k in ossos) {
      const b = ossos[k];
      const qp = new THREE.Quaternion(); b.parent.getWorldQuaternion(qp); qp.premultiply(qRaizInv); // pai no espaço do modelo
      this.info[k] = { rest: b.quaternion.clone(), qp, qpInv: qp.clone().invert() };
    }
    this.restHipsY = ossos.hips.position.y;
    this.t = Math.random() * 10;
    this.ataque = 0; this.conjuro = 0; this.susto = 0; this.lado = Math.random() < 0.5 ? 1 : -1;
    this.atualizar(0, false);
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
    const baixo = 72 * (1 - c) - 60 * c;   // c=1 => braços erguidos
    const balL = -passo * 22, balR = passo * 22;
    const golpeR = this.lado > 0 ? a : 0, golpeL = this.lado < 0 ? a : 0;
    this.girar('lArm', balL - golpeL * 95 + c * 20, 0, -baixo + 6 * resp * (1 - c));
    this.girar('rArm', balR - golpeR * 95 + c * 20, 0, baixo - 6 * resp * (1 - c));
    this.girar('lFore', 0, -20 - golpeL * 30 - (andando ? 15 : 0), 0);
    this.girar('rFore', 0, 20 + golpeR * 30 + (andando ? 15 : 0), 0);
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
