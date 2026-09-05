# BookVerse 📚

BookVerse is a React + Vite reading-discovery experience for finding stories, exploring genres and authors, and building a personal library.

## ✨ Features

- Editorial-inspired responsive interface
- Search across titles, authors, and genres
- Genre exploration and filtering
- Author directory and author profiles
- Individual book detail pages with previews
- Save / remove books from a local library
- Library search
- Persistent light / dark theme preference
- Shared book data across the entire app
- Responsive mobile navigation
- 404 states for unknown books and authors

## 🛠️ Stack

- React
- Vite
- JavaScript (ES modules)
- CSS
- Browser Local Storage

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
├── src/
│   ├── main.jsx
│   ├── App.jsx
│   ├── styles.css
│   ├── data/
│   │   └── books.js
│   └── components/
│       ├── BookCard.jsx
│       ├── Header.jsx
│       └── Footer.jsx
└── .gitignore
```

## 🧭 Current routes

- `/` — discovery
- `/genres` — genre explorer
- `/authors` — author directory
- `/author/:name` — author profile
- `/book/:id` — book details and preview
- `/library` — saved books

## 🗺️ Roadmap

- Real authentication
- Cloud-synced libraries
- Supabase database/API integration
- Full reader with chapters and reading progress
- Recommendations based on reading activity
- User profiles
- Author publishing dashboard
- Ratings and reviews
- Production deployment and automated checks

## 🎯 Project goal

BookVerse is being developed as a portfolio-quality product project exploring product design, reusable React architecture, responsive UI engineering, and the foundations of a future reading platform.

## 📄 License

This project is for educational and portfolio purposes.
