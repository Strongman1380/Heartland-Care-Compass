
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { User, Edit, Trash2 } from "lucide-react";
import { Youth } from "@/integrations/supabase/services";

interface YouthCardProps {
  youth: Youth;
  onSelect: (youth: Youth) => void;
  onEdit: (youth: Youth, event: React.MouseEvent) => void;
  onDelete: (youth: Youth, event: React.MouseEvent) => void;
  formatPoints: (points: number) => string;
  formatDate: (date: string | null) => string;
}

export const YouthCard = ({ 
  youth, 
  onSelect, 
  onEdit, 
  onDelete, 
  formatPoints, 
  formatDate 
}: YouthCardProps) => {
  const resolveStoredAge = () => {
    if (typeof youth.age === 'number' && youth.age > 0) return youth.age;
    if (typeof youth.age === 'string') {
      const parsed = parseInt(youth.age, 10);
      if (!Number.isNaN(parsed) && parsed > 0) return parsed;
    }
    return 'N/A';
  };

  const calculateAge = (dob?: string | null) => {
    if (!dob) return resolveStoredAge();
    const birth = new Date(dob);
    if (Number.isNaN(birth.getTime())) return resolveStoredAge();
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    if (age < 0 || Number.isNaN(age)) return resolveStoredAge();
    return age;
  };

  const displayAge = calculateAge(youth.dob as any);

  // Calculate length of stay
  const calculateLengthOfStay = (admissionDate: string | null): string => {
    if (!admissionDate) return "N/A";
    
    const admission = new Date(admissionDate);
    admission.setHours(0, 0, 0, 0);
    
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    
    // Check if admission date is in the future
    if (admission > now) {
      return "Not yet admitted";
    }
    
    // Calculate years, months, and days
    let years = now.getFullYear() - admission.getFullYear();
    let months = now.getMonth() - admission.getMonth();
    let days = now.getDate() - admission.getDate();
    
    // Adjust for negative days
    if (days < 0) {
      months -= 1;
      const prevMonth = new Date(now.getFullYear(), now.getMonth(), 0);
      days += prevMonth.getDate();
    }
    
    // Adjust for negative months
    if (months < 0) {
      years -= 1;
      months += 12;
    }
    
    // Build the length of stay string
    const parts = [];
    if (years > 0) {
      parts.push(`${years}y`);
    }
    if (months > 0) {
      parts.push(`${months}m`);
    }
    if (days > 0 || parts.length === 0) {
      parts.push(`${days}d`);
    }
    
    return parts.join(' ');
  };

  const lengthOfStay = calculateLengthOfStay(youth.admissionDate);

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
            <span className="font-medium">{displayAge}</span>
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
          <div className="flex justify-between">
            <span className="text-gray-600">Length of Stay:</span>
            <span className="font-medium text-blue-600">{lengthOfStay}</span>
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
