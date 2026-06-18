import { WebSocketServer, WebSocket } from 'ws'
import http from 'node:http'

const PORT = Number(process.env.WS_PORT || 5177)
const POLLS_KEY = 'vue-poll-polls'
const VOTES_KEY = 'vue-poll-votes'

type Client = WebSocket & {
  isAlive?: boolean
  subscribedPollId?: string | null
  clientId?: string
}

function nowISO() {
  return new Date().toISOString()
}

function send(ws: Client, payload: unknown) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(payload))
  }
}

const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ ok: true, time: Date.now(), iso: nowISO() }))
    return
  }
  if (req.url === '/time') {
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    })
    const t = Date.now()
    res.end(JSON.stringify({ unixtime: Math.floor(t / 1000), serverTime: t, iso: nowISO() }))
    return
  }
  res.writeHead(404)
  res.end('Not Found')
})

const wss = new WebSocketServer({ server, path: '/ws' })

wss.on('connection', (ws: Client, req) => {
  ws.isAlive = true
  ws.subscribedPollId = null

  const ip =
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    req.socket.remoteAddress ||
    'unknown'

  ws.on('pong', () => {
    ws.isAlive = true
  })

  ws.on('message', (raw) => {
    let data
    try {
      data = JSON.parse(raw.toString())
    } catch {
      return
    }

    if (!data || typeof data !== 'object') return
    const { type, payload } = data

    if (type === 'ping') {
      send(ws, { type: 'pong', payload: { serverTime: Date.now() } })
      return
    }

    if (type === 'time_sync') {
      const t = Date.now()
      send(ws, {
        type: 'time_sync',
        payload: {
          clientBefore: payload?.clientBefore ?? 0,
          serverTime: t,
          iso: nowISO(),
        },
      })
      return
    }

    if (type === 'subscribe' && payload?.pollId) {
      ws.subscribedPollId = String(payload.pollId)
      send(ws, {
        type: 'connection_established',
        payload: { pollId: ws.subscribedPollId, serverTime: Date.now() },
      })
      return
    }

    if (type === 'vote_submitted' && payload?.pollId) {
      const envelope = {
        type: 'vote_submitted',
        payload: { ...payload, serverTime: Date.now() },
      }
      const msg = JSON.stringify(envelope)
      wss.clients.forEach((client) => {
        const c = client as Client
        if (c.readyState === WebSocket.OPEN && c.subscribedPollId === payload.pollId && c !== ws) {
          c.send(msg)
        }
      })
      return
    }

    if (type === 'poll_updated' && payload?.pollId) {
      const envelope = {
        type: 'poll_updated',
        payload: { ...payload, serverTime: Date.now() },
      }
      const msg = JSON.stringify(envelope)
      wss.clients.forEach((client) => {
        const c = client as Client
        if (c.readyState === WebSocket.OPEN && c !== ws) {
          c.send(msg)
        }
      })
      return
    }

    if (type === 'storage_write' && payload?.key && payload?.value) {
      const key = String(payload.key)
      const value = String(payload.value)
      if (key === POLLS_KEY || key === VOTES_KEY) {
        try {
          globalSharedStorage[key] = value
        } catch {
          /* ignore */
        }
        const envelope = {
          type: 'storage_update',
          payload: { key, serverTime: Date.now() },
        }
        const msg = JSON.stringify(envelope)
        wss.clients.forEach((client) => {
          const c = client as Client
          if (c.readyState === WebSocket.OPEN && c !== ws) {
            c.send(msg)
          }
        })
      }
      return
    }

    if (type === 'storage_read' && payload?.key) {
      const key = String(payload.key)
      send(ws, {
        type: 'storage_read',
        payload: {
          key,
          value: (globalSharedStorage as Record<string, string>)[key] ?? null,
          serverTime: Date.now(),
        },
      })
      return
    }
  })

  ws.on('close', () => {
    ws.isAlive = false
  })
})

const globalSharedStorage: Record<string, string> = {}

const interval = setInterval(() => {
  wss.clients.forEach((client) => {
    const c = client as Client
    if (c.isAlive === false) {
      c.terminate()
      return
    }
    c.isAlive = false
    try {
      c.ping()
    } catch {
      /* ignore */
    }
  })
}, 30_000)

wss.on('close', () => {
  clearInterval(interval)
})

server.listen(PORT, () => {
  console.log(`[vue-poll-ws] WebSocket + HTTP server listening on :${PORT}`)
  console.log(`[vue-poll-ws] WS endpoint: ws://localhost:${PORT}/ws`)
  console.log(`[vue-poll-ws] Time endpoint: http://localhost:${PORT}/time`)
  console.log(`[vue-poll-ws] Health endpoint: http://localhost:${PORT}/health`)
})
