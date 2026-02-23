import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, AlertCircle, Database, Upload, ArrowRight } from 'lucide-react'
import { migrateLocalStorageToSupabase, checkLocalStorageData, type MigrationResult } from '@/utils/migrateToSupabase'
import { toast } from 'sonner'

export const DataMigration = () => {
  const [localData, setLocalData] = useState({
    hasData: false,
    youthCount: 0,
    behaviorPointsCount: 0,
    caseNotesCount: 0
  })
  const [migrationResult, setMigrationResult] = useState<MigrationResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [migrationProgress, setMigrationProgress] = useState(0)

  useEffect(() => {
    checkLocalData()
  }, [])

  const checkLocalData = () => {
    const data = checkLocalStorageData()
    setLocalData(data)
  }

  const handleMigration = async () => {
    if (!localData.hasData) {
      toast.error('No local data found to migrate')
      return
    }

    setIsLoading(true)
    setMigrationProgress(0)
    setMigrationResult(null)

    try {
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setMigrationProgress(prev => {
          if (prev >= 90) return prev
          return prev + Math.random() * 10
        })
      }, 500)

      const result = await migrateLocalStorageToSupabase()
      
      clearInterval(progressInterval)
      setMigrationProgress(100)
      setMigrationResult(result)

      if (result.success) {
        toast.success('Data migration completed successfully!')
      } else {
        toast.error('Migration completed with errors')
      }
    } catch (error) {
      toast.error('Migration failed')
      setMigrationResult({
        success: false,
        message: `Migration failed: ${error}`,
        details: {
          youthMigrated: 0,
          behaviorPointsMigrated: 0,
          caseNotesMigrated: 0,
          errors: [String(error)]
        }
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Data Migration to Supabase
          </CardTitle>
          <CardDescription>
            Migrate your existing local data to Supabase for better performance and reliability
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Local Data Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{localData.youthCount}</div>
              <div className="text-sm text-blue-700">Youth Profiles</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{localData.behaviorPointsCount}</div>
              <div className="text-sm text-green-700">Behavior Points</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">{localData.caseNotesCount}</div>
              <div className="text-sm text-purple-700">Case Notes</div>
            </div>
          </div>

          {/* Migration Status */}
          {!localData.hasData ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>No Local Data Found</AlertTitle>
              <AlertDescription>
                No user-created data was found in local storage to migrate. The application is now using Supabase directly for all data operations. Create youth profiles through the main dashboard to begin using the system.
              </AlertDescription>
            </Alert>
          ) : migrationResult ? (
            <Alert className={migrationResult.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
              {migrationResult.success ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <AlertCircle className="h-4 w-4 text-red-600" />
              )}
              <AlertTitle className={migrationResult.success ? "text-green-800" : "text-red-800"}>
                {migrationResult.success ? "Migration Completed" : "Migration Failed"}
              </AlertTitle>
              <AlertDescription className={migrationResult.success ? "text-green-700" : "text-red-700"}>
                {migrationResult.message}
              </AlertDescription>
            </Alert>
          ) : (
            <Alert>
              <Database className="h-4 w-4" />
              <AlertTitle>Ready to Migrate</AlertTitle>
              <AlertDescription>
                Your local data is ready to be migrated to Supabase. This process will copy {localData.youthCount} youth profiles, {localData.behaviorPointsCount} behavior point records, and {localData.caseNotesCount} case notes to the cloud database. All data will be preserved during migration.
              </AlertDescription>
            </Alert>
          )}

          {/* Migration Progress */}
          {isLoading && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Migration Progress</span>
                <span>{Math.round(migrationProgress)}%</span>
              </div>
              <Progress value={migrationProgress} className="w-full" />
            </div>
          )}

          {/* Migration Results Details */}
          {migrationResult && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <div className="text-lg font-semibold text-blue-600">
                    {migrationResult.details.youthMigrated}
                  </div>
                  <div className="text-xs text-blue-700">Youth Migrated</div>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <div className="text-lg font-semibold text-green-600">
                    {migrationResult.details.behaviorPointsMigrated}
                  </div>
                  <div className="text-xs text-green-700">Points Migrated</div>
                </div>
                <div className="text-center p-3 bg-purple-50 rounded-lg">
                  <div className="text-lg font-semibold text-purple-600">
                    {migrationResult.details.caseNotesMigrated}
                  </div>
                  <div className="text-xs text-purple-700">Notes Migrated</div>
                </div>
              </div>

              {migrationResult.details.errors.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium text-red-800">Migration Errors:</h4>
                  <div className="space-y-1">
                    {migrationResult.details.errors.map((error, index) => (
                      <div key={index} className="text-sm text-red-700 bg-red-50 p-2 rounded">
                        {error}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4">
            <Button
              onClick={handleMigration}
              disabled={!localData.hasData || isLoading || (migrationResult?.success === true)}
              className="flex items-center gap-2"
            >
              <Upload className="h-4 w-4" />
              {isLoading ? 'Migrating...' : 'Start Migration'}
            </Button>
            
            <Button
              variant="outline"
              onClick={checkLocalData}
              disabled={isLoading}
            >
              Refresh Data Check
            </Button>
          </div>

          {/* Important Notes */}
          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h4 className="font-medium text-yellow-800 mb-2">Important Notes:</h4>
            <ul className="text-sm text-yellow-700 space-y-1">
              <li>• This migration will copy your data to Supabase - your local data will remain unchanged</li>
              <li>• After successful migration, the app will automatically use Supabase for all operations</li>
              <li>• You can run this migration multiple times safely - duplicate data will be handled appropriately</li>
              <li>• Make sure you have a stable internet connection during migration</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}