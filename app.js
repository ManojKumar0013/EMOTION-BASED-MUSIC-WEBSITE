'use strict';


const JAMENDO_CLIENT_ID = '69a97c71';
const JAMENDO_BASE      = 'https://api.jamendo.com/v3.0';
const LS                = localStorage;           
const EMO_TAGS = {
  joy     : 'happy',
  sad     : 'sad',
  angry   : 'energetic',
  fear    : 'ambient',
  calm    : 'relaxing',
  excited : 'dance',
  disgust : 'grunge',
  love    : 'romantic',
};


const EMO_COLORS = {
  joy     : ['#FFD700','#FF8C00','#FFA500'],
  sad     : ['#1a237e','#0d47a1','#546e7a'],
  angry   : ['#b71c1c','#e64a19','#ff6f00'],
  fear    : ['#4a148c','#1a237e','#212121'],
  calm    : ['#00695c','#006064','#00796b'],
  excited : ['#e040fb','#7b1fa2','#ff4081'],
  disgust : ['#2e7d32','#388e3c','#1b5e20'],
  love    : ['#c2185b','#e91e63','#ad1457'],
};


const PLAYLIST_TAGS = {
  Happy   : 'happy',
  Workout : 'energetic',
  Chill   : 'chill',
  Party   : 'dance',
  Travel  : 'world',
  Wedding : 'romantic',
  Kids    : 'children',
  Retro   : 'retro',
};


const ADMIN_EMAIL = 'admin@nextune.com';


let currentUser   = null;  
let currentMood   = null;
let songQueue     = [];     
let currentIndex  = -1;   
let audioEl       = null;
let audioCtx      = null;
let analyser      = null;
let sourceNode    = null;
let vizBars       = [];
let vizRafId      = null;
let favSet        = new Set();       
let recentList    = [];              
let moodHistory   = [];              
let songsPlayed   = 0;
let searchTimeout = null;
let adminSongs    = [];              

document.addEventListener('DOMContentLoaded', () => {
  audioEl = document.getElementById('audioEl');

  buildStars();
  buildRain();
  buildFire();

  setTimeout(() => {
    document.getElementById('loadingOverlay').style.opacity = '0';
    setTimeout(() => {
      document.getElementById('loadingOverlay').style.display = 'none';
    }, 600);
  }, 2000);

  loadFromStorage();

  if (currentUser) {
    showApp();
  } else {
    document.getElementById('authWrap').style.display = 'flex';
  }

  audioEl.addEventListener('timeupdate',  onTimeUpdate);
  audioEl.addEventListener('ended',       nextSong);
  audioEl.addEventListener('loadeddata',  onLoaded);

  document.addEventListener('click', e => {
    if (!e.target.closest('.search-wrap'))      closeSearchDrop();
    if (!e.target.closest('.profile-drop') &&
        !e.target.closest('#avatarBtn'))        closeProfile();
  });

  updateGreeting();
  setInterval(updateGreeting, 60000);
});

function loadFromStorage() {
  try {
    currentUser  = JSON.parse(LS.getItem('mt_user'))   || null;
    favSet       = new Set(JSON.parse(LS.getItem('mt_favs'))    || []);
    recentList   = JSON.parse(LS.getItem('mt_recent'))  || [];
    moodHistory  = JSON.parse(LS.getItem('mt_moods'))   || [];
    songsPlayed  = parseInt(LS.getItem('mt_played'))    || 0;
    adminSongs   = JSON.parse(LS.getItem('mt_asongs'))  || [];
  } catch(e) {
    console.warn('Storage read error', e);
  }
}

function saveStorage() {
  LS.setItem('mt_favs',   JSON.stringify([...favSet]));
  LS.setItem('mt_recent', JSON.stringify(recentList));
  LS.setItem('mt_moods',  JSON.stringify(moodHistory));
  LS.setItem('mt_played', songsPlayed);
  LS.setItem('mt_asongs', JSON.stringify(adminSongs));
}

function getAllUsers() {
  return JSON.parse(LS.getItem('mt_users') || '[]');
}

function saveAllUsers(arr) {
  LS.setItem('mt_users', JSON.stringify(arr));
}


function switchAuthTab(tab) {
  const isLogin = tab === 'login';
  document.getElementById('tabLogin').classList.toggle('active', isLogin);
  document.getElementById('tabSignup').classList.toggle('active', !isLogin);
  document.getElementById('loginForm').style.display  = isLogin ? '' : 'none';
  document.getElementById('signupForm').style.display = isLogin ? 'none' : '';
  clearAuthMsgs();
}

function clearAuthMsgs() {
  ['loginErr','signupErr','signupOk'].forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.textContent = ''; el.style.display = 'none'; }
  });
}

function setAuthErr(id, msg) {
  const el = document.getElementById(id);
  el.textContent = msg;
  el.style.display = 'block';
}

function doLogin() {
  clearAuthMsgs();
  const email = document.getElementById('loginEmail').value.trim().toLowerCase();
  const pass  = document.getElementById('loginPass').value;

  if (!email || !pass) { setAuthErr('loginErr','Please fill in all fields.'); return; }
  if (!isValidEmail(email)) { setAuthErr('loginErr','Enter a valid email.'); return; }

  const users = getAllUsers();
  const user  = users.find(u => u.email === email && u.pass === hashPass(pass));

  if (!user) { setAuthErr('loginErr','Incorrect email or password.'); return; }

  loginUser(user);
}

function doSignup() {
  clearAuthMsgs();
  const name  = document.getElementById('signupName').value.trim();
  const email = document.getElementById('signupEmail').value.trim().toLowerCase();
  const pass  = document.getElementById('signupPass').value;
  const langs = [...document.querySelectorAll('.lang-chip.on')].map(c => c.dataset.lang || c.textContent.trim().replace(/^.+\s/,''));

  if (!name || !email || !pass) { setAuthErr('signupErr','Please fill in all fields.'); return; }
  if (!isValidEmail(email))      { setAuthErr('signupErr','Enter a valid email.'); return; }
  if (pass.length < 6)           { setAuthErr('signupErr','Password must be at least 6 characters.'); return; }

  const users = getAllUsers();
  if (users.find(u => u.email === email)) { setAuthErr('signupErr','An account with this email already exists.'); return; }

  const newUser = {
    name,
    email,
    pass    : hashPass(pass),
    langs   : langs.length ? langs : ['English'],
    isAdmin : email === ADMIN_EMAIL,
    joined  : new Date().toISOString(),
  };

  users.push(newUser);
  saveAllUsers(users);

  const okEl = document.getElementById('signupOk');
  okEl.textContent = '✓ Account created! Signing you in…';
  okEl.style.display = 'block';

  setTimeout(() => loginUser(newUser), 1000);
}

function googleSignIn() {
  const mockName  = 'Google User';
  const mockEmail = 'googleuser_' + Date.now() + '@gmail.com';

  const users = getAllUsers();
  let user = users.find(u => u.email === mockEmail);
  if (!user) {
    user = { name: mockName, email: mockEmail, pass: '', langs: ['English'], isAdmin: false, joined: new Date().toISOString() };
    users.push(user);
    saveAllUsers(users);
  }

  showToast('Google sign-in is simulated in this demo. In production, connect Firebase Auth.');
  loginUser(user);
}

function loginUser(user) {
  currentUser = { name: user.name, email: user.email, langs: user.langs || ['English'], isAdmin: user.isAdmin || false };
  LS.setItem('mt_user', JSON.stringify(currentUser));
  loadFromStorage();
  document.getElementById('authWrap').style.display = 'none';
  showApp();
}

function doLogout() {
  currentUser = null;
  LS.removeItem('mt_user');
  currentMood  = null;
  songQueue    = [];
  currentIndex = -1;
  stopAudio();
  document.getElementById('app').style.display = 'none';
  document.getElementById('authWrap').style.display = 'flex';
  document.getElementById('loginEmail').value = '';
  document.getElementById('loginPass').value  = '';
  switchAuthTab('login');
  resetBackground();
}

function togglePassVis(inputId, btn) {
  const inp = document.getElementById(inputId);
  inp.type  = inp.type === 'password' ? 'text' : 'password';
  btn.textContent = inp.type === 'password' ? '👁' : '🙈';
}

function toggleLang(el, lang) {
  el.classList.toggle('on');
  el.dataset.lang = lang;
}

function showApp() {
  document.getElementById('app').style.display = 'flex';

  const initials = currentUser.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0,2);
  document.getElementById('avatarBtn').textContent  = initials;
  document.getElementById('pdAvatar').textContent   = initials;
  document.getElementById('pdName').textContent     = currentUser.name;
  document.getElementById('pdEmail').textContent    = currentUser.email;
  document.getElementById('sidebarUserEmail').textContent = currentUser.email;

  if (currentUser.isAdmin) {
    document.getElementById('adminMenuItem').style.display = 'block';
    document.getElementById('snav-admin').style.display    = 'flex';
    document.getElementById('sidebarAdminLbl').style.display = 'block';
  }

  updateGreeting();
  updateFavBadge();
  navTo('home');
  buildVisualizer();
  buildStars();
}

function navTo(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.sidebar-item').forEach(i => i.classList.remove('active'));

  const target = document.getElementById('page-' + page);
  if (target) target.classList.add('active');

  const sItem = document.getElementById('snav-' + page);
  if (sItem) sItem.classList.add('active');
  switch(page) {
    case 'dashboard'  : refreshDashboard(); break;
    case 'favorites'  : renderFavorites();  break;
    case 'recent'     : renderRecent();     break;
    case 'analytics'  : renderAnalytics();  break;
    case 'admin'      : renderAdmin();      break;
  }

  const ps = document.querySelector('.page-scroll');
  if (ps) ps.scrollTop = 0;
}

function toggleSidebar() {
  const sb  = document.getElementById('sidebar');
  const ov  = document.getElementById('sidebarOverlay');
  const btn = document.getElementById('menuBtn');
  const open = sb.classList.toggle('open');
  ov.classList.toggle('open', open);
  btn.classList.toggle('open', open);
  btn.setAttribute('aria-expanded', open);
}

function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebarOverlay').classList.remove('open');
  document.getElementById('menuBtn').classList.remove('open');
  document.getElementById('menuBtn').setAttribute('aria-expanded', 'false');
}

function toggleProfile() {
  document.getElementById('profileDrop').classList.toggle('open');
}

function closeProfile() {
  document.getElementById('profileDrop').classList.remove('open');
}

function updateGreeting() {
  const h = new Date().getHours();
  let period, emoji;
  if      (h < 12) { period = 'Morning';   emoji = '☀️'; }
  else if (h < 17) { period = 'Afternoon'; emoji = '🌤'; }
  else if (h < 21) { period = 'Evening';   emoji = '🌙'; }
  else             { period = 'Night';     emoji = '🌟'; }

  const name = currentUser ? currentUser.name.split(' ')[0] : 'there';
  const txt  = `Good ${period}, ${name} ${emoji}`;

  const gt = document.getElementById('greetingText');
  const hn = document.getElementById('helloName');
  const tl = document.getElementById('timeLabel');
  if (gt) gt.textContent = txt;
  if (hn) hn.textContent = `Hey ${name} 👋`;
  if (tl) tl.textContent = `Good ${period}`;
}

function selectEmo(mood, cardEl) {
  currentMood = mood;
  document.querySelectorAll('.emo-card').forEach(c => c.classList.remove('on'));
  if (cardEl) cardEl.classList.add('on');

  applyMoodBackground(mood);
  moodHistory.push({ mood, ts: Date.now() });
  saveStorage();
  document.getElementById('songsSection').style.display = '';
  document.getElementById('streamLabel').style.display  = '';

  const emoEmojis = { joy:'😄', sad:'😢', angry:'😤', fear:'😨', calm:'😌', excited:'🤩', disgust:'🤢', love:'🥰' };
  const emoNames  = { joy:'Joy', sad:'Sad', angry:'Angry', fear:'Anxious', calm:'Calm', excited:'Excited', disgust:'Disgust', love:'Love' };
  document.getElementById('songSectionTitle').textContent =
    `${emoEmojis[mood] || '🎵'} Songs for ${emoNames[mood] || mood}`;

  fetchSongs(mood);
  showToast(`${emoEmojis[mood]} ${emoNames[mood]} mode activated!`);
  setTimeout(() => {
    const songsEl = document.getElementById('songsSection');
    const scrollEl = document.querySelector('.page-scroll');
    if (songsEl && scrollEl) {
      scrollEl.scrollTo({ top: songsEl.offsetTop - 20, behavior: 'smooth' });
    }
  }, 200);
}


function applyMoodBackground(mood) {
  const canvas = document.getElementById('bgCanvas');
  const colors = EMO_COLORS[mood] || EMO_COLORS.joy;

  document.getElementById('orb1').style.background = colors[0];
  document.getElementById('orb2').style.background = colors[1];
  document.getElementById('orb3').style.background = colors[2];

  document.getElementById('rainLayer').style.display    = mood === 'sad'    ? 'block' : 'none';
  document.getElementById('fireLayer').style.display    = mood === 'angry'  ? 'block' : 'none';
  document.getElementById('breatheLayer').style.display = mood === 'calm'   ? 'flex'  : 'none';
  document.getElementById('heartLayer').style.display   = mood === 'love'   ? 'block' : 'none';

  document.body.dataset.mood = mood;
  if (canvas) canvas.dataset.mood = mood;
  if (mood === 'angry') buildFire();
  if (mood === 'love')  buildHearts();
}

function resetBackground() {
  document.getElementById('rainLayer').style.display    = 'none';
  document.getElementById('fireLayer').style.display    = 'none';
  document.getElementById('breatheLayer').style.display = 'none';
  document.getElementById('heartLayer').style.display   = 'none';
  document.body.removeAttribute('data-mood');
}
function buildStars() {
  const layer = document.getElementById('starLayer');
  if (!layer) return;
  layer.innerHTML = '';
  for (let i = 0; i < 90; i++) {
    const s = document.createElement('div');
    s.className = 'star';
    s.style.cssText = `
      left:${Math.random()*100}%;
      top:${Math.random()*100}%;
      width:${1 + Math.random()*2.5}px;
      height:${1 + Math.random()*2.5}px;
      animation-delay:${Math.random()*4}s;
      animation-duration:${2 + Math.random()*3}s;
    `;
    layer.appendChild(s);
  }
}

function buildRain() {
  const layer = document.getElementById('rainLayer');
  if (!layer) return;
  layer.innerHTML = '';
  for (let i = 0; i < 80; i++) {
    const d = document.createElement('div');
    d.className = 'rain-drop';
    d.style.cssText = `
      left:${Math.random()*100}%;
      animation-delay:${Math.random()*2}s;
      animation-duration:${0.6 + Math.random()*0.8}s;
      height:${14 + Math.random()*20}px;
      opacity:${0.3 + Math.random()*0.5};
    `;
    layer.appendChild(d);
  }
}


function buildFire() {
  const layer = document.getElementById('fireLayer');
  if (!layer) return;
  layer.innerHTML = '';
  for (let i = 0; i < 50; i++) {
    const e = document.createElement('div');
    e.className = 'ember';
    e.style.cssText = `
      left:${Math.random()*100}%;
      bottom:${Math.random()*20}%;
      width:${4 + Math.random()*8}px;
      height:${4 + Math.random()*8}px;
      animation-delay:${Math.random()*3}s;
      animation-duration:${1.5 + Math.random()*2}s;
    `;
    layer.appendChild(e);
  }
}

function buildHearts() {
  const layer = document.getElementById('heartLayer');
  if (!layer) return;
  layer.innerHTML = '';
  const hearts = ['❤️','💕','💖','💗','💓'];
  for (let i = 0; i < 30; i++) {
    const h = document.createElement('div');
    h.className = 'floating-heart';
    h.textContent = hearts[Math.floor(Math.random()*hearts.length)];
    h.style.cssText = `
      left:${Math.random()*100}%;
      animation-delay:${Math.random()*5}s;
      animation-duration:${4 + Math.random()*4}s;
      font-size:${14 + Math.random()*24}px;
    `;
    layer.appendChild(h);
  }
}


async function fetchSongs(mood, offset = 0) {
  const grid = document.getElementById('songGrid');
  if (offset === 0) {
    grid.innerHTML = '<div class="song-skeleton"></div><div class="song-skeleton"></div><div class="song-skeleton"></div><div class="song-skeleton"></div><div class="song-skeleton"></div><div class="song-skeleton"></div>';
  }

  const tag    = EMO_TAGS[mood] || 'happy';
  const genre  = document.getElementById('genreFilter')?.value || '';
  const url    = `${JAMENDO_BASE}/tracks/?client_id=${JAMENDO_CLIENT_ID}&format=jsonpretty&limit=20&offset=${offset}&tags=${tag}${genre ? '&fuzzytags=' + genre : ''}&include=musicinfo&audioformat=mp32`;

  try {
    const res  = await fetch(url);
    const data = await res.json();
    const songs = (data.results || []).map(t => ({
      id     : t.id,
      name   : t.name,
      artist : t.artist_name,
      image  : t.image,
      audio  : t.audio,
      mood   : mood,
      genre  : t.musicinfo?.tags?.genres?.[0] || '',
    }));
    const adminMoodSongs = adminSongs.filter(s => s.mood === mood);
    if (offset === 0) songQueue = [...adminMoodSongs, ...songs];
    else              songQueue = [...songQueue, ...songs];

    renderSongGrid(offset === 0 ? songQueue : songs, offset > 0);
  } catch(err) {
    console.error('Jamendo fetch error', err);
    grid.innerHTML = '<p class="empty-hint">⚠️ Could not load songs. Check your internet connection.</p>';
  }
}

async function fetchSearchResults(query) {
  const url = `${JAMENDO_BASE}/tracks/?client_id=${JAMENDO_CLIENT_ID}&format=jsonpretty&limit=8&namesearch=${encodeURIComponent(query)}&include=musicinfo&audioformat=mp32`;
  try {
    const res  = await fetch(url);
    const data = await res.json();
    return (data.results || []).map(t => ({
      id     : t.id,
      name   : t.name,
      artist : t.artist_name,
      image  : t.image,
      audio  : t.audio,
      mood   : 'search',
    }));
  } catch(e) {
    return [];
  }
}

async function loadPlaylist(name, emoji, sidebarEl) {
  document.querySelectorAll('.sidebar-item').forEach(i => i.classList.remove('active'));
  if (sidebarEl) sidebarEl.classList.add('active');

  navTo('home');
  currentMood = name.toLowerCase();

  document.querySelectorAll('.emo-card').forEach(c => c.classList.remove('selected'));
  document.getElementById('songsSection').style.display = '';
  document.getElementById('streamLabel').style.display  = '';
  document.getElementById('songSectionTitle').textContent = `${emoji} ${name} Playlist`;

  const grid = document.getElementById('songGrid');
  grid.innerHTML = '<div class="song-skeleton"></div>'.repeat(6);

  const tag = PLAYLIST_TAGS[name] || name.toLowerCase();
  const url = `${JAMENDO_BASE}/tracks/?client_id=${JAMENDO_CLIENT_ID}&format=jsonpretty&limit=20&tags=${tag}&include=musicinfo&audioformat=mp32`;

  try {
    const res  = await fetch(url);
    const data = await res.json();
    songQueue  = (data.results || []).map(t => ({
      id     : t.id,
      name   : t.name,
      artist : t.artist_name,
      image  : t.image,
      audio  : t.audio,
      mood   : name.toLowerCase(),
    }));
    renderSongGrid(songQueue, false);
    showToast(`${emoji} ${name} playlist loaded!`);
  } catch(e) {
    grid.innerHTML = '<p class="empty-hint">⚠️ Could not load playlist.</p>';
  }
}

function loadMoreSongs() {
  if (!currentMood) return;
  fetchSongs(currentMood, songQueue.length);
}

function applyFilter() {
  if (!currentMood) return;
  fetchSongs(currentMood, 0);
}

function renderSongGrid(songs, append = false) {
  const grid = document.getElementById('songGrid');
  if (!append) grid.innerHTML = '';

  if (!songs.length && !append) {
    grid.innerHTML = '<p class="empty-hint">No songs found for this mood. Try another!</p>';
    return;
  }

  songs.forEach((song, i) => {
    const isFav = favSet.has(String(song.id));
    const card  = document.createElement('article');
    card.className = 'song-card';
    card.setAttribute('role', 'listitem');
    card.setAttribute('data-id', song.id);
    card.innerHTML = `
      <img class="song-art" src="${song.image || 'https://via.placeholder.com/200x200/1a1a2e/a855f7?text=🎵'}"
           alt="${escHtml(song.name)}" loading="lazy"
           onerror="this.src='https://via.placeholder.com/200x200/1a1a2e/a855f7?text=🎵'"/>
      <div class="song-info">
        <span class="song-name">${escHtml(song.name)}</span>
        <span class="song-artist">${escHtml(song.artist)}</span>
      </div>
      <div class="song-actions">
        <button class="song-play-btn" onclick="playSongAt(${i + (songQueue.length - songs.length)})"
                aria-label="Play ${escHtml(song.name)}">▶</button>
        <button class="song-fav-btn ${isFav ? 'active' : ''}"
                onclick="toggleFav('${song.id}', this)"
                aria-label="${isFav ? 'Remove from favourites' : 'Add to favourites'}">
          ${isFav ? '❤️' : '♡'}
        </button>
      </div>
    `;
    grid.appendChild(card);
  });
}

function playSongAt(index) {
  if (index < 0 || index >= songQueue.length) return;
  currentIndex = index;
  const song   = songQueue[index];
  if (!song.audio) { showToast('⚠️ No audio stream for this track.'); return; }

  audioEl.src = song.audio;
  audioEl.volume = parseFloat(document.getElementById('volSlider').value || 0.8);
  audioEl.play().catch(e => showToast('Playback blocked. Click anywhere first.'));

  document.getElementById('playerTitle').textContent  = song.name;
  document.getElementById('playerArtist').textContent = song.artist;
  document.getElementById('playerArt').src           = song.image || '';
  document.getElementById('playerBar').classList.add('open');
  document.getElementById('playBtn').textContent      = '⏸';

  const pfb = document.getElementById('playerFavBtn');
  pfb.textContent = favSet.has(String(song.id)) ? '❤️' : '♡';
  pfb.classList.toggle('active', favSet.has(String(song.id)));

  addToRecent(song);

  document.querySelectorAll('.song-card').forEach(c => c.classList.remove('playing'));
  const card = document.querySelector(`.song-card[data-id="${song.id}"]`);
  if (card) card.classList.add('playing');

  connectVisualizer();
}

function togglePlay() {
  if (!audioEl.src) return;
  if (audioEl.paused) {
    audioEl.play();
    document.getElementById('playBtn').textContent = '⏸';
  } else {
    audioEl.pause();
    document.getElementById('playBtn').textContent = '▶';
  }
}

function prevSong() {
  if (currentIndex > 0) playSongAt(currentIndex - 1);
}

function nextSong() {
  if (currentIndex < songQueue.length - 1) playSongAt(currentIndex + 1);
}

function stopAudio() {
  if (audioEl) { audioEl.pause(); audioEl.src = ''; }
  document.getElementById('playerBar').classList.remove('open');
  document.getElementById('playBtn').textContent = '▶';
  currentIndex = -1;
  document.querySelectorAll('.song-card').forEach(c => c.classList.remove('playing'));
}

function setVolume(v) { audioEl.volume = parseFloat(v); }

function onLoaded() {
  const d = audioEl.duration;
  document.getElementById('seekTotal').textContent = fmtTime(d);
  songsPlayed++;
  saveStorage();
}

function onTimeUpdate() {
  const cur = audioEl.currentTime;
  const dur = audioEl.duration || 0;
  document.getElementById('seekCurrent').textContent = fmtTime(cur);
  const pct = dur ? (cur / dur) * 100 : 0;
  document.getElementById('seekFill').style.width = pct + '%';
  document.getElementById('seekBar').setAttribute('aria-valuenow', Math.round(pct));
}

function seekAudio(e) {
  const bar = document.getElementById('seekBar');
  const pct = e.offsetX / bar.offsetWidth;
  audioEl.currentTime = pct * (audioEl.duration || 0);
}
function buildVisualizer() {
  const wrap = document.getElementById('visualizerWrap');
  if (!wrap) return;
  wrap.innerHTML = '';
  vizBars = [];
  for (let i = 0; i < 48; i++) {
    const b = document.createElement('div');
    b.className = 'viz-bar';
    wrap.appendChild(b);
    vizBars.push(b);
  }
}

function connectVisualizer() {
  if (!audioCtx) {
    audioCtx  = new (window.AudioContext || window.webkitAudioContext)();
    analyser  = audioCtx.createAnalyser();
    analyser.fftSize = 128;
    sourceNode = audioCtx.createMediaElementSource(audioEl);
    sourceNode.connect(analyser);
    analyser.connect(audioCtx.destination);
  }
  if (audioCtx.state === 'suspended') audioCtx.resume();
  if (vizRafId) cancelAnimationFrame(vizRafId);
  drawVisualizer();
}

function drawVisualizer() {
  if (!analyser) return;
  const data = new Uint8Array(analyser.frequencyBinCount);
  analyser.getByteFrequencyData(data);
  vizBars.forEach((bar, i) => {
    const h = Math.max(4, (data[i] / 255) * 80);
    bar.style.height = h + 'px';
  });
  vizRafId = requestAnimationFrame(drawVisualizer);
}

function toggleFav(id, btn) {
  const sid = String(id);
  if (favSet.has(sid)) {
    favSet.delete(sid);
    if (btn) { btn.textContent = '♡'; btn.classList.remove('active'); }
    showToast('Removed from favourites');
  } else {
    favSet.add(sid);
    if (btn) { btn.textContent = '❤️'; btn.classList.add('active'); }
    showToast('❤️ Added to favourites!');
  }
  saveStorage();
  updateFavBadge();

  const song = songQueue[currentIndex];
  if (song && String(song.id) === sid) {
    const pfb = document.getElementById('playerFavBtn');
    pfb.textContent = favSet.has(sid) ? '❤️' : '♡';
    pfb.classList.toggle('active', favSet.has(sid));
  }
}

function toggleFavPlayer() {
  const song = songQueue[currentIndex];
  if (!song) return;
  const btn = document.querySelector(`.song-card[data-id="${song.id}"] .song-fav-btn`);
  toggleFav(song.id, btn);
  const pfb = document.getElementById('playerFavBtn');
  pfb.textContent = favSet.has(String(song.id)) ? '❤️' : '♡';
  pfb.classList.toggle('active', favSet.has(String(song.id)));
}

function updateFavBadge() {
  const badge = document.getElementById('favBadge');
  if (badge) badge.textContent = favSet.size;
}

function renderFavorites() {
  const grid = document.getElementById('favoritesGrid');
  const empty = document.getElementById('favEmpty');
  const favSongs = songQueue.filter(s => favSet.has(String(s.id)));

  const recentFavs = recentList.filter(s => favSet.has(String(s.id)));
  const allFavs    = [...new Map([...recentFavs, ...favSongs].map(s => [s.id, s])).values()];

  if (!allFavs.length) {
    grid.innerHTML = '';
    if (empty) empty.style.display = 'flex';
    return;
  }
  if (empty) empty.style.display = 'none';

  grid.innerHTML = '';
  allFavs.forEach((song, i) => {
    const card = document.createElement('article');
    card.className = 'song-card';
    card.setAttribute('role', 'listitem');
    card.setAttribute('data-id', song.id);
    card.innerHTML = `
      <img class="song-art" src="${song.image || 'https://via.placeholder.com/200x200/1a1a2e/a855f7?text=🎵'}"
           alt="${escHtml(song.name)}" loading="lazy"
           onerror="this.src='https://via.placeholder.com/200x200/1a1a2e/a855f7?text=🎵'"/>
      <div class="song-info">
        <span class="song-name">${escHtml(song.name)}</span>
        <span class="song-artist">${escHtml(song.artist)}</span>
      </div>
      <div class="song-actions">
        <button class="song-play-btn" onclick="playFavSong(${i})" aria-label="Play">▶</button>
        <button class="song-fav-btn active" onclick="removeFav('${song.id}',this,${i})"
                aria-label="Remove from favourites">❤️</button>
      </div>
    `;
    grid.appendChild(card);
  });

  window._favQueue = allFavs;
}

function playFavSong(i) {
  if (!window._favQueue) return;
  const song = window._favQueue[i];
  if (!song) return;
  songQueue    = window._favQueue;
  currentIndex = i;
  playSongAt(i);
}

function removeFav(id, btn, idx) {
  favSet.delete(String(id));
  saveStorage();
  updateFavBadge();
  showToast('Removed from favourites');
  renderFavorites();
}

function clearFavorites() {
  if (!confirm('Clear all favourites?')) return;
  favSet.clear();
  saveStorage();
  updateFavBadge();
  renderFavorites();
  showToast('Favourites cleared.');
}

function addToRecent(song) {
  recentList = recentList.filter(s => s.id !== song.id);
  recentList.unshift({ ...song });
  if (recentList.length > 30) recentList.pop();
  saveStorage();
}

function renderRecent() {
  const list  = document.getElementById('recentList');
  const empty = document.getElementById('recentEmpty');

  if (!recentList.length) {
    list.innerHTML = '';
    if (empty) empty.style.display = 'flex';
    return;
  }
  if (empty) empty.style.display = 'none';

  list.innerHTML = '';
  recentList.forEach((song, i) => {
    const isFav = favSet.has(String(song.id));
    const row   = document.createElement('div');
    row.className = 'recent-row';
    row.innerHTML = `
      <img class="recent-art" src="${song.image || 'https://via.placeholder.com/50x50/1a1a2e/a855f7?text=🎵'}"
           alt="${escHtml(song.name)}" loading="lazy"
           onerror="this.src='https://via.placeholder.com/50x50/1a1a2e/a855f7?text=🎵'"/>
      <div class="recent-info">
        <span class="recent-name">${escHtml(song.name)}</span>
        <span class="recent-artist">${escHtml(song.artist)}</span>
      </div>
      <div class="recent-actions">
        <button class="song-play-btn" onclick="playRecentSong(${i})" aria-label="Play">▶</button>
        <button class="song-fav-btn ${isFav ? 'active' : ''}"
                onclick="toggleFav('${song.id}',this)"
                aria-label="${isFav ? 'Remove' : 'Add'} favourite">
          ${isFav ? '❤️' : '♡'}
        </button>
      </div>
    `;
    list.appendChild(row);
  });
}

function playRecentSong(i) {
  songQueue    = [...recentList];
  currentIndex = i;
  playSongAt(i);
}

function clearRecent() {
  if (!confirm('Clear recently played?')) return;
  recentList = [];
  saveStorage();
  renderRecent();
  showToast('Recently played cleared.');
}

function refreshDashboard() {
  if (!currentUser) return;
  const name = currentUser.name.split(' ')[0];
  const h    = new Date().getHours();
  const period = h < 12 ? 'Morning' : h < 17 ? 'Afternoon' : h < 21 ? 'Evening' : 'Night';
  document.getElementById('dashWelcome').textContent = `Welcome back, ${name}! 👋`;

  document.getElementById('dsSongs').textContent  = songsPlayed;
  document.getElementById('dsFavs').textContent   = favSet.size;
  document.getElementById('dsMoods').textContent  = moodHistory.length;

  const chips    = document.getElementById('dashMoodChips');
  const moodCount = {};
  moodHistory.forEach(m => { moodCount[m.mood] = (moodCount[m.mood] || 0) + 1; });

  if (Object.keys(moodCount).length) {
    chips.innerHTML = Object.entries(moodCount)
      .sort((a,b) => b[1]-a[1])
      .map(([mood, cnt]) => `<span class="mood-chip mood-chip-${mood}">${moodEmoji(mood)} ${capitalize(mood)} ×${cnt}</span>`)
      .join('');
  } else {
    chips.innerHTML = '<p class="empty-hint">Select a mood on the Home page to start tracking.</p>';
  }

  const rec = document.getElementById('dashRecPlaylists');
  const playlists = [
    ['Happy Vibes','😊','Happy'],['Chill','☁️','Chill'],
    ['Workout','💪','Workout'],['Party','🎉','Party']
  ];
  rec.innerHTML = playlists.map(([n,e,k]) =>
    `<div class="rec-card" onclick="loadPlaylist('${k}','${e}',null);navTo('home')" role="button" tabindex="0">
       <span class="rec-icon">${e}</span>
       <span class="rec-label">${n}</span>
     </div>`
  ).join('');

  const dashRecent = document.getElementById('dashRecent');
  if (!recentList.length) {
    dashRecent.innerHTML = '<p class="empty-hint">Nothing yet — start listening!</p>';
  } else {
    dashRecent.innerHTML = recentList.slice(0,5).map((s,i) => `
      <div class="recent-row" style="cursor:pointer" onclick="navTo('recent')">
        <img class="recent-art" src="${s.image || 'https://via.placeholder.com/40x40/1a1a2e/a855f7?text=🎵'}"
             alt="${escHtml(s.name)}" loading="lazy"
             onerror="this.src='https://via.placeholder.com/40x40/1a1a2e/a855f7?text=🎵'"/>
        <div class="recent-info">
          <span class="recent-name">${escHtml(s.name)}</span>
          <span class="recent-artist">${escHtml(s.artist)}</span>
        </div>
      </div>`).join('');
  }
}

function renderAnalytics() {
  document.getElementById('anSongs').textContent = songsPlayed;
  document.getElementById('anFavs').textContent  = favSet.size;
  document.getElementById('anMoods').textContent = moodHistory.length;

  const moodCount = {};
  moodHistory.forEach(m => { moodCount[m.mood] = (moodCount[m.mood] || 0) + 1; });
  const chart = document.getElementById('moodBarChart');
  const max   = Math.max(1, ...Object.values(moodCount));

  const moodColors = {
    joy     : { bg: 'linear-gradient(180deg,#FFE55C,#FFB800)', glow: 'rgba(255,200,0,.35)' },
    sad     : { bg: 'linear-gradient(180deg,#5B9BF8,#1565C0)', glow: 'rgba(85,140,255,.35)' },
    angry   : { bg: 'linear-gradient(180deg,#FF6B6B,#C62828)', glow: 'rgba(255,80,80,.35)'  },
    fear    : { bg: 'linear-gradient(180deg,#CE93D8,#6A1B9A)', glow: 'rgba(180,80,220,.35)' },
    calm    : { bg: 'linear-gradient(180deg,#4DD0C4,#00695C)', glow: 'rgba(0,200,180,.35)'  },
    excited : { bg: 'linear-gradient(180deg,#FF85C8,#E040FB)', glow: 'rgba(240,80,240,.35)' },
    disgust : { bg: 'linear-gradient(180deg,#81C784,#2E7D32)', glow: 'rgba(80,200,80,.35)'  },
    love    : { bg: 'linear-gradient(180deg,#F48FB1,#C2185B)', glow: 'rgba(240,80,140,.35)' },
  };

  const allMoods = ['joy','sad','angry','disgust','excited','love','fear','calm'];

  chart.innerHTML = allMoods.map(mood => {
    const cnt   = moodCount[mood] || 0;
    const pct   = cnt / max;
    const color = moodColors[mood] || { bg:'rgba(255,255,255,.15)', glow:'rgba(255,255,255,.1)' };
    const barH  = cnt ? Math.max(28, Math.round(pct * 160)) : 6;
    const isEmpty = cnt === 0;
    return `
      <div class="chart-col">
        <span class="chart-count" style="opacity:${isEmpty?0:1}">${cnt}</span>
        <div class="chart-bar-wrap">
          <div class="chart-bar ${isEmpty?'chart-bar-empty':''}"
               style="height:${barH}px;background:${isEmpty?'rgba(255,255,255,.07)':color.bg};box-shadow:${isEmpty?'none':'0 0 18px '+color.glow}"
               data-tip="${capitalize(mood)}: ${cnt} session${cnt!==1?'s':''}"></div>
        </div>
        <div class="chart-lbl">
          <span class="chart-emoji">${moodEmoji(mood)}</span>
          <span class="chart-name">${capitalize(mood)}</span>
        </div>
      </div>`;
  }).join('');

  const timeline = document.getElementById('moodTimeline');
  const recent10 = moodHistory.slice(-10).reverse();
  timeline.innerHTML = recent10.length
    ? `<div class="mood-timeline">${recent10.map(m => {
        const color = moodColors[m.mood];
        return `
        <div class="mood-entry">
          <div class="mood-entry-dot" style="background:${color?color.bg:'rgba(255,255,255,.3)'}"></div>
          <span class="mood-entry-emoji">${moodEmoji(m.mood)}</span>
          <div class="mood-entry-info">
            <div class="mood-entry-name">${capitalize(m.mood)}</div>
            <div class="mood-entry-time">${timeAgo(m.ts)}</div>
          </div>
          <div class="mood-entry-bar" style="background:${color?color.bg:'rgba(255,255,255,.2)'}"></div>
        </div>`;
      }).join('')}</div>`
    : '<p class="empty-hint">No sessions yet.</p>';

  const insight = document.getElementById('insightText');
  if (moodHistory.length >= 3) {
    const topMood = Object.entries(moodCount).sort((a,b)=>b[1]-a[1])[0];
    const messages = {
      joy     : '☀️ You\'ve been feeling mostly joyful! Keep that energy going.',
      sad     : '🌧 You\'ve had some sad moments this week. Sending comfort your way.',
      angry   : '🔥 High energy detected! Channel it into something powerful.',
      fear    : '🌌 You\'ve been anxious lately. Music helps — keep breathing.',
      calm    : '🌿 You\'re mostly calm this week. Wonderful balance!',
      excited : '⚡ Super excited energy! You\'re on fire.',
      disgust : '🌱 Feeling irritated? Let the music wash it away.',
      love    : '💕 Love is in the air for you this week!',
    };
    insight.textContent = messages[topMood[0]] || 'Keep listening and we\'ll learn your patterns.';
  } else {
    insight.textContent = 'Start listening to generate insights about your emotional patterns.';
  }
}

function handleSearch(query) {
  clearTimeout(searchTimeout);
  if (!query.trim()) { closeSearchDrop(); return; }
  searchTimeout = setTimeout(async () => {
    const results = await fetchSearchResults(query);
    renderSearchDrop(results);
  }, 400);
}

function renderSearchDrop(songs) {
  const drop = document.getElementById('searchResults');
  if (!songs.length) {
    drop.innerHTML = '<div class="sr-empty">No songs found</div>';
    drop.classList.add('open');
    return;
  }

  drop.innerHTML = songs.map((s, i) => `
    <div class="sr-item" role="option" tabindex="0"
         onclick="playFromSearch(${i})"
         onkeydown="if(event.key==='Enter') playFromSearch(${i})">
      <img src="${s.image || ''}" alt="" class="sr-art"
           onerror="this.src='https://via.placeholder.com/44x44/1a1a2e/a855f7?text=🎵'"/>
      <div class="sr-info">
        <div class="sr-title">${escHtml(s.name)}</div>
        <div class="sr-artist">${escHtml(s.artist)}</div>
      </div>
      <button class="ctrl-btn" style="flex-shrink:0;font-size:12px" aria-label="Play">▶</button>
    </div>`).join('');

  drop.classList.add('open');
  window._searchQueue = songs;
}

function playFromSearch(i) {
  if (!window._searchQueue) return;
  songQueue    = window._searchQueue;
  currentIndex = i;
  playSongAt(i);
  closeSearchDrop();
  document.getElementById('searchInput').value = '';
}

function openSearchDrop() {
  const drop = document.getElementById('searchResults');
  if (drop.innerHTML.trim()) drop.classList.add('open');
}

function closeSearchDrop() {
  document.getElementById('searchResults').classList.remove('open');
}

function submitContact() {
  const name = document.getElementById('cName').value.trim();
  const email = document.getElementById('cEmail').value.trim();
  const msg   = document.getElementById('cMsg').value.trim();

  if (!name || !email || !msg) { showToast('⚠️ Please fill in all fields.'); return; }
  if (!isValidEmail(email))    { showToast('⚠️ Enter a valid email.'); return; }
  const submissions = JSON.parse(LS.getItem('mt_contact') || '[]');
  submissions.push({ name, email, msg, ts: Date.now() });
  LS.setItem('mt_contact', JSON.stringify(submissions));

  document.getElementById('cName').value  = '';
  document.getElementById('cEmail').value = '';
  document.getElementById('cMsg').value   = '';

  const ok = document.getElementById('contactSuccess');
  if (ok) { ok.style.display = 'block'; setTimeout(() => ok.style.display = 'none', 4000); }
  showToast('✓ Message sent! Thank you.');
}

function renderAdmin() {
  if (!currentUser?.isAdmin) {
    document.getElementById('page-admin').innerHTML =
      '<div class="page-hero"><h1 class="page-hero-title">🚫 Access Denied</h1><p class="page-hero-sub">Admin access required.</p></div>';
    return;
  }

  renderAdminSongs();
  renderAdminUsers();
  renderAdminSite();
}

function switchAdminTab(tab, btnEl) {
  document.querySelectorAll('.admin-tab').forEach(b => { b.classList.remove('active'); b.setAttribute('aria-selected','false'); });
  document.querySelectorAll('.admin-panel').forEach(p => p.classList.remove('active'));
  if (btnEl) { btnEl.classList.add('active'); btnEl.setAttribute('aria-selected','true'); }
  const panel = document.getElementById('adminTab-' + tab);
  if (panel) panel.classList.add('active');
}

function renderAdminSongs() {
  const list = document.getElementById('adminSongList');
  if (!list) return;
  const allSongs = [...adminSongs];
  if (!allSongs.length) { list.innerHTML = '<p class="empty-hint">No custom songs added yet.</p>'; return; }
  list.innerHTML = allSongs.map((s, i) => `
    <div class="admin-row">
      <div class="admin-row-info">
        <strong>${escHtml(s.name)}</strong> — ${escHtml(s.artist)}
        <span class="mood-tag">${moodEmoji(s.mood)} ${capitalize(s.mood)}</span>
      </div>
      <div class="admin-row-actions">
        <button class="btn btn-sm btn-ghost" onclick="editAdminSong(${i})">Edit</button>
        <button class="btn btn-sm btn-danger" onclick="deleteAdminSong(${i})">Delete</button>
      </div>
    </div>`).join('');
}

function renderAdminUsers() {
  const list  = document.getElementById('adminUserList');
  if (!list) return;
  const users = getAllUsers();
  if (!users.length) { list.innerHTML = '<p class="empty-hint">No registered users.</p>'; return; }
  list.innerHTML = users.map(u => `
    <div class="admin-row">
      <div class="admin-row-info">
        <strong>${escHtml(u.name)}</strong>
        <span class="admin-email">${escHtml(u.email)}</span>
        ${u.isAdmin ? '<span class="admin-badge">Admin</span>' : ''}
      </div>
      <div class="admin-row-actions">
        <span class="admin-date">${new Date(u.joined).toLocaleDateString()}</span>
      </div>
    </div>`).join('');
}

function renderAdminSite() {
  const stats = document.getElementById('adminSiteStats');
  if (!stats) return;
  const users = getAllUsers();
  const contacts = JSON.parse(LS.getItem('mt_contact') || '[]');
  stats.innerHTML = `
    <div class="stat-card"><span class="stat-icon">👤</span><span class="stat-val">${users.length}</span><span class="stat-lbl">Users</span></div>
    <div class="stat-card"><span class="stat-icon">🎵</span><span class="stat-val">${adminSongs.length}</span><span class="stat-lbl">Custom Songs</span></div>
    <div class="stat-card"><span class="stat-icon">📬</span><span class="stat-val">${contacts.length}</span><span class="stat-lbl">Messages</span></div>
  `;
}

function toggleAddSong() {
  const form = document.getElementById('addSongForm');
  form.style.display = form.style.display === 'none' ? '' : 'none';
}

function addAdminSong() {
  const title  = document.getElementById('asSongTitle').value.trim();
  const artist = document.getElementById('asSongArtist').value.trim();
  const mood   = document.getElementById('asSongEmo').value;
  const audio  = document.getElementById('asSongUrl').value.trim();
  const image  = document.getElementById('asSongArt').value.trim();

  if (!title || !artist || !audio) { showToast('⚠️ Title, artist and audio URL are required.'); return; }

  adminSongs.push({ id: 'admin_' + Date.now(), name: title, artist, mood, audio, image });
  saveStorage();
  renderAdminSongs();
  toggleAddSong();
  ['asSongTitle','asSongArtist','asSongUrl','asSongArt'].forEach(id => document.getElementById(id).value = '');
  showToast('✓ Song added!');
}

function editAdminSong(i) {
  const s = adminSongs[i];
  if (!s) return;
  const newName = prompt('Edit title:', s.name);
  if (newName !== null) adminSongs[i].name = newName.trim() || s.name;
  saveStorage();
  renderAdminSongs();
}

function deleteAdminSong(i) {
  if (!confirm('Delete this song?')) return;
  adminSongs.splice(i, 1);
  saveStorage();
  renderAdminSongs();
  showToast('Song deleted.');
}

let toastTimer = null;
function showToast(msg, duration = 3000) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), duration);
}
function fmtTime(s) {
  if (!s || isNaN(s)) return '0:00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2,'0')}`;
}

function escHtml(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function isValidEmail(e) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
}

function capitalize(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
}

function hashPass(p) {

  let h = 0;
  for (let i = 0; i < p.length; i++) { h = ((h << 5) - h) + p.charCodeAt(i); h |= 0; }
  return String(h);
}

function timeAgo(ts) {
  const diff = Date.now() - ts;
  const m    = Math.floor(diff / 60000);
  if (m < 1)  return 'just now';
  if (m < 60) return `${m}m ago`;
  const hr = Math.floor(m / 60);
  if (hr < 24) return `${hr}h ago`;
  return `${Math.floor(hr/24)}d ago`;
}

function moodEmoji(mood) {
  const map = { joy:'😄', sad:'😢', angry:'😤', fear:'😨', calm:'😌', excited:'🤩', disgust:'🤢', love:'🥰' };
  return map[mood] || '🎵';
}


document.addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
  if (e.code === 'Space')      { e.preventDefault(); togglePlay(); }
  if (e.code === 'ArrowRight') { e.preventDefault(); nextSong(); }
  if (e.code === 'ArrowLeft')  { e.preventDefault(); prevSong(); }
  if (e.code === 'KeyM') {
    const vs = document.getElementById('volSlider');
    audioEl.muted = !audioEl.muted;
    showToast(audioEl.muted ? '🔇 Muted' : '🔊 Unmuted');
  }
});