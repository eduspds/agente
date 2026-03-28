import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { getSocket } from '@/lib/socket'

export function useSocket() {
  const queryClient = useQueryClient()

  useEffect(() => {
    const socket = getSocket()

    const onLeadUpdated = () => {
      void queryClient.invalidateQueries({ queryKey: ['leads'] })
      void queryClient.invalidateQueries({ queryKey: ['lead'] })
      void queryClient.invalidateQueries({ queryKey: ['conversations'] })
      void queryClient.invalidateQueries({ queryKey: ['conversation'] })
      void queryClient.invalidateQueries({ queryKey: ['dashboard', 'stats'] })
    }

    socket.on('lead:updated', onLeadUpdated)
    return () => {
      socket.off('lead:updated', onLeadUpdated)
    }
  }, [queryClient])
}
