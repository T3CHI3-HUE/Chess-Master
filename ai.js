// Lightweight AI for this app.
// Note: this app's ChessGame implementation is a simplified chess ruleset.
// The AI uses the existing game.isLegalMove() and game.movePiece() APIs.

function aiChooseMove(game, options = {}) {
  const level = options.level || 'beginner';
  const color = game.currentPlayer;

  // Collect all legal moves for the side to play.
  const moves = [];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = game.getPiece(r, c);
      if (!piece || piece.color !== color) continue;
      for (let tr = 0; tr < 8; tr++) {
        for (let tc = 0; tc < 8; tc++) {
          if (game.isLegalMove(r, c, tr, tc)) {
            moves.push({ fromRow: r, fromCol: c, toRow: tr, toCol: tc });
          }
        }
      }
    }
  }

  if (moves.length === 0) return null;

  // Difficulty knobs
  // - beginner: shallow + frequent mistakes
  // - intermediate: more lookahead + less randomness + better ordering
  // - master: deeper + stronger ordering + mobility in eval
  const maxDepth = level === 'beginner' ? 1 : level === 'intermediate' ? 2 : 3;

  const mistake = level === 'beginner' ? 0.25 : level === 'intermediate' ? 0.12 : 0.04;

  // Material evaluation
  const values = {
    p: 100,
    n: 320,
    b: 330,
    r: 500,
    q: 900,
    k: 20000
  };

  function evalBoard(g) {
    // Material + light positional + mobility
    let material = 0;
    let myMobility = 0;
    let oppMobility = 0;

    for (let rr = 0; rr < 8; rr++) {
      for (let cc = 0; cc < 8; cc++) {
        const p = g.getPiece(rr, cc);
        if (!p) continue;

        const t = p.type.toLowerCase();
        let v = values[t] || 0;

        // very light center bias
        const centerDist = Math.abs(3.5 - rr) + Math.abs(3.5 - cc);
        const centerBonus = (t === 'p' || t === 'n' || t === 'b') ? (30 - centerDist * 8) : 0;
        v += centerBonus;

        material += p.color === 'w' ? v : -v;
      }
    }

    // Mobility: count legal moves for both sides
    const sideToCount = ['w', 'b'];
    for (const side of sideToCount) {
      let count = 0;
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          const piece = g.getPiece(r, c);
          if (!piece || piece.color !== side) continue;
          for (let tr = 0; tr < 8; tr++) {
            for (let tc = 0; tc < 8; tc++) {
              if (g.isLegalMove(r, c, tr, tc)) count++;
            }
          }
        }
      }
      if (side === 'w') myMobility = count;
      else oppMobility = count;
    }

    // Normalize: mobility weight should be smaller than material
    const mobilityScore = (myMobility - oppMobility) * 4;

    const scoreFromWhite = material + mobilityScore;
    return color === 'w' ? scoreFromWhite : -scoreFromWhite;
  }

  function cloneGameState(g) {
    // Shallow cloning of board and history is enough for our use.
    // We re-use game instance and mutate/restore.
    return {
      board: g.board.map(row => row.map(p => (p ? { ...p } : null))),
      currentPlayer: g.currentPlayer,
      moveHistoryLen: g.moveHistory.length,
      gameOver: g.gameOver,
      gameState: g.gameState,
      moveHistory: g.moveHistory.slice()
    };
  }

  function restoreGameState(g, snap) {
    g.board = snap.board;
    g.currentPlayer = snap.currentPlayer;
    g.gameOver = snap.gameOver;
    g.gameState = snap.gameState;
    g.moveHistory = snap.moveHistory;
  }

  function moveScoreHeuristic(g, mv) {
    // MVV-LVA style ordering + slight promotion of good captures
    const target = g.getPiece(mv.toRow, mv.toCol);
    const moving = g.getPiece(mv.fromRow, mv.fromCol);
    if (!moving) return 0;

    const movingVal = values[moving.type.toLowerCase()] || 0;
    if (!target) {
      // Non-captures: minor preference for moving into the center for minor pieces
      const centerDist = Math.abs(3.5 - mv.toRow) + Math.abs(3.5 - mv.toCol);
      return (moving.type.toLowerCase() === 'n' || moving.type.toLowerCase() === 'b' || moving.type.toLowerCase() === 'p')
        ? (40 - centerDist * 6)
        : 0;
    }

    const targetVal = values[target.type.toLowerCase()] || 0;
    const captureScore = targetVal - movingVal * 0.1;
    return captureScore;
  }

  function minimax(depth, g, alpha, beta) {
    if (depth === 0 || g.gameOver) {
      return { score: evalBoard(g), move: null };
    }

    // Generate moves
    const playerColor = g.currentPlayer;
    const allMoves = [];
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = g.getPiece(r, c);
        if (!piece || piece.color !== playerColor) continue;
        for (let tr = 0; tr < 8; tr++) {
          for (let tc = 0; tc < 8; tc++) {
            if (g.isLegalMove(r, c, tr, tc)) {
              allMoves.push({ fromRow: r, fromCol: c, toRow: tr, toCol: tc });
            }
          }
        }
      }
    }

    if (allMoves.length === 0) {
      return { score: evalBoard(g), move: null };
    }

    // Move ordering: captures first
    allMoves.sort((a, b) => moveScoreHeuristic(g, b) - moveScoreHeuristic(g, a));

    const maximizing = (playerColor === color);

    let bestMove = null;
    let bestScore = maximizing ? -Infinity : Infinity;

    // Add slight randomness for weaker levels by sometimes evaluating a shuffled suffix.
    // This makes beginner/intermediate less robotic.
    if (mistake > 0 && allMoves.length > 2) {
      const shouldMistake = Math.random() < mistake && depth === maxDepth;
      if (shouldMistake) {
        const bestPrefixLen = Math.max(1, Math.floor(allMoves.length * 0.15));
        const head = allMoves.slice(0, bestPrefixLen);
        const tail = allMoves.slice(bestPrefixLen);
        // shuffle tail
        for (let i = tail.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [tail[i], tail[j]] = [tail[j], tail[i]];
        }
        allMoves.length = 0;
        allMoves.push(...head, ...tail);
      }
    }

    for (const mv of allMoves) {
      const snap = cloneGameState(g);
      const ok = g.movePiece(mv.fromRow, mv.fromCol, mv.toRow, mv.toCol);
      if (!ok) {
        restoreGameState(g, snap);
        continue;
      }

      const result = minimax(depth - 1, g, alpha, beta);
      const sc = result.score;

      restoreGameState(g, snap);

      if (maximizing) {
        if (sc > bestScore) {
          bestScore = sc;
          bestMove = mv;
        }
        alpha = Math.max(alpha, bestScore);
        if (beta <= alpha) break;
      } else {
        if (sc < bestScore) {
          bestScore = sc;
          bestMove = mv;
        }
        beta = Math.min(beta, bestScore);
        if (beta <= alpha) break;
      }
    }

    return { score: bestScore, move: bestMove };
  }

  const { move } = minimax(maxDepth, game, -Infinity, Infinity);
  return move || moves[0];
}

function aiPlayIfNeeded(game, level) {
  if (!window.__aiState) window.__aiState = { busy: false, lastMoveKey: null };
  if (window.__aiState.busy) return false;

  // Caller should ensure it's AI side's turn.
  const move = aiChooseMove(game, { level });
  if (!move) return false;

  const moveKey = `${move.fromRow},${move.fromCol}->${move.toRow},${move.toCol}`;
  if (window.__aiState.lastMoveKey === moveKey) return false;

  const delayMs = 0;


  window.__aiState.busy = true;
  setTimeout(() => {
    if (!window.__aiState) return;
    if (game.gameOver) {
      window.__aiState.busy = false;
      return;
    }

    // Re-check it's still AI's turn right before moving.
    // In this app, AI always plays Black.
    if (game.currentPlayer !== 'b') {
      window.__aiState.busy = false;
      return;
    }

    const ok = game.movePiece(move.fromRow, move.fromCol, move.toRow, move.toCol);
    if (ok) window.__aiState.lastMoveKey = moveKey;

    window.__aiState.busy = false;
  }, delayMs);

  return true;
}


