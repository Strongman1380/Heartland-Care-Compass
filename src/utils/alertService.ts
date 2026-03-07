// Alert Service - Automatic alert triggers for application events
// All alerts are stored in Supabase with no localStorage caching
import { toast } from "sonner";
import { alertsService } from '@/integrations/firebase/alertsService'

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

const mapAlertType = (level?: string): AutoAlert["type"] =>
  level === 'urgent' ? 'urgent' : level === 'warning' ? 'warning' : 'info';

const mapAlertPriority = (level?: string): AutoAlert["priority"] =>
  level === 'urgent' ? 'high' : 'medium';

class AlertService {
  private notificationsEnabled = false;

  constructor() {
    // Check notification permission
    if ('Notification' in window) {
      this.notificationsEnabled = Notification.permission === 'granted';
    }
  }

  private async createAlert(alert: Omit<AutoAlert, 'id' | 'createdAt' | 'resolved'>) {
    const newAlert: AutoAlert = {
      ...alert,
      id: Date.now().toString(),
      createdAt: new Date(),
      resolved: false
    };

    // Persist to Supabase
    try {
      await alertsService.save({
        title: newAlert.title,
        body: newAlert.description,
        level: newAlert.type,
        status: newAlert.resolved ? 'closed' : 'open'
      });
    } catch (error) {
      console.error('Failed to save alert to Supabase:', error);
    }

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
  async getAllAlerts(): Promise<AutoAlert[]> {
    try {
      const rows = await alertsService.list();
      return rows.map(r => ({
        id: r.id,
        type: mapAlertType(r.level),
        title: r.title,
        description: r.body || '',
        priority: mapAlertPriority(r.level),
        category: 'System',
        createdAt: new Date(r.created_at),
        resolved: r.status === 'closed'
      }));
    } catch (error) {
      console.error('Failed to fetch alerts from Supabase:', error);
      return [];
    }
  }

  // Get unresolved alerts
  async getUnresolvedAlerts(): Promise<AutoAlert[]> {
    const allAlerts = await this.getAllAlerts();
    return allAlerts.filter(alert => !alert.resolved);
  }

  // Resolve alert
  async resolveAlert(alertId: string): Promise<boolean> {
    try {
      await alertsService.save({
        id: alertId,
        title: '', // Will be ignored on update
        status: 'closed'
      });
      return true;
    } catch (error) {
      console.error('Failed to resolve alert:', error);
      return false;
    }
  }

  // Delete alert
  async deleteAlert(alertId: string): Promise<boolean> {
    try {
      await alertsService.delete(alertId);
      return true;
    } catch (error) {
      console.error('Failed to delete alert:', error);
      return false;
    }
  }

  // Referral alert scan — call after referral history loads
  async scanReferralAlerts(
    items: Array<{
      id?: string;
      referralName: string;
      status: string;
      archived: boolean;
      createdAt: string;
      poContactLog: Array<unknown>;
      interviewScheduledDate: string;
    }>,
    existingTitles: Set<string>
  ): Promise<void> {
    const now = new Date();
    const MS_PER_DAY = 1000 * 60 * 60 * 24;

    for (const item of items) {
      if (item.archived) continue;
      const name = item.referralName || "Unknown youth";
      const created = new Date(item.createdAt);
      const ageDays = isNaN(created.getTime()) ? 0 : Math.floor((now.getTime() - created.getTime()) / MS_PER_DAY);
      const isPending = [
        "pending_interview",
        "schedule_interview",
        "waiting_for_response",
        "new",
      ].includes(item.status);

      // 1. No PO contact after 3 days
      if (isPending && (item.poContactLog || []).length === 0 && ageDays >= 3) {
        const title = `No PO Contact — ${name}`;
        if (!existingTitles.has(title)) {
          await alertsService.save({ title, body: `${name} has been pending for ${ageDays} day${ageDays !== 1 ? "s" : ""} with no PO contact logged. Consider reaching out.`, level: "warning", status: "open", link: "/referrals" });
          existingTitles.add(title);
        }
      }

      // 2. Interview scheduled within 48 hrs
      if (item.status === "interview_scheduled" && item.interviewScheduledDate) {
        const interviewDate = new Date(item.interviewScheduledDate);
        const daysUntil = isNaN(interviewDate.getTime()) ? Infinity : Math.ceil((interviewDate.getTime() - now.getTime()) / MS_PER_DAY);
        if (daysUntil >= 0 && daysUntil <= 2) {
          const title = `Interview Soon — ${name}`;
          if (!existingTitles.has(title)) {
            const when = daysUntil === 0 ? "today" : daysUntil === 1 ? "tomorrow" : "in 2 days";
            await alertsService.save({ title, body: `Interview for ${name} is scheduled ${when} (${item.interviewScheduledDate}). Confirm logistics.`, level: "urgent", status: "open", link: "/referrals" });
            existingTitles.add(title);
          }
        }
      }

      // 3. Stale referral — pending 7+ days
      if (isPending && ageDays >= 7) {
        const title = `Stale Referral — ${name}`;
        if (!existingTitles.has(title)) {
          await alertsService.save({ title, body: `${name}'s referral has been pending for ${ageDays} day${ageDays !== 1 ? "s" : ""} with no status update. Review and follow up.`, level: "warning", status: "open", link: "/referrals" });
          existingTitles.add(title);
        }
      }
    }
  }

  // Enable/disable notifications
  setNotificationsEnabled(enabled: boolean) {
    this.notificationsEnabled = enabled;
  }
}

// Export singleton instance
export const alertService = new AlertService();
