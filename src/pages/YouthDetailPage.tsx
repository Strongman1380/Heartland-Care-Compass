import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { YouthDetailView } from "@/components/home/YouthDetailView";
import { useYouth } from "@/hooks/useSupabase";
import type { Youth } from "@/integrations/firebase/services";
import { BottomNav } from "@/components/layout/BottomNav";

const YouthDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { youths, loading, loadYouths } = useYouth();
  const [activeTab, setActiveTab] = useState("profile");

  useEffect(() => {
    loadYouths();
  }, [loadYouths]);

  const selectedYouth = youths.find((y) => y.id === id);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-yellow-50 to-red-100">
        <Header />
        <main className="container mx-auto px-4 py-6">
          <div className="text-center py-12">
            <p className="text-gray-600">Loading...</p>
          </div>
        </main>
      </div>
    );
  }

  if (!selectedYouth) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-yellow-50 to-red-100">
        <Header />
        <main className="container mx-auto px-4 py-6">
          <div className="text-center py-12 bg-white rounded-lg shadow-lg">
            <p className="text-red-600 text-lg font-semibold mb-2">Youth not found</p>
            <p className="text-gray-600 mb-4">The requested youth profile could not be loaded.</p>
            <button
              onClick={() => navigate("/")}
              className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Back to Dashboard
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-yellow-50 to-red-100">
      <Header />
      <main className="container mx-auto px-4 py-6 pb-24 lg:pb-8">
        <YouthDetailView
          youths={youths}
          selectedYouth={selectedYouth}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onBackToHome={() => navigate("/")}
          onYouthSelect={(youth: Youth) => navigate(`/youth/${youth.id}`)}
          onYouthUpdated={() => loadYouths()}
        />
      </main>
      <BottomNav />
    </div>
  );
};

export default YouthDetailPage;
