import {
  type AgentDefinition,
  type McpHttpServerConfig,
  type McpSSEServerConfig,
  type SDKMessage,
  type SDKUserMessage,
} from '@anthropic-ai/claude-agent-sdk'

// Re-export e2b types
export {
  FilesystemEventType,
  type FilesystemEvent,
  type WatchHandle,
} from 'e2b'

// WebSocket message types
export type WSInputMessage =
  | {
      type: 'user_message'
      data: SDKUserMessage
    }
  | { type: 'interrupt' }

export type WSOutputMessage =
  | { type: 'connected' }
  | { type: 'sdk_message'; data: SDKMessage }
  | { type: 'error'; error: string }
  | { type: 'info'; data: string }

export type McpRemoteServerConfig = McpHttpServerConfig | McpSSEServerConfig

// Configuration type for the query options
export type QueryConfig = {
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
  mcpServers?: Record<string, McpRemoteServerConfig>
  anthropicApiKey?: string
}

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
  /** Connection URL for local/custom server. If provided, will use this instead of E2B */
  connectionUrl?: string
  /** Enable debug logging */
  debug?: boolean
}
