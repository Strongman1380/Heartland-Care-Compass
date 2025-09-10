
import { useState, useEffect } from "react";
import { Header } from "@/components/layout/Header";
import { ReportCenter } from "@/components/reports/ReportCenter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Youth } from "@/types/app-types";
import { fetchAllYouths } from "@/utils/local-storage-utils";
import { getYouth } from "@/lib/api";

const Reports = () => {
  const [allYouth, setAllYouth] = useState<Youth[]>([]);
  const [selectedYouthId, setSelectedYouthId] = useState<string>("");
  const [selectedYouth, setSelectedYouth] = useState<Youth | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadYouth = async () => {
      try {
        // If we have a token, try API first; otherwise use local storage
        const hasToken = !!localStorage.getItem('auth_token');
        if (hasToken) {
          const youthData = await getYouth();
          setAllYouth(youthData);
        } else {
          const localYouth = fetchAllYouths();
          setAllYouth(localYouth);
        }
      } catch (error) {
        console.error('Error fetching youth:', error);
        // Fallback to localStorage
        const localYouth = fetchAllYouths();
        setAllYouth(localYouth);
      } finally {
        setLoading(false);
      }
    };

    loadYouth();
  }, []);

  useEffect(() => {
    if (selectedYouthId) {
      const youth = allYouth.find(y => y.id === selectedYouthId);
      setSelectedYouth(youth || null);
    } else {
      setSelectedYouth(null);
    }
  }, [selectedYouthId, allYouth]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-yellow-50 to-red-100">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-red-800 via-red-700 to-yellow-600 bg-clip-text text-transparent mb-4">
            Reports Center
          </h1>
          <p className="text-red-700 text-lg">Generate comprehensive reports and documentation</p>
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
                      {allYouth.map((youth) => (
                        <SelectItem key={youth.id} value={youth.id}>
                          {youth.firstName} {youth.lastName} - Level {youth.level}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {selectedYouth ? (
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
