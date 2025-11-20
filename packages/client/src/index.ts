import {
  FilesystemEventType,
  Sandbox,
  type FilesystemEvent,
  type WatchHandle,
} from 'e2b'

import type {
  QueryConfig,
  WSInputMessage,
  WSOutputMessage,
} from '../../server/message-types'

export type {
  QueryConfig,
  WSInputMessage,
  WSOutputMessage,
  FilesystemEvent,
  WatchHandle,
}
export { FilesystemEventType }

export const DEFAULT_TEMPLATE = 'claude-agent-server'
export const SERVER_PORT = 3000

/**
 * Configuration options for the Claude Agent Client
 */
export interface ClientOptions extends Partial<QueryConfig> {
  /** E2B API key */
  e2bApiKey?: string
  /** E2B template name. Defaults to 'claude-agent-server' */
  template?: string
  /** Timeout in milliseconds. Defaults to 5 minutes */
  timeoutMs?: number
  /** Enable debug logging */
  debug?: boolean
}

export class ClaudeAgentClient {
  private sandbox?: Sandbox
  private ws?: WebSocket
  private options: ClientOptions
  private messageHandlers: ((message: WSOutputMessage) => void)[] = []

  constructor(options: ClientOptions = {}) {
    this.options = {
      template: DEFAULT_TEMPLATE,
      timeoutMs: 5 * 60 * 1000,
      ...options,
    }
  }

  async start() {
    const apiKey = this.options.e2bApiKey || process.env.E2B_API_KEY
    const anthropicApiKey =
      this.options.anthropicApiKey || process.env.ANTHROPIC_API_KEY

    if (!apiKey) {
      throw new Error('E2B_API_KEY is required')
    }

    if (!anthropicApiKey) {
      throw new Error('ANTHROPIC_API_KEY is required')
    }

    if (this.options.debug) {
      console.log(`🚀 Creating sandbox from ${this.options.template}...`)
    }

    this.sandbox = await Sandbox.create(this.options.template!, {
      apiKey,
      timeoutMs: this.options.timeoutMs,
    })

    if (this.options.debug) {
      console.log(`✅ Sandbox created: ${this.sandbox.sandboxId}`)
    }

    const sandboxHost = this.sandbox.getHost(SERVER_PORT)
    const configUrl = `https://${sandboxHost}/config`
    const wsUrl = `wss://${sandboxHost}/ws`

    if (this.options.debug) {
      console.log(`📡 Configuring server at ${configUrl}...`)
    }

    const configResponse = await fetch(configUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        anthropicApiKey,
        ...this.options,
      }),
    })

    if (!configResponse.ok) {
      const error = await configResponse.text()
      if (this.sandbox) {
        await this.sandbox.kill()
      }
      throw new Error(`Failed to configure server: ${error}`)
    }

    if (this.options.debug) {
      console.log('🔌 Connecting to WebSocket...')
    }

    return new Promise<void>((resolve, reject) => {
      this.ws = new WebSocket(wsUrl)

      this.ws.onopen = () => {
        if (this.options.debug) console.log('✅ Connected to Claude Agent SDK')
        resolve()
      }

      this.ws.onmessage = event => {
        try {
          const message = JSON.parse(event.data.toString()) as WSOutputMessage
          this.handleMessage(message)
        } catch (error) {
          console.error('Failed to parse message:', error)
        }
      }

      this.ws.onerror = error => {
        console.error('WebSocket error:', error)
        reject(error)
      }

      this.ws.onclose = () => {
        if (this.options.debug) console.log('👋 Disconnected')
      }
    })
  }

  private handleMessage(message: WSOutputMessage) {
    if (this.options.debug) {
      console.log('📨 Received message:', JSON.stringify(message, null, 2))
    }
    this.messageHandlers.forEach(handler => handler(message))
  }

  onMessage(handler: (message: WSOutputMessage) => void) {
    this.messageHandlers.push(handler)
    return () => {
      this.messageHandlers = this.messageHandlers.filter(h => h !== handler)
    }
  }

  send(message: WSInputMessage) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket is not connected')
    }
    this.ws.send(JSON.stringify(message))
  }

  async writeFile(path: string, content: string | Blob) {
    if (!this.sandbox) {
      throw new Error('Sandbox not initialized')
    }
    return this.sandbox.files.write(path, content)
  }

  async readFile(
    path: string,
    format: 'text' | 'blob',
  ): Promise<string | Blob> {
    if (!this.sandbox) {
      throw new Error('Sandbox not initialized')
    }
    if (format === 'blob') {
      return this.sandbox.files.read(path, { format })
    }
    return this.sandbox.files.read(path)
  }

  async removeFile(path: string) {
    if (!this.sandbox) {
      throw new Error('Sandbox not initialized')
    }
    return this.sandbox.files.remove(path)
  }

  async listFiles(path = '.') {
    if (!this.sandbox) {
      throw new Error('Sandbox not initialized')
    }
    return this.sandbox.files.list(path)
  }

  async watchDir(
    path: string,
    onEvent: (event: FilesystemEvent) => void | Promise<void>,
    opts?: {
      recursive?: boolean
      onExit?: (err?: Error) => void | Promise<void>
    },
  ): Promise<WatchHandle> {
    if (!this.sandbox) {
      throw new Error('Sandbox not initialized')
    }
    return this.sandbox.files.watchDir(path, onEvent, opts)
  }

  async stop() {
    if (this.ws) {
      this.ws.close()
    }
    if (this.sandbox) {
      await this.sandbox.kill()
    }
  }
}
