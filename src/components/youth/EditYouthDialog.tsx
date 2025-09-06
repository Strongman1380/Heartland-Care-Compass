
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { Youth } from "@/types/app-types";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface EditYouthDialogProps {
  youth: Youth;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const EditYouthDialog = ({ youth, open, onClose, onSuccess }: EditYouthDialogProps) => {
  const [formData, setFormData] = useState({
    firstName: youth.firstName,
    lastName: youth.lastName,
    dob: youth.dob ? format(youth.dob, 'yyyy-MM-dd') : '',
    age: youth.age?.toString() || '',
    admissionDate: youth.admissionDate ? format(youth.admissionDate, 'yyyy-MM-dd') : '',
    level: youth.level.toString(),
    pointTotal: youth.pointTotal.toString(),
    referralSource: youth.referralSource || '',
    referralReason: youth.referralReason || '',
    educationInfo: youth.educationInfo || '',
    medicalInfo: youth.medicalInfo || '',
    mentalHealthInfo: youth.mentalHealthInfo || '',
    legalStatus: youth.legalStatus || ''
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (youth) {
      setFormData({
        firstName: youth.firstName,
        lastName: youth.lastName,
        dob: youth.dob ? format(youth.dob, 'yyyy-MM-dd') : '',
        age: youth.age?.toString() || '',
        admissionDate: youth.admissionDate ? format(youth.admissionDate, 'yyyy-MM-dd') : '',
        level: youth.level.toString(),
        pointTotal: youth.pointTotal.toString(),
        referralSource: youth.referralSource || '',
        referralReason: youth.referralReason || '',
        educationInfo: youth.educationInfo || '',
        medicalInfo: youth.medicalInfo || '',
        mentalHealthInfo: youth.mentalHealthInfo || '',
        legalStatus: youth.legalStatus || ''
      });
    }
  }, [youth]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const updateData = {
        firstname: formData.firstName,
        lastname: formData.lastName,
        dob: formData.dob || null,
        age: formData.age ? parseInt(formData.age) : null,
        admissiondate: formData.admissionDate || null,
        level: parseInt(formData.level),
        pointtotal: parseInt(formData.pointTotal),
        referralsource: formData.referralSource || null,
        referralreason: formData.referralReason || null,
        educationinfo: formData.educationInfo || null,
        medicalinfo: formData.medicalInfo || null,
        mentalhealthinfo: formData.mentalHealthInfo || null,
        legalstatus: formData.legalStatus || null,
        updatedat: new Date().toISOString()
      };

      const { error } = await supabase
        .from('youths')
        .update(updateData)
        .eq('id', youth.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Youth profile updated successfully.",
      });

      onSuccess();
      onClose();
    } catch (error) {
      console.error("Error updating youth:", error);
      toast({
        title: "Error",
        description: "Failed to update youth profile.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Youth Profile</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="firstName">First Name *</Label>
              <Input
                id="firstName"
                value={formData.firstName}
                onChange={(e) => handleInputChange('firstName', e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="lastName">Last Name *</Label>
              <Input
                id="lastName"
                value={formData.lastName}
                onChange={(e) => handleInputChange('lastName', e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="dob">Date of Birth</Label>
              <Input
                id="dob"
                type="date"
                value={formData.dob}
                onChange={(e) => handleInputChange('dob', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="age">Age</Label>
              <Input
                id="age"
                type="number"
                value={formData.age}
                onChange={(e) => handleInputChange('age', e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="admissionDate">Admission Date</Label>
              <Input
                id="admissionDate"
                type="date"
                value={formData.admissionDate}
                onChange={(e) => handleInputChange('admissionDate', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="level">Level</Label>
              <Select value={formData.level} onValueChange={(value) => handleInputChange('level', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5].map(level => (
                    <SelectItem key={level} value={level.toString()}>
                      Level {level}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="pointTotal">Point Total</Label>
              <Input
                id="pointTotal"
                type="number"
                value={formData.pointTotal}
                onChange={(e) => handleInputChange('pointTotal', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="referralSource">Referral Source</Label>
              <Input
                id="referralSource"
                value={formData.referralSource}
                onChange={(e) => handleInputChange('referralSource', e.target.value)}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="referralReason">Referral Reason</Label>
            <Textarea
              id="referralReason"
              value={formData.referralReason}
              onChange={(e) => handleInputChange('referralReason', e.target.value)}
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="educationInfo">Education Information</Label>
            <Textarea
              id="educationInfo"
              value={formData.educationInfo}
              onChange={(e) => handleInputChange('educationInfo', e.target.value)}
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="medicalInfo">Medical Information</Label>
            <Textarea
              id="medicalInfo"
              value={formData.medicalInfo}
              onChange={(e) => handleInputChange('medicalInfo', e.target.value)}
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="mentalHealthInfo">Mental Health Information</Label>
            <Textarea
              id="mentalHealthInfo"
              value={formData.mentalHealthInfo}
              onChange={(e) => handleInputChange('mentalHealthInfo', e.target.value)}
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="legalStatus">Legal Status</Label>
            <Input
              id="legalStatus"
              value={formData.legalStatus}
              onChange={(e) => handleInputChange('legalStatus', e.target.value)}
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Updating..." : "Update Profile"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
