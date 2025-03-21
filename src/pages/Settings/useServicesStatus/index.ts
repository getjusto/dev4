import {useEffect, useState} from 'react'
import {ServiceData, useServices} from '../useServices'
import {fetch} from '@tauri-apps/plugin-http'

export type ServiceStatus = 'on' | 'off' | 'error'

export function useServicesStatus(services: ReturnType<typeof useServices>) {
  const [status, setStatus] = useState<Record<string, ServiceStatus>>({})

  useEffect(() => {
    const checkStatus = async () => {
      const newStatus = {}

      for (const service of [
        ...services.servicesList,
        ...services.justoList,
        ...services.deliveryList,
      ]) {
        const status = await getServiceStatus(service)
        newStatus[`${service.category}.${service.name}`] = status
      }

      if (JSON.stringify(status) !== JSON.stringify(newStatus)) {
        setStatus(newStatus)
      }
    }

    checkStatus()
    const interval = setInterval(checkStatus, 5000)
    return () => clearInterval(interval)
  }, [services])

  return status
}

async function getServiceStatus(service: ServiceData): Promise<ServiceStatus> {
  if (!service.on) return 'off'
  try {
    // fetch with timeout
    await fetch(`http://127.0.0.1:${service.port}`)
    return 'on'
  } catch {
    return 'error'
  }
}
