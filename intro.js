class IntroGame {
  constructor() {
    this.game = new ChessGame();
    this.introOverlay = document.getElementById('intro-overlay');
    this.introBoardEl = document.getElementById('intro-chessboard');
    this.ctaEl = document.querySelector('.intro-cta');

    this.startIntroAnimation();
  }

  startIntroAnimation() {
    // Build intro board squares
    this.introBoardEl.innerHTML = '';
    const cellSize = 46;
    this.introBoardEl.style.setProperty('--intro-cell', `${cellSize}px`);

    const pieces = [];
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const square = document.createElement('div');
        square.classList.add('intro-square', (row + col) % 2 === 0 ? 'light' : 'dark');
        square.dataset.row = row;
        square.dataset.col = col;
        this.introBoardEl.appendChild(square);

        const piece = this.game.getPiece(row, col);
        if (piece) pieces.push({ row, col, piece });
      }
    }

    // Measure and set board size
    const boardRect = this.introBoardEl.getBoundingClientRect();
    const boardW = boardRect.width || (cellSize * 8);
    const boardH = boardRect.height || (cellSize * 8);
    this.introBoardEl.style.width = `${boardW}px`;
    this.introBoardEl.style.height = `${boardH}px`;

    // Create piece elements that fall into place
    const maxDelay = 180;
    pieces.forEach((p, idx) => {
      const el = document.createElement('div');
      el.classList.add('intro-piece');
      el.textContent = this.game.getUnicodePiece(p.piece);
      el.style.left = `calc(${(p.col * cellSize)}px + 0px)`;
      el.style.top = `calc(${(p.row * cellSize)}px + 0px)`;

      const fallHeight = boardH + 80;
      el.style.transform = `translateY(-${fallHeight}px)`;
      const delay = (idx % 32) * (maxDelay / 32);
      el.style.animationDelay = `${delay}ms`;

      this.introBoardEl.appendChild(el);
    });

    // Some browsers only start animations on the next frame; force layout + reflow.
    // Also (re)apply class in case the overlay was cached from a bfcache restore.
    this.introOverlay.classList.remove('intro-playing');
    // eslint-disable-next-line no-unused-expressions
    this.introOverlay.offsetHeight;
    this.introOverlay.classList.add('intro-playing');

    // Fade out after animation completes
    // Requirement: index.html should last ~10 seconds, and all pieces must land before redirect.
    // CSS animation: piece-fall 900ms (see styles.css). We also stagger piece delays up to maxDelay.
    // To ensure a full ~10s on slow devices, add a larger buffer.
    const animationDurationMs = 900; // must match CSS @keyframes piece-fall duration
    const maxDelayMs = maxDelay; // already computed as 180
    const totalMs = animationDurationMs + maxDelayMs + 8000; // ~10s total


    setTimeout(() => {
      this.introOverlay.classList.add('intro-finished');
      if (this.ctaEl) this.ctaEl.remove();

      // Redirect to mode selection view
      window.location.replace('modes.html');
    }, totalMs);
  }
}

window.addEventListener('load', () => new IntroGame());

