
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PlusCircle, User } from "lucide-react";
import { AddYouthDialog } from "@/components/youth/AddYouthDialog";
import { useYouth } from "@/hooks/useSupabase";
import { type Youth } from "@/integrations/supabase/services";
import { useToast } from "@/hooks/use-toast";

interface YouthSelectorProps {
  onSelectYouth: (youthId: string) => void;
  selectedYouthId?: string;
}

export const YouthSelector = ({ onSelectYouth, selectedYouthId }: YouthSelectorProps) => {
  const [isAddYouthDialogOpen, setIsAddYouthDialogOpen] = useState(false);
  const { toast } = useToast();
  
  // Use Supabase hook for youth operations
  const { youths, loading, error, loadYouths } = useYouth();

  useEffect(() => {
    loadYouths();
  }, []);

  // Handle youth selection
  const handleYouthSelect = (youthId: string) => {
    onSelectYouth(youthId);
  };

  const handleAddYouthDialogClose = () => {
    setIsAddYouthDialogOpen(false);
    loadYouths();
  };

  if (loading) {
    return (
      <div className="mb-4 p-2 border rounded bg-blue-50 animate-pulse">
        <div className="h-10 bg-slate-200 rounded"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mb-4 p-4 border border-red-300 rounded bg-red-50 text-red-700">
        <p>{error}</p>
        <Button variant="outline" size="sm" className="mt-2" onClick={loadYouths}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Select a Youth</h3>
        <Button 
          onClick={() => setIsAddYouthDialogOpen(true)} 
          variant="outline" 
          size="sm"
          className="whitespace-nowrap"
        >
          <PlusCircle size={16} className="mr-2" /> Add New Youth
        </Button>
      </div>

      {youths.length === 0 ? (
        <Card className="border-dashed border-2">
          <CardContent className="flex flex-col items-center justify-center p-6">
            <User className="h-12 w-12 text-gray-400 mb-4" />
            <p className="text-gray-500 text-center">No youth profiles found</p>
            <p className="text-sm text-gray-400 text-center mt-2">
              Click "Add New Youth" to create the first profile
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {youths.map((youth) => (
            <Card 
              key={youth.id} 
              className={`cursor-pointer transition-all hover:shadow-md ${
                selectedYouthId === youth.id 
                  ? 'ring-2 ring-blue-500 bg-blue-50' 
                  : 'hover:bg-gray-50'
              }`}
              onClick={() => handleYouthSelect(youth.id)}
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  {youth.firstName} {youth.lastName}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-xs text-gray-500">Level {youth.level}</p>
                <p className="text-xs text-gray-500">{youth.pointTotal || 0} points</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      
      {isAddYouthDialogOpen && (
        <AddYouthDialog onClose={handleAddYouthDialogClose} />
      )}
    </div>
  );
};
