
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { addDoc, collection, Timestamp } from "firebase/firestore";
import { firestore } from "@/pages/Index";
import { toast } from "sonner";

interface AddYouthDialogProps {
  onClose: () => void;
}

export const AddYouthDialog = ({ onClose }: AddYouthDialogProps) => {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    dob: "",
    admissionDate: "",
    level: "1",
    referralSource: "",
    referralReason: "",
    educationInfo: "",
    medicalInfo: "",
    mentalHealthInfo: "",
    legalStatus: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const calculateAge = (dobString: string) => {
    if (!dobString) return null;
    const dob = new Date(dobString);
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    if (
      today.getMonth() < dob.getMonth() ||
      (today.getMonth() === dob.getMonth() && today.getDate() < dob.getDate())
    ) {
      age--;
    }
    return age;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      
      const age = calculateAge(formData.dob);
      if (age === null) {
        toast.error("Please enter a valid date of birth");
        setIsSubmitting(false);
        return;
      }
      
      const youthData = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        dob: Timestamp.fromDate(new Date(formData.dob)),
        age,
        admissionDate: formData.admissionDate ? Timestamp.fromDate(new Date(formData.admissionDate)) : Timestamp.now(),
        level: parseInt(formData.level, 10),
        pointTotal: 0,
        referralSource: formData.referralSource,
        referralReason: formData.referralReason,
        educationInfo: formData.educationInfo,
        medicalInfo: formData.medicalInfo,
        mentalHealthInfo: formData.mentalHealthInfo,
        legalStatus: formData.legalStatus,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };
      
      await addDoc(collection(firestore, "youths"), youthData);
      
      toast.success("Youth profile added successfully");
      onClose();
    } catch (error) {
      console.error("Error adding youth:", error);
      toast.error("Failed to add youth profile");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Add New Youth</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name <span className="text-red-500">*</span></Label>
              <Input 
                id="firstName" 
                name="firstName" 
                value={formData.firstName} 
                onChange={handleChange} 
                required 
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name <span className="text-red-500">*</span></Label>
              <Input 
                id="lastName" 
                name="lastName" 
                value={formData.lastName} 
                onChange={handleChange} 
                required 
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dob">Date of Birth <span className="text-red-500">*</span></Label>
              <Input 
                id="dob" 
                name="dob" 
                type="date" 
                value={formData.dob} 
                onChange={handleChange} 
                required 
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="admissionDate">Admission Date</Label>
              <Input 
                id="admissionDate" 
                name="admissionDate" 
                type="date" 
                value={formData.admissionDate} 
                onChange={handleChange} 
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="level">Initial Level</Label>
              <Select name="level" defaultValue={formData.level} onValueChange={value => handleSelectChange("level", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Level 1</SelectItem>
                  <SelectItem value="2">Level 2</SelectItem>
                  <SelectItem value="3">Level 3</SelectItem>
                  <SelectItem value="4">Level 4</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="referralSource">Referral Source</Label>
              <Input 
                id="referralSource" 
                name="referralSource" 
                value={formData.referralSource} 
                onChange={handleChange} 
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="referralReason">Referral Reason</Label>
            <Textarea 
              id="referralReason" 
              name="referralReason" 
              value={formData.referralReason} 
              onChange={handleChange} 
              rows={3}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="educationInfo">Education Information</Label>
            <Textarea 
              id="educationInfo" 
              name="educationInfo" 
              value={formData.educationInfo} 
              onChange={handleChange} 
              rows={2}
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="medicalInfo">Medical Information</Label>
              <Textarea 
                id="medicalInfo" 
                name="medicalInfo" 
                value={formData.medicalInfo} 
                onChange={handleChange} 
                rows={2}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="mentalHealthInfo">Mental Health Information</Label>
              <Textarea 
                id="mentalHealthInfo" 
                name="mentalHealthInfo" 
                value={formData.mentalHealthInfo} 
                onChange={handleChange} 
                rows={2}
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="legalStatus">Legal Status</Label>
            <Textarea 
              id="legalStatus" 
              name="legalStatus" 
              value={formData.legalStatus} 
              onChange={handleChange} 
              rows={2}
            />
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Adding..." : "Add Youth"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
