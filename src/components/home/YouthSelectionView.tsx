
import { Card } from "@/components/ui/card";
import { Youth } from "@/types/app-types";
import { WelcomeSection } from "./WelcomeSection";
import { YouthCard } from "./YouthCard";
import { EmptyYouthState } from "./EmptyYouthState";

interface YouthSelectionViewProps {
  youths: Youth[];
  loading: boolean;
  onYouthSelect: (youth: Youth) => void;
  onEditYouth: (youth: Youth, event: React.MouseEvent) => void;
  onDeleteYouth: (youth: Youth, event: React.MouseEvent) => void;
  formatPoints: (points: number) => string;
  formatDate: (date: Date | null) => string;
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
  return (
    <>
      <WelcomeSection />

      {/* Youth Profiles Grid */}
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {youths.map((youth) => (
              <YouthCard
                key={youth.id}
                youth={youth}
                onSelect={onYouthSelect}
                onEdit={onEditYouth}
                onDelete={onDeleteYouth}
                formatPoints={formatPoints}
                formatDate={formatDate}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
};
