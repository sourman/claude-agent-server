// E2B build script

import { defaultBuildLogger, Template, waitForPort } from 'e2b'

const template = Template()
  .fromBunImage('1.3')
  .runCmd('pwd')
  .makeDir('/home/user/agent-workspace')
  .runCmd('sudo apt install -y git')
  .gitClone('https://github.com/dzhng/claude-agent-server', '/home/user/app', {
    branch: 'main',
  })
  .setWorkdir('/home/user/app')
  .runCmd('ls -la')
  .runCmd('bun install')
  .setStartCmd('bun index.ts', waitForPort(3000))

async function main() {
  await Template.build(template, {
    alias: 'claude-agent-server',
    cpuCount: 2,
    memoryMB: 2048,
    onBuildLogs: defaultBuildLogger(),
  })
}

main().catch(console.error)
