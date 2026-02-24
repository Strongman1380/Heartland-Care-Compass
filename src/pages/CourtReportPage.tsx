import { useState, useEffect } from 'react';
import { CourtReport } from '@/components/reports/CourtReport';
import { Header } from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Gavel } from 'lucide-react';
import { Youth } from '@/types/app-types';
import { useYouth } from '@/hooks/useSupabase';

export const CourtReportPage = () => {
  const [selectedYouthId, setSelectedYouthId] = useState<string>('');
  const [selectedYouth, setSelectedYouth] = useState<Youth | null>(null);
  
  // Use Supabase hook for youth operations
  const { youths, loading, loadYouths } = useYouth();

  useEffect(() => {
    loadYouths();
  }, []);

  useEffect(() => {
    // Auto-select first youth if available and none selected
    if (youths.length > 0 && !selectedYouthId) {
      setSelectedYouthId(youths[0].id);
      // Convert Supabase Youth to local Youth type
      const supabaseYouth = youths[0];
      const localYouth: Youth = {
        ...supabaseYouth,
        dob: supabaseYouth.dob ? new Date(supabaseYouth.dob) : null,
        admissionDate: supabaseYouth.admissionDate ? new Date(supabaseYouth.admissionDate) : null,
        dischargeDate: supabaseYouth.dischargeDate ? new Date(supabaseYouth.dischargeDate) : null,
        hyrnaAssessmentDate: supabaseYouth.hyrnaAssessmentDate ? new Date(supabaseYouth.hyrnaAssessmentDate) : null,
        createdAt: supabaseYouth.createdAt ? new Date(supabaseYouth.createdAt) : new Date(),
        updatedAt: supabaseYouth.updatedAt ? new Date(supabaseYouth.updatedAt) : new Date(),
      } as unknown as Youth;
      setSelectedYouth(localYouth);
    }
  }, [youths, selectedYouthId]);

  const handleYouthChange = (youthId: string) => {
    setSelectedYouthId(youthId);
    const youth = youths.find(y => y.id === youthId);
    if (youth) {
      // Convert Supabase Youth to local Youth type
      const localYouth: Youth = {
        ...youth,
        dob: youth.dob ? new Date(youth.dob) : null,
        admissionDate: youth.admissionDate ? new Date(youth.admissionDate) : null,
        dischargeDate: youth.dischargeDate ? new Date(youth.dischargeDate) : null,
        hyrnaAssessmentDate: youth.hyrnaAssessmentDate ? new Date(youth.hyrnaAssessmentDate) : null,
        createdAt: youth.createdAt ? new Date(youth.createdAt) : new Date(),
        updatedAt: youth.updatedAt ? new Date(youth.updatedAt) : new Date(),
      } as unknown as Youth;
      setSelectedYouth(localYouth);
    } else {
      setSelectedYouth(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container mx-auto px-4 py-6 pb-24 lg:pb-8">
          <div className="text-center">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="container mx-auto px-4 py-6 pb-24 lg:pb-8">
        <div className="space-y-6">
          {/* Youth Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gavel className="h-5 w-5" />
                Court Report
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="max-w-md">
                <Label htmlFor="youth-select">Select Youth</Label>
                <Select value={selectedYouthId} onValueChange={handleYouthChange}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Choose a youth for the court report" />
                  </SelectTrigger>
                  <SelectContent>
                    {youths.map((youth) => (
                      <SelectItem key={youth.id} value={youth.id}>
                        {youth.firstName} {youth.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Report Component */}
          {selectedYouth ? (
            <CourtReport key={selectedYouth.id} youth={selectedYouth} />
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-gray-500">
                  {youths.length === 0 
                    ? "No youth profiles found. Please add youth profiles from the main dashboard to generate reports."
                    : "Please select a youth to generate their court report."
                  }
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};
