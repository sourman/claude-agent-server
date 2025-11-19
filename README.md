# Claude Agent SDK WebSocket Server

A WebSocket server that wraps the Claude Agent SDK, allowing real-time bidirectional communication with Claude through WebSockets.

## Features

- 🔌 **WebSocket-based**: Real-time communication using WebSockets
- 🎯 **Single Connection**: Simple 1-to-1 relay between one WebSocket client and the Claude Agent SDK
- 🚀 **Built with Bun**: Leverages Bun's high-performance WebSocket implementation
- 🧪 **Built-in Test Client**: Includes a web-based test interface

## Installation

```bash
bun install
```

### Environment Setup

Create a `.env` file in the relevant package directories:

```bash
# For Server
cp packages/server/.env.example packages/server/.env

# For Client
cp packages/client/.env.example packages/client/.env
```

Then edit the `.env` files and add your API keys:

```bash
ANTHROPIC_API_KEY=sk-ant-your-api-key-here
E2B_API_KEY=e2b_your-api-key-here  # Optional, only for E2B deployment
```

**Note:** Bun automatically loads `.env` files - no additional packages required!

## Usage

### Start the Server (Local)

```bash
bun run start:server
```

The server will start on `http://localhost:3000` with:

- Config endpoint: `http://localhost:3000/config`
- WebSocket endpoint: `ws://localhost:3000/ws`

### Configuration API

**Important:** Configuration must be set **before** connecting to the WebSocket. The query stream starts when the first WebSocket connection is established and uses the configuration at that time.

#### POST /config

Set the configuration for the Claude Agent SDK query:

```typescript
type QueryConfig = {
  agents?: Record<string, AgentDefinition>
  allowedTools?: string[]
  systemPrompt?:
    | string
    | {
        type: 'preset'
        preset: 'claude_code'
        append?: string
      }
  model?: string
  anthropicApiKey?: string
}
```

**Example:**

```bash
curl -X POST http://localhost:3000/config \
  -H "Content-Type: application/json" \
  -d '{
    "systemPrompt": "You are a helpful assistant.",
    "allowedTools": ["read_file", "write_file"],
    "anthropicApiKey": "sk-ant-...",
    "model": "claude-3-5-sonnet-20241022",
    "agents": {
      "myAgent": {
        "name": "My Custom Agent",
        "description": "A custom agent"
      }
    }
  }'
```

**Response:**

```json
{
  "success": true,
  "config": {
    "systemPrompt": "You are a helpful assistant.",
    "allowedTools": ["read_file", "write_file"],
    "agents": { ... }
  }
}
```

#### GET /config

Get the current configuration:

```bash
curl http://localhost:3000/config
```

**Response:**

```json
{
  "config": {
    "systemPrompt": "You are a helpful assistant.",
    "allowedTools": ["read_file", "write_file"]
  }
}
```

### WebSocket API

#### Connecting

Connect to the WebSocket endpoint:

```javascript
const ws = new WebSocket('ws://localhost:3000/ws')
```

**Note:** The server only accepts **one active connection at a time**. If another client is already connected, new connection attempts will be rejected with an error message.

#### Message Format

**Sending Messages (Client → Server)**

```typescript
type WSInputMessage =
  | {
      type: 'user_message'
      data: SDKUserMessage
    }
  | {
      type: 'interrupt'
    }
```

**User Message:**

Send a wrapped `SDKUserMessage`:

```json
{
  "type": "user_message",
  "data": {
    "type": "user",
    "session_id": "your-session-id",
    "parent_tool_use_id": null,
    "message": {
      "role": "user",
      "content": "Hello, Claude!"
    }
  }
}
```

**Structure:**

- `type`: Must be `"user_message"`
- `data`: An `SDKUserMessage` object containing:
  - `type`: Must be `"user"`
  - `session_id`: Your session identifier (string)
  - `message`: An object with `role` and `content`
    - `role`: Must be `"user"`
    - `content`: The message content (string)
  - `parent_tool_use_id`: Optional, for tool use responses
  - `uuid`: Optional, message UUID (auto-generated if not provided)

**Interrupt Message:**

Send an interrupt to stop the current agent operation:

```json
{
  "type": "interrupt"
}
```

**Receiving Messages (Server → Client)**

```typescript
type WSOutputMessage =
  | { type: 'connected' }
  | { type: 'sdk_message'; data: unknown }
  | { type: 'error'; error: string }
```

Connection confirmation:

```json
{
  "type": "connected"
}
```

SDK messages (responses from Claude):

```json
{
  "type": "sdk_message",
  "data": {
    "type": "assistant",
    "session_id": "...",
    "message": {
      /* Claude's response */
    }
  }
}
```

Error messages:

```json
{
  "type": "error",
  "error": "Error description"
}
```

### Example Client (Node.js/Bun)

```typescript
import { ClaudeAgentClient } from '@claude-agent/client'

const client = new ClaudeAgentClient({
  debug: true,
  // Optional: E2B configuration
  // e2bApiKey: process.env.E2B_API_KEY,
})

await client.start()

client.onMessage(message => {
  if (message.type === 'sdk_message') {
    console.log('Claude:', message.data)
  }
})

client.send({
  type: 'user_message',
  data: {
    type: 'user',
    session_id: 'session-1',
    message: { role: 'user', content: 'Hello' },
  },
})
```

## Architecture

The server is a simple **1-to-1 relay** between a single WebSocket client and the Claude Agent SDK:

1. **Configuration** (optional): Client can POST to `/config` to set agents, allowedTools, and systemPrompt
2. **Client Connects**: A WebSocket connection is established (only one allowed at a time)
3. **Client Sends Message**: Client sends a user message (or interrupt)
4. **Message Queuing**: Server adds messages to the queue and processes them with the SDK
5. **SDK Processing**: The SDK query stream processes messages using the configured options
6. **Response Relay**: SDK responses are immediately sent back to the connected WebSocket client
7. **Cleanup**: When the client disconnects, the server is ready to accept a new connection

**Key Design Principles:**

- **Pre-connection configuration**: Configure query options via `/config` endpoint before connecting
- **Lazy initialization**: Query stream only starts when first WebSocket connection is made
- **Single connection only**: Server rejects additional connection attempts while one is active
- **Simple relay**: Server relays messages between WebSocket and SDK without session management
- **Message queue**: Incoming messages are queued and processed by the SDK stream
- **Interrupt support**: Clients can send interrupt messages to stop ongoing operations
- **Direct routing**: All SDK responses go to the single active WebSocket connection

## Project Structure

The codebase follows a monorepo structure:

```
claude-agent-server/
├── packages/
│   ├── server/           # Main server implementation
│   │   ├── index.ts
│   │   ├── message-handler.ts
│   │   └── ...
│   ├── client/           # Client library and examples
│   │   ├── src/
│   │   └── example-client.ts
│   └── e2b-build/        # E2B build scripts
│       └── build.prod.ts
├── package.json          # Root package.json (workspaces)
└── README.md
```

## Testing

### Web Test Client

Open `http://localhost:3000/` in your browser to access the built-in test client. You can:

- Send messages to Claude
- See real-time responses
- View the full JSON structure of SDK messages

### Command Line Test Client

Run the example client script:

```bash
bun run test:client
```

This will connect to the server (or E2B sandbox), send a few test messages, and display the responses.

## E2B Deployment

This project can be deployed to [E2B](https://e2b.dev/) sandboxes for secure, isolated execution in the cloud.

### Prerequisites

1. Create an E2B account at [e2b.dev](https://e2b.dev/)
2. Get your E2B API key from the [dashboard](https://e2b.dev/dashboard?tab=keys)
3. Add your E2B API key to `packages/client/.env`:
   ```bash
   E2B_API_KEY=e2b_your-api-key-here
   ```

### Building the E2B Template

Build and deploy the template to E2B:

```bash
bun run build:e2b
```

This will:

- Create a sandbox template based on Bun 1.3
- Install git and clone this repository
- Install dependencies
- Configure the server to start on port 3000
- Register the template with alias `claude-agent-server`

The build process may take a few minutes. Once complete, the template will be available for creating sandboxes.

### Running with E2B

The example client (`packages/client/example-client.ts`) automatically uses E2B when both `E2B_API_KEY` and `ANTHROPIC_API_KEY` are set:

```bash
# Make sure both API keys are in your packages/client/.env file
bun run test:client
```

The client will:

1. Create a new E2B sandbox from the `claude-agent-server` template
2. Connect to the sandbox's WebSocket endpoint
3. Run test commands
4. Clean up and terminate the sandbox when done

### How It Works

When using E2B:

1. **Sandbox Creation**: A fresh sandbox is created from your built template
2. **Automatic Startup**: The server starts automatically in the sandbox (configured via `setStartCmd` in `build.prod.ts`)
3. **HTTPS/WSS**: E2B provides secure HTTPS and WSS endpoints for your sandbox
4. **Isolation**: Each sandbox runs in complete isolation with its own filesystem and resources
5. **Cleanup**: Sandboxes are automatically terminated when the client disconnects

### E2B Template Configuration

The template is defined in `packages/e2b-build/build.prod.ts`:

```typescript
const template = Template()
  .fromBunImage('1.3')                    // Use Bun 1.3 base image
  .runCmd('sudo apt install -y git')      // Install git
  .gitClone('https://github.com/...', ...) // Clone repository
  .setWorkdir('/home/user/app')           // Set working directory
  .runCmd('bun install')                  // Install dependencies
  .setStartCmd('bun packages/server/index.ts', waitForPort(3000)) // Start server
```

You can customize this template to:

- Install additional system packages
- Pre-configure environment variables
- Change resource limits (CPU, memory)
- Modify the startup command

### E2B vs Local Development

**Local Development** (localhost):

- Faster iteration
- Direct access to local filesystem
- No sandbox overhead
- Good for development and testing

**E2B Deployment**:

- Isolated execution environment
- Secure cloud sandboxes
- Scalable infrastructure
- Production-ready
- No local setup required

## Configuration

The server uses port 3000 by default. You can modify this in `packages/server/index.ts`:

```typescript
const server = Bun.serve<SessionData>({
  port: 3000, // Change this
  // ...
})
```

## Environment Variables

The server supports setting the Anthropic API key in three ways:

1. **Via `.env` file** (recommended for local development): Create a `.env` file in `packages/server`:

   ```bash
   cp packages/server/.env.example packages/server/.env
   ```

   Then edit `.env` and set your API key:

   ```
   ANTHROPIC_API_KEY=sk-ant-...
   ```

   Bun automatically loads `.env` files when running the server.

2. **Via Configuration API** (recommended for runtime configuration): Set `anthropicApiKey` in the `/config` endpoint:

   ```bash
   curl -X POST http://localhost:3000/config \
     -H "Content-Type: application/json" \
     -d '{"anthropicApiKey": "sk-ant-..."}'
   ```

3. **Via Environment Variable**: Set `ANTHROPIC_API_KEY` in your shell before starting the server:
   ```bash
   export ANTHROPIC_API_KEY=sk-ant-...
   bun run start:server
   ```

**Note:** The API key set via the configuration endpoint will override any environment variable.

## License

MIT
