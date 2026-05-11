import { logEvent } from 'firebase/analytics';
import { analytics } from '@/lib/firebase';
import { logger } from './logger';

/**
 * Log a custom event to Google Analytics
 * @param eventName Name of the event
 * @param eventParams Optional parameters for the event
 */
export const trackEvent = (eventName: string, eventParams?: Record<string, any>) => {
  if (analytics) {
    try {
      logEvent(analytics, eventName, eventParams);
      logger.debug(`[Analytics] Tracked event: ${eventName}`, eventParams);
    } catch (error) {
      logger.error(`[Analytics] Error tracking event ${eventName}:`, error);
    }
  }
};

/**
 * Log a page view to Google Analytics
 * @param pagePath The path of the page
 * @param pageTitle The title of the page
 */
export const trackPageView = (pagePath: string, pageTitle?: string) => {
  if (analytics) {
    try {
      logEvent(analytics, 'page_view', {
        page_path: pagePath,
        page_title: pageTitle || document.title,
      });
      logger.debug(`[Analytics] Tracked page view: ${pagePath}`);
    } catch (error) {
      logger.error(`[Analytics] Error tracking page view ${pagePath}:`, error);
    }
  }
};

/**
 * Predefined event names for consistency
 */
export const AnalyticsEvents = {
  REPORT_GENERATED: 'report_generated',
  PDF_EXPORT: 'pdf_export',
  DOCX_EXPORT: 'docx_export',
  YOUTH_PROFILE_VIEW: 'youth_profile_view',
  LOGIN: 'login',
  SIGN_UP: 'sign_up',
  SEARCH: 'search',
  AI_QUERY: 'ai_query',
  DATA_MIGRATION: 'data_migration',
};
