import React, { useEffect, useState } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { getTheme, saveTheme } from './lib/storage.js';
import './styles.css';

function Root() {
  const [dark, setDark] = useState(() => getTheme() === 'dark');

  useEffect(() => {
    saveTheme(dark ? 'dark' : 'light');
  }, [dark]);

  return (
    <BrowserRouter>
      <App dark={dark} setDark={setDark} />
    </BrowserRouter>
  );
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>,
);
