
import { Header } from "@/components/layout/Header";
import { AlertTriangle, Clock, User, AlertCircle, Bell, Plus } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { fetchAllYouths } from "@/utils/local-storage-utils";
import { Youth } from "@/types/app-types";

type Alert = {
  id: string;
  type: "warning" | "info" | "urgent";
  title: string;
  description: string;
  timestamp: string;
  youth?: string;
  priority: "high" | "medium" | "low";
  createdAt: Date;
};

const Alerts = () => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [youths, setYouths] = useState<Youth[]>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [newAlert, setNewAlert] = useState<{
    type: "warning" | "info" | "urgent";
    title: string;
    description: string;
    youth: string;
    priority: "high" | "medium" | "low";
  }>({
    type: "info",
    title: "",
    description: "",
    youth: "",
    priority: "medium"
  });

  useEffect(() => {
    // Load alerts from localStorage
    const savedAlerts = localStorage.getItem('heartland_alerts');
    if (savedAlerts) {
      setAlerts(JSON.parse(savedAlerts));
    }
    
    // Load youths for selection
    setYouths(fetchAllYouths());
    
    // Check notification permission status
    if ('Notification' in window) {
      setNotificationsEnabled(Notification.permission === 'granted');
    }
  }, []);

  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      try {
        const permission = await Notification.requestPermission();
        setNotificationsEnabled(permission === 'granted');
        
        if (permission === 'granted') {
          toast.success('Push notifications enabled!');
          // Send a test notification
          new Notification('Heartland Care Compass', {
            body: 'Notifications are now enabled for alerts and updates.',
            icon: `${import.meta.env.BASE_URL}favicon.ico`
          });
        } else {
          toast.error('Push notifications denied');
        }
      } catch (error) {
        toast.error('Error requesting notification permission');
      }
    } else {
      toast.error('Notifications not supported in this browser');
    }
  };

  const createAlert = () => {
    if (!newAlert.title.trim() || !newAlert.description.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    const alert: Alert = {
      id: Date.now().toString(),
      ...newAlert,
      timestamp: 'Just now',
      createdAt: new Date()
    };

    const updatedAlerts = [alert, ...alerts];
    setAlerts(updatedAlerts);
    localStorage.setItem('heartland_alerts', JSON.stringify(updatedAlerts));

    // Send push notification if enabled
    if (notificationsEnabled) {
      new Notification(`Alert: ${alert.title}`, {
        body: alert.description,
        icon: `${import.meta.env.BASE_URL}favicon.ico`
      });
    }

    toast.success('Alert created successfully!');
    setIsCreateDialogOpen(false);
    setNewAlert({
      type: "info",
      title: "",
      description: "",
      youth: "",
      priority: "medium"
    });
  };

  const deleteAlert = (alertId: string) => {
    const updatedAlerts = alerts.filter(alert => alert.id !== alertId);
    setAlerts(updatedAlerts);
    localStorage.setItem('heartland_alerts', JSON.stringify(updatedAlerts));
    toast.success('Alert deleted');
  };

  const formatTimestamp = (createdAt: Date) => {
    const now = new Date();
    const diff = now.getTime() - new Date(createdAt).getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 60) {
      return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
    } else if (hours < 24) {
      return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    } else {
      return `${days} day${days !== 1 ? 's' : ''} ago`;
    }
  };

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
          
          <div className="flex justify-center items-center space-x-4 mt-6">
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-red-600 hover:bg-red-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Alert
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Create New Alert</DialogTitle>
                  <DialogDescription>
                    Create a new alert or notification for the system.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="title" className="text-right">
                      Title
                    </Label>
                    <Input
                      id="title"
                      value={newAlert.title}
                      onChange={(e) => setNewAlert({...newAlert, title: e.target.value})}
                      className="col-span-3"
                      placeholder="Alert title"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="type" className="text-right">
                      Type
                    </Label>
                    <Select value={newAlert.type} onValueChange={(value) => setNewAlert({...newAlert, type: value as "warning" | "info" | "urgent"})}>
                      <SelectTrigger className="col-span-3">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="info">Info</SelectItem>
                        <SelectItem value="warning">Warning</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="priority" className="text-right">
                      Priority
                    </Label>
                    <Select value={newAlert.priority} onValueChange={(value) => setNewAlert({...newAlert, priority: value as "high" | "medium" | "low"})}>
                      <SelectTrigger className="col-span-3">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="youth" className="text-right">
                      Youth
                    </Label>
                    <Select value={newAlert.youth} onValueChange={(value) => setNewAlert({...newAlert, youth: value})}>
                      <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="Select youth (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">None - General Alert</SelectItem>
                        {youths.map((youth) => (
                          <SelectItem key={youth.id} value={`${youth.firstName} ${youth.lastName}`}>
                            {youth.firstName} {youth.lastName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="description" className="text-right">
                      Description
                    </Label>
                    <Textarea
                      id="description"
                      value={newAlert.description}
                      onChange={(e) => setNewAlert({...newAlert, description: e.target.value})}
                      className="col-span-3"
                      placeholder="Alert description"
                      rows={3}
                    />
                  </div>
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={createAlert} className="bg-red-600 hover:bg-red-700">
                    Create Alert
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            
            <Button 
              onClick={requestNotificationPermission}
              variant={notificationsEnabled ? "outline" : "default"}
              className={notificationsEnabled ? "border-green-500 text-green-600" : "bg-blue-600 hover:bg-blue-700"}
            >
              <Bell className="h-4 w-4 mr-2" />
              {notificationsEnabled ? "Notifications Enabled" : "Enable Notifications"}
            </Button>
          </div>
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
                        {alert.youth && (
                          <>
                            <User className="h-4 w-4" />
                            <span>{alert.youth}</span>
                          </>
                        )}
                        <Clock className="h-4 w-4 ml-4" />
                        <span>{alert.createdAt ? formatTimestamp(alert.createdAt) : alert.timestamp}</span>
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge className={getPriorityColor(alert.priority)}>
                      {alert.priority.toUpperCase()}
                    </Badge>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => deleteAlert(alert.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      ×
                    </Button>
                  </div>
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
