import React from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/cinzel/700.css';
import '@fontsource/cinzel/900.css';
import '@fontsource/dm-sans/500.css';
import '@fontsource/dm-sans/700.css';
import './styles.css';
import App from './components/App.jsx';

createRoot(document.getElementById('root')).render(<App />);
