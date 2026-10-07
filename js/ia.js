// Rivais controlados pelo computador. Cada um tem sua própria economia e usa
// as MESMAS regras da loja do jogador: compra buscando sinergias, guarda pares
// para fundir, renova a loja com critério e posiciona tanques na frente.
import { UNIDADES, TRACOS } from './units.js';
import { novaLoja, limiteCampo, contarTracos, niveis, renda, TAM_BANCO, VIDA_INICIAL, OURO_INICIAL } from './regras.js';

export const PERSONAS = [
  { nome: 'Faraó Ramessés', avatar: 'farao', foco: ['egito', 'realeza'] },
  { nome: 'Golias de Gate', avatar: 'golias', foco: ['filisteus', 'gigantes'] },
  { nome: 'Sombra do Abismo', avatar: 'figura_sombria', foco: ['trevas', 'bestas'] },
  { nome: 'Juíza de Ramá', avatar: 'debora', foco: ['juizes', 'profetas'] },
  { nome: 'Capitão de Jericó', avatar: 'josue', foco: ['valentes', 'alianca'] },
  { nome: 'Senhor de Babel', avatar: 'ninrode', foco: ['gigantes', 'egito'] },
  { nome: 'Escriba de Nínive', avatar: 'jonas', foco: ['livramento', 'profetas'] },
  { nome: 'Rei de Moabe', avatar: 'balaao', foco: ['realeza', 'valentes'] },
  { nome: 'Conselheiro de Susã', avatar: 'hama', foco: ['intriga', 'trevas'] },
  { nome: 'Hoste de Querubins', avatar: 'gabriel', foco: ['celestial', 'profetas'] },
];

export const DIFICULDADES = {
  facil:   { nome: 'Fácil',   rivais: 3, rerolls: 0, rendaExtra: -1, ruido: 0.45, contra: false, escala: 0.9 },
  normal:  { nome: 'Normal',  rivais: 5, rerolls: 2, rendaExtra: 0,  ruido: 0.12, contra: true,  escala: 1.0 },
  dificil: { nome: 'Difícil', rivais: 7, rerolls: 5, rendaExtra: 1,  ruido: 0,    contra: true,  escala: 1.08 },
};

const ASSASSINOS = ['jael', 'leao_lobo', 'javali_besta', 'jonas'];

export class RivalIA {
  constructor(persona, dif) {
    this.nome = persona.nome; this.avatar = persona.avatar; this.foco = [...persona.foco]; this.dif = dif;
    this.vida = VIDA_INICIAL; this.ouro = OURO_INICIAL; this.unidades = []; // {id, estrelas}
    this.venceuUltima = false;
  }
  get vivo() { return this.vida > 0; }

  // ---- economia: chamada no começo de cada fase de preparo ----
  turno(rodada) {
    if (rodada > 1) this.ouro += Math.max(1, renda(rodada - 1, niveis(this.time(rodada - 1)).realeza, this.venceuUltima) + this.dif.rendaExtra);
    if (rodada >= 4) this.adaptarFoco();
    let rerolls = this.dif.rerolls;
    for (let tentativa = 0; tentativa < 8; tentativa++) {
      const loja = novaLoja(rodada);
      const ordem = loja.map(id => ({ id, s: this.pontuar(id, rodada) })).sort((a, b) => b.s - a.s);
      for (const c of ordem) {
        const custo = UNIDADES[c.id].custo;
        const limiar = this.unidades.length < limiteCampo(rodada) ? -99 : this.ouro >= 9 ? 2 : 3.5;
        if (c.s < limiar || this.ouro < custo) continue;
        if (this.unidades.length >= limiteCampo(rodada) + TAM_BANCO && !this.abrirEspaco(c.s, rodada)) continue;
        this.ouro -= custo; this.unidades.push({ id: c.id, estrelas: 1 }); this.fundir();
      }
      // renova se ainda tem ouro e ainda procura cópias/sinergias
      if (rerolls > 0 && this.ouro >= 3) { rerolls--; this.ouro--; } else break;
    }
  }

  pontuar(id, rodada) {
    const d = UNIDADES[id];
    let s = d.custo * (rodada >= 6 ? 1.1 : 0.6);
    const c1 = this.unidades.filter(u => u.id === id && u.estrelas === 1).length;
    const c2 = this.unidades.filter(u => u.id === id && u.estrelas === 2).length;
    s += c1 === 1 ? 3 : c1 >= 2 ? 7 : 0;
    if (c2) s += 1.5;
    const cont = contarTracos(this.unidades);
    const jaTem = this.unidades.some(u => u.id === id);
    for (const t of d.tracos) {
      if (this.foco.includes(t)) s += 2.5;
      const n = (cont[t] || 0) + (jaTem ? 0 : 1);
      if (!jaTem && TRACOS[t].niveis.includes(n)) s += 3; else if (n > 1) s += 0.6;
    }
    return s + Math.random() * 6 * this.dif.ruido;
  }

  abrirEspaco(scoreNovo, rodada) {
    // vende a unidade 1★ menos útil (que não seja par para fusão)
    let pior = null, ps = 1e9;
    for (const u of this.unidades) {
      if (u.estrelas > 1) continue;
      const pares = this.unidades.filter(x => x.id === u.id && x.estrelas === 1).length;
      const s = (pares >= 2 ? 6 : 0) + UNIDADES[u.id].tracos.filter(t => this.foco.includes(t)).length * 2.5 + UNIDADES[u.id].custo;
      if (s < ps) { ps = s; pior = u; }
    }
    if (!pior || ps >= scoreNovo - 1) return false;
    this.unidades.splice(this.unidades.indexOf(pior), 1);
    this.ouro += UNIDADES[pior.id].custo;
    return true;
  }

  fundir() {
    for (let g = 0; g < 6; g++) {
      const grupos = {};
      for (const u of this.unidades) if (u.estrelas < 3) (grupos[u.id + '_' + u.estrelas] ||= []).push(u);
      const gr = Object.values(grupos).find(x => x.length >= 3); if (!gr) return;
      gr[0].estrelas++; this.unidades = this.unidades.filter(u => u !== gr[1] && u !== gr[2]);
    }
  }

  adaptarFoco() {
    const cont = contarTracos(this.unidades);
    const tops = Object.keys(cont).filter(t => t !== 'celestial').sort((a, b) => (cont[b] + (this.foco.includes(b) ? 0.5 : 0)) - (cont[a] + (this.foco.includes(a) ? 0.5 : 0)));
    if (tops.length >= 2) this.foco = tops.slice(0, 2);
  }

  valor(u) { return UNIDADES[u.id].custo * Math.pow(3, u.estrelas - 1); }

  // escolhe quem vai a campo: os mais fortes, priorizando completar níveis de traço
  time(rodada) {
    const cap = limiteCampo(rodada);
    const ordenadas = [...this.unidades].sort((a, b) => this.valor(b) - this.valor(a));
    const escolhidas = [];
    for (const u of ordenadas) {
      if (escolhidas.length >= cap) break;
      if (escolhidas.some(x => x.id === u.id) && ordenadas.length > cap) continue; // evita repetidos se houver opção
      escolhidas.push(u);
    }
    for (const u of ordenadas) { if (escolhidas.length >= cap) break; if (!escolhidas.includes(u)) escolhidas.push(u); }
    return escolhidas;
  }

  // posiciona no lado de cima (linhas 0..3; a linha 3 é a da frente).
  // timeJogador: [{id, estrelas, c, l}] para contra-posicionamento
  posicionar(rodada, timeJogador = []) {
    const time = this.time(rodada);
    const tanques = time.filter(u => UNIDADES[u.id].funcao === 'corpo').sort((a, b) => UNIDADES[b.id].vida - UNIDADES[a.id].vida);
    const dist = time.filter(u => UNIDADES[u.id].funcao !== 'corpo').sort((a, b) => this.valor(b) - this.valor(a));
    let colsFrente = [2, 1, 3, 0, 4], colsTras = [2, 1, 3, 0, 4];
    if (this.dif.contra && timeJogador.length) {
      // ameaça por coluna: corpo a corpo forte do jogador
      const ameaca = [0, 0, 0, 0, 0];
      for (const u of timeJogador) ameaca[u.c] += UNIDADES[u.id].custo * Math.pow(3, u.estrelas - 1) * (UNIDADES[u.id].funcao === 'corpo' ? 1.5 : 0.7);
      colsFrente = [0, 1, 2, 3, 4].sort((a, b) => ameaca[b] - ameaca[a]);   // tanques bloqueiam onde o jogador é forte
      colsTras = [0, 1, 2, 3, 4].sort((a, b) => ameaca[a] - ameaca[b]);     // atiradores longe do perigo
    }
    const temAssassino = timeJogador.some(u => ASSASSINOS.includes(u.id));
    const res = [], usados = new Set();
    const por = (u, linhas, cols) => {
      for (const l of linhas) for (const c of cols) if (!usados.has(c + ',' + l)) { usados.add(c + ',' + l); res.push({ ...u, c, l }); return; }
    };
    for (const u of tanques) por(u, [3, 2, 1, 0], colsFrente);
    // contra assassinos, os atiradores ficam na 2ª linha (perto dos tanques)
    for (const u of dist) por(u, temAssassino && this.dif.contra ? [1, 0, 2, 3] : [0, 1, 2, 3], colsTras);
    return res;
  }

  poder(rodada) {
    const t = this.time(rodada);
    const nv = niveis(t);
    return t.reduce((s, u) => s + this.valor(u), 0) + Object.values(nv).reduce((a, b) => a + b * 1.5, 0);
  }
}
