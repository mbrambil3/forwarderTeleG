import React, { useState } from 'react';
import { toast } from 'sonner';
import { Toaster } from 'sonner';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';

function App() {
  const [userId, setUserId] = useState(localStorage.getItem('userId'));
  const [isAuthenticated, setIsAuthenticated] = useState(
    localStorage.getItem('isAuthenticated') === 'true'
  );

  const handleLogin = (newUserId) => {
    setUserId(newUserId);
    setIsAuthenticated(true);
    localStorage.setItem('userId', newUserId);
    localStorage.setItem('isAuthenticated', 'true');
  };

  const handleLogout = () => {
    setUserId(null);
    setIsAuthenticated(false);
    localStorage.removeItem('userId');
    localStorage.removeItem('isAuthenticated');
  };

  return (
    <div className="App">
      <Toaster position="top-center" richColors />
      {isAuthenticated && userId ? (
        <DashboardPage 
          userId={userId} 
          backendUrl={BACKEND_URL}
          onLogout={handleLogout}
        />
      ) : (
        <LoginPage 
          backendUrl={BACKEND_URL} 
          onLogin={handleLogin}
        />
      )}
    </div>
  );
}

export default App;