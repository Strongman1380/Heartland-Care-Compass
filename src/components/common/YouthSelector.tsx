
import { useState, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { AddYouthDialog } from "@/components/youth/AddYouthDialog";
import { supabase } from "@/integrations/supabase/client";
import { mapYouthFromSupabase, type Youth } from "@/types/app-types";

interface YouthSelectorProps {
  onSelectYouth: (youthId: string) => void;
}

export const YouthSelector = ({ onSelectYouth }: YouthSelectorProps) => {
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

      // Map and filter out youths with invalid data more strictly
      const mappedYouths = youthsData
        .map(mapYouthFromSupabase)
        .filter(youth => {
          // Strict validation to ensure all required fields are valid
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
    // Additional validation to ensure we don't pass empty strings
    if (youthId && typeof youthId === 'string' && youthId.trim() !== "" && youthId.length > 0) {
      onSelectYouth(youthId);
    } else {
      console.warn("Invalid youth ID selected:", youthId);
    }
  };

  const handleAddYouthDialogClose = () => {
    setIsAddYouthDialogOpen(false);
    // Refresh the list after adding a new youth
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
    <div className="flex flex-col md:flex-row gap-3 items-center">
      <div className="relative w-full md:w-96">
        <Select onValueChange={handleYouthSelect}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select a youth..." />
          </SelectTrigger>
          <SelectContent>
            {youths.length === 0 ? (
              <div className="p-2 text-gray-500 text-center">No youth profiles found</div>
            ) : (
              youths.map((youth) => {
                // Triple check before rendering SelectItem to prevent the error
                if (!youth.id || 
                    typeof youth.id !== 'string' || 
                    youth.id.trim() === "" || 
                    youth.id.length === 0 ||
                    !youth.firstName || 
                    !youth.lastName || 
                    typeof youth.firstName !== 'string' ||
                    typeof youth.lastName !== 'string' ||
                    youth.firstName.trim() === "" || 
                    youth.lastName.trim() === "") {
                  
                  console.error("Skipping invalid youth data in SelectItem render:", youth);
                  return null;
                }
                
                return (
                  <SelectItem key={youth.id} value={youth.id}>
                    {youth.firstName} {youth.lastName} - Level {youth.level}
                  </SelectItem>
                );
              }).filter(Boolean) // Remove any null entries
            )}
          </SelectContent>
        </Select>
      </div>
      
      <Button 
        onClick={() => setIsAddYouthDialogOpen(true)} 
        variant="outline" 
        className="whitespace-nowrap"
      >
        <PlusCircle size={16} className="mr-2" /> Add New Youth
      </Button>
      
      {isAddYouthDialogOpen && (
        <AddYouthDialog onClose={handleAddYouthDialogClose} />
      )}
    </div>
  );
};
