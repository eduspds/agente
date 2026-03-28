import { io, type Socket } from 'socket.io-client'
import { useAuthStore } from '@/store/auth.store'

let socket: Socket | null = null

export function getSocket(): Socket {
  const { token } = useAuthStore.getState()
  if (!socket || socket.disconnected) {
    socket?.removeAllListeners()
    socket?.disconnect()
    socket = io('/', {
      path: '/socket.io',
      auth: { token },
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    })
  }
  return socket
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}
