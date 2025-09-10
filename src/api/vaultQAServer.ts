import Koa from 'koa';
import cors from '@koa/cors';
import { Context } from 'koa';
import { VaultQAChainRunner } from '@/LLMProviders/chainRunner/VaultQAChainRunner';
import ChainManager from '@/LLMProviders/chainManager';
import { ChatMessage } from '@/types/message';
import { AI_SENDER, USER_SENDER } from '@/constants';
import { getSettings } from '@/settings/model';
import { App } from 'obsidian';

interface VaultQARequest {
  question: string;
  chatHistory?: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
  options?: {
    maxSourceChunks?: number;
    minSimilarityScore?: number;
    debug?: boolean;
  };
}

interface VaultQAResponse {
  answer: string;
  sources: string[];
  success: boolean;
  error?: string;
}

export class VaultQAServer {
  private app: Koa;
  private chainManager: ChainManager;
  private obsidianApp: App;
  private port: number;

  constructor(obsidianApp: App, port: number = 3000) {
    this.obsidianApp = obsidianApp;
    this.port = port;
    this.app = new Koa();
    this.chainManager = new ChainManager(obsidianApp);
    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware() {
    // Enable CORS for cross-origin requests
    this.app.use(cors({
      origin: '*', // Configure this based on your security requirements
      allowMethods: ['GET', 'POST', 'OPTIONS'],
      allowHeaders: ['Content-Type', 'Authorization'],
    }));

    // JSON body parser
    this.app.use(async (ctx, next) => {
      if (ctx.request.type === 'application/json') {
        try {
          ctx.request.body = JSON.parse(ctx.request.rawBody || '{}');
        } catch (error) {
          ctx.status = 400;
          ctx.body = { success: false, error: 'Invalid JSON' };
          return;
        }
      }
      await next();
    });

    // Error handling middleware
    this.app.use(async (ctx, next) => {
      try {
        await next();
      } catch (error) {
        console.error('VaultQA API Error:', error);
        ctx.status = 500;
        ctx.body = {
          success: false,
          error: error instanceof Error ? error.message : 'Internal server error'
        };
      }
    });
  }

  private setupRoutes() {
    // Health check endpoint
    this.app.use(async (ctx, next) => {
      if (ctx.path === '/health' && ctx.method === 'GET') {
        ctx.body = { status: 'ok', timestamp: new Date().toISOString() };
        return;
      }
      await next();
    });

    // Main QA endpoint
    this.app.use(async (ctx, next) => {
      if (ctx.path === '/api/vault-qa' && ctx.method === 'POST') {
        await this.handleVaultQA(ctx);
        return;
      }
      await next();
    });

    // Get vault info endpoint
    this.app.use(async (ctx, next) => {
      if (ctx.path === '/api/vault-info' && ctx.method === 'GET') {
        await this.handleVaultInfo(ctx);
        return;
      }
      await next();
    });

    // 404 handler
    this.app.use(async (ctx) => {
      ctx.status = 404;
      ctx.body = { success: false, error: 'Endpoint not found' };
    });
  }

  private async handleVaultQA(ctx: Context) {
    const request = ctx.request.body as VaultQARequest;
    
    if (!request.question) {
      ctx.status = 400;
      ctx.body = { success: false, error: 'Question is required' };
      return;
    }

    try {
      // Create user message
      const userMessage: ChatMessage = {
        message: request.question,
        sender: USER_SENDER,
        isVisible: true,
        timestamp: new Date().toISOString(),
      };

      // Create abort controller for timeout handling
      const abortController = new AbortController();
      const timeoutId = setTimeout(() => {
        abortController.abort('Request timeout');
      }, 60000); // 60 second timeout

      // Initialize chain manager for vault QA
      await this.chainManager.createChainWithNewModel();

      // Create vault QA runner
      const vaultQARunner = new VaultQAChainRunner(this.chainManager);

      let currentResponse = '';
      const sources: string[] = [];

      // Run the QA chain
      const response = await vaultQARunner.run(
        userMessage,
        abortController,
        (message: string) => {
          currentResponse = message;
        },
        (message: ChatMessage) => {
          // Handle any additional messages if needed
        },
        {
          debug: request.options?.debug || false,
          ignoreSystemMessage: false,
        }
      );

      clearTimeout(timeoutId);

      // Extract sources from the response
      const retrievedDocs = this.chainManager.getRetrievedDocuments();
      const sourceTitles = retrievedDocs.map(doc => doc.metadata.title || doc.metadata.path);

      const result: VaultQAResponse = {
        answer: response,
        sources: [...new Set(sourceTitles)], // Remove duplicates
        success: true,
      };

      ctx.body = result;

    } catch (error) {
      console.error('VaultQA processing error:', error);
      ctx.status = 500;
      ctx.body = {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to process question',
        answer: '',
        sources: [],
      };
    }
  }

  private async handleVaultInfo(ctx: Context) {
    try {
      const settings = getSettings();
      const markdownFiles = this.obsidianApp.vault.getMarkdownFiles();
      
      const vaultInfo = {
        name: this.obsidianApp.vault.getName(),
        totalFiles: markdownFiles.length,
        semanticSearchEnabled: settings.enableSemanticSearchV3,
        maxSourceChunks: settings.maxSourceChunks,
        success: true,
      };

      ctx.body = vaultInfo;
    } catch (error) {
      ctx.status = 500;
      ctx.body = {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get vault info'
      };
    }
  }

  public start(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const server = this.app.listen(this.port, () => {
          console.log(`VaultQA API Server running on http://localhost:${this.port}`);
          console.log('Available endpoints:');
          console.log('  GET  /health - Health check');
          console.log('  GET  /api/vault-info - Get vault information');
          console.log('  POST /api/vault-qa - Ask questions about vault content');
          resolve();
        });

        server.on('error', (error) => {
          reject(error);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  public stop() {
    // Implementation for graceful shutdown if needed
    console.log('VaultQA API Server stopped');
  }
}

// Export types for external use
export type { VaultQARequest, VaultQAResponse };