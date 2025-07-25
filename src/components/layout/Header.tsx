
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { PlusCircle, Settings } from "lucide-react";
import { AddYouthDialog } from "@/components/youth/AddYouthDialog";

interface HeaderProps {
  showAdmin?: boolean;
  onAdminToggle?: () => void;
}

export const Header = ({ showAdmin = false, onAdminToggle }: HeaderProps) => {
  const [isAddYouthDialogOpen, setIsAddYouthDialogOpen] = useState(false);

  const handleAddYouthDialogClose = () => {
    setIsAddYouthDialogOpen(false);
    // Trigger a page refresh to show the new youth
    window.location.reload();
  };

  return (
    <>
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-red-800 via-red-700 to-yellow-600 bg-clip-text text-transparent">
            Heartland Youth Compass
          </h1>
          <div className="flex items-center gap-4">
            {onAdminToggle && (
              <Button
                onClick={onAdminToggle}
                variant={showAdmin ? "default" : "outline"}
                className={`flex items-center gap-2 ${
                  showAdmin 
                    ? "bg-red-600 hover:bg-red-700 text-white" 
                    : "border-red-300 text-red-700 hover:bg-red-50"
                }`}
              >
                <Settings className="h-4 w-4" />
                Admin
              </Button>
            )}
            <Button 
              onClick={() => setIsAddYouthDialogOpen(true)}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              <PlusCircle size={16} className="mr-2" />
              Add New Youth
            </Button>
          </div>
        </div>
      </header>
      
      {isAddYouthDialogOpen && (
        <AddYouthDialog onClose={handleAddYouthDialogClose} />
      )}
    </>
  );
};
