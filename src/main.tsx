import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
// Ensure Google AI client uses runtime credentials (overrides module default if needed)
import { setGoogleAICredentials } from './services/googleAiService';

// If an env var exists, prefer it; otherwise, (optionally) set the known key here.
const runtimeKey = import.meta.env.VITE_GOOGLE_AI_API_KEY || 'AIzaSyDPz5mE6meznFyKuwrKYM7OjyuwTnItaAs';
setGoogleAICredentials(runtimeKey);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
