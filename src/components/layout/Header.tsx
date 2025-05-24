
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { 
  Calendar, 
  FileText, 
  User, 
  BarChart, 
  CheckSquare, 
  AlertTriangle,
  Plus
} from "lucide-react";
import { AddYouthDialog } from "@/components/youth/AddYouthDialog";
import { useNavigate, useLocation } from "react-router-dom";

export const Header = () => {
  const [isAddYouthOpen, setIsAddYouthOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleNavigation = (path: string) => {
    navigate(path);
  };

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <header className="heartland-header shadow-lg">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3 cursor-pointer" onClick={() => handleNavigation("/")}>
              <img 
                src="/lovable-uploads/983078ec-ca85-495c-8d9a-65acb6523081.png" 
                alt="Heartland Boys Home Logo" 
                className="w-12 h-12 rounded-full bg-white p-1"
              />
              <div>
                <h1 className="text-xl font-bold text-yellow-300 hidden sm:block">Heartland Boys Home</h1>
                <p className="text-yellow-200 text-sm hidden sm:block">Youth Management Platform</p>
              </div>
            </div>
          </div>
          
          <div className="hidden md:flex items-center space-x-3">
            <Button 
              variant="ghost" 
              className={`flex items-center space-x-1 text-yellow-100 hover:bg-red-900/30 hover:text-yellow-200 ${
                isActive("/profiles") ? "bg-red-900/30 text-yellow-200" : ""
              }`}
              onClick={() => handleNavigation("/profiles")}
            >
              <User size={16} />
              <span>Profiles</span>
            </Button>
            <Button 
              variant="ghost" 
              className={`flex items-center space-x-1 text-yellow-100 hover:bg-red-900/30 hover:text-yellow-200 ${
                isActive("/daily-points") ? "bg-red-900/30 text-yellow-200" : ""
              }`}
              onClick={() => handleNavigation("/daily-points")}
            >
              <CheckSquare size={16} />
              <span>Daily Points</span>
            </Button>
            <Button 
              variant="ghost" 
              className={`flex items-center space-x-1 text-yellow-100 hover:bg-red-900/30 hover:text-yellow-200 ${
                isActive("/progress-notes") ? "bg-red-900/30 text-yellow-200" : ""
              }`}
              onClick={() => handleNavigation("/progress-notes")}
            >
              <FileText size={16} />
              <span>Progress Notes</span>
            </Button>
            <Button 
              variant="ghost" 
              className={`flex items-center space-x-1 text-yellow-100 hover:bg-red-900/30 hover:text-yellow-200 ${
                isActive("/dashboard") ? "bg-red-900/30 text-yellow-200" : ""
              }`}
              onClick={() => handleNavigation("/dashboard")}
            >
              <BarChart size={16} />
              <span>Dashboard</span>
            </Button>
            <Button 
              variant="ghost" 
              className={`flex items-center space-x-1 text-yellow-100 hover:bg-red-900/30 hover:text-yellow-200 ${
                isActive("/alerts") ? "bg-red-900/30 text-yellow-200" : ""
              }`}
              onClick={() => handleNavigation("/alerts")}
            >
              <AlertTriangle size={16} />
              <span>Alerts</span>
              <span className="bg-yellow-500 text-red-900 text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">3</span>
            </Button>
            <Button 
              variant="ghost" 
              className={`flex items-center space-x-1 text-yellow-100 hover:bg-red-900/30 hover:text-yellow-200 ${
                isActive("/reports") ? "bg-red-900/30 text-yellow-200" : ""
              }`}
              onClick={() => handleNavigation("/reports")}
            >
              <Calendar size={16} />
              <span>Reports</span>
            </Button>
          </div>
          
          <Button 
            onClick={() => setIsAddYouthOpen(true)} 
            className="flex items-center space-x-1 bg-yellow-500 hover:bg-yellow-400 text-red-900 font-semibold border-2 border-yellow-400"
          >
            <Plus size={16} />
            <span>Add Youth</span>
          </Button>
        </div>
      </div>
      
      {isAddYouthOpen && <AddYouthDialog onClose={() => setIsAddYouthOpen(false)} />}
    </header>
  );
};
