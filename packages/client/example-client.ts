/**
 * Example WebSocket client for the Claude Agent SDK server
 *
 * Usage: bun example-client.ts
 */

import { ClaudeAgentClient } from './src/index'
import { FilesystemEventType } from './src/types'

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

  // Helper function to print file contents
  const printFileContents = async (files: string[], label: string) => {
    if (files.length > 0) {
      console.log(`\n${label}`)
      for (const file of files) {
        try {
          const content = await client.readFile(file, 'text')
          console.log(`\n  ${file}:`)
          console.log('  ' + '─'.repeat(50))
          console.log(
            content
              .toString()
              .split('\n')
              .map(line => `  ${line}`)
              .join('\n'),
          )
          console.log('  ' + '─'.repeat(50))
        } catch (error) {
          console.log(`  - ${file} (could not read: ${error})`)
        }
      }
    }
  }

  try {
    await client.start()

    // Track file changes
    const createdFiles: string[] = []
    const modifiedFiles: string[] = []

    // Set up file watcher
    console.log('👀 Setting up file watcher...')
    const watchHandle = await client.watchDir(
      '.',
      event => {
        const eventTypeLabels: Record<string, string> = {
          [FilesystemEventType.CREATE]: '📄 Created',
          [FilesystemEventType.WRITE]: '✏️  Modified',
          [FilesystemEventType.REMOVE]: '🗑️  Deleted',
          [FilesystemEventType.RENAME]: '📝 Renamed',
          [FilesystemEventType.CHMOD]: '🔐 Permissions changed',
        }
        const label = eventTypeLabels[event.type] || '📁 Changed'
        console.log(`${label}: ${event.name}`)

        // Track created and modified files
        if (event.type === FilesystemEventType.CREATE) {
          createdFiles.push(event.name)
        } else if (event.type === FilesystemEventType.WRITE) {
          modifiedFiles.push(event.name)
        }
      },
      { recursive: true },
    )
    console.log('✅ File watcher active\n')

    console.log('🗂️  Writing input.txt...')
    await client.writeFile(
      'input.txt',
      'Hello! This is a test file created by the user.',
    )
    console.log('✅ File written')

    const commands = [
      {
        type: 'user_message',
        data: {
          type: 'user',
          session_id: 'example-session',
          parent_tool_use_id: null,
          message: {
            role: 'user',
            content:
              'Please read "input.txt", reverse its content, and save it to a new file named "output.txt".',
          },
        },
      },
    ] as const

    // Cleanup function
    const stopAndExit = async () => {
      console.log('\n✅ Received result message, stopping...')

      // Print created and modified files with contents
      await printFileContents(createdFiles, '📄 Created files:')
      await printFileContents(modifiedFiles, '✏️  Modified files:')

      console.log('\n🛑 Stopping file watcher...')
      await watchHandle.stop()
      console.log('\n👋 Closing connection...')
      await client.stop()
      console.log('✅ Sandbox terminated')
      process.exit(0)
    }

    // Register message handler
    client.onMessage(async message => {
      switch (message.type) {
        case 'connected':
          console.log('🔗 Connection confirmed')
          break

        case 'error':
          console.error('❌ Error:', message.error)
          break

        case 'sdk_message':
          console.log('🤖 SDK Message:', JSON.stringify(message.data, null, 2))

          // Stop when we receive a "result" type message
          if (message.data.type === 'result') {
            await stopAndExit()
          }
          break

        default:
          console.log('📨 Unknown message type:', (message as any).type)
      }
    })

    // Send commands
    for (const command of commands) {
      console.log(`\n📤 Sending command: ${command.type}`)
      client.send(command)
      await new Promise(resolve => setTimeout(resolve, 2000))
    }

    // Keep watching for changes
    console.log(
      '\n👀 Watching for file changes... (will stop when result is received)',
    )
  } catch (error) {
    console.error('❌ Error:', error)
    await client.stop()
    process.exit(1)
  }
}

main()
