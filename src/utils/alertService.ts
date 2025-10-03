// Alert Service - Automatic alert triggers for application events
import { toast } from "sonner";
import { alertsService } from '@/integrations/supabase/alertsService'

export type AutoAlert = {
  id: string;
  type: "warning" | "info" | "urgent";
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
  category: string;
  youthId?: string;
  youthName?: string;
  createdAt: Date;
  resolved: boolean;
};

class AlertService {
  private alerts: AutoAlert[] = [];
  private notificationsEnabled = false;

  constructor() {
    // Check notification permission
    if ('Notification' in window) {
      this.notificationsEnabled = Notification.permission === 'granted';
    }
    
    // Load existing alerts from localStorage
    this.loadAlerts();
  }

  private loadAlerts() {
    try {
      // Try Supabase first to hydrate
      try {
        void (async () => {
          const remote = await alertsService.list()
          if (remote && remote.length) {
            // map to AutoAlert-like
            this.alerts = remote.map(r => ({
              id: r.id,
              type: (r.level === 'urgent' ? 'urgent' : r.level === 'warning' ? 'warning' : 'info') as any,
              title: r.title,
              description: r.body || '',
              priority: (r.level === 'urgent' ? 'high' : 'medium') as any,
              category: 'System',
              createdAt: new Date(r.created_at),
              resolved: r.status === 'closed'
            }))
            this.saveAlerts()
          }
        })()
      } catch {}

      const savedAlerts = localStorage.getItem('heartland_alerts');
      if (savedAlerts) {
        this.alerts = JSON.parse(savedAlerts).map((alert: any) => ({
          ...alert,
          createdAt: new Date(alert.createdAt)
        }));
      }
    } catch (error) {
      console.error('Error loading alerts:', error);
    }
  }

  private saveAlerts() {
    try {
      localStorage.setItem('heartland_alerts', JSON.stringify(this.alerts));
    } catch (error) {
      console.error('Error saving alerts:', error);
    }
  }

  private createAlert(alert: Omit<AutoAlert, 'id' | 'createdAt' | 'resolved'>) {
    const newAlert: AutoAlert = {
      ...alert,
      id: Date.now().toString(),
      createdAt: new Date(),
      resolved: false
    };

    this.alerts.unshift(newAlert);
    this.saveAlerts();

    // Persist to Supabase best-effort
    try {
      void alertsService.save({
        id: undefined as any,
        title: newAlert.title,
        body: newAlert.description,
        level: newAlert.type,
        status: newAlert.resolved ? 'closed' : 'open'
      })
    } catch {}

    // Show toast notification
    toast.info(`Alert: ${newAlert.title}`, {
      description: newAlert.description,
    });

    // Send push notification if enabled
    if (this.notificationsEnabled) {
      new Notification(`Alert: ${newAlert.title}`, {
        body: newAlert.description,
        icon: `${import.meta.env.BASE_URL}favicon.ico`,
        tag: newAlert.id
      });
    }

    return newAlert;
  }

  // Behavior point alerts
  triggerLowBehaviorPointsAlert(youthId: string, youthName: string, currentPoints: number) {
    return this.createAlert({
      type: "warning",
      title: "Low Behavior Points",
      description: `${youthName} has low behavior points (${currentPoints}). Consider intervention strategies.`,
      priority: "medium",
      category: "Behavior",
      youthId,
      youthName
    });
  }

  triggerNegativeBehaviorAlert(youthId: string, youthName: string, incidentType: string) {
    return this.createAlert({
      type: "urgent",
      title: "Behavior Incident",
      description: `${youthName} had a ${incidentType} incident requiring immediate attention.`,
      priority: "high",
      category: "Behavior",
      youthId,
      youthName
    });
  }

  // Medical alerts
  triggerMedicationReminderAlert(youthId: string, youthName: string, medication: string) {
    return this.createAlert({
      type: "info",
      title: "Medication Due",
      description: `${youthName} is due for ${medication} administration.`,
      priority: "medium",
      category: "Medical",
      youthId,
      youthName
    });
  }

  triggerMedicalConcernAlert(youthId: string, youthName: string, concern: string) {
    return this.createAlert({
      type: "urgent",
      title: "Medical Attention Required",
      description: `${youthName} requires medical attention: ${concern}`,
      priority: "high",
      category: "Medical",
      youthId,
      youthName
    });
  }

  // Safety alerts
  triggerSafetyAlert(youthId: string, youthName: string, safetyIssue: string) {
    return this.createAlert({
      type: "urgent",
      title: "Safety Concern",
      description: `Safety concern for ${youthName}: ${safetyIssue}`,
      priority: "high",
      category: "Safety",
      youthId,
      youthName
    });
  }

  // Educational alerts
  triggerEducationalAlert(youthId: string, youthName: string, issue: string) {
    return this.createAlert({
      type: "warning",
      title: "Educational Concern",
      description: `Educational issue for ${youthName}: ${issue}`,
      priority: "medium",
      category: "Education",
      youthId,
      youthName
    });
  }

  // Legal alerts
  triggerCourtDateAlert(youthId: string, youthName: string, courtDate: string) {
    return this.createAlert({
      type: "warning",
      title: "Court Date Reminder",
      description: `${youthName} has a court appearance scheduled for ${courtDate}.`,
      priority: "high",
      category: "Legal",
      youthId,
      youthName
    });
  }

  // Therapy alerts
  triggerTherapySessionAlert(youthId: string, youthName: string, sessionType: string, date: string) {
    return this.createAlert({
      type: "info",
      title: "Therapy Session",
      description: `${youthName} has a ${sessionType} session scheduled for ${date}.`,
      priority: "medium",
      category: "Therapy",
      youthId,
      youthName
    });
  }

  // System alerts
  triggerSystemAlert(title: string, description: string, priority: "high" | "medium" | "low" = "medium") {
    return this.createAlert({
      type: "info",
      title,
      description,
      priority,
      category: "System"
    });
  }

  // Data migration alerts
  triggerDataMigrationAlert(status: "success" | "error" | "warning", message: string) {
    const type = status === "error" ? "urgent" : status === "warning" ? "warning" : "info";
    const priority = status === "error" ? "high" : "medium";
    
    return this.createAlert({
      type,
      title: "Data Migration",
      description: message,
      priority,
      category: "System"
    });
  }

  // Automatic point synchronization alerts
  triggerPointSyncAlert(youthCount: number, syncType: "success" | "error") {
    if (syncType === "success") {
      return this.createAlert({
        type: "info",
        title: "Points Synchronized",
        description: `Successfully synchronized behavior points for ${youthCount} youth profiles.`,
        priority: "low",
        category: "System"
      });
    } else {
      return this.createAlert({
        type: "warning",
        title: "Point Sync Failed",
        description: `Failed to synchronize behavior points. Manual intervention may be required.`,
        priority: "medium",
        category: "System"
      });
    }
  }

  // Get all alerts
  getAllAlerts(): AutoAlert[] {
    return this.alerts;
  }

  // Get unresolved alerts
  getUnresolvedAlerts(): AutoAlert[] {
    return this.alerts.filter(alert => !alert.resolved);
  }

  // Resolve alert
  resolveAlert(alertId: string): boolean {
    const alertIndex = this.alerts.findIndex(alert => alert.id === alertId);
    if (alertIndex !== -1) {
      this.alerts[alertIndex].resolved = true;
      this.saveAlerts();
      return true;
    }
    return false;
  }

  // Delete alert
  deleteAlert(alertId: string): boolean {
    const initialLength = this.alerts.length;
    this.alerts = this.alerts.filter(alert => alert.id !== alertId);
    if (this.alerts.length < initialLength) {
      this.saveAlerts();
      return true;
    }
    return false;
  }

  // Enable/disable notifications
  setNotificationsEnabled(enabled: boolean) {
    this.notificationsEnabled = enabled;
  }
}

// Export singleton instance
export const alertService = new AlertService();
