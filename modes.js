const learnerBtn = document.getElementById('learner-btn');
const gameBtn = document.getElementById('game-btn');
const learnerPanel = document.getElementById('learner-panel');
const gamePanel = document.getElementById('game-panel');
const backBtn = document.getElementById('back-btn');

const tutorialBtn = document.getElementById('tutorial-btn');
const letsPlayBtn = document.getElementById('lets-play-btn');
const learnerMessage = document.getElementById('learner-message');

const levelBtns = Array.from(document.querySelectorAll('.level-btn'));
const matchBtns = Array.from(document.querySelectorAll('.match-btn'));
const startGameBtn = document.getElementById('start-game-btn');
const gameMessage = document.getElementById('game-message');

let selectedLevel = null;
let selectedMatch = null;

function showPanel(kind) {
  learnerPanel.hidden = kind !== 'learner';
  gamePanel.hidden = kind !== 'game';

  // Reset messages
  learnerMessage.textContent = '';
  gameMessage.textContent = '';

  if (kind === 'learner') {
    const learnerTutorialEl = document.getElementById('learner-tutorial');
    if (learnerTutorialEl) learnerTutorialEl.hidden = true;
  }
}


learnerBtn.addEventListener('click', () => {
  showPanel('learner');
});

gameBtn.addEventListener('click', () => {
  showPanel('game');
});

tutorialBtn.addEventListener('click', () => {
  learnerMessage.textContent = '';
  window.location.href = 'tutorial.html';
});



letsPlayBtn.addEventListener('click', () => {
  // Advanced-practical tutorial step: start a normal game but tag it as tutorial in the URL.
  const params = new URLSearchParams({ level: 'lets-play', match: 'tutorial' });
  window.location.href = `main-game.html?${params.toString()}`;
});


function setActive(buttons, activeEl, activeClass) {
  buttons.forEach(b => b.classList.remove(activeClass));
  if (activeEl) activeEl.classList.add(activeClass);
}

levelBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    selectedLevel = btn.dataset.level;
    setActive(levelBtns, btn, 'is-active');
    gameMessage.textContent = `Level selected: ${selectedLevel}`;
    updateStartEnabled();
  });
});

matchBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    selectedMatch = btn.dataset.match;
    setActive(matchBtns, btn, 'is-active');
    gameMessage.textContent = `Match type selected: ${selectedMatch}`;
    updateStartEnabled();
  });
});

function updateStartEnabled() {
  startGameBtn.disabled = !(selectedLevel && selectedMatch);
}

startGameBtn.addEventListener('click', () => {
  if (!selectedLevel || !selectedMatch) return;

  const params = new URLSearchParams({ level: selectedLevel, match: selectedMatch });
  window.location.href = `main-game.html?${params.toString()}`;
});

backBtn.addEventListener('click', () => {
  window.location.href = 'index.html';
});

