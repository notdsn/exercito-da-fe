// =====================================================================
// Registro de unidades, traços (sinergias), inimigos e rodadas.
// Para usar um modelo 3D da Tripo, coloque o arquivo em
//   assets/models/<id>.glb   (ex.: assets/models/davi.glb)
// e rode `python3 servidor.py` (ele detecta os .glb automaticamente).
// Campos opcionais por unidade:
//   modelo: caminho do .glb (padrão: assets/models/<id>.glb)
//   rotY:   correção de rotação do modelo em graus (se ele "olhar" para o lado errado)
//   altura: altura alvo do modelo em unidades do tabuleiro (padrão 1.5)
// =====================================================================

export const TRACOS = {
  profetas: {
    nome: 'Voz Profética', icone: '📜', cor: '#4f7fd9', niveis: [2, 4],
    desc: ['Profetas ganham +40% de mana', 'Profetas ganham +100% de mana'],
  },
  valentes: {
    nome: 'Valentes de Davi', icone: '⚔️', cor: '#c0503a', niveis: [2, 4],
    desc: ['Valentes causam +20% de dano', 'Valentes causam +50% de dano'],
  },
  juizes: {
    nome: 'Juízes de Israel', icone: '⚖️', cor: '#b98a2e', niveis: [2, 4],
    desc: ['Juízes ganham +30% de velocidade de ataque', 'TODOS os aliados ganham +30% de velocidade de ataque'],
  },
  realeza: {
    nome: 'Realeza', icone: '👑', cor: '#d9b43a', niveis: [2, 4],
    desc: ['+1 de elixir por rodada', '+3 de elixir por rodada'],
  },
  alianca: {
    nome: 'Aliança', icone: '🌈', cor: '#3aa86b', niveis: [2, 4],
    desc: ['Todos os aliados +15% de vida máxima', 'Todos os aliados +35% de vida máxima'],
  },
  livramento: {
    nome: 'Livramento', icone: '🕊️', cor: '#7fc8d9', niveis: [2, 4],
    desc: ['Abaixo de 40% de vida, recebem escudo de 25% da vida', 'Abaixo de 40% de vida, recebem escudo de 50% da vida'],
  },
  trevas: {
    nome: 'Trevas', icone: '🌑', cor: '#6a3a8f', niveis: [2, 4],
    desc: ['Trevas roubam 20% do dano como vida', 'Trevas roubam 45% do dano como vida'],
  },
  filisteus: {
    nome: 'Filisteus', icone: '🛡️', cor: '#8f5a2a', niveis: [2, 4],
    desc: ['Filisteus começam com escudo de 200', 'Filisteus começam com escudo de 450'],
  },
  egito: {
    nome: 'Egito', icone: '🐍', cor: '#c9a227', niveis: [2, 4],
    desc: ['Pragas: inimigos começam com -10% de vida', 'Pragas: inimigos começam com -25% de vida'],
  },
  bestas: {
    nome: 'Bestas', icone: '🐾', cor: '#8a4a2a', niveis: [2, 4],
    desc: ['Bestas +25% vel. de ataque e movimento', 'Bestas +60% vel. de ataque e movimento'],
  },
  gigantes: {
    nome: 'Gigantes', icone: '🗿', cor: '#7a7a80', niveis: [2, 4],
    desc: ['Gigantes +25% de vida', 'Gigantes +60% de vida'],
  },
  intriga: {
    nome: 'Intriga', icone: '🗡️', cor: '#9a2a4a', niveis: [2, 4],
    desc: ['O inimigo mais forte começa com -30% de dano por 8s', 'Os 3 inimigos mais fortes começam com -30% de dano por 8s'],
  },
  celestial: {
    nome: 'Hoste Celestial', icone: '✨', cor: '#e8e3ff', niveis: [1, 2],
    desc: ['Todos os aliados recebem 15% menos dano', 'Todos os aliados recebem 30% menos dano'],
  },
};

// funcao: 'corpo' (corpo a corpo) ou 'distancia'
// cor: cor do manto do boneco provisório; barba/acessorio: detalhes do boneco
export const UNIDADES = {
  // ----- custo 1 -----
  davi: {
    modelo: 'assets/models/arqueiro_capa_vermelha.glb', temModelo: true, nome: 'Davi', custo: 1, tracos: ['realeza', 'valentes'], funcao: 'distancia',
    vida: 430, dano: 42, velAtaque: 0.8, alcance: 3, mana: 60, cor: '#8a6b3d', acessorio: 'funda',
    habilidade: 'Pedra da Funda', descHab: 'Atira uma pedra no inimigo de MAIOR vida. Dano dobrado contra gigantes.',
    frase: '“Tu vens a mim com espada; eu vou a ti em nome do Senhor.” — 1Sm 17:45',
  },
  jonatas: {
    temModelo: true, nome: 'Jônatas', custo: 1, tracos: ['realeza', 'alianca'], funcao: 'distancia',
    vida: 420, dano: 40, velAtaque: 0.85, alcance: 3, mana: 70, cor: '#a8322d', acessorio: 'arco',
    habilidade: 'Flechas da Amizade', descHab: 'Dispara 3 flechas em inimigos diferentes. Se Davi estiver em campo, Davi ganha 40 de mana.',
    frase: '“A alma de Jônatas se ligou com a alma de Davi.” — 1Sm 18:1',
  },
  gideao: {
    nome: 'Gideão', custo: 1, tracos: ['juizes', 'valentes'], funcao: 'corpo',
    vida: 600, dano: 48, velAtaque: 0.75, alcance: 1, mana: 80, cor: '#6d7a3a', acessorio: 'tocha',
    habilidade: '300 Tochas', descHab: 'Quebra os cântaros: tochas cercam os inimigos próximos, causando dano e atordoando.',
    frase: '“Espada pelo Senhor e por Gideão!” — Jz 7:20',
  },
  jael: {
    modelo: 'assets/models/assassina_deserto.glb', temModelo: true, nome: 'Jael', custo: 1, tracos: ['juizes'], funcao: 'corpo',
    vida: 480, dano: 55, velAtaque: 0.9, alcance: 1, mana: 60, cor: '#4b3b5e', acessorio: 'capuz',
    habilidade: 'Golpe da Tenda', descHab: 'Some nas sombras e surge ao lado do inimigo com MENOS vida, golpeando forte.',
    frase: '“Bendita seja entre as mulheres Jael.” — Jz 5:24',
  },
  josue: {
    temModelo: true, nome: 'Josué', custo: 1, tracos: ['valentes', 'alianca'], funcao: 'corpo',
    vida: 620, dano: 46, velAtaque: 0.75, alcance: 1, mana: 90, cor: '#7a5230', acessorio: 'lanca',
    habilidade: 'Trombetas de Jericó', descHab: 'As trombetas soam: onda que QUEBRA escudos e faz os inimigos receberem +25% de dano.',
    frase: '“O povo gritou, e o muro caiu abaixo.” — Js 6:20',
  },
  // ----- custo 2 -----
  ester: {
    temModelo: true, nome: 'Ester', custo: 2, tracos: ['realeza', 'livramento'], funcao: 'distancia',
    vida: 520, dano: 38, velAtaque: 0.75, alcance: 3, mana: 70, cor: '#8a3d8f', acessorio: 'coroa',
    habilidade: 'Intercessão da Rainha', descHab: 'Cura muito o aliado com menos vida e um pouco os aliados ao redor dele.',
    frase: '“Quem sabe se para tal tempo como este chegaste a este reino?” — Et 4:14',
  },
  debora: {
    nome: 'Débora', custo: 2, tracos: ['juizes', 'profetas'], funcao: 'distancia',
    vida: 540, dano: 48, velAtaque: 0.8, alcance: 2, mana: 70, cor: '#2f6f6a', acessorio: 'lanca',
    habilidade: 'Cântico de Vitória', descHab: 'Canta para os aliados próximos: +50% de velocidade de ataque por 5s.',
    frase: '“Desperta, desperta, Débora, entoa um cântico!” — Jz 5:12',
  },
  sansao: {
    nome: 'Sansão', custo: 2, tracos: ['juizes', 'valentes'], funcao: 'corpo',
    vida: 900, dano: 58, velAtaque: 0.7, alcance: 1, mana: 100, cor: '#9a6a3a', acessorio: 'cabelo',
    habilidade: 'Derrubar as Colunas', descHab: 'Derruba uma coluna sobre os inimigos (dano em área + atordoa). Passiva: quanto menos vida, mais dano.',
    frase: '“Esforça-me agora, só esta vez, ó Deus.” — Jz 16:28',
  },
  samuel: {
    nome: 'Samuel', custo: 2, tracos: ['profetas', 'juizes'], funcao: 'distancia',
    vida: 500, dano: 40, velAtaque: 0.7, alcance: 3, mana: 60, cor: '#3a3036', acessorio: 'chifre', barba: '#dddddd',
    habilidade: 'A Unção', descHab: 'Unge o aliado mais forte: +60% de dano por 6s e +50 de mana.',
    frase: '“Fala, porque o teu servo ouve.” — 1Sm 3:10',
  },
  daniel: {
    temModelo: true, nome: 'Daniel', custo: 2, tracos: ['profetas', 'livramento'], funcao: 'corpo',
    vida: 780, dano: 44, velAtaque: 0.75, alcance: 1, mana: 90, cor: '#5a4a8a', acessorio: 'livro',
    habilidade: 'Cova dos Leões', descHab: 'Chama 2 leões que lutam ao seu lado (e jamais o atacam). Daniel ganha escudo.',
    frase: '“O meu Deus enviou o seu anjo e fechou a boca dos leões.” — Dn 6:22',
  },
  jonas: {
    nome: 'Jonas', custo: 2, tracos: ['profetas', 'livramento'], funcao: 'distancia',
    vida: 560, dano: 44, velAtaque: 0.75, alcance: 2, mana: 70, cor: '#3d6f8f', acessorio: 'nenhum',
    habilidade: 'O Grande Peixe', descHab: 'É engolido pelo grande peixe e cuspido na retaguarda inimiga: onda d’água em área e cura 30%.',
    frase: '“Da angústia clamei ao Senhor, e ele me respondeu.” — Jn 2:2',
  },
  // ----- custo 3 -----
  elias: {
    temModelo: true, nome: 'Elias', custo: 3, tracos: ['profetas'], funcao: 'distancia',
    vida: 640, dano: 55, velAtaque: 0.75, alcance: 3, mana: 80, cor: '#2c4f9a', acessorio: 'cajado', barba: '#bbbbbb',
    habilidade: 'Fogo do Céu', descHab: 'Faz cair fogo do céu sobre 3 inimigos (o alvo principal recebe dano extra).',
    frase: '“Então caiu fogo do Senhor.” — 1Rs 18:38',
  },
  moises: {
    temModelo: true, nome: 'Moisés', custo: 3, tracos: ['profetas', 'alianca'], funcao: 'distancia',
    vida: 700, dano: 50, velAtaque: 0.7, alcance: 3, mana: 100, cor: '#8f7a5a', acessorio: 'cajado', barba: '#f0f0f0',
    habilidade: 'Abrir o Mar Vermelho', descHab: 'Divide o tabuleiro com muralhas de água: inimigos na sua coluna são empurrados e recebem dano.',
    frase: '“Estende a tua mão sobre o mar e fende-o.” — Êx 14:16',
  },
  salomao: {
    nome: 'Salomão', custo: 3, tracos: ['realeza'], funcao: 'distancia',
    vida: 660, dano: 52, velAtaque: 0.75, alcance: 3, mana: 80, cor: '#c8a23a', acessorio: 'coroa',
    habilidade: 'Juízo de Salomão', descHab: 'Portal de sabedoria: dano igual a 15% da vida máxima dos inimigos na área. Ganha 1 de elixir (até 2 por combate).',
    frase: '“Dá a teu servo um coração entendido para julgar.” — 1Rs 3:9',
  },
  noe: {
    temModelo: true, nome: 'Noé', custo: 3, tracos: ['alianca', 'livramento'], funcao: 'corpo',
    vida: 950, dano: 45, velAtaque: 0.7, alcance: 1, mana: 90, cor: '#6a5a3a', acessorio: 'cajado', barba: '#e0e0e0',
    habilidade: 'A Arca', descHab: 'Ergue uma arca-escudo: aliados próximos ganham um grande escudo. Surge o arco-íris da aliança.',
    frase: '“O meu arco tenho posto nas nuvens.” — Gn 9:13',
  },
  miguel: {
    modelo: 'assets/models/anjo_miguel.glb', temModelo: true, nome: 'Arcanjo Miguel', custo: 3, tracos: ['celestial', 'valentes'], funcao: 'corpo',
    vida: 900, dano: 62, velAtaque: 0.8, alcance: 1, mana: 90, cor: '#d8d8e8', acessorio: 'asas',
    habilidade: 'Espada do Arcanjo', descHab: 'Raio celestial no inimigo de MAIOR ataque, com explosão de luz em volta.',
    frase: '“Miguel e os seus anjos batalhavam contra o dragão.” — Ap 12:7',
  },
};

// ----- Forças das trevas (também jogáveis!) -----
// lado: 'trevas' muda o visual do boneco provisório; forma: 'humanoide' | 'fera' | 'dragao' | 'serpente'
Object.assign(UNIDADES, {
  // custo 1
  esqueleto_chifres: {
    nome: 'Esqueleto Chifrudo', custo: 1, tracos: ['trevas'], funcao: 'corpo', lado: 'trevas', chifres: true,
    vida: 460, dano: 40, velAtaque: 0.85, alcance: 1, mana: 0, cor: '#d8d0b8', forma: 'humanoide',
    habilidade: 'Ossos que se Juntam', descHab: 'Passiva: ao cair, desmorona e se remonta UMA vez com 40% de vida.',
    frase: '“Ossos secos, ouvi a palavra do Senhor.” — Ez 37:4',
  },
  javali_besta: {
    nome: 'Javali-Besta', custo: 1, tracos: ['bestas', 'filisteus'], funcao: 'corpo', lado: 'trevas', veloz: true,
    vida: 560, dano: 44, velAtaque: 0.8, alcance: 1, mana: 60, cor: '#5a3a2a', forma: 'fera',
    habilidade: 'Investida', descHab: 'Arremete contra o inimigo mais distante, causando dano e atordoando.',
    frase: '“O javali da selva a devasta.” — Sl 80:13',
  },
  orc: {
    nome: 'Orc Selvagem', custo: 1, tracos: ['filisteus', 'gigantes'], funcao: 'corpo', lado: 'trevas',
    vida: 620, dano: 46, velAtaque: 0.75, alcance: 1, mana: 70, cor: '#4f7a3a', forma: 'humanoide',
    habilidade: 'Fúria de Batalha', descHab: 'Entra em fúria: +70% de velocidade de ataque por 4s.',
    frase: '“Os filisteus ajuntaram os seus exércitos para a peleja.” — 1Sm 17:1',
  },
  figura_sombria: {
    nome: 'Mago Sombrio', custo: 1, tracos: ['trevas', 'egito'], funcao: 'distancia', lado: 'trevas',
    vida: 400, dano: 38, velAtaque: 0.75, alcance: 3, mana: 70, cor: '#2a2038', forma: 'humanoide',
    habilidade: 'Encantamentos', descHab: 'Nuvem venenosa no alvo que causa dano contínuo por 3s.',
    frase: '“Os magos do Egito fizeram também o mesmo com os seus encantamentos.” — Êx 7:11',
  },
  // custo 2
  cavaleiro_trevas: {
    nome: 'Cavaleiro das Trevas', custo: 2, tracos: ['trevas', 'filisteus'], funcao: 'corpo', lado: 'trevas',
    vida: 860, dano: 52, velAtaque: 0.7, alcance: 1, mana: 80, cor: '#24242e', forma: 'humanoide',
    habilidade: 'Lâmina Sombria', descHab: 'Golpe sombrio pesado que cura metade do dano causado.',
    frase: '“A luz resplandece nas trevas, e as trevas não a compreenderam.” — Jo 1:5',
  },
  leao_lobo: {
    nome: 'Leão-Lobo', custo: 2, tracos: ['bestas'], funcao: 'corpo', lado: 'trevas', veloz: true,
    vida: 640, dano: 56, velAtaque: 0.95, alcance: 1, mana: 60, cor: '#6a5a4a', forma: 'fera',
    habilidade: 'Bote da Fera', descHab: 'Salta sobre o inimigo com MENOS vida e o morde com força.',
    frase: '“O diabo anda em derredor, bramando como leão.” — 1Pe 5:8',
  },
  elemental_fogo: {
    nome: 'Elemental de Fogo', custo: 2, tracos: ['egito'], funcao: 'distancia', lado: 'trevas',
    vida: 500, dano: 50, velAtaque: 0.75, alcance: 3, mana: 70, cor: '#d9531e', forma: 'humanoide', brilho: true,
    habilidade: 'Fornalha Ardente', descHab: 'Explosão de fogo em área no alvo.',
    frase: '“Aquecessem a fornalha sete vezes mais.” — Dn 3:19',
  },
  golem: {
    nome: 'Golem de Pedra', custo: 2, tracos: ['gigantes', 'egito'], funcao: 'corpo', lado: 'trevas',
    vida: 1050, dano: 42, velAtaque: 0.55, alcance: 1, mana: 90, cor: '#6a6a70', forma: 'humanoide',
    habilidade: 'Corpo de Pedra', descHab: 'Endurece: ganha escudo de 45% da vida máxima e atordoa quem está ao lado.',
    frase: '“Têm boca, mas não falam; olhos têm, mas não veem.” — Sl 115:5',
  },
  // custo 3
  dragao: {
    nome: 'Dragão', custo: 3, tracos: ['bestas', 'trevas'], funcao: 'distancia', lado: 'trevas',
    vida: 820, dano: 56, velAtaque: 0.65, alcance: 3, mana: 90, cor: '#7a1e1e', forma: 'dragao',
    habilidade: 'Sopro de Fogo', descHab: 'Sopra uma linha de fogo em direção ao alvo, com 3 explosões.',
    frase: '“O grande dragão, a antiga serpente.” — Ap 12:9',
  },
  golias: {
    temModelo: true, nome: 'Golias', custo: 3, tracos: ['filisteus', 'gigantes'], funcao: 'corpo', lado: 'trevas', gigante: true,
    vida: 1250, dano: 64, velAtaque: 0.6, alcance: 1, mana: 100, cor: '#8a7040', forma: 'humanoide',
    habilidade: 'Desafio do Gigante', descHab: 'Pisão que abala o chão: dano em área e atordoa por 1,2s.',
    frase: '“Hoje desafio as fileiras de Israel.” — 1Sm 17:10',
  },
  farao: {
    nome: 'Faraó', custo: 3, tracos: ['egito', 'realeza'], funcao: 'distancia', lado: 'trevas',
    vida: 760, dano: 54, velAtaque: 0.7, alcance: 3, mana: 90, cor: '#d9b43a', forma: 'humanoide', coroaFarao: true,
    habilidade: 'As Pragas', descHab: 'Envia pragas sobre 3 inimigos: dano e -30% de dano deles por 4s.',
    frase: '“Quem é o Senhor, para que eu ouça a sua voz?” — Êx 5:2',
  },
  leviata: {
    temModelo: true, nome: 'Leviatã', custo: 3, tracos: ['bestas', 'gigantes'], funcao: 'distancia', lado: 'trevas', gigante: true,
    vida: 1000, dano: 52, velAtaque: 0.6, alcance: 2, mana: 100, cor: '#1e4a5a', forma: 'serpente',
    habilidade: 'Maremoto', descHab: 'Onda gigante na área do alvo: dano e empurra os inimigos para trás.',
    frase: '“Podes tirar com anzol o leviatã?” — Jó 41:1',
  },
});


// ----- Novos personagens (modelos da Tripo) -----
Object.assign(UNIDADES, {
  balaao: {
    temModelo: true, nome: 'Balaão', custo: 1, tracos: ['profetas', 'intriga'], funcao: 'distancia',
    vida: 430, dano: 38, velAtaque: 0.75, alcance: 3, mana: 70, cor: '#7a5a8a', acessorio: 'cajado', barba: '#cccccc',
    habilidade: 'Maldição que Vira Bênção', descHab: 'Tenta amaldiçoar: causa dano nos inimigos em volta do alvo, mas a maldição vira bênção e cura os 2 aliados mais feridos.',
    frase: '“Como amaldiçoarei o que Deus não amaldiçoou?” — Nm 23:8',
  },
  hama: {
    temModelo: true, nome: 'Hamã', custo: 1, tracos: ['intriga', 'trevas'], funcao: 'distancia', lado: 'trevas',
    vida: 420, dano: 40, velAtaque: 0.75, alcance: 3, mana: 60, cor: '#5a1a3a', acessorio: 'nenhum',
    habilidade: 'Decreto de Hamã', descHab: 'Marca o inimigo de maior vida: ele recebe +40% de dano por 6s e todos os aliados o atacam.',
    frase: '“Hamã procurou destruir todos os judeus.” — Et 3:6',
  },
  acabe: {
    temModelo: true, nome: 'Acabe', custo: 2, tracos: ['realeza', 'intriga'], funcao: 'distancia', lado: 'trevas',
    vida: 520, dano: 46, velAtaque: 0.85, alcance: 3, mana: 70, cor: '#6a2a2a', acessorio: 'arco',
    habilidade: 'Flechas ao Acaso', descHab: 'Dispara 5 flechas em inimigos aleatórios.',
    frase: '“Um homem entesou o arco, à ventura, e feriu o rei.” — 1Rs 22:34',
  },
  dalila: {
    temModelo: true, nome: 'Dalila', custo: 2, tracos: ['filisteus', 'intriga'], funcao: 'corpo', lado: 'trevas',
    vida: 560, dano: 52, velAtaque: 0.95, alcance: 1, mana: 70, cor: '#8a2a5a', acessorio: 'nenhum',
    habilidade: 'Corte das Tranças', descHab: 'Enfraquece o inimigo de MAIOR dano: -50% de dano e de velocidade por 5s. Contra Sansão: ele perde a força e fica atordoado.',
    frase: '“Ela lhe rapou as sete tranças, e retirou-se dele a sua força.” — Jz 16:19',
  },
  lami: {
    temModelo: true, rigBracos: 0, nome: 'Lami', custo: 2, tracos: ['filisteus', 'gigantes'], funcao: 'corpo', lado: 'trevas', gigante: true,
    vida: 900, dano: 50, velAtaque: 0.6, alcance: 1, mana: 90, cor: '#6a5a40', acessorio: 'lanca',
    habilidade: 'Lança de Eixo de Tear', descHab: 'Arremessa a lança enorme em linha reta, atravessando todos os inimigos no caminho.',
    frase: '“A haste da sua lança era como eixo de tecelão.” — 1Cr 20:5',
  },
  gabriel: {
    temModelo: true, modelo: 'assets/models/anjo_gabriel.glb', nome: 'Anjo Gabriel', custo: 3, tracos: ['celestial', 'profetas'], funcao: 'distancia',
    vida: 720, dano: 54, velAtaque: 0.75, alcance: 3, mana: 80, cor: '#4a6ad9', acessorio: 'asas',
    habilidade: 'Anúncio Celestial', descHab: 'A trombeta revela os inimigos: todos recebem +25% de dano por 5s, e os aliados ganham 30 de mana.',
    frase: '“Eu sou Gabriel, que assisto diante de Deus.” — Lc 1:19',
  },
  herodes: {
    temModelo: true, nome: 'Herodes', custo: 3, tracos: ['realeza', 'intriga'], funcao: 'distancia', lado: 'trevas',
    vida: 780, dano: 50, velAtaque: 0.7, alcance: 2, mana: 90, cor: '#8a6a2a', acessorio: 'coroa',
    habilidade: 'Fortalezas de Herodes', descHab: 'O grande construtor ergue muralhas: aliados na mesma linha ganham escudo e +25% de dano por 5s.',
    frase: '“Herodes, rei da Judeia…” — Lc 1:5',
  },
  ninrode: {
    temModelo: true, nome: 'Ninrode', custo: 3, tracos: ['bestas', 'gigantes'], funcao: 'distancia', lado: 'trevas',
    vida: 820, dano: 56, velAtaque: 0.75, alcance: 3, mana: 90, cor: '#5a4a2a', acessorio: 'arco',
    habilidade: 'Torre de Babel', descHab: 'Ergue a torre: inimigos em volta ficam com as línguas confundidas e atacam os próprios aliados por 3s.',
    frase: '“Ninrode, poderoso caçador diante do Senhor.” — Gn 10:9',
  },
});

// Leões invocados por Daniel (não aparecem na loja)
export const INVOCACOES = {
  leao: { nome: 'Leão', tracos: [], funcao: 'corpo', vida: 380, dano: 34, velAtaque: 1.0, alcance: 1, mana: 0, cor: '#c8952e', forma: 'fera', custo: 0 },
};

// Nomes temáticos das rodadas (15). Vencer a 15ª = vitória final!
export const RODADAS = [
  'Fronteira de Canaã', 'Bosque Sombrio', 'Acampamento de Midiã', 'Ruínas de Ai', 'Vale de Elá',
  'Deserto de Sur', 'Montes de Gilboa', 'Covil das Feras', 'A Fornalha Ardente', 'Margens do Mar Vermelho',
  'Torre de Babel', 'Vale dos Ossos Secos', 'Muralhas de Jericó', 'Trevas do Abismo', 'A Batalha Final',
];

// papel no tabuleiro (usado para posicionar sozinho ao comprar):
// 'tanque' e 'corpo' vão para a frente, 'suporte' para o meio, 'distancia' para o fundo
const SUPORTES = new Set(['ester', 'debora', 'samuel', 'noe', 'balaao', 'gabriel', 'herodes', 'salomao']);
const TANQUES = new Set(['golias', 'golem', 'sansao', 'josue', 'lami', 'orc', 'cavaleiro_trevas', 'miguel', 'noe']);
export function papelDe(id) {
  const d = UNIDADES[id]; if (!d) return 'corpo';
  if (d.papel) return d.papel;
  if (SUPORTES.has(id) && d.funcao !== 'corpo') return 'suporte';
  if (TANQUES.has(id)) return 'tanque';
  return d.funcao === 'corpo' ? 'corpo' : 'distancia';
}
// ===== Qual arquivo GLB (em assets/models/) cada unidade usa =====
// Para trocar o modelo de uma unidade (ex.: versão chibi nova), basta mudar o nome aqui ou
// salvar o arquivo como assets/models/<id>.glb e apagar a linha. Unidades sem arquivo usam o id.
// Depois de copiar arquivos novos, rode tools/importar_personagens.sh (ou o servidor.py) para
// atualizar assets/models/modelos.json — o jogo só carrega o que estiver listado ali.
export const ARQUIVO = {
  // [preferido, reserva]: usa o primeiro que existir em assets/models/ (modelos.json)
  davi: ['davi', 'arqueiro_capa_vermelha'], jael: ['jael', 'assassina_deserto'],
  miguel: 'anjo_miguel', gabriel: 'anjo_gabriel',
  esqueleto_chifres: 'esqueleto_chifrudo', figura_sombria: 'mago_sombrio',
  leao: 'leao_lobo',                     // leões invocados por Daniel usam o leão-lobo
};
// modelos que já vieram da Tripo em estilo chibi (cabeça grande): não recebem o "chibi" por ossos.
// Os importados por tools/importar_personagens.sh também entram via assets/models/chibi.json.
export const CHIBI_NATIVO = new Set(['gideao', 'debora', 'sansao', 'samuel', 'jonas', 'salomao', 'farao', 'esqueleto_chifrudo', 'javali_besta', 'orc', 'mago_sombrio', 'cavaleiro_trevas', 'leao_lobo', 'elemental_fogo', 'golem', 'dragao']);
export function caminhoModelo(id, def, disponiveis) {
  let a = ARQUIVO[id];
  if (Array.isArray(a)) a = (disponiveis && a.find(x => disponiveis.has(x))) || a[a.length - 1];
  if (a) return `assets/models/${a}.glb`;
  return (def && def.modelo) || `assets/models/${id}.glb`;
}
export const arquivoModelo = (id, def, disp) => caminhoModelo(id, def, disp).split('/').pop().replace(/\.glb$/i, '');
