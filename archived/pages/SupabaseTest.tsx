import React from 'react'
import { Header } from '@/components/layout/Header'
import SupabaseTest from '@/components/common/SupabaseTest'
import { SupabaseDiagnostic } from '@/components/debug/SupabaseDiagnostic'

const SupabaseTestPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Supabase Database Test
            </h1>
            <p className="text-gray-600">
              Test your Supabase connection and database setup
            </p>
          </div>
          
          <div className="flex justify-center mb-8">
            <SupabaseTest />
          </div>
          
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Advanced Diagnostics
            </h2>
            <SupabaseDiagnostic />
          </div>
          
          <div className="mt-8 p-6 bg-white rounded-lg shadow-sm">
            <h2 className="text-xl font-semibold mb-4">Setup Instructions</h2>
            <div className="space-y-4 text-sm">
              <div>
                <h3 className="font-medium">1. Run the SQL Schema</h3>
                <p className="text-gray-600">
                  Go to your Supabase dashboard → SQL Editor and run the contents of <code>supabase-schema.sql</code>
                </p>
              </div>
              
              <div>
                <h3 className="font-medium">2. Environment Variables</h3>
                <p className="text-gray-600">
                  Your <code>.env</code> file has been updated with your Supabase credentials.
                </p>
              </div>
              
              <div>
                <h3 className="font-medium">3. Test Connection</h3>
                <p className="text-gray-600">
                  Use the test component above to verify your connection is working.
                </p>
              </div>
              
              <div>
                <h3 className="font-medium">4. Migration (Optional)</h3>
                <p className="text-gray-600">
                  If you have existing data in MongoDB, you'll need to migrate it to Supabase.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SupabaseTestPage