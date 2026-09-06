# BookVerse 📚

BookVerse is a React + Vite reading-discovery experience for finding stories, exploring genres and authors, saving books, and reading previews with persistent progress.

## ✨ Features

- Responsive editorial-inspired interface
- Search across titles, authors, and genres
- Genre explorer with live filtering
- Author directory and individual author profiles
- Shared central book catalog used across the app
- Book detail pages with free previews
- Built-in reader with book-specific chapters
- Persistent per-book reading progress
- Scroll-based reading progress tracking
- Reader controls for font size, reading width, and page theme
- Paper, sepia, and night reading modes
- Save / remove books from a personal library
- Library search and sorting
- Persistent light / dark application theme
- Responsive mobile navigation
- Client-side routing with React Router
- Friendly 404 states for unknown routes, books, and authors
- GitHub Actions CI for production builds

## 🛠️ Stack

- React
- React Router
- Vite
- JavaScript (ES modules)
- CSS
- Browser Local Storage
- GitHub Actions

## 🚀 Run locally

```bash
npm install
npm run dev
```

For a production build:

```bash
npm run build
npm run preview
```

## 📁 Structure

```text
BookVerse/
├── index.html
├── package.json
├── vite.config.js
├── .github/
│   └── workflows/
│       └── ci.yml
└── src/
    ├── main.jsx
    ├── App.jsx
    ├── styles.css
    ├── data/
    │   └── books.js
    ├── layouts/
    │   └── PageShell.jsx
    ├── hooks/
    │   ├── useLibrary.js
    │   └── useReadingProgress.js
    ├── lib/
    │   └── storage.js
    └── components/
        ├── BookCard.jsx
        ├── Footer.jsx
        ├── Header.jsx
        └── Reader.jsx
```

## 🧭 Routes

| Route | Purpose |
| --- | --- |
| `/` | Discovery, search, genres, trending stories, recommendations |
| `/genres` | Browse and filter the full catalog by genre |
| `/authors` | Search the author directory |
| `/author/:name` | Author profile and bibliography |
| `/book/:id` | Book details, preview, and reader |
| `/library` | Saved books, search, sorting, and removal |

## 💾 Local persistence

BookVerse currently works without a backend. Local Storage keeps the following data in the browser:

- Saved library
- Application theme
- Per-book reading progress
- Reader preferences

This makes the current build fully interactive while keeping the architecture ready for a future hosted backend.

## 🧭 Roadmap

- Supabase authentication
- Cloud-synced libraries
- Database-backed catalog and user data
- User profiles
- Ratings and reviews
- Smarter recommendations based on reading activity
- Author publishing dashboard
- Production deployment
- Automated linting and testing

## 🎯 Project goal

BookVerse is being developed as a portfolio-quality product project focused on reusable React architecture, product thinking, responsive UI engineering, client-side state, and the foundations of a future reading platform.

## 📄 License

This project is for educational and portfolio purposes.
