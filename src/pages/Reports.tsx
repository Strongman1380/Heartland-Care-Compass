
import { useState, useEffect } from "react";
import { Header } from "@/components/layout/Header";
import { ReportCenter } from "@/components/reports/ReportCenter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useYouth } from "@/hooks/useSupabase";
import { type Youth } from "@/integrations/firebase/services";

const Reports = () => {
  const [selectedYouthId, setSelectedYouthId] = useState<string>("");
  const [selectedYouth, setSelectedYouth] = useState<Youth | null>(null);
  
  // Use Supabase hook for youth operations
  const { youths, loading, loadYouths } = useYouth();

  useEffect(() => {
    loadYouths();
  }, []);

  useEffect(() => {
    if (selectedYouthId) {
      const youth = youths.find(y => y.id === selectedYouthId);
      setSelectedYouth(youth || null);
    } else {
      setSelectedYouth(null);
    }
  }, [selectedYouthId, youths]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-yellow-50 to-red-100">
      <Header />
      <main className="container mx-auto px-4 py-6 pb-24 lg:pb-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-red-800 via-red-700 to-yellow-600 bg-clip-text text-transparent mb-4">
            Reports Center
          </h1>
          <p className="text-red-700 text-base sm:text-lg">Generate comprehensive reports and documentation</p>
        </div>
        
        {loading ? (
          <div className="text-center py-8">
            <p className="text-gray-600">Loading youth data...</p>
          </div>
        ) : (
          <>
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Select Youth</CardTitle>
                <CardDescription>Choose a youth to generate reports for</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="max-w-md">
                  <Label htmlFor="youth-select">Youth</Label>
                  <Select value={selectedYouthId} onValueChange={setSelectedYouthId}>
                    <SelectTrigger id="youth-select">
                      <SelectValue placeholder="Select a youth..." />
                    </SelectTrigger>
                    <SelectContent>
                      {youths.length > 0 ? (
                        youths.map((youth) => (
                          <SelectItem key={youth.id} value={youth.id}>
                            {youth.firstName} {youth.lastName} - Level {youth.level}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="no-youth" disabled>
                          No youth profiles available
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {youths.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <p className="text-gray-600">No youth profiles available.</p>
                  <p className="text-sm text-gray-500 mt-2">
                    Add youth profiles from the main dashboard to generate reports.
                  </p>
                </CardContent>
              </Card>
            ) : selectedYouth ? (
              <ReportCenter youthId={selectedYouthId} youth={selectedYouth} />
            ) : (
              <Card>
                <CardContent className="text-center py-8">
                  <p className="text-gray-600">Please select a youth to generate reports.</p>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default Reports;
