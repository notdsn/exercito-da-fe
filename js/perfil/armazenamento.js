// Interface de armazenamento de contas/perfis.
// Hoje grava no localStorage do navegador. Para usar um servidor online no futuro,
// crie outra classe com os MESMOS métodos (todos async) e troque em `armazenamento` abaixo.
//
//   async obterUsuario(nome)       -> objeto do usuário ou null
//   async salvarUsuario(usuario)   -> grava (cria ou atualiza)
//   async obterSessao()            -> nome do usuário logado ou null
//   async definirSessao(nome|null) -> inicia/encerra sessão

export class ArmazenamentoLocal {
  constructor(prefixo = 'exercitoDaFe') { this.p = prefixo; }
  _ler(chave, padrao) { try { return JSON.parse(localStorage.getItem(this.p + ':' + chave)) ?? padrao; } catch { return padrao; } }
  _gravar(chave, valor) { localStorage.setItem(this.p + ':' + chave, JSON.stringify(valor)); }
  async obterUsuario(nome) { return this._ler('usuarios', {})[nome.toLowerCase()] || null; }
  async salvarUsuario(u) { const t = this._ler('usuarios', {}); t[u.usuario.toLowerCase()] = u; this._gravar('usuarios', t); }
  async obterSessao() { return this._ler('sessao', null); }
  async definirSessao(nome) { this._gravar('sessao', nome); }
}

// Exemplo de como seria um back-end online (não usado ainda):
// export class ArmazenamentoOnline {
//   constructor(url) { this.url = url; }
//   async obterUsuario(nome) { const r = await fetch(`${this.url}/usuarios/${nome}`); return r.ok ? r.json() : null; }
//   async salvarUsuario(u) { await fetch(`${this.url}/usuarios/${u.usuario}`, { method: 'PUT', body: JSON.stringify(u) }); }
//   ...
// }

export const armazenamento = new ArmazenamentoLocal();
