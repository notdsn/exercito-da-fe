// Habilidades especiais de cada unidade (disparadas quando a mana enche), cada uma com um efeito
// visual próprio inspirado na história bíblica (fogo do céu, mar aberto, funda, pragas...).
import * as THREE from 'three';
import {
  causarDano, curar, atordoar, buff, projetil, inimigosDe, aliadosDe, dist, maisProximo,
  animar, textoFlutuante, estado, Unidade, limitarPos, addTemp, tremer, moedaPop, reposicionar, reservarTile,
} from './main.js';
import { SP } from './vfx.js';

let scene, vfx, T;
export function iniciarHabilidades(ctx) { ({ scene, vfx, T } = ctx); }

const pos = u => u.root.position;
const acima = (p, y = 1) => new THREE.Vector3(p.x, (p.y || 0) + y, p.z);
const naArea = (lista, centro, raio) => lista.filter(x => dist(x, centro) <= raio);
const porMaior = (lista, f) => lista.reduce((m, x) => (!m || f(x) > f(m) ? x : m), null);
const porMenor = (lista, f) => lista.reduce((m, x) => (!m || f(x) < f(m) ? x : m), null);
const atraso = (s, fn) => animar(s, null, fn);
const rnd = (a, b) => a + Math.random() * (b - a);

function pedraMat() { return new THREE.MeshStandardMaterial({ color: '#9a9a9a', flatShading: true }); }
const geoPedra = new THREE.DodecahedronGeometry(0.12, 0);

// teleporte/salto até perto de um alvo
function saltarPara(u, alvo, dur = 0.3, aoChegar, cor = '#b89cff') {
  vfx.teleporte(pos(u).clone(), cor);
  reposicionar(u, pos(alvo), dur, 1.0, () => { vfx.teleporte(pos(u).clone(), cor); aoChegar?.(); });
}
// poeira atrás de quem corre
function rastroPoeira(u, dur) {
  vfx.emissor(dur, (e, dt) => { e.acc += dt * 30; while (e.acc > 1) { e.acc--; vfx.part({ pos: acima(pos(u), 0.2).add(new THREE.Vector3(rnd(-0.3, 0.3), 0, rnd(-0.3, 0.3))), vel: new THREE.Vector3(0, 0.6, 0), vida: 0.6, cel: SP.fumaca4, cor: '#d8c49a', a: 0.6, tam: 0.5, tam1: 1.0, add: false }); } });
}

export const HABILIDADES = {
  // ---------------- HERÓIS ----------------
  davi(u) { // a funda: pedra girando, voa em arco e derruba gigantes
    const alvos = inimigosDe(u); if (!alvos.length) return;
    const golias = porMaior(alvos, x => x.maxHp);
    vfx.part({ pos: acima(pos(u), 1.9), cel: SP.giro3, cor: '#fff0c8', tam: 0.9, tam1: 1.2, vida: 0.35, vr: 18 });
    projetil(u, golias, {
      geo: geoPedra, mat: pedraMat(), escala: 1.3, vel: 14, arco: 1.4, estilo: 'pedra', semImpacto: true, aoChegar: a => {
        const gig = a.def.gigante || a.gigante;
        causarDano(u, a, 230 * u.mult * (gig ? 2 : 1), { mostrar: true });
        if (gig) { textoFlutuante(a, 'Gigante abatido!', 'hab'); tremer(0.3); }
        vfx.part({ pos: acima(pos(a), 1.5), cel: SP.estrela9, cor: '#fff3c0', tam: 0.6, tam1: gig ? 3 : 2, vida: 0.3 });
        vfx.part({ pos: acima(pos(a), 1.5), cel: SP.estrelaAnel, cor: '#ffe27a', tam: 0.5, tam1: 1.8, vida: 0.4 });
        vfx.detritos(acima(pos(a), 1.0), '#a89a80', 8, 3.5); vfx.anelChao(pos(a), '#ffffff', 0.2, 1.6, 0.4, SP.anel);
        atordoar(a, 0.6);
      },
    });
  },
  jonatas(u) { // flechas douradas + amizade com Davi
    const alvos = inimigosDe(u).sort((a, b) => dist(u, a) - dist(u, b)).slice(0, 3);
    alvos.forEach((a, i) => atraso(i * 0.12, () => projetil(u, a, {
      estilo: 'luz', cor: '#ffcf6a', vel: 16, arco: 0.4, aoChegar: x => { causarDano(u, x, 105 * u.mult, { mostrar: true }); vfx.faiscas(pos(x), '#ffd27a', 8, 4); },
    })));
    const davi = aliadosDe(u).find(x => x.id === 'davi');
    if (davi) { davi.mana += 40; vfx.aura(davi.root, '#ffe27a', 1.6); textoFlutuante(davi, 'Amizade! +40 mana', 'cura'); }
  },
  gideao(u) { tremer(0.25); // trombetas, cântaros quebrados e tochas acesas ao redor
    const centro = pos(u).clone();
    for (let i = 0; i < 6; i++) {
      const ang = i / 6 * Math.PI * 2;
      const p = centro.clone().add(new THREE.Vector3(Math.cos(ang) * 1.6, 0, Math.sin(ang) * 1.6));
      vfx.folha('chama', p, { tam: 0.8, asp: 2, dur: 0.9, atraso: i * 0.05, vertical: true, altura: 0.8, brilho: 1.3 });
      vfx.emissor(0.01, () => { vfx.detritos(p, '#b8743a', 4, 3); vfx.brilho(p, '#ffb040', 1.2, 0.3, 0.5); }, i * 0.05);
    }
    for (let i = 0; i < 3; i++) vfx.part({ pos: acima(centro, 1.2), cel: SP.anelSuave, cor: '#ffe9a0', tam: 0.6, tam1: 5, vida: 0.6, atraso: i * 0.12, a: 0.8 });
    vfx.anelChao(centro, '#ffb040', 0.4, 4.6, 0.6, SP.anelGrosso);
    for (const a of naArea(inimigosDe(u), centro, 2.4)) { causarDano(u, a, 110 * u.mult, { mostrar: true }); atordoar(a, 1.2); }
  },
  jael(u) { // golpe certeiro com a estaca
    const alvo = porMenor(inimigosDe(u), x => x.hp); if (!alvo) return;
    saltarPara(u, alvo, 0.3, () => {
      vfx.part({ pos: acima(pos(alvo), 1.0), cel: SP.corte4, cor: '#e8dcff', tam: 1.2, tam1: 2.4, vida: 0.3, rot: -0.8, fadeIn: 0.01 });
      vfx.part({ pos: acima(pos(alvo), 1.0), cel: SP.estrela8, cor: '#ffffff', tam: 0.6, tam1: 1.6, vida: 0.2 });
      vfx.faiscas(pos(alvo), '#d8c8ff', 12, 5);
      causarDano(u, alvo, 280 * u.mult, { mostrar: true }); u.alvo = alvo;
    }, '#a890ff');
  },
  josue(u) { tremer(0.3); // as muralhas de Jericó caem: ondas das trombetas
    for (let i = 0; i < 3; i++) vfx.part({ pos: acima(pos(u), 1.2), cel: SP.anelSuave, cor: '#ffe9a0', tam: 0.6, tam1: 6, vida: 0.7, atraso: i * 0.15, a: 0.85 });
    vfx.onda(pos(u), 3.2, '#e8d6b0');
    for (const a of naArea(inimigosDe(u), pos(u), 3.2)) {
      if (a.escudo > 0) { textoFlutuante(a, 'Escudo quebrado!', 'roxo'); vfx.part({ pos: acima(pos(a), 1), cel: SP.anelGrosso, cor: '#9fd8ff', tam: 1.6, tam1: 2.4, vida: 0.35 }); vfx.faiscas(pos(a), '#bfe8ff', 10, 4); }
      vfx.detritos(acima(pos(a), 1.6), '#c8b090', 6, 2);
      a.escudo = 0; a.vulneravel = 5; causarDano(u, a, 120 * u.mult, { mostrar: true });
    }
  },
  ester(u) { // intercessão: luz dourada que cura
    const al = aliadosDe(u); const alvo = porMenor(al, x => x.hp / x.maxHp); if (!alvo) return;
    vfx.feixe(pos(alvo), '#ffe9a0', 0.6, 9, 0.9);
    vfx.cura(alvo.root, '#ffe27a'); vfx.raiosDivinos(pos(alvo), '#fff0a0');
    curar(alvo, 280 * u.mult);
    for (const x of naArea(al, pos(alvo), 2.2)) if (x !== alvo) { curar(x, 100 * u.mult); vfx.cura(x.root, '#a8ffb0'); }
  },
  debora(u) { // cântico de vitória: velocidade para os aliados próximos
    vfx.anelChao(pos(u), '#7ff0d0', 0.4, 6.8, 0.7, SP.anelGrosso);
    for (const x of naArea(aliadosDe(u), pos(u), 3.4)) { buff(x, 'vel', 1.5, 5); vfx.aura(x.root, '#7ff0d0', 5, SP.estrela4); }
  },
  sansao(u, alvoAtual) { // derruba a coluna do templo
    const alvo = alvoAtual?.vivo ? alvoAtual : maisProximo(u, inimigosDe(u)); if (!alvo) return;
    const ini = pos(u).clone(), fim = pos(alvo).clone();
    const dir = fim.clone().sub(ini).setY(0); const len = Math.max(1.2, dir.length() + 0.5); dir.normalize();
    const coluna = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.28, len, 10), new THREE.MeshStandardMaterial({ color: '#d8c8a4', flatShading: true }));
    coluna.geometry.translate(0, len / 2, 0); coluna.castShadow = true;
    const capitel = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.22, 0.7), coluna.material); capitel.position.y = len; coluna.add(capitel);
    const pivo = new THREE.Group(); pivo.position.copy(ini).addScaledVector(dir, -0.2); pivo.rotation.y = Math.atan2(dir.x, dir.z); pivo.add(coluna); addTemp(pivo);
    u.ocupado = 0.5;
    animar(0.5, k => { coluna.rotation.x = (k * k) * Math.PI / 2; }, () => {
      tremer(0.45);
      vfx.onda(fim, 2.4, '#e0cca4'); vfx.folha('poeira', fim, { tam: 3, dur: 1.0, cor: '#f0dcb0', brilho: 1.8, a: 0.85 });
      vfx.detritos(fim, '#c8b490', 14, 5); vfx.marca(fim, 2.4, 2.5, '#4a3a2a', 0.45);
      for (const a of naArea(inimigosDe(u), fim, 1.9)) { causarDano(u, a, 200 * u.mult, { mostrar: true }); atordoar(a, 1.2); }
      animar(0.6, k => { coluna.position.y = -k * 0.5; coluna.material.opacity = 1 - k; coluna.material.transparent = true; }, () => scene.remove(pivo));
    });
  },
  samuel(u) { // unção com óleo: o escolhido brilha e fica mais forte
    const al = aliadosDe(u).filter(x => x !== u);
    const alvo = porMaior(al.length ? al : [u], x => x.dano);
    buff(alvo, 'dano', 1.6, 6); alvo.mana += 50;
    vfx.feixe(pos(alvo), '#ffd860', 0.55, 9, 0.8);
    vfx.jorro(14, () => ({ pos: acima(pos(alvo), 3 + Math.random()), vel: new THREE.Vector3(0, -6, 0), vida: 0.45, cel: SP.brilho, cor: '#ffd860', tam: 0.18, fadeOut: 0.8 }));
    vfx.aura(alvo.root, '#ffd860', 6);
    textoFlutuante(alvo, 'Ungido!', 'cura');
  },
  daniel(u) { // os leões: rugido, escudo e dois leões aliados
    vfx.rugido(pos(u), '#ffcf6a'); vfx.escudo(u.root, '#ffe27a', 1.2);
    u.escudo += 220 * u.mult;
    for (const lado of [-1, 1]) {
      const leao = new Unidade('leao', u.estrelas, u.time);
      leao.invocada = true;
      leao.def = { ...leao.def, vida: leao.def.vida, dano: leao.def.dano };
      leao.maxHp = Math.round(380 * u.mult); leao.hp = leao.maxHp; leao.dano = 34 * u.mult; leao.vel = 1.0;
      leao.alcanceMundo = T + 0.2; leao.maxMana = 0; leao.mana = 0; leao.manaMult = 1; leao.velMov = 2.6;
      Object.assign(leao, { escudo: 0, roubo: 0, livramento: 0, reducao: 0, mult: u.mult, cd: 0.4, buffs: [], atordoado: 0, vulneravel: 0, estocada: 0, morto: false, ocupado: 0 });
      const lugar = reservarTile(leao, pos(u).clone().add(new THREE.Vector3(lado * T, 0, 0)));
      if (!lugar) { leao.remover(); continue; }
      leao.root.position.copy(lugar);
      vfx.anelChao(lugar, '#ffcf6a', 0.3, 1.6, 0.6, SP.runa); vfx.subir(lugar, '#ffcf6a', 10, 0.5, 2.2, SP.estrela1, 0.22, 0.8); vfx.brilho(lugar, '#ffcf6a', 1.8, 0.3);
      estado.combatentes.push(leao);
    }
    const perto = maisProximo(u, inimigosDe(u)); if (perto) atraso(0.25, () => vfx.garras(pos(perto)));
  },
  jonas(u) { // engolido pelo grande peixe, cospe longe com um respingo
    const alvos = inimigosDe(u); if (!alvos.length) return;
    const longe = porMaior(alvos, x => dist(u, x));
    u.mov = null;
    const ini = pos(u).clone();
    const fim = reservarTile(u, pos(longe).clone().add(new THREE.Vector3(0, 0, u.time === 'jogador' ? -T : T))) || ini.clone();
    const peixe = new THREE.Group();
    const corpo = new THREE.Mesh(new THREE.IcosahedronGeometry(0.6, 1), new THREE.MeshStandardMaterial({ color: '#3a6a8a', flatShading: true }));
    corpo.scale.set(0.8, 0.7, 1.8); peixe.add(corpo);
    const cauda = new THREE.Mesh(new THREE.ConeGeometry(0.5, 0.6, 4), corpo.material); cauda.position.z = -1.2; cauda.rotation.x = -Math.PI / 2; cauda.scale.x = 0.2; peixe.add(cauda);
    peixe.position.copy(ini); addTemp(peixe);
    vfx.respingo(ini, 1.4);
    u.invisivel = true; u.root.visible = false;
    textoFlutuante(u, 'Engolido pelo grande peixe!', 'hab');
    vfx.emissor(1.1, (e, dt) => { e.acc += dt * 25; while (e.acc > 1) { e.acc--; vfx.part({ pos: peixe.position.clone(), vel: new THREE.Vector3(rnd(-0.5, 0.5), -1, rnd(-0.5, 0.5)), g: -6, vida: 0.5, cel: SP.brilho, cor: '#bfe9ff', tam: 0.16 }); } });
    animar(1.1, k => {
      peixe.position.lerpVectors(ini, fim, k); peixe.position.y = Math.sin(k * Math.PI) * 3.2;
      peixe.lookAt(fim.x, peixe.position.y + (k < 0.5 ? 1 : -1) * 1.5, fim.z);
    }, () => {
      scene.remove(peixe);
      u.root.position.copy(fim); u.root.visible = true; u.invisivel = false;
      vfx.respingo(fim, 1.8); vfx.anelChao(fim, '#9fe0ff', 0.3, 4.2, 0.6, SP.anelGrosso);
      for (const a of naArea(inimigosDe(u), fim, 2.0)) causarDano(u, a, 150 * u.mult, { mostrar: true });
      curar(u, u.maxHp * 0.3);
    });
  },
  elias(u, alvoAtual) { // fogo do céu
    const ini = inimigosDe(u); if (!ini.length) return;
    const principal = alvoAtual?.vivo ? alvoAtual : maisProximo(u, ini);
    const outros = ini.filter(x => x !== principal).sort((a, b) => dist(principal, a) - dist(principal, b)).slice(0, 2);
    vfx.part({ pos: acima(pos(u), 2.6), cel: SP.luz2, cor: '#ffb040', tam: 0.6, tam1: 2.2, vida: 0.5 });
    [principal, ...outros].forEach((a, i) => {
      vfx.colunaFogo(pos(a).clone(), i ? 0.8 : 1.1, i * 0.15);
      atraso(0.2 + i * 0.15, () => { if (!i) tremer(0.25); causarDano(u, a, (i ? 140 : 260) * u.mult, { mostrar: true }); });
    });
  },
  moises(u) { tremer(0.35); // o mar se abre: duas muralhas de água varrem o corredor
    const x0 = pos(u).x, dirZ = u.time === 'jogador' ? -1 : 1;
    textoFlutuante(u, 'O mar se abre!', 'hab');
    vfx.paredesAgua(pos(u).clone(), new THREE.Vector3(0, 0, dirZ), 8.5, 1.35, 1.7);
    vfx.part({ pos: acima(pos(u), 2.0), cel: SP.luz1, cor: '#9fe0ff', tam: 0.8, tam1: 2.6, vida: 0.6 });
    for (const a of inimigosDe(u)) {
      const dx = pos(a).x - x0;
      if (Math.abs(dx) < 1.5 * T) {
        const alvoX = x0 + (dx >= 0 ? 1 : -1) * 2.0 * T;
        reposicionar(a, new THREE.Vector3(alvoX, 0, pos(a).z), 0.4);
        atraso(0.35, () => vfx.respingo(pos(a), 1));
        causarDano(u, a, 170 * u.mult, { mostrar: true }); atordoar(a, 0.7);
      }
    }
  },
  salomao(u, alvoAtual) { // juízo sábio: círculo dourado de sabedoria
    const alvo = alvoAtual?.vivo ? alvoAtual : maisProximo(u, inimigosDe(u)); if (!alvo) return;
    const c = pos(alvo).clone();
    vfx.part({ pos: acima(c, 0.08), modo: 1, cel: SP.runa, cor: '#ffd860', tam: 1.0, tam1: 3.8, vida: 1.0, vr: 1.5, fadeOut: 0.6 });
    vfx.part({ pos: acima(c, 0.09), modo: 1, cel: SP.estrelaAnel, cor: '#fff0a0', tam: 3.4, tam1: 3.0, vida: 0.9, vr: -2 });
    vfx.feixe(c, '#ffd860', 0.95, 8, 0.8, 0.2);
    vfx.emissor(0.01, () => vfx.raiosDivinos(c, '#ffe27a'), 0.25);
    for (const a of naArea(inimigosDe(u), c, 1.9)) causarDano(u, a, a.maxHp * (0.15 + 0.05 * (u.estrelas - 1)) + 60 * u.mult, { mostrar: true });
    if (u.time === 'jogador' && estado.ouroSalomao < 2) { estado.ouroSalomao++; estado.ouro++; textoFlutuante(u, '+1 elixir', 'ouro'); moedaPop(1); vfx.venda(pos(u)); }
  },
  noe(u) { tremer(0.15); // a arca e o arco-íris da aliança protegem os aliados
    for (const x of naArea(aliadosDe(u), pos(u), 3.0)) { x.escudo += 220 * u.mult; vfx.escudo(x.root, '#9fd8ff', 1.2); }
    const cores = ['#ff4040', '#ff9a30', '#ffe040', '#50d060', '#4080ff', '#8a50e0'];
    const arco = new THREE.Group();
    cores.forEach((c, i) => {
      const t = new THREE.Mesh(new THREE.TorusGeometry(1.4 - i * 0.09, 0.05, 6, 32, Math.PI), new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0, depthWrite: false }));
      arco.add(t);
    });
    arco.position.copy(pos(u)); arco.position.y = 0.2; arco.lookAt(camera_pos());
    addTemp(arco);
    const arca = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.35, 0.6), new THREE.MeshStandardMaterial({ color: '#8a5a2a', flatShading: true, transparent: true, opacity: 0.9 }));
    arca.position.copy(pos(u)); arca.position.y = 2.2; addTemp(arca);
    animar(2.2, k => {
      arco.children.forEach(m => m.material.opacity = Math.sin(k * Math.PI) * 0.85);
      arca.position.y = 2.2 - Math.min(1, k * 2) * 1.6; arca.material.opacity = 0.9 * (1 - Math.max(0, k - 0.6) / 0.4);
    }, () => { scene.remove(arco); scene.remove(arca); });
    atraso(0.5, () => vfx.respingo(pos(u), 1.6));
    vfx.anelChao(pos(u), '#9fe0ff', 0.4, 6, 0.8, SP.anelGrosso);
  },
  miguel(u) { // a espada de luz do arcanjo
    const alvo = porMaior(inimigosDe(u), x => x.dano); if (!alvo) return;
    vfx.part({ pos: acima(pos(u), 2.2), cel: SP.cruzLuz, cor: '#fff2b0', tam: 0.6, tam1: 2.0, vida: 0.4, rot: 0 });
    atraso(0.15, () => {
      vfx.espadaLuz(pos(alvo).clone(), u.root.rotation.y); tremer(0.3);
      causarDano(u, alvo, 320 * u.mult, { mostrar: true });
      for (const a of naArea(inimigosDe(u), pos(alvo), 1.7)) if (a !== alvo) causarDano(u, a, 120 * u.mult, { mostrar: true });
    });
  },

  // ---------------- TREVAS ----------------
  javali_besta(u) { // investida
    const alvo = porMaior(inimigosDe(u), x => dist(u, x)); if (!alvo) return;
    rastroPoeira(u, 0.4);
    reposicionar(u, pos(alvo), 0.35, 0, () => {
      vfx.golpe(pos(alvo), 'pesado', '#ffd0a0'); vfx.onda(pos(alvo), 1.4, '#d8c49a', false);
      causarDano(u, alvo, 150 * u.mult, { mostrar: true }); atordoar(alvo, 1.0); u.alvo = alvo;
    });
  },
  orc(u) { // fúria
    buff(u, 'vel', 1.7, 4);
    vfx.part({ pos: acima(pos(u), 1.0), cel: SP.labareda, cor: '#ff5a3a', tam: 0.8, tam1: 2.2, vida: 0.4 });
    vfx.aura(u.root, '#ff5a3a', 4, SP.chama1);
  },
  figura_sombria(u, alvoAtual) { // névoa sombria que corrói
    const alvo = alvoAtual?.vivo ? alvoAtual : maisProximo(u, inimigosDe(u)); if (!alvo) return;
    const c = pos(alvo).clone();
    vfx.nuvemToxica(c, '#8a5ab0', 1.4, 3.0);
    vfx.part({ pos: acima(c, 0.08), modo: 1, cel: SP.runa, cor: '#b070ff', tam: 1, tam1: 2.8, vida: 3, vr: -1, a: 0.7, fadeOut: 0.8 });
    for (let i = 1; i <= 6; i++) atraso(i * 0.5, () => { for (const a of naArea(inimigosDe(u), c, 1.4)) causarDano(u, a, 30 * u.mult); });
  },
  cavaleiro_trevas(u, alvoAtual) { // corte sombrio que rouba vida
    const alvo = alvoAtual?.vivo ? alvoAtual : maisProximo(u, inimigosDe(u)); if (!alvo) return;
    vfx.part({ pos: acima(pos(alvo), 1.0), cel: SP.corte3, cor: '#b070ff', tam: 1.2, tam1: 2.6, vida: 0.35, rot: u.root.rotation.y, fadeIn: 0.01 });
    vfx.faiscas(pos(alvo), '#d090ff', 10, 4);
    const d = causarDano(u, alvo, 220 * u.mult, { mostrar: true });
    const a0 = acima(pos(alvo), 1.0), b0 = pos(u);
    vfx.jorro(10, i => ({ pos: a0.clone(), atraso: i * 0.03, cel: SP.brilho, cor: '#ff4a6a', tam: 0.22, vida: 0.45, fn: p => { const k = Math.max(0, p.t) / p.vida; p.x = a0.x + (b0.x - a0.x) * k + Math.sin(k * 7 + i) * 0.2; p.y = a0.y + Math.sin(k * Math.PI) * 0.6; p.z = a0.z + (b0.z - a0.z) * k; } }));
    curar(u, d * 0.5);
  },
  leao_lobo(u) { // bote
    const alvo = porMenor(inimigosDe(u), x => x.hp); if (!alvo) return;
    saltarPara(u, alvo, 0.3, () => {
      vfx.garras(pos(alvo), '#ff8a6a');
      causarDano(u, alvo, 200 * u.mult, { mostrar: true }); u.alvo = alvo;
    }, '#ff8a6a');
  },
  elemental_fogo(u, alvoAtual) { // bola de fogo
    const alvo = alvoAtual?.vivo ? alvoAtual : maisProximo(u, inimigosDe(u)); if (!alvo) return;
    projetil(u, alvo, { estilo: 'fogo', vel: 13, arco: 0.8, semImpacto: true, aoChegar: a => {
      vfx.explosao(pos(a), 1.1);
      for (const x of naArea(inimigosDe(u), pos(a), 1.5)) causarDano(u, x, 180 * u.mult, { mostrar: true });
    } });
  },
  golem(u) { tremer(0.2); // armadura de pedra
    u.escudo += u.maxHp * 0.45;
    vfx.escudo(u.root, '#d8c8a8', 1.3); vfx.onda(pos(u), 1.8, '#c8b490'); vfx.detritos(pos(u), '#9a8a70', 10, 4);
    for (const a of naArea(inimigosDe(u), pos(u), 1.7)) atordoar(a, 1.0);
  },
  dragao(u, alvoAtual) { // sopro de fogo
    const alvo = alvoAtual?.vivo ? alvoAtual : maisProximo(u, inimigosDe(u)); if (!alvo) return;
    const ini = pos(u).clone(), fim = pos(alvo).clone();
    const dir = fim.clone().sub(ini).setY(0).normalize();
    vfx.emissor(0.5, (e, dt) => { e.acc += dt * 50; while (e.acc > 1) { e.acc--; vfx.part({ pos: acima(ini, 1.4).addScaledVector(dir, 0.5), vel: dir.clone().multiplyScalar(rnd(6, 9)).add(new THREE.Vector3(rnd(-0.8, 0.8), rnd(-1.2, 0.2), rnd(-0.8, 0.8))), arrasto: 0.8, vida: rnd(0.4, 0.6), cel: [SP.fogo2, SP.chama1, SP.labareda][Math.floor(Math.random() * 3)], cor: '#ffd060', cor1: '#ff3a10', tam: 0.3, tam1: 1.3, vr: rnd(-3, 3) }); } });
    [0.4, 0.7, 1.0].forEach((f, i) => {
      const p = ini.clone().lerp(fim, f);
      vfx.emissor(0.01, () => vfx.explosao(p, 0.75), 0.15 + i * 0.12);
      atraso(0.15 + i * 0.15, () => { for (const a of naArea(inimigosDe(u), p, 1.2)) causarDano(u, a, 120 * u.mult, { mostrar: true }); });
    });
  },
  golias(u) { tremer(0.4); // pisão do gigante: onda de choque
    vfx.onda(pos(u), 2.8, '#d8c49a'); vfx.folha('poeira', pos(u), { tam: 3.4, dur: 1.0, cor: '#f0dcb0', brilho: 1.8, a: 0.8 });
    vfx.detritos(pos(u), '#9a7a50', 16, 6); vfx.marca(pos(u), 3, 3, '#3a2a1a', 0.5);
    for (const a of naArea(inimigosDe(u), pos(u), 2.3)) { causarDano(u, a, 190 * u.mult, { mostrar: true }); atordoar(a, 1.2); }
  },
  farao(u) { // pragas do Egito: gafanhotos e nuvem pestilenta
    const alvos = inimigosDe(u).sort(() => Math.random() - 0.5).slice(0, 3);
    textoFlutuante(u, 'Pragas!', 'roxo');
    alvos.forEach((a, i) => {
      vfx.gafanhotos(a.root, 2.2); vfx.nuvemToxica(pos(a).clone(), '#c8a830', 0.9, 1.6);
      atraso(0.2 + i * 0.1, () => { causarDano(u, a, 130 * u.mult, { mostrar: true }); buff(a, 'dano', 0.7, 4); });
    });
  },
  leviata(u, alvoAtual) { tremer(0.4); // maremoto
    const alvo = alvoAtual?.vivo ? alvoAtual : maisProximo(u, inimigosDe(u)); if (!alvo) return;
    const c = pos(alvo).clone();
    const dir = c.clone().sub(pos(u)).setY(0); const d = dir.length(); dir.normalize();
    vfx.maremoto(pos(u).clone(), dir, 4.6, d + 0.8, 1.2, 'trevas');
    atraso(0.45, () => vfx.respingo(c, 1.6));
    for (const a of naArea(inimigosDe(u), c, 2.2)) {
      causarDano(u, a, 200 * u.mult, { mostrar: true });
      const dd = pos(a).clone().sub(pos(u)).setY(0).normalize();
      reposicionar(a, pos(a).clone().addScaledVector(dd, 1.4), 0.35);
    }
  },
  // ---------------- NOVOS (modelos da Tripo) ----------------
  balaao(u, alvoAtual) { // a maldição virou bênção
    const alvo = alvoAtual?.vivo ? alvoAtual : maisProximo(u, inimigosDe(u)); if (!alvo) return;
    vfx.part({ pos: acima(pos(alvo), 1.0), cel: SP.giro2, cor: '#c070ff', tam: 0.8, tam1: 2.6, vida: 0.6, vr: -6 });
    vfx.impacto('arcano', pos(alvo), 1.6);
    for (const a of naArea(inimigosDe(u), pos(alvo), 1.6)) causarDano(u, a, 120 * u.mult, { mostrar: true });
    textoFlutuante(u, 'A maldição virou bênção!', 'cura');
    const feridos = aliadosDe(u).sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp).slice(0, 2);
    feridos.forEach((x, i) => atraso(0.3 + i * 0.15, () => { curar(x, 140 * u.mult); vfx.cura(x.root, '#ffe27a'); }));
  },
  hama(u) { // o decreto: alvo marcado
    const alvo = porMaior(inimigosDe(u), x => x.hp); if (!alvo) return;
    buff(alvo, 'recebido', 1.4, 6);
    for (const x of aliadosDe(u)) x.alvo = alvo;
    vfx.part({ pos: new THREE.Vector3(0, 0.1, 0), seguir: alvo.root, modo: 1, cel: SP.runa, cor: '#ff4a5a', tam: 1.6, vida: 6, vr: 1, a: 0.85, fadeIn: 0.05, fadeOut: 0.85 });
    vfx.part({ pos: new THREE.Vector3(0, 2.4, 0), seguir: alvo.root, cel: SP.estrelaAnel, cor: '#ff4a5a', tam: 0.55, vida: 6, rot: 0, fadeIn: 0.05, fadeOut: 0.85 });
    vfx.impacto('sangue', pos(alvo), 1.4);
    textoFlutuante(alvo, 'Marcado pelo decreto!', 'roxo');
  },
  acabe(u) { // chuva de flechas
    const ini = inimigosDe(u); if (!ini.length) return;
    for (let i = 0; i < 5; i++) atraso(i * 0.1, () => {
      const vivos = inimigosDe(u); if (!vivos.length) return;
      const a = vivos[Math.floor(Math.random() * vivos.length)];
      projetil(u, a, { estilo: 'flecha', vel: 15, arco: 1.0, aoChegar: x => { causarDano(u, x, 85 * u.mult, { mostrar: true }); } });
    });
  },
  dalila(u) { // encanto que tira a força
    const alvo = porMaior(inimigosDe(u), x => x.dano); if (!alvo) return;
    vfx.coracoes(pos(u), pos(alvo));
    buff(alvo, 'dano', 0.5, 5); buff(alvo, 'vel', 0.5, 5);
    if (alvo.id === 'sansao') { buff(alvo, 'semForca', 1, 6); atordoar(alvo, 2); textoFlutuante(alvo, 'Sansão perdeu a força!', 'roxo'); }
    else textoFlutuante(alvo, 'Enfraquecido!', 'roxo');
  },
  lami(u, alvoAtual) { // a lança do gigante atravessa a fila
    const alvo = alvoAtual?.vivo ? alvoAtual : maisProximo(u, inimigosDe(u)); if (!alvo) return;
    const ini = pos(u).clone(), dir = pos(alvo).clone().sub(ini).setY(0).normalize();
    const fim = limitarPos(ini.clone().addScaledVector(dir, 12));
    const lanca = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 2.4, 6), new THREE.MeshStandardMaterial({ color: '#7a5a3a' }));
    lanca.rotation.order = 'YXZ'; lanca.rotation.y = Math.atan2(dir.x, dir.z); lanca.rotation.x = Math.PI / 2;
    addTemp(lanca);
    const atingidos = new Set();
    animar(0.5, k => {
      lanca.position.lerpVectors(ini, fim, k); lanca.position.y = 1.0;
      vfx.part({ pos: lanca.position.clone(), vel: dir.clone().multiplyScalar(-2), cel: SP.rastro3, modo: 3, cor: '#ffe0b0', tam: 0.4, vida: 0.2, esticar: 0.3 });
      for (const a of inimigosDe(u)) if (!atingidos.has(a) && dist(a, lanca.position) < 0.8) {
        atingidos.add(a); causarDano(u, a, 170 * u.mult, { mostrar: true }); vfx.golpe(pos(a), 'pesado', '#ffe0b0');
      }
    }, () => { lanca.visible = false; vfx.detritos(fim, '#9a7a50', 6, 3); });
    tremer(0.2);
  },
  gabriel(u) { // o anúncio: "Não temas!"
    tremer(0.2);
    vfx.feixe(pos(u), '#fff0b0', 0.8, 10, 1.0); vfx.raiosDivinos(pos(u), '#fff0a0');
    for (let i = 0; i < 3; i++) vfx.part({ pos: acima(pos(u), 1.4), cel: SP.anelSuave, cor: '#fff0b0', tam: 0.8, tam1: 7, vida: 0.8, atraso: i * 0.15, a: 0.8 });
    vfx.anelChao(pos(u), '#ffe9a0', 0.4, 8, 0.9, SP.anelGrosso);
    textoFlutuante(u, 'Não temas!', 'hab');
    for (const a of inimigosDe(u)) { buff(a, 'recebido', 1.25, 5); vfx.part({ pos: acima(pos(a), 2.3), cel: SP.cruzLuz, cor: '#ffe27a', tam: 0.3, tam1: 0.9, vida: 0.9, rot: 0, atraso: 0.2 }); }
    for (const x of aliadosDe(u)) if (x !== u) { x.mana += 30; vfx.subir(null, '#8fd0ff', 5, 0.4, 1.6, SP.estrela4, 0.2, 0.7, x.root); }
  },
  herodes(u) { // muralhas do rei: escudos e muros que sobem
    vfx.anelChao(pos(u), '#ffd860', 0.4, 4, 0.6, SP.anelGrosso);
    for (const x of aliadosDe(u)) if (Math.abs(pos(x).z - pos(u).z) < T * 0.8) {
      x.escudo += 200 * u.mult; buff(x, 'dano', 1.25, 5);
      vfx.escudo(x.root, '#ffd860', 1.0);
      const muro = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.5, 0.25), new THREE.MeshStandardMaterial({ color: '#d9bf8f', flatShading: true }));
      muro.position.copy(pos(x)); muro.position.z += u.time === 'jogador' ? -0.55 : 0.55; addTemp(muro);
      vfx.fumaca(muro.position, '#e0cca4', 4, 0.7, 0.4, 0.6, 0.6, 0.7);
      animar(2.5, k => { muro.position.y = k < 0.15 ? -0.3 + k / 0.15 * 0.55 : k > 0.85 ? 0.25 - (k - 0.85) / 0.15 * 0.6 : 0.25; }, () => { muro.visible = false; });
    }
  },
  ninrode(u) { // a torre de Babel: confusão de línguas
    tremer(0.25);
    const c = pos(u).clone();
    const torre = new THREE.Group(); torre.position.copy(c);
    const pedra = new THREE.MeshStandardMaterial({ color: '#c8a878', flatShading: true });
    for (let i = 0; i < 5; i++) { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.55 - i * 0.09, 0.6 - i * 0.09, 0.45, 8), pedra); b.position.y = 0.22 + i * 0.45; b.castShadow = true; torre.add(b); }
    torre.position.x += u.time === 'jogador' ? 0.6 : -0.6;
    addTemp(torre);
    vfx.fumaca(torre.position, '#e0cca4', 8, 1.0, 0.6, 0.8, 0.7, 1.0);
    vfx.part({ pos: acima(c, 0.08), modo: 1, cel: SP.runa, cor: '#e0b070', tam: 1, tam1: 5.2, vida: 1.2, vr: 1, a: 0.8 });
    animar(3.2, k => { torre.scale.y = k < 0.2 ? k / 0.2 : k > 0.8 ? Math.max(0.01, 1 - (k - 0.8) / 0.2) : 1; }, () => { torre.visible = false; });
    for (const a of naArea(inimigosDe(u), c, 2.6)) {
      buff(a, 'confuso', 1, 3); a.alvo = null;
      vfx.part({ pos: new THREE.Vector3(0, 2.3, 0), seguir: a.root, cel: SP.giro3, cor: '#e0a0ff', tam: 0.6, vida: 3, vr: 5, fadeIn: 0.05, fadeOut: 0.85 });
      textoFlutuante(a, '?!', 'roxo');
    }
  },
};

let _cam = null;
export function definirCamera(c) { _cam = c; }
function camera_pos() { return _cam ? new THREE.Vector3(_cam.position.x, 0.2, _cam.position.z) : new THREE.Vector3(0, 0.2, 20); }
