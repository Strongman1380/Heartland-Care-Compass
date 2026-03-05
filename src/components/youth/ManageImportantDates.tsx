import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Calendar, Plus, Trash2, Pencil } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  importantDatesService,
  ImportantDate,
} from "@/integrations/firebase/importantDatesService";

const DATE_TYPES = [
  "Court",
  "Family",
  "Administrative",
  "Medical",
  "Assessment",
  "Educational",
  "Other",
] as const;

const PRESET_TITLES = [
  "Next Court Date",
  "Next Family Team Meeting",
  "Next Service Plan Review",
  "Next Medical Appointment",
  "Next Therapy Session",
  "Next School Conference",
  "Hearing Date",
] as const;

interface ManageImportantDatesProps {
  youthId: string;
}

export const ManageImportantDates = ({ youthId }: ManageImportantDatesProps) => {
  const [dates, setDates] = useState<ImportantDate[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingDate, setEditingDate] = useState<ImportantDate | null>(null);

  // Form state
  const [title, setTitle] = useState("");
  const [customTitle, setCustomTitle] = useState("");
  const [date, setDate] = useState("");
  const [type, setType] = useState("Other");

  const loadDates = useCallback(async () => {
    try {
      setLoading(true);
      const data = await importantDatesService.getByYouthId(youthId);
      setDates(data);
    } catch (err) {
      console.error("Failed to load important dates:", err);
      toast.error("Failed to load important dates");
    } finally {
      setLoading(false);
    }
  }, [youthId]);

  useEffect(() => {
    loadDates();
  }, [loadDates]);

  const resetForm = () => {
    setTitle("");
    setCustomTitle("");
    setDate("");
    setType("Other");
    setEditingDate(null);
  };

  const openAddDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEditDialog = (item: ImportantDate) => {
    setEditingDate(item);
    const isPreset = (PRESET_TITLES as readonly string[]).includes(item.title);
    setTitle(isPreset ? item.title : "custom");
    setCustomTitle(isPreset ? "" : item.title);
    setDate(item.date.split("T")[0]);
    setType(item.type);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const finalTitle = title === "custom" ? customTitle.trim() : title;
    if (!finalTitle || !date) {
      toast.error("Please fill in both a title and date");
      return;
    }

    try {
      setSaving(true);
      await importantDatesService.upsert({
        id: editingDate?.id,
        youth_id: youthId,
        title: finalTitle,
        date,
        type,
      });
      toast.success(editingDate ? "Date updated" : "Date added");
      setDialogOpen(false);
      resetForm();
      await loadDates();
    } catch (err) {
      console.error("Failed to save date:", err);
      toast.error("Failed to save date");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item: ImportantDate) => {
    try {
      await importantDatesService.delete(youthId, item.id);
      setDates((prev) => prev.filter((d) => d.id !== item.id));
      toast.success("Date removed");
    } catch (err) {
      console.error("Failed to delete date:", err);
      toast.error("Failed to remove date");
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-gray-700 flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Important Dates
          </CardTitle>
          <Button size="sm" variant="outline" onClick={openAddDialog}>
            <Plus className="h-4 w-4 mr-1" />
            Add Date
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-gray-400 italic">Loading...</p>
        ) : dates.length === 0 ? (
          <p className="text-sm text-gray-400 italic">
            No custom dates added yet. Click "Add Date" to add court dates, family meetings, and more.
          </p>
        ) : (
          <div className="space-y-2">
            {dates.map((item) => {
              const parsedDate = new Date(`${item.date.split("T")[0]}T00:00:00`);
              const isPast = parsedDate < new Date(new Date().toDateString());

              return (
                <div
                  key={item.id}
                  className={`flex items-center justify-between rounded-md border px-3 py-2 text-sm ${
                    isPast ? "bg-gray-50 border-gray-200 opacity-60" : "bg-white border-gray-200"
                  }`}
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="font-medium text-gray-800">{item.title}</span>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span>{format(parsedDate, "MMM d, yyyy")}</span>
                      <span className="uppercase tracking-wider">{item.type}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={() => openEditDialog(item)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-red-500 hover:text-red-700"
                      onClick={() => handleDelete(item)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingDate ? "Edit Important Date" : "Add Important Date"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Title</Label>
              <Select value={title} onValueChange={setTitle}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a date type..." />
                </SelectTrigger>
                <SelectContent>
                  {PRESET_TITLES.map((preset) => (
                    <SelectItem key={preset} value={preset}>
                      {preset}
                    </SelectItem>
                  ))}
                  <SelectItem value="custom">Custom title...</SelectItem>
                </SelectContent>
              </Select>
              {title === "custom" && (
                <Input
                  placeholder="Enter custom title"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                />
              )}
            </div>

            <div className="space-y-2">
              <Label>Date</Label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DATE_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : editingDate ? "Update" : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};
