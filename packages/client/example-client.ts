/**
 * Example WebSocket client for the Claude Agent SDK server running in E2B
 *
 * Usage: bun example-client.ts
 */

import { ClaudeAgentClient } from './src/index'

// Check for required environment variables
if (!process.env.E2B_API_KEY) {
  console.error('❌ E2B_API_KEY environment variable is required')
  process.exit(1)
}

if (!process.env.ANTHROPIC_API_KEY) {
  console.error('❌ ANTHROPIC_API_KEY environment variable is required')
  process.exit(1)
}

async function main() {
  const client = new ClaudeAgentClient({
    debug: true,
  })

  try {
    await client.start()

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
    ] as const

    // Register message handler
    client.onMessage(message => {
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

        case 'sdk_message':
          console.log('🤖 SDK Message:', JSON.stringify(message.data, null, 2))
          break

        default:
          console.log('📨 Unknown message type:', (message as any).type)
      }
    })

    // Send commands
    for (const command of commands) {
      console.log(`\n📤 Sending command: ${command.type}`)
      client.send(command)

      // Wait for response
      await new Promise(resolve => setTimeout(resolve, 1000))
    }

    // Disconnect
    setTimeout(async () => {
      console.log('\n👋 Closing connection...')
      await client.stop()
      console.log('✅ Sandbox terminated')
      process.exit(0)
    }, 1000)
  } catch (error) {
    console.error('❌ Error:', error)
    await client.stop()
    process.exit(1)
  }
}

main()
