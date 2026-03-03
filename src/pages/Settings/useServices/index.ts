import {invoke} from '@tauri-apps/api/core'
import {useEffect, useRef, useState} from 'react'
import {toast} from 'sonner'
import {AppSettings} from '../useSettings'

export interface ServiceData {
  name: string
  path: string
  port: number
  fullName: string
  on: boolean
  category: 'services'
  config: Record<string, any>
  startCommand: string
}

interface RustServiceData {
  name: string
  path: string
  port: number
  full_name: string
  on: boolean
  category: string
  config: Record<string, any>
  start_command: string
}

interface ServicesResponse {
  services_list: RustServiceData[]
}

export function useServices(settings: AppSettings) {
  const [loaded, setLoaded] = useState(false)
  const [servicesList, setServicesList] = useState<ServiceData[]>([])
  const didAutoStart = useRef(false)

  useEffect(() => {
    ;(async () => {
      console.log('checking services via Rust backend')

      const response = await invoke<ServicesResponse>('get_services_list', {
        settings: {
          servicesPath: settings.servicesPath,
          onServices: settings.onServices,
        },
      })

      const mappedServices: ServiceData[] = response.services_list.map(service => ({
        name: service.name,
        path: service.path,
        port: service.port,
        fullName: service.full_name,
        on: service.on,
        category: service.category as 'services',
        config: service.config,
        startCommand: service.start_command,
      }))

      if (mappedServices.length > 0) {
        await invoke('prepare_services_start', {
          services: mappedServices.map(service => ({
            name: service.name,
            path: service.path,
            port: service.port,
            full_name: service.fullName,
            on: service.on,
            category: service.category,
            config: service.config,
            start_command: service.startCommand,
          })),
        })
      }

      setServicesList(mappedServices)

      // Auto-start runs only once per app boot.
      if (!didAutoStart.current && mappedServices.length > 0) {
        didAutoStart.current = true
        const shouldStartServices = settings.startServicesOnLaunch !== false
        if (shouldStartServices) {
          const enabledServices = mappedServices.filter(service => service.on)
          if (enabledServices.length > 0) {
            try {
              await invoke('dev5_start', {
                servicePath: enabledServices[0].path,
                names: enabledServices.map(s => s.name),
              })
            } catch (error) {
              console.error('Failed to start services on startup:', error)
            }
          }
        }
      }
    })()
      .then(() => setLoaded(true))
      .catch(error => {
        console.error('Failed to load services:', error)
        toast.error('Failed to load services:', {
          description: `${error}`,
        })
      })
  }, [settings])

  return {
    loaded,
    servicesList,
  }
}
