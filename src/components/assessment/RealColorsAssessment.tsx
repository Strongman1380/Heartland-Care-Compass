import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { supabase } from '@/integrations/supabase/client';
import { Youth, mapYouthFromSupabase } from '@/types/app-types';
import { User, Palette, FileText, Save } from 'lucide-react';

const COLOR_PROFILES = {
  Gold: {
    description: "I am stable and dependable by nature. I can stick to detailed tasks and see them through. Because of this, I am the person others come to when they need a job done. I am highly responsible and believe that work comes before play. I am neat, orderly and well organized. I follow rules and procedures and have a deep respect for regulations and authority. I am not comfortable in unstructured situations. I am loyal and faithful in my relationships.",
    traits: ["dependable", "organized", "thorough", "sensible", "punctual", "caring", "loyal", "natural preserver", "parent", "helper"],
    characteristics: {
      "Esteemed for": "Being dependable",
      "Stressed by": "Lack of order", 
      "Highest virtue is": "Responsibility",
      "On the job": "Organizer",
      "Primary needs": "To provide stability and order; to be in control",
      "Seek for": "Security",
      "Take pride in": "Dependability"
    }
  },
  Blue: {
    description: "I am nurturing by nature. I have a vivid imagination and love to talk with others about the way I feel and to learn about their feelings. I will do almost anything to avoid conflict or a confrontation. I am drawn to the helping professions where I feel I can have a greater influence on others and help them discover ways to live more significant lives. I am a true romantic. I value integrity and unity in relationships.",
    traits: ["sympathetic", "communicative", "compassionate", "idealistic", "sincere", "imaginative"],
    characteristics: {
      "Esteemed for": "Being a good listener",
      "Stressed by": "Feeling artificial",
      "Highest virtue is": "Loyalty", 
      "On the job": "Peacemaker",
      "Primary needs": "To be authentic and care for others",
      "Seek for": "Love and acceptance",
      "Take pride in": "Empathy"
    }
  },
  Green: {
    description: "I am non-conforming by nature. I think in abstract terms and I am always curious. I take time to analyze things. I am independent and because of this people often think that I am impersonal. The truth is that I am more comfortable with things than people. I question authority and have to respect someone before I value their advice. I am impatient with routines. I can get hooked on acquiring and storing knowledge. I am a natural non-conformist, and visionary.",
    traits: ["perfectionistic", "analytical", "conceptual", "cool", "calm", "inventive", "logical"],
    characteristics: {
      "Esteemed for": "Discovering new insights",
      "Stressed by": "Feeling inadequate",
      "Highest virtue is": "Objectivity",
      "On the job": "Pragmatist", 
      "Primary needs": "To be competent and rational",
      "Seek for": "Insight and knowledge",
      "Take pride in": "Competence"
    }
  },
  Orange: {
    description: "I am fun-loving by nature. I have lots of energy to try new and exciting things. I am easily bored and grow restless with routine and structured jobs or activities. I need the freedom to go and do what I want. I have a hard time following rules and regulations or respecting authority. I learn by and through my experiences. I constantly look for excitement. I act on a moment's notice and value skill, resourcefulness, and courage.",
    traits: ["witty", "spontaneous", "generous", "optimistic", "eager", "bold"],
    characteristics: {
      "Esteemed for": "Being fun; taking risks",
      "Stressed by": "Restrictions",
      "Highest virtue is": "Courage",
      "On the job": "Energizer",
      "Primary needs": "To be free and spontaneous", 
      "Seek for": "Freedom",
      "Take pride in": "Impact"
    }
  }
};

const COLOR_VARIANTS = {
  Gold: "bg-yellow-100 text-yellow-800 border-yellow-300",
  Blue: "bg-blue-100 text-blue-800 border-blue-300", 
  Green: "bg-green-100 text-green-800 border-green-300",
  Orange: "bg-orange-100 text-orange-800 border-orange-300"
};

interface RealColorsAssessmentProps {
  selectedYouth?: Youth;
}

export const RealColorsAssessment = ({ selectedYouth }: RealColorsAssessmentProps) => {
  const [primaryColor, setPrimaryColor] = useState<string>("");
  const [secondaryColor, setSecondaryColor] = useState<string>("");
  const [insights, setInsights] = useState("");
  const [comments, setComments] = useState("");
  const [observations, setObservations] = useState("");
  const [isScreening, setIsScreening] = useState(false);
  const [completedBy, setCompletedBy] = useState("");
  const [youthSelection, setYouthSelection] = useState<'existing' | 'new'>('existing');
  const [selectedYouthId, setSelectedYouthId] = useState<string>("");
  const [youths, setYouths] = useState<Youth[]>([]);
  const [newYouthName, setNewYouthName] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchYouths();
    if (selectedYouth) {
      setSelectedYouthId(selectedYouth.id);
      setYouthSelection('existing');
    }
  }, [selectedYouth]);

  const fetchYouths = async () => {
    try {
      const { data, error } = await supabase
        .from('youths')
        .select('*')
        .order('firstname');
      
      if (error) throw error;
      setYouths((data || []).map(mapYouthFromSupabase));
    } catch (error) {
      console.error('Error fetching youths:', error);
      toast({
        title: "Error",
        description: "Failed to fetch youth data",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setPrimaryColor("");
    setSecondaryColor("");
    setInsights("");
    setComments("");
    setObservations("");
    setIsScreening(false);
    setCompletedBy("");
    setNewYouthName("");
  };

  const handleSubmit = async () => {
    if (!primaryColor) {
      toast({
        title: "Validation Error",
        description: "Primary color is required",
        variant: "destructive",
      });
      return;
    }

    if (youthSelection === 'existing' && !selectedYouthId) {
      toast({
        title: "Validation Error", 
        description: "Please select a youth",
        variant: "destructive",
      });
      return;
    }

    if (youthSelection === 'new' && !newYouthName.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter youth name for new assessment",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      let youthId = selectedYouthId;

      if (youthSelection === 'new') {
        const [firstName, ...lastNameParts] = newYouthName.trim().split(' ');
        const lastName = lastNameParts.join(' ');

        const { data: newYouth, error: youthError } = await supabase
          .from('youths')
          .insert({
            firstname: firstName,
            lastname: lastName || '',
          })
          .select()
          .single();

        if (youthError) throw youthError;
        youthId = newYouth.id;
      }

      const { error } = await supabase
        .from('real_colors_assessments')
        .insert({
          youth_id: youthId,
          primary_color: primaryColor,
          secondary_color: secondaryColor === 'none' ? null : secondaryColor || null,
          insights: insights || null,
          comments: comments || null,
          observations: observations || null,
          is_screening: isScreening,
          completed_by: completedBy || null,
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Real Colors assessment saved successfully",
      });

      resetForm();
      fetchYouths();

    } catch (error) {
      console.error('Error saving assessment:', error);
      toast({
        title: "Error",
        description: "Failed to save assessment",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const selectedColorProfile = primaryColor ? COLOR_PROFILES[primaryColor as keyof typeof COLOR_PROFILES] : null;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Real Colors Personality Assessment
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Youth Selection */}
          <div className="space-y-4">
            <Label className="text-base font-medium">Youth Selection</Label>
            <div className="flex gap-4">
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  checked={youthSelection === 'existing'}
                  onChange={() => setYouthSelection('existing')}
                  className="form-radio"
                />
                <span>Existing Youth</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  checked={youthSelection === 'new'}
                  onChange={() => setYouthSelection('new')}
                  className="form-radio"
                />
                <span>New Youth</span>
              </label>
            </div>

            {youthSelection === 'existing' ? (
              <Select value={selectedYouthId} onValueChange={setSelectedYouthId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a youth" />
                </SelectTrigger>
                <SelectContent>
                  {youths.map((youth) => (
                    <SelectItem key={youth.id} value={youth.id}>
                      {youth.firstName} {youth.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                placeholder="Enter youth name"
                value={newYouthName}
                onChange={(e) => setNewYouthName(e.target.value)}
              />
            )}
          </div>

          {/* Assessment Type */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="screening"
              checked={isScreening}
              onCheckedChange={(checked) => setIsScreening(checked === true)}
            />
            <Label htmlFor="screening">Quick Screening (for follow-up assessments)</Label>
          </div>

          {/* Primary Color */}
          <div className="space-y-2">
            <Label className="text-base font-medium">Primary Color *</Label>
            <Select value={primaryColor} onValueChange={setPrimaryColor}>
              <SelectTrigger>
                <SelectValue placeholder="Select primary color" />
              </SelectTrigger>
              <SelectContent>
                {Object.keys(COLOR_PROFILES).map((color) => (
                  <SelectItem key={color} value={color}>
                    <div className="flex items-center gap-2">
                      <div className={`w-4 h-4 rounded-full ${
                        color === 'Gold' ? 'bg-yellow-400' :
                        color === 'Blue' ? 'bg-blue-400' :
                        color === 'Green' ? 'bg-green-400' : 'bg-orange-400'
                      }`} />
                      {color}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Secondary Color */}
          <div className="space-y-2">
            <Label className="text-base font-medium">Secondary Color</Label>
            <Select value={secondaryColor} onValueChange={setSecondaryColor}>
              <SelectTrigger>
                <SelectValue placeholder="Select secondary color (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {Object.keys(COLOR_PROFILES)
                  .filter(color => color !== primaryColor)
                  .map((color) => (
                  <SelectItem key={color} value={color}>
                    <div className="flex items-center gap-2">
                      <div className={`w-4 h-4 rounded-full ${
                        color === 'Gold' ? 'bg-yellow-400' :
                        color === 'Blue' ? 'bg-blue-400' :
                        color === 'Green' ? 'bg-green-400' : 'bg-orange-400'
                      }`} />
                      {color}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Color Profile Display */}
          {selectedColorProfile && (
            <Card className="border-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Badge className={COLOR_VARIANTS[primaryColor as keyof typeof COLOR_VARIANTS]}>
                    {primaryColor}
                  </Badge>
                  Color Profile
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Description:</h4>
                  <p className="text-sm text-muted-foreground">{selectedColorProfile.description}</p>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">Key Traits:</h4>
                  <div className="flex flex-wrap gap-1">
                    {selectedColorProfile.traits.map((trait, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {trait}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Characteristics:</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                    {Object.entries(selectedColorProfile.characteristics).map(([key, value]) => (
                      <div key={key}>
                        <span className="font-medium">{key}:</span> {value}
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Assessment Details */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="insights">Insights</Label>
              <Textarea
                id="insights"
                placeholder="Key insights from the assessment..."
                value={insights}
                onChange={(e) => setInsights(e.target.value)}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="comments">Comments</Label>
              <Textarea
                id="comments"
                placeholder="Additional comments..."
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="observations">Observations</Label>
              <Textarea
                id="observations"
                placeholder="Behavioral observations during assessment..."
                value={observations}
                onChange={(e) => setObservations(e.target.value)}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="completedBy">Completed By</Label>
              <Input
                id="completedBy"
                placeholder="Staff member name"
                value={completedBy}
                onChange={(e) => setCompletedBy(e.target.value)}
              />
            </div>
          </div>

          {/* Submit Button */}
          <Button 
            onClick={handleSubmit} 
            disabled={loading}
            className="w-full"
          >
            <Save className="h-4 w-4 mr-2" />
            {loading ? 'Saving...' : 'Save Assessment'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};