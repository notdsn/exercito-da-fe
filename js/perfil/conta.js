// Contas locais: criar conta, entrar, sair, e recompensas por partida.
// A senha nunca é guardada: guardamos SHA-256(sal + senha) com um sal aleatório por usuário.
import { armazenamento } from './armazenamento.js';

const hex = buf => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');

async function sha256(texto) {
  const dados = new TextEncoder().encode(texto);
  if (globalThis.crypto?.subtle) return hex(await crypto.subtle.digest('SHA-256', dados));
  return sha256Js(dados); // fallback (ex.: página aberta por IP da rede, sem HTTPS)
}
function gerarSal() {
  const b = new Uint8Array(16);
  if (globalThis.crypto?.getRandomValues) crypto.getRandomValues(b); else for (let i = 0; i < 16; i++) b[i] = Math.random() * 256;
  return hex(b);
}

export const RECOMPENSAS = [
  { nivel: 2, nome: 'Estandarte de Judá' },
  { nivel: 3, nome: 'Moldura Dourada' },
  { nivel: 5, nome: 'Cajado de Moisés (cosmético)' },
  { nivel: 7, nome: 'Tabuleiro: Templo de Salomão' },
  { nivel: 10, nome: 'Aura Celestial' },
];
export const nivelPorXp = xp => Math.floor(Math.sqrt(xp / 100)) + 1;
export const xpDoNivel = n => (n - 1) * (n - 1) * 100;

export let usuarioAtual = null;

function validar(nome, senha) {
  if (!/^[\p{L}0-9_.-]{3,20}$/u.test(nome || '')) return 'Nome de usuário: 3 a 20 letras/números.';
  if ((senha || '').length < 4) return 'A senha precisa ter pelo menos 4 caracteres.';
  return null;
}

export async function criarConta(nome, senha) {
  nome = nome.trim();
  const erro = validar(nome, senha); if (erro) throw new Error(erro);
  if (await armazenamento.obterUsuario(nome)) throw new Error('Esse nome de usuário já existe.');
  const sal = gerarSal();
  const u = {
    usuario: nome, sal, hash: await sha256(sal + senha), criadoEm: new Date().toISOString(),
    xp: 0, nivel: 1, talentos: 0, vitorias: 0, partidas: 0, melhorRodada: 0, recompensas: [],
  };
  await armazenamento.salvarUsuario(u); await armazenamento.definirSessao(u.usuario);
  return (usuarioAtual = u);
}
export async function entrar(nome, senha) {
  const u = await armazenamento.obterUsuario(nome.trim());
  if (!u || (await sha256(u.sal + senha)) !== u.hash) throw new Error('Usuário ou senha incorretos.');
  await armazenamento.definirSessao(u.usuario);
  return (usuarioAtual = u);
}
export async function sair() { usuarioAtual = null; await armazenamento.definirSessao(null); }
export async function restaurarSessao() {
  const nome = await armazenamento.obterSessao();
  usuarioAtual = nome ? await armazenamento.obterUsuario(nome) : null;
  return usuarioAtual;
}

// Chamada ao fim de cada partida. Retorna o resumo dos prêmios (ou null se convidado).
export async function registrarPartida({ venceu, rodada, vitoriasRodadas, colocacao }) {
  if (!usuarioAtual) return null;
  const u = usuarioAtual;
  const xp = rodada * 10 + vitoriasRodadas * 15 + (venceu ? 150 : 0);
  const talentos = vitoriasRodadas * 2 + (venceu ? 25 : 0) + Math.max(0, 8 - (colocacao || 8)) * 2;
  const nivelAntes = u.nivel;
  u.xp += xp; u.talentos += talentos; u.partidas++; if (venceu) u.vitorias++;
  u.melhorRodada = Math.max(u.melhorRodada, rodada);
  u.nivel = nivelPorXp(u.xp);
  const novas = RECOMPENSAS.filter(r => r.nivel <= u.nivel && !u.recompensas.includes(r.nome)).map(r => r.nome);
  u.recompensas.push(...novas);
  await armazenamento.salvarUsuario(u);
  return { xp, talentos, subiuNivel: u.nivel > nivelAntes, nivel: u.nivel, novas };
}

// ---- SHA-256 em JS puro (só usado se crypto.subtle não existir) ----
function sha256Js(bytes) {
  const K = [0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070, 0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2];
  const H = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
  const l = bytes.length, nb = ((l + 9 + 63) >> 6) << 6, m = new Uint8Array(nb);
  m.set(bytes); m[l] = 0x80;
  const dv = new DataView(m.buffer); dv.setUint32(nb - 4, l * 8); dv.setUint32(nb - 8, Math.floor(l / 0x20000000));
  const w = new Uint32Array(64), r = (x, n) => (x >>> n) | (x << (32 - n));
  for (let o = 0; o < nb; o += 64) {
    for (let i = 0; i < 16; i++) w[i] = dv.getUint32(o + i * 4);
    for (let i = 16; i < 64; i++) {
      const s0 = r(w[i - 15], 7) ^ r(w[i - 15], 18) ^ (w[i - 15] >>> 3), s1 = r(w[i - 2], 17) ^ r(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0;
    }
    let [a, b, c, d, e, f, g, h] = H;
    for (let i = 0; i < 64; i++) {
      const t1 = (h + (r(e, 6) ^ r(e, 11) ^ r(e, 25)) + ((e & f) ^ (~e & g)) + K[i] + w[i]) | 0;
      const t2 = ((r(a, 2) ^ r(a, 13) ^ r(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) | 0;
      h = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
    }
    H[0] = (H[0] + a) | 0; H[1] = (H[1] + b) | 0; H[2] = (H[2] + c) | 0; H[3] = (H[3] + d) | 0;
    H[4] = (H[4] + e) | 0; H[5] = (H[5] + f) | 0; H[6] = (H[6] + g) | 0; H[7] = (H[7] + h) | 0;
  }
  return H.map(x => (x >>> 0).toString(16).padStart(8, '0')).join('');
}
export const _testeSha = sha256Js;
