import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Home, ArrowLeft, AlertTriangle } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    // Log to analytics or monitoring service instead of console in production
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 via-yellow-50 to-red-100 p-4">
      <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-lg text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertTriangle size={32} className="text-red-600" />
        </div>
        <h1 className="text-5xl font-bold text-red-700 mb-4">404</h1>
        <h2 className="text-2xl font-semibold mb-2">Page Not Found</h2>
        <p className="text-gray-600 mb-8">
          Sorry, we couldn't find the page you're looking for. The page may have been moved or doesn't exist.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button asChild variant="default" className="bg-red-600 hover:bg-red-700">
            <Link to="/">
              <Home size={16} className="mr-2" />
              Return Home
            </Link>
          </Button>
          <Button asChild variant="outline" className="border-red-200 text-red-700 hover:bg-red-50">
            <Link to="#" onClick={() => window.history.back()}>
              <ArrowLeft size={16} className="mr-2" />
              Go Back
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
