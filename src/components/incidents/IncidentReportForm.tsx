/**
 * Incident Report Form Component
 * Trauma-informed, accessible form for creating/editing incident reports
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { IncidentReportSchema } from '@/schemas/incident-schema';
import { IncidentReport, IncidentAction, IncidentWitness } from '@/types/incident-types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  AlertCircle, 
  Save, 
  Send, 
  Upload, 
  X, 
  Plus, 
  FileText,
  Clock,
  User,
  MapPin,
  AlertTriangle,
  Heart,
  Users,
  CheckCircle2,
  PenTool
} from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import SignatureCanvas from './SignatureCanvas';
import FileUpload from './FileUpload';

interface IncidentReportFormProps {
  incident?: Partial<IncidentReport>;
  onSave: (data: Partial<IncidentReport>) => Promise<void>;
  onSubmit: (data: Partial<IncidentReport>) => Promise<void>;
  readOnly?: boolean;
}

export default function IncidentReportForm({
  incident,
  onSave,
  onSubmit,
  readOnly = false
}: IncidentReportFormProps) {
  const { toast } = useToast();
  const [currentTab, setCurrentTab] = useState('basic');
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [attachments, setAttachments] = useState<any[]>(incident?.attachments || []);
  const [witnesses, setWitnesses] = useState<IncidentWitness[]>(incident?.witnesses || []);
  const [actions, setActions] = useState<IncidentAction[]>(incident?.immediateActions || []);
  const [signatures, setSignatures] = useState<any[]>(incident?.signatures || []);
  const autosaveTimerRef = useRef<NodeJS.Timeout>();

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isDirty }
  } = useForm({
    resolver: zodResolver(IncidentReportSchema.partial()),
    defaultValues: {
      status: 'draft',
      incidentDate: format(new Date(), 'yyyy-MM-dd'),
      incidentTime: format(new Date(), 'HH:mm'),
      reportedDate: format(new Date(), 'yyyy-MM-dd'),
      medicalAttentionRequired: false,
      parentsNotified: false,
      authoritiesNotified: false,
      photosTaken: false,
      videoRecorded: false,
      followUp: {
        required: false
      },
      ...incident
    }
  });

  const watchedValues = watch();

  // Autosave functionality
  useEffect(() => {
    if (isDirty && !readOnly) {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
      }

      autosaveTimerRef.current = setTimeout(() => {
        handleAutosave();
      }, 3000); // Autosave after 3 seconds of inactivity
    }

    return () => {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
      }
    };
  }, [watchedValues, isDirty]);

  const handleAutosave = async () => {
    try {
      const data = {
        ...watchedValues,
        witnesses,
        immediateActions: actions,
        attachments,
        signatures
      };
      await onSave(data);
      toast({
        title: 'Draft saved',
        description: 'Your changes have been automatically saved.',
        duration: 2000
      });
    } catch (error) {
      console.error('Autosave failed:', error);
    }
  };

  const handleFormSubmit = async (data: any) => {
    setIsSubmitting(true);
    try {
      const fullData = {
        ...data,
        witnesses,
        immediateActions: actions,
        attachments,
        signatures,
        status: 'submitted'
      };

      // Validate required fields
      if (signatures.length === 0) {
        toast({
          title: 'Signature required',
          description: 'Please add at least one signature before submitting.',
          variant: 'destructive'
        });
        setCurrentTab('signatures');
        return;
      }

      if (actions.length === 0) {
        toast({
          title: 'Actions required',
          description: 'Please document at least one immediate action taken.',
          variant: 'destructive'
        });
        setCurrentTab('actions');
        return;
      }

      await onSubmit(fullData);
      
      toast({
        title: 'Report submitted',
        description: 'The incident report has been successfully submitted.',
      });
    } catch (error: any) {
      toast({
        title: 'Submission failed',
        description: error.message || 'Failed to submit incident report.',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveDraft = async () => {
    setIsSaving(true);
    try {
      const data = {
        ...watchedValues,
        witnesses,
        immediateActions: actions,
        attachments,
        signatures,
        status: 'draft'
      };
      await onSave(data);
      toast({
        title: 'Draft saved',
        description: 'Your incident report draft has been saved.',
      });
    } catch (error: any) {
      toast({
        title: 'Save failed',
        description: error.message || 'Failed to save draft.',
        variant: 'destructive'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const addWitness = () => {
    setWitnesses([...witnesses, { name: '', role: '', statement: '' }]);
  };

  const removeWitness = (index: number) => {
    setWitnesses(witnesses.filter((_, i) => i !== index));
  };

  const updateWitness = (index: number, field: keyof IncidentWitness, value: string) => {
    const updated = [...witnesses];
    updated[index] = { ...updated[index], [field]: value };
    setWitnesses(updated);
  };

  const addAction = () => {
    setActions([
      ...actions,
      {
        timestamp: new Date().toISOString(),
        action: '',
        takenBy: '',
        notes: ''
      }
    ]);
  };

  const removeAction = (index: number) => {
    setActions(actions.filter((_, i) => i !== index));
  };

  const updateAction = (index: number, field: keyof IncidentAction, value: string) => {
    const updated = [...actions];
    updated[index] = { ...updated[index], [field]: value };
    setActions(updated);
  };

  const calculateProgress = () => {
    const requiredFields = [
      watchedValues.incidentDate,
      watchedValues.incidentTime,
      watchedValues.location,
      watchedValues.incidentType,
      watchedValues.severity,
      watchedValues.youthName,
      watchedValues.summary,
      watchedValues.description,
      actions.length > 0,
      signatures.length > 0
    ];

    const completed = requiredFields.filter(Boolean).length;
    return (completed / requiredFields.length) * 100;
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      {/* Progress Indicator */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Form Completion</span>
              <span className="font-medium">{Math.round(calculateProgress())}%</span>
            </div>
            <Progress value={calculateProgress()} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* Form Tabs */}
      <Tabs value={currentTab} onValueChange={setCurrentTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="basic">
            <FileText className="w-4 h-4 mr-2" />
            Basic Info
          </TabsTrigger>
          <TabsTrigger value="details">
            <AlertTriangle className="w-4 h-4 mr-2" />
            Details
          </TabsTrigger>
          <TabsTrigger value="actions">
            <CheckCircle2 className="w-4 h-4 mr-2" />
            Actions
          </TabsTrigger>
          <TabsTrigger value="attachments">
            <Upload className="w-4 h-4 mr-2" />
            Attachments
          </TabsTrigger>
          <TabsTrigger value="signatures">
            <PenTool className="w-4 h-4 mr-2" />
            Signatures
          </TabsTrigger>
        </TabsList>

        {/* Basic Information Tab */}
        <TabsContent value="basic" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-red-600" />
                When & Where
              </CardTitle>
              <CardDescription>
                Document when and where this incident occurred
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="incidentDate">
                    Incident Date <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="incidentDate"
                    type="date"
                    {...register('incidentDate')}
                    disabled={readOnly}
                    aria-required="true"
                    aria-invalid={!!errors.incidentDate}
                    aria-describedby={errors.incidentDate ? 'incidentDate-error' : undefined}
                  />
                  {errors.incidentDate && (
                    <p id="incidentDate-error" className="text-sm text-red-600" role="alert">
                      {errors.incidentDate.message as string}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="incidentTime">
                    Incident Time <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="incidentTime"
                    type="time"
                    {...register('incidentTime')}
                    disabled={readOnly}
                    aria-required="true"
                    aria-invalid={!!errors.incidentTime}
                  />
                  {errors.incidentTime && (
                    <p className="text-sm text-red-600" role="alert">
                      {errors.incidentTime.message as string}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">
                  <MapPin className="w-4 h-4 inline mr-1" />
                  Location <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="location"
                  placeholder="e.g., Common room, Bedroom 3, Dining area"
                  {...register('location')}
                  disabled={readOnly}
                  aria-required="true"
                />
                {errors.location && (
                  <p className="text-sm text-red-600" role="alert">
                    {errors.location.message as string}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="incidentType">
                    Incident Type <span className="text-red-500">*</span>
                  </Label>
                  <Controller
                    name="incidentType"
                    control={control}
                    render={({ field }) => (
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                        disabled={readOnly}
                      >
                        <SelectTrigger id="incidentType" aria-required="true">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="behavioral">Behavioral</SelectItem>
                          <SelectItem value="medical">Medical</SelectItem>
                          <SelectItem value="safety">Safety</SelectItem>
                          <SelectItem value="property_damage">Property Damage</SelectItem>
                          <SelectItem value="runaway">Runaway</SelectItem>
                          <SelectItem value="self_harm">Self-Harm</SelectItem>
                          <SelectItem value="aggression">Aggression</SelectItem>
                          <SelectItem value="substance_use">Substance Use</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.incidentType && (
                    <p className="text-sm text-red-600" role="alert">
                      {errors.incidentType.message as string}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="severity">
                    Severity Level <span className="text-red-500">*</span>
                  </Label>
                  <Controller
                    name="severity"
                    control={control}
                    render={({ field }) => (
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                        disabled={readOnly}
                      >
                        <SelectTrigger id="severity" aria-required="true">
                          <SelectValue placeholder="Select severity" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="minor">Minor</SelectItem>
                          <SelectItem value="moderate">Moderate</SelectItem>
                          <SelectItem value="serious">Serious</SelectItem>
                          <SelectItem value="critical">Critical</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.severity && (
                    <p className="text-sm text-red-600" role="alert">
                      {errors.severity.message as string}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5 text-red-600" />
                Youth Information
              </CardTitle>
              <CardDescription>
                Information about the youth involved (handled with care and confidentiality)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="youthName">
                  Youth Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="youthName"
                  placeholder="First and last name"
                  {...register('youthName')}
                  disabled={readOnly}
                  aria-required="true"
                />
                {errors.youthName && (
                  <p className="text-sm text-red-600" role="alert">
                    {errors.youthName.message as string}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="youthAge">Age</Label>
                  <Input
                    id="youthAge"
                    type="number"
                    min="0"
                    max="25"
                    {...register('youthAge', { valueAsNumber: true })}
                    disabled={readOnly}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="youthDOB">Date of Birth</Label>
                  <Input
                    id="youthDOB"
                    type="date"
                    {...register('youthDOB')}
                    disabled={readOnly}
                  />
                  <p className="text-xs text-slate-500">
                    This information is encrypted and protected
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleSaveDraft}
              disabled={isSaving || readOnly}
            >
              <Save className="w-4 h-4 mr-2" />
              Save Draft
            </Button>
            <Button
              type="button"
              onClick={() => setCurrentTab('details')}
            >
              Next: Details
            </Button>
          </div>
        </TabsContent>

        {/* Details Tab - Continued in next part due to length */}
        <TabsContent value="details" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Incident Description</CardTitle>
              <CardDescription>
                Provide a detailed, objective account of what happened
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="summary">
                  Brief Summary <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="summary"
                  placeholder="One-line summary of the incident"
                  {...register('summary')}
                  disabled={readOnly}
                  maxLength={200}
                  aria-required="true"
                />
                <p className="text-xs text-slate-500">
                  10-200 characters. This will appear in reports and lists.
                </p>
                {errors.summary && (
                  <p className="text-sm text-red-600" role="alert">
                    {errors.summary.message as string}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">
                  Detailed Description <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="description"
                  placeholder="Provide a detailed, objective description of what occurred. Include who, what, when, where, and how."
                  {...register('description')}
                  disabled={readOnly}
                  rows={6}
                  aria-required="true"
                />
                <p className="text-xs text-slate-500">
                  Minimum 50 characters. Be specific and factual.
                </p>
                {errors.description && (
                  <p className="text-sm text-red-600" role="alert">
                    {errors.description.message as string}
                  </p>
                )}
              </div>

              <Alert>
                <Heart className="h-4 w-4" />
                <AlertDescription>
                  <strong>Trauma-Informed Approach:</strong> Use objective, non-judgmental language. 
                  Focus on observable behaviors rather than assumptions about intent or character.
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Label htmlFor="antecedents">Antecedents (What happened before)</Label>
                <Textarea
                  id="antecedents"
                  placeholder="What was happening before the incident? What might have triggered it?"
                  {...register('antecedents')}
                  disabled={readOnly}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="behavior">Behavior (What the youth did)</Label>
                <Textarea
                  id="behavior"
                  placeholder="Describe the specific behaviors observed"
                  {...register('behavior')}
                  disabled={readOnly}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="consequences">Consequences (What happened after)</Label>
                <Textarea
                  id="consequences"
                  placeholder="What were the immediate results or consequences?"
                  {...register('consequences')}
                  disabled={readOnly}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Witnesses Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-red-600" />
                  Witnesses
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addWitness}
                  disabled={readOnly}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Witness
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {witnesses.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-4">
                  No witnesses added yet. Click "Add Witness" to document witness information.
                </p>
              ) : (
                witnesses.map((witness, index) => (
                  <Card key={index} className="border-slate-200">
                    <CardContent className="pt-4 space-y-3">
                      <div className="flex justify-between items-start">
                        <h4 className="font-medium">Witness {index + 1}</h4>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeWitness(index)}
                          disabled={readOnly}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label>Name</Label>
                          <Input
                            value={witness.name}
                            onChange={(e) => updateWitness(index, 'name', e.target.value)}
                            placeholder="Witness name"
                            disabled={readOnly}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Role</Label>
                          <Input
                            value={witness.role}
                            onChange={(e) => updateWitness(index, 'role', e.target.value)}
                            placeholder="e.g., Staff, Resident, Visitor"
                            disabled={readOnly}
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Statement</Label>
                        <Textarea
                          value={witness.statement || ''}
                          onChange={(e) => updateWitness(index, 'statement', e.target.value)}
                          placeholder="Witness statement or observations"
                          rows={3}
                          disabled={readOnly}
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </CardContent>
          </Card>

          <div className="flex justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() => setCurrentTab('basic')}
            >
              Previous
            </Button>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleSaveDraft}
                disabled={isSaving || readOnly}
              >
                <Save className="w-4 h-4 mr-2" />
                Save Draft
              </Button>
              <Button
                type="button"
                onClick={() => setCurrentTab('actions')}
              >
                Next: Actions
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* Actions Tab - Will continue in next message */}
      </Tabs>
    </form>
  );
}