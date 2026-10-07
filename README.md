**Jogue no celular ou no computador:** https://notdsn.github.io/exercito-da-fe/

# Exército da Fé — Combinações Bíblicas (protótipo v4)

Auto-battler no estilo TFT / Combinações Táticas (Clash Royale), com heróis da Bíblia e as forças das trevas.
Tudo roda no navegador (Three.js já incluído na pasta `vendor/`, sem internet e sem compilação).

## Como rodar

```bash
cd game
python3 servidor.py        # ou: python3 servidor.py 8080
```
Abra **http://localhost:8080** no navegador (Chrome, Edge ou Firefox).

> Abrir o `index.html` direto (file://) não funciona: módulos JS precisam de um servidor.

## Como jogar
- Compre unidades na **loja** (🪙 ouro) e arraste do **banco** para o seu lado do tabuleiro (metade de baixo).
- **3 cópias iguais** se fundem em ★★ (mais forte e maior); 3 ★★ viram ★★★.
- **Sinergias**: 2 ou 4 unidades *diferentes* com o mesmo traço ativam bônus (painel à esquerda). As unidades com sinergia ativa ganham uma aura/pilar de luz na cor do traço.
- **Lutar!** (ou barra de espaço) começa o combate automático. Mana cheia = habilidade especial.
- Arraste uma unidade para a loja para **vender**. **D** renova a loja (1 🪙).
- A cada rodada você enfrenta um **rival** (IA). Os rivais têm economia própria, com as mesmas regras de loja. Derrote todos para vencer.
- O número de unidades em campo cresce a cada rodada (2, 3, 4… até 8).

## Dificuldade
| | Rivais | Inteligência |
|---|---|---|
| Fácil | 3 | compra mais aleatória, não renova a loja, não se adapta ao seu tabuleiro |
| Normal | 5 | busca sinergias e pares, renova a loja, contra-posiciona |
| Difícil | 7 | renova mais, +1 ouro por rodada, exércitos um pouco mais fortes |

## Contas e progresso
Crie uma conta na tela inicial (usuário + senha). A senha é guardada só como hash SHA-256 com sal.
Ao fim de cada partida você ganha **XP**, sobe de **nível**, ganha **talentos ✨** e desbloqueia recompensas (por enquanto só nomes, para uso futuro).
Os dados ficam no próprio navegador (`localStorage`). Para usar um servidor online no futuro, basta criar outra classe
com os mesmos métodos de `js/perfil/armazenamento.js` e trocá-la lá.

## Modelos 3D da Tripo 🎨
Os modelos ficam em `assets/models/` (versões otimizadas: texturas WebP 1024px + compressão meshopt; ~0,8 MB cada, eram 3–11 MB).
Os originais continuam em `~/Downloads`. Para otimizar novos modelos: `tools/otimizar.sh` (usa `npx @gltf-transform/cli optimize`).

Como os modelos da Tripo vêm em pose T e **sem animação**, o jogo anima o esqueleto (ossos estilo Mixamo) por código
(`js/rig.js`): braços relaxados, respiração, passos ao andar, golpe, braços erguidos ao lançar habilidade, susto ao levar dano e queda ao morrer.

**Todas as 35 unidades (e os leões do Daniel) já têm modelo 3D** — não há mais bonecos provisórios.
Qual arquivo cada unidade usa fica numa tabela só, `ARQUIVO` em `js/units.js` (o padrão é o próprio id:
`moises` → `moises.glb`). Exceções: Davi → `davi.glb` (senão `arqueiro_capa_vermelha.glb`), Jael → `jael.glb`
(senão `assassina_deserto.glb`), Miguel → `anjo_miguel.glb`, Gabriel → `anjo_gabriel.glb`,
Esqueleto Chifrudo → `esqueleto_chifrudo.glb`, Mago Sombrio → `mago_sombrio.glb`, leões invocados → `leao_lobo.glb`.

**Importar personagens novos/refeitos (ex.: versões chibi):**
```bash
bash tools/importar_personagens.sh            # lê ~/Downloads/tripo_personagens e ~/Downloads/tripo_chibi
bash tools/importar_personagens.sh /outra/pasta
```
O script otimiza cada `<slug>.glb` (WebP 1024 + meshopt, ~0,3 MB cada), grava em `assets/models/`, atualiza
`modelos.json` e marca os arquivos em `chibi.json` (esses não recebem o ajuste de proporção "chibi" por ossos).
Arquivo com o mesmo nome substitui o antigo; para trocar o modelo de uma unidade basta editar `ARQUIVO`.
Ajustes opcionais por unidade em `js/units.js`: `rotY: 180` (de costas), `altura`, `rigBracos: 0` (arma de duas mãos: braços parados).

**Conserto de pele (skinning)** em `js/modelos.js`: alguns GLBs da Tripo vêm com os ossos sem pose (Hamã, Acabe,
Dalila, Lami, Herodes — eram as unidades "finas/torcidas/espetadas") e o esqueleto é reconstruído a partir das
matrizes de ligação; nos 16 personagens chibi novos o auto-rig da Tripo saiu inutilizável (≈97% dos vértices presos
aos quadris e/ou matrizes corrompidas), então eles viram malha estática animada por código (pulinhos, ginga,
bote no ataque, giro ao lançar a habilidade). O mesmo vale para os quadrúpedes (Javali, Leão-Lobo, Dragão).
Para ver todos os modelos: `screens/v5_modelos.png` (parado | ataque | original).

## Estrutura
```
game/
  index.html          tela, HUD, loja
  css/estilo.css      visual
  js/main.js          cena 3D, luzes, câmera, loja, arrastar/soltar, combate, rodadas
  js/arena.js         arena 3D (tabuleiro, muralhas, rio, torres, cenário)
  js/units.js         unidades, traços, frases, rodadas (registro de modelos)
  js/habilidades.js   habilidades especiais de cada unidade
  js/ia.js            rivais controlados pelo computador
  js/regras.js        regras da loja/economia compartilhadas
  js/vfx.js           efeitos: partículas instanciadas, folhas animadas, água e feixes de luz
  js/modelos.js       carrega GLB (meshopt) ou cria o boneco provisório
  js/rig.js           animação procedural do esqueleto
  js/perfil/          contas locais (armazenamento.js = interface trocável)
  assets/vfx/         texturas dos efeitos (WebP, CC0)
  assets/models/arena/ torres, ponte, palmeira e rochas da Tripo (opcionais; arena.json lista quais existem)
  assets/models/      coloque aqui os .glb da Tripo
  vendor/three/       Three.js r186
  servidor.py         servidor local
```

## Visual v4 (arena 3D estilo Clash)
- **Arena 3D de verdade** (`js/arena.js`): plataforma elevada de tijolos, quadrados de grama chanfrados em dois verdes com sulcos de terra entre eles, muralhas de pedra arredondada com faixa **azul** (seu lado) e **vermelha** (adversário), braseiros com fogo nos cantos.
- **Rio no meio** com água animada (shader leve) e uma ponte de tábuas por coluna; o rio continua pelo cenário, com margens de areia, pedras e pontezinhas.
- **Torres com volume**: duas torres de princesa e uma torre do rei para cada lado, com telhado cônico, ameias, porta, estandarte (cruz dourada no azul, coroa no vermelho) e bandeira balançando.
- **Cenário completo**: praça de lajotas, árvores redondas, palmeiras, arbustos, pedras, tendas listradas dos acampamentos e colinas/dunas no horizonte (sem vazio). Tudo é juntado em poucos objetos (poucas chamadas de desenho) e as texturas são desenhadas em canvas (nada externo).
- **Luz**: sol quente com sombras suaves (mapa 2048, 1024 no celular), luz do céu, contraluz e tone mapping Neutral (cores vivas). Sombra arredondada e pedestal com borda escura sob cada unidade.
- **Câmera** atrás do seu lado, inclinada (57° no celular em pé, 50° no PC), perspectiva moderada; quadrado um pouco maior (1,4) para as cabeças não cobrirem a fileira de trás.

## Visual v3 (estilo Clash)
- **Câmera fixa**, alta e inclinada (55° no PC, 62° no celular em pé), enquadrando tabuleiro + banco entre a barra superior e a loja. Não há mais zoom durante a luta; o tremor de tela ficou bem sutil.
- **Arena desenho**: gramado xadrez com bordas claras entre os quadrados, moldura **azul** do seu lado e **vermelha** do adversário, torres decorativas nas cores dos times, árvores redondas e pedras. Luz clara e suave (sem névoa sépia) e uma leve luz de borda (rim light) nos personagens.
- **Todos do mesmo tamanho**: cada modelo é normalizado pela caixa delimitadora para 1,85 de altura (★★ = +5%, ★★★ = +10%). Os multiplicadores de gigante foram removidos.
- **Movimento em grade**: no combate cada unidade ocupa exatamente um quadrado e anda de quadrado em quadrado (sem amontoar nem sobrepor). Empurrões, saltos e invocações sempre caem no quadrado livre mais próximo.
- **Base colorida** (azul/vermelha) com anel branco/dourado/rosa conforme as estrelas, **barra de vida grossa** azul/vermelha com selo de estrelas, barra de mana roxa só no combate. O **nome** aparece só ao passar o mouse/tocar na unidade.
- **Interface**: fonte Lilita One + Baloo 2 (incluídas em `assets/fonts`, licença OFL), botões e cartas gordinhos com texto contornado, custo em **gota de elixir** roxa/rosa (a moeda da loja agora se chama elixir), barra superior limpa. No celular em pé, as sinergias viram uma fileira de ícones (toque para ver o bônus) e a loja fica em duas linhas.
- **Correção de modelos**: Hamã, Acabe, Dalila, Herodes e Lami (exportados da Tripo com `RootNode`) vinham com o esqueleto mal ligado e apareciam "estilhaçados"; o jogo recalcula as matrizes de ligação ao carregar (`consertarPele` em `js/modelos.js`).

## Visual v5 (tabuleiro Combinações Táticas + poderes)
- **Tabuleiro no estilo do modo Combinações Táticas (Merge Tactics)** (`js/arena.js`): campo retangular de grama clara com
  **hexágonos** suaves (sem bordas duras), meio-fio e piso de pedra clara, prédios coloridos de castelo (amarelo, vermelho,
  azul) com ameias, estandartes e cordões de bandeirolas. Sem torres, rio ou pontes.
- **Grade hexagonal** de verdade: posicionamento, movimento e alcance usam distância em hexágonos (5 colunas × 8 fileiras;
  fileiras 0–3 do inimigo, 4–7 suas). Uma tropa por hexágono.
- **Bancos de madeira com moldura dourada**: o seu embaixo do campo (5 vagas) e o do adversário em cima.
- **Governantes** em plataformas octogonais de pedra: o seu no canto inferior direito, o do adversário no canto superior
  esquerdo, com nome e barra de vida. No campo aparece a contagem **👤 tropas/limite** durante a mobilização.
- **HUD**: barra de jogadores no topo (retrato, nome, vida; você com brilho azul, adversário da rodada com borda vermelha),
  "Rodada N / Fase de Mobilização" à esquerda, "Restante: N ⏱" à direita, cartas com custo num círculo laranja e traços
  embaixo, gota dourada grande de elixir, botão de lista (sinergias) e barra azul de tempo no rodapé.
- **Comprar posiciona sozinho**: tocar numa carta faz a tropa pular até o melhor hexágono livre pelo papel (`papel` em
  `js/units.js`): tanques/corpo a corpo na frente, suportes no meio, distância no fundo. Campo no limite → vai para o banco.
  Fusões continuam automáticas e arrastar continua funcionando.
- **Tropas chibi**: todas com a mesma altura/pegada (cabem num hexágono), cores mais saturadas e borda de luz mais forte.
- **Câmera**: celular em pé com vista alta mostrando o campo inteiro e os dois bancos; tela deitada em vista lateral.
- **Poderes com efeito próprio** (`js/habilidades.js` + `js/vfx.js`), por exemplo: Moisés abre o mar (duas muralhas de água), Elias faz cair fogo do céu, Davi gira a funda e a pedra derruba gigantes, Golias e Sansão fazem ondas de choque com poeira e detritos, Miguel desce uma espada de luz, o Faraó solta gafanhotos e nuvens de praga, o Leviatã levanta uma onda, Dalila lança corações de encanto, Daniel ruge e chama leões, Noé traz a arca e o arco-íris, Gabriel anuncia com anéis de luz, Ninrode ergue a torre de Babel e confunde os inimigos.
- **Golpes e tiros**: cada unidade tem um estilo de tiro (flecha, pedra, fogo, luz, água, sombra, veneno...) com rastro e impacto; corpo a corpo solta cortes e faíscas (garras nas feras, impacto pesado nos gigantes). Também há brilho de conjuração, estrelinhas de atordoado, escudos, curas e uma explosão de luz na fusão.

## Licenças dos efeitos
- `assets/vfx/particulas.webp`: atlas montado com sprites do **Kenney Particle Pack** (kenney.nl), licença **CC0** (domínio público).
- `assets/vfx/explosao.webp`, `poeira.webp`, `chama.webp`, `nuvem.webp`, `bola_fogo.webp`: flipbooks gratuitos da **Unity Labs Paris** (Thomas Iché), licença **CC0**.
- Modelos 3D (personagens e palmeira/rochas): gerados na Tripo pelo autor do jogo. Fontes: OFL. Three.js: MIT.
