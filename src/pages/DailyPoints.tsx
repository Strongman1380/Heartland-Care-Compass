
import { Header } from "@/components/layout/Header";
import { BehaviorCard } from "@/components/behavior/BehaviorCard";

const DailyPoints = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-yellow-50 to-red-100">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-red-800 via-red-700 to-yellow-600 bg-clip-text text-transparent mb-4">
            Daily Points Management
          </h1>
          <p className="text-red-700 text-lg">Track and manage daily behavior points</p>
        </div>
        
        <BehaviorCard youthId={null} youth={null} />
      </main>
    </div>
  );
};

export default DailyPoints;
