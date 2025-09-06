
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users } from "lucide-react";

export const EmptyYouthState = () => {
  return (
    <Card className="border-2 border-yellow-300">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
          <Users className="h-16 w-16 text-red-600" />
        </div>
        <CardTitle className="text-2xl text-red-800">No Youth Profiles Found</CardTitle>
        <CardDescription className="text-red-600 text-lg">
          There are currently no youth profiles in the system.
        </CardDescription>
      </CardHeader>
      <CardContent className="text-center">
        <p className="text-red-700 mb-4">
          Use the "Add New Youth" button in the header to create the first youth profile.
        </p>
      </CardContent>
    </Card>
  );
};
