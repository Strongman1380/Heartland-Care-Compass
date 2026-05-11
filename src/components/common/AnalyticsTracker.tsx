import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { trackPageView } from '@/utils/analytics';

/**
 * Component that tracks page views on route changes.
 * Place this inside the BrowserRouter but outside the Routes.
 */
export const AnalyticsTracker = () => {
  const location = useLocation();

  useEffect(() => {
    // Small delay to ensure document.title is updated if handled by components
    const timeoutId = setTimeout(() => {
      trackPageView(location.pathname + location.search);
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [location]);

  return null; // This component doesn't render anything
};

export default AnalyticsTracker;
