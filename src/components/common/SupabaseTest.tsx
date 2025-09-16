import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { supabaseUtils, youthService } from '@/integrations/supabase/services'
import { CheckCircle, XCircle, Loader2 } from 'lucide-react'

export const SupabaseTest: React.FC = () => {
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'testing' | 'connected' | 'failed'>('idle')
  const [stats, setStats] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const testConnection = async () => {
    setConnectionStatus('testing')
    setError(null)
    
    try {
      // Test basic connection
      const isConnected = await supabaseUtils.testConnection()
      
      if (!isConnected) {
        throw new Error('Failed to connect to Supabase')
      }

      // Get database stats
      const dbStats = await supabaseUtils.getStats()
      setStats(dbStats)
      
      setConnectionStatus('connected')
    } catch (err) {
      console.error('Supabase connection test failed:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
      setConnectionStatus('failed')
    }
  }

  const createTestYouth = async () => {
    try {
      const testYouth = await youthService.create({
        firstName: 'Test',
        lastName: 'Youth',
        level: 1,
        pointTotal: 0
      })
      
      console.log('Test youth created:', testYouth)
      
      // Refresh stats
      const dbStats = await supabaseUtils.getStats()
      setStats(dbStats)
      
      alert('Test youth created successfully!')
    } catch (err) {
      console.error('Failed to create test youth:', err)
      alert('Failed to create test youth: ' + (err instanceof Error ? err.message : 'Unknown error'))
    }
  }

  useEffect(() => {
    // Auto-test connection on component mount
    testConnection()
  }, [])

  const getStatusIcon = () => {
    switch (connectionStatus) {
      case 'testing':
        return <Loader2 className="h-4 w-4 animate-spin" />
      case 'connected':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />
      default:
        return null
    }
  }

  const getStatusBadge = () => {
    switch (connectionStatus) {
      case 'testing':
        return <Badge variant="secondary">Testing...</Badge>
      case 'connected':
        return <Badge variant="default" className="bg-green-500">Connected</Badge>
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>
      default:
        return <Badge variant="outline">Not Tested</Badge>
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {getStatusIcon()}
          Supabase Connection Test
        </CardTitle>
        <CardDescription>
          Test the connection to your Supabase database
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <span>Status:</span>
          {getStatusBadge()}
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {stats && (
          <div className="space-y-2">
            <h4 className="font-medium">Database Stats:</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>Youth: {stats.youth}</div>
              <div>Behavior Points: {stats.behaviorPoints}</div>
              <div>Case Notes: {stats.caseNotes}</div>
              <div>Daily Ratings: {stats.dailyRatings}</div>
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <Button 
            onClick={testConnection} 
            disabled={connectionStatus === 'testing'}
            variant="outline"
            size="sm"
          >
            {connectionStatus === 'testing' ? 'Testing...' : 'Test Connection'}
          </Button>
          
          {connectionStatus === 'connected' && (
            <Button 
              onClick={createTestYouth}
              size="sm"
            >
              Create Test Youth
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default SupabaseTest