
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { AddYouthDialog } from "@/components/youth/AddYouthDialog";

export const Header = () => {
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
          <Button 
            onClick={() => setIsAddYouthDialogOpen(true)}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            <PlusCircle size={16} className="mr-2" />
            Add New Youth
          </Button>
        </div>
      </header>
      
      {isAddYouthDialogOpen && (
        <AddYouthDialog onClose={handleAddYouthDialogClose} />
      )}
    </>
  );
};
