import { ClaudeAgentClient } from './packages/client/src/index'

const client = new ClaudeAgentClient({
  e2bApiKey: process.env.E2B_API_KEY,
  anthropicApiKey: process.env.ANTHROPIC_API_KEY,
  template: 'claude-agent-server-ahmed',
  debug: true,
})

// Start the client
await client.start()

let receivedResponse = false

// Listen for messages from Claude
client.onMessage(message => {
  if (message.type === 'sdk_message') {
    console.log('Claude:', message.data)
    receivedResponse = true
  } else if (message.type === 'connected') {
    console.log('✅ Connection confirmed')
  } else if (message.type === 'error') {
    console.error('❌ Error:', message.error)
    receivedResponse = true
  }
})

// Send a message to Claude
client.send({
  type: 'user_message',
  data: {
    type: 'user',
    session_id: 'my-session',
    message: {
      role: 'user',
      content: 'Hello, Claude!',
    },
  },
})

// Wait for response (with timeout)
const maxWait = 30000
const startTime = Date.now()
while (!receivedResponse && Date.now() - startTime < maxWait) {
  await new Promise(resolve => setTimeout(resolve, 100))
}

if (!receivedResponse) {
  console.log('⏱️  Timeout waiting for response')
}

// Clean up when done
await client.stop()