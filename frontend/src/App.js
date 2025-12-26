import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import { Toaster } from './components/ui/sonner';
import './App.css';

function App() {
  const [userId, setUserId] = useState(localStorage.getItem('telegram_user_id'));

  const handleLogin = (newUserId) => {
    localStorage.setItem('telegram_user_id', newUserId);
    setUserId(newUserId);
  };

  const handleLogout = () => {
    localStorage.removeItem('telegram_user_id');
    setUserId(null);
  };

  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route
            path="/"
            element={
              userId ? (
                <Navigate to="/dashboard" replace />
              ) : (
                <LoginPage onLogin={handleLogin} />
              )
            }
          />
          <Route
            path="/dashboard"
            element={
              userId ? (
                <Dashboard userId={userId} onLogout={handleLogout} />
              ) : (
                <Navigate to="/" replace />
              )
            }
          />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" />
    </div>
  );
}

export default App;