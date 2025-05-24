
import { Header } from "@/components/layout/Header";
import { AlertTriangle, Clock, User, AlertCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const Alerts = () => {
  const alerts = [
    {
      id: 1,
      type: "warning",
      title: "Low Daily Points",
      description: "John Doe has been below privilege requirements for 3 consecutive days",
      timestamp: "2 hours ago",
      youth: "John Doe",
      priority: "high"
    },
    {
      id: 2,
      type: "info",
      title: "Level Up Eligible",
      description: "Jane Smith has enough points to advance to Level 3",
      timestamp: "5 hours ago",
      youth: "Jane Smith",
      priority: "medium"
    },
    {
      id: 3,
      type: "urgent",
      title: "Missing Progress Note",
      description: "No progress note recorded for Mike Johnson in the last 7 days",
      timestamp: "1 day ago",
      youth: "Mike Johnson",
      priority: "high"
    }
  ];

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-800 border-red-200";
      case "medium":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "low":
        return "bg-blue-100 text-blue-800 border-blue-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case "warning":
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      case "urgent":
        return <AlertCircle className="h-5 w-5 text-red-600" />;
      default:
        return <AlertTriangle className="h-5 w-5 text-blue-600" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-yellow-50 to-red-100">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-red-800 via-red-700 to-yellow-600 bg-clip-text text-transparent mb-4">
            Alerts & Notifications
          </h1>
          <p className="text-red-700 text-lg">Monitor important events and required actions</p>
        </div>
        
        <div className="space-y-4">
          {alerts.map((alert) => (
            <Card key={alert.id} className="border-2 border-yellow-300">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    {getAlertIcon(alert.type)}
                    <div>
                      <CardTitle className="text-lg">{alert.title}</CardTitle>
                      <CardDescription className="flex items-center space-x-2 mt-1">
                        <User className="h-4 w-4" />
                        <span>{alert.youth}</span>
                        <Clock className="h-4 w-4 ml-4" />
                        <span>{alert.timestamp}</span>
                      </CardDescription>
                    </div>
                  </div>
                  <Badge className={getPriorityColor(alert.priority)}>
                    {alert.priority.toUpperCase()}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700">{alert.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
        
        {alerts.length === 0 && (
          <div className="bg-white p-8 rounded-lg shadow-lg text-center border-2 border-yellow-300">
            <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-red-800 mb-4">No Active Alerts</h2>
            <p className="text-red-600 text-lg">All systems are running smoothly!</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default Alerts;
