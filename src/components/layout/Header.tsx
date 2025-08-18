
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { PlusCircle, Settings, Home, Calendar, BookOpen, LineChart, BellRing } from "lucide-react";
import { AddYouthDialog } from "@/components/youth/AddYouthDialog";
import { Link } from "react-router-dom";

interface HeaderProps {
  showAdmin?: boolean;
  onAdminToggle?: () => void;
}

export const Header = ({ showAdmin = false, onAdminToggle }: HeaderProps) => {
  const [isAddYouthDialogOpen, setIsAddYouthDialogOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleAddYouthDialogClose = () => {
    setIsAddYouthDialogOpen(false);
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  return (
    <>
      <header className="bg-white shadow-sm border-b relative z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <Link to="/" aria-label="Home">
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
              
              <div className="flex items-center gap-4 ml-4">
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
    </>
  );
};
