
import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Youth } from "@/integrations/supabase/services";
import { WelcomeSection } from "./WelcomeSection";
import { EmptyYouthState } from "./EmptyYouthState";
import { Edit, Trash2, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface YouthSelectionViewProps {
  youths: Youth[];
  loading: boolean;
  onYouthSelect: (youth: Youth) => void;
  onEditYouth: (youth: Youth, event: React.MouseEvent) => void;
  onDeleteYouth: (youth: Youth, event: React.MouseEvent) => void;
  formatPoints: (points: number) => string;
  formatDate: (date: string | null) => string;
}

export const YouthSelectionView = ({
  youths,
  loading,
  onYouthSelect,
  onEditYouth,
  onDeleteYouth,
  formatPoints,
  formatDate
}: YouthSelectionViewProps) => {
  // Sort youth alphabetically by last name, then first name
  const sortedYouths = useMemo(() => {
    return [...youths].sort((a, b) => {
      const lastNameCompare = a.lastName.localeCompare(b.lastName);
      if (lastNameCompare !== 0) return lastNameCompare;
      return a.firstName.localeCompare(b.firstName);
    });
  }, [youths]);

  // Calculate length of stay
  const calculateLengthOfStay = (admissionDate: string | null): string => {
    if (!admissionDate) return "N/A";

    const admission = new Date(admissionDate);
    admission.setHours(0, 0, 0, 0);

    const now = new Date();
    now.setHours(0, 0, 0, 0);

    if (admission > now) {
      return "Not yet admitted";
    }

    let years = now.getFullYear() - admission.getFullYear();
    let months = now.getMonth() - admission.getMonth();
    let days = now.getDate() - admission.getDate();

    if (days < 0) {
      months -= 1;
      const prevMonth = new Date(now.getFullYear(), now.getMonth(), 0);
      days += prevMonth.getDate();
    }

    if (months < 0) {
      years -= 1;
      months += 12;
    }

    const parts = [];
    if (years > 0) parts.push(`${years}y`);
    if (months > 0) parts.push(`${months}m`);
    if (days > 0 || parts.length === 0) parts.push(`${days}d`);

    return parts.join(' ');
  };

  return (
    <>
      <WelcomeSection />

      {/* Youth Profiles List */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-red-800 mb-4 text-center">Youth Profiles</h2>

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
            <span className="ml-4 text-red-700">Loading youth profiles...</span>
          </div>
        ) : youths.length === 0 ? (
          <EmptyYouthState />
        ) : (
          <Card>
            <CardContent className="p-0">
              <div className="divide-y divide-gray-200">
                {sortedYouths.map((youth) => (
                  <div
                    key={youth.id}
                    className="flex items-center justify-between px-4 py-4 cursor-pointer transition-colors hover:bg-gray-50"
                    onClick={() => onYouthSelect(youth)}
                  >
                    <div className="flex items-center gap-4 flex-1">
                      {/* Avatar */}
                      <div className="flex-shrink-0">
                        <div className="h-12 w-12 rounded-full bg-gradient-to-br from-red-500 to-yellow-500 flex items-center justify-center text-white font-semibold text-lg">
                          {youth.firstName.charAt(0)}{youth.lastName.charAt(0)}
                        </div>
                      </div>

                      {/* Youth Info */}
                      <div className="flex-1 min-w-0">
                        <h4 className="text-lg font-semibold text-gray-900 truncate">
                          {youth.lastName}, {youth.firstName}
                        </h4>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          {/* Age Badge */}
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-gray-100 text-gray-800 border border-gray-300">
                            Age: {youth.age || 'N/A'}
                          </span>

                          {/* Level Badge */}
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-blue-100 text-blue-800 border border-blue-300">
                            Level {youth.level}
                          </span>

                          {/* Points Badge */}
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-green-100 text-green-800 border border-green-300">
                            {youth.pointTotal || 0} pts
                          </span>

                          {/* Grade Badge (show from currentGrade or grade) */}
                          {(youth.currentGrade || youth.grade) && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-purple-100 text-purple-800 border border-purple-300">
                              Grade {youth.currentGrade || youth.grade}
                            </span>
                          )}

                          {/* Admission Date Badge */}
                          {youth.admissionDate && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-300">
                              Admitted: {formatDate(youth.admissionDate)}
                            </span>
                          )}

                          {/* Length of Stay Badge */}
                          {youth.admissionDate && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-indigo-100 text-indigo-800 border border-indigo-300">
                              Stay: {calculateLengthOfStay(youth.admissionDate)}
                            </span>
                          )}

                          {/* School Badge (current or last attended) */}
                          {(youth.currentSchool || youth.lastSchoolAttended) && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-orange-100 text-orange-800 border border-orange-300">
                              {youth.currentSchool || youth.lastSchoolAttended}
                            </span>
                          )}

                          {/* Placement Status Badge */}
                          {youth.placementStatus && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-teal-100 text-teal-800 border border-teal-300">
                              {youth.placementStatus}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => onEditYouth(youth, e)}
                          className="hover:bg-blue-50"
                        >
                          <Edit className="h-4 w-4 text-blue-600" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => onDeleteYouth(youth, e)}
                          className="hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                        <ChevronRight className="h-5 w-5 text-gray-400 ml-2" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
};
