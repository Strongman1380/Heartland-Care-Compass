
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PlusCircle, User } from "lucide-react";
import { AddYouthDialog } from "@/components/youth/AddYouthDialog";
import { supabase } from "@/integrations/supabase/client";
import { mapYouthFromSupabase, type Youth } from "@/types/app-types";

interface YouthSelectorProps {
  onSelectYouth: (youthId: string) => void;
  selectedYouthId?: string;
}

export const YouthSelector = ({ onSelectYouth, selectedYouthId }: YouthSelectorProps) => {
  const [youths, setYouths] = useState<Youth[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddYouthDialogOpen, setIsAddYouthDialogOpen] = useState(false);

  const fetchYouths = async () => {
    try {
      setLoading(true);
      const { data: youthsData, error: youthsError } = await supabase
        .from("youths")
        .select("*")
        .order("firstname", { ascending: true });

      if (youthsError) {
        throw youthsError;
      }

      const mappedYouths = youthsData
        .map(mapYouthFromSupabase)
        .filter(youth => {
          const hasValidId = youth.id && 
                           typeof youth.id === 'string' && 
                           youth.id.trim() !== "" && 
                           youth.id.length > 0;
          
          const hasValidNames = youth.firstName && 
                               youth.lastName && 
                               typeof youth.firstName === 'string' &&
                               typeof youth.lastName === 'string' &&
                               youth.firstName.trim() !== "" && 
                               youth.lastName.trim() !== "";
          
          if (!hasValidId) {
            console.warn("Filtering out youth with invalid ID:", youth);
            return false;
          }
          
          if (!hasValidNames) {
            console.warn("Filtering out youth with invalid names:", youth);
            return false;
          }
          
          return true;
        });
        
      console.log("Fetched and validated youths:", mappedYouths);
      setYouths(mappedYouths);
    } catch (err) {
      console.error("Error fetching youths:", err);
      setError("Failed to load youth profiles");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchYouths();
  }, []);

  const handleYouthSelect = (youthId: string) => {
    console.log("Selected youth ID:", youthId);
    if (youthId && typeof youthId === 'string' && youthId.trim() !== "" && youthId.length > 0) {
      onSelectYouth(youthId);
    } else {
      console.warn("Invalid youth ID selected:", youthId);
    }
  };

  const handleAddYouthDialogClose = () => {
    setIsAddYouthDialogOpen(false);
    fetchYouths();
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
        <Button variant="outline" size="sm" className="mt-2" onClick={fetchYouths}>
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
