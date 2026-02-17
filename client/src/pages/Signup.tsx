import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { signupApi } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

const Signup = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const login = useAuthStore((s) => s.login);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!name || !email || !password) { setError('All fields are required'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
    setLoading(true);
    try {
      const { user, token } = await signupApi(name, email, password);
      login(user, token);
      navigate('/dashboard');
    } catch {
      setError('Signup failed. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full lg:grid lg:min-h-screen lg:grid-cols-2">
      <div className="flex items-center justify-center py-12">
        <div className="mx-auto grid w-[350px] gap-6">
          <div className="grid gap-2 text-center">
            <h1 className="text-3xl font-bold font-heading">Create account</h1>
            <p className="text-balance text-muted-foreground">
              Enter your information to create an account
            </p>
          </div>
          <Card className="border-0 shadow-none sm:border sm:shadow-lg">
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-4 pt-6">
                {error && <p className="text-sm text-destructive bg-destructive/10 p-2 rounded-lg">{error}</p>}
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input id="name" placeholder="Jane Doe" value={name} onChange={(e) => setName(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" placeholder="m@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Creating account...' : 'Create Account'}
                </Button>
              </CardContent>
            </form>
          </Card>
          <div className="mt-4 text-center text-sm">
            Already have an account?{" "}
            <Link to="/login" className="underline text-primary">
              Sign in
            </Link>
          </div>
        </div>
      </div>
      <div className="hidden bg-muted lg:block relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-background/20" />
        <div className="absolute inset-0 flex items-center justify-center">
          <img src="/logo.png" alt="Lumora" className="h-[400px] object-contain drop-shadow-2xl animate-fade-in" />
        </div>
      </div>
    </div>
  );
};

export default Signup;
