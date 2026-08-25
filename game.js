'use strict';

// ---------- Constants ----------
const SUITS = ['S', 'D', 'C', 'H'];
const SUIT_SYMBOL = { S: '♠', D: '♦', C: '♣', H: '♥' };
const SUIT_NAME = { S: 'Spades', D: 'Diamonds', C: 'Clubs', H: 'Hearts' };
const SUIT_COLOR = { S: 'black', D: 'red', C: 'black', H: 'red' };
const SUIT_COL = { S: 0, D: 1, C: 2, H: 3 };
const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q'];
const ROWS = 8, COLS = 5;
const COLW = 100 / COLS, ROWH = 100 / ROWS, PAD = 0.6;

const shuffle = arr => {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

// ---------- DOM references ----------
const screenSelect = document.getElementById('screen-select');
const screenRace = document.getElementById('screen-race');
const screenVictory = document.getElementById('screen-victory');
const cellsLayer = document.getElementById('cells');
const tokensLayer = document.getElementById('tokens');
const legendEl = document.getElementById('legend');
const statusEl = document.getElementById('status');
const deckCounterEl = document.getElementById('deck-counter');
const deckStackEl = document.getElementById('deck-stack');
const currentCardEl = document.getElementById('current-card');
const countdownEl = document.getElementById('countdown');
const confettiEl = document.getElementById('confetti');
const victoryWinnerEl = document.getElementById('victory-winner');
const victoryTitleEl = document.getElementById('victory-title');
const victorySubtitleEl = document.getElementById('victory-subtitle');
const pauseBtn = document.getElementById('pause-btn');

// ---------- Pausable delay ----------
let paused = false, pauseResolve = null;
async function sleep(ms) {
  await new Promise(r => setTimeout(r, ms));
  if (paused) await new Promise(res => { pauseResolve = res; });
}
function togglePause() {
  if (gameOver) return;
  paused = !paused;
  pauseBtn.textContent = paused ? 'Resume' : 'Pause';
  pauseBtn.classList.toggle('is-paused', paused);
  if (paused) {
    const ov = document.createElement('div');
    ov.className = 'paused-overlay';
    ov.id = 'paused-overlay';
    ov.textContent = 'PAUSED';
    screenRace.appendChild(ov);
  } else {
    document.getElementById('paused-overlay')?.remove();
    if (pauseResolve) { pauseResolve(); pauseResolve = null; }
  }
}
pauseBtn.addEventListener('click', togglePause);

// ---------- Game state ----------
let mainDeck, bonusRow, kingPos, revealed, deckIdx;
let playerSuit, computerSuit, gameOver;
let kingEls = {}, bonusEls = {};

function newGame() {
  mainDeck = shuffle(SUITS.flatMap(suit => RANKS.map(rank => ({ suit, rank }))));
  const bonusCards = shuffle([
    ...SUITS.map(suit => ({ type: 'ace', suit })),
    { type: 'joker', color: 'red' },
    { type: 'joker', color: 'black' },
  ]);
  bonusRow = {};
  bonusCards.forEach((c, i) => { bonusRow[i + 1] = c; });
  kingPos = { S: 7, D: 7, C: 7, H: 7 };
  revealed = new Set();
  deckIdx = 0;
  gameOver = false;
  paused = false;
  pauseBtn.textContent = 'Pause';
  pauseBtn.classList.remove('is-paused');
  pauseBtn.disabled = false;
}

// ---------- Bicycle-style card markup ----------
function cardInnerHTML(rank, sym, crown) {
  return `<span class="pc-corner tl">${rank}<br>${sym}</span>` +
    `<div class="pc-center">${crown ? '<span class="crown">♛</span>' : ''}<span class="big-pip">${sym}</span></div>` +
    `<span class="pc-corner br">${rank}<br>${sym}</span>`;
}
function jokerInnerHTML() {
  return `<div class="pc-center"><span class="big-pip">🃏</span><span class="joker-label">JOKER</span></div>`;
}

// ---------- Board construction ----------
function buildCells() {
  cellsLayer.innerHTML = '';
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const cell = document.createElement('div');
      cell.className = 'cell';
      if (r === 0) cell.classList.add('finish-row');
      if (r === ROWS - 1) cell.classList.add('start-row');
      if (c === COLS - 1) cell.classList.add('bonus-col');
      cellsLayer.appendChild(cell);
    }
  }
}

function positionToken(el, row, col) {
  el.style.left = (col * COLW + PAD) + '%';
  el.style.top = (row * ROWH + PAD) + '%';
  el.style.width = (COLW - 2 * PAD) + '%';
  el.style.height = (ROWH - 2 * PAD) + '%';
}

function renderTokens() {
  tokensLayer.innerHTML = '';
  kingEls = {}; bonusEls = {};

  SUITS.forEach((suit, i) => {
    const el = document.createElement('div');
    el.className = `token king pc-front ${SUIT_COLOR[suit]} enter`;
    if (suit === playerSuit) el.classList.add('player');
    if (suit === computerSuit) el.classList.add('computer');
    el.innerHTML = cardInnerHTML('K', SUIT_SYMBOL[suit], true);
    positionToken(el, kingPos[suit], SUIT_COL[suit]);
    el.style.animationDelay = (i * 120) + 'ms';
    tokensLayer.appendChild(el);
    kingEls[suit] = el;
  });

  for (let r = 1; r <= 6; r++) {
    const el = document.createElement('div');
    el.className = 'token bonus-card enter';
    el.innerHTML = `<div class="flipper"><div class="face pc-back"></div><div class="face pc-front"></div></div>`;
    positionToken(el, r, COLS - 1);
    el.style.animationDelay = (500 + r * 90) + 'ms';
    tokensLayer.appendChild(el);
    bonusEls[r] = el;
  }
}

function moveKing(suit, row) {
  kingPos[suit] = row;
  kingEls[suit].style.top = (row * ROWH + PAD) + '%';
}

function revealBonusCard(row, card) {
  const el = bonusEls[row];
  const front = el.querySelector('.pc-front');
  if (card.type === 'ace') {
    front.classList.add(SUIT_COLOR[card.suit]);
    front.innerHTML = cardInnerHTML('A', SUIT_SYMBOL[card.suit], false);
  } else {
    front.classList.add(card.color);
    front.innerHTML = jokerInnerHTML();
  }
  el.classList.add('flipped');
}

function showCurrentCard(card) {
  const flipper = currentCardEl.querySelector('.flipper');
  const front = currentCardEl.querySelector('.pc-front');
  front.className = `face pc-front ${SUIT_COLOR[card.suit]}`;
  front.innerHTML = cardInnerHTML(card.rank, SUIT_SYMBOL[card.suit], false);
  flipper.classList.add('flipped');
}
function hideCurrentCard() {
  currentCardEl.querySelector('.flipper').classList.remove('flipped');
}

function status(msg) { statusEl.textContent = msg; }
function updateDeckCounter() {
  deckCounterEl.textContent = `${mainDeck.length - deckIdx} cards left`;
}

// ---------- Game logic ----------
async function advanceKing(suit) {
  if (gameOver || kingPos[suit] === 0) return;
  const newRow = kingPos[suit] - 1;
  moveKing(suit, newRow);
  status(`The ${SUIT_NAME[suit]} King advances!`);
  await sleep(680);
  if (newRow === 0) { await win(suit); return; }
  await checkCheckpoints();
}

async function checkCheckpoints() {
  for (let r = 6; r >= 1; r--) {
    if (gameOver) return;
    if (revealed.has(r)) continue;
    if (SUITS.every(s => kingPos[s] < r)) {
      revealed.add(r);
      const card = bonusRow[r];
      status(`All Kings have passed row ${r}: the bonus card is revealed!`);
      revealBonusCard(r, card);
      await sleep(750);
      if (card.type === 'ace') {
        status(`Ace of ${SUIT_NAME[card.suit]}! The ${SUIT_NAME[card.suit]} King advances.`);
        await advanceKing(card.suit);
      } else {
        const affected = SUITS.filter(s => SUIT_COLOR[s] === card.color);
        status(`${card.color === 'red' ? 'Red' : 'Black'} Joker! The ${affected.map(s => SUIT_NAME[s]).join(' and ')} Kings fall back.`);
        affected.forEach(s => moveKing(s, Math.min(7, kingPos[s] + 1)));
        await sleep(680);
      }
    }
  }
}

async function gameLoop() {
  while (!gameOver && deckIdx < mainDeck.length) {
    hideCurrentCard();
    await sleep(500);
    if (gameOver) break;
    const card = mainDeck[deckIdx++];
    updateDeckCounter();
    showCurrentCard(card);
    status(`Card revealed: ${card.rank} of ${SUIT_NAME[card.suit]}`);
    await sleep(700);
    if (gameOver) break;
    await advanceKing(card.suit);
    await sleep(200);
  }
}

async function win(suit) {
  gameOver = true;
  pauseBtn.disabled = true;
  kingEls[suit].classList.add('winner');
  status(`The ${SUIT_NAME[suit]} King crosses the finish line!`);
  await sleep(1000);
  showVictory(suit);
}

function showVictory(suit) {
  victoryWinnerEl.innerHTML = `<div class="pc-front ${SUIT_COLOR[suit]}">${cardInnerHTML('K', SUIT_SYMBOL[suit], true)}</div>`;
  if (suit === playerSuit) {
    victoryTitleEl.textContent = '🏆 You Win!';
    victorySubtitleEl.textContent = `Your ${SUIT_NAME[suit]} King crossed the finish line first.`;
  } else if (suit === computerSuit) {
    victoryTitleEl.textContent = '😔 Computer Wins';
    victorySubtitleEl.textContent = `The computer's ${SUIT_NAME[suit]} King beat you to the finish line.`;
  } else {
    victoryTitleEl.textContent = '🐎 Surprise Winner!';
    victorySubtitleEl.textContent = `The ${SUIT_NAME[suit]} King, chosen by neither racer, won the race!`;
  }
  screenVictory.classList.remove('hidden');
  spawnConfetti();
}

function spawnConfetti() {
  confettiEl.innerHTML = '';
  const colors = ['#d4af6a', '#f3d99a', '#c0392b', '#eae4d6', '#7a9bc4'];
  for (let i = 0; i < 70; i++) {
    const p = document.createElement('div');
    p.className = 'confetti-piece';
    p.style.left = Math.random() * 100 + '%';
    p.style.background = colors[(Math.random() * colors.length) | 0];
    p.style.animationDuration = (2 + Math.random() * 2) + 's';
    p.style.animationDelay = (Math.random() * 1.2) + 's';
    confettiEl.appendChild(p);
  }
}

async function countdown() {
  countdownEl.classList.remove('hidden');
  for (const txt of ['3', '2', '1', 'GO!']) {
    countdownEl.textContent = txt;
    countdownEl.classList.remove('pulse');
    void countdownEl.offsetWidth;
    countdownEl.classList.add('pulse');
    await sleep(txt === 'GO!' ? 750 : 650);
  }
  countdownEl.classList.add('hidden');
}

function setLegend() {
  legendEl.innerHTML =
    `<span>You: <b class="${SUIT_COLOR[playerSuit]}">${SUIT_SYMBOL[playerSuit]} ${SUIT_NAME[playerSuit]}</b></span>` +
    `<span>Computer: <b class="${SUIT_COLOR[computerSuit]}">${SUIT_SYMBOL[computerSuit]} ${SUIT_NAME[computerSuit]}</b></span>`;
}

async function startRace() {
  screenSelect.classList.add('hidden');
  screenRace.classList.remove('hidden');
  setLegend();
  buildCells();
  renderTokens();
  updateDeckCounter();

  status('Shuffling the deck...');
  deckStackEl.classList.add('shuffling');
  await sleep(1400);
  deckStackEl.classList.remove('shuffling');

  status('Riders, get ready...');
  await sleep(500);
  await countdown();
  gameLoop();
}

function chooseKing(suit) {
  playerSuit = suit;
  const rest = SUITS.filter(s => s !== suit);
  computerSuit = rest[(Math.random() * rest.length) | 0];
  newGame();
  startRace();
}

// ---------- Events ----------
document.querySelectorAll('.pick-card').forEach(btn => {
  btn.addEventListener('click', () => chooseKing(btn.dataset.suit));
});
document.getElementById('replay-btn').addEventListener('click', () => location.reload());
