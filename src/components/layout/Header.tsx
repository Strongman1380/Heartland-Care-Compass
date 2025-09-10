
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { PlusCircle, Settings, Home, Calendar, BookOpen, LineChart, BellRing, Database, KeyRound, LogOut, Menu, X, ChevronDown } from "lucide-react";
import { AddYouthDialog } from "@/components/youth/AddYouthDialog";
import { Link, useLocation } from "react-router-dom";
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
  const location = useLocation();

  // Navigation items configuration
  const navigationItems = [
    { path: '/', label: 'Dashboard', icon: Home },
    { path: '/daily-points', label: 'Daily Points', icon: Calendar },
    { path: '/progress-notes', label: 'Progress Notes', icon: BookOpen },
    { path: '/reports', label: 'Reports', icon: LineChart },
    { path: '/alerts', label: 'Alerts', icon: BellRing },
    { path: '/migration', label: 'Migration', icon: Database, variant: 'secondary' as const },
  ];

  const isActiveRoute = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

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
      <header className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <div className="container mx-auto px-4 lg:px-6">
          <div className="flex h-16 items-center justify-between">
            {/* Logo and Brand */}
            <Link to="/" className="flex items-center space-x-3 group">
              <div className="relative">
                <img 
                  src={`${import.meta.env.BASE_URL}files/BoysHomeLogo.png`}
                  alt="Heartland Boys Home Logo" 
                  className="h-9 w-auto rounded-lg shadow-sm group-hover:shadow-md transition-shadow duration-200"
                />
              </div>
              <div className="flex flex-col">
                <h1 className="text-xl font-bold bg-gradient-to-r from-red-800 via-red-700 to-amber-600 bg-clip-text text-transparent">
                  Heartland Youth Compass
                </h1>
                <p className="text-xs text-muted-foreground hidden sm:block">Care Management System</p>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center space-x-1">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                const isActive = isActiveRoute(item.path);
                const isSecondary = item.variant === 'secondary';
                
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`
                      relative flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200
                      ${isActive 
                        ? isSecondary 
                          ? 'bg-blue-50 text-blue-700 shadow-sm' 
                          : 'bg-red-50 text-red-700 shadow-sm'
                        : isSecondary
                          ? 'text-blue-600 hover:text-blue-700 hover:bg-blue-50'
                          : 'text-gray-600 hover:text-red-700 hover:bg-red-50'
                      }
                    `}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                    {isActive && (
                      <div className={`absolute inset-x-0 bottom-0 h-0.5 rounded-full ${
                        isSecondary ? 'bg-blue-600' : 'bg-red-600'
                      }`} />
                    )}
                  </Link>
                );
              })}
            </nav>

            {/* Desktop Actions */}
            <div className="hidden lg:flex items-center space-x-3">
              {/* Auth Status */}
              <div className="flex items-center space-x-2">
                {hasToken ? (
                  <Badge variant="outline" className="text-green-700 border-green-200 bg-green-50">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-1.5"></div>
                    Connected
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-gray-600 border-gray-200">
                    <div className="w-2 h-2 bg-gray-400 rounded-full mr-1.5"></div>
                    Offline
                  </Badge>
                )}
              </div>

              {/* Auth Button */}
              {!hasToken ? (
                <Button
                  onClick={() => setIsAuthDialogOpen(true)}
                  variant="ghost"
                  size="sm"
                  className="text-gray-600 hover:text-red-700 hover:bg-red-50"
                >
                  <KeyRound className="h-4 w-4 mr-2" />
                  Sign In
                </Button>
              ) : (
                <Button
                  onClick={handleSignOut}
                  variant="ghost"
                  size="sm"
                  className="text-gray-600 hover:text-red-700 hover:bg-red-50"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </Button>
              )}

              {/* Admin Toggle */}
              {onAdminToggle && (
                <Button
                  onClick={onAdminToggle}
                  variant={showAdmin ? "default" : "ghost"}
                  size="sm"
                  className={showAdmin 
                    ? "bg-red-600 hover:bg-red-700 text-white shadow-sm" 
                    : "text-gray-600 hover:text-red-700 hover:bg-red-50"
                  }
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Admin
                  {showAdmin && <Badge className="ml-2 bg-red-500 text-white text-xs">ON</Badge>}
                </Button>
              )}

              {/* Primary CTA */}
              <Button 
                onClick={() => setIsAddYouthDialogOpen(true)}
                className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white shadow-sm hover:shadow-md transition-all duration-200"
                size="sm"
              >
                <PlusCircle className="h-4 w-4 mr-2" />
                Add Youth
              </Button>
            </div>

            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden"
              onClick={toggleMobileMenu}
              aria-expanded={isMobileMenuOpen}
              aria-controls="mobile-menu"
            >
              {isMobileMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
              <span className="sr-only">Toggle navigation menu</span>
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <div className="lg:hidden border-t bg-white/95 backdrop-blur">
            <div className="container mx-auto px-4 py-4">
              <nav className="space-y-2">
                {navigationItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = isActiveRoute(item.path);
                  const isSecondary = item.variant === 'secondary';
                  
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`
                        flex items-center space-x-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors
                        ${isActive 
                          ? isSecondary 
                            ? 'bg-blue-50 text-blue-700' 
                            : 'bg-red-50 text-red-700'
                          : isSecondary
                            ? 'text-blue-600 hover:bg-blue-50'
                            : 'text-gray-600 hover:bg-gray-50'
                        }
                      `}
                    >
                      <Icon className="h-5 w-5" />
                      <span>{item.label}</span>
                      {isActive && (
                        <div className={`w-2 h-2 rounded-full ml-auto ${
                          isSecondary ? 'bg-blue-600' : 'bg-red-600'
                        }`} />
                      )}
                    </Link>
                  );
                })}
              </nav>

              {/* Mobile Actions */}
              <div className="mt-6 pt-4 border-t space-y-3">
                {/* Auth Status */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Connection Status</span>
                  {hasToken ? (
                    <Badge variant="outline" className="text-green-700 border-green-200 bg-green-50">
                      <div className="w-2 h-2 bg-green-500 rounded-full mr-1.5"></div>
                      Connected
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-gray-600 border-gray-200">
                      <div className="w-2 h-2 bg-gray-400 rounded-full mr-1.5"></div>
                      Offline
                    </Badge>
                  )}
                </div>

                {/* Mobile Action Buttons */}
                <div className="grid grid-cols-1 gap-2">
                  {!hasToken ? (
                    <Button
                      onClick={() => {
                        setIsAuthDialogOpen(true);
                        setIsMobileMenuOpen(false);
                      }}
                      variant="outline"
                      className="justify-start"
                    >
                      <KeyRound className="h-4 w-4 mr-2" />
                      Sign In
                    </Button>
                  ) : (
                    <Button
                      onClick={() => {
                        handleSignOut();
                        setIsMobileMenuOpen(false);
                      }}
                      variant="outline"
                      className="justify-start"
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      Sign Out
                    </Button>
                  )}

                  {onAdminToggle && (
                    <Button
                      onClick={() => {
                        onAdminToggle();
                        setIsMobileMenuOpen(false);
                      }}
                      variant={showAdmin ? "default" : "outline"}
                      className={`justify-start ${showAdmin 
                        ? "bg-red-600 hover:bg-red-700 text-white" 
                        : ""
                      }`}
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      Admin Mode
                      {showAdmin && <Badge className="ml-auto bg-red-500 text-white text-xs">ON</Badge>}
                    </Button>
                  )}

                  <Button 
                    onClick={() => {
                      setIsAddYouthDialogOpen(true);
                      setIsMobileMenuOpen(false);
                    }}
                    className="justify-start bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white"
                  >
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Add New Youth
                  </Button>
                </div>
              </div>
            </div>
          </div>
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
