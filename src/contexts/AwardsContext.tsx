import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import { calculateResidentAwardsForYouths, type AwardsDateRange, type ResidentAwards } from '@/utils/residentAwards';
import { useYouth } from '@/hooks/useSupabase';

interface AwardsContextValue {
  awards: ResidentAwards | null;
  loading: boolean;
  refresh: () => void;
  dateRange: AwardsDateRange | null;
  setDateRange: (range: AwardsDateRange | null) => void;
}

const AwardsContext = createContext<AwardsContextValue | undefined>(undefined);

export const AwardsProvider = ({ children }: { children: ReactNode }) => {
  const { youths, loadYouths } = useYouth();
  const [awards, setAwards] = useState<ResidentAwards | null>(null);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState<AwardsDateRange | null>(null);

  useEffect(() => {
    loadYouths();
  }, []);

  const calculate = useCallback((currentYouths: typeof youths, range: AwardsDateRange | null) => {
    if (currentYouths.length === 0) {
      setAwards(null);
      return () => {};
    }
    let cancelled = false;
    setLoading(true);
    calculateResidentAwardsForYouths(currentYouths, range ?? undefined)
      .then(result => { if (!cancelled) setAwards(result); })
      .catch(err => console.error('AwardsContext: failed to calculate awards:', err))
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const cancel = calculate(youths, dateRange);
    return cancel;
  }, [youths, dateRange, calculate]);

  const refresh = useCallback(() => {
    calculate(youths, dateRange);
  }, [youths, dateRange, calculate]);

  return (
    <AwardsContext.Provider value={{ awards, loading, refresh, dateRange, setDateRange }}>
      {children}
    </AwardsContext.Provider>
  );
};

export const useAwards = (): AwardsContextValue => {
  const context = useContext(AwardsContext);
  if (!context) {
    throw new Error('useAwards must be used within an AwardsProvider');
  }
  return context;
};
