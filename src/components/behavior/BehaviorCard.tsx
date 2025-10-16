import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { format, startOfWeek, endOfWeek, eachDayOfInterval } from "date-fns";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, ArrowRight, Calendar, Download, FileText, TrendingUp, TrendingDown, Users, History, Shield, Ban, X } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useBehaviorPoints, useYouth } from "@/hooks/useSupabase";
import { type BehaviorPoints } from "@/integrations/supabase/services";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { calculatePointsNeededForNextLevel, syncYouthTotalPoints } from "@/utils/pointCalculations";
import { syncYouthPoints } from "@/utils/pointSyncService";
import { alertService } from "@/utils/alertService";

interface BehaviorCardProps {
  youthId: string;
  youth: any;
  onYouthUpdated?: () => void;
}

// Level system data - using full thousands for internal calculations
const levelsData = [
  { name: "Orientation", level: 0, cumulativePointsRequired: 120000, dailyPointsForPrivileges: 10000 },
  { name: "Level 1", level: 1, cumulativePointsRequired: 840000, dailyPointsForPrivileges: 20000 },
  { name: "Level 2", level: 2, cumulativePointsRequired: 2000000, dailyPointsForPrivileges: 20000 },
  { name: "Level 3", level: 3, cumulativePointsRequired: 3060000, dailyPointsForPrivileges: 30000 },
  { name: "Level 4", level: 4, cumulativePointsRequired: 4740000, dailyPointsForPrivileges: 40000 },
  { name: "Level 5", level: 5, cumulativePointsRequired: 6840000, dailyPointsForPrivileges: 50000 },
  { name: "Level 6", level: 6, cumulativePointsRequired: 9360000, dailyPointsForPrivileges: 60000 },
  { name: "Level 7", level: 7, cumulativePointsRequired: 12300000, dailyPointsForPrivileges: 70000 },
  { name: "Level 8", level: 8, cumulativePointsRequired: 15660000, dailyPointsForPrivileges: 80000 },
  { name: "Level 9", level: 9, cumulativePointsRequired: 19440000, dailyPointsForPrivileges: 90000 },
  { name: "Level 10", level: 10, cumulativePointsRequired: Infinity, dailyPointsForPrivileges: Infinity }
];

const MAX_DAILY_POINTS = 105000;

interface SubsystemHistoryEntry {
  status: 'on' | 'off';
  date: string;
  recordedBy: string;
}

export const BehaviorCard = ({ youthId, youth, onYouthUpdated }: BehaviorCardProps) => {
  const [activeTab, setActiveTab] = useState("daily");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isLoading, setIsLoading] = useState(true);
  
  // Use Supabase hooks
  const { behaviorPoints: pointEntries, saveBehaviorPoints, loadBehaviorPoints, getBehaviorPointsForDate, deleteAllBehaviorPoints, error: behaviorPointsError } = useBehaviorPoints(youthId);
  const { updateYouth } = useYouth();
  const [formData, setFormData] = useState({
    dailyPoints: 0, // This will now be in thousands (e.g., 15000)
    comments: "",
    onSubsystem: false,
    staffName: "",
  });
  const [pointsError, setPointsError] = useState("");
  const [weeklyAverages, setWeeklyAverages] = useState({
    averagePointsPerDay: 0,
    totalPointsThisWeek: 0,
    daysRecorded: 0,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [subsystemHistory, setSubsystemHistory] = useState<SubsystemHistoryEntry[]>([
    { status: 'off', date: new Date().toLocaleString(), recordedBy: 'System' }
  ]);
  const [showSubsystemLog, setShowSubsystemLog] = useState(false);
  const [autoSaveTimer, setAutoSaveTimer] = useState<NodeJS.Timeout | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  
  // Restriction and subsystem state
  const [showRestrictionDialog, setShowRestrictionDialog] = useState(false);
  const [showSubsystemDialog, setShowSubsystemDialog] = useState(false);
  const [restrictionLevel, setRestrictionLevel] = useState<1 | 2 | null>(null);
  const [restrictionPoints, setRestrictionPoints] = useState("");
  const [restrictionReason, setRestrictionReason] = useState("");
  const [subsystemPoints, setSubsystemPoints] = useState("");
  const [subsystemReason, setSubsystemReason] = useState("");

  // Handle case where youth is null or undefined
  if (!youth) {
    return (
      <div className="space-y-6">
        <Card className="border-2 border-yellow-300">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <Users className="h-16 w-16 text-red-600" />
            </div>
            <CardTitle className="text-2xl text-red-800">No Youth Selected</CardTitle>
            <CardDescription className="text-red-600 text-lg">
              Please select a youth from the system to record behavior points.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-red-700 mb-4">
              Use the "Add Youth" button in the header to create a new youth profile, 
              or select an existing youth to begin tracking their daily points.
            </p>
          </CardContent>
        </Card>

        {/* Debug: latest 5 behavior_points rows and last error */}
        <div className="col-span-1 md:col-span-3">
          <div className="rounded-md border border-dashed bg-gray-50 p-3 text-xs text-gray-600">
            <div className="flex items-center justify-between">
              <span className="font-medium text-gray-700">Debug • behavior_points (latest 5)</span>
              <Button variant="ghost" size="sm" onClick={() => loadBehaviorPoints(youthId, 5)}>
                Refresh
              </Button>
            </div>
            {behaviorPointsError && (
              <div className="mt-2 text-red-600">Last error: {behaviorPointsError}</div>
            )}
            <div className="mt-2 grid gap-1">
              {pointEntries.slice(0, 5).map((row) => (
                <div key={row.id} className="flex flex-wrap items-center justify-between rounded bg-white/70 px-2 py-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-800">{row.date ? format(new Date(row.date), 'yyyy-MM-dd') : '—'}</span>
                    <span className="text-gray-500">•</span>
                    <span>Total: {row.totalPoints ?? 0}</span>
                  </div>
                  <span className="text-gray-400">id: {row.id}</span>
                </div>
              ))}
              {pointEntries.length === 0 && (
                <div className="text-gray-500">No rows found for this youth.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Get current level data
  const getCurrentLevel = () => {
    return levelsData.find(level => level.level === youth.level) || levelsData[0];
  };

  const getNextLevel = () => {
    const nextLevelIndex = youth.level + 1;
    return levelsData.find(level => level.level === nextLevelIndex);
  };

  const currentLevel = getCurrentLevel();
  const nextLevel = getNextLevel();

  // Track current-level total points locally so UI updates immediately
  const [currentTotal, setCurrentTotal] = useState<number>(youth.pointTotal || 0);
  const totalEarned = useMemo(() => {
    try {
      return (pointEntries || []).reduce((sum, entry) => sum + (entry.totalPoints || 0), 0);
    } catch {
      return 0;
    }
  }, [pointEntries]);

  useEffect(() => {
    setCurrentTotal(youth.pointTotal || 0);
  }, [youth.pointTotal]);

  // If the stored currentTotal is 0 but we clearly have entries,
  // reconcile by using the derived sum and persist it once.
  // Skip this reconciliation if we just reset points to prevent conflicts
  useEffect(() => {
    if ((youth.pointTotal || 0) === 0 && totalEarned > 0 && currentTotal !== 0 && !isResetting) {
      setCurrentTotal(totalEarned);
      // Best-effort persist; ignore errors in UI
      updateYouth(youthId, { pointTotal: totalEarned as any }).catch(() => {});
    }
  }, [totalEarned, currentTotal, isResetting]);

  const displayTotal = currentTotal || totalEarned;

  // Format points for display (with commas)
  const formatPoints = (points: number) => {
    if (points === Infinity) return "N/A";
    return points.toLocaleString();
  };

  // Validate points input
  const validatePointsInput = (value: string): string => {
    const points = parseInt(value.trim(), 10);
    
    if (isNaN(points) || value.trim() === '') {
      return "Please enter a valid number for daily points.";
    }
    
    if (points < 0) {
      return "Points cannot be negative. Please enter 0 or a positive value in thousands. 😊";
    }
    
    if (points > 0) {
      if (points < 1000) {
        return `Positive points must be 1000 or more. Did you mean ${points * 1000}? Please use multiples of 1000. 👍`;
      }
      if (points % 1000 !== 0) {
        return "Points must be in multiples of 1,000 (e.g., 1000, 25000). Please adjust your entry. ✨";
      }
    }
    
    if (points > MAX_DAILY_POINTS) {
      return `Points cannot exceed ${formatPoints(MAX_DAILY_POINTS)}. Please check your entry. 🤔`;
    }
    
    return "";
  };

  useEffect(() => {
    if (youthId) {
      loadBehaviorPoints(youthId);
      setFormData(prev => ({ ...prev, onSubsystem: youth.onSubsystem || false }));
    }
  }, [youthId, youth]);

  useEffect(() => {
    calculateWeeklyAverages(pointEntries);
    setIsLoading(false);
  }, [pointEntries]);

  const calculateWeeklyAverages = (entries: BehaviorPoints[]) => {
    const startOfCurrentWeek = startOfWeek(new Date());
    const endOfCurrentWeek = endOfWeek(new Date());
    
    const thisWeekEntries = entries.filter(entry => {
      const entryDate = new Date(entry.date);
      return entryDate >= startOfCurrentWeek && entryDate <= endOfCurrentWeek;
    });
    
    const totalPoints = thisWeekEntries.reduce((sum, entry) => sum + entry.totalPoints, 0);
    const daysRecorded = thisWeekEntries.length;
    const averagePointsPerDay = daysRecorded > 0 ? totalPoints / daysRecorded : 0;
    
    setWeeklyAverages({
      averagePointsPerDay,
      totalPointsThisWeek: totalPoints,
      daysRecorded,
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    if (name === "dailyPoints") {
      const numValue = parseInt(value) || 0;
      setFormData(prev => ({ ...prev, [name]: numValue }));
      
      // Clear previous error and validate
      setPointsError("");
      if (value.trim()) {
        const error = validatePointsInput(value);
        setPointsError(error);
      }
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
    
    // Mark as having unsaved changes and trigger auto-save
    setHasUnsavedChanges(true);
    triggerAutoSave();
  };

  // Auto-save functionality
  const triggerAutoSave = () => {
    // Clear existing timer
    if (autoSaveTimer) {
      clearTimeout(autoSaveTimer);
    }
    
    // Set new timer for 2 seconds after user stops typing
    const timer = setTimeout(() => {
      autoSave();
    }, 2000);
    
    setAutoSaveTimer(timer);
  };

  const autoSave = async () => {
    if (!hasUnsavedChanges || isAutoSaving) return;
    
    // Don't auto-save if there are validation errors
    const error = validatePointsInput(formData.dailyPoints.toString());
    if (error) return;
    
    try {
      setIsAutoSaving(true);
      
      // Save to localStorage as draft
      const draftKey = `behavior-draft-${youthId}-${format(selectedDate, 'yyyy-MM-dd')}`;
      localStorage.setItem(draftKey, JSON.stringify({
        ...formData,
        savedAt: new Date().toISOString()
      }));
      
      setHasUnsavedChanges(false);
      
      // Show subtle success indicator
      toast.success("Draft auto-saved", { duration: 1000 });
    } catch (error) {
      console.error("Auto-save failed:", error);
      // Log more details for debugging
      if (error instanceof Error) {
        console.error('Error details:', {
          message: error.message,
          name: error.name,
          stack: error.stack
        })
      }
      toast.error(error instanceof Error ? error.message : "Failed to save behavior data. Please try again.");
    } finally {
      setIsAutoSaving(false);
    }
  };

  // Load draft on component mount
  useEffect(() => {
    const draftKey = `behavior-draft-${youthId}-${format(selectedDate, 'yyyy-MM-dd')}`;
    const draft = localStorage.getItem(draftKey);
    
    if (draft) {
      try {
        const draftData = JSON.parse(draft);
        setFormData(prev => ({
          ...prev,
          dailyPoints: draftData.dailyPoints || 0,
          comments: draftData.comments || "",
          staffName: draftData.staffName || ""
        }));
        setHasUnsavedChanges(true);
        toast.info("Draft loaded from auto-save", { duration: 2000 });
      } catch (error) {
        console.error("Failed to load draft:", error);
      }
    }
  }, [youthId, selectedDate]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimer) {
        clearTimeout(autoSaveTimer);
      }
    };
  }, [autoSaveTimer]);

  const handleSubsystemChange = (checked: boolean) => {
    const newStatusText = checked ? 'ON' : 'OFF';
    const confirmationMessage = `You are about to change ${youth.firstName} ${youth.lastName}'s subsystem status to '${newStatusText}' as of ${new Date().toLocaleString()}. This will be recorded. Proceed?`;
    
    if (confirm(confirmationMessage)) {
      setFormData(prev => ({ ...prev, onSubsystem: checked }));
      
      const historyEntry: SubsystemHistoryEntry = {
        status: checked ? 'on' : 'off',
        date: new Date().toLocaleString(),
        recordedBy: 'System User'
      };
      
      setSubsystemHistory(prev => [...prev, historyEntry]);
      
      toast.success(`Subsystem status for ${youth.firstName} ${youth.lastName} changed to ${newStatusText} and recorded.`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate points before submission
    const error = validatePointsInput(formData.dailyPoints.toString());
    if (error) {
      setPointsError(error);
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      const dateString = format(selectedDate, 'yyyy-MM-dd')
      const prevForDate = await getBehaviorPointsForDate(youthId, dateString)

      const pointEntry = {
        youth_id: youthId,
        date: dateString,
        morningPoints: 0,
        afternoonPoints: 0,
        eveningPoints: 0,
        totalPoints: Number(formData.dailyPoints) || 0, // Ensure numeric
        comments: formData.comments,
      };
      
      const saved = await saveBehaviorPoints(pointEntry);
      // Update youth's in-level total based on delta for the date
      const old = prevForDate?.totalPoints || 0
      const delta = (saved?.totalPoints || 0) - old
      if (delta !== 0) {
        const current = youth.pointTotal || 0
        const nextTotal = Math.max(0, current + delta)
        setCurrentTotal(nextTotal)
        
        // Update restriction/subsystem progress if active
        const updates: any = { pointTotal: nextTotal };
        
        // Check restriction progress
        if (youth.restrictionLevel && delta > 0) {
          const restrictionEarned = (youth.restrictionPointsEarned || 0) + delta;
          updates.restrictionPointsEarned = restrictionEarned;
          
          // Check if restriction goal met
          if (restrictionEarned >= (youth.restrictionPointsRequired || 0)) {
            updates.restrictionLevel = null;
            updates.restrictionPointsRequired = null;
            updates.restrictionStartDate = null;
            updates.restrictionPointsEarned = 0;
            updates.restrictionReason = null;
            toast.success(`🎉 Restriction completed! Earned ${formatPoints(restrictionEarned)} points!`);
          }
        }
        
        // Check subsystem progress
        if (youth.subsystemActive && delta > 0) {
          const subsystemEarned = (youth.subsystemPointsEarned || 0) + delta;
          updates.subsystemPointsEarned = subsystemEarned;
          
          // Check if subsystem goal met
          if (subsystemEarned >= (youth.subsystemPointsRequired || 0)) {
            updates.subsystemActive = false;
            updates.subsystemPointsRequired = null;
            updates.subsystemStartDate = null;
            updates.subsystemPointsEarned = 0;
            updates.subsystemReason = null;
            toast.success(`🎉 Subsystem completed! Earned ${formatPoints(subsystemEarned)} points!`);
          }
        }
        
        await updateYouth(youthId, updates)
        // Trigger parent component refresh
        onYouthUpdated?.()
      }
      // Ensure UI reflects latest data
      await loadBehaviorPoints(youthId);
      
      // Update youth's subsystem status if changed
      if (formData.onSubsystem !== youth.onSubsystem) {
        await updateYouth(youthId, { onSubsystem: formData.onSubsystem });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("Error saving behavior points:", message);
      toast.error(`Failed to save behavior points: ${message}`);
      return; // Exit early on error
    } finally {
      setIsSubmitting(false);
    }
    
    // Check if points meet privilege requirement
    if (formData.dailyPoints >= currentLevel.dailyPointsForPrivileges) {
      toast.success(`Great job! ${formatPoints(formData.dailyPoints)} points saved successfully. Privileges earned for tomorrow. 🎉`);
    } else {
      toast.warning(`Points saved (${formatPoints(formData.dailyPoints)}), but below privilege requirement of ${formatPoints(currentLevel.dailyPointsForPrivileges)} points.`);
    }
    
    // Clear draft and reset form
    const draftKey = `behavior-draft-${youthId}-${format(selectedDate, 'yyyy-MM-dd')}`;
    localStorage.removeItem(draftKey);
    
    setFormData({
      dailyPoints: 0,
      comments: "",
      onSubsystem: formData.onSubsystem,
      staffName: "",
    });
    setPointsError("");
    setHasUnsavedChanges(false);
    
    loadBehaviorPoints(youthId);
  };

  const handleLevelUp = async () => {
    if (nextLevel) {
      try {
        // Update youth level and reset points
        await updateYouth(youthId, {
          level: youth.level + 1,
          pointTotal: 0  // Reset points to 0 when leveling up
        });

        toast.success(`Congratulations! Advanced to ${nextLevel.name}! Points reset to 0.`);

        // Update the local youth object to reflect the changes
        youth.level = youth.level + 1;
        youth.pointTotal = 0;

        // Force component re-render by updating form data
        setFormData(prev => ({ ...prev, dailyPoints: 0 }));

        // Trigger parent component refresh
        onYouthUpdated?.();
      } catch (error) {
        console.error("Error updating level:", error);
        const errorMessage = error instanceof Error ? error.message : "Failed to update level";
        toast.error(errorMessage);
      }
    }
  };

  const handleLevelDemotion = async () => {
    if (youth.level > 1) {
      try {
        // Update youth level and reset points
        await updateYouth(youthId, {
          level: youth.level - 1,
          pointTotal: 0  // Reset points to 0 when demoting
        });

        const previousLevel = levelsData.find(level => level.level === youth.level - 1);
        toast.warning(`Demoted to ${previousLevel?.name || `Level ${youth.level - 1}`}. Points reset to 0.`);

        // Update the local youth object to reflect the changes
        youth.level = youth.level - 1;
        youth.pointTotal = 0;

        // Force component re-render by updating form data
        setFormData(prev => ({ ...prev, dailyPoints: 0 }));

        // Trigger parent component refresh
        onYouthUpdated?.();
      } catch (error) {
        console.error("Error updating level:", error);
        const errorMessage = error instanceof Error ? error.message : "Failed to update level";
        toast.error(errorMessage);
      }
    }
  };

  // Restriction management
  const handlePlaceOnRestriction = async () => {
    if (!restrictionLevel || !restrictionPoints) {
      toast.error("Please select restriction level and enter points required");
      return;
    }

    try {
      await updateYouth(youthId, {
        restrictionLevel: restrictionLevel,
        restrictionPointsRequired: parseInt(restrictionPoints),
        restrictionStartDate: new Date().toISOString(),
        restrictionPointsEarned: 0,
        restrictionReason: restrictionReason || "N/A"
      });

      toast.success(`Placed on Restriction Level ${restrictionLevel}. Must earn ${restrictionPoints} points to get off.`);
      setShowRestrictionDialog(false);
      setRestrictionLevel(null);
      setRestrictionPoints("");
      setRestrictionReason("");
      onYouthUpdated?.();
    } catch (error) {
      console.error("Error placing on restriction:", error);
      toast.error("Failed to place on restriction");
    }
  };

  const handleRemoveRestriction = async () => {
    try {
      await updateYouth(youthId, {
        restrictionLevel: null,
        restrictionPointsRequired: null,
        restrictionStartDate: null,
        restrictionPointsEarned: 0,
        restrictionReason: null
      });

      toast.success("Restriction removed");
      onYouthUpdated?.();
    } catch (error) {
      console.error("Error removing restriction:", error);
      toast.error("Failed to remove restriction");
    }
  };

  // Subsystem management
  const handlePlaceOnSubsystem = async () => {
    if (!subsystemPoints) {
      toast.error("Please enter points required");
      return;
    }

    try {
      await updateYouth(youthId, {
        subsystemActive: true,
        subsystemPointsRequired: parseInt(subsystemPoints),
        subsystemStartDate: new Date().toISOString(),
        subsystemPointsEarned: 0,
        subsystemReason: subsystemReason || "N/A"
      });

      toast.success(`Placed on Subsystem. Must earn ${subsystemPoints} points to get off.`);
      setShowSubsystemDialog(false);
      setSubsystemPoints("");
      setSubsystemReason("");
      onYouthUpdated?.();
    } catch (error) {
      console.error("Error placing on subsystem:", error);
      toast.error("Failed to place on subsystem");
    }
  };

  const handleRemoveSubsystem = async () => {
    try {
      await updateYouth(youthId, {
        subsystemActive: false,
        subsystemPointsRequired: null,
        subsystemStartDate: null,
        subsystemPointsEarned: 0,
        subsystemReason: null
      });

      toast.success("Subsystem removed");
      onYouthUpdated?.();
    } catch (error) {
      console.error("Error removing subsystem:", error);
      toast.error("Failed to remove subsystem");
    }
  };

  const handlePrintCard = () => {
    generateIndividualizedReport();
    setTimeout(() => {
      window.print();
    }, 100);
  };

  const handleExportData = async () => {
    try {
      const entries = pointEntries;
      const csvData = generateCSVData(entries);
      downloadCSV(csvData, `${youth.firstName}_${youth.lastName}_behavior_data.csv`);
      toast.success("Behavior data exported successfully!");
    } catch (error) {
      console.error("Error exporting data:", error);
      toast.error("Failed to export behavior data");
    }
  };

  const generateCSVData = (entries: BehaviorPoints[]) => {
    const headers = ['Date', 'Morning Points', 'Afternoon Points', 'Evening Points', 'Total Points', 'Comments'];
    const rows = entries.map(entry => [
      format(new Date(entry.date), 'yyyy-MM-dd'),
      entry.morningPoints || 0,
      entry.afternoonPoints || 0,
      entry.eveningPoints || 0,
      entry.totalPoints || 0,
      `"${(entry.comments || '').replace(/"/g, '""')}"`
    ]);
    
    return [headers, ...rows].map(row => row.join(',')).join('\n');
  };

  const downloadCSV = (csvData: string, filename: string) => {
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const generateIndividualizedReport = () => {
    const reportData = {
      youth: youth,
      currentDate: format(new Date(), 'MMMM dd, yyyy'),
      currentTime: format(new Date(), 'h:mm a'),
      dailyPoints: formData.dailyPoints,
      totalPoints: youth.pointTotal || 0,
      currentLevel: currentLevel,
      weeklyAverages: weeklyAverages,
      recentEntries: pointEntries.slice(-7), // Last 7 entries
      comments: formData.comments,
      onSubsystem: formData.onSubsystem
    };
    
    // Store report data for printing
    (window as any).__behaviorReportData = reportData;
  };

  const getPointsByDate = (dateString: string) => {
    const entry = pointEntries.find(entry => format(new Date(entry.date), 'yyyy-MM-dd') === dateString);
    return entry ? entry.totalPoints : 0;
  };

  // Chart data for the weekly view
  const generateChartData = () => {
    const start = startOfWeek(new Date(), { weekStartsOn: 0 });
    const end = endOfWeek(new Date(), { weekStartsOn: 0 });
    
    const days = eachDayOfInterval({ start, end });
    
    return days.map(day => {
      const dateString = format(day, 'yyyy-MM-dd');
      const points = getPointsByDate(dateString);
      
      return {
        day: format(day, 'EEE'),
        fullDate: format(day, 'MMM d'),
        points,
        threshold: currentLevel.dailyPointsForPrivileges,
      };
    });
  };

  const isEligibleForLevelUp = () => {
    return displayTotal >= currentLevel.cumulativePointsRequired;
  };

  const renderSubsystemLog = () => {
    return (
      <Dialog open={showSubsystemLog} onOpenChange={setShowSubsystemLog}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
            <History size={16} className="mr-2" />
            Subsystem Log
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Subsystem Change Log</DialogTitle>
            <DialogDescription>
              Review the history of subsystem status changes for {youth.firstName} {youth.lastName}.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-96 overflow-y-auto">
            {subsystemHistory.length > 0 ? (
              <ul className="space-y-2">
                {[...subsystemHistory].reverse().map((entry, index) => (
                  <li key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-md">
                    <span className={`font-medium ${entry.status === 'on' ? 'text-green-600' : 'text-red-600'}`}>
                      {entry.status.toUpperCase()}
                    </span>
                    <span className="text-sm text-gray-600">
                      {entry.date} - by {entry.recordedBy}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500 text-center">No subsystem changes recorded yet.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  const getLastSubsystemChange = () => {
    if (subsystemHistory.length === 0) return "(No subsystem history)";
    const lastEntry = subsystemHistory[subsystemHistory.length - 1];
    const statusText = lastEntry.status === 'on' ? 'On Subsystem' : 'Off Subsystem';
    const datePart = lastEntry.date.split(',')[0];
    return `(${statusText} since ${datePart})`;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start flex-col sm:flex-row">
        <div>
          <h2 className="text-2xl font-bold mb-2">Behavior Point System</h2>
          <p className="text-gray-600 mb-4">Record daily behavior points and track progress over time.</p>
        </div>
        
        <div className="flex space-x-2 mb-4 sm:mb-0">
          <Button variant="outline" size="sm" onClick={handlePrintCard}>
            <FileText size={16} className="mr-2" />
            Print Card
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportData}>
            <Download size={16} className="mr-2" />
            Export Data
          </Button>
          {renderSubsystemLog()}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="col-span-1">
          <CardHeader className="bg-blue-50">
            <CardTitle>Level Information</CardTitle>
            <CardDescription>Current status and requirements</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium text-gray-500">Current Level</Label>
                <p className="text-2xl font-bold">
                  {currentLevel.name}
                  {formData.onSubsystem && <span className="text-sm text-orange-600 ml-2">(Subsystem)</span>}
                </p>
                <p className="text-xs text-gray-500 mt-1">{getLastSubsystemChange()}</p>
              </div>
              
              <div>
                <Label className="text-sm font-medium text-gray-500">Required Daily Points for Privileges</Label>
                <p className="text-lg font-semibold">{formatPoints(currentLevel.dailyPointsForPrivileges)} points</p>
              </div>
              
              {nextLevel && (
                <div>
                  <Label className="text-sm font-medium text-gray-500">Points for Next Level</Label>
                  <p className="text-lg font-semibold">
                    {formatPoints(displayTotal)} / {formatPoints(currentLevel.cumulativePointsRequired)}
                  </p>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                    <div 
                      className={`h-2 rounded-full transition-all duration-300 ${
                        isEligibleForLevelUp() ? 'bg-green-500 animate-pulse' : 'bg-blue-500'
                      }`}
                      style={{ 
                        width: `${Math.min(100, (displayTotal / currentLevel.cumulativePointsRequired) * 100)}%` 
                      }}
                    ></div>
                  </div>
                  {isEligibleForLevelUp() && (
                    <p className="text-xs text-green-600 font-medium mt-1 animate-pulse">
                      🎉 Ready to level up!
                    </p>
                  )}
                </div>
              )}
              
              <div>
                <Label className="text-sm font-medium text-gray-500">Weekly Average</Label>
                <p className="text-lg font-semibold">
                  {formatPoints(weeklyAverages.averagePointsPerDay)} points
                  <span className="text-sm font-normal text-gray-500 ml-2">
                    ({weeklyAverages.daysRecorded}/7 days)
                  </span>
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                <Button 
                  size="sm" 
                  onClick={handleLevelUp}
                  disabled={!nextLevel}
                  className={`flex-1 ${isEligibleForLevelUp() && nextLevel ? 'bg-green-600 hover:bg-green-700 text-white animate-pulse' : ''}`}
                >
                  <TrendingUp size={14} className="mr-1" />
                  Level Up
                </Button>
                <Button 
                  size="sm" 
                  variant="destructive"
                  onClick={handleLevelDemotion}
                  disabled={youth.level <= 1}
                  className="flex-1"
                >
                  <TrendingDown size={14} className="mr-1" />
                  Demote
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    if (confirm(`Reset ALL points for ${youth.firstName} ${youth.lastName} to 0? This will delete all behavior point entries and cannot be undone.`)) {
                      try {
                        setIsResetting(true);
                        setCurrentTotal(0);
                        
                        // Delete all behavior point entries
                        await deleteAllBehaviorPoints(youthId);
                        
                        // Reset youth total points
                        await updateYouth(youthId, { pointTotal: 0 as any });
                        
                        // Clear any auto-save drafts
                        const draftKey = `behavior-draft-${youthId}-${format(new Date(), 'yyyy-MM-dd')}`;
                        localStorage.removeItem(draftKey);
                        
                        // Reset form data
                        setFormData(prev => ({
                          ...prev,
                          dailyPoints: 0,
                          comments: "",
                          staffName: ""
                        }));
                        
                        // Reload behavior points to refresh the display
                        await loadBehaviorPoints(youthId);
                        
                        // Trigger parent component refresh
                        onYouthUpdated?.();
                        
                        toast.success('All points have been reset to 0.');
                      } catch (err) {
                        console.error('Failed to reset points:', err);
                        toast.error('Failed to reset points.');
                      } finally {
                        // Clear reset flag after a short delay to ensure state has settled
                        setTimeout(() => setIsResetting(false), 1000);
                      }
                    }
                  }}
                  className="flex-1"
                >
                  Reset Points
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-1 md:col-span-2">
          <Tabs defaultValue="daily" onValueChange={setActiveTab}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Behavior Card</CardTitle>
                <TabsList>
                  <TabsTrigger value="daily">Daily Entry</TabsTrigger>
                  <TabsTrigger value="weekly">Weekly View</TabsTrigger>
                </TabsList>
              </div>
              <CardDescription className="flex items-center gap-2">
                {activeTab === "daily" 
                  ? "Record points earned for the day" 
                  : "View point trends over the past week"}
                {hasUnsavedChanges && (
                  <span className="text-orange-600 text-sm font-medium flex items-center gap-1">
                    • Unsaved changes
                    {isAutoSaving && <span className="text-xs">(saving...)</span>}
                  </span>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TabsContent value="daily" className="space-y-4">
                <form onSubmit={handleSubmit}>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="date">Date</Label>
                        <Input
                          id="date"
                          name="date"
                          type="date"
                          value={format(selectedDate, 'yyyy-MM-dd')}
                          onChange={(e) => {
                            // Fix timezone issue by creating date in local timezone
                            const dateValue = e.target.value;
                            if (dateValue) {
                              // Parse the date string and create a local date
                              const [year, month, day] = dateValue.split('-').map(Number);
                              const localDate = new Date(year, month - 1, day); // month is 0-indexed
                              setSelectedDate(localDate);
                            }
                          }}
                          className="max-w-xs"
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="staffName">Staff Name</Label>
                        <Input
                          id="staffName"
                          name="staffName"
                          type="text"
                          placeholder="Enter staff name"
                          value={formData.staffName || ''}
                          onChange={handleInputChange}
                          className="max-w-xs"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <Label htmlFor="dailyPoints">Daily Points Earned (e.g., 1000, 15000, up to 105000)</Label>
                      <Input
                        id="dailyPoints"
                        name="dailyPoints"
                        type="number"
                        placeholder="Enter points in thousands"
                        value={formData.dailyPoints || ''}
                        onChange={handleInputChange}
                        className="max-w-xs"
                      />
                      {pointsError && (
                        <p className="text-red-500 text-sm mt-1 font-medium">{pointsError}</p>
                      )}
                    </div>
                    
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Label htmlFor="totalPoints">Total Daily Points</Label>
                        <span className="text-xl font-bold">
                          {formatPoints(formData.dailyPoints)} / {formatPoints(MAX_DAILY_POINTS)}
                        </span>
                      </div>
                      
                      <div className="w-full bg-gray-200 rounded-full h-4">
                        <div 
                          className={`h-4 rounded-full ${
                            formData.dailyPoints >= currentLevel.dailyPointsForPrivileges 
                              ? "bg-green-500" 
                              : "bg-red-500"
                          }`}
                          style={{ 
                            width: `${Math.min(100, (formData.dailyPoints / MAX_DAILY_POINTS) * 100)}%` 
                          }}
                        ></div>
                      </div>
                      
                      <p className="text-sm text-gray-500 mt-1">
                        Required for privileges: {formatPoints(currentLevel.dailyPointsForPrivileges)} points
                      </p>
                    </div>
                    
                    {false && (
                      <div>
                        <Label htmlFor="comments">Comments</Label>
                        <Textarea
                          id="comments"
                          name="comments"
                          placeholder="Add notes about behavior, concerns, or achievements..."
                          value={formData.comments}
                          onChange={handleInputChange}
                          rows={3}
                        />
                      </div>
                    )}

                    <Button type="submit" disabled={isSubmitting || !!pointsError} className="w-full">
                      {isSubmitting ? "Saving..." : "Submit Daily Points"}
                    </Button>
                  </div>
                </form>
              </TabsContent>
              
              <TabsContent value="weekly">
                <div className="space-y-4">
                  <div className="bg-gray-50 p-4 rounded-md">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3">
                      <p className="font-medium">Current Week: {format(startOfWeek(new Date()), 'MMM d')} - {format(endOfWeek(new Date()), 'MMM d, yyyy')}</p>
                      
                      <div className="flex items-center mt-2 sm:mt-0">
                        <Calendar size={16} className="mr-1.5 text-gray-500" />
                        <Button variant="ghost" size="sm" className="h-8 px-2 text-xs">
                          View Previous Weeks
                        </Button>
                      </div>
                    </div>
                    
                    <div style={{ width: '100%', height: 250 }}>
                      <ResponsiveContainer>
                        <LineChart data={generateChartData()}>
                          <XAxis dataKey="day" />
                          <YAxis domain={[0, MAX_DAILY_POINTS]} />
                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                          <Tooltip formatter={(value) => [`${formatPoints(Number(value))} points`, 'Points']} />
                          <Line 
                            type="monotone" 
                            dataKey="points" 
                            stroke="#0066CC" 
                            strokeWidth={2} 
                            dot={{ r: 4 }} 
                          />
                          <Line 
                            type="monotone" 
                            dataKey="threshold" 
                            stroke="#FF6B6B" 
                            strokeWidth={2} 
                            strokeDasharray="5 5" 
                            dot={false}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                    
                    <div className="flex items-center justify-center space-x-6 mt-2">
                      <div className="flex items-center">
                        <div className="w-3 h-3 bg-blue-600 rounded-full mr-2"></div>
                        <span className="text-sm">Daily Points</span>
                      </div>
                      <div className="flex items-center">
                        <div className="w-3 h-3 bg-red-400 rounded-full mr-2"></div>
                        <span className="text-sm">Privilege Threshold</span>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="font-medium mb-2">Recent Point History</h3>
                    <div className="space-y-2">
                      {isLoading ? (
                        <p className="text-gray-500 text-center">Loading point history...</p>
                      ) : pointEntries.length > 0 ? (
                        pointEntries.slice(0, 5).map((entry, index) => (
                          <div key={entry.id || index} className="flex items-center justify-between p-3 bg-white border rounded-md">
                            <div>
                              <p className="font-medium">{format(new Date(entry.date), 'MMM d, yyyy')}</p>
                              <p className="text-sm text-gray-500">
                                Points: {formatPoints(entry.totalPoints)}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className={`text-lg font-bold ${entry.totalPoints >= currentLevel.dailyPointsForPrivileges ? 'text-green-600' : 'text-red-600'}`}>
                                {formatPoints(entry.totalPoints)}
                              </p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-gray-500 text-center">No point history available</p>
                      )}
                    </div>
                    
                    {pointEntries.length > 5 && (
                      <Button variant="ghost" size="sm" className="mt-2 w-full">
                        View All Point History
                        <ArrowRight size={14} className="ml-2" />
                      </Button>
                    )}
                  </div>
                </div>
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>

        {/* Restriction & Subsystem Management */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 print:hidden">
          {/* Restriction Card */}
          <Card className={youth.restrictionLevel ? "border-2 border-orange-500" : ""}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Restriction Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              {youth.restrictionLevel ? (
                <div className="space-y-3">
                  <Alert className="bg-orange-50 border-orange-200">
                    <AlertCircle className="h-4 w-4 text-orange-600" />
                    <AlertTitle className="text-orange-800">On Restriction Level {youth.restrictionLevel}</AlertTitle>
                    <AlertDescription className="text-orange-700">
                      Placed on {youth.restrictionStartDate ? format(new Date(youth.restrictionStartDate), 'MMM dd, yyyy') : 'N/A'}
                    </AlertDescription>
                  </Alert>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">Progress:</span>
                      <span>{youth.restrictionPointsEarned || 0} / {youth.restrictionPointsRequired || 0} points</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div 
                        className="bg-orange-500 h-3 rounded-full transition-all"
                        style={{ 
                          width: `${Math.min(100, ((youth.restrictionPointsEarned || 0) / (youth.restrictionPointsRequired || 1)) * 100)}%` 
                        }}
                      />
                    </div>
                    {youth.restrictionReason && (
                      <p className="text-sm text-gray-600">
                        <strong>Reason:</strong> {youth.restrictionReason}
                      </p>
                    )}
                  </div>

                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleRemoveRestriction}
                    className="w-full"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Remove Restriction
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-gray-600">Youth is not currently on restriction</p>
                  <Dialog open={showRestrictionDialog} onOpenChange={setShowRestrictionDialog}>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="w-full">
                        <Shield className="w-4 h-4 mr-2" />
                        Place on Restriction
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Place on Restriction</DialogTitle>
                        <DialogDescription>
                          Set restriction level and points required to earn privileges back
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div>
                          <Label>Restriction Level</Label>
                          <Select 
                            value={restrictionLevel?.toString() || ""} 
                            onValueChange={(val) => setRestrictionLevel(parseInt(val) as 1 | 2)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select level..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="1">Level 1 (Less Restrictive)</SelectItem>
                              <SelectItem value="2">Level 2 (More Restrictive)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Points Required to Get Off</Label>
                          <Input
                            type="number"
                            placeholder="e.g., 50000"
                            value={restrictionPoints}
                            onChange={(e) => setRestrictionPoints(e.target.value)}
                          />
                          <p className="text-xs text-gray-500 mt-1">Enter points in thousands (e.g., 50000 = 50k)</p>
                        </div>
                        <div>
                          <Label>Reason (Optional)</Label>
                          <Textarea
                            placeholder="Reason for restriction..."
                            value={restrictionReason}
                            onChange={(e) => setRestrictionReason(e.target.value)}
                            rows={3}
                          />
                        </div>
                        <Button onClick={handlePlaceOnRestriction} className="w-full">
                          Confirm Restriction
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Subsystem Card */}
          <Card className={youth.subsystemActive ? "border-2 border-red-500" : ""}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Ban className="w-5 h-5" />
                Subsystem Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              {youth.subsystemActive ? (
                <div className="space-y-3">
                  <Alert className="bg-red-50 border-red-200">
                    <AlertCircle className="h-4 w-4 text-red-600" />
                    <AlertTitle className="text-red-800">On Subsystem</AlertTitle>
                    <AlertDescription className="text-red-700">
                      Placed on {youth.subsystemStartDate ? format(new Date(youth.subsystemStartDate), 'MMM dd, yyyy') : 'N/A'}
                    </AlertDescription>
                  </Alert>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">Progress:</span>
                      <span>{youth.subsystemPointsEarned || 0} / {youth.subsystemPointsRequired || 0} points</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div 
                        className="bg-red-500 h-3 rounded-full transition-all"
                        style={{ 
                          width: `${Math.min(100, ((youth.subsystemPointsEarned || 0) / (youth.subsystemPointsRequired || 1)) * 100)}%` 
                        }}
                      />
                    </div>
                    {youth.subsystemReason && (
                      <p className="text-sm text-gray-600">
                        <strong>Reason:</strong> {youth.subsystemReason}
                      </p>
                    )}
                  </div>

                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleRemoveSubsystem}
                    className="w-full"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Remove from Subsystem
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-gray-600">Youth is not currently on subsystem</p>
                  <Dialog open={showSubsystemDialog} onOpenChange={setShowSubsystemDialog}>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="w-full">
                        <Ban className="w-4 h-4 mr-2" />
                        Place on Subsystem
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Place on Subsystem</DialogTitle>
                        <DialogDescription>
                          Set points required to earn subsystem completion
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div>
                          <Label>Points Required to Get Off</Label>
                          <Input
                            type="number"
                            placeholder="e.g., 30000"
                            value={subsystemPoints}
                            onChange={(e) => setSubsystemPoints(e.target.value)}
                          />
                          <p className="text-xs text-gray-500 mt-1">Enter points in thousands (e.g., 30000 = 30k)</p>
                        </div>
                        <div>
                          <Label>Reason (Optional)</Label>
                          <Textarea
                            placeholder="Reason for subsystem..."
                            value={subsystemReason}
                            onChange={(e) => setSubsystemReason(e.target.value)}
                            rows={3}
                          />
                        </div>
                        <Button onClick={handlePlaceOnSubsystem} className="w-full">
                          Confirm Subsystem
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Print-only individualized report section */}
      <div className="print-only" style={{ display: 'none' }}>
        <div className="print-report">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold">Heartland Care Compass</h1>
            <h2 className="text-xl">Daily Behavior Report</h2>
            <p className="text-gray-600">Generated on {format(new Date(), 'MMMM dd, yyyy')} at {format(new Date(), 'h:mm a')}</p>
          </div>
          
          <div className="grid grid-cols-2 gap-6 mb-6">
            <div>
              <h3 className="font-bold text-lg mb-2">Youth Information</h3>
              <p><strong>Name:</strong> {youth.firstName} {youth.lastName}</p>
              <p><strong>Current Level:</strong> {currentLevel.name}</p>
              <p><strong>Total Points:</strong> {formatPoints(youth.pointTotal || 0)}</p>
              <p><strong>Subsystem Status:</strong> {formData.onSubsystem ? 'ON' : 'OFF'}</p>
            </div>
            
            <div>
              <h3 className="font-bold text-lg mb-2">Today's Performance</h3>
              <p><strong>Date:</strong> {format(selectedDate, 'MMMM dd, yyyy')}</p>
              <p><strong>Points Earned:</strong> {formatPoints(formData.dailyPoints)}</p>
              <p><strong>Privilege Threshold:</strong> {formatPoints(currentLevel.dailyPointsForPrivileges)}</p>
              <p><strong>Status:</strong> {formData.dailyPoints >= currentLevel.dailyPointsForPrivileges ? 
                <span className="text-green-600 font-bold">Privileges Earned ✓</span> : 
                <span className="text-red-600 font-bold">Below Threshold</span>}
              </p>
            </div>
          </div>
          
          <div className="mb-6">
            <h3 className="font-bold text-lg mb-2">Weekly Summary</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p><strong>Days Recorded:</strong> {weeklyAverages.daysRecorded}</p>
              </div>
              <div>
                <p><strong>Weekly Total:</strong> {formatPoints(weeklyAverages.totalPointsThisWeek)}</p>
              </div>
              <div>
                <p><strong>Daily Average:</strong> {formatPoints(Math.round(weeklyAverages.averagePointsPerDay))}</p>
              </div>
            </div>
          </div>
          
          <div className="mb-6">
            <h3 className="font-bold text-lg mb-2">Recent Point History (Last 7 Days)</h3>
            <table className="w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 p-2 text-left">Date</th>
                  <th className="border border-gray-300 p-2 text-left">Points Earned</th>
                  <th className="border border-gray-300 p-2 text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {pointEntries.slice(-7).map((entry, index) => (
                  <tr key={entry.id || index}>
                    <td className="border border-gray-300 p-2">{format(new Date(entry.date), 'MMM dd, yyyy')}</td>
                    <td className="border border-gray-300 p-2">{formatPoints(entry.totalPoints)}</td>
                    <td className="border border-gray-300 p-2">
                      {entry.totalPoints >= currentLevel.dailyPointsForPrivileges ? 
                        <span className="text-green-600">✓ Privileges</span> : 
                        <span className="text-red-600">Below Threshold</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {formData.comments && (
            <div className="mb-6">
              <h3 className="font-bold text-lg mb-2">Comments</h3>
              <p className="border border-gray-300 p-3 rounded">{formData.comments}</p>
            </div>
          )}
          
          <div className="mt-8 pt-4 border-t border-gray-300">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p><strong>Staff Signature:</strong> _________________________</p>
                <p className="text-sm text-gray-600 mt-1">Date: _______________</p>
              </div>
              <div>
                <p><strong>Supervisor Review:</strong> _________________________</p>
                <p className="text-sm text-gray-600 mt-1">Date: _______________</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
