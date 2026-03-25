
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { LogIn } from 'lucide-react';
import { useGsapReveal } from '@/hooks/useGsap';

const Auth = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { user, signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const rawRedirect = (location.state as { from?: string | { pathname?: string } } | null)?.from;
  const redirectPath = typeof rawRedirect === 'string' ? rawRedirect : rawRedirect?.pathname || '/';
  // Prevent open-redirect: only allow same-origin relative paths
  const redirectTo = (redirectPath.startsWith('/') && !redirectPath.startsWith('//') && !/^\/[a-zA-Z]+:/.test(redirectPath)) ? redirectPath : '/';

  useEffect(() => {
    if (user) {
      navigate(redirectTo, { replace: true });
    }
  }, [navigate, user, redirectTo]);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError('');
    const { error } = await signInWithGoogle();
    if (error) {
      setError(error.message);
      toast({
        title: 'Google sign-in failed',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Success',
        description: 'Signed in with Google!',
      });
      navigate(redirectTo);
    }
    setLoading(false);
  };

  const revealRef = useGsapReveal({ direction: "down", duration: 1 });

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4" ref={revealRef}>
      <Card className="gsap-reveal interactive-card w-full max-w-md border-0 p-1">
        <CardHeader className="text-center pb-2">
          <CardTitle className="text-3xl font-black tracking-tight bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent mb-1">
            Heartland Youth Compass
          </CardTitle>
          <CardDescription>
            {loading ? 'Signing in...' : 'Sign in with your approved Google account.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button
            type="button"
            variant="default"
            size="lg"
            className="w-full h-14 text-lg font-bold"
            onClick={handleGoogleSignIn}
            disabled={loading}
          >
            <LogIn className="mr-3 h-6 w-6" />
            {loading ? 'Signing in...' : 'Sign in with Google'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
