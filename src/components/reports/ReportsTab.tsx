import { useState } from "react";
import { Youth } from "@/types/app-types";
import { MonthlyProgressReport } from "./MonthlyProgressReport";

interface ReportsTabProps {
  youth: Youth;
}

export const ReportsTab = ({ youth }: ReportsTabProps) => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Monthly Progress Report</h2>
        <p className="text-gray-600 mb-4">Generate monthly progress reports for {youth.firstName} {youth.lastName}</p>
      </div>

      <MonthlyProgressReport youth={youth} />
    </div>
  );
};