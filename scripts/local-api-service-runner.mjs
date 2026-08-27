#!/usr/bin/env node

import { readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'

function parseArgs(argv) {
  const result = {}
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index]
    const value = argv[index + 1]
    if (!key?.startsWith('--') || value === undefined) {
      throw new Error(`Invalid argument sequence near ${key ?? '<end>'}`)
    }
    result[key.slice(2)] = value
  }
  return result
}

function requirePrivateKey(keyPath) {
  const metadata = statSync(keyPath)
  if ((metadata.mode & 0o077) !== 0) {
    throw new Error('Career material key must not be accessible by group or other users')
  }
  const value = readFileSync(keyPath, 'utf8').trim()
  if (!/^[0-9a-f]{64}$/.test(value)) {
    throw new Error('Career material key must contain exactly 64 lowercase hexadecimal characters')
  }
  return value
}

function serviceRuntime(serviceId, rootDir) {
  if (serviceId === 'radar-api') {
    return {
      entry: path.join(rootDir, 'dist', 'server.js'),
      environment: {
        AMR_API_HOST: '127.0.0.1',
        AMR_API_PORT: '4317',
        AMR_DATA_DIR: path.join(rootDir, '.local-data'),
        AMR_CORS_ORIGINS: 'http://127.0.0.1:5173,http://127.0.0.1:4174',
        AMR_SOURCE_TIMEOUT_MS: '12000',
        AMR_SOURCE_RETRIES: '2',
      },
    }
  }
  if (serviceId === 'career-api') {
    return {
      entry: path.join(rootDir, 'dist', 'apps', 'api', 'main.js'),
      environment: {
        PORT: '4318',
        DATA_DIR: path.join(rootDir, 'var', 'local-runtime'),
        CORS_ORIGINS: 'http://127.0.0.1:4177,http://127.0.0.1:5173',
        LOCAL_TENANT_ID: 'local-career-owner',
        LOCAL_ACCOUNT_ID: 'local-career-account',
        MATERIAL_ENCRYPTION_KEY_HEX: requirePrivateKey(path.join(rootDir, 'var', '.material-key')),
      },
    }
  }
  throw new Error(`Unsupported local API service: ${serviceId}`)
}

const options = parseArgs(process.argv.slice(2))
const serviceId = options.service
const rootDir = options.root ? path.resolve(options.root) : ''
if (!serviceId || !rootDir) {
  throw new Error('Required arguments: --service ID --root DIR')
}

const runtime = serviceRuntime(serviceId, rootDir)
statSync(runtime.entry)

const child = spawn(process.execPath, [runtime.entry], {
  cwd: rootDir,
  env: { ...process.env, ...runtime.environment },
  stdio: 'inherit',
})

let shutdownTimer
function forward(signal) {
  if (child.exitCode !== null || child.signalCode !== null) return
  child.kill(signal)
  shutdownTimer ??= setTimeout(() => {
    if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL')
  }, 5000).unref()
}

process.once('SIGINT', () => forward('SIGINT'))
process.once('SIGTERM', () => forward('SIGTERM'))

child.once('error', (error) => {
  console.error(`[local-api-service-runner] ${serviceId} child process failed`, error)
  process.exitCode = 1
})

child.once('exit', (code, signal) => {
  if (shutdownTimer) clearTimeout(shutdownTimer)
  if (signal) {
    console.log(`[local-api-service-runner] ${serviceId} child exited after ${signal}`)
    process.exitCode = signal === 'SIGTERM' || signal === 'SIGINT' ? 0 : 1
  } else {
    process.exitCode = code ?? 1
  }
})
