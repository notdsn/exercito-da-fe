// Exército da Fé — protótipo de auto-battler bíblico (estilo Combinações Táticas / TFT)
import * as THREE from 'three';
import { UNIDADES, TRACOS, INVOCACOES, RODADAS, papelDe } from './units.js';
import { VFX, SP } from './vfx.js';
import { Modelos } from './modelos.js';
import { HABILIDADES, iniciarHabilidades, definirCamera } from './habilidades.js';
import { novaLoja, limiteCampo, contarTracos, nivelDe, niveis, renda, danoDerrota, VIDA_INICIAL, OURO_INICIAL } from './regras.js';
import { RivalIA, PERSONAS, DIFICULDADES } from './ia.js';
import * as conta from './perfil/conta.js';
import { criarArena, blobSombra } from './arena.js';

// ---------------- Constantes ----------------
export const T = 1.4;             // tamanho do quadrado
const G = 0;                      // (sem rio: campo único de hexágonos, como no Combinações Táticas)
const RS = 0.866;                 // distância entre fileiras de hexágonos (fração de T)
const COLS = 5, LINHAS = 4, BANCO = 5;
const MAX_RODADA = 30; // limite de segurança; normalmente o jogo acaba antes
const nomeRodada = r => RODADAS[(r - 1) % RODADAS.length] + (r > RODADAS.length ? ' (II)' : '');
const TEMPO_PREPARO = 35;
const TEMPO_COMBATE = 45;
const MULT_ESTRELA = [1, 1.8, 3.2];
const ESCALA_ESTRELA = [1, 1.05, 1.1]; // diferença mínima: todos com o mesmo tamanho
const $ = s => document.querySelector(s);

// ---------------- Cena 3D (arena estilo Clash) ----------------
const celular = matchMedia('(pointer: coarse)').matches || Math.min(innerWidth, innerHeight) < 700;
// iPhone/iPad (o iPadOS se apresenta como Mac com toque): o Safari mata a aba quando a GPU passa do limite,
// então lá usamos menos pixels e sombra menor. Sem preserveDrawingBuffer (era um buffer de tela extra à toa).
const IOS = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const POUCA_MEMORIA = IOS || (navigator.deviceMemory && navigator.deviceMemory <= 4);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(POUCA_MEMORIA ? 1.5 : 2, window.devicePixelRatio));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.toneMapping = THREE.NeutralToneMapping;
renderer.toneMappingExposure = 1.12;
$('#cena').appendChild(renderer.domElement);
// Perda do contexto WebGL (iOS faz isso quando falta memória): o three já chama preventDefault e, quando o
// navegador devolve o contexto, recria o estado e reenvia geometrias/texturas (as imagens continuam na memória).
// Aqui só pausamos o desenho e avisamos; se não voltar em 6 s, recarregamos a página.
let contextoPerdido = false, timerContexto = 0;
renderer.domElement.addEventListener('webglcontextlost', e => {
  e.preventDefault(); contextoPerdido = true; console.info('WebGL: contexto perdido');
  avisoContexto(true); clearTimeout(timerContexto);
  timerContexto = setTimeout(() => { if (contextoPerdido) location.reload(); }, 6000);
}, false);
renderer.domElement.addEventListener('webglcontextrestored', () => {
  contextoPerdido = false; clearTimeout(timerContexto); console.info('WebGL: contexto restaurado');
  scene.traverse(o => { for (const m of [].concat(o.material || [])) { m.needsUpdate = true; for (const k in m) if (m[k] && m[k].isTexture) m[k].needsUpdate = true; } });
  avisoContexto(false);
}, false);
function avisoContexto(mostrar) {
  let el = document.getElementById('avisoGPU');
  if (!el) { el = document.createElement('div'); el.id = 'avisoGPU'; el.textContent = 'Recarregando gráficos…'; el.style.cssText = 'position:fixed;left:50%;top:40%;transform:translate(-50%,-50%);z-index:99;background:#000a;color:#fff;font:700 16px sans-serif;padding:12px 18px;border-radius:12px;pointer-events:none'; document.body.appendChild(el); }
  el.style.display = mostrar ? 'block' : 'none';
}

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 140);
const CAM_JOGO = new THREE.Vector3(0, 16, 8);
const ALVO_CAM = new THREE.Vector3(0, 0, 0.8);
camera.position.copy(CAM_JOGO); camera.lookAt(ALVO_CAM);

// luz: céu + sol quente com sombras suaves + contraluz para destacar as silhuetas
scene.add(new THREE.HemisphereLight('#e4f3ff', '#6f8f45', 0.78));
const sol = new THREE.DirectionalLight('#fff0d4', 2.25);
sol.position.set(-9, 14, 4); sol.castShadow = true;
const TAM_SOMBRA = POUCA_MEMORIA ? 1024 : celular ? 1024 : 2048; sol.shadow.mapSize.set(TAM_SOMBRA, TAM_SOMBRA); sol.shadow.radius = 3; sol.shadow.bias = -0.0004; sol.shadow.normalBias = 0.02;
Object.assign(sol.shadow.camera, { left: -15, right: 15, top: 15, bottom: -15, near: 1, far: 50 }); sol.shadow.camera.updateProjectionMatrix();
scene.add(sol); scene.add(sol.target);
const contraLuz = new THREE.DirectionalLight('#ffe8c8', 0.55); contraLuz.position.set(5, 8, -10); scene.add(contraLuz);

// luz de borda (rim) nos personagens: destaca a silhueta como nos jogos estilo Clash
export function aplicarRim(mat, cor) {
  if (!mat || mat.userData.rim || !mat.isMeshStandardMaterial) return;
  mat.userData.rim = { value: new THREE.Color(cor) };
  mat.onBeforeCompile = sh => {
    sh.uniforms.corRim = mat.userData.rim;
    // visual de desenho: cor mais saturada (antes da luz) e borda de luz (rim) mais forte
    sh.fragmentShader = 'uniform vec3 corRim;\n' + sh.fragmentShader.replace('#include <map_fragment>',
      `#include <map_fragment>
       { float lum = dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114)); diffuseColor.rgb = max(mix(vec3(lum), diffuseColor.rgb, 1.22), 0.0) * 1.04; }`)
      .replace('#include <opaque_fragment>',
      `float rimF = pow(1.0 - clamp(dot(normalize(normal), normalize(vViewPosition)), 0.0, 1.0), 2.6);
       outgoingLight += corRim * rimF * 0.5;
       #include <opaque_fragment>`);
  };
  mat.customProgramCacheKey = () => 'rim2';
  mat.needsUpdate = true;
}

const vfx = new VFX(scene, camera, 'assets/vfx/', { leve: celular });
// estilo do tiro básico e do golpe corpo a corpo de cada unidade
const TIRO = { davi: 'pedra', jonatas: 'flecha', ester: 'luz', debora: 'profecia', samuel: 'luz', jonas: 'agua', elias: 'fogo', moises: 'agua', salomao: 'ouro', figura_sombria: 'sombra', elemental_fogo: 'fogo', dragao: 'fogo', farao: 'veneno', leviata: 'agua', balaao: 'arcano', hama: 'sangue', acabe: 'flecha', gabriel: 'luz', herodes: 'ouro', ninrode: 'flecha' };
const GOLPE = { javali_besta: 'garra', leao_lobo: 'garra', leao: 'garra', golem: 'pesado', golias: 'pesado', lami: 'pesado', sansao: 'pesado', orc: 'pesado' };
const modelos = new Modelos();

// tabuleiro de hexágonos (pontas para cima), fileiras ímpares deslocadas meio hexágono
const X0 = (COLS / 2 + 0.25) * T + 0.12, ZB = (LINHAS - 0.5) * RS * T + T * 0.58 + 0.12, ZDIV = ZB + 0.3, ZBANCO = ZDIV + 1.5;
export function posQuadrado(c, l) { return new THREE.Vector3((c - (COLS - 1) / 2 + (l % 2 ? 0.25 : -0.25)) * T, 0, (l - (LINHAS - 0.5)) * RS * T); }
const PASSO_BANCO = 1.25, XBANCO = -0.72;  // banco deslocado para a esquerda: o trono do seu Governante fica no canto direito
function posBanco(i) { return new THREE.Vector3(XBANCO + (i - (BANCO - 1) / 2) * PASSO_BANCO, 0, (ZDIV + ZBANCO) / 2); }

const arena = criarArena(scene, { T, RS, COLS, LINHAS, BANCO, G, posQuadrado, posBanco, X0, ZB, ZDIV, ZBANCO, XBANCO, passoBanco: PASSO_BANCO });
let YAW = 0; // 0 = câmera atrás do jogador (celular em pé); PI/2 = vista lateral (tela deitada)
const quadrados = arena.quadrados; // {malha, c, l, jogador}
const slotsBanco = arena.slotsBanco;

// ---------------- Estado ----------------
const S = {
  fase: 'titulo', rodada: 1, vida: VIDA_INICIAL, ouro: 6, loja: [], banco: Array(BANCO).fill(null),
  tabuleiro: new Map(), inimigos: [], combatentes: [], timer: 0, nivelTracos: {}, ouroSalomao: 0,
  adversario: '', resultadoTimer: 0, venceuUltima: false, vitorias: 0,
  rivais: [], oponente: null, idxRival: -1, dif: DIFICULDADES.normal, difId: 'normal',
};
export const estado = S;
const capCampo = () => limiteCampo(S.rodada);

// ---------------- Unidade ----------------
let proxId = 1;
export class Unidade {
  constructor(id, estrelas = 1, time = 'jogador') {
    this.uid = proxId++;
    this.id = id; this.def = UNIDADES[id] || INVOCACOES[id]; this.estrelas = estrelas; this.time = time;
    this.root = new THREE.Group(); this.root.userData.unidade = this;
    this.slot = null; // {tipo:'tab', c, l} | {tipo:'banco', i}
    // base (anel do time)
    const corTime = time === 'jogador' ? '#2f86ff' : '#ff4a3d';
    const cor0 = new THREE.Color(corTime);
    this.sombra = blobSombra(); this.root.add(this.sombra);
    this.pedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.54, 0.06, 28), new THREE.MeshStandardMaterial({ color: cor0.clone().multiplyScalar(0.45), roughness: 0.6 }));
    this.pedestal.position.y = 0.03; this.pedestal.visible = false; this.root.add(this.pedestal); // (sem pedestal: tropas pisam direto na grama)
    this.base = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.49, 0.05, 28), new THREE.MeshStandardMaterial({ color: corTime, emissive: corTime, emissiveIntensity: 0.28, roughness: 0.4 }));
    this.base.position.y = 0.085; this.base.visible = false; this.root.add(this.base);
    // anel fino no chão com a cor do time (estilo Combinações Táticas: discreto)
    this.anel = new THREE.Mesh(new THREE.RingGeometry(0.4, 0.47, 40), new THREE.MeshBasicMaterial({ color: corTime, transparent: true, opacity: 0.75, depthWrite: false }));
    this.anel.rotation.x = -Math.PI / 2; this.anel.position.y = 0.015; this.anel.renderOrder = 1; this.root.add(this.anel);
    // cilindro invisível só para clicar/tocar
    this.alvoClique = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 1.5, 8), new THREE.MeshBasicMaterial({ visible: false }));
    this.alvoClique.position.y = 0.75; this.root.add(this.alvoClique);
    this.aura = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.66, 32), new THREE.MeshBasicMaterial({ color: '#fff', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    this.aura.rotation.x = -Math.PI / 2; this.aura.position.y = 0.025; this.root.add(this.aura);
    this.pilar = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.5, 2.2, 24, 1, true), new THREE.MeshBasicMaterial({ color: '#fff', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    this.pilar.position.y = 1.1; this.pilar.visible = false; this.root.add(this.pilar);
    this.corpo = new THREE.Group(); this.corpo.position.y = 0; this.root.add(this.corpo);
    const vis = modelos.criar(id, this.def, time !== 'jogador');
    this.visual = vis.obj; this.mixer = vis.mixer; this.rig = vis.rig; this.alturaModelo = vis.altura;
    this.elev = new THREE.Group(); this.elev.position.y = 0.0; this.corpo.add(this.elev);
    this.elev.add(this.visual);
    this.mats = [];
    this.visual.traverse(o => {
      if (o.isMesh && o.material && !Array.isArray(o.material)) {
        o.material = o.material.clone();
        if (o.material.emissive) this.mats.push({ m: o.material, e: o.material.emissive.clone(), i: o.material.emissiveIntensity });
        aplicarRim(o.material, time === 'jogador' ? '#d8ecff' : '#ffe2da');
      }
    });
    this.root.rotation.y = time === 'jogador' ? Math.PI : 0;
    this.aplicarEscala();
    scene.add(this.root);
    // rótulo HTML
    this.ui = document.createElement('div');
    this.ui.className = 'rotulo ' + (time === 'jogador' ? 'aliado' : 'inimigo');
    this.ui.innerHTML = `<div class="nome"></div><div class="hp"><span class="nv"></span><div class="barra vida"><i></i><b></b></div></div><div class="barra mana"><i></i></div>`;
    $('#rotulos').appendChild(this.ui);
    this.atualizarNome();
    this.fase = Math.random() * 6;
  }
  get custoTotal() { return (this.def.custo || 1) * Math.pow(3, this.estrelas - 1); }
  aplicarEscala() { this.corpo.scale.setScalar(ESCALA_ESTRELA[this.estrelas - 1]); }
  atualizarNome() {
    this.ui.querySelector('.nome').textContent = this.def.nome;
    this.ui.querySelector('.nv').textContent = '★'.repeat(this.estrelas);
    this.ui.classList.toggle('e2', this.estrelas === 2); this.ui.classList.toggle('e3', this.estrelas === 3);
    this.anel.material.color.set(this.estrelas === 3 ? '#ff9aff' : this.estrelas === 2 ? '#ffd23a' : (this.time === 'jogador' ? '#3d96ff' : '#ff4a3d'));
  }
  remover() { scene.remove(this.root); this.ui.remove(); }
  opacidade(o) {
    if (this._op === o) return; this._op = o;
    for (const x of this.mats) { x.m.transparent = o < 1; x.m.opacity = o; x.m.depthWrite = o >= 1; }
  }
  get vivo() { return this.hp > 0 && !this.morto; }
}

// ---------------- Rótulos e textos flutuantes ----------------
const _v = new THREE.Vector3();
function telaDe(pos, alturaExtra = 0) {
  _v.copy(pos); _v.y += alturaExtra; _v.project(camera);
  return { x: (_v.x * 0.5 + 0.5) * innerWidth, y: (-_v.y * 0.5 + 0.5) * innerHeight, vis: _v.z < 1 };
}
export function textoFlutuante(u, texto, classe = '') {
  const p = telaDe(u.root.position, (u.alturaModelo || 1.4) * u.corpo.scale.y + 0.3);
  const d = document.createElement('div'); d.className = 'flutua ' + classe; d.textContent = texto;
  d.style.left = p.x + (Math.random() * 30 - 15) + 'px'; d.style.top = p.y + 'px';
  $('#rotulos').appendChild(d); setTimeout(() => d.remove(), 1100);
}
function atualizarRotulos() {
  const todas = [...todasDoJogador(), ...S.inimigos, ...S.combatentes.filter(u => u.invocada)];
  const emCombate = S.fase === 'combate' || S.fase === 'resultado';
  for (const u of todas) {
    const vis = u.root.visible && !(emCombate && (u.morto || u.slot?.tipo === 'banco')) && S.fase !== 'titulo';
    u.ui.style.display = vis ? '' : 'none';
    if (!vis) continue;
    const p = telaDe(u.root.position, (u.alturaModelo || 1.5) * u.corpo.scale.y + 0.18);
    u.ui.style.transform = `translate(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px) translate(-50%, -100%)`;
    const hp = emCombate && u.maxHp ? Math.max(0, u.hp / u.maxHp) : 1;
    u.ui.querySelector('.vida i').style.width = hp * 100 + '%';
    u.ui.querySelector('.vida b').style.width = (emCombate && u.maxHp ? Math.min(100, (u.escudo || 0) / u.maxHp * 100) : 0) + '%';
    u.ui.querySelector('.mana i').style.width = (emCombate && u.maxMana ? Math.min(100, u.mana / u.maxMana * 100) : 0) + '%';
    u.ui.classList.toggle('semMana', !u.def.mana);
    u.ui.classList.toggle('combate', emCombate);
  }
}

// ---------------- Mensagens ----------------
export function moedaPop(qtd) {
  const alvo = document.querySelector('#ouro').getBoundingClientRect();
  const d = document.createElement('div'); d.className = 'moedaPop'; d.innerHTML = (qtd > 0 ? '+' : '') + qtd + ' <i class="gota"></i>';
  d.style.left = alvo.left + 'px'; d.style.top = alvo.bottom + 'px';
  document.body.appendChild(d); setTimeout(() => d.remove(), 1200);
  const h = document.querySelector('#ouro').parentElement; h.classList.remove('pulsoOuro'); void h.offsetWidth; h.classList.add('pulsoOuro');
}
let toastTimer;
export function aviso(txt, tipo = '') {
  const t = $('#aviso'); t.textContent = txt; t.className = 'mostrar ' + tipo;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.className = '', 2200);
}
function faixa(titulo, sub = '', classe = '') {
  const f = $('#faixa'); f.innerHTML = `<h2>${titulo}</h2><p>${sub}</p>`; f.className = 'mostrar ' + classe;
  setTimeout(() => f.className = '', 2300);
}

// ---------------- Posicionamento ----------------
function todasDoJogador() { return [...S.tabuleiro.values(), ...S.banco.filter(Boolean)]; }
function colocar(u, slot) {
  u.slot = slot;
  const p = slot.tipo === 'tab' ? posQuadrado(slot.c, slot.l) : posBanco(slot.i);
  u.root.position.copy(p);
  if (slot.tipo === 'tab') S.tabuleiro.set(`${slot.c},${slot.l}`, u); else S.banco[slot.i] = u;
  // na preparação: banco olha para a câmera; no campo, 3/4 virados para o centro (mostra o rosto)
  u.root.rotation.y = slot.tipo === 'banco' ? YAW : YAW ? YAW + 0.7 : Math.PI + (slot.c < 2 ? -1.15 : slot.c > 2 ? 1.15 : -0.5);
}
function tirar(u) {
  if (!u.slot) return;
  if (u.slot.tipo === 'tab') S.tabuleiro.delete(`${u.slot.c},${u.slot.l}`); else S.banco[u.slot.i] = null;
  u.slot = null;
}
function ocupante(slot) { return slot.tipo === 'tab' ? S.tabuleiro.get(`${slot.c},${slot.l}`) : S.banco[slot.i]; }

// ---------------- Loja ----------------
function renovarLoja() { S.loja = novaLoja(S.rodada); desenharLoja(); }

function desenharLoja() {
  const el = $('#cartas'); el.innerHTML = '';
  S.loja.forEach((id, i) => {
    const c = document.createElement('div');
    if (!id) { c.className = 'carta vazia'; el.appendChild(c); return; }
    const d = UNIDADES[id];
    const copias = todasDoJogador().filter(u => u.id === id && u.estrelas === 1).length;
    c.className = `carta custo${d.custo}` + (S.ouro < d.custo ? ' cara' : '') + (copias >= 2 ? ' fundir' : '') + (d.lado === 'trevas' ? ' trevas' : '');
    c.innerHTML = `
      <div class="retrato" style="--cor:${d.cor}${retratos[id] ? `;--img:url(${retratos[id]})` : ''}">${retratos[id] ? '' : `<span>${d.nome.split(' ').map(p => p[0]).join('').slice(0, 2)}</span>`}
        <div class="trs">${d.tracos.map(t => `<span style="--c:${TRACOS[t].cor}" title="${TRACOS[t].nome}">${TRACOS[t].icone}</span>`).join('')}</div>
        ${copias ? `<em>${copias}/3</em>` : ''}</div>
      <div class="nome">${d.nome}</div>
      <div class="custo"><b>${d.custo}</b></div>
      <div class="dica"><b>${d.habilidade}</b><br>${d.descHab}<br><i>${d.frase}</i><br><small>${d.tracos.map(t => TRACOS[t].icone + ' ' + TRACOS[t].nome).join(' · ')}<br>Vida ${d.vida} · Dano ${d.dano} · ${d.funcao === 'corpo' ? 'Corpo a corpo' : 'Alcance ' + d.alcance}</small></div>`;
    c.addEventListener('click', () => comprar(i));
    el.appendChild(c);
  });
  $('#ouro').textContent = S.ouro; $('#ouroLoja').textContent = S.ouro;
  $('#btnRenovar').disabled = S.ouro < 1 || S.fase !== 'preparo';
}

function comprar(i) {
  if (S.fase !== 'preparo') return;
  const id = S.loja[i]; if (!id) return;
  const d = UNIDADES[id];
  if (S.ouro < d.custo) { aviso('Elixir insuficiente!', 'erro'); return; }
  const livre = S.banco.findIndex(x => !x);
  const copias = todasDoJogador().filter(u => u.id === id && u.estrelas === 1);
  const hex = copias.length >= 2 ? null : melhorHex(id);   // posiciona sozinho pelo papel (se couber no campo)
  if (livre < 0 && !hex && copias.length < 2) { aviso('Banco e campo cheios! Venda ou reorganize unidades.', 'erro'); return; }
  S.ouro -= d.custo; S.loja[i] = null;
  const carta = $('#cartas').children[i];
  if (hex) {
    const u = new Unidade(id, 1, 'jogador');
    colocar(u, hex);
    saltarDaLoja(u, carta);
  } else if (livre < 0) {
    // compra que já funde direto
    const manter = copias.find(u => u.slot.tipo === 'tab') || copias[0];
    const outra = copias.find(u => u !== manter);
    tirar(outra); outra.remover(); promover(manter);
  } else {
    const u = new Unidade(id, 1, 'jogador');
    colocar(u, { tipo: 'banco', i: livre });
    if (copias.length >= 2) vfx.compra(u.root.position); else saltarDaLoja(u, carta);
  }
  verificarFusoes();
  atualizarTracos(); desenharLoja(); atualizarHUD();
}
// melhor hexágono livre para a unidade comprada, de acordo com o papel:
// tanques/corpo a corpo na frente (fileira mais perto do inimigo), distância no fundo, suporte no meio
const FILEIRAS = { tanque: [4, 5, 6, 7], corpo: [4, 5, 6, 7], suporte: [5, 6, 4, 7], distancia: [7, 6, 5, 4] };
const COLUNAS = { tanque: [2, 1, 3, 0, 4], corpo: [2, 1, 3, 0, 4], suporte: [2, 1, 3, 0, 4], distancia: [0, 4, 1, 3, 2] };
function melhorHex(id) {
  if (S.tabuleiro.size >= capCampo()) return null;
  const papel = papelDe(id);
  for (const l of FILEIRAS[papel]) for (const c of COLUNAS[papel]) if (!S.tabuleiro.has(`${c},${l}`)) return { tipo: 'tab', c, l };
  return null;
}
// a tropa "pula" da carta da loja até o lugar dela (arco), como no Combinações Táticas
function saltarDaLoja(u, carta) {
  const fim = u.root.position.clone();
  let ini = fim.clone().add(new THREE.Vector3(0, 0, 3.2).applyAxisAngle(new THREE.Vector3(0, 1, 0), YAW));
  if (carta) { // ponto do chão embaixo da carta na tela
    const r = carta.getBoundingClientRect(), ndc = new THREE.Vector2((r.left + r.width / 2) / innerWidth * 2 - 1, -((r.top) / innerHeight) * 2 + 1);
    const ray = new THREE.Raycaster(); ray.setFromCamera(ndc, camera);
    const t = -ray.ray.origin.y / ray.ray.direction.y; if (t > 0 && t < 80) ini = ray.ray.origin.clone().addScaledVector(ray.ray.direction, t);
  }
  const dist = ini.distanceTo(fim), alto = 1.2 + dist * 0.22, rot = u.root.rotation.y;
  u.root.position.copy(ini); u.corpo.scale.setScalar(0.5);
  vfx.compra(ini);
  animar(0.5 + Math.min(0.25, dist * 0.03), k => {
    u.root.position.lerpVectors(ini, fim, k); u.corpo.position.y = Math.sin(k * Math.PI) * alto;
    u.corpo.scale.setScalar(ESCALA_ESTRELA[u.estrelas - 1] * (0.5 + 0.5 * Math.min(1, k * 1.6)));
    u.root.rotation.y = rot + (1 - k) * Math.PI * 2;
  }, () => {
    u.root.position.copy(fim); u.corpo.position.y = 0; u.aplicarEscala(); u.root.rotation.y = rot;
    vfx.anelChao(fim, '#ffffff', 0.2, 1.1, 0.4, SP.anel4, 0.7);
  });
}
function promover(u) {
  u.estrelas++; u.aplicarEscala(); u.atualizarNome(); tremer(0.18);
  vfx.fusao(u.root.position);
  const e0 = u.corpo.scale.x; animar(0.45, k => u.corpo.scale.setScalar(e0 * (1 + Math.sin(k * Math.PI) * 0.35)), () => u.aplicarEscala());
  aviso(`${u.def.nome} subiu para ${'★'.repeat(u.estrelas)}!`, 'ouro');
}
function verificarFusoes() {
  for (let guarda = 0; guarda < 10; guarda++) {
    const grupos = {};
    for (const u of todasDoJogador()) if (u.estrelas < 3) (grupos[u.id + '_' + u.estrelas] ||= []).push(u);
    const g = Object.values(grupos).find(x => x.length >= 3);
    if (!g) return;
    g.sort((a, b) => (b.slot.tipo === 'tab') - (a.slot.tipo === 'tab'));
    const [manter, a, b] = g;
    for (const x of [a, b]) { vfx.brilho(x.root.position, '#ffe27a', 1.6, 0.4); vfx.subir(x.root.position, '#ffe27a', 8, 0.4, 2.4, SP.estrela1, 0.2, 0.6); tirar(x); x.remover(); }
    promover(manter);
  }
}
function vender(u) {
  const v = u.custoTotal;
  tirar(u); u.remover(); S.ouro += v; moedaPop(v);
  vfx.venda(u.root.position);
  aviso(`Vendeu ${u.def.nome} por ${v} de elixir`);
  atualizarTracos(); desenharLoja(); atualizarHUD();
}

// ---------------- Traços ----------------
function atualizarTracos() {
  if (S.fase === 'preparo') arena.mostrarContagem(`${S.tabuleiro.size}/${capCampo()}`);
  const unid = [...S.tabuleiro.values()];
  const cont = contarTracos(unid);
  const el = $('#tracos'); el.innerHTML = '';
  const lista = Object.keys(cont).sort((a, b) => nivelDe(b, cont[b]) - nivelDe(a, cont[a]) || cont[b] - cont[a]);
  if (!lista.length) el.innerHTML = '<p class="vazio">Sinergias</p>';
  const novos = {};
  $('#btnTracos .qt').textContent = lista.filter(t => nivelDe(t, cont[t])).length || '';
  for (const t of lista) {
    const tr = TRACOS[t], n = cont[t], nv = nivelDe(t, n);
    novos[t] = nv;
    const d = document.createElement('div');
    d.className = 'traco' + (nv ? ' ativo n' + nv : '');
    d.style.setProperty('--cor', tr.cor);
    const prox = tr.niveis[Math.min(nv, tr.niveis.length - 1)];
    d.innerHTML = `<div class="icW"><div class="ic">${tr.icone}</div><em>${n}</em></div><div class="tx"><b>${tr.nome}</b>
      <div class="niveis">${tr.niveis.map(x => `<span class="${n >= x ? 'on' : ''}">${x}</span>`).join('')}</div></div>`;
    d.title = `${tr.nome} (${n}/${prox})\n` + tr.desc.map((x, k) => `(${tr.niveis[k]}) ${x}`).join('\n');
    d.addEventListener('click', () => {
      const i = $('#info');
      i.innerHTML = `<h4>${tr.icone} ${tr.nome} <small>${n}/${prox}</small></h4>` + tr.desc.map((x, k) => `<p class="${nv === k + 1 ? 'on' : nv > k ? 'feito' : ''}"><b>(${tr.niveis[k]})</b> ${x}</p>`).join('');
      i.classList.add('mostrar');
    });
    el.appendChild(d);
  }
  // ativação de novos níveis -> efeito
  for (const t in novos) {
    if (novos[t] > (S.nivelTracos[t] || 0) && S.fase === 'preparo') {
      aviso(`${TRACOS[t].icone} ${TRACOS[t].nome} (${TRACOS[t].niveis[novos[t] - 1]}) ativado!`, 'ouro');
      for (const u of unid) if (u.def.tracos.includes(t) || ['alianca', 'celestial'].includes(t) || (t === 'juizes' && novos[t] === 2))
        { vfx.anelChao(u.root.position, TRACOS[t].cor, 0.3, 1.4, 0.6, SP.anel4, 0.9); vfx.subir(u.root.position, TRACOS[t].cor, 8, 0.45, 2, SP.estrela4, 0.2, 0.8); }
    }
  }
  S.nivelTracos = novos;
  // auras nas unidades
  for (const u of todasDoJogador()) aplicarAura(u, u.slot?.tipo === 'tab' ? novos : {});
  $('#campo').textContent = `${S.tabuleiro.size}/${capCampo()}`;
}
function hexParaRGB(h) { const c = new THREE.Color(h); return [c.r * 1.6 + 0.2, c.g * 1.6 + 0.2, c.b * 1.6 + 0.2]; }
function aplicarAura(u, niveis) {
  let melhor = null, nv = 0;
  for (const t of u.def.tracos || []) if ((niveis[t] || 0) > nv) { nv = niveis[t]; melhor = t; }
  if (!melhor) for (const t of ['alianca', 'celestial']) if (niveis[t]) { nv = 1; melhor = t; }
  u.nivelAura = nv;
  if (!melhor) { u.aura.material.opacity = 0; u.pilar.visible = false; return; }
  const cor = new THREE.Color(TRACOS[melhor].cor);
  u.aura.material.color.copy(cor).multiplyScalar(1.6);
  u.aura.material.opacity = nv >= 2 ? 0.95 : 0.6;
  u.pilar.visible = nv >= 2 || (melhor === 'celestial');
  u.pilar.material.color.copy(cor);
}

// ---------------- HUD ----------------
function atualizarHUD() {
  $('#rodada').textContent = `Rodada ${S.rodada}`;
  $('#nomeRodada').textContent = nomeRodada(S.rodada);
  $('#ouroLoja').textContent = S.ouro;
  desenharRivais();
  $('#vida').textContent = S.vida;
  $('#ouro').textContent = S.ouro;
  $('#adversario').textContent = S.adversario;
  $('#campo').textContent = `${S.tabuleiro.size}/${capCampo()}`;
  $('#btnLutar').disabled = S.fase !== 'preparo';
  $('#fase').textContent = S.fase === 'preparo' ? 'Fase de Mobilização' : S.fase === 'combate' ? 'Fase de Batalha' : 'Resultado';
  arena.mostrarContagem(S.fase === 'preparo' ? `${S.tabuleiro.size}/${capCampo()}` : null);
}

// ---------------- Exército adversário ----------------
function desenharRivais() {
  // barra de jogadores no topo (como no Combinações Táticas): retrato do Governante, nome, vida
  const el = $('#jogadores'); if (!el) return;
  const lista = [{ nome: nomeJogador(), vida: S.vida, voce: true, avatar: AVATAR_JOGADOR }, ...S.rivais];
  el.innerHTML = lista.map(r => `<div class="jog ${r.voce ? 'voce' : ''} ${r === S.oponente ? 'atual' : ''} ${r.vida <= 0 ? 'fora' : ''}">
    <div class="av" style="${retratos[r.avatar] ? `--img:url(${retratos[r.avatar]})` : ''}"></div>
    <div class="bv"><i style="width:${Math.max(0, r.vida) / VIDA_INICIAL * 100}%"></i></div>
    <div class="nm">${r.voce ? r.nome : r.nome.split(' ')[0]}</div><b class="hp">${Math.max(0, r.vida)}</b></div>`).join('');
  atualizarReis();
}
const AVATAR_JOGADOR = 'davi';
const nomeJogador = () => conta.usuarioAtual?.usuario || 'Você';
// ---------------- Governantes nas plataformas octogonais ----------------
const reis = { jogador: null, inimigo: null };
function criarRei(lado, avatar, nome) {
  const r = reis[lado];
  if (r && r.avatar === avatar) { r.nome = nome; return; }
  if (r) { scene.remove(r.raiz); r.ui.remove(); }
  const def = UNIDADES[avatar] || UNIDADES.davi;
  const raiz = new THREE.Group(), vis = modelos.criar(avatar, def, lado === 'inimigo');
  raiz.add(vis.obj); vis.obj.scale.multiplyScalar(1.15);
  vis.obj.traverse(o => { if (o.isMesh && o.material && !Array.isArray(o.material)) { o.material = o.material.clone(); aplicarRim(o.material, lado === 'jogador' ? '#d8ecff' : '#ffe2da'); } });
  // coroa dourada por cima (o Governante se destaca das tropas)
  const coroa = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.14, 0.13, 8, 1, true), new THREE.MeshStandardMaterial({ color: '#ffd23a', metalness: 0.6, roughness: 0.3, side: THREE.DoubleSide, emissive: '#5a3a00', emissiveIntensity: 0.4 }));
  coroa.position.y = vis.altura * 1.15 + 0.06; raiz.add(coroa);
  const p = arena.plataformas[lado]; raiz.position.copy(p);
  raiz.add(blobSombra());
  scene.add(raiz);
  const ui = document.createElement('div'); ui.className = 'rei ' + lado;
  ui.innerHTML = `<div class="nm"></div><div class="lin"><span class="esc">♛</span><div class="bv"><i></i><b></b></div></div>`;
  $('#reis').appendChild(ui);
  reis[lado] = { raiz, rig: vis.rig, mixer: vis.mixer, altura: vis.altura * 1.15, ui, avatar, nome };
}
function atualizarReis() {
  if (!S.rivais?.length) return;
  criarRei('jogador', AVATAR_JOGADOR, nomeJogador());
  if (S.oponente) criarRei('inimigo', S.oponente.avatar || 'golias', S.oponente.nome);
  for (const [lado, r] of Object.entries(reis)) {
    if (!r) continue;
    const vida = lado === 'jogador' ? S.vida : (S.oponente?.vida ?? 0);
    r.ui.querySelector('.nm').textContent = r.nome;
    r.ui.querySelector('.bv i').style.width = Math.max(0, vida) / VIDA_INICIAL * 100 + '%';
    r.ui.querySelector('.bv b').textContent = Math.max(0, vida);
  }
}
function animarReis(dt) {
  const visivel = S.fase !== 'titulo';
  for (const [lado, r] of Object.entries(reis)) {
    if (!r) continue;
    r.raiz.visible = visivel; r.ui.style.display = visivel ? '' : 'none';
    // olha para o centro do campo
    r.raiz.rotation.y = Math.atan2(-r.raiz.position.x, -r.raiz.position.z);
    r.rig?.atualizar(dt, false); r.mixer?.update(dt);
    if (!visivel) continue;
    const p = telaDe(r.raiz.position, r.altura + 0.35);
    r.ui.style.left = p.x + 'px'; r.ui.style.top = p.y + 'px';
  }
}
function gerarAdversario() {
  for (const u of S.inimigos) u.remover();
  S.inimigos = [];
  const vivos = S.rivais.filter(r => r.vivo);
  for (const r of vivos) r.turno(S.rodada);
  // gira entre os rivais vivos (como no modo Combinações Táticas)
  let k = S.idxRival;
  for (let i = 0; i < S.rivais.length; i++) { k = (k + 1) % S.rivais.length; if (S.rivais[k].vivo) break; }
  S.idxRival = k; S.oponente = S.rivais[k];
  const meu = [...S.tabuleiro.values()].map(u => ({ id: u.id, estrelas: u.estrelas, c: u.slot.c, l: u.slot.l }));
  const time = S.oponente.posicionar(S.rodada, meu);
  const nv = niveis(time);
  const ativos = Object.keys(nv).filter(t => nv[t]).map(t => TRACOS[t].icone).join('');
  S.adversario = `${S.oponente.nome} ${ativos}`;
  for (const p of time) {
    const u = new Unidade(p.id, p.estrelas, 'inimigo');
    u.escalaIA = S.dif.escala;
    u.slotInimigo = { c: p.c, l: p.l };
    u.root.position.copy(posQuadrado(p.c, p.l)); u.root.rotation.y = YAW ? YAW - 0.7 : 0;
    S.inimigos.push(u);
  }
  for (const u of S.inimigos) aplicarAura(u, nv);
}

// ---------------- Fluxo de rodadas ----------------
function iniciarPreparo() {
  S.fase = 'preparo'; S.timer = TEMPO_PREPARO;
  gerarAdversario(); renovarLoja(); atualizarTracos(); atualizarHUD();
  $('#loja').classList.remove('oculta', 'emCombate'); $('#btnLutar').textContent = 'Lutar!';
  faixa(`Rodada ${S.rodada}`, `${nomeRodada(S.rodada)}<br><small>contra ${S.oponente.nome}</small>`);
}
function autoPosicionar() {
  const lim = capCampo();
  for (const u of S.banco.filter(Boolean)) {
    if (S.tabuleiro.size >= lim) break;
    const alvo = melhorHex(u.id);
    if (alvo) { tirar(u); colocar(u, alvo); }
  }
}
function lutar() {
  if (S.fase !== 'preparo') return;
  soltarArraste(true);
  for (const a of animacoes.splice(0)) { a.passo?.(1); a.fim?.(); } // termina saltos da loja em andamento
  autoPosicionar(); atualizarTracos();
  S.fase = 'combate'; S.timer = TEMPO_COMBATE; S.ouroSalomao = 0;
  $('#loja').classList.add('emCombate'); $('#btnLutar').textContent = 'Batalha!'; $('#info').classList.remove('mostrar');
  const meus = [...S.tabuleiro.values()];
  prepararCombate(meus, S.inimigos);
  S.combatentes = [...meus, ...S.inimigos];
  ocupacao.clear();
  for (const u of S.combatentes) { u.tile = null; u.mov = null; u.bloqueado = 0; const t = tileDe(u.root.position); ocupar(u, t.c, t.l); u.root.position.copy(posQuadrado(t.c, t.l)); }
  atualizarHUD();
  faixa('Lutar!', 'Que o Senhor dê a vitória!');
}

function stats(u, niveis, nivelInimigo) {
  const m = MULT_ESTRELA[u.estrelas - 1], d = u.def, tr = d.tracos || [];
  const tem = t => tr.includes(t);
  let vidaM = 1, danoM = 1, velM = 1, manaM = 1, moveM = 1;
  const n = t => niveis[t] || 0;
  if (tem('profetas')) manaM *= [1, 1.4, 2][n('profetas')];
  if (tem('valentes')) danoM *= [1, 1.2, 1.5][n('valentes')];
  if (tem('juizes') && n('juizes') >= 1) velM *= 1.3;
  if (n('juizes') >= 2) velM *= 1.3;
  vidaM *= [1, 1.15, 1.35][n('alianca')];
  if (tem('bestas')) { const b = [1, 1.25, 1.6][n('bestas')]; velM *= b; moveM *= b; }
  if (tem('gigantes')) vidaM *= [1, 1.25, 1.6][n('gigantes')];
  u.gigante = tem('gigantes') && n('gigantes') >= 1; u.aplicarEscala();
  u.maxHp = Math.round(d.vida * m * vidaM * (u.escalaIA || 1));
  u.hp = u.maxHp; u.dano = d.dano * m * danoM * (u.escalaIA || 1); u.vel = d.velAtaque * velM;
  u.alcanceMundo = (d.alcance || 1) * T + 0.2; u.maxMana = d.mana || 0; u.mana = 0; u.manaMult = manaM;
  u.velMov = 1.9 * moveM * (d.veloz ? 1.3 : 1);
  u.escudo = tem('filisteus') ? [0, 200, 450][n('filisteus')] : 0;
  u.roubo = tem('trevas') ? [0, 0.2, 0.45][n('trevas')] : 0;
  u.livramento = tem('livramento') ? [0, 0.25, 0.5][n('livramento')] : 0;
  u.reducao = [0, 0.15, 0.3][n('celestial')];
  u.mult = m; u.cd = 0.3 + Math.random() * 0.4; u.alvo = null; u.morto = false; u.atordoado = 0; u.buffs = [];
  u.invisivel = false; u.reviveu = false; u.livrou = false; u.vulneravel = 0; u.estocada = 0;
  u.root.visible = true; u.corpo.position.set(0, 0, 0); u.corpo.rotation.set(0, 0, 0); u.opacidade(1);
  if (nivelInimigo) u.hp = Math.round(u.hp * (1 - [0, 0.1, 0.25][nivelInimigo]));
}
function prepararCombate(a, b) {
  const na = {}, nb = {}, ca = contarTracos(a), cb = contarTracos(b);
  for (const t in ca) na[t] = nivelDe(t, ca[t]);
  for (const t in cb) nb[t] = nivelDe(t, cb[t]);
  for (const u of a) stats(u, na, nb.egito || 0);
  for (const u of b) stats(u, nb, na.egito || 0);
  if (na.egito) aviso('🐍 Pragas do Egito enfraquecem os inimigos!');
  // Intriga: os inimigos mais fortes começam enfraquecidos
  for (const [meus, deles, nv] of [[a, b, na.intriga], [b, a, nb.intriga]]) {
    if (!nv) continue;
    [...deles].sort((x, y) => y.dano - x.dano).slice(0, nv >= 2 ? 3 : 1).forEach(x => { x.buffs.push({ campo: 'dano', mult: 0.7, t: 8 }); x.intrigado = true; });
  }
}

function fimCombate(venceu, empate) {
  S.fase = 'resultado'; S.resultadoTimer = 2.8;
  const sobreviventes = S.inimigos.filter(u => u.vivo).length;
  const meusVivos = S.combatentes.filter(u => u.vivo && u.time === 'jogador' && !u.invocada).length;
  S.oponente.venceuUltima = !venceu;
  if (venceu) {
    S.vitorias++;
    S.oponente.vida -= danoDerrota(S.rodada, meusVivos);
    if (S.oponente.vida <= 0) aviso(`${S.oponente.nome} foi derrotado de vez!`, 'ouro');
    faixa('Vitória!', '“Se Deus é por nós, quem será contra nós?” — Rm 8:31', 'vitoria');
  } else {
    const dano = danoDerrota(S.rodada, sobreviventes);
    S.vida = Math.max(0, S.vida - dano);
    faixa(empate ? 'Tempo esgotado!' : 'Derrota', `Você perdeu ${dano} de vida. Levante-se e lute de novo!`, 'derrota');
  }
  S.venceuUltima = venceu;
  simularRivais();
  atualizarHUD();
}
// os outros rivais lutam entre si (resultado estimado pela força dos exércitos)
function simularRivais() {
  const outros = S.rivais.filter(r => r.vivo && r !== S.oponente).sort(() => Math.random() - 0.5);
  for (let i = 0; i + 1 < outros.length; i += 2) {
    const a = outros[i], b = outros[i + 1];
    const pa = a.poder(S.rodada) ** 2, pb = b.poder(S.rodada) ** 2;
    const [v, p] = Math.random() < pa / (pa + pb) ? [a, b] : [b, a];
    p.vida -= danoDerrota(S.rodada, 1 + Math.floor(Math.random() * 3));
    v.venceuUltima = true; p.venceuUltima = false;
  }
}
function proximaRodada() {
  // limpa invocações e restaura o exército
  for (const u of S.combatentes) if (u.invocada) u.remover();
  S.combatentes = [];
  vfx.limpar(); limparAnimacoes();
  for (const u of todasDoJogador()) { colocar(u, u.slot); u.root.visible = true; u.morto = false; u.corpo.position.set(0, 0, 0); u.corpo.rotation.set(0, 0, 0); u.opacidade(1); }
  if (S.vida <= 0) return fimDeJogo(false);
  if (!S.rivais.some(r => r.vivo)) return fimDeJogo(true);
  if (S.rodada >= MAX_RODADA) return fimDeJogo(S.rivais.every(r => r.vida <= S.vida));
  const realeza = S.nivelTracos.realeza || 0;
  const ganho = renda(S.rodada, realeza, S.venceuUltima);
  S.rodada++; S.ouro += ganho; setTimeout(() => moedaPop(ganho), 300);
  aviso(`+${ganho} de elixir${realeza ? ' (Realeza 👑)' : ''}`, 'ouro');
  iniciarPreparo();
}
async function fimDeJogo(vitoria) {
  S.fase = 'fim';
  const colocacao = vitoria ? 1 : 1 + S.rivais.filter(r => r.vivo).length;
  $('#fimPremios').innerHTML = '';
  conta.registrarPartida({ venceu: vitoria, rodada: S.rodada, vitoriasRodadas: S.vitorias, colocacao }).then(p => {
    $('#fimPremios').innerHTML = p
      ? `Colocação: ${colocacao}º · +${p.xp} XP · +${p.talentos} talentos ✨${p.subiuNivel ? `<br>🎉 Você subiu para o nível ${p.nivel}!` : ''}${p.novas.length ? `<br>🎁 Desbloqueado: ${p.novas.join(', ')}` : ''}`
      : `Colocação: ${colocacao}º<br><small>Entre com uma conta para ganhar XP e talentos.</small>`;
  });
  $('#fim').className = 'mostrar ' + (vitoria ? 'vitoria' : 'derrota');
  $('#fimTitulo').textContent = vitoria ? 'Vitória Final!' : 'Fim de Jogo';
  $('#fimTexto').innerHTML = vitoria
    ? `Seu exército venceu todos os rivais em ${S.rodada} rodadas!<br><i>“Combati o bom combate, acabei a carreira, guardei a fé.” — 2Tm 4:7</i>`
    : `Você chegou à rodada ${S.rodada} com ${S.vitorias} vitória${S.vitorias === 1 ? "" : "s"}.<br><i>“O justo cai sete vezes e se levanta.” — Pv 24:16</i>`;
}
function novoJogo() {
  camera.position.copy(CAM_JOGO); alvoCamAtual.copy(ALVO_CAM); camera.lookAt(ALVO_CAM); // sem voo de câmera
  for (const u of [...todasDoJogador(), ...S.inimigos, ...S.combatentes]) u.remover();
  S.tabuleiro.clear(); S.banco = Array(BANCO).fill(null); S.inimigos = []; S.combatentes = [];
  const difId = document.querySelector('input[name=dif]:checked')?.value || 'normal';
  const dif = DIFICULDADES[difId];
  const personas = [...PERSONAS].sort(() => Math.random() - 0.5).slice(0, dif.rivais);
  Object.assign(S, { rodada: 1, vida: VIDA_INICIAL, ouro: OURO_INICIAL, nivelTracos: {}, vitorias: 0, dif, difId,
    rivais: personas.map(p => new RivalIA(p, dif)), idxRival: -1, oponente: null });
  vfx.limpar(); limparAnimacoes();
  $('#fim').className = ''; $('#titulo').classList.add('sair');
  setTimeout(() => $('#titulo').style.display = 'none', 600);
  $('#hud').classList.remove('oculta'); $('#tracos').classList.remove('oculta'); $('#barraTempo').classList.remove('oculta');
  vitrineLimpar();
  iniciarPreparo();
}

// ---------------- Combate ----------------
let tremor = 0;
export function tremer(f = 0.25) { tremor = Math.max(tremor, f * 0.35); } // tremor bem sutil
export const animacoes = [];
const temporarios = [];
export function addTemp(obj) { scene.add(obj); temporarios.push(obj); return obj; }
function limparAnimacoes() {
  animacoes.length = 0;
  for (const o of temporarios) scene.remove(o); temporarios.length = 0;
  for (const p of projeteis) scene.remove(p.m); projeteis.length = 0;
}
export function animar(dur, passo, fim) { animacoes.push({ t: 0, dur, passo, fim }); }

export function inimigosDe(u) { return S.combatentes.filter(x => x.vivo && x.time !== u.time && !x.invisivel); }
export function aliadosDe(u) { return S.combatentes.filter(x => x.vivo && x.time === u.time); }
export function dist(a, b) { const p = a.root ? a.root.position : a, q = b.root ? b.root.position : b; return Math.hypot(p.x - q.x, p.z - q.z); }
export function maisProximo(u, lista) { let m = null, d = 1e9; for (const x of lista) { const k = dist(u, x); if (k < d) { d = k; m = x; } } return m; }
export function limitarPos(p) { p.x = THREE.MathUtils.clamp(p.x, -2.3 * T, 2.3 * T); p.z = THREE.MathUtils.clamp(p.z, -3.5 * RS * T, 3.5 * RS * T); return p; }

// ---- grade de combate: cada unidade ocupa exatamente um quadrado ----
const ocupacao = new Map(); // "c,l" -> unidade
const chaveT = (c, l) => c + ',' + l;
const dentroT = (c, l) => c >= 0 && c < COLS && l >= 0 && l < LINHAS * 2;
// distância em hexágonos (coordenadas "odd-r" convertidas para cúbicas)
const cubo = t => { const q = t.c - (t.l - (t.l & 1)) / 2; return [q, t.l, -q - t.l]; };
export const distTile = (a, b) => { const A = cubo(a), B = cubo(b); return Math.max(Math.abs(A[0] - B[0]), Math.abs(A[1] - B[1]), Math.abs(A[2] - B[2])); };
const VIZ = [[[1, 0], [-1, 0], [0, -1], [-1, -1], [0, 1], [-1, 1]], [[1, 0], [-1, 0], [1, -1], [0, -1], [1, 1], [0, 1]]];
export const vizinhos = t => VIZ[t.l & 1].map(([dc, dl]) => ({ c: t.c + dc, l: t.l + dl }));
function tileDe(p) {
  let m = null, md = 1e9;
  for (let l = 0; l < LINHAS * 2; l++) for (let c = 0; c < COLS; c++) { const q = posQuadrado(c, l), d = (q.x - p.x) ** 2 + (q.z - p.z) ** 2; if (d < md) { md = d; m = { c, l }; } }
  return m;
}
function liberar(u) { if (u.tile && ocupacao.get(chaveT(u.tile.c, u.tile.l)) === u) ocupacao.delete(chaveT(u.tile.c, u.tile.l)); }
function ocupar(u, c, l) { liberar(u); u.tile = { c, l }; ocupacao.set(chaveT(c, l), u); }
function tileLivrePerto(p, ignorar) {
  let melhor = null, md = 1e9;
  for (let l = 0; l < LINHAS * 2; l++) for (let c = 0; c < COLS; c++) {
    const o = ocupacao.get(chaveT(c, l)); if (o && o !== ignorar) continue;
    const q = posQuadrado(c, l), d = Math.hypot(q.x - p.x, q.z - p.z);
    if (d < md) { md = d; melhor = { c, l }; }
  }
  return melhor;
}
// reserva o quadrado livre mais perto de `p` e devolve o centro dele (ou null)
export function reservarTile(u, p) { const t = tileLivrePerto(p, u); if (!t) return null; ocupar(u, t.c, t.l); return posQuadrado(t.c, t.l); }
// leva a unidade (animando) para o quadrado livre mais perto de `p`
export function reposicionar(u, p, dur = 0.35, salto = 0, aoChegar) {
  const ini = u.root.position.clone();
  const fim = reservarTile(u, p) || posQuadrado(u.tile.c, u.tile.l);
  u.mov = null; u.ocupado = Math.max(u.ocupado || 0, dur + 0.05);
  animar(dur, k => { u.root.position.lerpVectors(ini, fim, k); if (salto) u.corpo.position.y = Math.sin(k * Math.PI) * salto; },
    () => { u.root.position.copy(fim); u.corpo.position.y = 0; aoChegar?.(); });
  return fim;
}
function maisProximoTile(u, lista) {
  let m = null, d = 1e9;
  for (const x of lista) { if (!x.tile) continue; const k = distTile(u.tile, x.tile) * 10 + dist(u, x) * 0.1; if (k < d) { d = k; m = x; } }
  return m;
}

export function causarDano(fonte, alvo, qtd, opc = {}) {
  if (!alvo.vivo) return 0;
  if (fonte) {
    qtd *= buffMult(fonte, 'dano');
    if (fonte.id === 'sansao' && !fonte.buffs.some(b => b.campo === 'semForca')) qtd *= 1 + (1 - fonte.hp / fonte.maxHp);
  }
  if (alvo.vulneravel > 0) qtd *= 1.25;
  qtd *= buffMult(alvo, 'recebido');
  qtd *= 1 - (alvo.reducao || 0);
  qtd = Math.round(qtd);
  let resto = qtd;
  if (alvo.escudo > 0) { const a = Math.min(alvo.escudo, resto); alvo.escudo -= a; resto -= a; }
  alvo.hp -= resto;
  alvo.mana = Math.min(alvo.maxMana || 0, alvo.mana + 3);
  if (fonte?.roubo) curar(fonte, qtd * fonte.roubo, true);
  if (opc.mostrar) textoFlutuante(alvo, qtd, qtd >= 300 ? 'dano grande' : 'dano');
  alvo.flash = 0.12;
  if (alvo.rig && alvo.rig.susto < 0.3) alvo.rig.sustar();
  if (alvo.livramento && !alvo.livrou && alvo.hp > 0 && alvo.hp < alvo.maxHp * 0.4) {
    alvo.livrou = true; alvo.escudo += alvo.maxHp * alvo.livramento;
    vfx.escudo(alvo.root, '#9fe8ff', 1.2);
    textoFlutuante(alvo, 'Livramento!', 'cura');
  }
  if (alvo.hp <= 0) morrer(alvo);
  return qtd;
}
export function curar(u, qtd, silencioso) {
  if (!u.vivo) return;
  u.hp = Math.min(u.maxHp, u.hp + qtd);
  if (!silencioso) textoFlutuante(u, '+' + Math.round(qtd), 'cura');
}
export function atordoar(u, s) { if (!u.vivo) return; u.atordoado = Math.max(u.atordoado, s); vfx.atordoado(u.root, Math.min(s, 2.5)); }
export function buff(u, campo, mult, dur) { u.buffs.push({ campo, mult, t: dur }); }
function buffMult(u, campo) { let m = 1; for (const b of u.buffs) if (b.campo === campo) m *= b.mult; return m; }

function morrer(u) {
  if (u.id === 'esqueleto_chifres' && !u.reviveu) {
    u.reviveu = true; u.hp = 1; u.atordoado = 1.2; u.invisivel = true;
    vfx.morte(u.root.position, true); vfx.anelChao(u.root.position, '#b070ff', 0.3, 1.6, 1.2, SP.runa, 0.9);
    textoFlutuante(u, 'Os ossos se juntam!', 'roxo');
    animar(1.2, k => { u.corpo.scale.y = ESCALA_ESTRELA[u.estrelas - 1] * Math.max(0.2, Math.abs(1 - 2 * k)); }, () => {
      u.hp = u.maxHp * 0.4; u.invisivel = false; u.aplicarEscala();
      vfx.subir(u.root.position, '#c890ff', 12, 0.5, 2.2, SP.brilho, 0.2, 0.8); vfx.brilho(u.root.position, '#c890ff', 1.8, 0.35);
    });
    return;
  }
  u.morto = true; u.hp = 0; liberar(u);
  vfx.morte(u.root.position, u.def.lado === 'trevas');
  animar(0.9, k => { u.corpo.position.y = -Math.max(0, k - 0.4) * 1.2; u.corpo.rotation.x = -Math.min(1, k * 1.6) * 1.35; u.opacidade(1 - Math.max(0, k - 0.45) / 0.55); }, () => { u.root.visible = false; });
}

const projeteis = [];
// projétil: sem malha (só partículas: cabeça brilhante + rastro), ou com malha própria (pedra, lança)
export function projetil(de, para, opc = {}) {
  const estilo = opc.estilo || TIRO[de.id] || (de.time === 'jogador' ? 'magia' : 'arcano');
  const m = (opc.geo || opc.mat) ? new THREE.Mesh(opc.geo || new THREE.SphereGeometry(0.09, 8, 6), opc.mat || new THREE.MeshBasicMaterial({ color: opc.cor || '#fff' })) : new THREE.Object3D();
  if (m.isMesh) m.castShadow = true;
  m.position.copy(de.root.position); m.position.y = 1.0 * de.corpo.scale.y;
  if (opc.escala) m.scale.setScalar(opc.escala);
  scene.add(m);
  projeteis.push({ m, alvo: para, vel: opc.vel || 11, aoChegar: opc.aoChegar, arco: opc.arco || 0, ini: m.position.clone(), t: 0, estilo, cor: opc.cor, semImpacto: opc.semImpacto });
}
function atualizarProjeteis(dt) {
  for (let i = projeteis.length - 1; i >= 0; i--) {
    const p = projeteis[i];
    const alvoPos = p.alvo.root.position.clone(); alvoPos.y = 0.9;
    const dir = alvoPos.clone().sub(p.m.position);
    const d = dir.length();
    if (d < 0.25 || !p.alvo.vivo) {
      scene.remove(p.m); projeteis.splice(i, 1);
      if (p.alvo.vivo || p.aoChegarSempre) { if (!p.semImpacto) vfx.impacto(p.estilo, p.alvo.root.position); p.aoChegar?.(p.alvo); }
      continue;
    }
    p.m.position.addScaledVector(dir.normalize(), Math.min(d, p.vel * dt));
    if (p.arco) { p.t += dt; p.m.position.y = 0.9 + Math.sin(Math.min(1, p.t * 2.2) * Math.PI) * p.arco; }
    p.m.lookAt(alvoPos);
    vfx.rastro(p.estilo, p.m.position, p.cor && !p.m.isMesh ? p.cor : null);
  }
}

function passoCombate(dt) {
  for (const u of S.combatentes) {
    if (!u.vivo) continue;
    for (const b of u.buffs) b.t -= dt;
    u.buffs = u.buffs.filter(b => b.t > 0);
    if (u.vulneravel > 0) u.vulneravel -= dt;
    // andando de um quadrado para o outro
    if (u.mov) {
      u.mov.t += dt / u.mov.dur;
      const k = Math.min(1, u.mov.t);
      u.root.position.lerpVectors(u.mov.de, u.mov.para, k);
      if (k >= 1) u.mov = null; else { u.andando = true; continue; }
    }
    if (u.atordoado > 0) { u.atordoado -= dt; u.andando = false; continue; }
    if (u.invisivel || u.ocupado > 0) { u.ocupado -= dt; continue; }
    const confuso = u.buffs.some(b => b.campo === 'confuso');
    if (confuso) u.alvo = maisProximoTile(u, aliadosDe(u).filter(x => x !== u && !x.invisivel)) || u.alvo;
    else if (!u.alvo || !u.alvo.vivo || u.alvo.invisivel || u.alvo.time === u.time || (u.bloqueado || 0) > 0.8) { u.alvo = maisProximoTile(u, inimigosDe(u)); u.bloqueado = 0; }
    const a = u.alvo; if (!a || !a.tile) { u.andando = false; continue; }
    const d = distTile(u.tile, a.tile);
    const alcance = u.def.alcance || 1;
    if (d > alcance) {
      // escolhe o quadrado vizinho livre que mais aproxima do alvo
      let melhor = null, bd = d, be = dist(u, a);
      for (const { c, l } of vizinhos(u.tile)) {
        if (!dentroT(c, l) || ocupacao.has(chaveT(c, l))) continue;
        const q = posQuadrado(c, l), nd = distTile({ c, l }, a.tile), ne = Math.hypot(q.x - a.root.position.x, q.z - a.root.position.z);
        if (nd < bd || (nd === bd && ne < be - 0.05)) { melhor = { c, l, q }; bd = nd; be = ne; }
      }
      if (melhor) {
        ocupar(u, melhor.c, melhor.l);
        const diag = false;
        u.mov = { de: u.root.position.clone(), para: melhor.q, t: 0, dur: Math.max(T * 0.9, Math.hypot(melhor.q.x - u.root.position.x, melhor.q.z - u.root.position.z)) * (diag ? 0.96 : 1) / u.velMov };
        u.root.rotation.y = Math.atan2(melhor.q.x - u.root.position.x, melhor.q.z - u.root.position.z);
        u.andando = true; u.bloqueado = 0;
      } else { u.andando = false; u.bloqueado = (u.bloqueado || 0) + dt; }
      continue;
    }
    u.andando = false;
    u.root.rotation.y = Math.atan2(a.root.position.x - u.root.position.x, a.root.position.z - u.root.position.z);
    u.cd -= dt;
    if (u.cd <= 0) {
      u.cd = 1 / (u.vel * buffMult(u, 'vel'));
      u.estocada = 0.18; u.rig?.atacar();
      const dano = u.dano;
      if (u.def.funcao === 'corpo') { causarDano(u, a, dano); vfx.golpe(a.root.position, GOLPE[u.id] || 'corte', u.id === 'miguel' ? '#ffe27a' : u.def.lado === 'trevas' ? '#ffb0d0' : '#fff2c0', u.root.rotation.y); }
      else projetil(u, a, { aoChegar: alvo => causarDano(u, alvo, dano) });
      u.mana += 10 * u.manaMult;
    }
    if (u.maxMana && u.mana >= u.maxMana && !u.invisivel) {
      u.mana = 0;
      const h = HABILIDADES[u.id];
      if (h) { if (u.rig) u.rig.conjurar(); else u.conjuro = 1; vfx.conjurar(u.root.position, u.def.lado === 'trevas' ? '#d08aff' : '#ffe27a'); h(u, a); textoFlutuante(u, u.def.habilidade, 'hab'); }
    }
  }
  // fim?
  const vivosJ = S.combatentes.some(u => u.vivo && u.time === 'jogador');
  const vivosI = S.combatentes.some(u => u.vivo && u.time === 'inimigo');
  S.timer -= dt;
  if (!vivosI) fimCombate(true);
  else if (!vivosJ) fimCombate(false);
  else if (S.timer <= 0) fimCombate(false, true);
}

// animação visual de cada unidade (respirar, golpe, piscar)
function animarUnidades(dt, tempo) {
  const lista = S.fase === 'combate' || S.fase === 'resultado' ? S.combatentes : [...todasDoJogador(), ...S.inimigos, ...vitrine];
  for (const u of lista) {
    if (u.morto) continue;
    u.mixer?.update(dt);
    u.fase += dt * (u.andando ? 10 : 2.2);
    if (u.rig) { const emCombate = S.fase === 'combate'; u.rig.atualizar(dt, emCombate && u.andando && !(u.atordoado > 0)); }
    else if (!u.mixer) {
      // animação procedural de reserva (quadrúpedes, dragão e modelos sem pele utilizável):
      // respiração com "squash & stretch", pulinhos gingando ao andar, bote no ataque, giro ao conjurar
      const andando = u.andando && S.fase === 'combate';
      const pulo = andando ? Math.abs(Math.sin(u.fase)) : 0;
      const resp = Math.sin(u.fase * 0.9);
      u.conjuro = Math.max(0, (u.conjuro || 0) - dt * 1.4);
      const cj = u.conjuro > 0 ? Math.sin((1 - u.conjuro) * Math.PI) : 0;
      u.visual.position.y = pulo * 0.16 + cj * 0.35 + resp * 0.01;
      const sq = andando ? 1 - Math.abs(Math.cos(u.fase)) * 0.08 : 1 + resp * 0.025;
      u.visual.scale.set(1 / Math.sqrt(sq), sq, 1 / Math.sqrt(sq));
      u.visual.rotation.z = andando ? Math.sin(u.fase) * 0.09 : 0;
      u.visual.rotation.y = cj * Math.PI * 2;
    }
    if (u.estocada > 0) { u.estocada -= dt; const k = Math.sin((u.estocada / 0.18) * Math.PI); u.visual.position.z = k * (u.rig ? 0.3 : 0.45); if (!u.rig) u.visual.rotation.x = k * 0.35; } else { u.visual.position.z = 0; }
    if (u.pilar.visible) { u.pilar.material.opacity = 0.08 + Math.sin(tempo * 3 + u.fase) * 0.035; u.pilar.rotation.y += dt; }
    if (u.aura.material.opacity > 0) u.aura.rotation.z += dt * 0.6;
    if (u.flash > 0) {
      u.flash -= dt; u.flashOn = true;
      const f = Math.max(0, u.flash / 0.12);
      for (const x of u.mats) { x.m.emissive.setRGB(1, 0.95, 0.85); x.m.emissiveIntensity = 0.9 * f; }
    } else if (u.flashOn) { u.flashOn = false; for (const x of u.mats) { x.m.emissive.copy(x.e); x.m.emissiveIntensity = x.i; } }
    if (!u.rig && !(u.estocada > 0)) u.visual.rotation.x = u.flash > 0 ? -u.flash * 1.4 : 0;
  }
}

function passoAnimacoes(dt) {
  for (let i = animacoes.length - 1; i >= 0; i--) {
    const a = animacoes[i]; if (!a) continue; a.t += dt;
    const k = Math.min(1, a.t / a.dur); a.passo?.(k, dt);
    if (k >= 1) { animacoes.splice(i, 1); a.fim?.(); }
  }
}

// ---------------- Arrastar e soltar ----------------
const ray = new THREE.Raycaster(), mouse = new THREE.Vector2();
const planoChao = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
let arraste = null; // {u, origem, inicio}
function pontoChao(ev) {
  mouse.set(ev.clientX / innerWidth * 2 - 1, -(ev.clientY / innerHeight) * 2 + 1);
  ray.setFromCamera(mouse, camera);
  const p = new THREE.Vector3(); ray.ray.intersectPlane(planoChao, p); return p;
}
function unidadeSob(ev) {
  mouse.set(ev.clientX / innerWidth * 2 - 1, -(ev.clientY / innerHeight) * 2 + 1);
  ray.setFromCamera(mouse, camera);
  const todas = S.fase === 'combate' || S.fase === 'resultado' ? S.combatentes.filter(u => u.vivo && u.root.visible) : [...todasDoJogador(), ...S.inimigos];
  const hits = ray.intersectObjects(todas.map(u => u.alvoClique), false);
  for (const h of hits) { let o = h.object; while (o && !o.userData.unidade) o = o.parent; if (o) return o.userData.unidade; }
  // tolerância: unidade mais próxima do ponto no chão
  const p = pontoChao(ev); let m = null, md = 0.6;
  for (const u of todas) { const d = Math.hypot(u.root.position.x - p.x, u.root.position.z - p.z); if (d < md) { md = d; m = u; } }
  return m;
}
function slotMaisProximo(p) {
  let melhor = null, md = T * 0.75;
  for (const q of quadrados) if (q.jogador) { const d = Math.hypot(q.malha.position.x - p.x, q.malha.position.z - p.z); if (d < md) { md = d; melhor = { tipo: 'tab', c: q.c, l: q.l }; } }
  slotsBanco.forEach((m, i) => { const d = Math.hypot(m.position.x - p.x, m.position.z - p.z); if (d < md) { md = d; melhor = { tipo: 'banco', i }; } });
  return melhor;
}
function destacar(slot) { arena.destacar(slot, !!arraste); }
renderer.domElement.addEventListener('pointerdown', ev => {
  if (S.fase !== 'preparo' && S.fase !== 'combate' && S.fase !== 'resultado') return;
  const u = unidadeSob(ev);
  if (!u) { $('#info').classList.remove('mostrar'); focar(null); return; }
  mostrarInfo(u); focar(u);
  if (S.fase !== 'preparo' || u.time !== 'jogador') return;
  arraste = { u, origem: u.slot, x: ev.clientX, y: ev.clientY };
  renderer.domElement.setPointerCapture(ev.pointerId);
});
let emFoco = null; // nome aparece só ao passar o mouse / tocar
function focar(u) { if (emFoco === u) return; emFoco?.ui.classList.remove('foco'); emFoco = u; u?.ui.classList.add('foco'); }
renderer.domElement.addEventListener('pointermove', ev => {
  if (!arraste) { if (ev.pointerType === 'mouse' && S.fase !== 'titulo') focar(unidadeSob(ev)); return; }
  const p = pontoChao(ev);
  arraste.u.root.position.set(p.x, 0.5, p.z);
  const sobreLoja = ev.clientY > $('#loja').getBoundingClientRect().top;
  $('#loja').classList.toggle('vender', sobreLoja);
  $('#vendaTxt').textContent = `Soltar para vender por ${arraste.u.custoTotal} de elixir`;
  destacar(sobreLoja ? null : slotMaisProximo(p));
});
renderer.domElement.addEventListener('pointerup', ev => {
  if (!arraste) return;
  const { u, origem } = arraste;
  const sobreLoja = ev.clientY > $('#loja').getBoundingClientRect().top;
  arraste = null; destacar(null); $('#loja').classList.remove('vender');
  if (sobreLoja) return vender(u);
  const alvo = slotMaisProximo(pontoChao(ev));
  if (!alvo) { colocar(u, origem); return; }
  const outro = ocupante(alvo);
  if (outro === u) { colocar(u, origem); return; }
  if (alvo.tipo === 'tab' && origem.tipo === 'banco' && !outro && S.tabuleiro.size >= capCampo()) {
    aviso(`Limite de ${capCampo()} unidades em campo nesta rodada!`, 'erro'); colocar(u, origem); return;
  }
  tirar(u); if (outro) { tirar(outro); colocar(outro, origem); }
  colocar(u, alvo);
  atualizarTracos(); desenharLoja();
});
function soltarArraste() { if (arraste) { colocar(arraste.u, arraste.origem); arraste = null; destacar(null); $('#loja').classList.remove('vender'); } }

function mostrarInfo(u) {
  const d = u.def, i = $('#info');
  i.innerHTML = `<h4>${'★'.repeat(u.estrelas)} ${d.nome}</h4>
    <div class="tr">${(d.tracos || []).map(t => `<span>${TRACOS[t].icone} ${TRACOS[t].nome}</span>`).join('')}</div>
    <p><b>${d.habilidade || ''}</b> ${d.descHab || ''}</p>
    <p class="st">❤ ${Math.round(u.maxHp || d.vida * MULT_ESTRELA[u.estrelas - 1])} · ⚔ ${Math.round(u.dano || d.dano * MULT_ESTRELA[u.estrelas - 1])} · ${d.funcao === 'corpo' ? 'Corpo a corpo' : 'Alcance ' + d.alcance}${d.mana ? ' · Mana ' + d.mana : ''}</p>
    ${d.frase ? `<p class="fr">${d.frase}</p>` : ''}`;
  i.classList.add('mostrar');
}

// ---------------- Tela de título (vitrine) ----------------
let vitrine = [];
function montarVitrine() {
  const ids = ['moises', 'davi', 'ester', 'sansao', 'elias', 'golias', 'dragao', 'farao', 'leviata', 'miguel'];
  ids.forEach((id, k) => {
    const u = new Unidade(id, 1, UNIDADES[id].lado === 'trevas' ? 'inimigo' : 'jogador');
    const lado = UNIDADES[id].lado === 'trevas';
    const idx = lado ? k - 5 : k;
    u.root.position.copy(posQuadrado(idx, lado ? 2 : 5));
    u.ui.style.display = 'none';
    vitrine.push(u);
  });
}
function vitrineLimpar() { for (const u of vitrine) u.remover(); vitrine = []; }

// ---------------- Loop ----------------
function redimensionar() {
  renderer.setSize(innerWidth, innerHeight);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  enquadrar();
}
// câmera fixa estilo Clash. Celular em pé: atrás do seu lado, inclinada. Tela deitada: vista lateral
// (seu lado à esquerda, inimigo à direita), assim o tabuleiro ocupa a largura da tela.
const _sol0 = new THREE.Vector3(-9, 14, 4), _contra0 = new THREE.Vector3(5, 8, -10);
function enquadrar() {
  const W = innerWidth, H = innerHeight, retrato = W / H < 0.8, lateral = W / H > 1.15;
  const yawAntes = YAW; YAW = lateral ? Math.PI / 2 : 0;
  const topo = retrato ? 132 : 64, base = retrato ? 178 : 132;
  const yMax = 1 - 2 * topo / H, yMin = -1 + 2 * base / H;
  const margem = retrato ? 0 : lateral ? (W > 1000 ? 178 : W > 700 ? 150 : 8) : 8;
  const xMin = -1 + 2 * margem / W, xMax = 1 - 2 * margem / W;
  camera.fov = retrato ? 36 : 30; camera.updateProjectionMatrix();
  // enquadra o campo inteiro, os dois bancos e as plataformas dos Governantes (vista alta, como no Combinações Táticas)
  const bx = arena.XW, P = (x, y, z) => new THREE.Vector3(x, y, z), pj = arena.plataformas.jogador, pi = arena.plataformas.inimigo;
  const pts = [P(-bx, 0, arena.ZT), P(bx, 0, arena.ZT), P(-bx, 0, arena.ZF), P(bx, 0, arena.ZF), P(-X0, 1.6, -ZB + T * 0.4), P(X0, 1.6, -ZB + T * 0.4),
    P(pj.x + 1.2, 0, pj.z), P(pi.x - 1.2, 0, pi.z), P(pi.x, 2.2, pi.z - 0.5), P(-bx, 1.2, arena.ZT), P(-X0 - 1.5, 0, 0), P(X0 + 1.5, 0, 0)];
  const elev = THREE.MathUtils.degToRad(retrato ? 63 : lateral ? 60 : 58);
  const dir = new THREE.Vector3(Math.sin(YAW) * Math.cos(elev), Math.sin(elev), Math.cos(YAW) * Math.cos(elev));
  const fwd = new THREE.Vector3(-Math.sin(YAW), 0, -Math.cos(YAW)), dirX = new THREE.Vector3(Math.cos(YAW), 0, -Math.sin(YAW));
  const alvo = new THREE.Vector3(0, 0, 0); let d = 20;
  const cam = camera.clone(); const v = new THREE.Vector3();
  for (let i = 0; i < 120; i++) {
    cam.position.copy(alvo).addScaledVector(dir, d); cam.lookAt(alvo); cam.updateMatrixWorld(); cam.updateProjectionMatrix();
    let minY = 9, maxY = -9, minX = 9, maxX = -9;
    for (const p of pts) { v.copy(p).project(cam); minY = Math.min(minY, v.y); maxY = Math.max(maxY, v.y); minX = Math.min(minX, v.x); maxX = Math.max(maxX, v.x); }
    const esc = Math.max((maxY - minY) / (yMax - yMin), (maxX - minX) / (xMax - xMin));
    d *= Math.pow(esc, 0.6);
    alvo.addScaledVector(fwd, ((maxY + minY) / 2 - (yMax + yMin) / 2) * d * 0.25);
    alvo.addScaledVector(dirX, ((maxX + minX) / 2 - (xMax + xMin) / 2) * d * 0.25);
  }
  CAM_JOGO.copy(alvo).addScaledVector(dir, d); ALVO_CAM.copy(alvo);
  sol.position.copy(_sol0).applyAxisAngle(new THREE.Vector3(0, 1, 0), YAW);
  contraLuz.position.copy(_contra0).applyAxisAngle(new THREE.Vector3(0, 1, 0), YAW);
  if (yawAntes !== YAW && S.fase === 'preparo') {
    for (const u of todasDoJogador()) if (u.slot) colocar(u, u.slot);
    if (true) for (const u of S.inimigos) u.root.rotation.y = YAW ? YAW - 0.7 : 0;
  }
}
addEventListener('resize', redimensionar); redimensionar();

let tempo = 0, ultimo = performance.now();
const alvoCamAtual = new THREE.Vector3(0, 0.6, 0);
function loop() {
  requestAnimationFrame(loop);
  const agora = performance.now(); const dt = Math.min(0.05, (agora - ultimo) / 1000); ultimo = agora; tempo += dt;
  if (S.fase === 'titulo') {
    const ang = tempo * 0.1, r = innerWidth / innerHeight < 0.8 ? 15 : 13.5;
    camera.position.set(Math.sin(ang) * r, r * 0.85, Math.cos(ang) * r);
    camera.lookAt(0, 0.4, 0.5);
  } else {
    camera.position.lerp(CAM_JOGO, Math.min(1, dt * 4)); alvoCamAtual.lerp(ALVO_CAM, Math.min(1, dt * 4)); camera.lookAt(alvoCamAtual);
    if (tremor > 0) {
      camera.position.x += (Math.random() - 0.5) * tremor; camera.position.y += (Math.random() - 0.5) * tremor * 0.6;
      tremor = Math.max(0, tremor - dt * 1.4);
    }
  }
  animarReis(dt);
  if (S.fase === 'preparo' || S.fase === 'combate') {
    const tot = S.fase === 'preparo' ? TEMPO_PREPARO : TEMPO_COMBATE;
    $('#barraTempo i').style.width = Math.max(0, Math.min(1, (S.timer - (S.fase === 'preparo' ? dt : 0)) / tot)) * 100 + '%';
    $('#barraTempo').classList.toggle('combate', S.fase === 'combate');
  }
  if (S.fase === 'preparo') {
    S.timer -= dt;
    $('#timer').textContent = Math.max(0, Math.ceil(S.timer));
    if (S.timer <= 0) lutar();
  } else if (S.fase === 'combate') {
    $('#timer').textContent = Math.max(0, Math.ceil(S.timer));
    for (let i = 0; i < (S.velocidade || 1) && S.fase === 'combate'; i++) { passoCombate(dt); if (i) { atualizarProjeteis(dt); passoAnimacoes(dt); vfx.update(dt); } }
    $('#timer').textContent = Math.max(0, Math.ceil(S.timer));
  } else if (S.fase === 'resultado') {
    S.resultadoTimer -= dt;
    if (S.resultadoTimer <= 0) proximaRodada();
  }
  if (S.fase === 'combate' || S.fase === 'resultado') atualizarProjeteis(dt);
  passoAnimacoes(dt);
  animarUnidades(dt, tempo);
  arena.atualizar(tempo);
  vfx.update(dt);
  if (!contextoPerdido) renderer.render(scene, camera);
  atualizarRotulos();
}

// ---------------- Início ----------------
$('#btnJogar').addEventListener('click', novoJogo);
$('#btnDeNovo').addEventListener('click', novoJogo);
$('#btnMenu').addEventListener('click', () => location.reload());
$('#btnLutar').addEventListener('click', lutar);
$('#btnTracos').addEventListener('click', () => $('#tracos').classList.toggle('aberto'));
$('#btnRenovar').addEventListener('click', () => {
  if (S.fase !== 'preparo' || S.ouro < 1) return;
  S.ouro--; renovarLoja(); atualizarHUD();
});
addEventListener('keydown', e => {
  if (e.key === 'd' || e.key === 'D') $('#btnRenovar').click();
  if (e.key === ' ' && S.fase === 'preparo') { e.preventDefault(); lutar(); }
});

iniciarHabilidades({ scene, vfx, T }); definirCamera(camera);

// ---------------- Conta / perfil ----------------
let abaConta = 'entrar';
function desenharConta() {
  const el = $('#conta'), u = conta.usuarioAtual;
  if (u) {
    const ini = conta.xpDoNivel(u.nivel), prox = conta.xpDoNivel(u.nivel + 1);
    el.innerHTML = `<div class="perfil"><div class="av">${u.usuario[0].toUpperCase()}</div><div style="flex:1">
      <b>${u.usuario}</b> · Nível ${u.nivel}<div class="xp"><i style="width:${(u.xp - ini) / (prox - ini) * 100}%"></i></div>
      <small>${u.xp} XP · ✨ ${u.talentos} talentos · 🏆 ${u.vitorias} vitórias em ${u.partidas} partidas</small>
      ${u.recompensas.length ? `<div class="premios">${u.recompensas.map(r => `<span>🎁 ${r}</span>`).join('')}</div>` : ''}
      </div><button class="sair" id="btnSair">Sair</button></div>`;
    $('#btnSair').onclick = async () => { await conta.sair(); desenharConta(); };
    return;
  }
  el.innerHTML = `<div class="abas"><button data-a="entrar" class="${abaConta === 'entrar' ? 'on' : ''}">Entrar</button><button data-a="criar" class="${abaConta === 'criar' ? 'on' : ''}">Criar conta</button></div>
    <input id="cUsuario" placeholder="Nome de usuário" autocomplete="username">
    <input id="cSenha" type="password" placeholder="Senha" autocomplete="${abaConta === 'criar' ? 'new-password' : 'current-password'}">
    <div class="erro" id="cErro"></div>
    <div class="acoes"><button id="cOk">${abaConta === 'criar' ? 'Criar conta' : 'Entrar'}</button></div>
    <small>Ou jogue como convidado (sem salvar progresso).</small>`;
  el.querySelectorAll('.abas button').forEach(b => b.onclick = () => { abaConta = b.dataset.a; desenharConta(); });
  const ok = async () => {
    try {
      const n = $('#cUsuario').value, s = $('#cSenha').value;
      if (abaConta === 'criar') await conta.criarConta(n, s); else await conta.entrar(n, s);
      desenharConta();
    } catch (e) { $('#cErro').textContent = e.message; }
  };
  $('#cOk').onclick = ok;
  $('#cSenha').onkeydown = e => { if (e.key === 'Enter') ok(); };
}
conta.restaurarSessao().then(desenharConta);
vfx.precarregar();
$('#carregando').textContent = 'Carregando modelos…';
modelos.iniciar({ ...UNIDADES, ...INVOCACOES }, (n, tot) => $('#carregando').textContent = `Carregando modelos 3D… ${n}/${tot}`)
  .then(() => {
    $('#carregando').textContent = modelos.disponiveis.size ? `${Object.keys(modelos.gltfs).length} modelos 3D carregados` : '';
    $('#btnJogar').disabled = false;
    gerarRetratos();
    montarVitrine();
    carregarArenaGLB();
  });
// modelos da arena (torres, ponte, palmeira...) feitos na Tripo, se existirem em assets/models/arena
async function carregarArenaGLB() {
  try {
    const r = await fetch('assets/models/arena/arena.json', { cache: 'no-store' }); if (!r.ok) return;
    const lista = await r.json(); if (!lista.length) return;
    const mapa = {};
    await Promise.all(lista.map(k => new Promise(res => modelos.loader.load(`assets/models/arena/${k}.glb`, g => { mapa[k] = g.scene; res(); }, undefined, () => res()))));
    const usados = arena.usarModelos(mapa);
    console.log('Arena: modelos usados', usados.join(', '));
  } catch (e) { /* sem modelos: fica o procedural */ }
}
const retratos = {};
// Retratos da loja/placar: desenhados UMA vez, pequenos (128x96), com o próprio renderer do jogo num canto
// da tela e copiados na hora para um canvas 2D. Antes era um segundo WebGLRenderer, que no iPhone
// reenviava TODAS as texturas para outro contexto (memória de GPU em dobro → Safari derrubava a aba).
function gerarRetratos() {
  const W = 128, H = 96;
  try {
    const cena = new THREE.Scene();
    cena.add(new THREE.HemisphereLight('#fff6e8', '#6a5070', 2.4));
    const l = new THREE.DirectionalLight('#ffe8c8', 3.0); l.position.set(2, 3, 4); cena.add(l);
    const frente = new THREE.DirectionalLight('#ffffff', 1.4); frente.position.set(0, 1, 5); cena.add(frente);
    const borda = new THREE.DirectionalLight('#c8e0ff', 2.0); borda.position.set(-3, 2, -3); cena.add(borda);
    const cam = new THREE.PerspectiveCamera(30, W / H, 0.1, 50);
    const pr = renderer.getPixelRatio(), tela = renderer.domElement;
    const out = document.createElement('canvas'); out.width = W; out.height = H; const g = out.getContext('2d');
    const tm = renderer.toneMapping, ex = renderer.toneMappingExposure, cor = new THREE.Color(); renderer.getClearColor(cor); const alfa = renderer.getClearAlpha();
    renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.35;
    renderer.setScissorTest(true); renderer.setViewport(0, 0, W / pr, H / pr); renderer.setScissor(0, 0, W / pr, H / pr);
    renderer.setClearColor(0x000000, 0); renderer.shadowMap.autoUpdate = false;
    for (const id of Object.keys(UNIDADES)) {
      const def = UNIDADES[id];
      const { obj } = modelos.criar(id, def, false);
      const caixa = new THREE.Box3().setFromObject(obj); const h = Math.max(0.5, caixa.max.y);
      obj.rotation.y = -0.35; cena.add(obj);
      if (modelos.gltfs[id]) { obj.rotation.y = -0.3; cam.position.set(0, h * 0.78, h * 1.25); cam.lookAt(0, h * 0.68, 0); }
      else { cam.position.set(0, h * 0.62, h * 2.0); cam.lookAt(0, h * 0.55, 0); }
      renderer.clear(); renderer.render(cena, cam);
      g.clearRect(0, 0, W, H); g.drawImage(tela, 0, tela.height - H, W, H, 0, 0, W, H); // lido antes de a tela ser apresentada
      retratos[id] = out.toDataURL('image/png');
      cena.remove(obj);
    }
    renderer.setScissorTest(false); renderer.setClearColor(cor, alfa); renderer.shadowMap.autoUpdate = true;
    renderer.toneMapping = tm; renderer.toneMappingExposure = ex;
    const tam = renderer.getSize(new THREE.Vector2()); renderer.setViewport(0, 0, tam.x, tam.y); renderer.render(scene, camera); // repinta o quadro normal antes de apresentar
  } catch (e) { console.warn('Retratos não gerados', e); }
  if (S.fase === 'preparo') desenharLoja();
}
loop();

// ganchos para testes automáticos
window.__jogo = { modelos, aplicarRim, atualizarHUD, vfx, arena, renderer, sol, scene, S, conta, tremer, HABILIDADES, camera, CAM_JOGO, ALVO_CAM, posQuadrado, aplicarAura, niveis, lutar, comprar, novoJogo, renovar: renovarLoja, verificarFusoes, Unidade, colocar, atualizarTracos, desenharLoja, UNIDADES };
