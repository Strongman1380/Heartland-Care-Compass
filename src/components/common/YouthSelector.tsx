
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

      const mappedYouths = youthsData
        .map(mapYouthFromSupabase)
        // Filter out any youths that don't have an id
        .filter(youth => youth.id && youth.id.trim() !== "");
        
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
    onSelectYouth(youthId);
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
              youths.map((youth) => (
                // Only render SelectItem if youth has a valid id
                youth.id ? (
                  <SelectItem key={youth.id} value={youth.id}>
                    {youth.firstName} {youth.lastName} - Level {youth.level}
                  </SelectItem>
                ) : null
              ))
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
