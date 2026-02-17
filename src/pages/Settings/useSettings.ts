import generateId from '@/lib/generateId'
import {invoke} from '@tauri-apps/api/core'
import {appConfigDir} from '@tauri-apps/api/path'
import {BaseDirectory, exists, mkdir, readTextFile, writeTextFile} from '@tauri-apps/plugin-fs'
import {useEffect, useRef, useState} from 'react'
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

  // Ref to track the latest onServices synchronously (avoids stale closures in setServiceOn)
  const onServicesRef = useRef(settings.onServices)

  // Keep ref in sync when settings load or change externally
  useEffect(() => {
    onServicesRef.current = settings.onServices
  }, [settings.onServices])

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
    // Update ref synchronously so rapid sequential calls see the latest state
    onServicesRef.current = {...onServicesRef.current, [`${category}.${service}`]: on}

    setSettings(prev => {
      const newSettings = {
        ...prev,
        onServices: {
          ...(prev.onServices || {}),
          [`${category}.${service}`]: on,
        },
      }
      saveSettings(newSettings)
      return newSettings
    })

    // Trigger service management to start/stop services as needed
    try {
      // Use the ref (not stale servicesList) to get the latest on/off state
      const updatedServices = services.servicesList.map(s => ({
        ...s,
        on: onServicesRef.current[s.fullName] ?? false,
      }))

      // Convert to Rust format
      const rustServices = updatedServices.map(service => ({
        name: service.name,
        path: service.path,
        port: service.port,
        full_name: service.fullName,
        on: service.on,
        category: service.category,
        config: service.config,
        start_command: service.startCommand,
      }))

      const actions = await invoke<string[]>('ensure_services_running', {
        services: rustServices,
      })

      console.log('Service management actions:', actions)

      if (actions.length > 0) {
        toast.success('Service management completed', {
          description: actions.join(', '),
        })
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
  const metrics = useServiceMetrics()

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
