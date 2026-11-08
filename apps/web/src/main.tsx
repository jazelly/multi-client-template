import { createRoot } from 'react-dom/client';
import App from './App';
import './theme.css';

// The desktop shell (apps/desktop) exposes window.desktop; the desktop: variant styles against it.
if ((window as { desktop?: unknown }).desktop) document.documentElement.classList.add('is-desktop');

createRoot(document.getElementById('root')!).render(<App />);
