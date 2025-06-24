import { Hono } from 'https://deno.land/x/hono@v3.12.0/mod.ts'
import { sign, verify } from 'https://deno.land/x/djwt@v3.0.2/mod.ts'
import type { Database } from '../database/database.ts'
import type { Device, AuthToken } from '../types/index.ts'

const sharedSecret = Deno.env.get('SHARED_SECRET') || 'change-this-secret'
const jwtSecret = Deno.env.get('JWT_SECRET') || 'change-this-jwt-secret'

export function authRoutes(db: Database) {
  const app = new Hono()

  // Register a new device
  app.post('/register-device', async (c) => {
    try {
      const body = await c.req.json()
      const { deviceName, publicKey, secret } = body

      // Verify shared secret
      if (secret !== sharedSecret) {
        return c.json({ error: 'Invalid shared secret' }, 401)
      }

      if (!deviceName || !publicKey) {
        return c.json({ error: 'Device name and public key are required' }, 400)
      }

      // Generate device ID
      const deviceId = crypto.randomUUID()
      const now = Date.now()

      const device: Device = {
        deviceId,
        deviceName,
        publicKey,
        createdAt: now,
        lastSeen: now,
      }

      db.registerDevice(device)

      // Generate JWT token
      const token = await sign(
        {
          deviceId,
          exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60), // 24 hours
          iat: Math.floor(Date.now() / 1000),
        } as AuthToken,
        jwtSecret
      )

      return c.json({
        deviceId,
        token,
        expiresIn: 24 * 60 * 60, // 24 hours in seconds
      })
    } catch (error) {
      console.error('Device registration error:', error)
      return c.json({ error: 'Registration failed' }, 500)
    }
  })

  // Refresh token
  app.post('/refresh-token', async (c) => {
    try {
      const authHeader = c.req.header('Authorization')
      if (!authHeader?.startsWith('Bearer ')) {
        return c.json({ error: 'Missing or invalid authorization header' }, 401)
      }

      const token = authHeader.slice(7)
      const payload = await verify(token, jwtSecret) as AuthToken

      // Verify device exists
      const device = db.getDevice(payload.deviceId)
      if (!device) {
        return c.json({ error: 'Device not found' }, 404)
      }

      // Update last seen
      db.updateDeviceLastSeen(payload.deviceId)

      // Generate new token
      const newToken = await sign(
        {
          deviceId: payload.deviceId,
          exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60), // 24 hours
          iat: Math.floor(Date.now() / 1000),
        } as AuthToken,
        jwtSecret
      )

      return c.json({
        token: newToken,
        expiresIn: 24 * 60 * 60,
      })
    } catch (error) {
      console.error('Token refresh error:', error)
      return c.json({ error: 'Token refresh failed' }, 401)
    }
  })

  return app
}

// Middleware to verify JWT tokens
export async function authMiddleware(c: any, next: () => Promise<void>) {
  try {
    const authHeader = c.req.header('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return c.json({ error: 'Missing or invalid authorization header' }, 401)
    }

    const token = authHeader.slice(7)
    const payload = await verify(token, jwtSecret) as AuthToken
    
    // Add device info to context
    c.set('deviceId', payload.deviceId)
    c.set('authPayload', payload)
    
    await next()
  } catch (error) {
    console.error('Authentication failed:', error)
    return c.json({ error: 'Authentication failed' }, 401)
  }
}
