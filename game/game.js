/* Ember Duel — a complete original card duel. You (Ember Knight) vs the AI
 * Gloom Warden. 30 life each, mana grows +1 per turn (max 10), draw a card
 * each turn. Cards cost mana; Ember burns, Tide heals/draws, Stone shields
 * and crushes, Gale is fast and sharp. First to 0 life loses.
 * No network, no files besides this one + style.css. Keyboard: 1-7 play a
 * card, Space ends the turn, Enter starts, R duels again.
 * ?shot=title|table|win|loss (or #shot=...) renders a fixed scene for
 * screenshots: real renders of this same code, with a seeded preset state. */

'use strict';

/* ---------------- card catalogue ---------------- */
const ELEMENTS = { ember: 'EMBER', tide: 'TIDE', stone: 'STONE', gale: 'GALE' };

const CARDS = {
  flameLash:  { name: 'Flame Lash',  el: 'ember', cost: 1, power: 2, kind: 'dmg',  text: 'Deal 2 damage.' },
  emberStrike:{ name: 'Ember Strike',el: 'ember', cost: 2, power: 4, kind: 'dmg',  text: 'Deal 4 damage.' },
  emberBlast: { name: 'Ember Blast', el: 'ember', cost: 4, power: 7, kind: 'dmg',  text: 'Deal 7 damage.' },
  tideMend:   { name: 'Tide Mend',   el: 'tide',  cost: 2, power: 5, kind: 'heal', text: 'Restore 5 life.' },
  deepCurrent:{ name: 'Deep Current',el: 'tide',  cost: 2, power: 2, kind: 'drain',text: 'Deal 2 damage. Heal 2.' },
  tideSurge:  { name: 'Tide Surge',  el: 'tide',  cost: 3, power: 3, kind: 'surge',text: 'Deal 3 damage. Draw a card.' },
  stoneWall:  { name: 'Stone Wall',  el: 'stone', cost: 2, power: 6, kind: 'shield', text: 'Gain 6 shield.' },
  stoneFist:  { name: 'Stone Fist',  el: 'stone', cost: 3, power: 5, kind: 'dmg',  text: 'Deal 5 damage.' },
  boulder:    { name: 'Boulder',     el: 'stone', cost: 5, power: 8, kind: 'dmg',  text: 'Deal 8 damage.' },
  galeRush:   { name: 'Gale Rush',   el: 'gale',  cost: 1, power: 0, kind: 'draw', text: 'Draw 2 cards.' },
  galeSlice:  { name: 'Gale Slice',  el: 'gale',  cost: 2, power: 3, kind: 'dmg',  text: 'Deal 3 damage.' },
  stormCall:  { name: 'Storm Call',  el: 'gale',  cost: 4, power: 5, kind: 'dmg',  text: 'Deal 5 damage.' },
};

const DECKLIST = [
  'flameLash', 'flameLash', 'emberStrike', 'emberStrike', 'emberBlast',
  'tideMend', 'tideMend', 'deepCurrent', 'deepCurrent', 'tideSurge',
  'stoneWall', 'stoneWall', 'stoneFist', 'stoneFist', 'boulder',
  'galeRush', 'galeRush', 'galeSlice', 'galeSlice', 'stormCall',
]; // 20 cards

const MAX_HP = 30, MAX_MANA = 10, HAND_LIMIT = 7;

/* ---------------- tiny sound (synthesised, no files) ---------------- */
let audioCtx = null;
function blip(freq, dur) {
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const o = audioCtx.createOscillator(), g = audioCtx.createGain();
    o.type = 'triangle'; o.frequency.value = freq;
    g.gain.setValueAtTime(0.12, audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + dur);
    o.connect(g); g.connect(audioCtx.destination);
    o.start(); o.stop(audioCtx.currentTime + dur);
  } catch (e) { /* sound is optional */ }
}

/* ---------------- state ---------------- */
function newFighter() {
  return { hp: MAX_HP, shield: 0, mana: 0, maxMana: 0, deck: [], hand: [], discard: [] };
}
const S = {
  screen: 'title', turn: 1, phase: 'player', over: false,
  you: newFighter(), foe: newFighter(),
  score: 0, dealt: 0, taken: 0, played: 0, wins: 0, losses: 0,
  logLines: [],
};

function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function drawCard(f, n) {
  for (let k = 0; k < n; k++) {
    if (f.deck.length === 0) {
      if (f.discard.length === 0) return;
      f.deck = shuffle(f.discard.splice(0));
      log('The deck is reshuffled from the discard pile.');
    }
    if (f.hand.length >= HAND_LIMIT) { f.discard.push(f.deck.pop()); continue; }
    f.hand.push(f.deck.pop());
  }
}
function startDuel() {
  S.you = newFighter(); S.foe = newFighter();
  S.turn = 1; S.phase = 'player'; S.over = false;
  S.score = 0; S.dealt = 0; S.taken = 0; S.played = 0;
  S.you.deck = shuffle(DECKLIST.map(id => Object.assign({ id }, CARDS[id])));
  S.foe.deck = shuffle(DECKLIST.map(id => Object.assign({ id }, CARDS[id])));
  drawCard(S.you, 4); drawCard(S.foe, 4);
  // Guarantee an opening play: if a hand holds no 1-cost card, swap its
  // most expensive card for a cheap one from the deck.
  [S.you, S.foe].forEach(f => {
    if (!f.hand.some(c => c.cost <= 1)) {
      const cheap = f.deck.findIndex(c => c.cost <= 1);
      if (cheap >= 0) {
        const hi = f.hand.reduce((a, c, i) => c.cost > f.hand[a].cost ? i : a, 0);
        const tmp = f.hand[hi];
        f.hand[hi] = f.deck.splice(cheap, 1)[0];
        f.deck.push(tmp);
      }
    }
  });
  S.you.maxMana = 1; S.you.mana = 1;
  S.foe.maxMana = 1; S.foe.mana = 1;
  S.logLines = [];
  log('<b>Ember Knight</b> faces the <b>Gloom Warden</b>. Turn 1 — your move.');
  show('game'); render();
}
function dealDamage(target, amount, who) {
  let left = amount;
  if (target.shield > 0) {
    const absorbed = Math.min(target.shield, left);
    target.shield -= absorbed; left -= absorbed;
  }
  target.hp = Math.max(0, target.hp - left);
  if (who === 'foe') { S.dealt += amount; S.score += amount; }
  if (who === 'you') { S.taken += amount; }
  return left;
}
function applyCard(card, me, foe, who) {
  const nm = who === 'you' ? 'You' : 'Gloom Warden';
  switch (card.kind) {
    case 'dmg':
      dealDamage(foe, card.power, who);
      log(nm + ' play <b>' + card.name + '</b> — ' + card.power + ' damage.');
      break;
    case 'heal':
      me.hp = Math.min(MAX_HP, me.hp + card.power);
      log(nm + ' play <b>' + card.name + '</b> — restore ' + card.power + ' life.');
      break;
    case 'drain':
      dealDamage(foe, card.power, who);
      me.hp = Math.min(MAX_HP, me.hp + 2);
      log(nm + ' play <b>' + card.name + '</b> — ' + card.power + ' damage, heal 2.');
      break;
    case 'surge':
      dealDamage(foe, card.power, who);
      drawCard(me, 1);
      log(nm + ' play <b>' + card.name + '</b> — ' + card.power + ' damage, draw a card.');
      break;
    case 'shield':
      me.shield += card.power;
      log(nm + ' play <b>' + card.name + '</b> — gain ' + card.power + ' shield.');
      break;
    case 'draw':
      drawCard(me, 2);
      log(nm + ' play <b>' + card.name + '</b> — draw 2 cards.');
      break;
  }
}
function playCard(i, who) {
  if (S.over || S.phase !== 'player' || who !== 'you') return;
  const me = S.you, card = me.hand[i];
  if (!card || me.mana < card.cost) return;
  me.mana -= card.cost;
  me.hand.splice(i, 1);
  me.discard.push(card);
  S.played++;
  blip(520, 0.12);
  applyCard(card, me, S.foe, 'you');
  render();
  checkEnd() || null;
}
function endTurn() {
  if (S.over || S.phase !== 'player') return;
  S.phase = 'foe';
  blip(300, 0.1);
  log('You end your turn.');
  render();
  setTimeout(aiTurn, 650);
}
function aiTurn() {
  if (S.over) return;
  const me = S.foe, you = S.you;
  // Simple strategy: heal when hurt, else play the biggest affordable damage.
  let guard = 0;
  while (guard++ < 12) {
    const affordable = me.hand.filter(c => c.cost <= me.mana);
    if (!affordable.length) break;
    let pick = null;
    if (me.hp <= 12) pick = affordable.find(c => c.kind === 'heal' || c.kind === 'drain');
    if (!pick && me.shield < 4) pick = affordable.find(c => c.kind === 'shield');
    if (!pick) pick = affordable.slice().sort((a, b) => b.power - a.power)[0];
    if (Math.random() < 0.25 && affordable.length > 1) break; // sometimes holds back
    me.mana -= pick.cost;
    me.hand.splice(me.hand.indexOf(pick), 1);
    me.discard.push(pick);
    applyCard(pick, me, you, 'foe');
    render();
    if (checkEnd()) return;
  }
  // Next turn for the player.
  S.turn++;
  S.phase = 'player';
  S.you.maxMana = Math.min(MAX_MANA, S.you.maxMana + 1);
  S.you.mana = S.you.maxMana;
  S.foe.maxMana = Math.min(MAX_MANA, S.foe.maxMana + 1);
  S.foe.mana = S.foe.maxMana;
  drawCard(S.you, 1); drawCard(S.foe, 1);
  log('Turn ' + S.turn + ' — your move. Mana refilled to ' + S.you.mana + '.');
  render();
}
function checkEnd() {
  if (S.foe.hp <= 0) return endDuel(true);
  if (S.you.hp <= 0) return endDuel(false);
  return false;
}
function endDuel(won) {
  S.over = true; S.phase = 'over';
  if (won) { S.wins++; blip(880, 0.25); } else { S.losses++; blip(180, 0.3); }
  const el = document.getElementById('end-emblem');
  const title = document.getElementById('end-title');
  const sub = document.getElementById('end-sub');
  if (won) {
    el.textContent = 'V I C T O R Y'; el.className = 'end-emblem win';
    title.textContent = 'You win!'; title.className = 'win';
    sub.textContent = 'The Gloom Warden fades into embers. The four elements are yours.';
  } else {
    el.textContent = 'D E F E A T'; el.className = 'end-emblem lose';
    title.textContent = 'You lose'; title.className = 'lose';
    sub.textContent = 'The Gloom Warden stands over the ashes. Duel again to reclaim the elements.';
  }
  document.getElementById('end-stats').innerHTML =
    stat(S.turn, 'TURNS') + stat(S.dealt, 'DAMAGE DEALT') + stat(S.played, 'CARDS PLAYED') +
    stat(S.score, 'SCORE') + stat(S.wins + ' – ' + S.losses, 'WINS – LOSSES');
  log(won ? '<b>Victory!</b> The Gloom Warden falls.' : '<b>Defeat.</b> The Gloom Warden wins.');
  show('end'); render();
  return true;
}
function stat(v, k) {
  return '<div class="stat"><div class="v">' + v + '</div><div class="k">' + k + '</div></div>';
}

/* ---------------- rendering ---------------- */
const $ = id => document.getElementById(id);
function show(which) {
  S.screen = which;
  $('screen-title').classList.toggle('hidden', which !== 'title');
  $('screen-game').classList.toggle('hidden', which !== 'game');
  $('screen-end').classList.toggle('hidden', which !== 'end');
  $('title-record').textContent = S.wins + ' wins · ' + S.losses + ' losses';
}
function log(html) {
  S.logLines.push(html);
  if (S.logLines.length > 4) S.logLines.shift();
  const el = $('log');
  if (el) el.innerHTML = S.logLines.map(l => '<div>' + l + '</div>').join('');
}
function manaPips(mana, max) {
  let s = '';
  for (let i = 0; i < MAX_MANA; i++) {
    s += '<span class="' + (i < mana ? 'on' : 'off') + '">●</span>';
  }
  return s + ' ' + mana + '/' + Math.max(max, mana);
}
function cardEl(card, i, playable) {
  const cls = 'card el-' + card.el + (playable === false ? ' unaffordable' : ' playable');
  const powerLabel = card.kind === 'heal' ? '<small>HEAL</small>' :
    card.kind === 'shield' ? '<small>SHIELD</small>' :
    card.kind === 'draw' ? '<small>DRAW</small>' : '<small>DMG</small>';
  return '<div class="' + cls + '" data-i="' + i + '">' +
    '<div class="cost">' + card.cost + '</div>' +
    '<div class="el">' + ELEMENTS[card.el] + '</div>' +
    '<div class="name">' + card.name + '</div>' +
    '<div class="power">' + (card.power || '—') + ' ' + powerLabel + '</div>' +
    '<div class="effect">' + card.text + '</div>' +
    '<div class="key">' + (i + 1) + '</div></div>';
}
function render() {
  $('turn-num').textContent = S.turn;
  $('score').textContent = S.score;
  $('wins').textContent = S.wins;
  $('losses').textContent = S.losses;
  // event log (kept in sync here so preset scenes render it too)
  const logEl = $('log');
  if (logEl) logEl.innerHTML = S.logLines.map(l => '<div>' + l + '</div>').join('');
  // foe
  $('foe-hp-fill').style.width = (S.foe.hp / MAX_HP * 100) + '%';
  $('foe-hp-fill').classList.toggle('low', S.foe.hp <= 10);
  $('foe-hp-text').textContent = S.foe.hp + ' / ' + MAX_HP;
  $('foe-shield-fill').style.width = Math.min(100, S.foe.shield / 12 * 100) + '%';
  $('foe-shield-text').textContent = 'Shield ' + S.foe.shield;
  $('foe-mana').innerHTML = manaPips(S.foe.mana, S.foe.maxMana);
  $('foe-deck').textContent = S.foe.deck.length;
  // you
  $('you-hp-fill').style.width = (S.you.hp / MAX_HP * 100) + '%';
  $('you-hp-fill').classList.toggle('low', S.you.hp <= 10);
  $('you-hp-text').textContent = S.you.hp + ' / ' + MAX_HP;
  $('you-shield-fill').style.width = Math.min(100, S.you.shield / 12 * 100) + '%';
  $('you-shield-text').textContent = 'Shield ' + S.you.shield;
  $('you-mana').innerHTML = manaPips(S.you.mana, S.you.maxMana);
  $('you-deck').textContent = S.you.deck.length;
  // hands
  $('foe-hand').innerHTML = S.foe.hand.length
    ? S.foe.hand.map(() => '<div class="card-back">?</div>').join('')
    : '<span class="hand-empty">Opponent hand empty</span>';
  $('player-hand').innerHTML = S.you.hand.length
    ? S.you.hand.map((c, i) => cardEl(c, i, S.phase === 'player' && c.cost <= S.you.mana)).join('')
    : '<span class="hand-empty">Your hand is empty — end the turn to draw.</span>';
  document.querySelectorAll('#player-hand .card').forEach(el => {
    el.addEventListener('click', () => playCard(+el.dataset.i, 'you'));
  });
  $('phase-label').textContent = S.over ? 'Duel over' :
    S.phase === 'player' ? 'Your turn — play cards, then end turn' : 'Gloom Warden is thinking…';
  $('btn-end').disabled = S.phase !== 'player' || S.over;
}

/* ---------------- screenshot presets (deterministic scenes) ---------------- */
function presetHand(ids) {
  return ids.map(id => Object.assign({ id }, CARDS[id]));
}
function shotScene(kind) {
  // Fixed, seeded scenes so the committed screenshots are real renders.
  if (kind === 'title') { show('title'); return; }
  startDuel();
  if (kind === 'table') {
    S.turn = 4; S.score = 11; S.dealt = 11; S.taken = 6; S.played = 5;
    S.you.hp = 24; S.you.shield = 4; S.you.mana = 5; S.you.maxMana = 5;
    S.you.hand = presetHand(['emberBlast', 'tideMend', 'stoneWall', 'galeSlice', 'flameLash']);
    S.you.deck = new Array(13).fill('flameLash');
    S.foe.hp = 19; S.foe.shield = 2; S.foe.mana = 2; S.foe.maxMana = 5;
    S.foe.hand = new Array(4).fill(null);
    S.foe.deck = new Array(14).fill('flameLash');
    S.logLines = [
      'Turn 4 — your move. Mana refilled to 5.',
      'You play <b>Ember Strike</b> — 4 damage.',
      'Gloom Warden plays <b>Stone Wall</b> — gain 6 shield.',
    ];
    show('game'); render();
  } else if (kind === 'win') {
    S.foe.hp = 0; S.you.hp = 18; S.turn = 7; S.dealt = 34; S.played = 9; S.score = 34;
    endDuel(true);
  } else if (kind === 'loss') {
    S.you.hp = 0; S.foe.hp = 12; S.turn = 8; S.dealt = 21; S.played = 8; S.score = 21;
    endDuel(false);
  }
}

/* ---------------- wiring ---------------- */
$('btn-start').addEventListener('click', () => { blip(660, 0.1); startDuel(); });
$('btn-how').addEventListener('click', () => $('howto').classList.toggle('hidden'));
$('btn-end').addEventListener('click', endTurn);
$('btn-again').addEventListener('click', () => startDuel());
$('btn-title').addEventListener('click', () => show('title'));
document.addEventListener('keydown', e => {
  if (S.screen === 'title' && (e.key === 'Enter' || e.key === ' ')) { startDuel(); return; }
  if (S.screen === 'end' && (e.key === 'r' || e.key === 'R' || e.key === 'Enter')) { startDuel(); return; }
  if (S.screen !== 'game') return;
  if (e.key === ' ') { e.preventDefault(); endTurn(); return; }
  const n = parseInt(e.key, 10);
  if (n >= 1 && n <= 7) playCard(n - 1, 'you');
});

/* ---------------- boot ---------------- */
(function boot() {
  const q = (window.location.search || '') + (window.location.hash || '');
  const m = q.match(/shot=(title|table|win|loss)/);
  if (m) { shotScene(m[1]); }
  else { show('title'); render(); }
})();
