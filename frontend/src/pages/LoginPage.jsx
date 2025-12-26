import React, { useState } from 'react';
import { toast } from 'sonner';
import { Send, Loader2 } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/card';

function LoginPage({ backendUrl, onLogin }) {
  const [step, setStep] = useState('credentials'); // 'credentials', 'code', '2fa'
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    apiId: '',
    apiHash: '',
    phoneNumber: '',
    code: '',
    password: '',
  });
  const [tempUserId, setTempUserId] = useState(null);

  const handleCredentialsSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(`${backendUrl}/api/telegram/auth/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_id: parseInt(formData.apiId),
          api_hash: formData.apiHash,
          phone_number: formData.phoneNumber,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Failed to start authentication');
      }

      setTempUserId(data.user_id);
      setStep('code');
      toast.success('Verification code sent to your phone!');
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCodeSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(`${backendUrl}/api/telegram/auth/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: tempUserId,
          code: formData.code,
          password: formData.password || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Failed to verify code');
      }

      if (data.requires_password) {
        setStep('2fa');
        toast.info('2FA is enabled. Please enter your password.');
        return;
      }

      toast.success('Successfully authenticated!');
      onLogin(data.user_id);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        backgroundImage: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        backgroundSize: 'cover',
      }}
    >
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" />
      
      <Card className="w-full max-w-md relative z-10 shadow-lg">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center">
              <Send className="w-8 h-8 text-primary-foreground" />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold">Telegram Autoforwarder</CardTitle>
          <CardDescription>
            {step === 'credentials' && 'Enter your Telegram API credentials'}
            {step === 'code' && 'Enter the verification code sent to your phone'}
            {step === '2fa' && 'Enter your 2FA password'}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {step === 'credentials' && (
            <form onSubmit={handleCredentialsSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="apiId">API ID</Label>
                <Input
                  id="apiId"
                  type="number"
                  placeholder="123456"
                  value={formData.apiId}
                  onChange={(e) => setFormData({ ...formData, apiId: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="apiHash">API Hash</Label>
                <Input
                  id="apiHash"
                  type="text"
                  placeholder="abc123def456..."
                  value={formData.apiHash}
                  onChange={(e) => setFormData({ ...formData, apiHash: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phoneNumber">Phone Number</Label>
                <Input
                  id="phoneNumber"
                  type="tel"
                  placeholder="+1234567890"
                  value={formData.phoneNumber}
                  onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                  required
                />
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending...</>
                ) : (
                  'Send Code'
                )}
              </Button>

              <p className="text-xs text-muted-foreground text-center">
                Get your API credentials from{' '}
                <a
                  href="https://my.telegram.org/"
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
            <form onSubmit={handleCodeSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="code">Verification Code</Label>
                <Input
                  id="code"
                  type="text"
                  placeholder="12345"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  required
                  autoFocus
                />
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verifying...</>
                ) : (
                  'Verify Code'
                )}
              </Button>

              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => setStep('credentials')}
              >
                Back
              </Button>
            </form>
          )}

          {step === '2fa' && (
            <form onSubmit={handleCodeSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">2FA Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Your 2FA password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                  autoFocus
                />
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verifying...</>
                ) : (
                  'Submit'
                )}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default LoginPage;