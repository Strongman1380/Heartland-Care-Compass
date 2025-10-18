import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { testAndCreateTable } from '@/utils/createSchoolIncidentsTable';
import { Button } from '@/components/ui/button';

export default function SupabaseTest() {
  const [status, setStatus] = useState('Testing...');
  const [tables, setTables] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [needsTableCreation, setNeedsTableCreation] = useState(false);

  useEffect(() => {
    const testConnection = async () => {
      try {
        // Test basic connection
        const { data, error: connectionError } = await supabase
          .from('youth')
          .select('count', { count: 'exact', head: true });
        
        if (connectionError) {
          setError(`Connection error: ${connectionError.message}`);
          setStatus('Connection failed');
          return;
        }

        setStatus('Connected to Supabase');

        // Try to list available tables by attempting to query common ones
        const tablesToTest = ['youth', 'behavior_points', 'school_incidents', 'progress_notes'];
        const availableTables: string[] = [];

        for (const table of tablesToTest) {
          try {
            const { error: tableError } = await supabase
              .from(table)
              .select('*', { count: 'exact', head: true });
            
            if (!tableError) {
              availableTables.push(table);
            }
          } catch (e) {
            // Table doesn't exist or no access
          }
        }

        setTables(availableTables);

        // Specifically test school_incidents
        const tableTest = await testAndCreateTable();
        if (!tableTest.success) {
          setError(tableTest.error || 'Unknown error');
          if (tableTest.needsTableCreation) {
            setNeedsTableCreation(true);
          }
        }

      } catch (e) {
        setError(`General error: ${e}`);
        setStatus('Test failed');
      }
    };

    testConnection();
  }, []);

  const handleCreateTable = () => {
    alert('To create the school_incidents table:\n\n1. Go to your Supabase dashboard\n2. Navigate to SQL Editor\n3. Run the SQL script from create_school_incidents_tables.sql\n\nOr copy the SQL from the project root directory.');
  };

  return (
    <div className="p-4 border rounded-lg bg-gray-50">
      <h3 className="font-bold mb-2">Supabase Connection Test</h3>
      <p><strong>Status:</strong> {status}</p>
      
      {tables.length > 0 && (
        <div className="mt-2">
          <strong>Available tables:</strong>
          <ul className="list-disc list-inside ml-4">
            {tables.map(table => (
              <li key={table} className="text-green-600">{table}</li>
            ))}
          </ul>
        </div>
      )}
      
      {error && (
        <div className="mt-2 p-2 bg-red-100 border border-red-300 rounded">
          <strong>Error:</strong> {error}
        </div>
      )}

      {needsTableCreation && (
        <div className="mt-2 p-2 bg-yellow-100 border border-yellow-300 rounded">
          <strong>Action Required:</strong> The school_incidents table needs to be created.
          <Button 
            onClick={handleCreateTable}
            className="ml-2 text-xs"
            variant="outline"
            size="sm"
          >
            Show Instructions
          </Button>
        </div>
      )}
    </div>
  );
}