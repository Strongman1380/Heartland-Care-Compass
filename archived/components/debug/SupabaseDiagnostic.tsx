import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabaseUtils, youthService } from '@/integrations/supabase/services';
import { supabase } from '@/integrations/supabase/client';

export const SupabaseDiagnostic: React.FC = () => {
  const [results, setResults] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [realColorsTestResult, setRealColorsTestResult] = useState<any>(null);
  const [isTestingRealColors, setIsTestingRealColors] = useState(false);

  const runDiagnostics = async () => {
    setLoading(true);
    const diagnosticResults: any = {};

    try {
      // Test basic connection
      console.log('Testing basic connection...');
      diagnosticResults.connection = await supabaseUtils.testConnection();

      // Test Real Colors field
      console.log('Testing Real Colors field...');
      diagnosticResults.realColorsField = await supabaseUtils.testRealColorsField();

      // Get table info
      console.log('Getting table info...');
      diagnosticResults.tableInfo = await supabaseUtils.getTableInfo();

      // Try to get all youth
      console.log('Getting all youth...');
      try {
        const youth = await youthService.getAll();
        diagnosticResults.youthCount = youth.length;
        diagnosticResults.sampleYouth = youth[0] || null;
      } catch (err) {
        diagnosticResults.youthError = err instanceof Error ? err.message : 'Unknown error';
      }

      // Test update on first youth if available
      if (diagnosticResults.sampleYouth) {
        console.log('Testing update on sample youth...');
        try {
          const testUpdate = await youthService.update(diagnosticResults.sampleYouth.id, {
            realColorsResult: 'test-diagnostic-value'
          });
          diagnosticResults.updateTest = 'SUCCESS';
          diagnosticResults.updateResult = testUpdate;
        } catch (err) {
          diagnosticResults.updateTest = 'FAILED';
          diagnosticResults.updateError = err instanceof Error ? err.message : 'Unknown error';
        }
      }

    } catch (err) {
      diagnosticResults.generalError = err instanceof Error ? err.message : 'Unknown error';
    }

    setResults(diagnosticResults);
    setLoading(false);
  };

  const testRealColorsUpdate = async () => {
    setIsTestingRealColors(true);
    setRealColorsTestResult(null);
    
    try {
      // Test with the specific youth ID that's failing
      const testYouthId = 'ab1c385b-3e52-4606-b1d7-e10e8bdec655';
      
      // First, let's check if this youth exists
      console.log('Checking if youth exists...');
      const { data: existingYouth, error: fetchError } = await supabase
        .from('youth')
        .select('id, firstName, lastName, realColorsResult')
        .eq('id', testYouthId)
        .single();
      
      if (fetchError) {
        console.error('Error fetching youth:', fetchError);
        setRealColorsTestResult({
          success: false,
          error: `Cannot fetch youth: ${fetchError.message}`,
          details: fetchError
        });
        return;
      }
      
      console.log('Existing youth data:', existingYouth);
      
      // Now test the update with the exact same format as the Real Colors component
      const testData = {
        realColorsResult: 'Blue/Gold'
      };
      
      console.log('Testing Real Colors update with data:', testData);
      
      const { data, error } = await supabase
        .from('youth')
        .update(testData)
        .eq('id', testYouthId)
        .select();
      
      if (error) {
        console.error('Real Colors update error:', error);
        setRealColorsTestResult({
          success: false,
          error: `Update Error: ${error.message}`,
          details: {
            error,
            existingYouth,
            attemptedUpdate: testData
          }
        });
      } else {
        console.log('Real Colors update success:', data);
        setRealColorsTestResult({
          success: true,
          message: 'Real Colors field update successful',
          data: {
            updated: data,
            original: existingYouth
          }
        });
      }
    } catch (err) {
      console.error('Real Colors test exception:', err);
      setRealColorsTestResult({
        success: false,
        error: `Exception: ${err instanceof Error ? err.message : 'Unknown error'}`,
        details: err
      });
    } finally {
      setIsTestingRealColors(false);
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>Supabase Diagnostic Tool</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-4">
          <Button onClick={runDiagnostics} disabled={loading}>
            {loading ? 'Running Diagnostics...' : 'Run Diagnostics'}
          </Button>
          
          <Button 
            onClick={testRealColorsUpdate} 
            disabled={isTestingRealColors}
            variant="outline"
          >
            {isTestingRealColors ? 'Testing Real Colors...' : 'Test Real Colors Update'}
          </Button>
        </div>

        {Object.keys(results).length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Diagnostic Results:</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 border rounded">
                <h4 className="font-medium">Connection Test</h4>
                <p className={results.connection ? 'text-green-600' : 'text-red-600'}>
                  {results.connection ? '✅ Connected' : '❌ Failed'}
                </p>
              </div>

              <div className="p-4 border rounded">
                <h4 className="font-medium">Real Colors Field Test</h4>
                <p className={results.realColorsField ? 'text-green-600' : 'text-red-600'}>
                  {results.realColorsField ? '✅ Field exists' : '❌ Field missing'}
                </p>
              </div>

              <div className="p-4 border rounded">
                <h4 className="font-medium">Youth Count</h4>
                <p>{results.youthCount !== undefined ? `${results.youthCount} records` : 'N/A'}</p>
                {results.youthError && (
                  <p className="text-red-600 text-sm">Error: {results.youthError}</p>
                )}
              </div>

              <div className="p-4 border rounded">
                <h4 className="font-medium">Update Test</h4>
                <p className={results.updateTest === 'SUCCESS' ? 'text-green-600' : 'text-red-600'}>
                  {results.updateTest || 'Not run'}
                </p>
                {results.updateError && (
                  <p className="text-red-600 text-sm">Error: {results.updateError}</p>
                )}
              </div>
            </div>

            {results.sampleYouth && (
              <div className="p-4 border rounded">
                <h4 className="font-medium">Sample Youth Record Fields</h4>
                <div className="text-sm">
                  <p>Available fields: {Object.keys(results.sampleYouth).join(', ')}</p>
                  <p className="mt-2">
                    Real Colors Result: {results.sampleYouth.realColorsResult || 'null'}
                  </p>
                </div>
              </div>
            )}

            {results.generalError && (
              <div className="p-4 border rounded bg-red-50">
                <h4 className="font-medium text-red-800">General Error</h4>
                <p className="text-red-600">{results.generalError}</p>
              </div>
            )}

            <div className="p-4 border rounded bg-gray-50">
              <h4 className="font-medium">Raw Results (for debugging)</h4>
              <pre className="text-xs overflow-auto max-h-64">
                {JSON.stringify(results, null, 2)}
              </pre>
            </div>
          </div>
        )}

        {realColorsTestResult && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Real Colors Update Test Results:</h3>
            
            <div className={`p-4 border rounded ${realColorsTestResult.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
              <h4 className="font-medium">
                {realColorsTestResult.success ? '✅ Test Passed' : '❌ Test Failed'}
              </h4>
              <p className="text-sm mt-2">
                {realColorsTestResult.message || realColorsTestResult.error}
              </p>
              
              {realColorsTestResult.details && (
                <div className="mt-4">
                  <h5 className="font-medium text-sm">Details:</h5>
                  <pre className="text-xs overflow-auto max-h-64 bg-white p-2 rounded border mt-2">
                    {JSON.stringify(realColorsTestResult.details, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};