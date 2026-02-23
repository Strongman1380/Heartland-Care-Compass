
import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PlusCircle, User, ChevronRight } from "lucide-react";
import { AddYouthDialog } from "@/components/youth/AddYouthDialog";
import { useYouth } from "@/hooks/useSupabase";
import { type Youth } from "@/integrations/firebase/services";
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

  // Sort youth alphabetically by last name, then first name
  const sortedYouths = useMemo(() => {
    return [...youths].sort((a, b) => {
      const lastNameCompare = a.lastName.localeCompare(b.lastName);
      if (lastNameCompare !== 0) return lastNameCompare;
      return a.firstName.localeCompare(b.firstName);
    });
  }, [youths]);

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
        <Card>
          <CardContent className="p-0">
            <div className="divide-y divide-gray-200">
              {sortedYouths.map((youth) => (
                <div
                  key={youth.id}
                  className={`flex items-center justify-between px-4 py-3 cursor-pointer transition-colors hover:bg-gray-50 ${
                    selectedYouthId === youth.id
                      ? 'bg-blue-50 border-l-4 border-blue-500'
                      : ''
                  }`}
                  onClick={() => handleYouthSelect(youth.id)}
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className="flex-shrink-0">
                      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-red-500 to-yellow-500 flex items-center justify-center text-white font-semibold">
                        {youth.firstName.charAt(0)}{youth.lastName.charAt(0)}
                      </div>
                    </div>
                    <div className="flex-1">
                      <h4 className="text-base font-semibold text-gray-900">
                        {youth.lastName}, {youth.firstName}
                      </h4>
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        {/* Age Badge */}
                        {youth.age && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 border border-gray-300">
                            Age: {youth.age}
                          </span>
                        )}

                        {/* Level Badge */}
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 border border-blue-300">
                          Level {youth.level}
                        </span>

                        {/* Points Badge */}
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 border border-green-300">
                          {youth.pointTotal || 0} pts
                        </span>

                        {/* Grade Badge (supports currentGrade or grade) */}
                        {(youth.currentGrade || (youth as any).grade) && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800 border border-purple-300">
                            Grade {youth.currentGrade || (youth as any).grade}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-400 flex-shrink-0" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
      
      {isAddYouthDialogOpen && (
        <AddYouthDialog onClose={handleAddYouthDialogClose} />
      )}
    </div>
  );
};
