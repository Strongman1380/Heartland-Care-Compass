import { useState } from "react";
import { Youth } from "@/types/app-types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProgressEvaluationReport } from "./ProgressEvaluationReport";
import { MonthlyProgressReport } from "./MonthlyProgressReport";
import { CourtReport } from "./CourtReport";

interface ReportsTabProps {
  youth: Youth;
}

export const ReportsTab = ({ youth }: ReportsTabProps) => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Reports</h2>
        <p className="text-gray-600 mb-4">Generate and print various reports for {youth.firstName} {youth.lastName}</p>
      </div>

      <Tabs defaultValue="weekly" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="weekly">Weekly Progress</TabsTrigger>
          <TabsTrigger value="monthly">Monthly Progress</TabsTrigger>
          <TabsTrigger value="court">Court Report</TabsTrigger>
        </TabsList>

        <TabsContent value="weekly">
          <ProgressEvaluationReport youth={youth} />
        </TabsContent>

        <TabsContent value="monthly">
          <MonthlyProgressReport youth={youth} />
        </TabsContent>

        <TabsContent value="court">
          <CourtReport youth={youth} />
        </TabsContent>
      </Tabs>
    </div>
  );
};