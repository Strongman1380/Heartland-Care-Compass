
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const WelcomeSection = () => {
  return (
    <div className="bg-white rounded-lg shadow-lg border-2 border-yellow-300 p-6 mb-8">
      <div className="text-center">
        <img 
          src={`${import.meta.env.BASE_URL}files/BoysHomeLogo.png`}
          alt="Heartland Boys Home Logo" 
          className="w-24 h-24 mx-auto mb-4 rounded-full bg-gradient-to-br from-red-100 to-yellow-100 p-2 object-contain"
        />
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-red-800 via-red-700 to-yellow-600 bg-clip-text text-transparent mb-4">
          Welcome to the Heartland Boys Home Platform
        </h1>
        <p className="text-red-600 text-base sm:text-lg mb-6">
          Select a youth from the profiles below to manage their information and track their progress.
        </p>
        <div className="p-4 bg-gradient-to-r from-red-100 to-yellow-100 rounded-lg border border-yellow-300">
          <p className="text-red-700 font-medium">Building character, one day at a time.</p>
        </div>
      </div>
    </div>
  );
};
