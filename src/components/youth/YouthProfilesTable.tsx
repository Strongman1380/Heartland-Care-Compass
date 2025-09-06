
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Edit, Trash2, Archive, Users } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Youth } from "@/types/app-types";
import { useToast } from "@/hooks/use-toast";
import { EditYouthDialog } from "./EditYouthDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface YouthProfilesTableProps {
  youths: Youth[];
  loading: boolean;
  onYouthSelect: (youth: Youth) => void;
  onYouthUpdated: () => void;
}

export const YouthProfilesTable = ({ youths, loading, onYouthSelect, onYouthUpdated }: YouthProfilesTableProps) => {
  const [selectedYouthIds, setSelectedYouthIds] = useState<string[]>([]);
  const [editingYouth, setEditingYouth] = useState<Youth | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [youthToDelete, setYouthToDelete] = useState<Youth | null>(null);
  const { toast } = useToast();

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedYouthIds(youths.map(youth => youth.id));
    } else {
      setSelectedYouthIds([]);
    }
  };

  const handleSelectYouth = (youthId: string, checked: boolean) => {
    if (checked) {
      setSelectedYouthIds(prev => [...prev, youthId]);
    } else {
      setSelectedYouthIds(prev => prev.filter(id => id !== youthId));
    }
  };

  const handleEditYouth = (youth: Youth) => {
    setEditingYouth(youth);
  };

  const handleDeleteYouth = (youth: Youth) => {
    setYouthToDelete(youth);
    setDeleteConfirmOpen(true);
  };

  const confirmDeleteYouth = async () => {
    if (!youthToDelete) return;

    try {
      const { error } = await supabase
        .from('youths')
        .delete()
        .eq('id', youthToDelete.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: `${youthToDelete.firstName} ${youthToDelete.lastName}'s profile has been deleted.`,
      });

      onYouthUpdated();
    } catch (error) {
      console.error("Error deleting youth profile:", error);
      toast({
        title: "Error",
        description: "Failed to delete youth profile.",
        variant: "destructive",
      });
    } finally {
      setDeleteConfirmOpen(false);
      setYouthToDelete(null);
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedYouthIds.length === 0) {
      toast({
        title: "No selection",
        description: "Please select youth profiles to delete.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('youths')
        .delete()
        .in('id', selectedYouthIds);

      if (error) throw error;

      toast({
        title: "Success",
        description: `${selectedYouthIds.length} youth profile(s) deleted successfully.`,
      });

      setSelectedYouthIds([]);
      onYouthUpdated();
    } catch (error) {
      console.error("Error deleting youth profiles:", error);
      toast({
        title: "Error",
        description: "Failed to delete youth profiles.",
        variant: "destructive",
      });
    }
  };

  const handleArchiveSelected = async () => {
    if (selectedYouthIds.length === 0) {
      toast({
        title: "No selection",
        description: "Please select youth profiles to archive.",
        variant: "destructive",
      });
      return;
    }

    // For now, we'll implement archive as a soft delete by adding an archived flag
    // In a real application, you might want to add an 'archived' column to the database
    toast({
      title: "Archive functionality",
      description: "Archive functionality would be implemented here.",
    });
  };

  const formatDate = (date: Date | null) => {
    if (!date) return "Not specified";
    try {
      return format(date, "MMM d, yyyy");
    } catch {
      return "Invalid date";
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading youth profiles...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (youths.length === 0) {
    return (
      <Card className="border-2 border-yellow-300">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Users className="h-16 w-16 text-red-600" />
          </div>
          <CardTitle className="text-2xl text-red-800">No Youth Profiles Found</CardTitle>
          <CardDescription className="text-red-600 text-lg">
            There are currently no youth profiles in the system.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-red-700 mb-4">
            Use the "Add New Youth" button in the header to create the first youth profile.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Youth Profiles ({youths.length})</CardTitle>
              <CardDescription>
                {selectedYouthIds.length > 0 && `${selectedYouthIds.length} selected`}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleArchiveSelected}
                disabled={selectedYouthIds.length === 0}
              >
                <Archive className="h-4 w-4 mr-2" />
                Archive Selected
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDeleteSelected}
                disabled={selectedYouthIds.length === 0}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Selected
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedYouthIds.length === youths.length && youths.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
                <TableHead>Youth ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Age</TableHead>
                <TableHead>Level</TableHead>
                <TableHead>Points</TableHead>
                <TableHead>Admission Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {youths.map((youth) => (
                <TableRow key={youth.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedYouthIds.includes(youth.id)}
                      onCheckedChange={(checked) => handleSelectYouth(youth.id, checked as boolean)}
                    />
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {youth.id.substring(0, 8)}...
                  </TableCell>
                  <TableCell className="font-medium">
                    {youth.firstName} {youth.lastName}
                  </TableCell>
                  <TableCell>{youth.age || "N/A"}</TableCell>
                  <TableCell>Level {youth.level}</TableCell>
                  <TableCell>{youth.pointTotal || 0}</TableCell>
                  <TableCell>{formatDate(youth.admissionDate)}</TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onYouthSelect(youth)}
                      >
                        View Profile
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditYouth(youth)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteYouth(youth)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {editingYouth && (
        <EditYouthDialog
          youth={editingYouth}
          open={!!editingYouth}
          onClose={() => setEditingYouth(null)}
          onSuccess={onYouthUpdated}
        />
      )}

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {youthToDelete?.firstName} {youthToDelete?.lastName}'s profile and all associated data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteYouth}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete Profile
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
