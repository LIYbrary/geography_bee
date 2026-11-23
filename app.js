const $ = id => document.getElementById(id);
const KEY = 'geobee-v1';
let S;
try { S = JSON.parse(localStorage.getItem(KEY)) } catch {}
S = Object.assign({ cats: Object.keys(BANK), level: 1, style: 'mc', count: 10, streak: 0, best: 0, answered: 0, correct: 0, bees: 0, bestBee: 0, missed: {} }, S || {});
// v2 rebuilt the capitals and flags banks, so old missed ids there point at different questions; new categories start on.
if (!S.v2) { for (const id in S.missed) if (/^(capitals|flags)/.test(id)) delete S.missed[id]; S.cats = [...new Set([...S.cats, 'waters', 'borders'])]; S.v2 = 1 }
if (!S.v3) { S.cats = [...new Set([...S.cats, 'africa', 'asia', 'europe', 'oceania', 'latam', 'usca', 'culture', 'terms'])]; S.v3 = 1 }
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)) } catch {} };

// Flatten bank into questions with stable ids.
const ALL = [];
for (const [cat, c] of Object.entries(BANK)) c.items.forEach(([p, a, lv, alt], i) =>
  ALL.push({ id: cat + i, cat, text: c.ask ? c.ask(p) : p, plain: c.ask ? c.ask(p) : p, a, lv, alt: alt || [] }));
const byId = Object.fromEntries(ALL.map(q => [q.id, q]));

const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [a[i], a[j]] = [a[j], a[i]] } return a };
const norm = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/^(the|mount|mt\.?|lake|river)\s+/, '').replace(/\b(river|ocean|desert|sea|mountains?)\b/g, '').replace(/[^a-z0-9]/g, '');
// Rough answer type, so multiple-choice options are all countries, all cities, all rivers...
const COUNTRY_SET = new Set(COUNTRIES.map(c => c[0])), CITY_SET = new Set(COUNTRIES.map(c => c[2]));
const kind = a => COUNTRY_SET.has(a) ? 'country' : CITY_SET.has(a) ? 'city' : /(Sea|Ocean|Gulf|Bay|Strait|Channel|Canal|Passage)|^Lake /.test(a) ? 'water'
  : /(Island|Peninsula|Reef|Gap|Mountains?)/.test(a) ? 'land' : /\s/.test(a) ? 'multi' : 'word';
const isRight = (q, s) => [q.a, ...q.alt].some(x => norm(x) === norm(s) && norm(s) !== '');

// ---- Home ----
function renderHome() {
  // Update tiles in place once built, so keyboard focus and transitions survive a click.
  if (!$('cats').children.length) $('cats').innerHTML = Object.entries(BANK).map(([k, c], i) => `<button class="topic" data-c="${k}" style="--h:${i * 67 % 360}"><i aria-hidden="true">${c.icon}</i><b>${c.name}</b><small>${c.items.length} questions</small></button>`).join('');
  for (const b of $('cats').children) { const on = S.cats.includes(b.dataset.c); b.classList.toggle('sel', on); b.setAttribute('aria-pressed', on) }
  document.querySelectorAll('#levels button').forEach(b => { const on = +b.dataset.l === S.level; b.classList.toggle('sel', on); b.setAttribute('aria-pressed', on) });
  document.querySelectorAll('#styles button').forEach(b => { const on = b.dataset.s === S.style; b.classList.toggle('sel', on); b.setAttribute('aria-pressed', on) });
  document.querySelectorAll('#counts button').forEach(b => { const on = +b.dataset.n === S.count; b.classList.toggle('sel', on); b.setAttribute('aria-pressed', on) });
  const avail = pool().length, n = S.count ? Math.min(S.count, avail) : avail;
  $('startPractice').textContent = `Start practice (${n} question${n === 1 ? '' : 's'})`;
  const topics = Object.keys(BANK).filter(k => S.cats.includes(k)).length;
  $('summary').textContent = `${topics} topic${topics === 1 ? '' : 's'} · ${['Easy', 'Medium', 'Hard'][S.level - 1]} · ${n} question${n === 1 ? '' : 's'}. Bee rounds are typed, 20 seconds each.`;
  const m = Object.keys(S.missed).filter(id => byId[id]);
  $('missCount').textContent = m.length ? `${m.length} question${m.length > 1 ? 's' : ''} to review.` : 'Nothing to review yet — great!';
  $('missActions').classList.toggle('hidden', !m.length);
  $('missList').innerHTML = m.map(id => `<li>${byId[id].plain} — <b>${byId[id].a}</b></li>`).join('');
  const pct = S.answered ? Math.round(100 * S.correct / S.answered) : 0;
  $('stats').innerHTML = [[S.answered, 'Questions answered'], [pct + '%', `Accuracy (${S.correct} correct)`], [S.best, 'Best streak'], [S.bestBee + '%', `Best of ${S.bees} bee round${S.bees === 1 ? '' : 's'}`]]
    .map(([v, label]) => `<div><b>${v}</b><span>${label}</span></div>`).join('');
  $('stStreak').textContent = '🔥 ' + S.streak; $('stBest').textContent = '🏆 ' + S.best;
  $('stStreak').title = 'Current streak'; $('stBest').title = 'Best streak';
}
$('cats').onclick = e => { const b = e.target.closest('button'); if (!b) return; const k = b.dataset.c;
  S.cats = S.cats.includes(k) ? S.cats.filter(x => x !== k) : [...S.cats, k]; if (!S.cats.length) S.cats = [k]; save(); renderHome() };
$('levels').onclick = e => { const b = e.target.closest('button'); if (b) { S.level = +b.dataset.l; save(); renderHome() } };
$('counts').onclick = e => { const b = e.target.closest('button'); if (b) { S.count = +b.dataset.n; save(); renderHome() } };
$('styles').onclick = e => { const b = e.target.closest('button'); if (b) { S.style = b.dataset.s; save(); renderHome() } };
$('showMissed').onclick = () => $('missList').classList.toggle('hidden');
$('reset').onclick = () => { if (confirm('Reset all scores, streaks and missed questions?')) { const { cats, level, style, count } = S; S = { cats, level, style, count, streak: 0, best: 0, answered: 0, correct: 0, bees: 0, bestBee: 0, missed: {} }; save(); renderHome() } };

// Level N includes questions up to N, favouring level N.
function pool() {
  const qs = ALL.filter(q => S.cats.includes(q.cat) && q.lv <= S.level);
  return shuffle(qs).sort((a, b) => (b.lv === S.level) - (a.lv === S.level));
}

// ---- Quiz ----
let R, timerId;
function start(mode, qs) {
  if (!qs.length) { alert('No questions here yet.'); return }
  R = { mode, qs: shuffle(S.count ? qs.slice(0, S.count) : qs), i: 0, score: 0, miss: [], style: mode === 'bee' ? 'type' : S.style };
  show('quiz'); ask();
}
$('startPractice').onclick = () => start('practice', pool());
$('startHero').onclick = () => $('startPractice').click();
$('startBee').onclick = () => start('bee', pool());
$('startReview').onclick = () => start('review', shuffle(Object.keys(S.missed).filter(id => byId[id]).map(id => byId[id])));

function ask() {
  const q = R.qs[R.i]; R.done = false;
  $('qNum').textContent = `Question ${R.i + 1} of ${R.qs.length}`;
  $('qScore').textContent = `Score ${R.score}`;
  $('qText').innerHTML = q.text;
  $('qText').classList.toggle('long', $('qText').textContent.length > 90);
  $('qText').style.animation = 'none'; $('qText').offsetWidth; $('qText').style.animation = '';
  $('progress').style.width = 100 * R.i / R.qs.length + '%';
  $('typeForm').classList.remove('answered'); $('typeIn').readOnly = false;
  scrollTo(0, 0);
  $('fb').textContent = ''; $('fb').className = 'fb';
  $('next').classList.add('hidden');
  const mc = R.style === 'mc';
  $('choices').classList.toggle('hidden', !mc); $('typeForm').classList.toggle('hidden', mc);
  if (mc) {
    const same = [...new Set(ALL.filter(x => x.cat === q.cat && norm(x.a) !== norm(q.a)).map(x => x.a))];
    const like = shuffle(same.filter(a => kind(a) === kind(q.a))), rest = shuffle(same.filter(a => kind(a) !== kind(q.a)));
    const others = [...like, ...rest].slice(0, 3);
    $('choices').innerHTML = shuffle([q.a, ...others]).map(c => `<button type="button">${c}</button>`).join('');
    $('choices').querySelector('button').focus();
  } else { $('typeIn').value = ''; $('typeIn').focus() }
  clearInterval(timerId);
  $('timerBar').classList.toggle('hidden', R.mode !== 'bee');
  if (R.mode === 'bee') {
    const end = Date.now() + 20000;
    const tick = () => { const left = end - Date.now(); $('timer').style.width = Math.max(0, left / 200) + '%'; $('seconds').textContent = Math.max(0, Math.ceil(left / 1000)) + 's'; $('timerBar').classList.toggle('urgent', left <= 5000); if (left <= 0) answer('') };
    tick(); timerId = setInterval(tick, 200);
  }
}
$('choices').onclick = e => { const b = e.target.closest('button'); if (b && !R.done) answer(b.textContent, b) };
// Speak the answer instead of typing it (browsers with the Web Speech API).
const Rec = window.SpeechRecognition || window.webkitSpeechRecognition;
if (Rec) {
  $('mic').classList.remove('hidden');
  $('mic').onclick = () => {
    const r = new Rec(); r.lang = 'en-US'; r.interimResults = true;
    r.onresult = e => { $('typeIn').value = [...e.results].map(x => x[0].transcript).join('').replace(/[.?!]$/, '') };
    r.onend = () => { $('mic').classList.remove('on'); $('typeIn').focus() };
    r.onerror = e => { if (e.error === 'not-allowed') $('fb').textContent = 'Allow microphone access to answer by voice.' };
    $('mic').classList.add('on'); r.start();
  };
}
$('typeForm').onsubmit = e => { e.preventDefault(); if (!R.done) answer($('typeIn').value) };

function answer(given, btn) {
  clearInterval(timerId); R.done = true;
  const q = R.qs[R.i], ok = isRight(q, given);
  S.answered++;
  if (ok) { S.correct++; R.score++; S.streak++; S.best = Math.max(S.best, S.streak); delete S.missed[q.id] }
  else { S.streak = 0; S.missed[q.id] = 1; R.miss.push(q) }
  save();
  $('typeForm').classList.add('answered'); $('typeIn').readOnly = true;
  $('progress').style.width = 100 * (R.i + 1) / R.qs.length + '%';
  $('next').textContent = R.i + 1 < R.qs.length ? 'Next question →' : 'See my results →';
  if (btn || R.style === 'mc') $('choices').querySelectorAll('button').forEach(b => {
    if (isRight(q, b.textContent)) b.classList.add('right'); else if (b === btn) b.classList.add('wrong'); b.disabled = true });
  $('fb').className = 'fb ' + (ok ? 'ok' : 'bad');
  $('fb').textContent = ok ? pick(['✅ Correct!', '✅ Nice one!', '✅ Spot on!']) + (S.streak > 2 ? ` 🔥 ${S.streak} in a row` : '')
    : (given === '' && R.mode === 'bee' ? '⏰ Time! ' : '❌ ') + `The answer is ${q.a}.`;
  $('qScore').textContent = `Score ${R.score}`;
  $('stStreak').textContent = '🔥 ' + S.streak; $('stBest').textContent = '🏆 ' + S.best;
  $('next').classList.remove('hidden'); $('next').focus();
}
const pick = a => a[Math.random() * a.length | 0];
$('next').onclick = () => { if (++R.i < R.qs.length) ask(); else finish() };
$('quit').onclick = () => { clearInterval(timerId); show('home') };

function finish() {
  window.LIY?.done();
  if (R.mode === 'bee') { S.bees++; S.bestBee = Math.max(S.bestBee, Math.round(100 * R.score / R.qs.length)); save() }
  const n = R.qs.length, pct = R.score / n;
  $('doneTitle').textContent = (pct === 1 ? '🏆 Perfect!' : pct >= .7 ? '🌟 Great job!' : '💪 Keep practising!');
  $('doneScore').textContent = `${R.score}/${n}`; $('donePct').textContent = `${Math.round(pct * 100)}% correct`;
  $('ring').style.setProperty('--p', pct * 100);
  $('doneText').textContent = R.miss.length ? 'Questions to review:' : 'No misses this round!';
  $('doneMiss').innerHTML = R.miss.map(q => `<li>${q.plain} — <b>${q.a}</b></li>`).join('');
  show('done'); $('doneTitle').focus({ preventScroll: true });
}
$('again').onclick = () => show('home');

function show(id) { ['home', 'quiz', 'done'].forEach(s => $(s).classList.toggle('hidden', s !== id)); document.body.classList.toggle('playing', id !== 'home'); if (id === 'home') renderHome(); scrollTo(0, 0) }
renderHome();
if ('serviceWorker' in navigator) {
  // When an update takes over, show it at once, but never in the middle of a round.
  const updating = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (updating && !document.body.classList.contains('playing')) location.reload() });
  navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).catch(() => {});
}
