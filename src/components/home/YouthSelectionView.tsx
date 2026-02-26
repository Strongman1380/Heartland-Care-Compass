
import { useState, useMemo, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Youth } from "@/integrations/firebase/services";
import { WelcomeSection } from "./WelcomeSection";
import { EmptyYouthState } from "./EmptyYouthState";
import { Edit, LogOut, ChevronRight, StickyNote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { QuickNoteDialog } from "@/components/notes/QuickNoteDialog";
import { Badge } from "@/components/ui/badge";
import { calculateResidentAwardsForYouths, type ResidentAwards } from "@/utils/residentAwards";

interface YouthSelectionViewProps {
  youths: Youth[];
  loading: boolean;
  onYouthSelect: (youth: Youth) => void;
  onEditYouth: (youth: Youth, event: React.MouseEvent) => void;
  onDischargeYouth: (youth: Youth, event: React.MouseEvent) => void;
  formatPoints: (points: number) => string;
  formatDate: (date: string | null) => string;
}

export const YouthSelectionView = ({
  youths,
  loading,
  onYouthSelect,
  onEditYouth,
  onDischargeYouth,
  formatPoints,
  formatDate
}: YouthSelectionViewProps) => {
  const [quickNoteYouth, setQuickNoteYouth] = useState<Youth | null>(null);
  const [awardData, setAwardData] = useState<ResidentAwards>({
    residentOfWeek: null,
    mostImprovedWeek: null,
    residentOfMonth: null,
  });
  const [loadingAwards, setLoadingAwards] = useState(false);

  // Sort youth alphabetically by last name, then first name
  const sortedYouths = useMemo(() => {
    return [...youths].sort((a, b) => {
      const lastNameCompare = a.lastName.localeCompare(b.lastName);
      if (lastNameCompare !== 0) return lastNameCompare;
      return a.firstName.localeCompare(b.firstName);
    });
  }, [youths]);

  useEffect(() => {
    if (!youths.length) {
      setAwardData({
        residentOfWeek: null,
        mostImprovedWeek: null,
        residentOfMonth: null,
      });
      return;
    }

    let cancelled = false;
    const loadAwards = async () => {
      try {
        setLoadingAwards(true);
        const calculated = await calculateResidentAwardsForYouths(youths);
        if (!cancelled) setAwardData(calculated);
      } catch (error) {
        console.error("Failed to calculate resident awards for dashboard cards:", error);
      } finally {
        if (!cancelled) setLoadingAwards(false);
      }
    };

    void loadAwards();
    return () => {
      cancelled = true;
    };
  }, [youths]);

  const parseTopColors = (rawResult: string | null | undefined) => {
    const raw = rawResult || "";
    if (!raw || typeof raw !== "string") return [];
    return raw
      .split(/[,/&|\s]+/)
      .map((value) => value.trim())
      .filter(Boolean)
      .map((value) => value.charAt(0).toUpperCase() + value.slice(1).toLowerCase())
      .filter((value, index, arr) => arr.indexOf(value) === index)
      .slice(0, 2);
  };

  const getYouthAwards = (youthId: string) => {
    const items: string[] = [];
    if (awardData.residentOfWeek?.youthId === youthId) items.push("Resident of the Week");
    if (awardData.mostImprovedWeek?.youthId === youthId) items.push("Most Improved (Week)");
    if (awardData.residentOfMonth?.youthId === youthId) items.push("Resident of the Month");
    return items;
  };

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
              <div className="divide-y divide-border">
                {sortedYouths.map((youth) => (
                  <div
                    key={youth.id}
                    className="flex items-center justify-between px-4 py-4 cursor-pointer transition-colors hover:bg-muted/50"
                    onClick={() => onYouthSelect(youth)}
                  >
                    <div className="flex items-center gap-4 flex-1">
                      {/* Avatar */}
                      <div className="flex-shrink-0">
                        <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-gradient-to-br from-red-500 to-yellow-500 flex items-center justify-center text-white font-semibold text-base sm:text-lg">
                          {youth.firstName.charAt(0)}{youth.lastName.charAt(0)}
                        </div>
                      </div>

                      {/* Youth Info */}
                      <div className="flex-1 min-w-0">
                        <h4 className="text-lg font-semibold text-foreground truncate">
                          {youth.lastName}, {youth.firstName}
                        </h4>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          {/* Age Badge */}
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-gray-100 text-gray-800 border border-gray-300">
                            Age: {youth.age || 'N/A'}
                          </span>

                          {/* Level Badge */}
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-secondary/20 text-primary border border-secondary/40">
                            Level {youth.level}
                          </span>

                          {/* Grade Badge (show from currentGrade or grade) */}
                          {(youth.currentGrade || youth.grade) && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-secondary/20 text-primary border border-secondary/40">
                              Grade {youth.currentGrade || youth.grade}
                            </span>
                          )}

                          {/* Admission Date Badge - hidden on mobile */}
                          {youth.admissionDate && (
                            <span className="hidden sm:inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-300">
                              Admitted: {formatDate(youth.admissionDate)}
                            </span>
                          )}

                          {/* Length of Stay Badge - hidden on mobile */}
                          {youth.admissionDate && (
                            <span className="hidden sm:inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-secondary/20 text-primary border border-secondary/40">
                              Stay: {calculateLengthOfStay(youth.admissionDate)}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          {parseTopColors(youth.realColorsResult).map((color) => (
                            <Badge key={`${youth.id}-color-${color}`} variant="secondary" className="bg-white border border-red-200 text-red-800">
                              {color}
                            </Badge>
                          ))}
                          {loadingAwards && (
                            <Badge variant="outline" className="bg-white/80 border-yellow-300 text-yellow-800">
                              Calculating awards...
                            </Badge>
                          )}
                          {!loadingAwards &&
                            getYouthAwards(youth.id).map((award) => (
                              <Badge key={`${youth.id}-award-${award}`} className="bg-yellow-500 hover:bg-yellow-500 text-black border border-yellow-600">
                                {award}
                              </Badge>
                            ))}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setQuickNoteYouth(youth);
                          }}
                          className="hover:bg-red-50"
                          title="Quick Note"
                        >
                          <StickyNote className="h-4 w-4 text-gray-400 hover:text-red-600" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => onEditYouth(youth, e)}
                          className="hidden sm:inline-flex hover:bg-secondary/20"
                        >
                          <Edit className="h-4 w-4 text-primary" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => onDischargeYouth(youth, e)}
                          className="hidden sm:inline-flex hover:bg-secondary/20"
                          title="Discharge Youth"
                        >
                          <LogOut className="h-4 w-4 text-primary" />
                        </Button>
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {quickNoteYouth && (
        <QuickNoteDialog
          open={!!quickNoteYouth}
          onOpenChange={(open) => { if (!open) setQuickNoteYouth(null); }}
          youthId={quickNoteYouth.id}
          youthName={`${quickNoteYouth.firstName} ${quickNoteYouth.lastName}`}
        />
      )}
    </>
  );
};
