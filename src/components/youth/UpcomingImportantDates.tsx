import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Clock } from "lucide-react";
import { Youth } from "@/integrations/firebase/types";
import { format, isAfter, isBefore, addDays } from "date-fns";

interface UpcomingImportantDatesProps {
  youth: Youth | null | undefined;
}

export const UpcomingImportantDates = ({ youth }: UpcomingImportantDatesProps) => {
  const [dates, setDates] = useState<{ title: string; date: Date; type: string }[]>([]);

  useEffect(() => {
    const extractDates = () => {
      const upcomingDates: { title: string; date: Date; type: string }[] = [];
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Helper to add date if it's in the future
      const addIfUpcoming = (dateStr: string | null | undefined, title: string, type: string, isBirthday: boolean = false) => {
        if (!dateStr) return;
        try {
          // Use local-midnight parsing to avoid UTC offset shifting the date
          const date = new Date(`${dateStr.split('T')[0]}T00:00:00`);
          if (isNaN(date.getTime())) return;
          
          if (isBirthday) {
            // For birthdays, we want the next occurrence
            const nextBirthday = new Date(today.getFullYear(), date.getMonth(), date.getDate());
            if (isBefore(nextBirthday, today)) {
              nextBirthday.setFullYear(today.getFullYear() + 1);
            }
            upcomingDates.push({ title, date: nextBirthday, type });
          } else if (isAfter(date, today) || date.getTime() === today.getTime()) {
            upcomingDates.push({ title, date, type });
          }
        } catch (e) {
          // Ignore invalid dates
        }
      };

      // Check various date fields in the youth object
      addIfUpcoming(youth.dob, "Birthday", "Personal", true);
      addIfUpcoming(youth.dischargeDate, "Expected Discharge", "Administrative");
      addIfUpcoming(youth.hyrnaAssessmentDate, "HYRNA Assessment", "Assessment");
      addIfUpcoming(youth.restrictionStartDate, "Restriction Start", "Behavioral");
      addIfUpcoming(youth.subsystemStartDate, "Subsystem Start", "Behavioral");
      
      // Sort by date ascending
      upcomingDates.sort((a, b) => a.date.getTime() - b.date.getTime());
      
      // Take top 3
      setDates(upcomingDates.slice(0, 3));
    };

    if (youth) {
      extractDates();
    }
  }, [youth]);

  if (dates.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Upcoming Dates
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500 italic">No upcoming important dates found.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-purple-100 bg-purple-50/30">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-purple-800 flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          Upcoming Dates
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {dates.map((item, idx) => {
            const isSoon = isBefore(item.date, addDays(new Date(), 7));
            
            return (
              <div key={idx} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Clock className={`h-4 w-4 ${isSoon ? 'text-orange-500' : 'text-purple-500'}`} />
                  <span className="font-medium text-gray-800">{item.title}</span>
                </div>
                <div className="flex flex-col items-end">
                  <span className={`font-medium ${isSoon ? 'text-orange-600' : 'text-gray-600'}`}>
                    {format(item.date, 'MMM d, yyyy')}
                  </span>
                  <span className="text-[10px] uppercase tracking-wider text-gray-500">
                    {item.type}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
