import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { Progress } from './ui/progress';
import { Badge } from './ui/badge';
import { CheckCircle, AlertCircle, Download, Database, HardDrive } from 'lucide-react';
import { dataMigration } from '../lib/migration';
import { apiClient } from '../lib/api';

interface MigrationStep {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  error?: string;
}

export const DataMigration: React.FC = () => {
  const [hasLocalData, setHasLocalData] = useState(false);
  const [dataSummary, setDataSummary] = useState<any>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [hasToken, setHasToken] = useState<boolean>(() => !!localStorage.getItem('auth_token'));
  const [apiKey, setApiKey] = useState<string>('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [migrationSteps, setMigrationSteps] = useState<MigrationStep[]>([
    {
      id: 'backup',
      title: 'Backup Local Data',
      description: 'Create a backup file of your current data',
      status: 'pending'
    },
    {
      id: 'migrate',
      title: 'Migrate to Database',
      description: 'Transfer data from localStorage to MongoDB',
      status: 'pending'
    },
    {
      id: 'verify',
      title: 'Verify Migration',
      description: 'Confirm all data was transferred correctly',
      status: 'pending'
    },
    {
      id: 'cleanup',
      title: 'Clean Up',
      description: 'Remove data from localStorage (optional)',
      status: 'pending'
    }
  ]);
  const [currentStep, setCurrentStep] = useState<string | null>(null);
  const [migrationComplete, setMigrationComplete] = useState(false);

  useEffect(() => {
    checkInitialState();
  }, []);

  const checkInitialState = async () => {
    try {
      // Check database connection
      const health = await apiClient.healthCheck();
      setIsConnected(health.database === 'connected');

      // Check for local data
      const hasData = await dataMigration.hasLocalStorageData();
      setHasLocalData(hasData);

      if (hasData) {
        const summary = await dataMigration.getLocalStorageDataSummary();
        setDataSummary(summary);
      }
    } catch (error) {
      console.error('Error checking initial state:', error);
    }
  };

  const authenticate = async () => {
    setAuthError(null);
    try {
      const { token } = await apiClient.getAuthToken(apiKey.trim());
      apiClient.setToken(token);
      setHasToken(true);
    } catch (e) {
      setAuthError(e instanceof Error ? e.message : 'Authentication failed');
    }
  };

  const updateStepStatus = (stepId: string, status: MigrationStep['status'], error?: string) => {
    setMigrationSteps(prev => prev.map(step => 
      step.id === stepId ? { ...step, status, error } : step
    ));
  };

  const runMigrationStep = async (stepId: string) => {
    setCurrentStep(stepId);
    updateStepStatus(stepId, 'running');

    try {
      switch (stepId) {
        case 'backup':
          await dataMigration.backupLocalStorageData();
          updateStepStatus(stepId, 'completed');
          break;

        case 'migrate':
          const result = await dataMigration.migrateToMongoDB();
          if (result.success) {
            updateStepStatus(stepId, 'completed');
          } else {
            updateStepStatus(stepId, 'error', result.error || result.message);
          }
          break;

        case 'verify':
          const verification = await dataMigration.verifyMigration();
          if (verification.success) {
            updateStepStatus(stepId, 'completed');
          } else {
            updateStepStatus(stepId, 'error', 'Verification failed - data counts do not match');
          }
          break;

        case 'cleanup':
          await dataMigration.clearLocalStorage();
          updateStepStatus(stepId, 'completed');
          setMigrationComplete(true);
          break;
      }
    } catch (error) {
      updateStepStatus(stepId, 'error', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setCurrentStep(null);
    }
  };

  const runFullMigration = async () => {
    for (const step of migrationSteps) {
      if (step.status !== 'completed') {
        await runMigrationStep(step.id);
        // If any step fails, stop the migration
        const updatedStep = migrationSteps.find(s => s.id === step.id);
        if (updatedStep?.status === 'error') {
          break;
        }
      }
    }
  };

  const getStepIcon = (status: MigrationStep['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      case 'running':
        return <div className="h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />;
      default:
        return <div className="h-5 w-5 border-2 border-gray-300 rounded-full" />;
    }
  };

  const getProgressPercentage = () => {
    const completedSteps = migrationSteps.filter(step => step.status === 'completed').length;
    return (completedSteps / migrationSteps.length) * 100;
  };

  if (!hasLocalData && isConnected) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-6 w-6" />
            Database Migration
          </CardTitle>
          <CardDescription>
            Your application is already using the database. No migration needed.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              ✅ Database connected and ready to use. No local data found to migrate.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (!isConnected) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-6 w-6 text-red-500" />
            Database Connection Required
          </CardTitle>
          <CardDescription>
            Cannot connect to the database. Please check your connection.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Database connection failed. Please ensure the server is running and MongoDB is accessible.
            </AlertDescription>
          </Alert>
          <Button onClick={checkInitialState} className="mt-4">
            Retry Connection
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!hasToken) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-6 w-6" />
            Authenticate to Migrate
          </CardTitle>
          <CardDescription>
            Enter the admin API key to obtain a JWT for migration.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Admin API Key"
              className="w-full border rounded px-3 py-2"
            />
            {authError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{authError}</AlertDescription>
              </Alert>
            )}
            <Button onClick={authenticate} disabled={!apiKey.trim()} className="w-full">
              Authenticate
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-6 w-6" />
          Data Migration to MongoDB
        </CardTitle>
        <CardDescription>
          Migrate your data from browser storage to MongoDB for better reliability and multi-user access.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Data Summary */}
        {dataSummary && (
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <HardDrive className="h-4 w-4" />
              <span className="text-sm font-medium">Local Data Found:</span>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span>Youth:</span>
                <Badge variant="secondary">{dataSummary.youth}</Badge>
              </div>
              <div className="flex justify-between text-sm">
                <span>Behavior Points:</span>
                <Badge variant="secondary">{dataSummary.behaviorPoints}</Badge>
              </div>
              <div className="flex justify-between text-sm">
                <span>Progress Notes:</span>
                <Badge variant="secondary">{dataSummary.progressNotes}</Badge>
              </div>
              <div className="flex justify-between text-sm">
                <span>Daily Ratings:</span>
                <Badge variant="secondary">{dataSummary.dailyRatings}</Badge>
              </div>
              <div className="flex justify-between text-sm font-medium border-t pt-1">
                <span>Total Records:</span>
                <Badge>{dataSummary.totalRecords}</Badge>
              </div>
            </div>
          </div>
        )}

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Migration Progress</span>
            <span>{Math.round(getProgressPercentage())}%</span>
          </div>
          <Progress value={getProgressPercentage()} className="w-full" />
        </div>

        {/* Migration Steps */}
        <div className="space-y-3">
          {migrationSteps.map((step) => (
            <div key={step.id} className="flex items-center gap-3 p-3 border rounded-lg">
              {getStepIcon(step.status)}
              <div className="flex-1">
                <div className="font-medium">{step.title}</div>
                <div className="text-sm text-gray-600">{step.description}</div>
                {step.error && (
                  <div className="text-sm text-red-600 mt-1">{step.error}</div>
                )}
              </div>
              {step.status === 'pending' && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => runMigrationStep(step.id)}
                  disabled={currentStep !== null}
                >
                  Run
                </Button>
              )}
            </div>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button
            onClick={runFullMigration}
            disabled={currentStep !== null || migrationComplete}
            className="flex-1"
          >
            {currentStep ? 'Running Migration...' : 'Start Full Migration'}
          </Button>
          
          <Button
            variant="outline"
            onClick={() => dataMigration.backupLocalStorageData()}
            disabled={currentStep !== null}
          >
            <Download className="h-4 w-4 mr-2" />
            Backup Only
          </Button>
        </div>

        {/* Success Message */}
        {migrationComplete && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              🎉 Migration completed successfully! Your data is now stored in MongoDB and accessible across devices.
            </AlertDescription>
          </Alert>
        )}

        {/* Warning */}
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Important:</strong> This migration will move your data from browser storage to the database. 
            We recommend creating a backup first. The cleanup step will remove data from browser storage.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
};
