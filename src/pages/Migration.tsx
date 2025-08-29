import React from 'react';
import { DataMigration } from '../components/DataMigration';
import { Button } from '../components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Migration: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate('/')}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Database Migration
            </h1>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Upgrade your Heartland Care Compass to use MongoDB for better data reliability, 
              multi-user access, and enhanced security. This process will safely transfer all 
              your existing data from browser storage to the cloud database.
            </p>
          </div>
        </div>

        <DataMigration />

        <div className="mt-8 text-center">
          <div className="bg-white p-6 rounded-lg shadow-sm border max-w-2xl mx-auto">
            <h3 className="text-lg font-semibold mb-3">Why Migrate to MongoDB?</h3>
            <div className="grid md:grid-cols-2 gap-4 text-sm text-gray-600">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">🔒 Enhanced Security</h4>
                <p>HIPAA-compliant data storage with encryption and secure access controls.</p>
              </div>
              <div>
                <h4 className="font-medium text-gray-900 mb-2">👥 Multi-User Access</h4>
                <p>Multiple staff members can access and update youth data simultaneously.</p>
              </div>
              <div>
                <h4 className="font-medium text-gray-900 mb-2">💾 Data Reliability</h4>
                <p>Automatic backups and no risk of data loss from browser cache clearing.</p>
              </div>
              <div>
                <h4 className="font-medium text-gray-900 mb-2">📊 Advanced Analytics</h4>
                <p>Better reporting capabilities and data analysis across all youth.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Migration;