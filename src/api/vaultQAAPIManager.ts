import { VaultQAServer } from './vaultQAServer';
import { getSettings } from '@/settings/model';
import { Notice } from 'obsidian';

export class VaultQAAPIManager {
  private server: VaultQAServer | null = null;
  private isRunning = false;

  constructor(private app: any, private plugin: any) {}

  async startServer(port?: number): Promise<boolean> {
    if (this.isRunning) {
      new Notice('VaultQA API Server is already running');
      return true;
    }

    try {
      const settings = getSettings();
      const serverPort = port || settings.vaultQAApiPort || 3000;
      
      this.server = new VaultQAServer(this.app, serverPort);
      await this.server.start();
      
      this.isRunning = true;
      new Notice(`VaultQA API Server started on port ${serverPort}`);
      
      return true;
    } catch (error) {
      console.error('Failed to start VaultQA API Server:', error);
      new Notice(`Failed to start VaultQA API Server: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return false;
    }
  }

  stopServer(): void {
    if (!this.isRunning || !this.server) {
      new Notice('VaultQA API Server is not running');
      return;
    }

    try {
      this.server.stop();
      this.server = null;
      this.isRunning = false;
      new Notice('VaultQA API Server stopped');
    } catch (error) {
      console.error('Error stopping VaultQA API Server:', error);
      new Notice('Error stopping VaultQA API Server');
    }
  }

  isServerRunning(): boolean {
    return this.isRunning;
  }

  getServerStatus(): { running: boolean; port?: number } {
    return {
      running: this.isRunning,
      port: this.isRunning ? (getSettings().vaultQAApiPort || 3000) : undefined,
    };
  }
}