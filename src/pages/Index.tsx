
import { useState } from "react";
import { YouthDashboard } from "@/components/dashboard/YouthDashboard";
import { YouthSelector } from "@/components/common/YouthSelector";
import { Header } from "@/components/layout/Header";
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Initialize Firebase
const firebaseConfig = {
  apiKey: "YOUR_API_KEY", // Replace with your Firebase API key
  authDomain: "heartland-boys-home.firebaseapp.com",
  projectId: "heartland-boys-home",
  storageBucket: "heartland-boys-home.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);

export const firebaseApp = app;
export const firestore = db;
export const firebaseStorage = storage;

const Index = () => {
  const [selectedYouthId, setSelectedYouthId] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-blue-800 mb-6">Heartland Boys Home Platform</h1>
        
        <div className="mb-6">
          <YouthSelector onSelectYouth={setSelectedYouthId} />
        </div>
        
        {selectedYouthId ? (
          <YouthDashboard youthId={selectedYouthId} />
        ) : (
          <div className="bg-white p-8 rounded-lg shadow-md text-center">
            <h2 className="text-xl font-semibold text-gray-700 mb-4">Welcome to the Heartland Boys Home Platform</h2>
            <p className="text-gray-600 mb-6">Please select a youth to view their profile, track behavior, add progress notes, and generate reports.</p>
            <div className="flex flex-wrap justify-center gap-6">
              {/* Module Cards */}
              {["Youth Profile", "Behavior Cards", "Progress Notes", "Behavior Analysis", 
                "Risk Assessment", "Success Plans", "KPI Dashboard", "Report Center"].map((module) => (
                <div key={module} className="bg-blue-50 border-l-4 border-blue-600 p-5 rounded-md shadow w-64 hover:bg-blue-100 transition-colors cursor-pointer">
                  <h3 className="font-medium text-blue-800">{module}</h3>
                  <p className="text-sm text-gray-600 mt-2">Access the {module.toLowerCase()} module to manage youth data.</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
      <footer className="bg-gray-100 py-4 text-center text-gray-600 text-sm">
        <p>Heartland Boys Home Platform &copy; {new Date().getFullYear()}</p>
      </footer>
    </div>
  );
};

export default Index;
