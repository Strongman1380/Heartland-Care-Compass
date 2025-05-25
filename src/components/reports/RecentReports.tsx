
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Calendar } from "lucide-react";

export const RecentReports = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Reports</CardTitle>
        <CardDescription>Previously generated reports</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="text-center py-8 text-gray-500">
            <p>No previously generated reports</p>
          </div>
          
          {/* Example report entries (hidden initially) */}
          <div className="border rounded-md p-3 hidden">
            <div className="flex justify-between items-start">
              <div>
                <h4 className="font-medium">Progress Report</h4>
                <div className="text-sm text-gray-500 flex items-center mt-1">
                  <Calendar size={14} className="mr-1" />
                  <span>Generated May 15, 2025</span>
                </div>
              </div>
              <Button variant="ghost" size="sm">
                <Download size={16} />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
