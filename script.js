const board = ['', '', '', '', '', '', '', '', ''];
let currentPlayer = 'X';
let gameActive = true;
let gameMode = 'human'; // 'human' pentru Jucător vs Jucător, 'computer' pentru Jucător vs Computer
const socket = io('http://localhost:3000');

// Variabile pentru scoruri
let scorX = 0;
let scorO = 0;
let jocuriJucate = 0;

// Condiții pentru câștig
const winningConditions = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6],
];

// Setează modul de joc
function setGameMode(mode) {
    gameMode = mode;
    resetGame();
    document.querySelectorAll('.game-mode button').forEach(button => {
        if (button.textContent.toLowerCase().includes(mode)) {
            button.classList.add('selected');
        } else {
            button.classList.remove('selected');
        }
    });

    if (gameMode === 'computer' && currentPlayer === 'O') {
        computerMove();
    }
}

// Realizează o mutare
function makeMove(index) {
    if (board[index] !== '' || !gameActive) return;

    board[index] = currentPlayer;
    document.getElementById(`cell-${index}`).textContent = currentPlayer;

    verificaCastigator();

    if (gameMode === 'computer' && currentPlayer === 'O' && gameActive) {
        computerMove();
    }
}

// Verifică câștigătorul
function verificaCastigator() {
    let jocCastigat = false;

    for (let condition of winningConditions) {
        const [a, b, c] = condition;
        if (board[a] && board[a] === board[b] && board[a] === board[c]) {
            jocCastigat = true;
            break;
        }
    }

    if (jocCastigat) {
        document.getElementById('status').textContent = `Jucătorul ${currentPlayer} a câștigat!`;

        if (currentPlayer === 'X') scorX++;
        else scorO++;
        jocuriJucate++;

        actualizeazaScor();
        gameActive = false;
        verificaSeria();
        return;
    }

    if (!board.includes('')) {
        document.getElementById('status').textContent = 'Remiză!';
        jocuriJucate++;
        actualizeazaScor();
        verificaSeria();
        gameActive = false;
        return;
    }

    currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
    document.getElementById('status').textContent = `Este rândul jucătorului ${currentPlayer}`;
}

// Resetează jocul curent
function resetGame() {
    board.fill('');
    currentPlayer = 'X';
    gameActive = true;
    document.getElementById('status').textContent = 'Este rândul jucătorului X';
    document.querySelectorAll('.cell').forEach(cell => (cell.textContent = ''));
}

// Mișcare pentru computer
function computerMove() {
    const emptyCells = board
        .map((cell, index) => (cell === '' ? index : null))
        .filter(index => index !== null);

    if (emptyCells.length > 0) {
        const randomIndex = emptyCells[Math.floor(Math.random() * emptyCells.length)];
        makeMove(randomIndex);
    }
}

// Actualizează scorul
function actualizeazaScor() {
    document.getElementById('scoreX').textContent = scorX;
    document.getElementById('scoreO').textContent = scorO;
    document.getElementById('gamesPlayed').textContent = jocuriJucate;
}

// Verifică dacă seria este câștigată
function verificaSeria() {
    if (scorX === 3 || scorO === 3) {
        const castigator = scorX === 3 ? 'Jucătorul X' : 'Jucătorul O';
        document.getElementById('status').textContent = `${castigator} a câștigat seria!`;
        gameActive = false;
        setTimeout(resetSeria, 5000);
    }
}

// Resetează seria
function resetSeria() {
    scorX = 0;
    scorO = 0;
    jocuriJucate = 0;
    actualizeazaScor();
    resetGame();
}

// Lobby pentru jocuri online
socket.on('lobbyUpdate', (players) => {
    const lobbyElement = document.getElementById('players-list');
    lobbyElement.innerHTML = '';
    Object.values(players).forEach(player => {
        const playerItem = document.createElement('li');
        playerItem.textContent = `Jucător ${player.id}`;
        if (!player.inGame) {
            const joinButton = document.createElement('button');
            joinButton.textContent = 'Alătură-te';
            joinButton.addEventListener('click', () => {
                socket.emit('joinGame', player.id);
            });
            playerItem.appendChild(joinButton);
        }
        lobbyElement.appendChild(playerItem);
    });
});

// Creează joc
document.getElementById('createGame').addEventListener('click', () => {
    socket.emit('createGame');
});

// Actualizează tabla de joc
socket.on('updateBoard', ({ index, player }) => {
    board[index] = player;
    document.getElementById(`cell-${index}`).textContent = player;
});

// Începe jocul
socket.on('startGame', (symbol) => {
    currentPlayer = symbol;
    document.getElementById('status').textContent = `Joci cu simbolul ${symbol}`;
});

// Script completat cu sunete și efecte vizuale

let playerSymbol;
let gameId;
let isMyTurn = false;

// Preluăm elementele audio
const placeSound = new Audio('/sounds/place.mp3');
const winSound = new Audio('/sounds/win.mp3');
const drawSound = new Audio('/sounds/draw.mp3');

document.querySelectorAll('.cell').forEach((cell, index) => {
    cell.addEventListener('click', () => {
        if (isMyTurn && !cell.textContent) {
            socket.emit('makeMove', { gameId, index, player: playerSymbol });
        }
    });
});

// Efect pentru plasarea unei mutări
socket.on('updateBoard', ({ board }) => {
    board.forEach((symbol, index) => {
        const cell = document.querySelectorAll('.cell')[index];
        if (cell.textContent !== symbol) {
            cell.textContent = symbol;

            // Redăm sunet la plasare
            if (symbol) {
                placeSound.play();
            }
        }
    });
});

// Evidențierea combinației câștigătoare
socket.on('gameOver', ({ winner, combination }) => {
    if (combination) {
        combination.forEach((index) => {
            const cell = document.querySelectorAll('.cell')[index];
            cell.classList.add('winning-cell');
        });
    }

    if (winner) {
        if (winner === playerSymbol) {
            winSound.play();
            alert('Felicitări! Ai câștigat!');
        } else {
            alert('Ai pierdut!');
        }
    } else {
        drawSound.play();
        alert('Remiză!');
    }

    resetBoard();
});

// Resetare tablă după finalul jocului
function resetBoard() {
    document.querySelectorAll('.cell').forEach((cell) => {
        cell.textContent = '';
        cell.classList.remove('winning-cell');
    });
}

// Alte evenimente...
