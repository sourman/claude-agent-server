/**
 * Example WebSocket client for the Claude Agent SDK server running in E2B
 *
 * Usage: bun example-client.ts
 */

import { Sandbox } from 'e2b'

// Check for required environment variables
if (!process.env.E2B_API_KEY) {
  console.error('❌ E2B_API_KEY environment variable is required')
  process.exit(1)
}

if (!process.env.ANTHROPIC_API_KEY) {
  console.error('❌ ANTHROPIC_API_KEY environment variable is required')
  process.exit(1)
}

console.log('🚀 Creating E2B sandbox from claude-agent-server template...')

// Create a sandbox from the built template
const sandbox = await Sandbox.create('claude-agent-server', {
  apiKey: process.env.E2B_API_KEY,
  timeoutMs: 5 * 60 * 1000, // 5 minutes
})

console.log(`✅ Sandbox created: ${sandbox.sandboxId}`)

// Get the sandbox URL using the getHost method
const sandboxHost = sandbox.getHost(3000)
const configUrl = `https://${sandboxHost}/config`
const wsUrl = `wss://${sandboxHost}/ws`

console.log(`📡 Configuring server at ${configUrl}...`)

// Configure the server before connecting
const configResponse = await fetch(configUrl, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    anthropicApiKey: process.env.ANTHROPIC_API_KEY,
  }),
})

if (!configResponse.ok) {
  console.error('❌ Failed to configure server:', await configResponse.text())
  await sandbox.kill()
  process.exit(1)
}

const configResult = await configResponse.json()
console.log('⚙️  Server configured:', configResult)

console.log(`🔌 Connecting to WebSocket at ${wsUrl}...`)

const ws = new WebSocket(wsUrl)

ws.onopen = async () => {
  console.log('✅ Connected to Claude Agent SDK in E2B sandbox')

  const commands = [
    {
      type: 'create_file',
      path: 'test_binary.bin',
      content: Buffer.from('Binary Content').toString('base64'),
      encoding: 'base64',
    },
    {
      type: 'create_file',
      path: 'test_text.txt',
      content: 'Plain Text Content',
      encoding: 'utf-8',
    },
    {
      type: 'list_files',
    },
    {
      type: 'read_file',
      path: 'test_binary.bin',
      encoding: 'base64',
    },
    {
      type: 'read_file',
      path: 'test_text.txt',
      encoding: 'utf-8',
    },
    {
      type: 'delete_file',
      path: 'test_binary.bin',
    },
    {
      type: 'delete_file',
      path: 'test_text.txt',
    },
    {
      type: 'list_files',
    },
  ]

  for (const command of commands) {
    console.log(`\n📤 Sending command: ${command.type}`)
    ws.send(JSON.stringify(command))

    // Wait for response
    await new Promise(resolve => setTimeout(resolve, 1000))
  }

  // Disconnect
  setTimeout(async () => {
    console.log('\n👋 Closing connection...')
    ws.close()

    // Clean up the sandbox
    console.log('🧹 Cleaning up sandbox...')
    await sandbox.kill()
    console.log('✅ Sandbox terminated')
    process.exit(0)
  }, 1000)
}

ws.onmessage = event => {
  try {
    const message = JSON.parse(event.data.toString())

    switch (message.type) {
      case 'connected':
        console.log('🔗 Connection confirmed')
        break

      case 'file_result':
        console.log(
          '📄 File Operation Result:',
          JSON.stringify(message, null, 2),
        )
        break

      case 'error':
        console.error('❌ Error:', message.error)
        break

      default:
        console.log('📨 Unknown message type:', message.type)
    }
  } catch (error) {
    console.error('❌ Failed to parse message:', error)
  }
}

ws.onerror = async error => {
  console.error('❌ WebSocket error:', error)
  await sandbox.kill()
  process.exit(1)
}

ws.onclose = async () => {
  console.log('\n👋 Disconnected from server')
}
