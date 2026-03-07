import { useCallback, useEffect, useMemo, useState } from "react";
import { Header } from "@/components/layout/Header";
import { BottomNav } from "@/components/layout/BottomNav";
import { AIStatusMonitor } from "@/components/admin/AIStatusMonitor";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { collection, collectionGroup, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { alertsService, type AlertRow } from "@/integrations/firebase/alertsService";
import { caseNotesService, dailyRatingsService, youthService, type Youth } from "@/integrations/firebase/services";
import { Activity, Database, HardDrive, RefreshCw, Shield, ShieldCheck, Users } from "lucide-react";
import { logger } from '@/utils/logger';

type Snapshot = {
  activeYouth: number;
  archivedYouth: number;
  userRoles: number;
  adminUsers: number;
  staffUsers: number;
  behaviorPointRows: number;
  caseNoteRows: number;
  dailyRatingRows: number;
  systemEvents: number;
  openSystemEvents: number;
  warningEvents: number;
  urgentEvents: number;
  missingAdmissionDate: number;
  missingGrade: number;
  youthsWithoutDpnHistory: number;
  youthsWithoutCaseNotes: number;
};

const emptySnapshot: Snapshot = {
  activeYouth: 0,
  archivedYouth: 0,
  userRoles: 0,
  adminUsers: 0,
  staffUsers: 0,
  behaviorPointRows: 0,
  caseNoteRows: 0,
  dailyRatingRows: 0,
  systemEvents: 0,
  openSystemEvents: 0,
  warningEvents: 0,
  urgentEvents: 0,
  missingAdmissionDate: 0,
  missingGrade: 0,
  youthsWithoutDpnHistory: 0,
  youthsWithoutCaseNotes: 0,
};

const levelBadgeClass = (level?: string) => {
  if (level === "urgent") return "bg-red-100 text-red-700 border-red-200";
  if (level === "warning") return "bg-amber-100 text-amber-800 border-amber-200";
  return "bg-slate-100 text-slate-700 border-slate-200";
};

const SystemOps = () => {
  const { user, role, isAdmin } = useAuth();
  const [snapshot, setSnapshot] = useState<Snapshot>(emptySnapshot);
  const [events, setEvents] = useState<AlertRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<string>("");

  const loadSystemData = useCallback(async () => {
    setRefreshing(true);

    try {
      const [
        activeYouth,
        archivedYouth,
        roleSnapshot,
        pointRows,
        noteRows,
        ratingRows,
        eventRows,
      ] = await Promise.all([
        youthService.getAll(),
        youthService.getArchived(),
        getDocs(collection(db, "user_roles")),
        getDocs(collectionGroup(db, "behavior_points")),
        getDocs(collectionGroup(db, "case_notes")),
        getDocs(collectionGroup(db, "daily_ratings")),
        alertsService.list(),
      ]);

      const roleRows = roleSnapshot.docs.map((docSnap) => ({
        uid: docSnap.id,
        role: String(docSnap.data().role || "staff"),
      }));

      const integrityChecks = await Promise.all(
        activeYouth.map(async (youth: Youth) => {
          const [latestDpn, latestNote] = await Promise.all([
            dailyRatingsService.getByYouthId(youth.id, 1).catch(() => []),
            caseNotesService.getByYouthId(youth.id, 1).catch(() => []),
          ]);

          return {
            missingAdmissionDate: !youth.admissionDate,
            missingGrade: !(youth.currentGrade || youth.grade),
            noDpnHistory: latestDpn.length === 0,
            noCaseNotes: latestNote.length === 0,
          };
        })
      );

      setSnapshot({
        activeYouth: activeYouth.length,
        archivedYouth: archivedYouth.length,
        userRoles: roleRows.length,
        adminUsers: roleRows.filter((row) => row.role === "admin").length,
        staffUsers: roleRows.filter((row) => row.role !== "admin").length,
        behaviorPointRows: pointRows.size,
        caseNoteRows: noteRows.size,
        dailyRatingRows: ratingRows.size,
        systemEvents: eventRows.length,
        openSystemEvents: eventRows.filter((row) => row.status === "open").length,
        warningEvents: eventRows.filter((row) => row.level === "warning").length,
        urgentEvents: eventRows.filter((row) => row.level === "urgent").length,
        missingAdmissionDate: integrityChecks.filter((row) => row.missingAdmissionDate).length,
        missingGrade: integrityChecks.filter((row) => row.missingGrade).length,
        youthsWithoutDpnHistory: integrityChecks.filter((row) => row.noDpnHistory).length,
        youthsWithoutCaseNotes: integrityChecks.filter((row) => row.noCaseNotes).length,
      });
      setEvents(eventRows.slice(0, 8));
      setLastRefresh(new Date().toLocaleString());
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSystemData();
  }, [loadSystemData]);

  const securityTone = useMemo(() => {
    if (snapshot.urgentEvents > 0 || snapshot.openSystemEvents > 10) return "Review recommended";
    if (snapshot.openSystemEvents > 0 || snapshot.warningEvents > 0) return "Monitor";
    return "Stable";
  }, [snapshot.openSystemEvents, snapshot.urgentEvents, snapshot.warningEvents]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-stone-50 to-slate-100">
      <Header />
      <main className="container mx-auto px-4 py-6 pb-24 lg:pb-8 space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">System Ops</h1>
            <p className="text-slate-600 mt-1">
              Database visibility, security posture, data integrity, and recent system events.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="border-slate-300 bg-white text-slate-700">
              Session role: {role || "unknown"}
            </Badge>
            <Badge variant="outline" className="border-slate-300 bg-white text-slate-700">
              {isAdmin ? "Admin access" : "Read-only staff view"}
            </Badge>
            <Button variant="outline" onClick={loadSystemData} disabled={refreshing} className="gap-2">
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              {refreshing ? "Refreshing..." : "Refresh"}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2 text-slate-700">
                <Database className="h-4 w-4 text-slate-900" />
                Database Footprint
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between"><span>Active youth</span><span className="font-semibold">{snapshot.activeYouth}</span></div>
              <div className="flex justify-between"><span>Archived youth</span><span className="font-semibold">{snapshot.archivedYouth}</span></div>
              <div className="flex justify-between"><span>Daily ratings</span><span className="font-semibold">{snapshot.dailyRatingRows}</span></div>
              <div className="flex justify-between"><span>Case notes</span><span className="font-semibold">{snapshot.caseNoteRows}</span></div>
              <div className="flex justify-between"><span>Behavior points</span><span className="font-semibold">{snapshot.behaviorPointRows}</span></div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2 text-slate-700">
                <Shield className="h-4 w-4 text-slate-900" />
                Security Snapshot
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between"><span>User roles</span><span className="font-semibold">{snapshot.userRoles}</span></div>
              <div className="flex justify-between"><span>Admin users</span><span className="font-semibold">{snapshot.adminUsers}</span></div>
              <div className="flex justify-between"><span>Staff users</span><span className="font-semibold">{snapshot.staffUsers}</span></div>
              <div className="flex justify-between"><span>Security posture</span><span className="font-semibold">{securityTone}</span></div>
              <div className="flex justify-between"><span>Current user</span><span className="font-semibold truncate max-w-[140px]">{user?.email || "Not signed in"}</span></div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2 text-slate-700">
                <ShieldCheck className="h-4 w-4 text-slate-900" />
                Data Integrity
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between"><span>Missing admission dates</span><span className="font-semibold">{snapshot.missingAdmissionDate}</span></div>
              <div className="flex justify-between"><span>Missing grade values</span><span className="font-semibold">{snapshot.missingGrade}</span></div>
              <div className="flex justify-between"><span>No DPN history</span><span className="font-semibold">{snapshot.youthsWithoutDpnHistory}</span></div>
              <div className="flex justify-between"><span>No case notes</span><span className="font-semibold">{snapshot.youthsWithoutCaseNotes}</span></div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2 text-slate-700">
                <Activity className="h-4 w-4 text-slate-900" />
                Event Stream
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between"><span>Total events</span><span className="font-semibold">{snapshot.systemEvents}</span></div>
              <div className="flex justify-between"><span>Open events</span><span className="font-semibold">{snapshot.openSystemEvents}</span></div>
              <div className="flex justify-between"><span>Warnings</span><span className="font-semibold">{snapshot.warningEvents}</span></div>
              <div className="flex justify-between"><span>Urgent</span><span className="font-semibold">{snapshot.urgentEvents}</span></div>
              <div className="flex justify-between"><span>Last refresh</span><span className="font-semibold">{lastRefresh || "Loading..."}</span></div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2">
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2 text-slate-900">
                  <HardDrive className="h-4 w-4" />
                  Database and System Event Log
                </CardTitle>
                <CardDescription>
                  Recent technical events stored in the backing datastore. Existing event records are surfaced here as system log entries.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <p className="text-sm text-slate-500">Loading system events...</p>
                ) : events.length === 0 ? (
                  <p className="text-sm text-slate-500">No system events found.</p>
                ) : (
                  <div className="space-y-3">
                    {events.map((event) => (
                      <div key={event.id} className="rounded-xl border border-slate-200 bg-white p-4">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            <div className="font-semibold text-slate-900">{event.title}</div>
                            {event.body && <div className="text-sm text-slate-600 mt-1">{event.body}</div>}
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Badge variant="outline" className={levelBadgeClass(event.level)}>
                              {event.level || "info"}
                            </Badge>
                            <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-700">
                              {event.status || "open"}
                            </Badge>
                          </div>
                        </div>
                        <div className="mt-3 text-xs text-slate-500">
                          Created {event.created_at ? new Date(event.created_at).toLocaleString() : "unknown"}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <AIStatusMonitor />

            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base text-slate-900">Technical Notes</CardTitle>
                <CardDescription>What this page is intended to monitor.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-slate-600">
                <p>Use this area for database visibility, account-role awareness, AI service health, and operational data quality checks.</p>
                <p>The old end-user alert inbox behavior has been removed from navigation in favor of a technical system view.</p>
                <p>For incident-driven youth workflow, use the youth workspace, incident reports, case notes, and DPN areas directly.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      <BottomNav />
    </div>
  );
};

export default SystemOps;
