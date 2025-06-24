import type { WSMessage } from '../types/index.ts'

interface ConnectedDevice {
  deviceId: string
  socket: WebSocket
  lastPing: number
}

export class WebSocketManager {
  private connections = new Map<string, ConnectedDevice>()
  private pingInterval: number

  constructor() {
    // Ping connected clients every 30 seconds
    this.pingInterval = setInterval(() => {
      this.pingAllConnections()
    }, 30000)
  }

  handleConnection(socket: WebSocket) {
    let deviceId: string | undefined

    socket.onopen = () => {
      console.log('WebSocket connection opened')
    }

    socket.onmessage = (event) => {
      try {
        const message: WSMessage = JSON.parse(event.data)
        
        switch (message.type) {
          case 'ping':
            // Respond with pong
            socket.send(JSON.stringify({
              type: 'pong',
              timestamp: Date.now()
            }))
            break

          case 'sync_request':
            // Handle sync request - could trigger sending events
            if (deviceId) {
              this.updateLastPing(deviceId)
            }
            break

          default:
            console.log('Unknown WebSocket message type:', message.type)
        }
      } catch (error) {
        console.error('Error processing WebSocket message:', error)
      }
    }

    socket.onclose = () => {
      if (deviceId) {
        this.connections.delete(deviceId)
        console.log(`WebSocket connection closed for device: ${deviceId}`)
      }
    }

    socket.onerror = (error) => {
      console.error('WebSocket error:', error)
      if (deviceId) {
        this.connections.delete(deviceId)
      }
    }

    // TODO: Implement authentication for WebSocket connections
    // For now, we'll register the connection when we receive the first message
    // In a real implementation, you'd want to authenticate the WebSocket connection
  }

  registerDevice(deviceId: string, socket: WebSocket) {
    this.connections.set(deviceId, {
      deviceId,
      socket,
      lastPing: Date.now()
    })
    console.log(`Device registered for WebSocket: ${deviceId}`)
  }

  broadcastToOthers(excludeDeviceId: string, message: WSMessage) {
    const messageStr = JSON.stringify(message)
    
    for (const [deviceId, connection] of this.connections) {
      if (deviceId !== excludeDeviceId && connection.socket.readyState === WebSocket.OPEN) {
        try {
          connection.socket.send(messageStr)
        } catch (error) {
          console.error(`Failed to send message to device ${deviceId}:`, error)
          this.connections.delete(deviceId)
        }
      }
    }
  }

  broadcastToAll(message: WSMessage) {
    const messageStr = JSON.stringify(message)
    
    for (const [deviceId, connection] of this.connections) {
      if (connection.socket.readyState === WebSocket.OPEN) {
        try {
          connection.socket.send(messageStr)
        } catch (error) {
          console.error(`Failed to send message to device ${deviceId}:`, error)
          this.connections.delete(deviceId)
        }
      }
    }
  }

  sendToDevice(deviceId: string, message: WSMessage) {
    const connection = this.connections.get(deviceId)
    if (connection && connection.socket.readyState === WebSocket.OPEN) {
      try {
        connection.socket.send(JSON.stringify(message))
        return true
      } catch (error) {
        console.error(`Failed to send message to device ${deviceId}:`, error)
        this.connections.delete(deviceId)
        return false
      }
    }
    return false
  }

  private pingAllConnections() {
    const now = Date.now()
    const staleThreshold = 2 * 60 * 1000 // 2 minutes

    for (const [deviceId, connection] of this.connections) {
      if (connection.socket.readyState === WebSocket.OPEN) {
        // Send ping
        try {
          connection.socket.send(JSON.stringify({
            type: 'ping',
            timestamp: now
          }))
        } catch (error) {
          console.error(`Failed to ping device ${deviceId}:`, error)
          this.connections.delete(deviceId)
        }
      } else {
        // Remove stale connections
        if (now - connection.lastPing > staleThreshold) {
          this.connections.delete(deviceId)
          console.log(`Removed stale connection for device: ${deviceId}`)
        }
      }
    }
  }

  private updateLastPing(deviceId: string) {
    const connection = this.connections.get(deviceId)
    if (connection) {
      connection.lastPing = Date.now()
    }
  }

  getConnectedDevices(): string[] {
    return Array.from(this.connections.keys())
  }

  disconnect(deviceId: string) {
    const connection = this.connections.get(deviceId)
    if (connection) {
      connection.socket.close()
      this.connections.delete(deviceId)
    }
  }

  cleanup() {
    clearInterval(this.pingInterval)
    for (const connection of this.connections.values()) {
      connection.socket.close()
    }
    this.connections.clear()
  }
}
