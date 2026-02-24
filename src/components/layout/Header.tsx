
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PlusCircle, BarChart3, LogOut, LogIn, Calendar, Gavel, BookOpen } from "lucide-react";
import { AddYouthDialog } from "@/components/youth/AddYouthDialog";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

interface HeaderProps {
  // Remove admin-related props
}

export const Header = () => {
  const [isAddYouthDialogOpen, setIsAddYouthDialogOpen] = useState(false);
  const { toast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOutUser } = useAuth();

  // Navigation items configuration
  const navigationItems = [
    { path: '/progress-notes', label: 'Case Notes', icon: BookOpen },
    { path: '/monthly-progress', label: 'Monthly Progress', icon: Calendar },
    { path: '/court-report', label: 'Court Report', icon: Gavel },
  ];

  const isActiveRoute = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const handleAddYouthDialogClose = () => {
    setIsAddYouthDialogOpen(false);
  };

  const handleSignOut = async () => {
    await signOutUser();
    toast({ title: 'Signed out' });
    navigate('/auth');
  };

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b bg-white/90 backdrop-blur-xl supports-[backdrop-filter]:bg-white/80 shadow-sm transition-all duration-300">
        <div className="container mx-auto px-4 lg:px-6">
          <div className="flex h-16 items-center justify-between">
            {/* Logo and Brand */}
            <Link to="/" className="flex items-center space-x-2 group flex-shrink-0">
              <div className="relative">
                <img 
                  src={`${import.meta.env.BASE_URL}files/BoysHomeLogo.png`}
                  alt="Heartland Boys Home Logo" 
                  className="h-8 w-auto rounded-lg shadow-sm group-hover:shadow-md transition-shadow duration-200"
                />
              </div>
              <div className="flex flex-col">
                <h1 className="text-lg font-bold bg-gradient-to-r from-red-800 via-red-700 to-amber-600 bg-clip-text text-transparent">
                  Heartland Youth Compass
                </h1>
                <p className="text-xs text-muted-foreground hidden sm:block">Care Management System</p>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center justify-center flex-1 mx-6">
              <div className="flex items-center space-x-3">
                {navigationItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = isActiveRoute(item.path);

                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`
                        relative flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 group whitespace-nowrap
                        ${isActive
                          ? 'bg-red-50 text-red-700 shadow-sm'
                          : 'text-gray-600 hover:text-red-700 hover:bg-red-50'
                        }
                      `}
                    >
                      <Icon className="h-4 w-4" />
                      <span className="hidden xl:block">{item.label}</span>
                      <span className="xl:hidden">{item.label.split(' ')[0]}</span>
                      {isActive && (
                        <div className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-red-600" />
                      )}
                    </Link>
                  );
                })}
              </div>
            </nav>

            {/* Desktop Actions */}
            <div className="hidden lg:flex items-center space-x-1">
              {/* Auth Status */}
              {user ? (
                <Badge variant="outline" className="text-green-700 border-green-200 bg-green-50 text-xs">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1"></div>
                  Online
                </Badge>
              ) : (
                <Badge variant="outline" className="text-gray-600 border-gray-200 text-xs">
                  <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mr-1"></div>
                  Offline
                </Badge>
              )}

              {/* KPI Dashboard Link */}
              <Link to="/assessment-kpi">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-gray-600 hover:text-red-700 hover:bg-red-50 px-2 py-1 text-xs h-8"
                >
                  <BarChart3 className="h-3.5 w-3.5 mr-1" />
                  <span className="hidden xl:block">KPI</span>
                </Button>
              </Link>

              {/* Auth Button */}
              {!user ? (
                <Button
                  onClick={() => navigate('/auth')}
                  variant="ghost"
                  size="sm"
                  className="text-gray-600 hover:text-red-700 hover:bg-red-50 px-2 py-1 text-xs h-8"
                >
                  <LogIn className="h-3.5 w-3.5 mr-1" />
                  Sign In
                </Button>
              ) : (
                <Button
                  onClick={handleSignOut}
                  variant="ghost"
                  size="sm"
                  className="text-gray-600 hover:text-red-700 hover:bg-red-50 px-2 py-1 text-xs h-8"
                >
                  <LogOut className="h-3.5 w-3.5 mr-1" />
                  Sign Out
                </Button>
              )}

              {/* Primary CTA */}
              <Button 
                onClick={() => setIsAddYouthDialogOpen(true)}
                className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white shadow-sm hover:shadow-md transition-all duration-200 px-2 py-1 text-xs h-8"
                size="sm"
              >
                <PlusCircle className="h-3.5 w-3.5 mr-1" />
                <span className="hidden xl:block">Add Youth</span>
                <span className="xl:hidden">Add</span>
              </Button>
            </div>

            {/* Mobile Actions */}
            <div className="flex items-center gap-1 lg:hidden">
              {user && (
                <Button
                  onClick={() => setIsAddYouthDialogOpen(true)}
                  size="sm"
                  className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white min-w-[44px] min-h-[44px] px-2"
                >
                  <PlusCircle className="h-4 w-4" />
                </Button>
              )}
              {!user ? (
                <Button
                  onClick={() => navigate('/auth')}
                  variant="ghost"
                  size="sm"
                  className="min-w-[44px] min-h-[44px]"
                >
                  <LogIn className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  onClick={handleSignOut}
                  variant="ghost"
                  size="sm"
                  className="min-w-[44px] min-h-[44px]"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>

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
