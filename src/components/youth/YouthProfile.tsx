
import { useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Upload, Download } from "lucide-react";
import { format } from "date-fns";

interface YouthProfileProps {
  youth: any;
}

export const YouthProfile = ({ youth }: YouthProfileProps) => {
  const [activeTab, setActiveTab] = useState("demographics");

  const formatDate = (timestamp: any) => {
    if (!timestamp) return "Not specified";
    try {
      // Handle Firestore timestamps
      if (timestamp.toDate && typeof timestamp.toDate === "function") {
        return format(timestamp.toDate(), "MMM d, yyyy");
      }
      // Handle regular dates
      return format(new Date(timestamp), "MMM d, yyyy");
    } catch (err) {
      console.error("Error formatting date:", err);
      return "Invalid date";
    }
  };

  const handlePrintProfile = () => {
    window.print();
  };

  const handleExportPdf = () => {
    // PDF export functionality would be implemented here
    console.log("Export PDF");
  };

  const handleUploadDocument = () => {
    // Document upload functionality would be implemented here
    console.log("Upload document");
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start flex-col sm:flex-row">
        <div>
          <h2 className="text-2xl font-bold mb-2">Youth Profile</h2>
          <p className="text-gray-600 mb-4">View complete demographic and personal information.</p>
        </div>
        
        <div className="flex space-x-2 mb-4 sm:mb-0">
          <Button variant="outline" size="sm" onClick={handlePrintProfile}>
            <FileText size={16} className="mr-2" />
            Print
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportPdf}>
            <Download size={16} className="mr-2" />
            Export PDF
          </Button>
          <Button onClick={handleUploadDocument}>
            <Upload size={16} className="mr-2" />
            Upload Documents
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="demographics">Demographics</TabsTrigger>
          <TabsTrigger value="education">Education</TabsTrigger>
          <TabsTrigger value="medical">Medical</TabsTrigger>
          <TabsTrigger value="legal">Legal Status</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
        </TabsList>

        <TabsContent value="demographics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>Core demographic details for {youth.firstName}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Full Name</h3>
                  <p className="mt-1 text-sm sm:text-base">{youth.firstName} {youth.lastName}</p>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Date of Birth</h3>
                  <p className="mt-1 text-sm sm:text-base">{formatDate(youth.dob)} (Age: {youth.age})</p>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Admission Date</h3>
                  <p className="mt-1 text-sm sm:text-base">{formatDate(youth.admissionDate)}</p>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Level Status</h3>
                  <p className="mt-1 text-sm sm:text-base">Level {youth.level} ({youth.pointTotal || 0} points)</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Referral Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Referral Source</h3>
                  <p className="mt-1">{youth.referralSource || "Not specified"}</p>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Referral Reason</h3>
                  <p className="mt-1">{youth.referralReason || "Not specified"}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="education" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Educational Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Education Summary</h3>
                <p className="mt-1 whitespace-pre-line">{youth.educationInfo || "No educational information on file."}</p>
              </div>
            </CardContent>
            <CardFooter>
              <Button variant="outline">Add Education Record</Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="medical" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Medical Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Medical Summary</h3>
                  <p className="mt-1 whitespace-pre-line">{youth.medicalInfo || "No medical information on file."}</p>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Mental Health Information</h3>
                  <p className="mt-1 whitespace-pre-line">{youth.mentalHealthInfo || "No mental health information on file."}</p>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button variant="outline">Add Medical Record</Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="legal">
          <Card>
            <CardHeader>
              <CardTitle>Legal Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Legal Status Summary</h3>
                <p className="mt-1 whitespace-pre-line">{youth.legalStatus || "No legal status information on file."}</p>
              </div>
            </CardContent>
            <CardFooter>
              <Button variant="outline">Update Legal Status</Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="documents">
          <Card>
            <CardHeader>
              <CardTitle>Uploaded Documents</CardTitle>
              <CardDescription>View and manage documents related to this youth</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* This would be replaced with actual documents from Firebase Storage */}
                <div className="bg-gray-50 p-4 rounded-md">
                  <p className="text-gray-500 text-center">No documents have been uploaded yet.</p>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleUploadDocument}>
                <Upload size={16} className="mr-2" />
                Upload New Document
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
