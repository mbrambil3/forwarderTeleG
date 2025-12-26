import React, { useState } from 'react';
import axios from 'axios';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';
import { Send, Lock } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const LoginPage = ({ onLogin }) => {
  const [step, setStep] = useState('credentials'); // 'credentials', 'code', 'password'
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState(null);
  
  const [apiId, setApiId] = useState('');
  const [apiHash, setApiHash] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');

  const handleStartAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const response = await axios.post(`${API}/telegram/auth/start`, {
        api_id: parseInt(apiId),
        api_hash: apiHash,
        phone_number: phoneNumber
      });
      
      setUserId(response.data.user_id);
      setStep('code');
      toast.success(response.data.message);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to start authentication');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const response = await axios.post(`${API}/telegram/auth/verify`, {
        user_id: userId,
        code: code,
        password: password || undefined
      });
      
      if (response.data.requires_password) {
        setStep('password');
        toast.info(response.data.message);
      } else {
        toast.success('Authentication successful!');
        onLogin(response.data.user_id);
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to verify code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{
      backgroundImage: 'url(https://images.unsplash.com/photo-1760143769807-c282feb89d31?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2Nzh8MHwxfHNlYXJjaHw0fHxtaW5pbWFsaXN0JTIwYWJzdHJhY3QlMjBibHVlJTIwdGVjaG5vbG9neSUyMGJhY2tncm91bmR8ZW58MHx8fHwxNzY2NzI5MzI1fDA&ixlib=rb-4.1.0&q=85)',
      backgroundSize: 'cover',
      backgroundPosition: 'center'
    }}>
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" />
      
      <Card className="w-full max-w-md relative z-10 shadow-lg" data-testid="login-card">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center">
              <Send className="w-8 h-8 text-primary-foreground" />
            </div>
          </div>
          <CardTitle className="text-3xl font-heading font-bold text-center">
            Telegram Autoforwarder
          </CardTitle>
          <CardDescription className="text-center font-body">
            {step === 'credentials' && 'Enter your Telegram API credentials'}
            {step === 'code' && 'Enter the code sent to your Telegram'}
            {step === 'password' && 'Enter your 2FA password'}
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          {step === 'credentials' && (
            <form onSubmit={handleStartAuth} className="space-y-4" data-testid="credentials-form">
              <div className="space-y-2">
                <Label htmlFor="api_id" className="font-body font-medium">API ID</Label>
                <Input
                  id="api_id"
                  data-testid="api-id-input"
                  type="number"
                  placeholder="123456"
                  value={apiId}
                  onChange={(e) => setApiId(e.target.value)}
                  required
                  className="font-body"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="api_hash" className="font-body font-medium">API Hash</Label>
                <Input
                  id="api_hash"
                  data-testid="api-hash-input"
                  type="text"
                  placeholder="abc123def456..."
                  value={apiHash}
                  onChange={(e) => setApiHash(e.target.value)}
                  required
                  className="font-body"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="phone" className="font-body font-medium">Phone Number</Label>
                <Input
                  id="phone"
                  data-testid="phone-input"
                  type="tel"
                  placeholder="+1234567890"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  required
                  className="font-body"
                />
              </div>
              
              <Button
                type="submit"
                data-testid="submit-credentials-btn"
                className="w-full font-body font-medium"
                disabled={loading}
              >
                {loading ? 'Sending Code...' : 'Send Code'}
              </Button>
              
              <p className="text-xs text-muted-foreground text-center font-body">
                Get your API credentials from{' '}
                <a
                  href="https://my.telegram.org"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  my.telegram.org
                </a>
              </p>
            </form>
          )}
          
          {step === 'code' && (
            <form onSubmit={handleVerifyCode} className="space-y-4" data-testid="code-form">
              <div className="space-y-2">
                <Label htmlFor="code" className="font-body font-medium">Verification Code</Label>
                <Input
                  id="code"
                  data-testid="code-input"
                  type="text"
                  placeholder="12345"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  required
                  className="font-body font-mono text-center text-lg tracking-widest"
                  maxLength={5}
                />
              </div>
              
              <Button
                type="submit"
                data-testid="submit-code-btn"
                className="w-full font-body font-medium"
                disabled={loading}
              >
                {loading ? 'Verifying...' : 'Verify Code'}
              </Button>
            </form>
          )}
          
          {step === 'password' && (
            <form onSubmit={handleVerifyCode} className="space-y-4" data-testid="password-form">
              <div className="space-y-2">
                <Label htmlFor="password" className="font-body font-medium flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                  2FA Password
                </Label>
                <Input
                  id="password"
                  data-testid="password-input"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="font-body"
                />
              </div>
              
              <Button
                type="submit"
                data-testid="submit-password-btn"
                className="w-full font-body font-medium"
                disabled={loading}
              >
                {loading ? 'Verifying...' : 'Verify Password'}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default LoginPage;