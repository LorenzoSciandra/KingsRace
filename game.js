'use strict';

// ---------- Constants ----------
const SUITS = ['S', 'D', 'C', 'H'];
const SUIT_SYMBOL = { S: '♠', D: '♦', C: '♣', H: '♥' };
const SUIT_GLYPH = { S: '}', D: '[', C: ']', H: '{' }; // pip glyphs in the "Card Characters" font
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
const timelineEl = document.getElementById('timeline');
const deckCounterEl = document.getElementById('deck-counter');
const deckStackEl = document.getElementById('deck-stack');
const discardStackEl = document.getElementById('discard-stack');
const currentCardEl = document.getElementById('current-card');
const countdownEl = document.getElementById('countdown');
const countdownNumberEl = document.getElementById('countdown-number');
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
function pauseGame(showOverlay = true) {
  if (gameOver || paused) return;
  paused = true;
  if (!showOverlay) return;
  const ov = document.createElement('div');
  ov.className = 'paused-overlay';
  ov.id = 'paused-overlay';
  ov.innerHTML = `<div class="paused-box"><span class="paused-title">Paused</span><button class="pause-btn" id="resume-btn">Resume</button></div>`;
  screenRace.appendChild(ov);
  document.getElementById('resume-btn').addEventListener('click', resumeGame);
}
function resumeGame() {
  if (!paused) return;
  paused = false;
  document.getElementById('paused-overlay')?.remove();
  if (pauseResolve) { pauseResolve(); pauseResolve = null; }
}
pauseBtn.addEventListener('click', pauseGame);

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
  pauseBtn.disabled = false;
  timelineEl.innerHTML = '';
}

// ---------- Bicycle-style card markup ----------
const FACE_RANKS = { K: 'king', Q: 'queen', J: 'jack' };
function cardInnerHTML(rank, sym, color) {
  const faceName = FACE_RANKS[rank];
  const figure = faceName ? `<img class="figure-img" src="assets/images/${color}_${faceName}.png" alt="">` : '';
  const centerClass = faceName ? 'pc-center has-figure' : 'pc-center';
  return `<span class="pc-corner tl">${rank}<br>${sym}</span>` +
    `<div class="${centerClass}">${figure}<span class="big-pip">${sym}</span></div>` +
    `<span class="pc-corner br">${rank}<br>${sym}</span>`;
}
function jokerInnerHTML(color) {
  const label = color === 'red' ? 'RED JOKER' : 'BLACK JOKER';
  return `<div class="pc-center"><img class="figure-img joker-img" src="assets/images/${color}_joker.png" alt=""><span class="joker-label ${color}">${label}</span></div>`;
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
    el.innerHTML = cardInnerHTML('K', SUIT_GLYPH[suit], SUIT_COLOR[suit]);
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
    front.innerHTML = cardInnerHTML('A', SUIT_GLYPH[card.suit], SUIT_COLOR[card.suit]);
  } else {
    front.classList.add(card.color);
    front.innerHTML = jokerInnerHTML(card.color);
  }
  el.classList.add('flipped');
}

function showCurrentCard(card) {
  const flipper = currentCardEl.querySelector('.flipper');
  const front = currentCardEl.querySelector('.pc-front');
  front.className = `face pc-front ${SUIT_COLOR[card.suit]}`;
  front.innerHTML = cardInnerHTML(card.rank, SUIT_GLYPH[card.suit], SUIT_COLOR[card.suit]);
  flipper.classList.add('flipped');
}
function hideCurrentCard() {
  currentCardEl.querySelector('.flipper').classList.remove('flipped');
}

function logEvent(msg) {
  const li = document.createElement('li');
  li.className = 'tl-entry';
  li.textContent = msg;
  timelineEl.appendChild(li);
  while (timelineEl.children.length > 40) timelineEl.firstChild.remove();
  timelineEl.scrollTop = timelineEl.scrollHeight;
}
function updateDeckCounter() {
  deckCounterEl.textContent = `${mainDeck.length - deckIdx} cards left`;
  const remFrac = (mainDeck.length - deckIdx) / mainDeck.length;
  const playedFrac = deckIdx / mainDeck.length;
  deckStackEl.style.setProperty('--th', (1 + remFrac * 5) + 'px');
  deckStackEl.style.opacity = remFrac > 0 ? 1 : .3;
  discardStackEl.style.setProperty('--th', (1 + playedFrac * 5) + 'px');
  discardStackEl.style.opacity = playedFrac > 0 ? Math.min(1, .35 + playedFrac * .75) : 0;
}

// ---------- Game logic ----------
async function advanceKing(suit) {
  if (gameOver || kingPos[suit] === 0) return;
  const newRow = kingPos[suit] - 1;
  moveKing(suit, newRow);
  logEvent(`${SUIT_SYMBOL[suit]} ${SUIT_NAME[suit]} King advances!`);
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
      revealBonusCard(r, card);
      logEvent(`Row ${r} cleared — bonus revealed!`);
      await sleep(750);
      if (card.type === 'ace') {
        logEvent(`${SUIT_SYMBOL[card.suit]} Ace of ${SUIT_NAME[card.suit]}!`);
        await sleep(450);
        await advanceKing(card.suit);
      } else {
        const affected = SUITS.filter(s => SUIT_COLOR[s] === card.color);
        logEvent(`🃏 ${card.color === 'red' ? 'Red' : 'Black'} Joker!`);
        await sleep(450);
        logEvent(`${affected.map(s => SUIT_NAME[s]).join(' & ')} fall back.`);
        affected.forEach(s => moveKing(s, Math.min(7, kingPos[s] + 1)));
        await sleep(680);
      }
    }
  }
}

async function gameLoop() {
  while (!gameOver && deckIdx < mainDeck.length) {
    hideCurrentCard();
    await sleep(450);
    if (gameOver) break;
    const card = mainDeck[deckIdx++];
    updateDeckCounter();
    showCurrentCard(card);
    await sleep(600);
    logEvent(`🂠 ${card.rank} of ${SUIT_NAME[card.suit]} turned`);
    await sleep(650);
    if (gameOver) break;
    await advanceKing(card.suit);
    await sleep(250);
  }
}

async function win(suit) {
  gameOver = true;
  pauseBtn.disabled = true;
  kingEls[suit].classList.add('winner');
  logEvent(`${SUIT_NAME[suit]} King wins the race!`);
  await sleep(1000);
  showVictory(suit);
}

function showVictory(suit) {
  victoryWinnerEl.innerHTML = `<div class="pc-front ${SUIT_COLOR[suit]}">${cardInnerHTML('K', SUIT_GLYPH[suit], SUIT_COLOR[suit])}</div>`;
  if (suit === playerSuit) {
    victoryTitleEl.textContent = 'You Win!';
    victorySubtitleEl.textContent = `Your ${SUIT_NAME[suit]} King crossed the finish line first.`;
  } else if (suit === computerSuit) {
    victoryTitleEl.textContent = 'Computer Wins';
    victorySubtitleEl.textContent = `The computer's ${SUIT_NAME[suit]} King beat you to the finish line.`;
  } else {
    victoryTitleEl.textContent = 'Surprise Winner!';
    victorySubtitleEl.textContent = `The ${SUIT_NAME[suit]} King, chosen by neither racer, won the race!`;
  }
  screenVictory.classList.remove('hidden');
}

async function countdown() {
  countdownEl.classList.remove('hidden');
  for (const txt of ['3', '2', '1', 'GO!']) {
    countdownNumberEl.textContent = txt;
    countdownNumberEl.classList.remove('pulse');
    void countdownNumberEl.offsetWidth;
    countdownNumberEl.classList.add('pulse');
    await sleep(txt === 'GO!' ? 750 : 650);
  }
  countdownEl.classList.add('hidden');
}

function setRiderLabels() {
  document.getElementById('you-label').style.left = (SUIT_COL[playerSuit] * COLW) + '%';
  document.getElementById('pc-label').style.left = (SUIT_COL[computerSuit] * COLW) + '%';
}

async function startRace() {
  screenSelect.classList.add('hidden');
  screenRace.classList.remove('hidden');
  setRiderLabels();
  buildCells();
  renderTokens();
  updateDeckCounter();

  logEvent('🂠 Shuffling the deck...');
  deckStackEl.classList.add('shuffling');
  await sleep(1400);
  deckStackEl.classList.remove('shuffling');

  logEvent('Riders, get ready...');
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
  const suit = btn.dataset.suit;
  const color = btn.classList.contains('red') ? 'red' : 'black';
  btn.innerHTML = `<div class="card-face pc-front ${color}">${cardInnerHTML('K', SUIT_GLYPH[suit], color)}</div>`;
  btn.addEventListener('click', () => chooseKing(suit));
});
document.getElementById('replay-btn').addEventListener('click', () => location.reload());

const rulesBtn = document.getElementById('rules-btn');
const rulesPanel = document.getElementById('rules-panel');
let pausedByRules = false;
rulesBtn.addEventListener('click', () => {
  if (!screenRace.classList.contains('hidden') && !gameOver && !paused) {
    pauseGame(false);
    pausedByRules = true;
  }
  rulesPanel.classList.remove('hidden');
});
document.getElementById('rules-close').addEventListener('click', () => {
  rulesPanel.classList.add('hidden');
  if (pausedByRules) { resumeGame(); pausedByRules = false; }
});
