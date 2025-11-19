# @claude-agent/client

A TypeScript client library for connecting to Claude Agent Server with E2B sandbox support.

## Installation

```bash
npm install @dzhng/claude-agent
# or
yarn add @dzhng/claude-agent
# or
bun add @dzhng/claude-agent
```

## Usage

### Basic Example

```typescript
import { ClaudeAgentClient } from '@dzhng/claude-agent'

const client = new ClaudeAgentClient({
  e2bApiKey: process.env.E2B_API_KEY,
  anthropicApiKey: process.env.ANTHROPIC_API_KEY,
  debug: true,
})

// Start the client (creates E2B sandbox and connects)
await client.start()

// Listen for messages from the agent
client.onMessage(message => {
  console.log('Received:', message)
})

// Send a message to the agent
client.send({
  type: 'user_message',
  data: { content: 'Hello, Claude!' },
})

// Clean up when done
await client.stop()
```

### Connect to Local Server

```typescript
const client = new ClaudeAgentClient({
  connectionUrl: 'http://localhost:3000',
  anthropicApiKey: process.env.ANTHROPIC_API_KEY,
})

await client.start()
```

### Use a Custom E2B Template

```typescript
const client = new ClaudeAgentClient({
  template: 'my-custom-template', // Your custom E2B template name
  e2bApiKey: process.env.E2B_API_KEY,
  anthropicApiKey: process.env.ANTHROPIC_API_KEY,
})

await client.start()
```

## API Reference

### `ClaudeAgentClient`

#### Constructor Options

```typescript
interface ClientOptions {
  // Required (unless using environment variables)
  anthropicApiKey?: string

  // E2B Configuration (optional if using connectionUrl)
  e2bApiKey?: string
  template?: string // E2B template name, defaults to 'claude-agent-server'
  timeoutMs?: number // Sandbox timeout, defaults to 5 minutes

  // Connection Configuration
  connectionUrl?: string // Use this to connect to local/custom server instead of E2B

  // Other Options
  debug?: boolean // Enable debug logging

  // Query Configuration (passed to server)
  agents?: Record<string, AgentDefinition>
  allowedTools?: string[]
  systemPrompt?:
    | string
    | { type: 'preset'; preset: 'claude_code'; append?: string }
  model?: string
}
```

**Template Configuration:**

The `template` option allows you to specify which E2B template to use when creating sandboxes. This is useful if you've built a custom template with specific configurations or dependencies. If not specified, it defaults to `'claude-agent-server'`.

#### Methods

- **`async start()`** - Initialize the client and connect to the server
- **`send(message: WSInputMessage)`** - Send a message to the agent
- **`onMessage(handler: (message: WSOutputMessage) => void)`** - Register a message handler (returns unsubscribe function)
- **`async stop()`** - Disconnect and clean up resources

## Message Types

```typescript
import type {
  AgentDefinition,
  SDKMessage,
  SDKUserMessage,
} from '@anthropic-ai/claude-agent-sdk'

// Input messages you can send
type WSInputMessage =
  | { type: 'user_message'; data: SDKUserMessage }
  | { type: 'interrupt' }
  | {
      type: 'create_file'
      path: string
      content: string
      encoding?: 'utf-8' | 'base64'
    }
  | { type: 'read_file'; path: string; encoding?: 'utf-8' | 'base64' }
  | { type: 'delete_file'; path: string }
  | { type: 'list_files'; path?: string }

// Output messages you'll receive
type WSOutputMessage =
  | { type: 'connected' }
  | { type: 'sdk_message'; data: SDKMessage }
  | { type: 'error'; error: string }
  | { type: 'info'; data: string }
  | {
      type: 'file_result'
      operation: 'create_file' | 'delete_file'
      result: 'success'
    }
  | {
      type: 'file_result'
      operation: 'read_file'
      result: string
      encoding: 'utf-8' | 'base64'
    }
  | { type: 'file_result'; operation: 'list_files'; result: string[] }
```

## Environment Variables

- `E2B_API_KEY` - Your E2B API key (required for E2B mode)
- `ANTHROPIC_API_KEY` - Your Anthropic API key (required)

## License

MIT
