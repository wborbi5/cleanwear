import React, { useState, useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import CleanWearApp from './CleanWear.jsx'
import LandingPage from './LandingPage.jsx'
import AuthCallback from './pages/AuthCallback.jsx'
import SharePage from './pages/SharePage.jsx'
import { AuthProvider } from './contexts/AuthContext.jsx'
import './design/tokens.css'

function resolveView() {
  const p = window.location.pathname;
  if (p === '/auth/callback') return 'auth-callback';
  if (p.startsWith('/s/')) return 'share';
  return window.location.hash === '#app' ? 'app' : 'landing';
}

function Root() {
  const [view, setView] = useState(resolveView);

  useEffect(() => {
    const onChange = () => setView(resolveView());
    window.addEventListener('hashchange', onChange);
    window.addEventListener('popstate', onChange);
    return () => {
      window.removeEventListener('hashchange', onChange);
      window.removeEventListener('popstate', onChange);
    };
  }, []);

  if (view === 'auth-callback') return <AuthCallback />;
  if (view === 'share') return <SharePage />;
  if (view === 'app') return <CleanWearApp />;
  return <LandingPage onLaunchApp={() => { window.location.hash = '#app'; }} />;
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <Root />
    </AuthProvider>
  </React.StrictMode>
)
