// Regras compartilhadas entre o jogador e os rivais (mesma loja, mesma economia).
import { UNIDADES, TRACOS } from './units.js';

export const VIDA_INICIAL = 30;
export const OURO_INICIAL = 6;
export const TAM_BANCO = 5;
export const TAM_LOJA = 5;
export const limiteCampo = rodada => Math.min(8, rodada + 1);
export const POOL = Object.keys(UNIDADES);

// chances por custo de acordo com a rodada
export function pesosCusto(rodada) {
  return [0, Math.max(15, 75 - rodada * 6), Math.min(45, 20 + rodada * 4), rodada < 3 ? 6 : Math.min(42, 6 + (rodada - 2) * 5)];
}
export function sortearUnidade(rodada) {
  const w = pesosCusto(rodada);
  const pesos = POOL.map(id => w[UNIDADES[id].custo]);
  let r = Math.random() * pesos.reduce((a, b) => a + b, 0);
  for (let i = 0; i < POOL.length; i++) { r -= pesos[i]; if (r <= 0) return POOL[i]; }
  return POOL[0];
}
export const novaLoja = rodada => Array.from({ length: TAM_LOJA }, () => sortearUnidade(rodada));

// renda ao fim de cada rodada
export function renda(rodada, nivelRealeza, venceu) {
  return 4 + Math.min(4, Math.floor(rodada / 3)) + (venceu ? 1 : 0) + [0, 1, 3][nivelRealeza || 0];
}
// dano à vida de quem perde a rodada
export const danoDerrota = (rodada, sobreviventes) => 2 + sobreviventes * 2 + Math.floor(rodada / 3);

export function contarTracos(lista) {
  const ids = new Set(lista.map(u => u.id));
  const cont = {};
  for (const id of ids) for (const t of (UNIDADES[id]?.tracos || [])) cont[t] = (cont[t] || 0) + 1;
  return cont;
}
export const nivelDe = (t, n) => TRACOS[t].niveis.filter(x => n >= x).length;
export function niveis(lista) {
  const c = contarTracos(lista), r = {};
  for (const t in c) r[t] = nivelDe(t, c[t]);
  return r;
}
