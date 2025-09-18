
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PlusCircle, BarChart3, Home, Users, LineChart, LogOut, Menu, X, LogIn } from "lucide-react";
import { AddYouthDialog } from "@/components/youth/AddYouthDialog";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

interface HeaderProps {
  // Remove admin-related props
}

export const Header = () => {
  const [isAddYouthDialogOpen, setIsAddYouthDialogOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { toast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOutUser } = useAuth();

  // Navigation items configuration
  const navigationItems = [
    { path: '/', label: 'Dashboard', icon: Home },
    { path: '/reports', label: 'Reports', icon: LineChart },
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

  const handleSignOut = async () => {
    await signOutUser();
    toast({ title: 'Signed out' });
    navigate('/auth');
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
            <nav className="hidden lg:flex items-center justify-center flex-1 max-w-2xl mx-8">
              <div className="flex items-center justify-between w-full space-x-6">
                {navigationItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = isActiveRoute(item.path);
                  
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`
                        relative flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex-1 justify-center
                        ${isActive 
                          ? 'bg-red-50 text-red-700 shadow-sm'
                          : 'text-gray-600 hover:text-red-700 hover:bg-red-50'
                        }
                      `}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{item.label}</span>
                      {isActive && (
                        <div className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-red-600" />
                      )}
                    </Link>
                  );
                })}
              </div>
            </nav>

            {/* Desktop Actions */}
            <div className="hidden lg:flex items-center space-x-3">
              {/* Auth Status */}
              <div className="flex items-center space-x-2">
                {user ? (
                  <Badge variant="outline" className="text-green-700 border-green-200 bg-green-50">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-1.5"></div>
                    Signed In
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-gray-600 border-gray-200">
                    <div className="w-2 h-2 bg-gray-400 rounded-full mr-1.5"></div>
                    Signed Out
                  </Badge>
                )}
              </div>

              {/* Auth Button */}
              {!user ? (
                <Button
                  onClick={() => navigate('/auth')}
                  variant="ghost"
                  size="sm"
                  className="text-gray-600 hover:text-red-700 hover:bg-red-50"
                >
                  <LogIn className="h-4 w-4 mr-2" />
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

              {/* KPI Dashboard Link */}
              <Link to="/assessment-kpi">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-gray-600 hover:text-red-700 hover:bg-red-50"
                >
                  <BarChart3 className="h-4 w-4 mr-2" />
                  KPI Dashboard
                </Button>
              </Link>

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
                  
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`
                        flex items-center space-x-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors
                        ${isActive 
                          ? 'bg-red-50 text-red-700'
                          : 'text-gray-600 hover:bg-gray-50'
                        }
                      `}
                    >
                      <Icon className="h-5 w-5" />
                      <span>{item.label}</span>
                      {isActive && (
                        <div className="w-2 h-2 rounded-full ml-auto bg-red-600" />
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
                  {user ? (
                    <Badge variant="outline" className="text-green-700 border-green-200 bg-green-50">
                      <div className="w-2 h-2 bg-green-500 rounded-full mr-1.5"></div>
                      Signed In
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-gray-600 border-gray-200">
                      <div className="w-2 h-2 bg-gray-400 rounded-full mr-1.5"></div>
                      Signed Out
                    </Badge>
                  )}
                </div>

                {/* Mobile Action Buttons */}
                <div className="grid grid-cols-1 gap-2">
                  {!user ? (
                    <Button
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        navigate('/auth');
                      }}
                      variant="outline"
                      className="justify-start"
                    >
                      <LogIn className="h-4 w-4 mr-2" />
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

                  <Link to="/assessment-kpi">
                    <Button
                      onClick={() => setIsMobileMenuOpen(false)}
                      variant="outline"
                      className="justify-start w-full"
                    >
                      <BarChart3 className="h-4 w-4 mr-2" />
                      KPI Dashboard
                    </Button>
                  </Link>

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

    </>
  );
};
