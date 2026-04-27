1. Introdução
O NIXX é um jogo de sobrevivência e reflexos com estética cyberpunk, inspirado nos clássicos jogos de "Light Cycles". Foi desenvolvido para ser uma aplicação web de alta performance, mas com suporte nativo para dispositivos móveis através do Capacitor.

2. Estrutura do Sistema
O projeto segue uma arquitetura baseada em Estado de Jogo (State Management) e um Motor de Renderização em Canvas.

Ficheiros Principais:
index.html: Define as camadas da interface (Menus, HUD, Telas de Game Over).

style.css: Controla a identidade visual "Neon" e animações de interface.

game.js: Contém o núcleo lógico, motor de física (colisões) e IA.

3. Lógica do Motor de Jogo (Game Loop)
O jogo não utiliza bibliotecas externas (como Phaser), dependendo exclusivamente da Canvas API. O loop é controlado por um setInterval cuja velocidade varia conforme a dificuldade.

Exemplo de Configuração de Velocidade:

JavaScript
// game.js
const SPEED_MS = [90, 75, 60]; // Fácil (90ms), Normal (75ms), Difícil (60ms)

function startGame() {
    const ms = SPEED_MS[diffLevel - 1];
    gameLoop = setInterval(update, ms); // Executa a lógica a cada 'ms'
}
4. Mecânicas Principais
4.1. Sistema de Movimentação e Rastro
Para evitar erros de colisão lógica, o sistema utiliza um buffer de direção (ndx, ndy) que impede que o jogador vire 180 graus sobre si mesmo.

Implementação do Rastro:
O rastro é uma array de coordenadas. Para otimizar a memória e a jogabilidade, o rastro tem um tamanho máximo (MAX_TRAIL).

JavaScript
// game.js
p.trail.push({x: p.x, y: p.y}); // Adiciona nova posição
if (p.trail.length > MAX_TRAIL) {
    p.trail.shift(); // Remove a ponta antiga para o rastro "andar"
}
4.2. Detecção de Colisão
A detecção é feita verificando se a próxima célula (x + dx, y + dy) coincide com:

Os limites da arena (paredes).

Qualquer rastro de qualquer jogador ou inimigo.

JavaScript
function checkCollision(x, y, id) {
    if (x < 0 || x >= COLS || y < 0 || y >= ROWS) return true; // Paredes
    // Verifica rastros de todos os jogadores/inimigos
    for (let p of allEntities) {
        if (p.trail.some(t => t.x === x && t.y === y)) return true;
    }
    return false;
}
5. Inteligência Artificial (IA)
A IA no modo PVE utiliza um algoritmo de Previsão de Colisão Local. Em cada frame, ela "olha" para a frente; se detectar um obstáculo, ela baralha as direções possíveis e escolhe a primeira que estiver livre.

Exemplo de Comportamento:

JavaScript
function updateEnemy(e) {
    if (checkCollision(e.x + e.dx, e.y + e.dy, e.id)) {
        const dirs = ['U','D','L','R'].sort(() => Math.random() - 0.5);
        for(let d of dirs) {
            // Tenta mudar de direção antes de bater
        }
    }
}
6. Interface e UX (Design System)
A estética é garantida pelo uso de filtros de brilho (drop-shadow) e animações de texto no CSS.

Variáveis de Estilo (style.css):

--c1: Azul Neon (#0064ff) - Jogador 1.

--ce: Laranja Vibrante (#ff4500) - Inimigos.

--bg: Fundo Escuro (#0a0a14) - Contraste.

Animação Glow:

CSS
@keyframes glow {
  0%, 100% { text-shadow: 0 0 10px var(--c1g); }
  50% { text-shadow: 0 0 25px var(--c1); }
}
7. Distribuição Mobile (Capacitor)
O projeto está pronto para ser compilado via Capacitor CLI.

Configurações do Projeto:

App ID: com.NIXX.app

Nome: NIXX

Plataforma Alvo: Android (v8.3.1).

Comandos de Deploy:

npx cap sync: Sincroniza o código web com as pastas nativas.

npx cap open android: Abre o projeto no Android Studio para gerar o APK.

8. Controles do Utilizador
Teclado: Setas (P1) e WASD (P2).

Touch: D-pads virtuais dinâmicos integrados no index.html que chamam as funções d1() e d2().