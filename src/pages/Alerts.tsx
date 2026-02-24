
import { Header } from "@/components/layout/Header";
import { AlertTriangle, Clock, User, AlertCircle, Bell, Plus, FileText, Zap, Check } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEffect, useState } from "react";
import { alertsService } from '@/integrations/firebase/alertsService'
import { toast } from "sonner";
import { useYouth } from "@/hooks/useSupabase";
import { type Youth } from "@/integrations/firebase/services";

type Alert = {
  id: string;
  type: "warning" | "info" | "urgent";
  title: string;
  description: string;
  timestamp: string;
  youth?: string;
  youthId?: string;
  priority: "high" | "medium" | "low";
  createdAt: Date;
  resolved?: boolean;
  category?: string;
};

type AlertTemplate = {
  id: string;
  name: string;
  type: "warning" | "info" | "urgent";
  priority: "high" | "medium" | "low";
  title: string;
  description: string;
  category: string;
  icon: any;
};

const ALERT_TEMPLATES: AlertTemplate[] = [
  {
    id: "behavior-incident",
    name: "Behavior Incident",
    type: "warning",
    priority: "high",
    title: "Behavior Incident Reported",
    description: "A significant behavior incident requires immediate attention and documentation.",
    category: "Behavior",
    icon: AlertTriangle
  },
  {
    id: "medical-concern",
    name: "Medical Concern",
    type: "urgent",
    priority: "high",
    title: "Medical Attention Required",
    description: "Youth requires medical attention or health monitoring.",
    category: "Medical",
    icon: AlertCircle
  },
  {
    id: "safety-alert",
    name: "Safety Alert",
    type: "urgent",
    priority: "high",
    title: "Safety Concern Identified",
    description: "Potential safety risk identified that requires immediate intervention.",
    category: "Safety",
    icon: AlertCircle
  },
  {
    id: "medication-reminder",
    name: "Medication Reminder",
    type: "info",
    priority: "medium",
    title: "Medication Administration Due",
    description: "Youth medication administration is due or overdue.",
    category: "Medical",
    icon: Clock
  },
  {
    id: "therapy-session",
    name: "Therapy Session",
    type: "info",
    priority: "medium",
    title: "Therapy Session Scheduled",
    description: "Reminder for upcoming therapy or counseling session.",
    category: "Therapy",
    icon: User
  },
  {
    id: "court-date",
    name: "Court Date",
    type: "warning",
    priority: "high",
    title: "Court Appearance Scheduled",
    description: "Youth has an upcoming court date that requires preparation.",
    category: "Legal",
    icon: Clock
  },
  {
    id: "educational-concern",
    name: "Educational Concern",
    type: "warning",
    priority: "medium",
    title: "Educational Issue",
    description: "Academic performance or school attendance concern requiring attention.",
    category: "Education",
    icon: AlertTriangle
  },
  {
    id: "family-contact",
    name: "Family Contact",
    type: "info",
    priority: "medium",
    title: "Family Contact Scheduled",
    description: "Scheduled family visit or contact session.",
    category: "Family",
    icon: User
  }
];

const Alerts = () => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<AlertTemplate | null>(null);
  const [newAlert, setNewAlert] = useState<{
    type: "warning" | "info" | "urgent";
    title: string;
    description: string;
    youth: string;
    youthId: string;
    priority: "high" | "medium" | "low";
    category: string;
  }>({
    type: "info",
    title: "",
    description: "",
    youth: "",
    youthId: "general",
    priority: "medium",
    category: ""
  });

  // Use Supabase hook for youth operations
  const { youths, loading, loadYouths } = useYouth();

  useEffect(() => {
    // Load youths from Supabase
    loadYouths();
    // Load alerts from Supabase (fallback to empty)
    (async () => {
      try {
        const remote = await alertsService.list();
        const mapped = remote.map(r => ({
          id: r.id,
          type: (r.level === 'urgent' ? 'urgent' : r.level === 'warning' ? 'warning' : 'info') as any,
          title: r.title,
          description: r.body || '',
          timestamp: 'Now',
          priority: (r.level === 'urgent' ? 'high' : 'medium') as any,
          createdAt: new Date(r.created_at),
          resolved: r.status === 'closed',
          category: 'System'
        })) as Alert[]
        setAlerts(mapped)
      } catch {}
    })();

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

  const applyTemplate = (template: AlertTemplate) => {
    setNewAlert({
      type: template.type,
      title: template.title,
      description: template.description,
      youth: "",
      youthId: "general",
      priority: template.priority,
      category: template.category
    });
    setIsTemplateDialogOpen(false);
    setIsCreateDialogOpen(true);
  };

  const createAlert = async () => {
    if (!newAlert.title.trim() || !newAlert.description.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    const alert: Alert = {
      id: Date.now().toString(),
      ...newAlert,
      timestamp: 'Just now',
      createdAt: new Date(),
      resolved: false
    };

    // Save to Supabase and update UI
    try { await alertsService.save({ title: alert.title, body: alert.description, level: alert.type, status: 'open' }) } catch {}
    const remote = await alertsService.list();
    const mapped = remote.map(r => ({
      id: r.id,
      type: (r.level === 'urgent' ? 'urgent' : r.level === 'warning' ? 'warning' : 'info') as any,
      title: r.title,
      description: r.body || '',
      timestamp: 'Now',
      priority: (r.level === 'urgent' ? 'high' : 'medium') as any,
      createdAt: new Date(r.created_at),
      resolved: r.status === 'closed',
      category: 'System'
    })) as Alert[]
    setAlerts(mapped)

    // Send push notification if enabled
    if (notificationsEnabled) {
      new Notification(`Alert: ${alert.title}`, {
        body: alert.description,
        icon: `${import.meta.env.BASE_URL}favicon.ico`,
        tag: alert.id
      });
    }

    toast.success('Alert created successfully!');
    setIsCreateDialogOpen(false);
    resetNewAlert();
  };

  const resolveAlert = async (alertId: string) => {
    const updatedAlerts = alerts.map(alert => 
      alert.id === alertId ? { ...alert, resolved: true } : alert
    );
    setAlerts(updatedAlerts);
    try { await alertsService.save({ id: alertId as any, title: (alerts.find(a=>a.id===alertId)?.title)||'', body: (alerts.find(a=>a.id===alertId)?.description)||'', level: (alerts.find(a=>a.id===alertId)?.type)||'info', status: 'closed' }) } catch {}
    toast.success('Alert resolved');
  };

  const resetNewAlert = () => {
    setNewAlert({
      type: "info",
      title: "",
      description: "",
      youth: "",
      youthId: "general",
      priority: "medium",
      category: ""
    });
  };

  const deleteAlert = async (alertId: string) => {
    try { await alertsService.delete(alertId) } catch {}
    const updatedAlerts = alerts.filter(alert => alert.id !== alertId);
    setAlerts(updatedAlerts);
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
      <main className="container mx-auto px-4 py-6 pb-24 lg:pb-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-red-800 via-red-700 to-yellow-600 bg-clip-text text-transparent mb-4">
            Alerts & Notifications
          </h1>
          <p className="text-red-700 text-base sm:text-lg">Monitor important events and required actions</p>

          <div className="flex flex-col sm:flex-row justify-center items-stretch sm:items-center gap-3 sm:gap-4 mt-6">
            <Dialog open={isTemplateDialogOpen} onOpenChange={setIsTemplateDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="border-red-600 text-red-600 hover:bg-red-50">
                  <FileText className="h-4 w-4 mr-2" />
                  Use Template
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                  <DialogTitle>Alert Templates</DialogTitle>
                  <DialogDescription>
                    Choose from predefined alert templates for common scenarios.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
                  {ALERT_TEMPLATES.map((template) => {
                    const IconComponent = template.icon;
                    return (
                      <Card 
                        key={template.id}
                        className="cursor-pointer hover:shadow-md transition-shadow border-2 hover:border-red-300"
                        onClick={() => applyTemplate(template)}
                      >
                        <CardHeader className="pb-2">
                          <div className="flex items-center space-x-2">
                            <IconComponent className="h-5 w-5 text-red-600" />
                            <CardTitle className="text-sm">{template.name}</CardTitle>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <p className="text-xs text-gray-600 mb-2">{template.description}</p>
                          <div className="flex justify-between items-center">
                            <Badge className={getPriorityColor(template.priority)}>
                              {template.priority.toUpperCase()}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {template.category}
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </DialogContent>
            </Dialog>

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
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="title">
                      Title
                    </Label>
                    <Input
                      id="title"
                      value={newAlert.title}
                      onChange={(e) => setNewAlert({...newAlert, title: e.target.value})}
                      placeholder="Alert title"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="type">
                      Type
                    </Label>
                    <Select value={newAlert.type} onValueChange={(value) => setNewAlert({...newAlert, type: value as "warning" | "info" | "urgent"})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="info">Info</SelectItem>
                        <SelectItem value="warning">Warning</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="priority">
                      Priority
                    </Label>
                    <Select value={newAlert.priority} onValueChange={(value) => setNewAlert({...newAlert, priority: value as "high" | "medium" | "low"})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="category">
                      Category
                    </Label>
                    <Input
                      id="category"
                      value={newAlert.category}
                      onChange={(e) => setNewAlert({...newAlert, category: e.target.value})}
                      placeholder="Alert category (optional)"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="youth">
                      Youth
                    </Label>
                    <Select value={newAlert.youthId} onValueChange={(value) => {
                      const selectedYouth = youths.find(y => y.id === value);
                      setNewAlert({
                        ...newAlert,
                        youthId: value,
                        youth: selectedYouth ? `${selectedYouth.firstName} ${selectedYouth.lastName}` : ""
                      });
                    }}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select youth (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="general">None - General Alert</SelectItem>
                        {youths.map((youth) => (
                          <SelectItem key={youth.id} value={youth.id}>
                            {youth.firstName} {youth.lastName} - Level {youth.level}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="description">
                      Description
                    </Label>
                    <Textarea
                      id="description"
                      value={newAlert.description}
                      onChange={(e) => setNewAlert({...newAlert, description: e.target.value})}
                      placeholder="Alert description"
                      rows={3}
                    />
                  </div>
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => {
                    setIsCreateDialogOpen(false);
                    resetNewAlert();
                  }}>
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
              className={notificationsEnabled ? "border-green-500 text-green-600" : "bg-[#823131] hover:bg-[#6b2828] text-white border-[#823131]"}
            >
              <Bell className="h-4 w-4 mr-2" />
              {notificationsEnabled ? "Notifications Enabled" : "Enable Notifications"}
            </Button>
          </div>
        </div>
        
        <div className="space-y-4">
          {alerts.map((alert) => (
            <Card 
              key={alert.id} 
              className={`border-2 transition-all ${
                alert.resolved 
                  ? 'border-green-300 bg-green-50 opacity-75' 
                  : 'border-yellow-300'
              }`}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    {alert.resolved ? (
                      <Check className="h-5 w-5 text-green-600" />
                    ) : (
                      getAlertIcon(alert.type)
                    )}
                    <div>
                      <div className="flex items-center space-x-2">
                        <CardTitle className={`text-lg ${alert.resolved ? 'line-through text-gray-500' : ''}`}>
                          {alert.title}
                        </CardTitle>
                        {alert.resolved && (
                          <Badge className="bg-green-100 text-green-800 border-green-200">
                            RESOLVED
                          </Badge>
                        )}
                      </div>
                      <CardDescription className="flex items-center space-x-4 mt-1">
                        <div className="flex items-center space-x-1">
                          {alert.youth && alert.youth !== "general" && (
                            <>
                              <User className="h-4 w-4" />
                              <span>{alert.youth}</span>
                            </>
                          )}
                        </div>
                        {alert.category && (
                          <Badge variant="outline" className="text-xs">
                            {alert.category}
                          </Badge>
                        )}
                        <div className="flex items-center space-x-1">
                          <Clock className="h-4 w-4" />
                          <span>{alert.createdAt ? formatTimestamp(alert.createdAt) : alert.timestamp}</span>
                        </div>
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge className={getPriorityColor(alert.priority)}>
                      {alert.priority.toUpperCase()}
                    </Badge>
                    {!alert.resolved && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => resolveAlert(alert.id)}
                        className="text-green-600 hover:text-green-800 hover:bg-green-50"
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                    )}
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
                <p className={`text-gray-700 ${alert.resolved ? 'line-through opacity-60' : ''}`}>
                  {alert.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
        
        {alerts.length === 0 && (
          <div className="bg-white p-4 sm:p-8 rounded-lg shadow-lg text-center border-2 border-yellow-300">
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
