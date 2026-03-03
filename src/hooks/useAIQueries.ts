/**
 * React Query wrappers for the most-called AI service functions.
 * Caches results for 5 minutes so navigating away and back doesn't re-hit the AI API.
 */

import { useQuery } from '@tanstack/react-query';
import {
  getYouthInsights,
  analyzeBehaviorTrends,
  assessRisk,
} from '@/services/aiService';

const STALE_TIME = 5 * 60 * 1000; // 5 minutes

// ---------------------------------------------------------------------------
// Youth Insights
// ---------------------------------------------------------------------------

export function useYouthInsights(
  youthId: string | undefined,
  analysisType?: string
) {
  return useQuery({
    queryKey: ['ai', 'youth-insights', youthId, analysisType ?? null],
    queryFn: () => getYouthInsights(youthId!, analysisType),
    enabled: !!youthId,
    staleTime: STALE_TIME,
    retry: false, // AI already retries internally via makeAIRequest
  });
}

// ---------------------------------------------------------------------------
// Behavior Trends
// ---------------------------------------------------------------------------

export function useBehaviorTrends(
  youthId: string | undefined,
  behaviorData: any[],
  timeframe?: number
) {
  return useQuery({
    queryKey: ['ai', 'behavior-trends', youthId, timeframe ?? null],
    queryFn: () => analyzeBehaviorTrends(youthId!, behaviorData, timeframe),
    enabled: !!youthId && behaviorData.length > 0,
    staleTime: STALE_TIME,
    retry: false,
  });
}

// ---------------------------------------------------------------------------
// Risk Assessment
// ---------------------------------------------------------------------------

export function useRiskAssessment(
  youthId: string | undefined,
  assessmentData: any | undefined,
  historicalData?: any
) {
  return useQuery({
    queryKey: ['ai', 'risk-assessment', youthId, assessmentData ?? null],
    queryFn: () => assessRisk(youthId!, assessmentData, historicalData),
    enabled: !!youthId && !!assessmentData,
    staleTime: STALE_TIME,
    retry: false,
  });
}
