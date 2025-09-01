
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { PlusCircle, Settings, Home, Calendar, BookOpen, LineChart, BellRing, Database, KeyRound, LogOut } from "lucide-react";
import { AddYouthDialog } from "@/components/youth/AddYouthDialog";
import { Link } from "react-router-dom";
import { apiClient } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface HeaderProps {
  showAdmin?: boolean;
  onAdminToggle?: () => void;
}

export const Header = ({ showAdmin = false, onAdminToggle }: HeaderProps) => {
  const [isAddYouthDialogOpen, setIsAddYouthDialogOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAuthDialogOpen, setIsAuthDialogOpen] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [hasToken, setHasToken] = useState<boolean>(() => !!localStorage.getItem('auth_token'));
  const [authLoading, setAuthLoading] = useState(false);
  const { toast } = useToast();

  const handleAddYouthDialogClose = () => {
    setIsAddYouthDialogOpen(false);
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  useEffect(() => {
    setHasToken(!!localStorage.getItem('auth_token'));
  }, []);

  const handleSignOut = () => {
    apiClient.clearToken();
    setHasToken(false);
    toast({ title: 'Signed out' });
  };

  const handleSignIn = async () => {
    try {
      setAuthLoading(true);
      const { token } = await apiClient.getAuthToken(apiKey.trim());
      apiClient.setToken(token);
      setHasToken(true);
      setIsAuthDialogOpen(false);
      setApiKey("");
      toast({ title: 'Signed in', description: 'API access enabled' });
    } catch (e) {
      toast({ title: 'Authentication failed', description: e instanceof Error ? e.message : 'Unknown error', variant: 'destructive' });
    } finally {
      setAuthLoading(false);
    }
  };

  return (
    <>
      <header className="bg-white shadow-sm border-b relative z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <Link to="/" aria-label="Home" className="flex items-center gap-3">
              <img 
                src="/files/BoysHomeLogo.png" 
                alt="Heartland Boys Home Logo" 
                className="h-10 w-auto rounded-sm"
              />
              <h1 className="text-2xl font-bold bg-gradient-to-r from-red-800 via-red-700 to-yellow-600 bg-clip-text text-transparent">
                Heartland Youth Compass
              </h1>
            </Link>
            
            {/* Mobile menu button */}
            <button 
              className="md:hidden focus:outline-none focus:ring-2 focus:ring-red-500 rounded-md p-2"
              onClick={toggleMobileMenu}
              aria-expanded={isMobileMenuOpen}
              aria-controls="mobile-menu"
              aria-label="Toggle navigation menu"
            >
              <svg 
                className="w-6 h-6 text-red-700" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                {isMobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>

            {/* Desktop navigation */}
            <nav className="hidden md:flex items-center gap-6">
              <Link to="/" className="text-red-700 hover:text-red-800 flex items-center gap-1 font-medium">
                <Home size={16} />
                <span>Home</span>
              </Link>
              <Link to="/daily-points" className="text-red-700 hover:text-red-800 flex items-center gap-1 font-medium">
                <Calendar size={16} />
                <span>Daily Points</span>
              </Link>
              <Link to="/progress-notes" className="text-red-700 hover:text-red-800 flex items-center gap-1 font-medium">
                <BookOpen size={16} />
                <span>Notes</span>
              </Link>
              <Link to="/reports" className="text-red-700 hover:text-red-800 flex items-center gap-1 font-medium">
                <LineChart size={16} />
                <span>Reports</span>
              </Link>
              <Link to="/alerts" className="text-red-700 hover:text-red-800 flex items-center gap-1 font-medium">
                <BellRing size={16} />
                <span>Alerts</span>
              </Link>
              <Link to="/migration" className="text-blue-700 hover:text-blue-800 flex items-center gap-1 font-medium">
                <Database size={16} />
                <span>Migration</span>
              </Link>
              
              <div className="flex items-center gap-4 ml-4">
                {!hasToken ? (
                  <Button
                    onClick={() => setIsAuthDialogOpen(true)}
                    variant="outline"
                    className="border-red-300 text-red-700 hover:bg-red-50 flex items-center gap-2"
                  >
                    <KeyRound className="h-4 w-4" />
                    <span>Sign In</span>
                  </Button>
                ) : (
                  <Button
                    onClick={handleSignOut}
                    variant="outline"
                    className="border-green-300 text-green-700 hover:bg-green-50 flex items-center gap-2"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Sign Out</span>
                  </Button>
                )}
                {onAdminToggle && (
                  <Button
                    onClick={onAdminToggle}
                    variant={showAdmin ? "default" : "outline"}
                    className={`flex items-center gap-2 ${
                      showAdmin 
                        ? "bg-red-600 hover:bg-red-700 text-white" 
                        : "border-red-300 text-red-700 hover:bg-red-50"
                    }`}
                    aria-pressed={showAdmin}
                  >
                    <Settings className="h-4 w-4" />
                    <span>Admin</span>
                  </Button>
                )}
                <Button 
                  onClick={() => setIsAddYouthDialogOpen(true)}
                  className="bg-red-600 hover:bg-red-700 text-white"
                  aria-label="Add new youth profile"
                >
                  <PlusCircle size={16} className="mr-2" />
                  Add New Youth
                </Button>
              </div>
            </nav>
          </div>
        </div>
        
        {/* Mobile navigation menu */}
        {isMobileMenuOpen && (
          <nav id="mobile-menu" className="md:hidden bg-white border-t">
            <div className="container mx-auto px-4 py-2 space-y-2">
              <Link to="/" className="block py-2 px-4 text-red-700 hover:bg-red-50 rounded">
                <span className="flex items-center gap-2">
                  <Home size={16} />
                  Home
                </span>
              </Link>
              <Link to="/daily-points" className="block py-2 px-4 text-red-700 hover:bg-red-50 rounded">
                <span className="flex items-center gap-2">
                  <Calendar size={16} />
                  Daily Points
                </span>
              </Link>
              <Link to="/progress-notes" className="block py-2 px-4 text-red-700 hover:bg-red-50 rounded">
                <span className="flex items-center gap-2">
                  <BookOpen size={16} />
                  Notes
                </span>
              </Link>
              <Link to="/reports" className="block py-2 px-4 text-red-700 hover:bg-red-50 rounded">
                <span className="flex items-center gap-2">
                  <LineChart size={16} />
                  Reports
                </span>
              </Link>
              <Link to="/alerts" className="block py-2 px-4 text-red-700 hover:bg-red-50 rounded">
                <span className="flex items-center gap-2">
                  <BellRing size={16} />
                  Alerts
                </span>
              </Link>
              <Link to="/migration" className="block py-2 px-4 text-blue-700 hover:bg-blue-50 rounded">
                <span className="flex items-center gap-2">
                  <Database size={16} />
                  Migration
                </span>
              </Link>
              <div className="flex flex-col gap-2 py-2">
                {onAdminToggle && (
                  <Button
                    onClick={onAdminToggle}
                    variant={showAdmin ? "default" : "outline"}
                    className={`w-full flex items-center justify-center gap-2 ${
                      showAdmin 
                        ? "bg-red-600 hover:bg-red-700 text-white" 
                        : "border-red-300 text-red-700 hover:bg-red-50"
                    }`}
                    aria-pressed={showAdmin}
                  >
                    <Settings className="h-4 w-4" />
                    Admin Mode
                  </Button>
                )}
                <Button 
                  onClick={() => {
                    setIsAddYouthDialogOpen(true);
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full bg-red-600 hover:bg-red-700 text-white"
                >
                  <PlusCircle size={16} className="mr-2" />
                  Add New Youth
                </Button>
              </div>
            </div>
          </nav>
        )}
      </header>
      
      {isAddYouthDialogOpen && (
        <AddYouthDialog 
          onClose={handleAddYouthDialogClose} 
          onSuccess={() => {
            handleAddYouthDialogClose();
            window.location.reload();
          }}
        />
      )}

      <Dialog open={isAuthDialogOpen} onOpenChange={setIsAuthDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sign in for API Access</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-gray-600">Enter the Admin API key to obtain a session token for protected endpoints.</p>
            <Input
              type="password"
              placeholder="Admin API Key"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAuthDialogOpen(false)} disabled={authLoading}>Cancel</Button>
            <Button onClick={handleSignIn} disabled={!apiKey.trim() || authLoading}>
              {authLoading ? 'Signing in...' : 'Sign In'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
