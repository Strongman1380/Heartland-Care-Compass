
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

export const Header = () => {
  const [isAddYouthOpen, setIsAddYouthOpen] = useState(false);

  return (
    <header className="heartland-header shadow-lg">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3">
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
            <Button variant="ghost" className="flex items-center space-x-1 text-yellow-100 hover:bg-red-900/30 hover:text-yellow-200">
              <User size={16} />
              <span>Profiles</span>
            </Button>
            <Button variant="ghost" className="flex items-center space-x-1 text-yellow-100 hover:bg-red-900/30 hover:text-yellow-200">
              <CheckSquare size={16} />
              <span>Daily Points</span>
            </Button>
            <Button variant="ghost" className="flex items-center space-x-1 text-yellow-100 hover:bg-red-900/30 hover:text-yellow-200">
              <FileText size={16} />
              <span>Progress Notes</span>
            </Button>
            <Button variant="ghost" className="flex items-center space-x-1 text-yellow-100 hover:bg-red-900/30 hover:text-yellow-200">
              <BarChart size={16} />
              <span>Dashboard</span>
            </Button>
            <Button variant="ghost" className="flex items-center space-x-1 text-yellow-100 hover:bg-red-900/30 hover:text-yellow-200">
              <AlertTriangle size={16} />
              <span>Alerts</span>
              <span className="bg-yellow-500 text-red-900 text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">3</span>
            </Button>
            <Button variant="ghost" className="flex items-center space-x-1 text-yellow-100 hover:bg-red-900/30 hover:text-yellow-200">
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
