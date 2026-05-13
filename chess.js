class ChessGame {
  constructor() {
    this.board = this.initialBoard();
    this.currentPlayer = 'w';
    this.selectedPiece = null;
    this.moveHistory = [];
    this.gameOver = false;
    this.gameState = null; // 'checkmate', 'stalemate', etc.
  }

  initialBoard() {
    const board = Array(8).fill().map(() => Array(8).fill(null));
    // Pawns
    for (let i = 0; i < 8; i++) {
      board[1][i] = { type: 'p', color: 'b' };
      board[6][i] = { type: 'P', color: 'w' };
    }
    // Rooks
    board[0][0] = board[0][7] = { type: 'r', color: 'b' };
    board[7][0] = board[7][7] = { type: 'R', color: 'w' };
    // Knights
    board[0][1] = board[0][6] = { type: 'n', color: 'b' };
    board[7][1] = board[7][6] = { type: 'N', color: 'w' };
    // Bishops
    board[0][2] = board[0][5] = { type: 'b', color: 'b' };
    board[7][2] = board[7][5] = { type: 'B', color: 'w' };
    // Queens
    board[0][3] = { type: 'q', color: 'b' };
    board[7][3] = { type: 'Q', color: 'w' };
    // Kings
    board[0][4] = { type: 'k', color: 'b' };
    board[7][4] = { type: 'K', color: 'w' };
    return board;
  }

  getPiece(row, col) {
    return this.board[row][col];
  }

  movePiece(fromRow, fromCol, toRow, toCol) {
    if (this.gameOver) return false;

    const piece = this.getPiece(fromRow, fromCol);
    if (!piece || piece.color !== this.currentPlayer) return false;

    const move = { fromRow, fromCol, toRow, toCol, piece: { ...piece } };
    if (this.isLegalMove(fromRow, fromCol, toRow, toCol)) {
      this.board[toRow][toCol] = piece;
      this.board[fromRow][fromCol] = null;
      this.moveHistory.push(move);

      // Pawn promotion
      if (piece.type === 'P' && toRow === 0) {
        this.board[toRow][toCol] = { type: 'Q', color: 'w' };
      } else if (piece.type === 'p' && toRow === 7) {
        this.board[toRow][toCol] = { type: 'q', color: 'b' };
      }

      this.switchPlayer();
      this.checkGameState();
      return true;
    }
    return false;
  }

  isLegalMove(fromRow, fromCol, toRow, toCol) {
    const piece = this.getPiece(fromRow, fromCol);
    const target = this.getPiece(toRow, toCol);
    if (!piece || (target && target.color === piece.color)) return false;
    if (target && target.type.toLowerCase() === 'k') return false; // No king capture in basic

    const deltaRow = toRow - fromRow;
    const deltaCol = toCol - fromCol;
    const dist = Math.max(Math.abs(deltaRow), Math.abs(deltaCol));

    switch (piece.type.toLowerCase()) {
      case 'p': // Pawn
        if (piece.color === 'w') {
          if (deltaCol === 0 && !target) { // Forward
            if (fromRow === 6 && deltaRow === -2) return true;
            return deltaRow === -1;
          } else if (Math.abs(deltaCol) === 1 && deltaRow === -1 && target) { // Diagonal capture
            return true;
          }
        } else {
          if (deltaCol === 0 && !target) {
            if (fromRow === 1 && deltaRow === 2) return true;
            return deltaRow === 1;
          } else if (Math.abs(deltaCol) === 1 && deltaRow === 1 && target) {
            return true;
          }
        }
        return false;

      case 'r': // Rook
        if (deltaRow !== 0 && deltaCol !== 0) return false;
        return this.isPathClear(fromRow, fromCol, toRow, toCol);

      case 'n': // Knight
        return (Math.abs(deltaRow) === 2 && Math.abs(deltaCol) === 1) || (Math.abs(deltaRow) === 1 && Math.abs(deltaCol) === 2);

      case 'b': // Bishop
        if (Math.abs(deltaRow) !== Math.abs(deltaCol)) return false;
        return this.isPathClear(fromRow, fromCol, toRow, toCol);

      case 'q': // Queen
        if (deltaRow !== 0 && deltaCol !== 0 && Math.abs(deltaRow) !== Math.abs(deltaCol)) return false;
        return this.isPathClear(fromRow, fromCol, toRow, toCol);

      case 'k': // King
        return Math.abs(deltaRow) <= 1 && Math.abs(deltaCol) <= 1;
    }
    return false;
  }

  isPathClear(fromRow, fromCol, toRow, toCol) {
    const rowStep = Math.sign(toRow - fromRow);
    const colStep = Math.sign(toCol - fromCol);
    let r = fromRow + rowStep;
    let c = fromCol + colStep;
    while (r !== toRow || c !== toCol) {
      if (this.getPiece(r, c)) return false;
      r += rowStep;
      c += colStep;
    }
    return true;
  }

  switchPlayer() {
    this.currentPlayer = this.currentPlayer === 'w' ? 'b' : 'w';
  }

  checkGameState() {
    const king = this.findKing(this.currentPlayer === 'w' ? 'b' : 'w');
    if (king && this.isInCheck(king.row, king.col)) {
      const hasMoves = this.hasLegalMoves(this.currentPlayer);
      if (!hasMoves) {
        this.gameOver = true;
        this.gameState = 'checkmate';
      }
    } else if (!this.hasLegalMoves(this.currentPlayer)) {
      this.gameOver = true;
      this.gameState = 'stalemate';
    }
  }

  findKing(color) {
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = this.getPiece(r, c);
        if (p && p.color === color && p.type.toLowerCase() === 'k') {
          return { row: r, col: c };
        }
      }
    }
    return null;
  }

  isInCheck(kingRow, kingCol) {
    const opponent = this.currentPlayer === 'w' ? 'b' : 'w';
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = this.getPiece(r, c);
        if (p && p.color === opponent && this.isLegalMove(r, c, kingRow, kingCol)) {
          return true;
        }
      }
    }
    return false;
  }

  hasLegalMoves(color) {
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = this.getPiece(r, c);
        if (p && p.color === color) {
          for (let tr = 0; tr < 8; tr++) {
            for (let tc = 0; tc < 8; tc++) {
              if (this.isLegalMove(r, c, tr, tc)) return true;
            }
          }
        }
      }
    }
    return false;
  }

  reset() {
    this.board = this.initialBoard();
    this.currentPlayer = 'w';
    this.selectedPiece = null;
    this.moveHistory = [];
    this.gameOver = false;
    this.gameState = null;
  }

  getUnicodePiece(piece) {
    if (!piece) return '';
    const map = {
      'K': '♔', 'Q': '♕', 'R': '♖', 'B': '♗', 'N': '♘', 'P': '♙',
      'k': '♚', 'q': '♛', 'r': '♜', 'b': '♝', 'n': '♞', 'p': '♟'
    };
    return map[piece.type] || '';
  }
}
