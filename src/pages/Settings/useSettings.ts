import {invoke} from '@tauri-apps/api/core'
import {appConfigDir} from '@tauri-apps/api/path'
import {BaseDirectory, exists, mkdir, readTextFile, writeTextFile} from '@tauri-apps/plugin-fs'
import {useEffect, useState} from 'react'
import {toast} from 'sonner'
import generateId from '@/lib/generateId'
import {useProcesses} from './useProcesses'
import {useServiceMetrics} from './useServiceMetrics'
import {useServices} from './useServices'
import {useServicesStatus} from './useServicesStatus'

const isDev = import.meta.env.DEV
const pathSettingsFile = isDev ? 'path_settings_dev.json' : 'path_settings.json'

interface PathSettings {
  servicesPath: string
}

interface ProjectSettings {
  onServices: Record<string, boolean>
  favoriteServices?: Record<string, boolean>
  startServicesOnLaunch?: boolean
  serviceGroups?: ServiceGroup[]
}

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

function getProjectSettingsPath(servicesPath: string): string {
  return `${servicesPath}/.local/dev4/settings.json`
}

function normalizeOnServices(onServices: Record<string, boolean>): Record<string, boolean> {
  const result = {...onServices}

  const legacyKeyMap: Record<string, string> = {
    'justo.main': 'services.justo-server',
    'justo.web': 'services.justo-web',
    'delivery.main': 'services.drivers-server',
    'delivery.web': 'services.drivers-web',
  }

  for (const [legacyKey, servicesKey] of Object.entries(legacyKeyMap)) {
    if (typeof result[legacyKey] === 'boolean' && typeof result[servicesKey] !== 'boolean') {
      result[servicesKey] = result[legacyKey]
    }
  }

  return result
}

async function loadProjectSettings(servicesPath: string): Promise<ProjectSettings> {
  const defaults: ProjectSettings = {
    onServices: {},
    favoriteServices: {},
    serviceGroups: [],
  }

  if (!servicesPath) return defaults

  try {
    const path = getProjectSettingsPath(servicesPath)
    const fileExists = await exists(path)
    if (!fileExists) return defaults

    const data = await readTextFile(path)
    const parsed = JSON.parse(data) as Partial<ProjectSettings>
    return {
      onServices: parsed.onServices || {},
      favoriteServices: parsed.favoriteServices || {},
      startServicesOnLaunch: parsed.startServicesOnLaunch,
      serviceGroups: parsed.serviceGroups || [],
    }
  } catch (error) {
    console.error('Failed to load project settings:', error)
    return defaults
  }
}

async function saveProjectSettings(servicesPath: string, settings: ProjectSettings): Promise<void> {
  if (!servicesPath) return

  const dirPath = `${servicesPath}/.local/dev4`
  const dirExists = await exists(dirPath)
  if (!dirExists) {
    await mkdir(dirPath, {recursive: true})
  }

  await writeTextFile(getProjectSettingsPath(servicesPath), JSON.stringify(settings, null, 2))
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

      const pathFileExists = await exists(pathSettingsFile, {baseDir: BaseDirectory.AppConfig})

      if (pathFileExists) {
        const pathData = await readTextFile(pathSettingsFile, {
          baseDir: BaseDirectory.AppConfig,
        })
        const parsed = JSON.parse(pathData) as Partial<AppSettings>
        const servicesPath = parsed.servicesPath || ''

        // Load project settings from the services repo
        let projectSettings = await loadProjectSettings(servicesPath)

        // Migration: if old path_settings file has project keys and project file doesn't exist,
        // use old values as defaults
        const projectFileExists =
          servicesPath && (await exists(getProjectSettingsPath(servicesPath)))
        if (!projectFileExists && parsed.onServices) {
          projectSettings = {
            onServices: parsed.onServices || {},
            favoriteServices: parsed.favoriteServices || {},
            startServicesOnLaunch: parsed.startServicesOnLaunch,
            serviceGroups: parsed.serviceGroups || [],
          }
        }

        const onServices = normalizeOnServices(projectSettings.onServices)

        const mergedSettings: AppSettings = {
          servicesPath,
          onServices,
          favoriteServices: projectSettings.favoriteServices || {},
          startServicesOnLaunch: projectSettings.startServicesOnLaunch,
          serviceGroups: projectSettings.serviceGroups || [],
        }

        // If auto-start is disabled, reset all services to off in memory
        if (mergedSettings.startServicesOnLaunch === false) {
          for (const key of Object.keys(mergedSettings.onServices)) {
            mergedSettings.onServices[key] = false
          }
        }

        setSettings(mergedSettings)
      } else {
        // Create the path settings file with default values if it doesn't exist
        try {
          const defaultPathSettings: PathSettings = {servicesPath: ''}
          await writeTextFile(pathSettingsFile, JSON.stringify(defaultPathSettings, null, 2), {
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

      // Save only servicesPath to the app config dir
      const pathSettings: PathSettings = {servicesPath: settingsToSave.servicesPath}
      await writeTextFile(pathSettingsFile, JSON.stringify(pathSettings, null, 2), {
        baseDir: BaseDirectory.AppConfig,
      })

      // Save project settings to $servicesPath/.local/dev4/settings.json
      if (settingsToSave.servicesPath) {
        const projectSettings: ProjectSettings = {
          onServices: settingsToSave.onServices,
          favoriteServices: settingsToSave.favoriteServices,
          startServicesOnLaunch: settingsToSave.startServicesOnLaunch,
          serviceGroups: settingsToSave.serviceGroups,
        }
        await saveProjectSettings(settingsToSave.servicesPath, projectSettings)
      }

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

    try {
      const targetService = services.servicesList.find(s => s.fullName === serviceKey)
      if (!targetService) {
        throw new Error(`Service not found in loaded services: ${serviceKey}`)
      }

      const command = on ? 'dev5_start' : 'dev5_stop'
      toast.success(`./dev5 ${on ? 'start' : 'stop'} ${targetService.name}`)

      await invoke(command, {
        servicePath: targetService.path,
        names: [targetService.name],
      })
    } catch (error) {
      console.error('Failed to manage services:', error)
      toast.error('Failed to manage services', {
        description: `${error}`,
      })
    }
  }

  const stopAllServices = async () => {
    const onServices: Record<string, boolean> = {}
    for (const key of Object.keys(settings.onServices || {})) {
      onServices[key] = false
    }

    setSettings(prev => {
      const newSettings = {...prev, onServices}
      saveSettings(newSettings)
      return newSettings
    })

    try {
      const names = services.servicesList.map(s => s.name)
      if (names.length === 0) return

      const firstService = services.servicesList[0]
      toast.success(`./dev5 stop ${names.join(',')}`)

      await invoke('dev5_stop', {
        servicePath: firstService.path,
        names,
      })
    } catch (error) {
      console.error('Failed to stop all services:', error)
      toast.error('Failed to stop all services', {
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
    stopAllServices,
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
