# VaultQA API Server

This feature exposes the Obsidian Copilot's Vault QA functionality as a REST API, allowing you to query your vault content from external applications or scripts.

## Features

- **REST API Interface**: Query your vault content via HTTP requests
- **Semantic Search**: Leverage the same powerful search capabilities as the Copilot plugin
- **Source Attribution**: Get references to the source documents used in answers
- **Configurable**: Adjust search parameters and behavior
- **Internal Network Ready**: Perfect for internal tools and automation

## Setup

### 1. Enable the API Server

1. Open Obsidian Settings
2. Go to Copilot Settings
3. Navigate to the "API" tab
4. Toggle "Auto-start API server when plugin loads" (optional)
5. Set your desired port (default: 3000)
6. Click "Start Server" to start manually, or restart Obsidian if auto-start is enabled

### 2. Verify Server is Running

Check the server status in the API settings tab, or visit `http://localhost:3000/health` in your browser.

## API Endpoints

### Health Check
```
GET /health
```
Returns server status and timestamp.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### Vault Information
```
GET /api/vault-info
```
Returns basic information about your vault.

**Response:**
```json
{
  "name": "My Vault",
  "totalFiles": 150,
  "semanticSearchEnabled": true,
  "maxSourceChunks": 15,
  "success": true
}
```

### Ask Question
```
POST /api/vault-qa
```
Ask questions about your vault content.

**Request Body:**
```json
{
  "question": "What are the main topics in my vault?",
  "options": {
    "maxSourceChunks": 10,
    "debug": false
  }
}
```

**Response:**
```json
{
  "answer": "Based on your vault content, the main topics include...",
  "sources": [
    "Note Title 1",
    "Note Title 2",
    "Note Title 3"
  ],
  "success": true
}
```

## Usage Examples

### Command Line with curl

```bash
# Health check
curl http://localhost:3000/health

# Get vault info
curl http://localhost:3000/api/vault-info

# Ask a question
curl -X POST http://localhost:3000/api/vault-qa \
  -H "Content-Type: application/json" \
  -d '{
    "question": "What are my recent project notes about?",
    "options": {
      "maxSourceChunks": 15,
      "debug": false
    }
  }'
```

### JavaScript/Node.js

```javascript
const axios = require('axios');

const client = axios.create({
  baseURL: 'http://localhost:3000',
  headers: { 'Content-Type': 'application/json' }
});

async function askQuestion(question) {
  try {
    const response = await client.post('/api/vault-qa', {
      question,
      options: { maxSourceChunks: 10 }
    });
    
    console.log('Answer:', response.data.answer);
    console.log('Sources:', response.data.sources);
  } catch (error) {
    console.error('Error:', error.response?.data?.error || error.message);
  }
}

askQuestion('What are the key concepts in my notes?');
```

### Python

```python
import requests
import json

def ask_question(question, base_url='http://localhost:3000'):
    payload = {
        'question': question,
        'options': {
            'maxSourceChunks': 10,
            'debug': False
        }
    }
    
    try:
        response = requests.post(
            f'{base_url}/api/vault-qa',
            json=payload,
            headers={'Content-Type': 'application/json'},
            timeout=60
        )
        response.raise_for_status()
        
        data = response.json()
        print(f"Answer: {data['answer']}")
        print(f"Sources: {', '.join(data['sources'])}")
        
    except requests.exceptions.RequestException as e:
        print(f"Error: {e}")

ask_question('Summarize my meeting notes from this week')
```

## Configuration Options

### API Settings

- **Auto-start**: Automatically start the API server when the plugin loads
- **Port**: Configure the port number (1-65535, default: 3000)
- **Manual Control**: Start/stop the server manually via settings or commands

### Request Options

- `maxSourceChunks`: Maximum number of source documents to retrieve (default: 10)
- `minSimilarityScore`: Minimum similarity score for document retrieval
- `debug`: Enable debug mode for detailed logging

## Commands

The plugin adds several commands for managing the API server:

- **Start VaultQA API Server**: Manually start the server
- **Stop VaultQA API Server**: Manually stop the server  
- **Toggle VaultQA API Server**: Toggle server on/off

Access these via the Command Palette (Ctrl/Cmd + P).

## Security Considerations

⚠️ **Important Security Notes:**

1. **No Authentication**: The API server runs without authentication by default
2. **Local Network Only**: Only use on trusted internal networks
3. **Vault Access**: The API exposes your entire vault content
4. **HTTPS**: Consider implementing HTTPS for production use
5. **Firewall**: Ensure your firewall is properly configured

### Recommended Security Measures

- Only run on internal/private networks
- Use a firewall to restrict access
- Consider implementing authentication if needed
- Monitor access logs
- Use HTTPS in production environments

## Troubleshooting

### Server Won't Start

1. Check if the port is already in use
2. Try a different port number
3. Check the Obsidian console for error messages
4. Ensure the plugin is properly loaded

### Connection Refused

1. Verify the server is running (check API settings)
2. Confirm the correct port number
3. Check firewall settings
4. Try accessing `http://localhost:PORT/health`

### Empty or Poor Results

1. Ensure your vault is indexed (run "Index vault" command)
2. Check if semantic search is enabled in QA settings
3. Try different question phrasing
4. Increase `maxSourceChunks` parameter

### Performance Issues

1. Reduce `maxSourceChunks` for faster responses
2. Enable semantic search for better relevance
3. Optimize your vault's QA inclusion/exclusion patterns
4. Consider the size of your vault

## Integration Examples

### Slack Bot Integration

```javascript
// Example Slack bot that queries your vault
const { App } = require('@slack/bolt');
const axios = require('axios');

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET
});

app.message(/^!vault (.+)/, async ({ message, say }) => {
  const question = message.text.replace(/^!vault /, '');
  
  try {
    const response = await axios.post('http://localhost:3000/api/vault-qa', {
      question,
      options: { maxSourceChunks: 5 }
    });
    
    await say(`🤖 ${response.data.answer}\n\n📚 Sources: ${response.data.sources.join(', ')}`);
  } catch (error) {
    await say(`❌ Error querying vault: ${error.message}`);
  }
});
```

### Alfred Workflow

Create an Alfred workflow that queries your vault:

1. Create a Script Filter with keyword "vault"
2. Use the Node.js example code above
3. Format results for Alfred's JSON format
4. Add actions to copy or open results

## Contributing

This feature is part of the Obsidian Copilot plugin. To contribute:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

This feature is part of the Obsidian Copilot plugin and follows the same license terms.