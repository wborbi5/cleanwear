import React, { useState, useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import CleanWearApp from './CleanWear.jsx'
import LandingPage from './LandingPage.jsx'
import AuthCallback from './pages/AuthCallback.jsx'
import { AuthProvider } from './contexts/AuthContext.jsx'

function Root() {
  const [view, setView] = useState(() => {
    // Handle /auth/callback route
    if (window.location.pathname === '/auth/callback') return 'auth-callback';
    return window.location.hash === '#app' ? 'app' : 'landing';
  });

  useEffect(() => {
    const onHash = () => {
      if (window.location.pathname === '/auth/callback') return;
      setView(window.location.hash === '#app' ? 'app' : 'landing');
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  if (view === 'auth-callback') return <AuthCallback />;
  if (view === 'app') return <CleanWearApp />;
  return <LandingPage />;
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <Root />
    </AuthProvider>
  </React.StrictMode>
)
