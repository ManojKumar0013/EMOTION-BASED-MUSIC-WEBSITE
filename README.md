#  NexTune — Emotion-Based Music Recommendation

<div align="center">

![NexTune Banner](https://img.shields.io/badge/NexTune-Emotion%20Music-blueviolet?style=for-the-badge&logo=music&logoColor=white)
![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![Vue.js](https://img.shields.io/badge/Vue.js-35495E?style=for-the-badge&logo=vuedotjs&logoColor=4FC08D)
![Jamendo API](https://img.shields.io/badge/Jamendo-API-orange?style=for-the-badge)

**Pick your mood. Feel the music. Experience the vibe.**

[Features](#-features) · [Mood Effects](#-mood-visual-effects) · [Getting Started](#-getting-started) · [Project Structure](#-project-structure) · [API](#-api-reference) · [Contributing](#-contributing)

</div>

---

##  Overview

NexTune is a fully client-side, emotion-driven music web app that recommends and streams real songs based on how you feel. Select from 8 distinct moods, and NexTune dynamically fetches tracks from the [Jamendo API](https://developer.jamendo.com/v3.0), applies a matching immersive visual effect, and lets you build, save, and manage personal playlists — all without a backend.

---

##  Features

###  Mood-Based Music
- **8 emotion modes** — Joy, Sad, Angry, Fear, Calm, Excited, Disgust, Love
- Each mood maps to a Jamendo music tag and fetches live, royalty-free tracks
- Genre filter to narrow results within any mood
- Load More pagination for endless discovery

###  Immersive Visual Effects
Every mood triggers a unique full-screen ambient animation (see [Mood Effects](#-mood-visual-effects) below).

###  Music Player
- Persistent bottom player bar with artwork, title, and artist
- Play / Pause / Previous / Next controls
- Seek bar with timestamp display
- Volume slider
- Favourite toggle directly from the player
- Web Audio API visualizer (48-bar frequency spectrum)
- Keyboard shortcuts: `Space` play/pause · `→` next · `←` previous · `M` mute

### 📋 Playlist Builder *(Vue.js powered)*
- Choose mood, language, song count (up to 30), and energy level
- Fetch and preview a full playlist before saving
- Shuffle, remove individual tracks, and save up to 10 playlists to localStorage
- Load or delete saved playlists at any time

###  Favourites & Recently Played
- Favourite any track from the song grid or player bar
- Live badge counter on the sidebar
- Dedicated Favourites page with one-click play queue
- Recently Played history (last 30 tracks), playable as a queue

###  Mood Analytics Dashboard
- Bar chart visualising how often each mood has been selected
- Stats: total songs played, favourites count, mood sessions count
- Quick-access recommended playlists

###  Live Search
- Real-time song search with debounce (300 ms)
- Inline dropdown results, click to enqueue and play immediately

###  Auth System
- Sign up / Log in with email & password (localStorage, hashed)
- Google Sign-In stub (demo mode — swap in Firebase Auth for production)
- Multi-language preference selection at sign-up
- Admin role: designated admin email unlocks the Admin Panel

###  Admin Panel
- Add custom songs (name, artist, image URL, audio URL, mood tag)
- Custom songs are injected at the top of the relevant mood queue
- Delete songs from the admin list

###  Pre-built Playlists
Happy · Workout · Chill · Party · Travel · Wedding · Kids · Retro — available from the sidebar at any time.

---

##  Mood Visual Effects

| Mood | Effect | Implementation |
|------|--------|---------------|
| 😄 **Joy** | Floating soap bubbles rising from the bottom | CSS `@keyframes` + JS DOM generation |
| 😢 **Sad** | Falling rain streaks | CSS `@keyframes rainfall` + JS DOM |
| 😤 **Angry** | Rising fire particles | CSS `@keyframes fireRise` + JS DOM |
| 😌 **Calm** | Pulsing concentric breathe rings | CSS `@keyframes breathePulse` |
| 🥰 **Love** | Floating emoji hearts | CSS `@keyframes floatHeart` + JS DOM |
| 🤩 **Excited** | Audio-reactive neon bar visualizer | Canvas 2D API + Web Audio FFT |
| 🤢 **Disgust** | Screen distortion & hue warp | SVG `feTurbulence` / `feDisplacementMap` filter + CSS |
| 😨 **Fear** | Dark ambient orbs (no particle layer) | CSS orb gradient animation |

All effects are layered behind the UI at `z-index: 1` with `pointer-events: none` and transition in/out smoothly at `opacity` over 1.4 s.

---

##  Getting Started

### Prerequisites

No build tools, no package manager, no server required.

- A modern browser (Chrome 90+, Firefox 88+, Safari 15+, Edge 90+)
- An internet connection (for Jamendo API and Google Fonts)

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/nextune.git

# Navigate into the project
cd nextune
```

### Running Locally

Simply open `index.html` in your browser:

```bash
# macOS
open index.html

# Linux
xdg-open index.html

# Windows
start index.html
```

Or serve it with any static file server:

```bash
# Using VS Code Live Server extension (recommended)
# Right-click index.html → "Open with Live Server"

# Using Python
python -m http.server 8000
# Visit http://localhost:8000

# Using Node.js npx
npx serve .
# Visit http://localhost:3000
```

> **Note:** The Web Audio API visualizer and some browser APIs require a server context (not `file://`). Use Live Server or any local HTTP server for the full experience.

---

##  Project Structure

```
nextune/
├── index.html       # App shell — all pages, layers, and player markup
├── style.css        # All styles — layout, components, animations, mood effects
├── app.js           # All logic — auth, audio, mood effects, API, Vue playlist builder
└── README.md        # This file
```

### Key Sections in `app.js`

| Section | Description |
|---------|-------------|
| Constants & State | API keys, mood tag maps, color maps, global state variables |
| Auth | `doLogin`, `doSignup`, `googleSignIn`, `loginUser`, `doLogout` |
| Navigation | `navTo`, `toggleSidebar`, `updateGreeting` |
| Mood & Background | `selectEmo`, `applyMoodBackground`, `resetBackground` |
| Visual Effects | `buildStars`, `buildRain`, `buildFire`, `buildHearts`, `buildBubbles`, `startNeonBars`, `stopNeonBars` |
| Song Fetching | `fetchSongs`, `fetchSearchResults`, `loadPlaylist` |
| Player | `playSongAt`, `togglePlay`, `prevSong`, `nextSong`, `seekAudio`, `setVolume` |
| Web Audio | `connectVisualizer`, `buildVisualizer`, `drawVisualizer` |
| Favourites | `toggleFav`, `renderFavorites`, `clearFavorites` |
| Recent | `addToRecent`, `renderRecent`, `clearRecent` |
| Dashboard & Analytics | `refreshDashboard`, `renderAnalytics` |
| Admin | `renderAdmin`, `addAdminSong`, `deleteAdminSong` |
| Vue Playlist Builder | `mountVuePlaylistBuilder` — full Vue 3 component |
| Utilities | `showToast`, `fmtTime`, `escHtml`, `hashPass`, `timeAgo`, `moodEmoji` |

---

##  API Reference

### Jamendo API

NexTune uses the [Jamendo v3.0 REST API](https://developer.jamendo.com/v3.0) for all music data.

| Endpoint | Usage |
|----------|-------|
| `GET /tracks/` | Fetch tracks by mood tag, genre filter, name search |

**Key parameters used:**

```
client_id     — Public API key (bundled in app.js)
tags          — Mood tag (e.g. happy, relaxing, energetic)
fuzzytags     — Optional genre filter
namesearch    — For live search
limit         — Results per page (max 30 for playlist builder, 20 for mood feed)
offset        — Pagination
include       — musicinfo (genre metadata)
audioformat   — mp32 (MP3 128kbps stream URL)
```

> The included `client_id` is a public demo key. For production use, [register your own](https://developer.jamendo.com/v3.0) at no cost.

---

##  Configuration

All configuration lives at the top of `app.js`:

```js
const JAMENDO_CLIENT_ID = 'your_client_id_here';

const EMO_TAGS = {           // Mood → Jamendo tag mapping
  joy     : 'happy',
  sad     : 'sad',
  angry   : 'energetic',
  calm    : 'relaxing',
  excited : 'dance',
  disgust : 'grunge',
  fear    : 'ambient',
  love    : 'romantic',
};

const ADMIN_EMAIL = 'admin@nextune.com';   // Change to your admin email
```

---

##  Authentication Notes

NexTune uses a **client-side only** auth system for demonstration purposes:

- Passwords are obfuscated with a simple hash (not cryptographically secure)
- All user data lives in `localStorage` — clearing browser data logs everyone out
- **For production**, replace with a real auth provider such as [Firebase Authentication](https://firebase.google.com/docs/auth), [Supabase](https://supabase.com/), or [Auth0](https://auth0.com/)

The Google Sign-In button is a UI stub. To wire it up:
1. Set up a Firebase project and enable Google Auth
2. Replace the `googleSignIn()` function body with `firebase.auth().signInWithPopup(provider)`

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Space` | Play / Pause |
| `→` | Next song |
| `←` | Previous song |
| `M` | Mute / Unmute |

> Shortcuts are disabled when focus is inside an input or textarea.

---

## Browser Support

| Browser | Support |
|---------|---------|
| Chrome 90+ | ✅ Full |
| Edge 90+ | ✅ Full |
| Firefox 88+ | ✅ Full |
| Safari 15+ | ✅ Full |
| Mobile Chrome / Safari | ✅ Responsive |

> SVG filter effects (`feTurbulence` distortion for Disgust mood) may render differently across browsers but degrade gracefully.

---

## Contributing

Contributions are welcome! Here's how to get started:

1. **Fork** the repository
2. **Create** a feature branch
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. **Commit** your changes
   ```bash
   git commit -m "feat: add your feature description"
   ```
4. **Push** to your fork
   ```bash
   git push origin feature/your-feature-name
   ```
5. **Open a Pull Request** against `main`

### Commit Message Convention

This project follows [Conventional Commits](https://www.conventionalcommits.org/):

| Prefix | Use for |
|--------|---------|
| `feat:` | New features |
| `fix:` | Bug fixes |
| `style:` | CSS / visual changes |
| `refactor:` | Code restructuring without behaviour change |
| `docs:` | Documentation updates |
| `chore:` | Tooling, dependencies, config |

---
## Roadmap

- [ ] Firebase Auth integration (Google, Email)
- [ ] Firestore backend for cross-device favourites & history
- [ ] Last.fm scrobbling support
- [ ] Dark / Light theme toggle
- [ ] PWA support with offline caching
- [ ] Drag-and-drop playlist reordering
- [ ] Share playlist via URL
- [ ] Lyrics display via Genius API

---

## License

This project is open source and available under the [MIT License](LICENSE).

---

## Acknowledgements

- [Jamendo](https://www.jamendo.com/) — Royalty-free music API powering all tracks
- [Vue.js](https://vuejs.org/) — Playlist Builder component
- [Google Fonts](https://fonts.google.com/) — Playfair Display, Nunito, Space Mono
- [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API) — Real-time frequency analysis for the neon visualizer

---

<div align="center">
  Made with ❤️ and 🎵 &nbsp;|&nbsp; <a href="#">Back to top ↑</a>
</div>
