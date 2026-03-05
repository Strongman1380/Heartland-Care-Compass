import { useEffect, useState } from "react";
import { alertsService } from "@/integrations/firebase/alertsService";

export const useUnresolvedAlertCount = (): number => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const unsubscribe = alertsService.subscribe((rows) => {
      setCount(rows.filter((r) => r.status === "open").length);
    });
    return () => unsubscribe();
  }, []);

  return count;
};
