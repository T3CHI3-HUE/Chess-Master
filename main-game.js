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
        square.addEventListener('dragover', this.handleDragOver.bind(this));
        square.addEventListener('drop', this.handleDrop.bind(this));
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
      const alg = `${String.fromCharCode(97 + move.fromCol)}${8 - move.fromRow} to ${String.fromCharCode(97 + move.toCol)}${8 - move.toRow}`;
      const li = document.createElement('li');
      li.textContent = `#${Math.floor(i / 2) + 1} ${alg}`;
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

  // Step-by-step “Let’s Play” puzzle objectives.
  // Coordinates are based on the app’s board indexing:
  // row 0 = black back rank, row 7 = white back rank.
  // file mapping: col 0=a ... col 7=h.
  // This sequence is intentionally simple and works with the app’s current (basic) move rules.
  const steps = [
    // Step 1: White plays e2 -> e4
    { turn: 'w', from: { r: 6, c: 4 }, to: { r: 4, c: 4 }, label: 'Step 1: Play e2 to e4.' },
    // Step 2: Black plays e7 -> e5
    { turn: 'b', from: { r: 1, c: 4 }, to: { r: 3, c: 4 }, label: 'Step 2: Black responds with e7 to e5.' },
    // Step 3: White plays d2 -> d4
    { turn: 'w', from: { r: 6, c: 3 }, to: { r: 4, c: 3 }, label: 'Step 3: Play d2 to d4.' },
    // Step 4: Black plays e5 -> d4 capturing that pawn (e5xd4)
    { turn: 'b', from: { r: 3, c: 4 }, to: { r: 4, c: 3 }, label: 'Step 4: Capture on d4 (e5 to d4).' },
    // Step 5: White plays c1 -> g5 (bishop to g5)
    { turn: 'w', from: { r: 7, c: 2 }, to: { r: 3, c: 6 }, label: 'Step 5: Develop your bishop to g5.' },
    // Step 6: Black plays d4 -> e3 capturing again (d4xe3)
    { turn: 'b', from: { r: 4, c: 3 }, to: { r: 5, c: 4 }, label: 'Step 6: Capture on e3 (d4 to e3).' },
  ];

  const statusEl = document.getElementById('status');
  const learnerMessageEl = document.getElementById('learner-message');

  // Show square coordinates during “Let’s Play” so instructions like e4/e5 are easy to follow.
  document.body.dataset.showCoords = '1';


  let stepIndex = 0;

  function moveToKey(m) {
    return `${m.from.r},${m.from.c}->${m.to.r},${m.to.c}`;
  }

  function getCurrentStep() {
    return steps[stepIndex] || null;
  }

  function setPrompt(text) {
    if (statusEl) statusEl.textContent = text;
    if (learnerMessageEl) learnerMessageEl.textContent = '';
  }

  function advanceIfPlayerMadeCorrectMove(game) {
    const step = getCurrentStep();
    if (!step) return;

    // After a correct player move, currentPlayer has already switched.
    // So we check based on the move that just happened.
    const last = game.moveHistory[game.moveHistory.length - 1];
    if (!last) return;

    const correct =
      last.fromRow === step.from.r &&
      last.fromCol === step.from.c &&
      last.toRow === step.to.r &&
      last.toCol === step.to.c;

    if (correct) {
      stepIndex++;
      setPrompt(getCurrentStep()?.label || 'Tutorial complete!');
    } else {
      // Nudge without blocking.
      if (learnerMessageEl) learnerMessageEl.textContent = `Try again: ${step.label}`;
    }
  }

  // Override the UI’s move behavior by polling on each successful move.
  // Since we don’t have hooks, we intercept by patching movePiece once.
  // (This only affects the “Let’s Play” mode.)
  const originalMovePiece = ChessGame.prototype.movePiece;
  ChessGame.prototype.movePiece = function (fromRow, fromCol, toRow, toCol) {
    const ok = originalMovePiece.call(this, fromRow, fromCol, toRow, toCol);
    if (!ok) return false;

    // If it was the player’s turn for this step, validate.
    const step = getCurrentStep();
    if (step && step.turn === this.currentPlayer) {
      // NOTE: currentPlayer has already been switched in movePiece.
      // The step.turn corresponds to the side that made the move before switch,
      // so we compare against the last move instead of this.currentPlayer.
      // We treat “turn correctness” as: step belongs to the side that moved.
      // The simplest approach: validate last move regardless of whose turn now.
      // If the move is correct, advance.
      advanceIfPlayerMadeCorrectMove(this);
    } else {
      advanceIfPlayerMadeCorrectMove(this);
    }

    // If AI should respond (i.e., next step is black), auto-play.
    // We wait until after the player move has updated the board.
    const next = getCurrentStep();
    if (next && next.turn === 'b' && !this.gameOver) {
      // Compute and perform the required AI move.
      const aiMove = next;
      // If the required piece isn’t present / move illegal due to earlier divergence, stop.
      const did = originalMovePiece.call(this, aiMove.from.r, aiMove.from.c, aiMove.to.r, aiMove.to.c);
      if (did) {
        stepIndex++;
        setPrompt(getCurrentStep()?.label || 'Tutorial complete!');
      }
    }

    return ok;
  };

  // Initial prompt.
  setPrompt(getCurrentStep()?.label || 'Let’s Play');
}


window.addEventListener('load', () => {
  new ChessUI();
  applyLearnerModeHints();
});


