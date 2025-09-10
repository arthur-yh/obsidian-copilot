import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useSettingsValue, updateSetting } from '@/settings/model';
import { Notice } from 'obsidian';

declare const app: any;

export const VaultQAAPISettings: React.FC = () => {
  const settings = useSettingsValue();
  const [serverStatus, setServerStatus] = React.useState<{ running: boolean; port?: number }>({
    running: false,
  });

  // Get plugin instance to access VaultQAAPIManager
  const plugin = (app as any).plugins?.plugins?.['copilot'];

  React.useEffect(() => {
    if (plugin?.vaultQAAPIManager) {
      const status = plugin.vaultQAAPIManager.getServerStatus();
      setServerStatus(status);
    }
  }, [plugin]);

  const handleToggleServer = async () => {
    if (!plugin?.vaultQAAPIManager) {
      new Notice('VaultQA API Manager not available');
      return;
    }

    try {
      if (serverStatus.running) {
        plugin.vaultQAAPIManager.stopServer();
        setServerStatus({ running: false });
      } else {
        const success = await plugin.vaultQAAPIManager.startServer(settings.vaultQAApiPort);
        if (success) {
          setServerStatus({ running: true, port: settings.vaultQAApiPort });
        }
      }
    } catch (error) {
      console.error('Error toggling VaultQA API server:', error);
      new Notice('Error toggling VaultQA API server');
    }
  };

  const handlePortChange = (value: string) => {
    const port = parseInt(value, 10);
    if (!isNaN(port) && port > 0 && port <= 65535) {
      updateSetting('vaultQAApiPort', port);
    }
  };

  const handleAutoStartChange = (enabled: boolean) => {
    updateSetting('enableVaultQAAPI', enabled);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          VaultQA API Server
          {serverStatus.running && (
            <Badge variant="default" className="bg-green-500">
              Running
            </Badge>
          )}
          {!serverStatus.running && (
            <Badge variant="secondary">
              Stopped
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Expose VaultQA functionality as a REST API for internal network access
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center space-x-2">
          <Switch
            id="auto-start-api"
            checked={settings.enableVaultQAAPI}
            onCheckedChange={handleAutoStartChange}
          />
          <Label htmlFor="auto-start-api">
            Auto-start API server when plugin loads
          </Label>
        </div>

        <div className="space-y-2">
          <Label htmlFor="api-port">API Server Port</Label>
          <Input
            id="api-port"
            type="number"
            min="1"
            max="65535"
            value={settings.vaultQAApiPort}
            onChange={(e) => handlePortChange(e.target.value)}
            className="w-32"
          />
          <p className="text-sm text-muted-foreground">
            Port number for the VaultQA API server (1-65535)
          </p>
        </div>

        <div className="space-y-2">
          <Button
            onClick={handleToggleServer}
            variant={serverStatus.running ? "destructive" : "default"}
            disabled={!plugin?.vaultQAAPIManager}
          >
            {serverStatus.running ? 'Stop Server' : 'Start Server'}
          </Button>
          
          {serverStatus.running && (
            <div className="text-sm text-muted-foreground">
              <p>Server running on: <code>http://localhost:{serverStatus.port}</code></p>
              <p className="mt-2">Available endpoints:</p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li><code>GET /health</code> - Health check</li>
                <li><code>GET /api/vault-info</code> - Get vault information</li>
                <li><code>POST /api/vault-qa</code> - Ask questions about vault content</li>
              </ul>
            </div>
          )}
        </div>

        <div className="bg-muted p-4 rounded-lg">
          <h4 className="font-medium mb-2">API Usage Example</h4>
          <pre className="text-sm bg-background p-2 rounded border overflow-x-auto">
{`curl -X POST http://localhost:${settings.vaultQAApiPort}/api/vault-qa \\
  -H "Content-Type: application/json" \\
  -d '{
    "question": "What are the main topics in my vault?",
    "options": {
      "maxSourceChunks": 10,
      "debug": false
    }
  }'`}
          </pre>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
          <h4 className="font-medium text-yellow-800 mb-2">⚠️ Security Notice</h4>
          <p className="text-sm text-yellow-700">
            The API server runs without authentication and exposes your vault content. 
            Only use this on trusted internal networks. Consider implementing authentication 
            and HTTPS for production use.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};