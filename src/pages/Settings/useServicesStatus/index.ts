import {useEffect, useState} from 'react'
import {ServiceData, useServices} from '../useServices'
import {fetch} from '@tauri-apps/plugin-http'

export type ServiceStatus = 'on' | 'off' | 'error'

export function useServicesStatus(services: ReturnType<typeof useServices>) {
  const [status, setStatus] = useState<Record<string, ServiceStatus>>({})

  useEffect(() => {
    console.log('services', services)
    const timeouts: Record<string, NodeJS.Timeout> = {}
    let isMounted = true
    const checkStatus = async (service: ServiceData) => {
      const serviceKey = `${service.category}.${service.name}`
      const newStatus = await getServiceStatus(service)

      setStatus(prev => {
        if (prev[serviceKey] === newStatus) {
          return prev
        }
        return {...prev, [serviceKey]: newStatus}
      })

      timeouts[serviceKey] = setTimeout(() => {
        if (isMounted) {
          checkStatus(service)
        }
      }, 2000)
    }

    for (const service of [
      ...services.servicesList,
      ...services.justoList,
      ...services.deliveryList,
    ]) {
      checkStatus(service)
    }

    return () => {
      isMounted = false
      const timeoutsArray = Object.values(timeouts)
      for (const timeout of timeoutsArray) {
        clearTimeout(timeout)
      }
    }
  }, [services])

  return status
}

async function getServiceStatus(service: ServiceData): Promise<ServiceStatus> {
  if (!service.on) return 'off'
  try {
    await fetchWithTimeout(`http://127.0.0.1:${service.port}`, {}, 5000)
    return 'on'
  } catch {
    return 'error'
  }
}

function fetchWithTimeout(url, options = {}, timeout = 5000) {
  const controller = new AbortController()
  const signal = controller.signal

  const fetchPromise = fetch(url, {...options, signal})

  const timeoutId = setTimeout(() => controller.abort(), timeout)

  return fetchPromise.finally(() => clearTimeout(timeoutId))
}
