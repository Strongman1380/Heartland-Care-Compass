import React, { useEffect, useState } from 'react';
import { calculateMonthlyAverage, type DomainAverages } from '@/utils/shiftScores';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

interface MonthlyShiftAverageProps {
  youthId: string;
}

const ratingColor = (val: number) => {
  if (val >= 3.5) return 'text-green-600';
  if (val >= 3.0) return 'text-yellow-600';
  if (val >= 2.0) return 'text-orange-600';
  return 'text-red-600';
};

const ratingBgColor = (val: number) => {
  if (val >= 3.5) return 'bg-green-100 border-green-200';
  if (val >= 3.0) return 'bg-yellow-100 border-yellow-200';
  if (val >= 2.0) return 'bg-orange-100 border-orange-200';
  return 'bg-red-100 border-red-200';
};

export const MonthlyShiftAverage: React.FC<MonthlyShiftAverageProps> = ({ youthId }) => {
  const [averages, setAverages] = useState<DomainAverages | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchAverages = async () => {
      try {
        setLoading(true);
        setError(null);
        const today = new Date();
        const year = today.getFullYear();
        const month = today.getMonth() + 1; // 1-indexed
        const avg = await calculateMonthlyAverage(youthId, year, month);
        if (!cancelled) {
          setAverages(avg);
        }
      } catch (err) {
        console.error("Error fetching monthly averages:", err);
        if (!cancelled) {
          setError("Failed to load monthly averages.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchAverages();

    return () => {
      cancelled = true;
    };
  }, [youthId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4 text-muted-foreground">
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        Loading monthly averages...
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-4 text-sm text-red-600 p-2">
        {error}
      </div>
    );
  }

  if (!averages || averages.totalEntries === 0) {
    return null; // Don't show if no data
  }

  return (
    <div className="mt-4">
      <h4 className="text-sm font-semibold text-red-800 mb-2 uppercase tracking-wider">Current Month Shift Averages</h4>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
        <div className={`p-2 rounded-md border ${ratingBgColor(averages.peer)} flex flex-col items-center justify-center`}>
          <span className="text-xs font-medium text-gray-600 uppercase">Peer</span>
          <span className={`text-lg font-bold ${ratingColor(averages.peer)}`}>{averages.peer.toFixed(1)}</span>
        </div>
        <div className={`p-2 rounded-md border ${ratingBgColor(averages.adult)} flex flex-col items-center justify-center`}>
          <span className="text-xs font-medium text-gray-600 uppercase">Adult</span>
          <span className={`text-lg font-bold ${ratingColor(averages.adult)}`}>{averages.adult.toFixed(1)}</span>
        </div>
        <div className={`p-2 rounded-md border ${ratingBgColor(averages.investment)} flex flex-col items-center justify-center`}>
          <span className="text-xs font-medium text-gray-600 uppercase">Invest</span>
          <span className={`text-lg font-bold ${ratingColor(averages.investment)}`}>{averages.investment.toFixed(1)}</span>
        </div>
        <div className={`p-2 rounded-md border ${ratingBgColor(averages.authority)} flex flex-col items-center justify-center`}>
          <span className="text-xs font-medium text-gray-600 uppercase">Authority</span>
          <span className={`text-lg font-bold ${ratingColor(averages.authority)}`}>{averages.authority.toFixed(1)}</span>
        </div>
        <div className={`p-2 rounded-md border ${ratingBgColor(averages.overall)} flex flex-col items-center justify-center shadow-sm col-span-2 sm:col-span-1`}>
          <span className="text-xs font-bold text-gray-700 uppercase">Overall</span>
          <span className={`text-xl font-black ${ratingColor(averages.overall)}`}>{averages.overall.toFixed(1)}</span>
        </div>
      </div>
    </div>
  );
};
