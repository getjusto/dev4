import {invoke} from '@tauri-apps/api/core'
import {useEffect, useState} from 'react'
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

  useEffect(() => {
    ;(async () => {
      console.log('checking services via Rust backend')

      // Call the Rust command to get all services
      const response = await invoke<ServicesResponse>('get_services_list', {
        settings: {
          servicesPath: settings.servicesPath,
          onServices: settings.onServices,
        },
      })

      // Map the response to match the expected format
      const servicesList: ServiceData[] = response.services_list.map(service => ({
        name: service.name,
        path: service.path,
        port: service.port,
        fullName: service.full_name,
        on: service.on,
        category: service.category as 'services',
        config: service.config,
        startCommand: service.start_command,
      }))

      // Prepare start scripts for services that need them (only services category)
      if (servicesList.length > 0) {
        await invoke('prepare_services_start', {
          services: servicesList.map(service => ({
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

      setServicesList(servicesList)

      // Ensure services are running according to their 'on' state on startup
      const shouldStartServices = settings.startServicesOnLaunch !== false
      const allServices = [...servicesList]
      if (allServices.length > 0) {
        try {
          // Convert to Rust format for the command
          const rustServices = allServices.map(service => ({
            name: service.name,
            path: service.path,
            port: service.port,
            full_name: service.fullName,
            on: shouldStartServices ? service.on : false,
            category: service.category,
            config: service.config,
            start_command: service.startCommand,
          }))

          const actions = await invoke<string[]>('ensure_services_running', {
            services: rustServices,
          })

          console.log('Startup service management actions:', actions)
        } catch (error) {
          console.error('Failed to manage services on startup:', error)
          // Don't show error toast on startup to avoid overwhelming the user
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
