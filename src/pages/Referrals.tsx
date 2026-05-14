import React from "react";
import { Header } from "@/components/layout/Header";
import { ReferralTab } from "@/components/referral/ReferralTab";

class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean, error: any}> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }
  componentDidCatch(error: any, errorInfo: any) {
    console.error("[Referrals Error Boundary] Caught error:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 border-4 border-red-500 bg-red-50 text-red-900 rounded-xl m-4 shadow-2xl">
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
            <span className="text-3xl">⚠️</span> Referral Tab Crashed
          </h2>
          <div className="bg-white p-4 border-2 border-red-200 rounded-lg overflow-auto max-h-[60vh]">
            <p className="font-bold text-red-700 mb-2 underline">Error Details:</p>
            <pre className="whitespace-pre-wrap text-sm font-mono text-slate-800">
              {this.state.error?.stack || this.state.error?.message || String(this.state.error)}
            </pre>
          </div>
          <button 
            onClick={() => window.location.reload()}
            className="mt-6 px-6 py-2 bg-red-600 text-white rounded-full font-bold hover:bg-red-700 transition-colors shadow-md"
          >
            Reload Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const Referrals = () => {
  console.log("[Referrals Page] Mounting...");
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
        <ErrorBoundary>
          <ReferralTab />
        </ErrorBoundary>
      </main>
    </div>
  );
};

export default Referrals;
