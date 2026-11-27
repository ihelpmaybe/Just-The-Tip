/**
 * Stop Just The Tip local servers on 5193 (and dead 5173/4857 if still hung).
 * Never kills unrelated projects (including the standalone Lovense Connect emulator).
 */
import { execSync } from 'node:child_process'

const KILL_PORTS = [5193, 5173, 4857]

function killPid(pid) {
  try {
    process.kill(pid, 'SIGTERM')
  } catch {
    try {
      execSync(`taskkill /PID ${pid} /F`, { stdio: 'ignore' })
    } catch {
      /* gone */
    }
  }
}

function isOurs(cmd) {
  if (!cmd) return false
  if (cmd.includes('pulsefans.3') || cmd.includes('pulsefans.2')) {
    return (
      cmd.includes('vite') ||
      cmd.includes('host.ts') ||
      cmd.includes('host.mjs') ||
      cmd.includes('host.cjs') ||
      cmd.includes('stop-local') ||
      cmd.includes('electron')
    )
  }
  if (/\bJust The Tip\.exe\b/i.test(cmd) || /justthetip-setup/i.test(cmd)) {
    return true
  }
  return false
}

function listeners(port) {
  try {
    const out = execSync(
      `powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort ${port} -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess"`,
      { encoding: 'utf8' },
    )
    return [
      ...new Set(
        out
          .split(/\r?\n/)
          .map((s) => Number(s.trim()))
          .filter((n) => Number.isFinite(n) && n > 0),
      ),
    ]
  } catch {
    return []
  }
}

function cmdLine(pid) {
  try {
    return execSync(
      `powershell -NoProfile -Command "$p = Get-CimInstance Win32_Process -Filter 'ProcessId=${pid}'; if ($p) { $p.CommandLine }"`,
      { encoding: 'utf8' },
    ).trim()
  } catch {
    return ''
  }
}

function allNode() {
  try {
    const out = execSync(
      `powershell -NoProfile -Command "Get-CimInstance Win32_Process -Filter \\"Name='node.exe'\\" | ForEach-Object { Write-Output (($_.ProcessId.ToString()) + '|' + [string]$_.CommandLine) }"`,
      { encoding: 'utf8', maxBuffer: 4_000_000 },
    )
    return out
      .split(/\r?\n/)
      .map((line) => {
        const i = line.indexOf('|')
        if (i < 0) return null
        return { pid: Number(line.slice(0, i)), cmd: line.slice(i + 1) }
      })
      .filter((x) => x && Number.isFinite(x.pid) && x.pid > 0)
  } catch {
    return []
  }
}

const killed = new Set()

for (const port of KILL_PORTS) {
  for (const pid of listeners(port)) {
    const cmd = cmdLine(pid)
    if (
      (port === 5193 || port === 5173) &&
      (isOurs(cmd) || cmd.includes('pulsefans') || /Just The Tip/i.test(cmd))
    ) {
      console.log(`  stop pid ${pid} (:${port})`)
      killPid(pid)
      killed.add(pid)
      continue
    }
    if (
      port === 4857 &&
      (isOurs(cmd) || cmd.includes('pulsefans') || cmd.includes('host.ts'))
    ) {
      console.log(`  stop legacy pid ${pid} (:${port})`)
      killPid(pid)
      killed.add(pid)
    }
  }
}

for (const row of allNode()) {
  if (!row || killed.has(row.pid)) continue
  if (!isOurs(row.cmd)) continue
  console.log(`  stop pid ${row.pid}`)
  killPid(row.pid)
  killed.add(row.pid)
}

if (!killed.size) console.log('  Nothing running for Just The Tip.')
else console.log(`  Stopped ${killed.size} process(es).`)
console.log('  One URL →  http://127.0.0.1:5193/')
