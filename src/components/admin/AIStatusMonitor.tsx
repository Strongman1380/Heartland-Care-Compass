import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, AlertCircle, CheckCircle, Settings, TrendingUp } from "lucide-react";
import { checkAIStatus, type AIServiceStatus } from "@/services/aiService";

export const AIStatusMonitor = () => {
  const [status, setStatus] = useState<AIServiceStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const checkStatus = async () => {
    setLoading(true);
    try {
      const result = await checkAIStatus();
      setStatus(result);
      setLastChecked(new Date());
    } catch (error) {
      console.error('Failed to check AI status:', error);
      setStatus({
        available: false,
        configured: false,
        status: 'error',
        error: 'Failed to check status'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkStatus();
    // Auto-refresh every 5 minutes
    const interval = setInterval(checkStatus, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = () => {
    if (!status) return 'bg-gray-500';
    if (status.available) return 'bg-green-500';
    if (status.configured && !status.available) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getStatusIcon = () => {
    if (!status) return <Settings className="h-4 w-4" />;
    if (status.available) return <CheckCircle className="h-4 w-4" />;
    return <AlertCircle className="h-4 w-4" />;
  };

  const formatLastUsed = (timestamp: string | null) => {
    if (!timestamp) return 'Never';
    return new Date(timestamp).toLocaleString();
  };

  const calculateSuccessRate = () => {
    if (!status?.usage) return 0;
    const { totalRequests, successfulRequests } = status.usage;
    return totalRequests > 0 ? Math.round((successfulRequests / totalRequests) * 100) : 0;
  };

  const estimatedCost = () => {
    if (!status?.usage?.totalTokens) return 0;
    // Rough estimate for gpt-4o-mini: $0.000002 per token
    return (status.usage.totalTokens * 0.000002).toFixed(4);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">AI Service Status</CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={checkStatus}
            disabled={loading}
            className="h-8 w-8 p-0"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2">
            {getStatusIcon()}
            <Badge className={`${getStatusColor()} text-white`}>
              {status?.available ? 'Online' : status?.configured ? 'Configured but Offline' : 'Not Configured'}
            </Badge>
          </div>

          {status && (
            <div className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Model:</span>
                <span>{status.model || 'Not specified'}</span>
              </div>
              {status.models && (
                <>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Standard Model:</span>
                    <span>{status.models.standard || 'Not specified'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Premium Model:</span>
                    <span>{status.models.premium || 'Not specified'}</span>
                  </div>
                </>
              )}

              {status.error && (
                <div className="p-2 bg-red-50 border border-red-200 rounded">
                  <span className="text-red-800">{status.error}</span>
                </div>
              )}

              <div className="flex justify-between">
                <span className="text-muted-foreground">Last Checked:</span>
                <span>{lastChecked?.toLocaleTimeString() || 'Never'}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {status?.usage && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Usage Statistics
            </CardTitle>
            <CardDescription>AI service usage metrics for this session</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Requests:</span>
                  <span className="font-medium">{status.usage.totalRequests}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Successful:</span>
                  <span className="font-medium text-green-600">{status.usage.successfulRequests}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Failed:</span>
                  <span className="font-medium text-red-600">{status.usage.failedRequests}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Success Rate:</span>
                  <span className="font-medium">{calculateSuccessRate()}%</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Tokens:</span>
                  <span className="font-medium">{status.usage.totalTokens.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Est. Cost:</span>
                  <span className="font-medium">${estimatedCost()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Last Used:</span>
                  <span className="font-medium">{formatLastUsed(status.usage.lastUsed)}</span>
                </div>
              </div>
            </div>

            {status.usage.errors && status.usage.errors.length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-medium mb-2 text-red-600">Recent Errors:</h4>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {status.usage.errors.slice(-3).map((error, index) => (
                    <div key={index} className="text-xs p-2 bg-red-50 border border-red-200 rounded">
                      <div className="flex justify-between">
                        <span className="text-red-600">{error.code}</span>
                        <span className="text-muted-foreground">
                          {new Date(error.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <div className="text-red-800 mt-1">{error.error}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {status?.limits && status?.dailyUsage && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Rate Limits</CardTitle>
            <CardDescription>Daily AI request and token budgets</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Global Requests:</span>
                  <span>{status.dailyUsage.requests} / {status.limits.global.requests}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Global Tokens:</span>
                  <span>{status.dailyUsage.tokens.toLocaleString()} / {status.limits.global.tokens.toLocaleString()}</span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Per-client Requests:</span>
                  <span>{status.limits.perClient.requests}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Per-client Tokens:</span>
                  <span>{status.limits.perClient.tokens.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {status?.cache && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Response Cache</CardTitle>
            <CardDescription>Server-side AI response caching</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Items:</span>
                <span>{status.cache.items}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Capacity:</span>
                <span>{status.cache.maxItems}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">TTL (sec):</span>
                <span>{status.cache.ttlSeconds}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {!status?.available && status?.configured && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-yellow-800">Configuration Required</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-yellow-700">
            <p>AI service is configured but not available. This could be due to:</p>
            <ul className="mt-2 list-disc list-inside space-y-1">
              <li>Invalid or expired OpenAI API key</li>
              <li>Insufficient API quota or billing issues</li>
              <li>Network connectivity problems</li>
              <li>Model availability issues</li>
            </ul>
            <p className="mt-2">
              The system will automatically fall back to enhanced mock AI responses.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
