
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { User, Edit, Trash2 } from "lucide-react";
import { Youth } from "@/types/app-types";

interface YouthCardProps {
  youth: Youth;
  onSelect: (youth: Youth) => void;
  onEdit: (youth: Youth, event: React.MouseEvent) => void;
  onDelete: (youth: Youth, event: React.MouseEvent) => void;
  formatPoints: (points: number) => string;
  formatDate: (date: Date | null) => string;
}

export const YouthCard = ({ 
  youth, 
  onSelect, 
  onEdit, 
  onDelete, 
  formatPoints, 
  formatDate 
}: YouthCardProps) => {
  return (
    <Card 
      className="border-2 border-yellow-300 hover:shadow-lg transition-all duration-200 cursor-pointer hover:scale-105 relative group"
      onClick={() => onSelect(youth)}
    >
      <CardHeader className="text-center pb-3">
        <div className="w-16 h-16 bg-gradient-to-br from-red-100 to-yellow-100 rounded-full flex items-center justify-center mx-auto mb-3">
          <User className="h-8 w-8 text-red-600" />
        </div>
        <CardTitle className="text-lg text-red-800">
          {youth.firstName} {youth.lastName}
        </CardTitle>
        
        {/* Action buttons - positioned absolutely in top right */}
        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 bg-white/80 hover:bg-yellow-100 border border-yellow-300"
            onClick={(e) => onEdit(youth, e)}
            title={`Edit ${youth.firstName}'s Profile`}
          >
            <Edit className="h-4 w-4 text-amber-600" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 bg-white/80 hover:bg-red-100 border border-red-300"
            onClick={(e) => onDelete(youth, e)}
            title={`Delete ${youth.firstName}'s Profile`}
          >
            <Trash2 className="h-4 w-4 text-red-600" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Age:</span>
            <span className="font-medium">{youth.age || "N/A"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Level:</span>
            <span className="font-medium">Level {youth.level}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Points:</span>
            <span className="font-medium">{formatPoints(youth.pointTotal || 0)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Admission:</span>
            <span className="font-medium">{formatDate(youth.admissionDate)}</span>
          </div>
        </div>
        <Button 
          className="w-full mt-4 bg-red-600 hover:bg-red-700 text-white"
          onClick={(e) => {
            e.stopPropagation();
            onSelect(youth);
          }}
        >
          View Profile
        </Button>
      </CardContent>
    </Card>
  );
};
