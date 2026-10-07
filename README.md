**Jogue no celular ou no computador:** https://notdsn.github.io/exercito-da-fe/

# Exército da Fé — Combinações Bíblicas (protótipo v1)

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

Modelos já ligados às unidades:

| Arquivo | Unidade |
|---|---|
| `arqueiro_capa_vermelha.glb` | Davi |
| `jonatas.glb` | Jônatas |
| `assassina_deserto.glb` | Jael |
| `josue.glb`, `ester.glb`, `daniel.glb`, `elias.glb`, `moises.glb`, `noe.glb` | mesmos nomes |
| `anjo_miguel.glb` | Arcanjo Miguel |
| `anjo_gabriel.glb` | Anjo Gabriel (novo) |
| `golias.glb`, `lami.glb`, `leviata.glb` | Golias, Lami (novo), Leviatã |
| `acabe.glb`, `hama.glb`, `herodes.glb`, `dalila.glb`, `balaao.glb`, `ninrode.glb` | novos personagens |

Para adicionar outro modelo:
1. Exporte da Tripo como **GLB**, rode `tools/otimizar.sh` (ou copie direto) para `game/assets/models/`.
2. Use o **id** da unidade como nome do arquivo (ex.: `samuel.glb`) **ou** aponte no `js/units.js`: `modelo: 'assets/models/arquivo.glb'`.
3. Reinicie `python3 servidor.py` (ele atualiza `assets/models/modelos.json`) e recarregue o jogo.
4. Ajustes opcionais no `js/units.js`: `rotY: 180` (se aparecer de costas), `altura: 1.7` (tamanho), `escala: 1.3` (gigantes).

Unidades ainda com boneco provisório (sem modelo): Gideão, Débora, Sansão, Samuel, Jonas, Salomão, Esqueleto Chifrudo,
Javali-Besta, Orc, Mago Sombrio, Cavaleiro das Trevas, Leão-Lobo, Elemental de Fogo, Golem, Dragão, Faraó (e os leões do Daniel).

## Estrutura
```
game/
  index.html          tela, HUD, loja
  css/estilo.css      visual
  js/main.js          cena 3D, tabuleiro, loja, arrastar/soltar, combate, rodadas
  js/units.js         unidades, traços, frases, rodadas (registro de modelos)
  js/habilidades.js   habilidades especiais de cada unidade
  js/ia.js            rivais controlados pelo computador
  js/regras.js        regras da loja/economia compartilhadas
  js/vfx.js           efeitos em sprite-sheet (flipbook 8x8)
  js/modelos.js       carrega GLB (meshopt) ou cria o boneco provisório
  js/rig.js           animação procedural do esqueleto
  js/perfil/          contas locais (armazenamento.js = interface trocável)
  assets/vfx/         efeitos usados (WebP 1024px)
  assets/models/      coloque aqui os .glb da Tripo
  vendor/three/       Three.js r186
  servidor.py         servidor local
```

## Licenças dos efeitos
Os efeitos em `assets/vfx/` vêm do pacote **Seamproof VFX Sprite Sheets** (licença comprada: pode usar em jogos,
mas **não** pode redistribuir as folhas como pacote de assets). Three.js é MIT.
