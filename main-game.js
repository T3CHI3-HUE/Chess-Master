class ChessUI {
  constructor() {
    this.game = new ChessGame();
    this.boardEl = document.getElementById('chessboard');
    this.statusEl = document.getElementById('status');
    this.turnEl = document.getElementById('turn-indicator');
    this.historyEl = document.getElementById('move-history');
    this.resetBtn = document.getElementById('reset-btn');
    this.historyToggle = document.getElementById('history-toggle');

    this.draggedPiece = null;
    this.selectedSquare = null;

    this.initBoard();
    this.updateStatus();
    this.bindEvents();
    this.render();
  }

  initBoard() {
    this.boardEl.innerHTML = '';
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const square = document.createElement('div');
        square.classList.add('square', (row + col) % 2 === 0 ? 'light' : 'dark');
        square.dataset.row = row;
        square.dataset.col = col;

        // Drag support (desktop)
        square.addEventListener('dragover', this.handleDragOver.bind(this));
        square.addEventListener('drop', this.handleDrop.bind(this));

        // Tap/click support (mobile + fallback)
        square.addEventListener('click', this.handleSquareClick.bind(this));

        this.boardEl.appendChild(square);
      }
    }
  }


  bindEvents() {
    this.resetBtn.addEventListener('click', () => {
      this.game.reset();
      this.selectedSquare = null;
      this.updateStatus();
      this.render();
    });

    this.historyToggle.addEventListener('click', () => {
      const display = this.historyEl.style.display === 'none' ? 'block' : 'none';
      this.historyEl.style.display = display;
      this.historyToggle.textContent = display === 'none' ? 'Move History' : 'Hide History';
    });
  }

  render() {
    const squares = this.boardEl.querySelectorAll('.square');
    squares.forEach(square => {
      const row = parseInt(square.dataset.row);
      const col = parseInt(square.dataset.col);
      const piece = this.game.getPiece(row, col);
      square.innerHTML = '';
      if (piece) {
        const pieceEl = document.createElement('div');
        pieceEl.classList.add('piece');
        pieceEl.textContent = this.game.getUnicodePiece(piece);
        pieceEl.draggable = true;
        pieceEl.addEventListener('dragstart', this.handleDragStart.bind(this));
        square.appendChild(pieceEl);
      }
      // Visual feedback
      square.classList.remove('selected', 'valid-move', 'capture');

      // Optional coordinate hint overlay: show algebraic coordinate in top-left of each square.
      // Keep it subtle so it doesn’t overpower pieces.
      const showCoords = document.body.dataset.showCoords === '1';
      if (showCoords) {
        const coordEl = document.createElement('div');
        coordEl.style.position = 'absolute';
        coordEl.style.top = '2px';
        coordEl.style.left = '3px';
        coordEl.style.fontSize = '11px';
        coordEl.style.fontWeight = '700';
        coordEl.style.color = 'rgba(255,255,255,0.65)';
        coordEl.style.pointerEvents = 'none';
        coordEl.style.fontFamily = 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace';
        coordEl.textContent = `${String.fromCharCode(97 + col)}${8 - row}`;
        square.appendChild(coordEl);
      }
    });


    if (this.selectedSquare) {
      const selSquare = this.boardEl.querySelector(`[data-row="${this.selectedSquare.row}"][data-col="${this.selectedSquare.col}"]`);
      selSquare.classList.add('selected');
      this.highlightMoves(this.selectedSquare.row, this.selectedSquare.col);
    }
  }

  highlightMoves(row, col) {
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        if (this.game.isLegalMove(row, col, r, c)) {
          const targetSquare = this.boardEl.querySelector(`[data-row="${r}"][data-col="${c}"]`);
          const piece = this.game.getPiece(r, c);
          targetSquare.classList.add(piece ? 'capture' : 'valid-move');
        }
      }
    }
  }

  handleDragStart(e) {
    // If the drag is initiated from an overlay coordinate element,
    // walk up to the actual draggable piece element.
    const pieceEl = e.target.classList && e.target.classList.contains('piece')
      ? e.target
      : e.target.closest('.piece');
    if (!pieceEl) {
      e.preventDefault();
      return;
    }

    const square = pieceEl.parentElement;
    const row = parseInt(square.dataset.row);
    const col = parseInt(square.dataset.col);
    const piece = this.game.getPiece(row, col);


    if (piece && piece.color === this.game.currentPlayer) {
      this.selectedSquare = { row, col };
      this.draggedPiece = e.target;
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', `${row},${col}`);
      setTimeout(() => {
        square.classList.add('selected');
      }, 0);
    } else {
      e.preventDefault();
    }
  }

  handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }

  handleDrop(e) {
    e.preventDefault();
    const data = e.dataTransfer.getData('text/plain');
    const [fromRow, fromCol] = data.split(',').map(Number);
    const toRow = parseInt(e.target.closest('.square').dataset.row);
    const toCol = parseInt(e.target.closest('.square').dataset.col);

    if (this.game.movePiece(fromRow, fromCol, toRow, toCol)) {
      // Animation
      const targetSquare = e.target.closest('.square');
      const pieces = targetSquare.querySelectorAll('.piece');
      pieces.forEach(p => p.classList.add('move-animation'));
      setTimeout(() => pieces.forEach(p => p.classList.remove('move-animation')), 500);

      this.selectedSquare = null;
      this.updateStatus();
      this.updateHistory();
    }
    this.render();
  }

  handleSquareClick(e) {
    // Tap-to-move: click a piece square to select, then click a target square.
    const squareEl = e.target.closest('.square');
    if (!squareEl) return;

    const row = parseInt(squareEl.dataset.row);
    const col = parseInt(squareEl.dataset.col);
    const piece = this.game.getPiece(row, col);

    // No selection yet: select if it is current player's piece.
    if (!this.selectedSquare) {
      if (piece && piece.color === this.game.currentPlayer) {
        this.selectedSquare = { row, col };
        this.render();
      }
      return;
    }

    // Clicking the same square toggles off.
    if (this.selectedSquare.row === row && this.selectedSquare.col === col) {
      this.selectedSquare = null;
      this.render();
      return;
    }

    // Attempt move.
    const fromRow = this.selectedSquare.row;
    const fromCol = this.selectedSquare.col;
    const moved = this.game.movePiece(fromRow, fromCol, row, col);

    if (moved) {
      this.selectedSquare = null;
      this.updateStatus();
      this.updateHistory();
    } else {
      // If move was illegal, allow re-selecting when clicking another own piece.
      if (piece && piece.color === this.game.currentPlayer) {
        this.selectedSquare = { row, col };
      }
    }

    this.render();
  }


  updateStatus() {
    if (this.game.gameOver) {
      this.statusEl.textContent = this.game.gameState === 'checkmate'
        ? `${this.game.currentPlayer === 'w' ? 'Black' : 'White'} wins by checkmate!`
        : 'Stalemate!';
    } else {
      this.statusEl.textContent = `${this.game.currentPlayer === 'w' ? "White's" : "Black's"} Turn`;
    }
    this.turnEl.textContent = `${this.game.currentPlayer === 'w' ? 'White' : 'Black'} to play`;
  }

  updateHistory() {
    this.historyEl.innerHTML = '<h4>Move History:</h4>';
    this.game.moveHistory.forEach((move, i) => {
      const fromFile = String.fromCharCode(97 + move.fromCol);
      const fromRank = (8 - move.fromRow).toString();
      const toFile = String.fromCharCode(97 + move.toCol);
      const toRank = (8 - move.toRow).toString();
      // Ensure consistent visual alignment: use fixed-width format and spacing.
      // (e.g., always render like: e2 → e4)
      const alg = `${fromFile}${fromRank}			${toFile}${toRank}`;

      const li = document.createElement('li');
      li.textContent = `#${Math.floor(i / 2) + 1}	${alg}`;

      this.historyEl.appendChild(li);
    });
  }
}

function applyLearnerModeHints() {
  const params = new URLSearchParams(window.location.search);
  const mode = params.get('match');
  const level = params.get('level');

  // In this codebase, “let’s play” is represented as level=lets-play and match=tutorial.
  if (level !== 'lets-play' || mode !== 'tutorial') return;

  // Full scripted “Let’s Play” guide.
  // IMPORTANT: this app uses simplified rules (no castling, no en-passant, no king capture).
  // The line below is chosen to be legal under those rules.
  const steps = [
    // 1. e2 -> e4 (player)
    { turn: 'w', from: { r: 6, c: 4 }, to: { r: 4, c: 4 }, label: 'Play e2 to e4. This opens the center.' },
    // 1... e7 -> e5 (AI)
    { turn: 'b', from: { r: 1, c: 4 }, to: { r: 3, c: 4 }, label: 'Black responds: e7 to e5. Challenge your center.' },

    // 2. d2 -> d4 (player)
    { turn: 'w', from: { r: 6, c: 3 }, to: { r: 4, c: 3 }, label: 'Play d2 to d4. Attack the center.' },
    // 2... e5 -> d4 (AI capture)
    { turn: 'b', from: { r: 3, c: 4 }, to: { r: 4, c: 3 }, label: 'Black captures on d4 (e5 to d4).' },

    // 3. bishop c1 -> g5 (player)
    { turn: 'w', from: { r: 7, c: 2 }, to: { r: 3, c: 6 }, label: 'Develop: bishop to g5. Put pressure on key squares.' },
    // 3... d4 -> e3 (AI capture)
    { turn: 'b', from: { r: 4, c: 3 }, to: { r: 5, c: 4 }, label: 'Black captures again: d4 to e3.' },

    // 4. g2 pawn -> g4 (player)
    { turn: 'w', from: { r: 6, c: 6 }, to: { r: 4, c: 6 }, label: 'Push g-pawn to g4. Gain space and support attacks.' },
    // 4... e3 -> e2 (AI forward; pawn at e3 goes to e2)
    { turn: 'b', from: { r: 5, c: 4 }, to: { r: 6, c: 4 }, label: 'Black advances: e3 to e2.' },

    // 5. king e1 -> f1 (player, simplified king move)
    { turn: 'w', from: { r: 7, c: 4 }, to: { r: 7, c: 5 }, label: 'Step king to f1 for safety and to connect your pieces.' },
    // 5... e2 -> e1 (AI pawn to last rank triggers promotion)
    { turn: 'b', from: { r: 6, c: 4 }, to: { r: 7, c: 4 }, label: 'Black pawn goes to e1 and promotes.' },

    // 6. queen d1 -> e2 (player, simplified queen movement)
    { turn: 'w', from: { r: 7, c: 3 }, to: { r: 6, c: 4 }, label: 'Bring the queen to e2. Control the center and respond to the threat.' },
    // 6... promoted piece: use a safe AI move a7 -> a6
    { turn: 'b', from: { r: 1, c: 0 }, to: { r: 2, c: 0 }, label: 'Black: a7 to a6. Improve pawn structure.' },

    // 7 (end). queen e2 -> e3
    { turn: 'w', from: { r: 6, c: 4 }, to: { r: 5, c: 4 }, label: 'Finish: move queen to e3. Keep pieces active and press forward.' }
  ];

  const statusEl = document.getElementById('status');
  const learnerMessageEl = document.getElementById('learner-message');

  // Show square coordinates during “Let’s Play” so instructions like e4/e5 are easy to follow.
  document.body.dataset.showCoords = '1';

  // Text-to-speech tutor (English).
  const synth = window.speechSynthesis;
  let isSpeaking = false;

  function speak(text) {
    if (!synth || !text) return;
    try {
      // Stop any current speech, then speak new prompt.
      synth.cancel();
      isSpeaking = true;
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'en-US';
      u.rate = 0.95;
      u.pitch = 1.0;
      u.onend = () => { isSpeaking = false; };
      u.onerror = () => { isSpeaking = false; };
      synth.speak(u);
    } catch (e) {
      // Ignore TTS failures.
    }
  }

  let stepIndex = 0;

  function getCurrentStep() {
    return steps[stepIndex] || null;
  }

  function setPrompt(text) {
    if (statusEl) statusEl.textContent = text;
    // Keep the guide visible during the whole scripted line.
    if (learnerMessageEl) learnerMessageEl.textContent = text;

    // Speak every step.
    speak(text);

  }


  function advanceIfPlayerMadeCorrectMove(game) {
    const step = getCurrentStep();
    if (!step) return;

    const last = game.moveHistory[game.moveHistory.length - 1];
    if (!last) return;

    const correct =
      last.fromRow === step.from.r &&
      last.fromCol === step.from.c &&
      last.toRow === step.to.r &&
      last.toCol === step.to.c;

    if (correct) {
      stepIndex++;
      const next = getCurrentStep();
      setPrompt((next && next.label) ? next.label : 'Tutorial complete!');
    } else {
      // Keep voice + guide stable; only show a brief correction hint.
      if (learnerMessageEl) learnerMessageEl.textContent = `Try again: ${step.label}`;
      speak(`Try again: ${step.label}`);
    }

  }

  // Override movePiece so we can validate + auto-play scripted AI moves.
  const originalMovePiece = ChessGame.prototype.movePiece;
  ChessGame.prototype.movePiece = function (fromRow, fromCol, toRow, toCol) {
    const ok = originalMovePiece.call(this, fromRow, fromCol, toRow, toCol);
    if (!ok) return false;

    advanceIfPlayerMadeCorrectMove(this);

    // If next scripted step is black, auto-play it immediately.
    let next = getCurrentStep();
    while (next && next.turn === 'b' && !this.gameOver) {
      const aiMove = next;
      const did = originalMovePiece.call(this, aiMove.from.r, aiMove.from.c, aiMove.to.r, aiMove.to.c);
      if (!did) break;
      stepIndex++;
      next = getCurrentStep();
      setPrompt((next && next.label) ? next.label : 'Tutorial complete!');
    }

    return ok;
  };

  // Initial prompt.
  setPrompt(getCurrentStep() && getCurrentStep().label ? getCurrentStep().label : 'Let’s Play');
}


window.addEventListener('load', () => {
  const ui = new ChessUI();
  window.__chessUIInstance = ui;
  applyLearnerModeHints();

  // Player vs AI support

  const params = new URLSearchParams(window.location.search);
  const match = params.get('match');
  const level = params.get('level');

if (match === 'pvai' && level) {
    window.__aiState = window.__aiState || { busy: false, lastMoveKey: null };

    // Determine which side AI plays.
    // By default we assume player is White and AI is Black.
    // If level/match later includes settings, this can be extended.


    // Poll for AI turns; this app has no event hooks after moves.
    setInterval(() => {
      const ui = window.__chessUIInstance;
      if (!ui) return;
      const game = ui.game;
      if (!game || game.gameOver) return;

      // AI plays black by default.
      if (game.currentPlayer === 'b') {
        if (window.__aiState && window.__aiState.busy) return;
        if (typeof aiPlayIfNeeded === 'function') {
          aiPlayIfNeeded(game, level);
          // UI will update on next user action; we also trigger a render here.
          ui.updateStatus();
          ui.updateHistory && ui.updateHistory();
          ui.render();
        }
      }
    }, 250);
  }
});



