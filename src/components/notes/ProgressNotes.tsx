
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, ChevronDown, ChevronRight, FileText, Search } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { fetchProgressNotes, saveProgressNote } from "@/utils/supabase-utils";
import { ProgressNote } from "@/types/app-types";

interface ProgressNotesProps {
  youthId: string;
  youth: any;
}

const NOTE_CATEGORIES = [
  { value: "School", label: "School" },
  { value: "Behavior", label: "Behavior" },
  { value: "Medical", label: "Medical" },
  { value: "Incident", label: "Incident" },
  { value: "Achievement", label: "Achievement" },
  { value: "Family", label: "Family" },
  { value: "Other", label: "Other" },
];

export const ProgressNotes = ({ youthId, youth }: ProgressNotesProps) => {
  const [notes, setNotes] = useState<ProgressNote[]>([]);
  const [filteredNotes, setFilteredNotes] = useState<ProgressNote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [expandedNote, setExpandedNote] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    category: "Behavior",
    note: "",
    rating: "3",
    staff: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchNotes();
  }, [youthId]);

  useEffect(() => {
    filterNotes();
  }, [notes, searchTerm, selectedCategory]);

  const fetchNotes = async () => {
    try {
      setIsLoading(true);
      const fetchedNotes = await fetchProgressNotes(youthId);
      setNotes(fetchedNotes);
      setFilteredNotes(fetchedNotes);
    } catch (error) {
      console.error("Error fetching notes:", error);
      toast.error("Failed to load progress notes");
    } finally {
      setIsLoading(false);
    }
  };

  const filterNotes = () => {
    let filtered = [...notes];
    
    if (searchTerm) {
      filtered = filtered.filter(note => 
        note.note.toLowerCase().includes(searchTerm.toLowerCase()) ||
        note.category.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (selectedCategory) {
      filtered = filtered.filter(note => note.category === selectedCategory);
    }
    
    setFilteredNotes(filtered);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.note.trim()) {
      toast.error("Note content is required");
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      const noteDate = new Date(formData.date);
      const rating = parseInt(formData.rating);
      
      const newNote: Omit<ProgressNote, 'id' | 'createdAt'> = {
        youth_id: youthId,
        date: noteDate,
        category: formData.category,
        note: formData.note.trim(),
        rating,
        staff: formData.staff.trim() || "Staff Member",
      };
      
      await saveProgressNote(youthId, newNote);
      
      toast.success("Progress note added successfully");
      
      // Trigger an alert for low ratings in certain categories
      if ((formData.category === "School" || formData.category === "Behavior") && rating <= 2) {
        toast.warning(`Low ${formData.category.toLowerCase()} rating recorded. May require attention.`, {
          duration: 5000,
        });
      }
      
      // Reset form and refresh data
      setFormData({
        date: format(new Date(), 'yyyy-MM-dd'),
        category: "Behavior",
        note: "",
        rating: "3",
        staff: "",
      });
      
      fetchNotes();
    } catch (error) {
      console.error("Error adding note:", error);
      toast.error("Failed to add progress note");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCategoryFilter = (category: string | null) => {
    setSelectedCategory(category);
  };

  const toggleNoteExpansion = (noteId: string) => {
    setExpandedNote(expandedNote === noteId ? null : noteId);
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "School": return "bg-blue-100 text-blue-800";
      case "Behavior": return "bg-purple-100 text-purple-800";
      case "Medical": return "bg-green-100 text-green-800";
      case "Incident": return "bg-red-100 text-red-800";
      case "Achievement": return "bg-yellow-100 text-yellow-800";
      case "Family": return "bg-pink-100 text-pink-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getRatingColor = (rating: number) => {
    switch (rating) {
      case 1: return "text-red-600";
      case 2: return "text-orange-600";
      case 3: return "text-yellow-600";
      case 4: return "text-blue-600";
      case 5: return "text-green-600";
      default: return "text-gray-600";
    }
  };

  const handleExportNotes = () => {
    // PDF export functionality would be implemented here
    console.log("Export notes to PDF");
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start flex-col sm:flex-row">
        <div>
          <h2 className="text-2xl font-bold mb-2">Progress Notes</h2>
          <p className="text-gray-600 mb-4">Record and track observations, behaviors, and incidents.</p>
        </div>
        
        <div className="flex space-x-2 mb-4 sm:mb-0">
          <Button variant="outline" size="sm" onClick={handleExportNotes}>
            <FileText size={16} className="mr-2" />
            Export Notes
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Add Progress Note</CardTitle>
            <CardDescription>Record observations or incidents</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  name="date"
                  type="date"
                  value={formData.date}
                  onChange={handleInputChange}
                  className="max-w-full"
                />
              </div>
              
              <div>
                <Label htmlFor="category">Category</Label>
                <Select name="category" defaultValue={formData.category} onValueChange={value => handleSelectChange("category", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {NOTE_CATEGORIES.map((category) => (
                      <SelectItem key={category.value} value={category.value}>{category.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="note">Note Content</Label>
                <Textarea
                  id="note"
                  name="note"
                  value={formData.note}
                  onChange={handleInputChange}
                  placeholder="Enter detailed observations, behaviors, or incidents..."
                  rows={5}
                  className="resize-none"
                />
              </div>
              
              <div>
                <Label htmlFor="rating">Rating (1-5)</Label>
                <Select name="rating" defaultValue={formData.rating} onValueChange={value => handleSelectChange("rating", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select rating" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 - Very Poor</SelectItem>
                    <SelectItem value="2">2 - Poor</SelectItem>
                    <SelectItem value="3">3 - Average</SelectItem>
                    <SelectItem value="4">4 - Good</SelectItem>
                    <SelectItem value="5">5 - Excellent</SelectItem>
                  </SelectContent>
                </Select>
                
                {(formData.category === "School" || formData.category === "Behavior") && parseInt(formData.rating) <= 2 && (
                  <Alert className="mt-2 bg-amber-50 border-amber-200">
                    <AlertCircle className="h-4 w-4 text-amber-600" />
                    <AlertTitle className="text-amber-800">Low Rating Alert</AlertTitle>
                    <AlertDescription className="text-amber-700">
                      Low ratings in this category will trigger notifications for staff attention.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
              
              <div>
                <Label htmlFor="staff">Staff Name</Label>
                <Input
                  id="staff"
                  name="staff"
                  value={formData.staff}
                  onChange={handleInputChange}
                  placeholder="Your name"
                />
              </div>
              
              <Button type="submit" disabled={isSubmitting} className="w-full">
                {isSubmitting ? "Saving..." : "Add Progress Note"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between">
              <CardTitle>Note History</CardTitle>
              <div className="flex mt-2 sm:mt-0">
                <div className="relative mr-2">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                  <Input
                    placeholder="Search notes..."
                    className="pl-10 h-9 w-[150px] sm:w-auto"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <Select value={selectedCategory || "all"} onValueChange={(value) => handleCategoryFilter(value === "all" ? null : value)}>
                  <SelectTrigger className="h-9 w-[130px]">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {NOTE_CATEGORIES.map((category) => (
                      <SelectItem key={category.value} value={category.value}>{category.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <CardDescription>
              {filteredNotes.length} {filteredNotes.length === 1 ? "note" : "notes"} 
              {selectedCategory ? ` in ${selectedCategory}` : ""}
              {searchTerm ? ` matching "${searchTerm}"` : ""}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading notes...</p>
              </div>
            ) : filteredNotes.length > 0 ? (
              <div className="space-y-4">
                {filteredNotes.map((note) => (
                  <Collapsible 
                    key={note.id}
                    open={expandedNote === note.id}
                    onOpenChange={() => toggleNoteExpansion(note.id || "")}
                    className="border rounded-md hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start p-3 cursor-pointer">
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="sm" className="p-1 h-auto">
                          {expandedNote === note.id ? 
                            <ChevronDown size={16} /> : 
                            <ChevronRight size={16} />
                          }
                        </Button>
                      </CollapsibleTrigger>
                      
                      <div className="flex-1 ml-1">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Badge className={`${getCategoryColor(note.category)}`}>
                              {note.category}
                            </Badge>
                            <span className={`font-medium ${getRatingColor(note.rating)}`}>
                              Rating: {note.rating}/5
                            </span>
                          </div>
                          <span className="text-sm text-gray-500 mt-1 sm:mt-0">
                            {format(note.date as Date, 'MMM d, yyyy')}
                          </span>
                        </div>
                        
                        <p className="mt-2 line-clamp-2 text-gray-700">
                          {note.note}
                        </p>
                      </div>
                    </div>
                    
                    <CollapsibleContent>
                      <div className="px-4 pb-3 pt-1">
                        <div className="pl-6 border-l-2 border-gray-200">
                          <p className="whitespace-pre-line text-gray-800">{note.note}</p>
                          <div className="mt-3 text-sm text-gray-500">
                            <p>Recorded by: {note.staff}</p>
                            <p>Added: {format(note.createdAt as Date, 'MMM d, yyyy h:mm a')}</p>
                          </div>
                        </div>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                {notes.length === 0 ? "No progress notes have been added yet." : "No notes match your search criteria."}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
