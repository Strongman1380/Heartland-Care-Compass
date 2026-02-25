import { Header } from "@/components/layout/Header";
import { ReferralTab } from "@/components/referral/ReferralTab";

const Referrals = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-yellow-50 to-red-100">
      <Header />
      <main className="container mx-auto px-4 py-6 pb-24 lg:pb-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-red-800 via-red-700 to-yellow-600 bg-clip-text text-transparent mb-4">
            Referral Management
          </h1>
          <p className="text-red-700 text-base sm:text-lg">
            Standalone referral intake, tracking, interview reports, and leadership summaries
          </p>
        </div>
        <ReferralTab />
      </main>
    </div>
  );
};

export default Referrals;
