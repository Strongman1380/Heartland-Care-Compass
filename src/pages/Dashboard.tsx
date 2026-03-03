import { useState, useEffect } from "react";
import { Header } from "@/components/layout/Header";
import { YouthDashboard } from "@/components/dashboard/YouthDashboard";
import { YouthSelector } from "@/components/common/YouthSelector";
import { AwardsSection } from "@/components/common/AwardsSection";
import { AIQueryInterface } from "@/components/ai/AIQueryInterface";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, Users, TrendingUp, TrendingDown } from "lucide-react";
import { format } from "date-fns";
import { levelEventService, type LevelEvent } from "@/integrations/firebase/services";

const Dashboard = () => {
  const [selectedYouthId, setSelectedYouthId] = useState<string | undefined>(undefined);
  const [activeTab, setActiveTab] = useState<string>("youth");
  const [levelEvents, setLevelEvents] = useState<LevelEvent[]>([]);

  useEffect(() => {
    levelEventService.getRecent(10)
      .then(setLevelEvents)
      .catch(console.error);
  }, []);

  const handleYouthSelect = (youthId: string) => {
    setSelectedYouthId(youthId);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-yellow-50 to-red-100">
      <Header />
      <main className="container mx-auto px-4 py-6 pb-24 lg:pb-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-red-800 via-red-700 to-yellow-600 bg-clip-text text-transparent mb-4">
            Dashboard
          </h1>
          <p className="text-red-700 text-base sm:text-lg">Overview of youth performance and analytics</p>
        </div>
        
        {/* Tab Navigation */}
        <div className="mb-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full max-w-md mx-auto grid-cols-2">
              <TabsTrigger value="youth" className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                Youth List
              </TabsTrigger>
              <TabsTrigger value="ai" className="flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                AI Assistant
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="youth" className="mt-6">
              {!selectedYouthId ? (
                <div className="space-y-4">
                  <AwardsSection />
                  <YouthSelector
                    onSelectYouth={handleYouthSelect}
                    selectedYouthId={selectedYouthId}
                    showAwards={false}
                  />
                </div>
              ) : (
                <YouthDashboard youthId={selectedYouthId} />
              )}
            </TabsContent>
            
            <TabsContent value="ai" className="mt-6">
              <AIQueryInterface 
                placeholder="Ask me about youth data, behavior trends, or get help with documentation..."
                suggestions={[
                  "Which youth have the highest behavioral ratings this week?",
                  "Show me youth who had incidents in the last 30 days",
                  "What is the average daily points across all youth?",
                  "Generate a summary of all recent case notes",
                  "Which youth are candidates for level advancement?",
                  "Show me trends in peer interactions over time",
                ]}
              />
            </TabsContent>
          </Tabs>
        </div>

        {/* Recent Level Changes */}
        <Card className="mt-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-red-700" />
              Recent Level Changes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {levelEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground">No level changes recorded yet.</p>
            ) : (
              <div className="divide-y divide-border">
                {levelEvents.map((event) => (
                  <div key={event.id} className="flex items-center gap-3 py-2">
                    {event.direction === 'level_up' ? (
                      <TrendingUp className="h-4 w-4 text-green-600 flex-shrink-0" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-red-500 flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <span className="font-medium text-sm">{event.youthName}</span>
                      <span className="text-sm text-muted-foreground ml-2">
                        Level {event.fromLevel} → {event.toLevel}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground flex-shrink-0 text-right">
                      <div>{event.changedBy}</div>
                      <div>{format(new Date(event.timestamp), "MMM d, h:mm a")}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Dashboard;
