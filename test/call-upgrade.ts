import { randomBytes } from 'node:crypto'
import { request } from 'node:http'

/**
 * Asks to open the WebSocket at `url` with `headers`, as a browser's handshake does, and answers the status the server
 * gave: 101 when it accepted the socket, which it then closes, or the refusal's status.
 */
export const upgradeStatus = (url: string, headers: Record<string, string>) =>
  new Promise<number>((resolve, reject) => {
    const asked = request(url, {
      headers: {
        ...headers,
        connection: 'Upgrade',
        upgrade: 'websocket',
        'sec-websocket-version': '13',
        'sec-websocket-key': randomBytes(16).toString('base64'),
      },
    })
    asked.once('upgrade', (answer, socket) => {
      socket.destroy()
      resolve(answer.statusCode ?? 101)
    })
    asked.once('response', (answer) => {
      answer.resume()
      resolve(answer.statusCode ?? 0)
    })
    asked.once('error', reject)
    asked.end()
  })
