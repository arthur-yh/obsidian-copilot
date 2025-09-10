#!/usr/bin/env node

/**
 * VaultQA API Client Example
 * 
 * This script demonstrates how to interact with the VaultQA API server.
 * Make sure the Obsidian Copilot plugin is running with the API server enabled.
 */

const axios = require('axios');

class VaultQAClient {
  constructor(baseUrl = 'http://localhost:3000') {
    this.baseUrl = baseUrl;
    this.client = axios.create({
      baseURL: baseUrl,
      timeout: 60000, // 60 second timeout
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Check if the API server is healthy
   */
  async healthCheck() {
    try {
      const response = await this.client.get('/health');
      return response.data;
    } catch (error) {
      throw new Error(`Health check failed: ${error.message}`);
    }
  }

  /**
   * Get vault information
   */
  async getVaultInfo() {
    try {
      const response = await this.client.get('/api/vault-info');
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get vault info: ${error.message}`);
    }
  }

  /**
   * Ask a question about the vault content
   * @param {string} question - The question to ask
   * @param {Object} options - Optional parameters
   * @param {number} options.maxSourceChunks - Maximum number of source chunks to retrieve
   * @param {boolean} options.debug - Enable debug mode
   */
  async askQuestion(question, options = {}) {
    try {
      const payload = {
        question,
        options: {
          maxSourceChunks: options.maxSourceChunks || 10,
          debug: options.debug || false,
        },
      };

      const response = await this.client.post('/api/vault-qa', payload);
      return response.data;
    } catch (error) {
      if (error.response) {
        throw new Error(`API Error: ${error.response.data.error || error.response.statusText}`);
      }
      throw new Error(`Request failed: ${error.message}`);
    }
  }
}

// Example usage
async function main() {
  const client = new VaultQAClient();

  try {
    console.log('🔍 Checking API server health...');
    const health = await client.healthCheck();
    console.log('✅ Server is healthy:', health);

    console.log('\n📊 Getting vault information...');
    const vaultInfo = await client.getVaultInfo();
    console.log('📚 Vault Info:', JSON.stringify(vaultInfo, null, 2));

    console.log('\n❓ Asking a question...');
    const question = process.argv[2] || 'What are the main topics covered in my vault?';
    console.log(`Question: "${question}"`);
    
    const answer = await client.askQuestion(question, {
      maxSourceChunks: 15,
      debug: false,
    });

    console.log('\n🤖 Answer:', answer.answer);
    
    if (answer.sources && answer.sources.length > 0) {
      console.log('\n📖 Sources:');
      answer.sources.forEach((source, index) => {
        console.log(`  ${index + 1}. ${source}`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Run the example if this script is executed directly
if (require.main === module) {
  main();
}

module.exports = VaultQAClient;