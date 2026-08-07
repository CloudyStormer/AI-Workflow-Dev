#!/usr/bin/env node

import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import { createServer } from 'node:http'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const MIME_TYPES = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.gif', 'image/gif'],
  ['.html', 'text/html; charset=utf-8'],
  ['.ico', 'image/x-icon'],
  ['.jpeg', 'image/jpeg'],
  ['.jpg', 'image/jpeg'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.mjs', 'text/javascript; charset=utf-8'],
  ['.png', 'image/png'],
  ['.svg', 'image/svg+xml'],
  ['.txt', 'text/plain; charset=utf-8'],
  ['.webp', 'image/webp'],
  ['.woff', 'font/woff'],
  ['.woff2', 'font/woff2'],
])

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

const options = parseArgs(process.argv.slice(2))
const serviceId = options.service
const mode = options.mode
const rootDir = options.root ? path.resolve(options.root) : ''
const host = options.host ?? '127.0.0.1'
const port = Number.parseInt(options.port ?? '', 10)

if (!serviceId || !['static', 'vinext'].includes(mode) || !rootDir || !Number.isInteger(port)) {
  throw new Error('Required arguments: --service ID --mode static|vinext --root DIR --host HOST --port PORT')
}

function safePath(root, pathname) {
  let decoded
  try {
    decoded = decodeURIComponent(pathname)
  } catch {
    return null
  }
  const relative = decoded.replace(/^\/+/, '')
  const candidate = path.resolve(root, relative)
  return candidate === root || candidate.startsWith(`${root}${path.sep}`) ? candidate : null
}

async function regularFile(filePath) {
  if (!filePath) return false
  try {
    return (await stat(filePath)).isFile()
  } catch {
    return false
  }
}

function contentType(filePath) {
  return MIME_TYPES.get(path.extname(filePath).toLowerCase()) ?? 'application/octet-stream'
}

async function streamFileToNodeResponse(filePath, response, method = 'GET') {
  const metadata = await stat(filePath)
  response.statusCode = 200
  response.setHeader('Content-Type', contentType(filePath))
  response.setHeader('Content-Length', metadata.size)
  response.setHeader('Cache-Control', filePath.endsWith('.html') ? 'no-cache' : 'public, max-age=3600')
  if (method === 'HEAD') {
    response.end()
    return
  }
  createReadStream(filePath).pipe(response)
}

async function fileResponse(filePath) {
  if (!(await regularFile(filePath))) return new Response('Not Found', { status: 404 })
  const metadata = await stat(filePath)
  const stream = createReadStream(filePath)
  return new Response(stream, {
    status: 200,
    headers: {
      'Content-Type': contentType(filePath),
      'Content-Length': String(metadata.size),
      'Cache-Control': filePath.endsWith('.html') ? 'no-cache' : 'public, max-age=3600',
    },
  })
}

async function sendWebResponse(webResponse, nodeResponse, method) {
  nodeResponse.statusCode = webResponse.status
  for (const [name, value] of webResponse.headers) {
    nodeResponse.setHeader(name, value)
  }
  if (method === 'HEAD' || !webResponse.body) {
    nodeResponse.end()
    return
  }
  const body = Buffer.from(await webResponse.arrayBuffer())
  nodeResponse.end(body)
}

function requestUrl(request) {
  return new URL(request.url ?? '/', `http://${request.headers.host ?? `${host}:${port}`}`)
}

async function staticHandler(request, response) {
  const url = requestUrl(request)
  const requested = safePath(rootDir, url.pathname)
  const target = (await regularFile(requested)) ? requested : path.join(rootDir, 'index.html')
  if (!(await regularFile(target))) {
    response.statusCode = 404
    response.end('Not Found')
    return
  }
  await streamFileToNodeResponse(target, response, request.method)
}

async function createVinextHandler() {
  const clientDir = path.join(rootDir, 'client')
  const serverEntry = path.join(rootDir, 'server', 'index.js')
  if (!(await regularFile(serverEntry))) {
    throw new Error(`Missing Vinext server bundle: ${serverEntry}`)
  }
  const module = await import(pathToFileURL(serverEntry).href)
  const worker = module.default
  if (!worker || typeof worker.fetch !== 'function') {
    throw new Error(`Vinext bundle does not export a worker fetch handler: ${serverEntry}`)
  }

  const assets = {
    async fetch(assetRequest) {
      const assetUrl = new URL(assetRequest.url)
      return fileResponse(safePath(clientDir, assetUrl.pathname))
    },
  }

  return async (request, response) => {
    const url = requestUrl(request)
    const directAsset = safePath(clientDir, url.pathname)
    if (await regularFile(directAsset)) {
      await streamFileToNodeResponse(directAsset, response, request.method)
      return
    }

    const webRequest = new Request(url, {
      method: request.method,
      headers: request.headers,
    })
    const executionContext = {
      passThroughOnException() {},
      waitUntil(promise) {
        Promise.resolve(promise).catch((error) => console.error('[local-service-server] waitUntil failed', error))
      },
    }
    const webResponse = await worker.fetch(webRequest, { ASSETS: assets }, executionContext)
    await sendWebResponse(webResponse, response, request.method)
  }
}

const handler = mode === 'vinext' ? await createVinextHandler() : staticHandler
const server = createServer((request, response) => {
  Promise.resolve(handler(request, response)).catch((error) => {
    console.error(`[local-service-server] ${serviceId} request failed`, error)
    if (!response.headersSent) response.statusCode = 500
    response.end('Internal Server Error')
  })
})

server.on('error', (error) => {
  console.error(`[local-service-server] ${serviceId} server error`, error)
  process.exitCode = 1
})

server.listen(port, host, () => {
  console.log(`[local-service-server] ${serviceId} listening at http://${host}:${port} from ${rootDir}`)
})

function shutdown(signal) {
  console.log(`[local-service-server] ${serviceId} received ${signal}; shutting down`)
  server.close((error) => {
    if (error) {
      console.error(`[local-service-server] ${serviceId} shutdown failed`, error)
      process.exit(1)
    }
    process.exit(0)
  })
  setTimeout(() => process.exit(1), 5000).unref()
}

process.on('SIGINT', () => shutdown('SIGINT'))
process.on('SIGTERM', () => shutdown('SIGTERM'))
