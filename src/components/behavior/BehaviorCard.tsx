import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { format } from "date-fns";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, TrendingUp, TrendingDown, Users, History, Shield, Ban, X, CreditCard, RotateCcw } from "lucide-react";
import { useYouth } from "@/hooks/useSupabase";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface BehaviorCardProps {
  youthId: string;
  youth: any;
  onYouthUpdated?: () => void;
}

// Level system data
const levelsData = [
  { name: "Orientation", level: 0 },
  { name: "Level 1", level: 1 },
  { name: "Level 2", level: 2 },
  { name: "Level 3", level: 3 },
  { name: "Level 4", level: 4 },
  { name: "Level 5", level: 5 },
  { name: "Level 6", level: 6 },
  { name: "Level 7", level: 7 },
  { name: "Level 8", level: 8 },
  { name: "Level 9", level: 9 },
  { name: "Level 10", level: 10 },
];

interface SubsystemHistoryEntry {
  status: 'on' | 'off';
  date: string;
  recordedBy: string;
}

export const BehaviorCard = ({ youthId, youth, onYouthUpdated }: BehaviorCardProps) => {
  const { updateYouth } = useYouth();

  // Point management state
  const [correctedTotal, setCorrectedTotal] = useState("");
  const [cardPoints, setCardPoints] = useState("");
  const [isUpdatingPoints, setIsUpdatingPoints] = useState(false);

  // Restriction and subsystem state
  const [showRestrictionDialog, setShowRestrictionDialog] = useState(false);
  const [showSubsystemDialog, setShowSubsystemDialog] = useState(false);
  const [restrictionLevel, setRestrictionLevel] = useState<1 | 2 | null>(null);
  const [restrictionReason, setRestrictionReason] = useState("");
  const [subsystemReason, setSubsystemReason] = useState("");
  const [showSubsystemLog, setShowSubsystemLog] = useState(false);
  const [subsystemHistory] = useState<SubsystemHistoryEntry[]>([
    { status: 'off', date: new Date().toLocaleString(), recordedBy: 'System' }
  ]);

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
              Please select a youth from the system to manage level tracking.
            </CardDescription>
          </CardHeader>
        </Card>
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

  const handleLevelUp = async () => {
    if (nextLevel) {
      try {
        await updateYouth(youthId, {
          level: youth.level + 1,
        });

        toast.success(`Congratulations! Advanced to ${nextLevel.name}!`);
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
        await updateYouth(youthId, {
          level: youth.level - 1,
        });

        const previousLevel = levelsData.find(level => level.level === youth.level - 1);
        toast.warning(`Demoted to ${previousLevel?.name || `Level ${youth.level - 1}`}.`);
        onYouthUpdated?.();
      } catch (error) {
        console.error("Error updating level:", error);
        const errorMessage = error instanceof Error ? error.message : "Failed to update level";
        toast.error(errorMessage);
      }
    }
  };

  // Point management
  const handleSetCorrectedTotal = async () => {
    const val = parseInt(correctedTotal, 10);
    if (isNaN(val) || val < 0) {
      toast.error("Enter a valid non-negative number");
      return;
    }
    try {
      setIsUpdatingPoints(true);
      await updateYouth(youthId, { pointTotal: val });
      toast.success(`Point total set to ${val.toLocaleString()}`);
      setCorrectedTotal("");
      onYouthUpdated?.();
    } catch (error) {
      toast.error("Failed to update point total");
    } finally {
      setIsUpdatingPoints(false);
    }
  };

  const handleAddCardPoints = async () => {
    const val = parseInt(cardPoints, 10);
    if (isNaN(val) || val <= 0) {
      toast.error("Enter a positive number of points");
      return;
    }
    const currentTotal = youth.pointTotal ?? 0;
    const newTotal = currentTotal + val;
    try {
      setIsUpdatingPoints(true);
      await updateYouth(youthId, { pointTotal: newTotal });
      toast.success(`Added ${val.toLocaleString()} points — new total: ${newTotal.toLocaleString()}`);
      setCardPoints("");
      onYouthUpdated?.();
    } catch (error) {
      toast.error("Failed to add card points");
    } finally {
      setIsUpdatingPoints(false);
    }
  };

  // Restriction management
  const handlePlaceOnRestriction = async () => {
    if (!restrictionLevel) {
      toast.error("Please select restriction level");
      return;
    }

    try {
      await updateYouth(youthId, {
        restrictionLevel: restrictionLevel,
        restrictionStartDate: new Date().toISOString(),
        restrictionReason: restrictionReason || "N/A"
      });

      toast.success(`Placed on Restriction Level ${restrictionLevel}.`);
      setShowRestrictionDialog(false);
      setRestrictionLevel(null);
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
        restrictionStartDate: null,
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
    try {
      await updateYouth(youthId, {
        subsystemActive: true,
        subsystemStartDate: new Date().toISOString(),
        subsystemReason: subsystemReason || "N/A"
      });

      toast.success(`Placed on Subsystem.`);
      setShowSubsystemDialog(false);
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
        subsystemStartDate: null,
        subsystemReason: null
      });

      toast.success("Subsystem removed");
      onYouthUpdated?.();
    } catch (error) {
      console.error("Error removing subsystem:", error);
      toast.error("Failed to remove subsystem");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Level Tracking</h2>
        <p className="text-gray-600 mb-4">Manage level progression, restrictions, and subsystem status.</p>
      </div>

      {/* Level Information Card */}
      <Card>
        <CardHeader className="bg-blue-50">
          <CardTitle>Level Information</CardTitle>
          <CardDescription>Current level and progression</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium text-gray-500">Current Level</Label>
              <p className="text-2xl font-bold">{currentLevel.name}</p>
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                onClick={handleLevelUp}
                disabled={!nextLevel}
                className="flex-1 bg-gradient-to-r from-red-900 to-red-800 hover:from-red-800 hover:to-red-700 text-white font-semibold py-6 shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <TrendingUp size={18} className="mr-2" />
                Level Up
              </Button>
              <Button
                onClick={handleLevelDemotion}
                disabled={youth.level <= 1}
                className="flex-1 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white font-semibold py-6 shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <TrendingDown size={18} className="mr-2" />
                Demote
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Point Management Card */}
      <Card>
        <CardHeader className="bg-green-50">
          <CardTitle>Point Management</CardTitle>
          <CardDescription>
            Current total: <span className="font-bold text-green-800">{(youth.pointTotal ?? 0).toLocaleString()} pts</span>
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* Add card points */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <CreditCard size={14} />
                Add Card Points
              </Label>
              <p className="text-xs text-gray-500">Enter the points from a physical card to add to the grand total.</p>
              <div className="flex gap-2">
                <Input
                  type="number"
                  min="1"
                  placeholder="e.g. 350"
                  value={cardPoints}
                  onChange={(e) => setCardPoints(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddCardPoints()}
                  className="flex-1"
                />
                <Button
                  onClick={handleAddCardPoints}
                  disabled={isUpdatingPoints || !cardPoints}
                  className="bg-green-700 hover:bg-green-600 text-white"
                >
                  Add
                </Button>
              </div>
            </div>

            {/* Set corrected total */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <RotateCcw size={14} />
                Set Corrected Total
              </Label>
              <p className="text-xs text-gray-500">Overwrite the current total with an exact corrected number.</p>
              <div className="flex gap-2">
                <Input
                  type="number"
                  min="0"
                  placeholder="e.g. 2400"
                  value={correctedTotal}
                  onChange={(e) => setCorrectedTotal(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSetCorrectedTotal()}
                  className="flex-1"
                />
                <Button
                  onClick={handleSetCorrectedTotal}
                  disabled={isUpdatingPoints || !correctedTotal}
                  variant="outline"
                  className="border-gray-400 hover:border-red-700 hover:text-red-700"
                >
                  Set
                </Button>
              </div>
            </div>

          </div>
        </CardContent>
      </Card>

      {/* Restriction & Subsystem Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

                {youth.restrictionReason && (
                  <p className="text-sm text-gray-600">
                    <strong>Reason:</strong> {youth.restrictionReason}
                  </p>
                )}

                <Button
                  variant="outline"
                  onClick={handleRemoveRestriction}
                  className="w-full border-2 border-orange-300 hover:border-orange-500 hover:bg-orange-50 hover:text-orange-700 transition-all duration-200 font-medium py-4"
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
                    <Button
                      variant="outline"
                      className="w-full border-2 border-gray-300 hover:border-red-700 hover:bg-red-50 hover:text-red-700 transition-all duration-200 font-medium py-5"
                    >
                      <Shield className="w-4 h-4 mr-2" />
                      Place on Restriction
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Place on Restriction</DialogTitle>
                      <DialogDescription>
                        Set restriction level for {youth.firstName} {youth.lastName}
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
                            <SelectItem value="1">R1 (Less Restrictive)</SelectItem>
                            <SelectItem value="2">R2 (More Restrictive)</SelectItem>
                          </SelectContent>
                        </Select>
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
                      <Button
                        onClick={handlePlaceOnRestriction}
                        className="w-full bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 text-white font-semibold py-5 shadow-lg hover:shadow-xl transition-all duration-200"
                      >
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

                {youth.subsystemReason && (
                  <p className="text-sm text-gray-600">
                    <strong>Reason:</strong> {youth.subsystemReason}
                  </p>
                )}

                <Button
                  variant="outline"
                  onClick={handleRemoveSubsystem}
                  className="w-full border-2 border-red-300 hover:border-red-500 hover:bg-red-50 hover:text-red-700 transition-all duration-200 font-medium py-4"
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
                    <Button
                      variant="outline"
                      className="w-full border-2 border-gray-300 hover:border-red-700 hover:bg-red-50 hover:text-red-700 transition-all duration-200 font-medium py-5"
                    >
                      <Ban className="w-4 h-4 mr-2" />
                      Place on Subsystem
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Place on Subsystem</DialogTitle>
                      <DialogDescription>
                        Place {youth.firstName} {youth.lastName} on subsystem
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div>
                        <Label>Reason (Optional)</Label>
                        <Textarea
                          placeholder="Reason for subsystem..."
                          value={subsystemReason}
                          onChange={(e) => setSubsystemReason(e.target.value)}
                          rows={3}
                        />
                      </div>
                      <Button
                        onClick={handlePlaceOnSubsystem}
                        className="w-full bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white font-semibold py-5 shadow-lg hover:shadow-xl transition-all duration-200"
                      >
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

      {/* Subsystem Log Dialog */}
      <Dialog open={showSubsystemLog} onOpenChange={setShowSubsystemLog}>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            className="border-2 border-gray-300 hover:border-blue-500 hover:bg-blue-50 hover:text-blue-700 transition-all duration-200 font-medium"
          >
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
    </div>
  );
};
