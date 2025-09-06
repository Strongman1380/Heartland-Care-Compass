import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Printer } from 'lucide-react';

interface ISPData {
  youthName: string;
  youthId: string;
  dob: string;
  age: string;
  admissionDate: string;
  level: string;
  estStay: string;
  teamMembers: string[];
  riskLevel: string;
  topConcerns: string[];
  otherConcern: string;
  strengths: string[];
  otherStrength: string;
  goal1: string;
  goal1Type: string;
  goal1Strategies: string;
  goal1Skill: string;
  goal2: string;
  goal2Type: string;
  goal2Strategies: string;
  goal2Skill: string;
  earlyWarningSigns: string[];
  otherWarningSign: string;
  whatHelps: string[];
  otherWhatHelps: string;
  staffApproach: string[];
  otherStaffApproach: string;
  dailyMeasure: string[];
  otherDailyMeasure: string;
  reviewDate: string;
  youthSignature: string;
  staffSignature: string;
  signatureDate: string;
}

interface QuickISPAssessmentProps {
  selectedYouth?: any;
  onSave?: (data: ISPData) => void;
}

const QuickISPAssessment: React.FC<QuickISPAssessmentProps> = ({ selectedYouth, onSave }) => {
  const [ispData, setISPData] = useState<ISPData>({
    youthName: selectedYouth ? `${selectedYouth.firstname} ${selectedYouth.lastname}` : '',
    youthId: selectedYouth?.id || '',
    dob: selectedYouth?.dob ? new Date(selectedYouth.dob).toLocaleDateString() : '',
    age: selectedYouth?.age?.toString() || '',
    admissionDate: selectedYouth?.admissiondate ? new Date(selectedYouth.admissiondate).toLocaleDateString() : '',
    level: selectedYouth?.level?.toString() || '',
    estStay: '',
    teamMembers: [],
    riskLevel: '',
    topConcerns: [],
    otherConcern: '',
    strengths: [],
    otherStrength: '',
    goal1: '',
    goal1Type: '',
    goal1Strategies: '',
    goal1Skill: '',
    goal2: '',
    goal2Type: '',
    goal2Strategies: '',
    goal2Skill: '',
    earlyWarningSigns: [],
    otherWarningSign: '',
    whatHelps: [],
    otherWhatHelps: '',
    staffApproach: [],
    otherStaffApproach: '',
    dailyMeasure: [],
    otherDailyMeasure: '',
    reviewDate: '',
    youthSignature: '',
    staffSignature: '',
    signatureDate: new Date().toLocaleDateString()
  });

  const teamMemberOptions = ['Case Manager', 'PO', 'Therapist', 'Teacher', 'Family'];
  const riskLevels = ['Low', 'Moderate', 'High', 'Very High'];
  const concernOptions = ['Aggression', 'Defiance', 'Substance Use', 'Peer Issues', 'Runaway Risk', 'School Problems', 'Family Conflict', 'Self-Harm'];
  const strengthOptions = ['Athletic', 'Creative', 'Helpful', 'Academic', 'Social', 'Mechanical', 'Leadership', 'Problem-Solving'];
  const goalTypes = ['Behavioral', 'Academic', 'Family', 'Community', 'Independent Living'];
  const warningSignOptions = ['Pacing', 'Withdrawal', 'Raising Voice', 'Clenched Fists', 'Swearing', 'Property Misuse'];
  const whatHelpsOptions = ['Space', 'Talk it Out', 'Deep Breathing', 'Physical Activity', 'Quiet Area', 'Music'];
  const staffApproachOptions = ['Direct', 'Calm/Quiet', 'Offer Choices', 'Provide Space'];
  const dailyMeasureOptions = ['Point Card', 'Behavior Chart', 'Check-ins'];

  const handleCheckboxChange = (field: keyof ISPData, value: string, checked: boolean) => {
    setISPData(prev => {
      const currentArray = (prev[field] as string[]) || [];
      if (checked) {
        return { ...prev, [field]: [...currentArray, value] };
      } else {
        return { ...prev, [field]: currentArray.filter(item => item !== value) };
      }
    });
  };

  const handleInputChange = (field: keyof ISPData, value: string) => {
    setISPData(prev => ({ ...prev, [field]: value }));
  };

  const handlePrint = () => {
    window.print();
  };

  const handleSave = () => {
    if (onSave) {
      onSave(ispData);
    }
  };

  const renderPrintView = () => {
    return (
      <div className="max-w-4xl mx-auto p-6 space-y-4">
        <div className="text-center mb-6">
          <h1 className="text-xl font-bold">HEARTLAND BOYS HOME</h1>
          <h2 className="text-lg font-semibold">Quick Individualized Service Plan (ISP)</h2>
        </div>

        <div className="space-y-4 text-sm leading-relaxed">
          <p><strong>Youth Information:</strong> {ispData.youthName} (ID: {ispData.youthId}) is a {ispData.age}-year-old resident born on {ispData.dob}. Admission date was {ispData.admissionDate}, currently at Level {ispData.level} with an estimated stay of {ispData.estStay}.</p>

          {ispData.teamMembers.length > 0 && (
            <p><strong>Treatment Team:</strong> The treatment team consists of {ispData.teamMembers.join(', ')}.</p>
          )}

          <p><strong>Risk Assessment:</strong> The youth presents with a {ispData.riskLevel.toLowerCase()} risk level.</p>

          {ispData.topConcerns.length > 0 && (
            <p><strong>Primary Concerns:</strong> Areas of concern include {ispData.topConcerns.join(', ')}{ispData.otherConcern && `, and ${ispData.otherConcern}`}.</p>
          )}

          {ispData.strengths.length > 0 && (
            <p><strong>Identified Strengths:</strong> The youth demonstrates strengths in {ispData.strengths.join(', ')}{ispData.otherStrength && `, and ${ispData.otherStrength}`}.</p>
          )}

          <div className="space-y-3">
            <h3 className="font-semibold">Treatment Goals:</h3>
            {ispData.goal1 && (
              <div>
                <p><strong>Goal 1:</strong> {ispData.goal1} (Type: {ispData.goal1Type})</p>
                {ispData.goal1Strategies && <p><strong>Key Strategies:</strong> {ispData.goal1Strategies}</p>}
                {ispData.goal1Skill && <p><strong>Main Skill to Develop:</strong> {ispData.goal1Skill}</p>}
              </div>
            )}
            {ispData.goal2 && (
              <div>
                <p><strong>Goal 2:</strong> {ispData.goal2} (Type: {ispData.goal2Type})</p>
                {ispData.goal2Strategies && <p><strong>Key Strategies:</strong> {ispData.goal2Strategies}</p>}
                {ispData.goal2Skill && <p><strong>Main Skill to Develop:</strong> {ispData.goal2Skill}</p>}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold">Support Plan:</h3>
            {ispData.earlyWarningSigns.length > 0 && (
              <p><strong>Early Warning Signs:</strong> Staff should watch for {ispData.earlyWarningSigns.join(', ')}{ispData.otherWarningSign && `, and ${ispData.otherWarningSign}`}.</p>
            )}
            {ispData.whatHelps.length > 0 && (
              <p><strong>Interventions that Help:</strong> Effective interventions include {ispData.whatHelps.join(', ')}{ispData.otherWhatHelps && `, and ${ispData.otherWhatHelps}`}.</p>
            )}
            {ispData.staffApproach.length > 0 && (
              <p><strong>Recommended Staff Approach:</strong> Staff should utilize {ispData.staffApproach.join(', ')}{ispData.otherStaffApproach && `, and ${ispData.otherStaffApproach}`} approaches.</p>
            )}
          </div>

          {ispData.dailyMeasure.length > 0 && (
            <p><strong>Progress Tracking:</strong> Daily progress will be monitored using {ispData.dailyMeasure.join(', ')}{ispData.otherDailyMeasure && `, and ${ispData.otherDailyMeasure}`}.</p>
          )}

          {ispData.reviewDate && (
            <p><strong>Review Schedule:</strong> This plan will be reviewed on {ispData.reviewDate}.</p>
          )}

          <div className="mt-8 space-y-2">
            <p><strong>Signatures:</strong></p>
            {ispData.youthSignature && <p>Youth: {ispData.youthSignature}</p>}
            {ispData.staffSignature && <p>Staff: {ispData.staffSignature}</p>}
            {ispData.signatureDate && <p>Date: {ispData.signatureDate}</p>}
          </div>
        </div>
      </div>
    );
  };

  const renderFormView = () => {
    return (
      <Card className="print:shadow-none print:border-none">
        <CardHeader className="text-center">
          <CardTitle className="text-xl font-bold">HEARTLAND BOYS HOME</CardTitle>
          <h2 className="text-lg font-semibold">Quick Individualized Service Plan (ISP)</h2>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Youth Information */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="youthName">Youth:</Label>
              <Input
                id="youthName"
                value={ispData.youthName}
                onChange={(e) => handleInputChange('youthName', e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="youthId">ID:</Label>
              <Input
                id="youthId"
                value={ispData.youthId}
                onChange={(e) => handleInputChange('youthId', e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="dob">DOB:</Label>
              <Input
                id="dob"
                value={ispData.dob}
                onChange={(e) => handleInputChange('dob', e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="age">Age:</Label>
              <Input
                id="age"
                value={ispData.age}
                onChange={(e) => handleInputChange('age', e.target.value)}
                className="mt-1"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="admissionDate">Admission Date:</Label>
              <Input
                id="admissionDate"
                value={ispData.admissionDate}
                onChange={(e) => handleInputChange('admissionDate', e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="level">Level:</Label>
              <Input
                id="level"
                value={ispData.level}
                onChange={(e) => handleInputChange('level', e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="estStay">Est. Stay:</Label>
              <Input
                id="estStay"
                value={ispData.estStay}
                onChange={(e) => handleInputChange('estStay', e.target.value)}
                className="mt-1"
              />
            </div>
          </div>

          {/* Team Members */}
          <div>
            <Label className="text-base font-semibold">Team Members:</Label>
            <div className="flex flex-wrap gap-4 mt-2">
              {teamMemberOptions.map((member) => (
                <div key={member} className="flex items-center space-x-2">
                  <Checkbox
                    id={`team-${member}`}
                    checked={ispData.teamMembers.includes(member)}
                    onCheckedChange={(checked) => 
                      handleCheckboxChange('teamMembers', member, checked as boolean)
                    }
                  />
                  <Label htmlFor={`team-${member}`}>{member}</Label>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Behavioral Snapshot */}
          <div>
            <h3 className="text-lg font-semibold mb-4">BEHAVIORAL SNAPSHOT</h3>
            
            <div className="mb-4">
              <Label className="text-base font-medium">Risk Level:</Label>
              <div className="flex flex-wrap gap-4 mt-2">
                {riskLevels.map((level) => (
                  <div key={level} className="flex items-center space-x-2">
                    <Checkbox
                      id={`risk-${level}`}
                      checked={ispData.riskLevel === level}
                      onCheckedChange={(checked) => 
                        checked && handleInputChange('riskLevel', level)
                      }
                    />
                    <Label htmlFor={`risk-${level}`}>{level}</Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <Label className="text-base font-medium">Top Concerns: (check all that apply)</Label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
                {concernOptions.map((concern) => (
                  <div key={concern} className="flex items-center space-x-2">
                    <Checkbox
                      id={`concern-${concern}`}
                      checked={ispData.topConcerns.includes(concern)}
                      onCheckedChange={(checked) => 
                        handleCheckboxChange('topConcerns', concern, checked as boolean)
                      }
                    />
                    <Label htmlFor={`concern-${concern}`} className="text-sm">{concern}</Label>
                  </div>
                ))}
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="concern-other"
                    checked={ispData.otherConcern !== ''}
                    onCheckedChange={(checked) => 
                      !checked && handleInputChange('otherConcern', '')
                    }
                  />
                  <Label htmlFor="concern-other" className="text-sm">Other:</Label>
                  <Input
                    value={ispData.otherConcern}
                    onChange={(e) => handleInputChange('otherConcern', e.target.value)}
                    className="h-8 text-sm"
                    placeholder="Specify..."
                  />
                </div>
              </div>
            </div>

            <div>
              <Label className="text-base font-medium">Strengths: (check all that apply)</Label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
                {strengthOptions.map((strength) => (
                  <div key={strength} className="flex items-center space-x-2">
                    <Checkbox
                      id={`strength-${strength}`}
                      checked={ispData.strengths.includes(strength)}
                      onCheckedChange={(checked) => 
                        handleCheckboxChange('strengths', strength, checked as boolean)
                      }
                    />
                    <Label htmlFor={`strength-${strength}`} className="text-sm">{strength}</Label>
                  </div>
                ))}
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="strength-other"
                    checked={ispData.otherStrength !== ''}
                    onCheckedChange={(checked) => 
                      !checked && handleInputChange('otherStrength', '')
                    }
                  />
                  <Label htmlFor="strength-other" className="text-sm">Other:</Label>
                  <Input
                    value={ispData.otherStrength}
                    onChange={(e) => handleInputChange('otherStrength', e.target.value)}
                    className="h-8 text-sm"
                    placeholder="Specify..."
                  />
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Treatment Goals */}
          <div>
            <h3 className="text-lg font-semibold mb-4">TREATMENT GOALS</h3>
            
            {/* Goal 1 */}
            <div className="mb-6 p-4 border rounded-lg">
              <Label htmlFor="goal1" className="text-base font-medium">GOAL 1:</Label>
              <Input
                id="goal1"
                value={ispData.goal1}
                onChange={(e) => handleInputChange('goal1', e.target.value)}
                className="mt-2 mb-4"
              />
              
              <div className="mb-4">
                <Label className="text-sm font-medium">Type:</Label>
                <div className="flex flex-wrap gap-4 mt-2">
                  {goalTypes.map((type) => (
                    <div key={type} className="flex items-center space-x-2">
                      <Checkbox
                        id={`goal1-type-${type}`}
                        checked={ispData.goal1Type === type}
                        onCheckedChange={(checked) => 
                          checked && handleInputChange('goal1Type', type)
                        }
                      />
                      <Label htmlFor={`goal1-type-${type}`} className="text-sm">{type}</Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mb-4">
                <Label htmlFor="goal1Strategies" className="text-sm font-medium">Key Strategies:</Label>
                <Textarea
                  id="goal1Strategies"
                  value={ispData.goal1Strategies}
                  onChange={(e) => handleInputChange('goal1Strategies', e.target.value)}
                  className="mt-2"
                  rows={4}
                />
              </div>

              <div>
                <Label htmlFor="goal1Skill" className="text-sm font-medium">Main Skill to Develop:</Label>
                <Input
                  id="goal1Skill"
                  value={ispData.goal1Skill}
                  onChange={(e) => handleInputChange('goal1Skill', e.target.value)}
                  className="mt-2"
                />
              </div>
            </div>

            {/* Goal 2 */}
            <div className="mb-6 p-4 border rounded-lg">
              <Label htmlFor="goal2" className="text-base font-medium">GOAL 2:</Label>
              <Input
                id="goal2"
                value={ispData.goal2}
                onChange={(e) => handleInputChange('goal2', e.target.value)}
                className="mt-2 mb-4"
              />
              
              <div className="mb-4">
                <Label className="text-sm font-medium">Type:</Label>
                <div className="flex flex-wrap gap-4 mt-2">
                  {goalTypes.map((type) => (
                    <div key={type} className="flex items-center space-x-2">
                      <Checkbox
                        id={`goal2-type-${type}`}
                        checked={ispData.goal2Type === type}
                        onCheckedChange={(checked) => 
                          checked && handleInputChange('goal2Type', type)
                        }
                      />
                      <Label htmlFor={`goal2-type-${type}`} className="text-sm">{type}</Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mb-4">
                <Label htmlFor="goal2Strategies" className="text-sm font-medium">Key Strategies:</Label>
                <Textarea
                  id="goal2Strategies"
                  value={ispData.goal2Strategies}
                  onChange={(e) => handleInputChange('goal2Strategies', e.target.value)}
                  className="mt-2"
                  rows={4}
                />
              </div>

              <div>
                <Label htmlFor="goal2Skill" className="text-sm font-medium">Main Skill to Develop:</Label>
                <Input
                  id="goal2Skill"
                  value={ispData.goal2Skill}
                  onChange={(e) => handleInputChange('goal2Skill', e.target.value)}
                  className="mt-2"
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Quick Support Plan */}
          <div>
            <h3 className="text-lg font-semibold mb-4">QUICK SUPPORT PLAN</h3>
            
            <div className="mb-4">
              <Label className="text-base font-medium">Early Warning Signs:</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                {warningSignOptions.map((sign) => (
                  <div key={sign} className="flex items-center space-x-2">
                    <Checkbox
                      id={`warning-${sign}`}
                      checked={ispData.earlyWarningSigns.includes(sign)}
                      onCheckedChange={(checked) => 
                        handleCheckboxChange('earlyWarningSigns', sign, checked as boolean)
                      }
                    />
                    <Label htmlFor={`warning-${sign}`} className="text-sm">{sign}</Label>
                  </div>
                ))}
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="warning-other"
                    checked={ispData.otherWarningSign !== ''}
                    onCheckedChange={(checked) => 
                      !checked && handleInputChange('otherWarningSign', '')
                    }
                  />
                  <Label htmlFor="warning-other" className="text-sm">Other:</Label>
                  <Input
                    value={ispData.otherWarningSign}
                    onChange={(e) => handleInputChange('otherWarningSign', e.target.value)}
                    className="h-8 text-sm"
                    placeholder="Specify..."
                  />
                </div>
              </div>
            </div>

            <div className="mb-4">
              <Label className="text-base font-medium">What Helps:</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                {whatHelpsOptions.map((help) => (
                  <div key={help} className="flex items-center space-x-2">
                    <Checkbox
                      id={`help-${help}`}
                      checked={ispData.whatHelps.includes(help)}
                      onCheckedChange={(checked) => 
                        handleCheckboxChange('whatHelps', help, checked as boolean)
                      }
                    />
                    <Label htmlFor={`help-${help}`} className="text-sm">{help}</Label>
                  </div>
                ))}
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="help-other"
                    checked={ispData.otherWhatHelps !== ''}
                    onCheckedChange={(checked) => 
                      !checked && handleInputChange('otherWhatHelps', '')
                    }
                  />
                  <Label htmlFor="help-other" className="text-sm">Other:</Label>
                  <Input
                    value={ispData.otherWhatHelps}
                    onChange={(e) => handleInputChange('otherWhatHelps', e.target.value)}
                    className="h-8 text-sm"
                    placeholder="Specify..."
                  />
                </div>
              </div>
            </div>

            <div className="mb-4">
              <Label className="text-base font-medium">Best Staff Approach:</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                {staffApproachOptions.map((approach) => (
                  <div key={approach} className="flex items-center space-x-2">
                    <Checkbox
                      id={`approach-${approach}`}
                      checked={ispData.staffApproach.includes(approach)}
                      onCheckedChange={(checked) => 
                        handleCheckboxChange('staffApproach', approach, checked as boolean)
                      }
                    />
                    <Label htmlFor={`approach-${approach}`} className="text-sm">{approach}</Label>
                  </div>
                ))}
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="approach-other"
                    checked={ispData.otherStaffApproach !== ''}
                    onCheckedChange={(checked) => 
                      !checked && handleInputChange('otherStaffApproach', '')
                    }
                  />
                  <Label htmlFor="approach-other" className="text-sm">Other:</Label>
                  <Input
                    value={ispData.otherStaffApproach}
                    onChange={(e) => handleInputChange('otherStaffApproach', e.target.value)}
                    className="h-8 text-sm"
                    placeholder="Specify..."
                  />
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Tracking Progress */}
          <div>
            <h3 className="text-lg font-semibold mb-4">TRACKING PROGRESS</h3>
            
            <div className="mb-4">
              <Label className="text-base font-medium">Daily Measure:</Label>
              <div className="flex flex-wrap gap-4 mt-2">
                {dailyMeasureOptions.map((measure) => (
                  <div key={measure} className="flex items-center space-x-2">
                    <Checkbox
                      id={`measure-${measure}`}
                      checked={ispData.dailyMeasure.includes(measure)}
                      onCheckedChange={(checked) => 
                        handleCheckboxChange('dailyMeasure', measure, checked as boolean)
                      }
                    />
                    <Label htmlFor={`measure-${measure}`} className="text-sm">{measure}</Label>
                  </div>
                ))}
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="measure-other"
                    checked={ispData.otherDailyMeasure !== ''}
                    onCheckedChange={(checked) => 
                      !checked && handleInputChange('otherDailyMeasure', '')
                    }
                  />
                  <Label htmlFor="measure-other" className="text-sm">Other:</Label>
                  <Input
                    value={ispData.otherDailyMeasure}
                    onChange={(e) => handleInputChange('otherDailyMeasure', e.target.value)}
                    className="h-8 text-sm"
                    placeholder="Specify..."
                  />
                </div>
              </div>
            </div>

            <div>
              <Label htmlFor="reviewDate" className="text-base font-medium">Review Date:</Label>
              <Input
                id="reviewDate"
                type="date"
                value={ispData.reviewDate}
                onChange={(e) => handleInputChange('reviewDate', e.target.value)}
                className="mt-2 max-w-xs"
              />
            </div>
          </div>

          <Separator />

          {/* Signatures */}
          <div>
            <h3 className="text-lg font-semibold mb-4">SIGNATURES</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="youthSignature">Youth:</Label>
                <Input
                  id="youthSignature"
                  value={ispData.youthSignature}
                  onChange={(e) => handleInputChange('youthSignature', e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="staffSignature">Staff:</Label>
                <Input
                  id="staffSignature"
                  value={ispData.staffSignature}
                  onChange={(e) => handleInputChange('staffSignature', e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="signatureDate">Date:</Label>
                <Input
                  id="signatureDate"
                  type="date"
                  value={ispData.signatureDate}
                  onChange={(e) => handleInputChange('signatureDate', e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="max-w-4xl mx-auto p-6 print:p-0 print:max-w-none">
      <div className="flex justify-between items-center mb-6 print:hidden">
        <h1 className="text-2xl font-bold">Quick Individualized Service Plan (ISP)</h1>
        <div className="space-x-2">
          <Button onClick={handleSave} variant="outline">Save</Button>
          <Button onClick={handlePrint} className="flex items-center gap-2">
            <Printer className="h-4 w-4" />
            Print
          </Button>
        </div>
      </div>

      <div className="print:hidden">
        {renderFormView()}
      </div>
      
      <div className="hidden print:block">
        {renderPrintView()}
      </div>
    </div>
  );
};

export default QuickISPAssessment;