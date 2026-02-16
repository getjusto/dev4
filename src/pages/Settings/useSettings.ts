import {useState, useEffect} from 'react'
import {exists, BaseDirectory, readTextFile, writeTextFile, mkdir} from '@tauri-apps/plugin-fs'
import {toast} from 'sonner'
import {appConfigDir} from '@tauri-apps/api/path'
import {invoke} from '@tauri-apps/api/core'
import {useServices} from './useServices'
import {useServicesStatus} from './useServicesStatus'
import {useProcesses} from './useProcesses'

const isDev = import.meta.env.DEV
const settingsPath = isDev ? 'path_settings_dev.json' : 'path_settings.json'

export interface AppSettings {
  servicesPath: string
  onServices: Record<string, boolean>
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
    if (typeof onServices[legacyKey] === 'boolean' && typeof onServices[servicesKey] !== 'boolean') {
      onServices[servicesKey] = onServices[legacyKey]
    }
  }

  return {
    servicesPath: raw.servicesPath || '',
    onServices,
  }
}

export function useCreateSettingsContext() {
  const [isSaving, setIsSaving] = useState(false)
  const [loaded, setLoaded] = useState(false)

  const [settings, setSettings] = useState<AppSettings>({
    servicesPath: '',
    onServices: {},
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
      const allServices = [
        ...services.servicesList,
      ]
      
      // Update the specific service's 'on' state in the list
      const updatedServices = allServices.map(s => {
        if (s.fullName === `${category}.${service}`) {
          return { ...s, on }
        }
        return s
      })
      
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

  const status = useServicesStatus(services)
  const processes = useProcesses([...services.servicesList])

  return {
    settings,
    setSettings,
    isSaving,
    saveSettings,
    services,
    setServiceOn,
    status,
    processes,
    loaded: loaded && services.loaded,
  }
}
