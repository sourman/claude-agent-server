// E2B build script

import { defaultBuildLogger, Template, waitForPort } from 'e2b'

import {
  E2B_CPU_COUNT,
  E2B_MEMORY_MB,
  E2B_TEMPLATE_ALIAS,
  SERVER_PORT,
  WORKSPACE_DIR_NAME,
} from '../server/const'

const template = Template()
  .fromBunImage('1.3')
  .runCmd('pwd')
  .makeDir(`/home/user/${WORKSPACE_DIR_NAME}`)
  .runCmd('sudo apt install -y git')
  .gitClone('https://github.com/dzhng/claude-agent-server', '/home/user/app', {
    branch: 'main',
  })
  .setWorkdir('/home/user/app')
  .runCmd('ls -la')
  .runCmd('bun install')
  .setStartCmd('bun packages/server/index.ts', waitForPort(SERVER_PORT))

async function main() {
  await Template.build(template, {
    alias: E2B_TEMPLATE_ALIAS,
    cpuCount: E2B_CPU_COUNT,
    memoryMB: E2B_MEMORY_MB,
    onBuildLogs: defaultBuildLogger(),
  })
}

main().catch(console.error)
