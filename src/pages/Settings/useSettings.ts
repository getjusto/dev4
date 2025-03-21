import {useState, useEffect} from 'react'
import {exists, BaseDirectory, readTextFile, writeTextFile, mkdir} from '@tauri-apps/plugin-fs'
import {toast} from 'sonner'
import {appConfigDir} from '@tauri-apps/api/path'
import {useServices} from './useServices'
import {useServicesStatus} from './useServicesStatus'
import {useProcesses} from './useProcesses'
export interface AppSettings {
  servicesPath: string
  justoPath: string
  deliveryPath: string
  onServices: Record<string, boolean>
}

export function useCreateSettingsContext() {
  const [isSaving, setIsSaving] = useState(false)
  const [loaded, setLoaded] = useState(false)

  const [settings, setSettings] = useState<AppSettings>({
    servicesPath: '',
    justoPath: '',
    deliveryPath: '',
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
      const settingsExists = await exists('path_settings.json', {baseDir: BaseDirectory.AppConfig})

      if (settingsExists) {
        // Read and parse the settings file
        const settingsData = await readTextFile('path_settings.json', {
          baseDir: BaseDirectory.AppConfig,
        })
        const parsedSettings = JSON.parse(settingsData) as AppSettings
        setSettings(parsedSettings)
      } else {
        // Create the settings file with default values if it doesn't exist
        try {
          await writeTextFile('path_settings.json', JSON.stringify(settings, null, 2), {
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
      await writeTextFile('path_settings.json', JSON.stringify(settingsToSave, null, 2), {
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
  }

  const status = useServicesStatus(services)
  const processes = useProcesses([
    ...services.deliveryList,
    ...services.justoList,
    ...services.servicesList,
  ])

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
