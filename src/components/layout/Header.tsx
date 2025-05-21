
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
    <header className="bg-white shadow-sm">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-blue-600 rounded-md flex items-center justify-center">
              <span className="text-white font-bold">HBH</span>
            </div>
            <h1 className="text-xl font-semibold text-blue-800 hidden sm:block">Heartland Boys Home</h1>
          </div>
          
          <div className="hidden md:flex items-center space-x-4">
            <Button variant="ghost" className="flex items-center space-x-1">
              <User size={16} />
              <span>Profiles</span>
            </Button>
            <Button variant="ghost" className="flex items-center space-x-1">
              <CheckSquare size={16} />
              <span>Daily Points</span>
            </Button>
            <Button variant="ghost" className="flex items-center space-x-1">
              <FileText size={16} />
              <span>Progress Notes</span>
            </Button>
            <Button variant="ghost" className="flex items-center space-x-1">
              <BarChart size={16} />
              <span>Dashboard</span>
            </Button>
            <Button variant="ghost" className="flex items-center space-x-1">
              <AlertTriangle size={16} />
              <span>Alerts</span>
              <span className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">3</span>
            </Button>
            <Button variant="ghost" className="flex items-center space-x-1">
              <Calendar size={16} />
              <span>Reports</span>
            </Button>
          </div>
          
          <Button onClick={() => setIsAddYouthOpen(true)} className="flex items-center space-x-1 bg-blue-600 hover:bg-blue-700">
            <Plus size={16} />
            <span>Add Youth</span>
          </Button>
        </div>
      </div>
      
      {isAddYouthOpen && <AddYouthDialog onClose={() => setIsAddYouthOpen(false)} />}
    </header>
  );
};
