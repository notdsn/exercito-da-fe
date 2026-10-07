// Habilidades especiais de cada unidade (disparadas quando a mana enche).
import * as THREE from 'three';
import {
  causarDano, curar, atordoar, buff, projetil, inimigosDe, aliadosDe, dist, maisProximo,
  animar, textoFlutuante, estado, Unidade, limitarPos, addTemp, tremer, moedaPop,
} from './main.js';

let scene, vfx, T;
export function iniciarHabilidades(ctx) { ({ scene, vfx, T } = ctx); }

const pos = u => u.root.position;
const naArea = (lista, centro, raio) => lista.filter(x => dist(x, centro) <= raio);
const porMaior = (lista, f) => lista.reduce((m, x) => (!m || f(x) > f(m) ? x : m), null);
const porMenor = (lista, f) => lista.reduce((m, x) => (!m || f(x) < f(m) ? x : m), null);
const atraso = (s, fn) => animar(s, null, fn);

function pedraMat() { return new THREE.MeshStandardMaterial({ color: '#9a9a9a', flatShading: true }); }

// teleporte/salto até perto de um alvo
function saltarPara(u, alvo, dur = 0.3, aoChegar) {
  const ini = pos(u).clone();
  const dir = ini.clone().sub(pos(alvo)).setY(0).normalize();
  const fim = limitarPos(pos(alvo).clone().addScaledVector(dir, 0.8));
  u.ocupado = dur + 0.05;
  vfx.tocar('smoke_plume', ini, { tamanho: 1.3, duracao: 0.8, opacidade: 0.7 });
  animar(dur, k => {
    pos(u).lerpVectors(ini, fim, k); u.corpo.position.y = Math.sin(k * Math.PI) * 1.0;
  }, () => { u.corpo.position.y = 0; aoChegar?.(); });
}

export const HABILIDADES = {
  // ---------------- HERÓIS ----------------
  davi(u) {
    const alvos = inimigosDe(u); if (!alvos.length) return;
    const golias = porMaior(alvos, x => x.maxHp);
    projetil(u, golias, {
      mat: pedraMat(), escala: 1.4, vel: 14, arco: 1.2, aoChegar: a => {
        const gig = a.def.gigante || a.gigante;
        causarDano(u, a, 230 * u.mult * (gig ? 2 : 1), { mostrar: true });
        if (gig) textoFlutuante(a, 'Gigante abatido!', 'hab');
        vfx.tocar('impact_fire', pos(a), { tamanho: 1.8, duracao: 0.6 });
        atordoar(a, 0.6);
      },
    });
  },
  jonatas(u) {
    const alvos = inimigosDe(u).sort((a, b) => dist(u, a) - dist(u, b)).slice(0, 3);
    alvos.forEach((a, i) => atraso(i * 0.12, () => projetil(u, a, {
      cor: '#ffb040', escala: 0.9, vel: 16, aoChegar: x => { causarDano(u, x, 105 * u.mult, { mostrar: true }); vfx.tocar('impact_fire', pos(x), { tamanho: 1, duracao: 0.4 }); },
    })));
    const davi = aliadosDe(u).find(x => x.id === 'davi');
    if (davi) { davi.mana += 40; vfx.tocar('golden_swirl', pos(davi), { tamanho: 1.6, duracao: 0.8 }); textoFlutuante(davi, 'Amizade! +40 mana', 'cura'); }
  },
  gideao(u) { tremer(0.25);
    const centro = pos(u).clone();
    for (let i = 0; i < 6; i++) {
      const ang = i / 6 * Math.PI * 2;
      const p = centro.clone().add(new THREE.Vector3(Math.cos(ang) * 1.6, 0, Math.sin(ang) * 1.6));
      vfx.tocar('flame_column', p, { tamanho: 1.3, duracao: 1.0, atraso: i * 0.05 });
    }
    vfx.tocar('energy_burst', centro, { tamanho: 2.6, duracao: 0.7, tint: [1.2, 0.7, 0.3] });
    for (const a of naArea(inimigosDe(u), centro, 2.4)) { causarDano(u, a, 110 * u.mult, { mostrar: true }); atordoar(a, 1.2); }
  },
  jael(u) {
    const alvo = porMenor(inimigosDe(u), x => x.hp); if (!alvo) return;
    saltarPara(u, alvo, 0.3, () => {
      vfx.tocar('fire_slash', pos(alvo), { tamanho: 1.8, duracao: 0.5, tint: [0.8, 0.7, 1.2] });
      causarDano(u, alvo, 280 * u.mult, { mostrar: true }); u.alvo = alvo;
    });
  },
  josue(u) { tremer(0.3);
    vfx.tocar('shockwave_fire', pos(u), { chao: true, tamanho: 6, duracao: 1.0, tint: [1.2, 1.0, 0.6] });
    vfx.tocar('arcane_burst', pos(u), { tamanho: 1.6, duracao: 0.7, tint: [1.2, 1.0, 0.5] });
    for (const a of naArea(inimigosDe(u), pos(u), 3.2)) {
      if (a.escudo > 0) textoFlutuante(a, 'Escudo quebrado!', 'roxo');
      a.escudo = 0; a.vulneravel = 5; causarDano(u, a, 120 * u.mult, { mostrar: true });
    }
  },
  ester(u) {
    const al = aliadosDe(u); const alvo = porMenor(al, x => x.hp / x.maxHp); if (!alvo) return;
    vfx.tocar('golden_swirl', pos(alvo), { tamanho: 2.4, duracao: 1.1 });
    curar(alvo, 280 * u.mult);
    for (const x of naArea(al, pos(alvo), 2.2)) if (x !== alvo) curar(x, 100 * u.mult);
  },
  debora(u) {
    for (const x of naArea(aliadosDe(u), pos(u), 3.4)) {
      buff(x, 'vel', 1.5, 5);
      vfx.tocar('arcane_swirl', pos(x), { tamanho: 1.6, duracao: 1.0, tint: [0.5, 1.3, 1.1], seguir: x.root });
    }
  },
  sansao(u, alvoAtual) {
    const alvo = alvoAtual?.vivo ? alvoAtual : maisProximo(u, inimigosDe(u)); if (!alvo) return;
    const ini = pos(u).clone(), fim = pos(alvo).clone();
    const dir = fim.clone().sub(ini).setY(0); const len = Math.max(1.2, dir.length() + 0.5); dir.normalize();
    const coluna = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, len, 8), new THREE.MeshStandardMaterial({ color: '#c8b898', flatShading: true }));
    coluna.geometry.translate(0, len / 2, 0); coluna.castShadow = true;
    const pivo = new THREE.Group(); pivo.position.copy(ini).addScaledVector(dir, -0.2); pivo.rotation.y = Math.atan2(dir.x, dir.z); pivo.add(coluna); addTemp(pivo);
    u.ocupado = 0.5;
    animar(0.5, k => { coluna.rotation.x = (k * k) * Math.PI / 2; }, () => {
      vfx.tocar('shockwave_fire', fim, { chao: true, tamanho: 4, duracao: 0.9 }); tremer(0.45);
      vfx.tocar('smoke_plume', fim, { tamanho: 2.2, duracao: 1.0 });
      for (const a of naArea(inimigosDe(u), fim, 1.9)) { causarDano(u, a, 200 * u.mult, { mostrar: true }); atordoar(a, 1.2); }
      animar(0.6, k => { coluna.position.y = -k * 0.5; coluna.material.opacity = 1 - k; coluna.material.transparent = true; }, () => scene.remove(pivo));
    });
  },
  samuel(u) {
    const al = aliadosDe(u).filter(x => x !== u);
    const alvo = porMaior(al.length ? al : [u], x => x.dano);
    buff(alvo, 'dano', 1.6, 6); alvo.mana += 50;
    vfx.tocar('golden_swirl', pos(alvo), { tamanho: 2.2, duracao: 1.2, seguir: alvo.root });
    vfx.tocar('arcane_burst', pos(u), { tamanho: 1.2, duracao: 0.6, tint: [1.2, 1, 0.5] });
    textoFlutuante(alvo, 'Ungido!', 'cura');
  },
  daniel(u) {
    vfx.tocar('arcane_burst', pos(u), { tamanho: 2.4, duracao: 0.9, tint: [1.3, 1.0, 0.4] });
    u.escudo += 220 * u.mult;
    for (const lado of [-1, 1]) {
      const leao = new Unidade('leao', u.estrelas, u.time);
      leao.invocada = true;
      leao.def = { ...leao.def, vida: leao.def.vida, dano: leao.def.dano };
      leao.maxHp = Math.round(380 * u.mult); leao.hp = leao.maxHp; leao.dano = 34 * u.mult; leao.vel = 1.0;
      leao.alcanceMundo = T + 0.2; leao.maxMana = 0; leao.mana = 0; leao.manaMult = 1; leao.velMov = 2.6;
      Object.assign(leao, { escudo: 0, roubo: 0, livramento: 0, reducao: 0, mult: u.mult, cd: 0.4, buffs: [], atordoado: 0, vulneravel: 0, estocada: 0, morto: false, ocupado: 0 });
      leao.root.position.copy(limitarPos(pos(u).clone().add(new THREE.Vector3(lado * 0.9, 0, 0))));
      vfx.tocar('golden_swirl', leao.root.position, { tamanho: 1.6, duracao: 0.8 });
      estado.combatentes.push(leao);
    }
  },
  jonas(u) {
    const alvos = inimigosDe(u); if (!alvos.length) return;
    const longe = porMaior(alvos, x => dist(u, x));
    const ini = pos(u).clone();
    const fim = limitarPos(pos(longe).clone().add(new THREE.Vector3(0, 0, u.time === 'jogador' ? -0.9 : 0.9)));
    // o grande peixe
    const peixe = new THREE.Group();
    const corpo = new THREE.Mesh(new THREE.IcosahedronGeometry(0.6, 1), new THREE.MeshStandardMaterial({ color: '#3a6a8a', flatShading: true }));
    corpo.scale.set(0.8, 0.7, 1.8); peixe.add(corpo);
    const cauda = new THREE.Mesh(new THREE.ConeGeometry(0.5, 0.6, 4), corpo.material); cauda.position.z = -1.2; cauda.rotation.x = -Math.PI / 2; cauda.scale.x = 0.2; peixe.add(cauda);
    peixe.position.copy(ini); addTemp(peixe);
    vfx.tocar('shockwave_plasma', ini, { chao: true, tamanho: 3, duracao: 0.8 });
    u.invisivel = true; u.root.visible = false;
    textoFlutuante(u, 'Engolido pelo grande peixe!', 'hab');
    animar(1.1, k => {
      peixe.position.lerpVectors(ini, fim, k); peixe.position.y = Math.sin(k * Math.PI) * 3.2;
      peixe.lookAt(fim.x, peixe.position.y + (k < 0.5 ? 1 : -1) * 1.5, fim.z);
    }, () => {
      scene.remove(peixe);
      u.root.position.copy(fim); u.root.visible = true; u.invisivel = false;
      vfx.tocar('shockwave_plasma', fim, { chao: true, tamanho: 4.4, duracao: 1.0 });
      vfx.tocar('frost_vapour', fim, { tamanho: 2.4, duracao: 1.0 });
      for (const a of naArea(inimigosDe(u), fim, 2.0)) causarDano(u, a, 150 * u.mult, { mostrar: true });
      curar(u, u.maxHp * 0.3);
    });
  },
  elias(u, alvoAtual) {
    const ini = inimigosDe(u); if (!ini.length) return;
    const principal = alvoAtual?.vivo ? alvoAtual : maisProximo(u, ini);
    const outros = ini.filter(x => x !== principal).sort((a, b) => dist(principal, a) - dist(principal, b)).slice(0, 2);
    [principal, ...outros].forEach((a, i) => {
      vfx.tocar('flame_column', pos(a), { tamanho: i ? 2.0 : 2.8, duracao: 1.1, atraso: i * 0.15, seguir: a.root });
      atraso(0.25 + i * 0.15, () => { if (!i) tremer(0.25); causarDano(u, a, (i ? 140 : 260) * u.mult, { mostrar: true }); vfx.tocar('ember_sparks', pos(a), { tamanho: 1.4, duracao: 0.7 }); });
    });
  },
  moises(u) { tremer(0.35);
    const x0 = pos(u).x, dirZ = u.time === 'jogador' ? -1 : 1;
    textoFlutuante(u, 'O mar se abre!', 'hab');
    vfx.tocar('shockwave_plasma', pos(u), { chao: true, tamanho: 3.5, duracao: 0.9 });
    for (let i = 0; i < 7; i++) for (const lado of [-1, 1]) {
      const p = new THREE.Vector3(x0 + lado * 0.95, 0, pos(u).z + dirZ * (0.6 + i * 1.15));
      vfx.tocar('frost_vapour', p, { tamanho: 2.0, largura: 1.2, duracao: 1.4, atraso: i * 0.07, tint: [0.6, 0.9, 1.3] });
    }
    for (const a of inimigosDe(u)) {
      const dx = pos(a).x - x0;
      if (Math.abs(dx) < 1.5 * T) {
        const alvoX = x0 + (dx >= 0 ? 1 : -1) * 2.0 * T;
        const ini = pos(a).x;
        animar(0.4, k => { pos(a).x = ini + (alvoX - ini) * k; limitarPos(pos(a)); });
        causarDano(u, a, 170 * u.mult, { mostrar: true }); atordoar(a, 0.7);
      }
    }
  },
  salomao(u, alvoAtual) {
    const alvo = alvoAtual?.vivo ? alvoAtual : maisProximo(u, inimigosDe(u)); if (!alvo) return;
    const c = pos(alvo).clone();
    vfx.tocar('arcane_portal', c, { chao: true, tamanho: 3.6, duracao: 1.2, tint: [1.2, 1.0, 0.6] });
    vfx.tocar('arcane_burst', c, { tamanho: 2.0, duracao: 0.8, tint: [1.2, 1.0, 0.5] });
    for (const a of naArea(inimigosDe(u), c, 1.9)) causarDano(u, a, a.maxHp * (0.15 + 0.05 * (u.estrelas - 1)) + 60 * u.mult, { mostrar: true });
    if (u.time === 'jogador' && estado.ouroSalomao < 2) { estado.ouroSalomao++; estado.ouro++; textoFlutuante(u, '+1 🪙', 'ouro'); moedaPop(1); }
  },
  noe(u) { tremer(0.15);
    for (const x of naArea(aliadosDe(u), pos(u), 3.0)) {
      x.escudo += 220 * u.mult;
      vfx.tocar('golden_swirl', pos(x), { tamanho: 1.6, duracao: 0.9, tint: [0.8, 1.1, 1.2], seguir: x.root });
    }
    // arco-íris da aliança
    const cores = ['#ff4040', '#ff9a30', '#ffe040', '#50d060', '#4080ff', '#8a50e0'];
    const arco = new THREE.Group();
    cores.forEach((c, i) => {
      const t = new THREE.Mesh(new THREE.TorusGeometry(1.4 - i * 0.09, 0.045, 6, 32, Math.PI), new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0, depthWrite: false }));
      arco.add(t);
    });
    arco.position.copy(pos(u)); arco.position.y = 0.2; arco.lookAt(camera_pos());
    addTemp(arco);
    // arca
    const arca = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.35, 0.6), new THREE.MeshStandardMaterial({ color: '#8a5a2a', flatShading: true, transparent: true, opacity: 0.85 }));
    arca.position.copy(pos(u)); arca.position.y = 2.2; addTemp(arca);
    animar(2.2, k => {
      arco.children.forEach(m => m.material.opacity = Math.sin(k * Math.PI) * 0.85);
      arca.position.y = 2.2 - Math.min(1, k * 2) * 1.6; arca.material.opacity = 0.85 * (1 - Math.max(0, k - 0.6) / 0.4);
    }, () => { scene.remove(arco); scene.remove(arca); });
    vfx.tocar('shockwave_plasma', pos(u), { chao: true, tamanho: 5, duracao: 1.0, tint: [0.9, 1.1, 1.2] });
  },
  miguel(u) {
    const alvo = porMaior(inimigosDe(u), x => x.dano); if (!alvo) return;
    vfx.tocar('lightning_bolt', pos(alvo), { tamanho: 3.4, duracao: 0.7, tint: [1.2, 1.1, 1.4] });
    atraso(0.15, () => {
      vfx.tocar('energy_burst', pos(alvo), { tamanho: 2.6, duracao: 0.7, tint: [1.2, 1.1, 0.8] }); tremer(0.3);
      causarDano(u, alvo, 320 * u.mult, { mostrar: true });
      for (const a of naArea(inimigosDe(u), pos(alvo), 1.7)) if (a !== alvo) causarDano(u, a, 120 * u.mult, { mostrar: true });
    });
  },

  // ---------------- TREVAS ----------------
  javali_besta(u) {
    const alvo = porMaior(inimigosDe(u), x => dist(u, x)); if (!alvo) return;
    const ini = pos(u).clone();
    const dir = pos(alvo).clone().sub(ini).setY(0).normalize();
    const fim = limitarPos(pos(alvo).clone().addScaledVector(dir, -0.75));
    u.ocupado = 0.4;
    vfx.tocar('smoke_plume', ini, { tamanho: 1.2, duracao: 0.7 });
    animar(0.35, k => pos(u).lerpVectors(ini, fim, k), () => {
      vfx.tocar('impact_fire', pos(alvo), { tamanho: 1.5, duracao: 0.5 });
      causarDano(u, alvo, 150 * u.mult, { mostrar: true }); atordoar(alvo, 1.0); u.alvo = alvo;
    });
  },
  orc(u) {
    buff(u, 'vel', 1.7, 4);
    vfx.tocar('ember_sparks', pos(u), { tamanho: 1.8, duracao: 0.9, tint: [1.4, 0.5, 0.4], seguir: u.root });
  },
  figura_sombria(u, alvoAtual) {
    const alvo = alvoAtual?.vivo ? alvoAtual : maisProximo(u, inimigosDe(u)); if (!alvo) return;
    const c = pos(alvo).clone();
    vfx.tocar('toxic_cloud', c, { tamanho: 2.4, duracao: 3.0, tint: [0.8, 0.6, 1.1] });
    for (let i = 1; i <= 6; i++) atraso(i * 0.5, () => { for (const a of naArea(inimigosDe(u), c, 1.4)) causarDano(u, a, 30 * u.mult); });
  },
  cavaleiro_trevas(u, alvoAtual) {
    const alvo = alvoAtual?.vivo ? alvoAtual : maisProximo(u, inimigosDe(u)); if (!alvo) return;
    vfx.tocar('fire_slash', pos(alvo), { tamanho: 2.0, duracao: 0.5, tint: [0.7, 0.5, 1.3] });
    const d = causarDano(u, alvo, 220 * u.mult, { mostrar: true });
    curar(u, d * 0.5);
  },
  leao_lobo(u) {
    const alvo = porMenor(inimigosDe(u), x => x.hp); if (!alvo) return;
    saltarPara(u, alvo, 0.3, () => {
      vfx.tocar('impact_fire', pos(alvo), { tamanho: 1.4, duracao: 0.5 });
      causarDano(u, alvo, 200 * u.mult, { mostrar: true }); u.alvo = alvo;
    });
  },
  elemental_fogo(u, alvoAtual) {
    const alvo = alvoAtual?.vivo ? alvoAtual : maisProximo(u, inimigosDe(u)); if (!alvo) return;
    vfx.tocar('explosion_fire', pos(alvo), { tamanho: 2.4, duracao: 0.9 });
    for (const a of naArea(inimigosDe(u), pos(alvo), 1.5)) causarDano(u, a, 180 * u.mult, { mostrar: true });
  },
  golem(u) { tremer(0.2);
    u.escudo += u.maxHp * 0.45;
    vfx.tocar('smoke_plume', pos(u), { tamanho: 2.2, duracao: 1.0 });
    vfx.tocar('shockwave_fire', pos(u), { chao: true, tamanho: 3.2, duracao: 0.8, tint: [0.7, 0.7, 0.8] });
    for (const a of naArea(inimigosDe(u), pos(u), 1.7)) atordoar(a, 1.0);
  },
  dragao(u, alvoAtual) {
    const alvo = alvoAtual?.vivo ? alvoAtual : maisProximo(u, inimigosDe(u)); if (!alvo) return;
    const ini = pos(u).clone(), fim = pos(alvo).clone();
    [0.4, 0.7, 1.0].forEach((f, i) => {
      const p = ini.clone().lerp(fim, f);
      vfx.tocar('explosion_fire', p, { tamanho: 1.8, duracao: 0.8, atraso: i * 0.15 });
      atraso(0.15 + i * 0.15, () => { for (const a of naArea(inimigosDe(u), p, 1.2)) causarDano(u, a, 120 * u.mult, { mostrar: true }); });
    });
  },
  golias(u) { tremer(0.4);
    vfx.tocar('shockwave_fire', pos(u), { chao: true, tamanho: 5, duracao: 1.0 });
    vfx.tocar('smoke_plume', pos(u), { tamanho: 2.4, duracao: 1.0 });
    for (const a of naArea(inimigosDe(u), pos(u), 2.3)) { causarDano(u, a, 190 * u.mult, { mostrar: true }); atordoar(a, 1.2); }
  },
  farao(u) {
    const alvos = inimigosDe(u).sort(() => Math.random() - 0.5).slice(0, 3);
    textoFlutuante(u, 'Pragas!', 'roxo');
    alvos.forEach((a, i) => {
      vfx.tocar('toxic_cloud', pos(a), { tamanho: 1.8, duracao: 1.5, atraso: i * 0.1, tint: [1.1, 0.9, 0.5], seguir: a.root });
      atraso(0.2 + i * 0.1, () => { causarDano(u, a, 130 * u.mult, { mostrar: true }); buff(a, 'dano', 0.7, 4); });
    });
  },
  leviata(u, alvoAtual) { tremer(0.4);
    const alvo = alvoAtual?.vivo ? alvoAtual : maisProximo(u, inimigosDe(u)); if (!alvo) return;
    const c = pos(alvo).clone();
    vfx.tocar('shockwave_plasma', c, { chao: true, tamanho: 5, duracao: 1.0 });
    vfx.tocar('frost_vapour', c, { tamanho: 3, duracao: 1.2 });
    for (const a of naArea(inimigosDe(u), c, 2.2)) {
      causarDano(u, a, 200 * u.mult, { mostrar: true });
      const dir = pos(a).clone().sub(pos(u)).setY(0).normalize();
      const ini = pos(a).clone(), fim = limitarPos(ini.clone().addScaledVector(dir, 1.4));
      animar(0.35, k => pos(a).lerpVectors(ini, fim, k));
    }
  },
  // ---------------- NOVOS (modelos da Tripo) ----------------
  balaao(u, alvoAtual) {
    const alvo = alvoAtual?.vivo ? alvoAtual : maisProximo(u, inimigosDe(u)); if (!alvo) return;
    vfx.tocar('toxic_cloud', pos(alvo), { tamanho: 2.0, duracao: 1.0, tint: [0.9, 0.6, 1.1] });
    for (const a of naArea(inimigosDe(u), pos(alvo), 1.6)) causarDano(u, a, 120 * u.mult, { mostrar: true });
    textoFlutuante(u, 'A maldição virou bênção!', 'cura');
    const feridos = aliadosDe(u).sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp).slice(0, 2);
    feridos.forEach((x, i) => atraso(0.3 + i * 0.15, () => { curar(x, 140 * u.mult); vfx.tocar('golden_swirl', pos(x), { tamanho: 1.6, duracao: 0.9, seguir: x.root }); }));
  },
  hama(u) {
    const alvo = porMaior(inimigosDe(u), x => x.hp); if (!alvo) return;
    buff(alvo, 'recebido', 1.4, 6);
    for (const x of aliadosDe(u)) x.alvo = alvo;
    vfx.tocar('arcane_portal', pos(alvo), { chao: true, tamanho: 2.0, duracao: 1.4, tint: [1.3, 0.4, 0.5], seguir: alvo.root });
    vfx.tocar('arcane_burst', pos(alvo), { tamanho: 1.4, duracao: 0.7, tint: [1.3, 0.4, 0.5] });
    textoFlutuante(alvo, 'Marcado pelo decreto!', 'roxo');
  },
  acabe(u) {
    const ini = inimigosDe(u); if (!ini.length) return;
    for (let i = 0; i < 5; i++) atraso(i * 0.1, () => {
      const vivos = inimigosDe(u); if (!vivos.length) return;
      const a = vivos[Math.floor(Math.random() * vivos.length)];
      projetil(u, a, { cor: '#ffb070', escala: 0.8, vel: 15, arco: 0.6, aoChegar: x => { causarDano(u, x, 85 * u.mult, { mostrar: true }); vfx.tocar('impact_fire', pos(x), { tamanho: 0.9, duracao: 0.4 }); } });
    });
  },
  dalila(u) {
    const alvo = porMaior(inimigosDe(u), x => x.dano); if (!alvo) return;
    vfx.tocar('fire_slash', pos(alvo), { tamanho: 1.8, duracao: 0.5, tint: [1.2, 0.5, 0.9] });
    buff(alvo, 'dano', 0.5, 5); buff(alvo, 'vel', 0.5, 5);
    if (alvo.id === 'sansao') { buff(alvo, 'semForca', 1, 6); atordoar(alvo, 2); textoFlutuante(alvo, 'Sansão perdeu a força!', 'roxo'); }
    else textoFlutuante(alvo, 'Enfraquecido!', 'roxo');
  },
  lami(u, alvoAtual) {
    const alvo = alvoAtual?.vivo ? alvoAtual : maisProximo(u, inimigosDe(u)); if (!alvo) return;
    const ini = pos(u).clone(), dir = pos(alvo).clone().sub(ini).setY(0).normalize();
    const fim = limitarPos(ini.clone().addScaledVector(dir, 12));
    const lanca = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 2.4, 6), new THREE.MeshStandardMaterial({ color: '#7a5a3a' }));
    lanca.rotation.order = 'YXZ'; lanca.rotation.y = Math.atan2(dir.x, dir.z); lanca.rotation.x = Math.PI / 2;
    addTemp(lanca);
    const atingidos = new Set();
    animar(0.5, k => {
      lanca.position.lerpVectors(ini, fim, k); lanca.position.y = 1.0;
      for (const a of inimigosDe(u)) if (!atingidos.has(a) && dist(a, lanca.position) < 0.8) {
        atingidos.add(a); causarDano(u, a, 170 * u.mult, { mostrar: true }); vfx.tocar('impact_fire', pos(a), { tamanho: 1.2, duracao: 0.5 });
      }
    }, () => { lanca.visible = false; });
    tremer(0.2);
  },
  gabriel(u) {
    tremer(0.2);
    vfx.tocar('energy_burst', pos(u), { tamanho: 3.0, duracao: 0.9, tint: [1.3, 1.2, 0.8] });
    vfx.tocar('shockwave_plasma', pos(u), { chao: true, tamanho: 6, duracao: 1.0, tint: [1.3, 1.2, 0.7] });
    textoFlutuante(u, 'Não temas!', 'hab');
    for (const a of inimigosDe(u)) { buff(a, 'recebido', 1.25, 5); vfx.tocar('arcane_burst', pos(a), { tamanho: 0.9, duracao: 0.6, tint: [1.3, 1.2, 0.6] }); }
    for (const x of aliadosDe(u)) if (x !== u) x.mana += 30;
  },
  herodes(u) {
    vfx.tocar('smoke_plume', pos(u), { tamanho: 2, duracao: 1.0 });
    for (const x of aliadosDe(u)) if (Math.abs(pos(x).z - pos(u).z) < T * 0.8) {
      x.escudo += 200 * u.mult; buff(x, 'dano', 1.25, 5);
      vfx.tocar('golden_swirl', pos(x), { tamanho: 1.5, duracao: 0.8, seguir: x.root });
      const muro = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.5, 0.25), new THREE.MeshStandardMaterial({ color: '#d9bf8f', flatShading: true }));
      muro.position.copy(pos(x)); muro.position.z += u.time === 'jogador' ? -0.55 : 0.55; addTemp(muro);
      animar(2.5, k => { muro.position.y = k < 0.15 ? -0.3 + k / 0.15 * 0.55 : k > 0.85 ? 0.25 - (k - 0.85) / 0.15 * 0.6 : 0.25; }, () => { muro.visible = false; });
    }
  },
  ninrode(u) {
    tremer(0.25);
    const c = pos(u).clone();
    const torre = new THREE.Group(); torre.position.copy(c);
    const pedra = new THREE.MeshStandardMaterial({ color: '#c8a878', flatShading: true });
    for (let i = 0; i < 5; i++) { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.55 - i * 0.09, 0.6 - i * 0.09, 0.45, 8), pedra); b.position.y = 0.22 + i * 0.45; b.castShadow = true; torre.add(b); }
    torre.position.x += u.time === 'jogador' ? 0.6 : -0.6;
    addTemp(torre);
    vfx.tocar('arcane_portal', c, { chao: true, tamanho: 5.2, duracao: 1.4, tint: [1.2, 0.9, 0.6] });
    animar(3.2, k => { torre.scale.y = k < 0.2 ? k / 0.2 : k > 0.8 ? Math.max(0.01, 1 - (k - 0.8) / 0.2) : 1; }, () => { torre.visible = false; });
    for (const a of naArea(inimigosDe(u), c, 2.6)) {
      buff(a, 'confuso', 1, 3); a.alvo = null;
      textoFlutuante(a, '?!', 'roxo');
    }
  },
};

let _cam = null;
export function definirCamera(c) { _cam = c; }
function camera_pos() { return _cam ? new THREE.Vector3(_cam.position.x, 0.2, _cam.position.z) : new THREE.Vector3(0, 0.2, 20); }
