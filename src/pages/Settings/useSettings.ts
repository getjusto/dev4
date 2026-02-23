import generateId from '@/lib/generateId'
import {invoke} from '@tauri-apps/api/core'
import {appConfigDir} from '@tauri-apps/api/path'
import {BaseDirectory, exists, mkdir, readTextFile, writeTextFile} from '@tauri-apps/plugin-fs'
import {useEffect, useState} from 'react'
import {toast} from 'sonner'
import {useProcesses} from './useProcesses'
import {useServiceMetrics} from './useServiceMetrics'
import {useServices} from './useServices'
import {useServicesStatus} from './useServicesStatus'

const isDev = import.meta.env.DEV
const settingsPath = isDev ? 'path_settings_dev.json' : 'path_settings.json'

export interface ServiceGroup {
  id: string
  name: string
  services: string[]
}

export interface AppSettings {
  servicesPath: string
  onServices: Record<string, boolean>
  favoriteServices?: Record<string, boolean>
  startServicesOnLaunch?: boolean
  serviceGroups?: ServiceGroup[]
}

function normalizeSettings(raw: Partial<AppSettings> & Record<string, any>): AppSettings {
  const onServices = {...(raw.onServices || {})}

  const legacyKeyMap: Record<string, string> = {
    'justo.main': 'services.justo-server',
    'justo.web': 'services.justo-web',
    'delivery.main': 'services.drivers-server',
    'delivery.web': 'services.drivers-web',
  }

  for (const [legacyKey, servicesKey] of Object.entries(legacyKeyMap)) {
    if (
      typeof onServices[legacyKey] === 'boolean' &&
      typeof onServices[servicesKey] !== 'boolean'
    ) {
      onServices[servicesKey] = onServices[legacyKey]
    }
  }

  return {
    servicesPath: raw.servicesPath || '',
    onServices,
    favoriteServices: raw.favoriteServices || {},
    startServicesOnLaunch: raw.startServicesOnLaunch,
    serviceGroups: raw.serviceGroups || [],
  }
}

export function useCreateSettingsContext() {
  const [isSaving, setIsSaving] = useState(false)
  const [loaded, setLoaded] = useState(false)

  const [settings, setSettings] = useState<AppSettings>({
    servicesPath: '',
    onServices: {},
    favoriteServices: {},
  })

  const services = useServices(settings)

  useEffect(() => {
    // Load saved settings when component mounts
    loadSettings()
  }, [])

  async function loadSettings() {
    try {
      const baseDirectoryExists = await exists('', {baseDir: BaseDirectory.AppConfig})

      if (!baseDirectoryExists) {
        await mkdir(`${await appConfigDir()}`)
      }

      // Check if settings file exists
      const settingsExists = await exists(settingsPath, {baseDir: BaseDirectory.AppConfig})

      if (settingsExists) {
        // Read and parse the settings file
        const settingsData = await readTextFile(settingsPath, {
          baseDir: BaseDirectory.AppConfig,
        })
        const parsedSettings = normalizeSettings(JSON.parse(settingsData))

        // If auto-start is disabled, reset all services to off in memory (disk keeps original values)
        if (parsedSettings.startServicesOnLaunch === false) {
          for (const key of Object.keys(parsedSettings.onServices)) {
            parsedSettings.onServices[key] = false
          }
        }

        setSettings(parsedSettings)
      } else {
        // Create the settings file with default values if it doesn't exist
        try {
          await writeTextFile(settingsPath, JSON.stringify(settings, null, 2), {
            baseDir: BaseDirectory.AppConfig,
          })
        } catch (writeError) {
          console.error('Failed to create settings file:', writeError)
          toast.error('Failed to create settings file', {
            description: `${writeError}`,
          })
        }
      }
    } catch (error) {
      console.error('Failed to load settings:', error)
      toast.error('Failed to load settings', {
        description: `${error}`,
      })
    }

    setLoaded(true)
  }

  async function saveSettings(settingsToSave?: AppSettings) {
    if (!settingsToSave) {
      settingsToSave = settings
    }
    try {
      setIsSaving(true)
      console.log('saving settings', settingsToSave)
      // Save settings to a JSON file in the app's config directory
      await writeTextFile(settingsPath, JSON.stringify(settingsToSave, null, 2), {
        baseDir: BaseDirectory.AppConfig,
      })
      setIsSaving(false)
    } catch (error) {
      console.error('Failed to save settings:', error)
      toast.error('Failed to save settings', {
        description: `${error}`,
      })
      setIsSaving(false)
    }
  }

  const setServiceOn = async (category: string, service: string, on: boolean) => {
    const serviceKey = `${category}.${service}`

    setSettings(prev => {
      const newSettings = {
        ...prev,
        onServices: {
          ...(prev.onServices || {}),
          [serviceKey]: on,
        },
      }
      saveSettings(newSettings)
      return newSettings
    })

    // Trigger service management only for the selected service.
    // This prevents stopping services started externally through `yarn dev5`.
    try {
      const targetService = services.servicesList.find(s => s.fullName === serviceKey)
      if (!targetService) {
        throw new Error(`Service not found in loaded services: ${serviceKey}`)
      }

      const rustServices = [
        {
          name: targetService.name,
          path: targetService.path,
          port: targetService.port,
          full_name: targetService.fullName,
          on,
          category: targetService.category,
          config: targetService.config,
          start_command: targetService.startCommand,
        },
      ]

      const actions = await invoke<string[]>('ensure_services_running', {
        services: rustServices,
      })

      console.log('Service management actions:', actions)

      if (actions.length > 0) {
        toast.success(actions.join('\n'))
      }
    } catch (error) {
      console.error('Failed to manage services:', error)
      toast.error('Failed to manage services', {
        description: `${error}`,
      })
    }
  }

  const toggleFavorite = (category: string, service: string) => {
    setSettings(prev => {
      const key = `${category}.${service}`
      const favorites = {...(prev.favoriteServices || {})}
      if (favorites[key]) {
        delete favorites[key]
      } else {
        favorites[key] = true
      }
      const newSettings = {...prev, favoriteServices: favorites}
      saveSettings(newSettings)
      return newSettings
    })
  }

  const addServiceGroup = (group: Omit<ServiceGroup, 'id'>) => {
    setSettings(prev => {
      const newGroup: ServiceGroup = {...group, id: generateId()}
      const newSettings = {...prev, serviceGroups: [...(prev.serviceGroups || []), newGroup]}
      saveSettings(newSettings)
      return newSettings
    })
  }

  const updateServiceGroup = (id: string, updates: Partial<Omit<ServiceGroup, 'id'>>) => {
    setSettings(prev => {
      const groups = (prev.serviceGroups || []).map(g => (g.id === id ? {...g, ...updates} : g))
      const newSettings = {...prev, serviceGroups: groups}
      saveSettings(newSettings)
      return newSettings
    })
  }

  const deleteServiceGroup = (id: string) => {
    setSettings(prev => {
      const groups = (prev.serviceGroups || []).filter(g => g.id !== id)
      const newSettings = {...prev, serviceGroups: groups}
      saveSettings(newSettings)
      return newSettings
    })
  }

  const status = useServicesStatus(services)
  const processes = useProcesses([...services.servicesList])
  const metrics = useServiceMetrics(settings.servicesPath)

  return {
    settings,
    setSettings,
    isSaving,
    saveSettings,
    services,
    setServiceOn,
    toggleFavorite,
    addServiceGroup,
    updateServiceGroup,
    deleteServiceGroup,
    status,
    processes,
    metrics,
    loaded: loaded && services.loaded,
  }
}
