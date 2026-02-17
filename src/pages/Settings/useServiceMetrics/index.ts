import {invoke} from '@tauri-apps/api/core'
import {useEffect, useState} from 'react'

export interface ServiceMetrics {
  cpu: number
  memory_mb: number
}

export function useServiceMetrics() {
  const [metrics, setMetrics] = useState<Record<string, ServiceMetrics>>({})

  useEffect(() => {
    let isMounted = true
    let timeoutId: NodeJS.Timeout

    const fetchMetrics = async () => {
      try {
        const result = await invoke<Record<string, ServiceMetrics>>('get_service_metrics')
        if (isMounted) {
          setMetrics(result)
        }
      } catch (error) {
        console.error('Failed to fetch service metrics:', error)
      }

      if (isMounted) {
        timeoutId = setTimeout(fetchMetrics, 3000)
      }
    }

    fetchMetrics()

    return () => {
      isMounted = false
      clearTimeout(timeoutId)
    }
  }, [])

  return metrics
}
