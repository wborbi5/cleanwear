import React, { useState, useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import CleanWearApp from './CleanWear.jsx'
import LandingPage from './LandingPage.jsx'

function Root() {
  const [view, setView] = useState(window.location.hash === '#app' ? 'app' : 'landing');

  useEffect(() => {
    const onHash = () => {
      setView(window.location.hash === '#app' ? 'app' : 'landing');
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  if (view === 'app') {
    return <CleanWearApp />;
  }

  return (
    <LandingPage
      onLaunchApp={() => {
        window.location.hash = '#app';
        window.scrollTo(0, 0);
      }}
    />
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
)
