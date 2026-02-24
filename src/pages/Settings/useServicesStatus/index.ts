import {invoke} from '@tauri-apps/api/core'
import {useEffect, useState} from 'react'
import {useServices} from '../useServices'

export type ServiceStatus = 'on' | 'off' | 'error'

export function useServicesStatus(services: ReturnType<typeof useServices>) {
  const [status, setStatus] = useState<Record<string, ServiceStatus>>({})

  useEffect(() => {
    let isMounted = true

    const pollStatuses = async () => {
      if (!services.servicesList.length) {
        if (isMounted) {
          setStatus({})
        }
        return
      }

      try {
        const rustServices = services.servicesList.map(service => ({
          name: service.name,
          path: service.path,
          port: service.port,
          full_name: service.fullName,
          on: service.on,
          category: service.category,
          config: service.config,
          start_command: service.startCommand,
        }))

        const runtimeStatus = await invoke<Record<string, ServiceStatus>>(
          'get_services_runtime_status',
          {
            services: rustServices,
          },
        )

        if (isMounted) {
          setStatus(runtimeStatus)
        }
      } catch (error) {
        console.error('Failed to get runtime services status:', error)
      }
    }

    pollStatuses()
    const interval = setInterval(pollStatuses, 2000)

    return () => {
      isMounted = false
      clearInterval(interval)
    }
  }, [services.servicesList])

  return status
}
