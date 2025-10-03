/**
 * Additional tabs for Incident Report Form
 * Actions, Attachments, and Signatures
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { TabsContent } from '@/components/ui/tabs';
import { 
  Plus, 
  X, 
  Save, 
  Send,
  CheckCircle2,
  AlertCircle,
  Heart,
  Phone
} from 'lucide-react';
import { format } from 'date-fns';
import { IncidentAction } from '@/types/incident-types';

interface ActionsTabProps {
  actions: IncidentAction[];
  setActions: (actions: IncidentAction[]) => void;
  register: any;
  watch: any;
  errors: any;
  readOnly: boolean;
  onSaveDraft: () => void;
  onNext: () => void;
  onPrevious: () => void;
  isSaving: boolean;
}

export function ActionsTab({
  actions,
  setActions,
  register,
  watch,
  errors,
  readOnly,
  onSaveDraft,
  onNext,
  onPrevious,
  isSaving
}: ActionsTabProps) {
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

  const medicalAttentionRequired = watch('medicalAttentionRequired');
  const parentsNotified = watch('parentsNotified');
  const authoritiesNotified = watch('authoritiesNotified');

  return (
    <TabsContent value="actions" className="space-y-6">
      {/* Immediate Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-red-600" />
              Immediate Actions Taken
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addAction}
              disabled={readOnly}
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Action
            </Button>
          </CardTitle>
          <CardDescription>
            Document all actions taken in response to this incident
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {actions.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                At least one immediate action must be documented before submitting this report.
              </AlertDescription>
            </Alert>
          ) : (
            actions.map((action, index) => (
              <Card key={index} className="border-slate-200">
                <CardContent className="pt-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <h4 className="font-medium">Action {index + 1}</h4>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeAction(index)}
                      disabled={readOnly}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Time</Label>
                      <Input
                        type="datetime-local"
                        value={format(new Date(action.timestamp), "yyyy-MM-dd'T'HH:mm")}
                        onChange={(e) => updateAction(index, 'timestamp', new Date(e.target.value).toISOString())}
                        disabled={readOnly}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Taken By</Label>
                      <Input
                        value={action.takenBy}
                        onChange={(e) => updateAction(index, 'takenBy', e.target.value)}
                        placeholder="Staff member name"
                        disabled={readOnly}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Action Description</Label>
                    <Textarea
                      value={action.action}
                      onChange={(e) => updateAction(index, 'action', e.target.value)}
                      placeholder="Describe the action taken"
                      rows={2}
                      disabled={readOnly}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Additional Notes</Label>
                    <Textarea
                      value={action.notes || ''}
                      onChange={(e) => updateAction(index, 'notes', e.target.value)}
                      placeholder="Any additional context or notes"
                      rows={2}
                      disabled={readOnly}
                    />
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </CardContent>
      </Card>

      {/* Medical Attention */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-red-600" />
            Medical Attention
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="medicalAttentionRequired"
              {...register('medicalAttentionRequired')}
              disabled={readOnly}
            />
            <Label
              htmlFor="medicalAttentionRequired"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Medical attention was required
            </Label>
          </div>

          {medicalAttentionRequired && (
            <div className="space-y-2 pl-6 border-l-2 border-red-200">
              <Label htmlFor="medicalDetails">
                Medical Details <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="medicalDetails"
                placeholder="Describe the medical attention provided, injuries treated, or medical professionals contacted"
                {...register('medicalDetails')}
                disabled={readOnly}
                rows={4}
              />
              <p className="text-xs text-slate-500">
                This information is encrypted and protected for privacy
              </p>
              {errors.medicalDetails && (
                <p className="text-sm text-red-600" role="alert">
                  {errors.medicalDetails.message as string}
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="w-5 h-5 text-red-600" />
            Notifications
          </CardTitle>
          <CardDescription>
            Document who was notified about this incident
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Parents Notification */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="parentsNotified"
                {...register('parentsNotified')}
                disabled={readOnly}
              />
              <Label
                htmlFor="parentsNotified"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Parents/Guardians were notified
              </Label>
            </div>

            {parentsNotified && (
              <div className="pl-6 border-l-2 border-blue-200 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="parentsNotifiedAt">
                      Notification Time <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="parentsNotifiedAt"
                      type="datetime-local"
                      {...register('parentsNotifiedAt')}
                      disabled={readOnly}
                    />
                    {errors.parentsNotifiedAt && (
                      <p className="text-sm text-red-600" role="alert">
                        {errors.parentsNotifiedAt.message as string}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="parentsNotifiedBy">
                      Notified By <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="parentsNotifiedBy"
                      placeholder="Staff member name"
                      {...register('parentsNotifiedBy')}
                      disabled={readOnly}
                    />
                    {errors.parentsNotifiedBy && (
                      <p className="text-sm text-red-600" role="alert">
                        {errors.parentsNotifiedBy.message as string}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Authorities Notification */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="authoritiesNotified"
                {...register('authoritiesNotified')}
                disabled={readOnly}
              />
              <Label
                htmlFor="authoritiesNotified"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Authorities were notified (police, CPS, etc.)
              </Label>
            </div>

            {authoritiesNotified && (
              <div className="pl-6 border-l-2 border-amber-200 space-y-2">
                <Label htmlFor="authoritiesNotifiedDetails">
                  Authority Notification Details <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="authoritiesNotifiedDetails"
                  placeholder="Which authorities were contacted, when, and what information was shared"
                  {...register('authoritiesNotifiedDetails')}
                  disabled={readOnly}
                  rows={3}
                />
                {errors.authoritiesNotifiedDetails && (
                  <p className="text-sm text-red-600" role="alert">
                    {errors.authoritiesNotifiedDetails.message as string}
                  </p>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Evidence Documentation */}
      <Card>
        <CardHeader>
          <CardTitle>Evidence Documentation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="photosTaken"
              {...register('photosTaken')}
              disabled={readOnly}
            />
            <Label htmlFor="photosTaken">
              Photos were taken
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="videoRecorded"
              {...register('videoRecorded')}
              disabled={readOnly}
            />
            <Label htmlFor="videoRecorded">
              Video was recorded
            </Label>
          </div>

          <p className="text-xs text-slate-500 mt-2">
            Upload photos and videos in the Attachments tab
          </p>
        </CardContent>
      </Card>

      {/* Follow-up */}
      <Card>
        <CardHeader>
          <CardTitle>Follow-up Required</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="followUpRequired"
              {...register('followUp.required')}
              disabled={readOnly}
            />
            <Label htmlFor="followUpRequired">
              Follow-up action is required
            </Label>
          </div>

          {watch('followUp.required') && (
            <div className="pl-6 border-l-2 border-green-200 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="followUpDueDate">Due Date</Label>
                  <Input
                    id="followUpDueDate"
                    type="date"
                    {...register('followUp.dueDate')}
                    disabled={readOnly}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="followUpAssignedTo">Assigned To</Label>
                  <Input
                    id="followUpAssignedTo"
                    placeholder="Staff member name"
                    {...register('followUp.assignedTo')}
                    disabled={readOnly}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="followUpDescription">Follow-up Description</Label>
                <Textarea
                  id="followUpDescription"
                  placeholder="Describe what follow-up actions are needed"
                  {...register('followUp.description')}
                  disabled={readOnly}
                  rows={3}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button
          type="button"
          variant="outline"
          onClick={onPrevious}
        >
          Previous
        </Button>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onSaveDraft}
            disabled={isSaving || readOnly}
          >
            <Save className="w-4 h-4 mr-2" />
            Save Draft
          </Button>
          <Button
            type="button"
            onClick={onNext}
          >
            Next: Attachments
          </Button>
        </div>
      </div>
    </TabsContent>
  );
}