import {readDir, readTextFile} from '@tauri-apps/plugin-fs'
import {ServiceData} from '.'
import YAML from 'yaml'
import {AppSettings} from '../useSettings'

export async function getServicesInServices(settings: AppSettings) {
  if (!settings.servicesPath) return []
  const dirs = await readDir(`${settings.servicesPath}/services`)
  const services = await Promise.all(
    dirs.map(async serviceDirName => {
      if (!serviceDirName.isDirectory) return null
      try {
        const basePath = `${settings.servicesPath}/services/${serviceDirName.name}`
        const infoText = await readTextFile(`${basePath}/.run.local.yaml`)
        const info = YAML.parse(infoText)
        return {
          config: info,
          name: serviceDirName.name,
          path: `${basePath}`,
          on: settings.onServices?.[`services.${serviceDirName.name}`] || false,
          startCommand: 'sh .start.run.sh',
          port: info.port,
          category: 'services',
        } as ServiceData
      } catch (_error) {
        // console.error(`Error reading service ${serviceDirName.name}:`, error)
        return null
      }
    }),
  )

  return services.filter(Boolean).sort((a: ServiceData, b: ServiceData) => {
    if (a.name < b.name) {
      return -1
    }
    if (a.name > b.name) {
      return 1
    }
    return 0
  })
}

export async function getServicesInJusto(settings: AppSettings): Promise<ServiceData[]> {
  if (!settings.justoPath) return []

  return [
    {
      name: 'main',
      config: {},
      path: `${settings.justoPath}/server`,
      on: settings.onServices?.['justo.main'] || false,
      port: 3000,
      category: 'justo',
      startCommand: 'sh start.sh',
    },
    {
      name: 'web',
      config: {},
      path: `${settings.justoPath}/web`,
      on: settings.onServices?.['justo.web'] || false,
      port: 3010,
      category: 'justo',
      startCommand: 'yarn start',
    },
  ]
}

export async function getServicesInDelivery(settings: AppSettings): Promise<ServiceData[]> {
  if (!settings.deliveryPath) return []

  return [
    {
      name: 'main',
      category: 'delivery',
      config: {},
      path: `${settings.deliveryPath}/server`,
      on: settings.onServices?.['delivery.main'] || false,
      port: 3410,
      startCommand: 'sh start.sh',
    },
    {
      name: 'web',
      category: 'delivery',
      config: {},
      path: `${settings.deliveryPath}/web`,
      on: settings.onServices?.['delivery.web'] || false,
      port: 3420,
      startCommand: 'yarn start',
    },
  ]
}
