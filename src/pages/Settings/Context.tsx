import {createContext, useContext} from 'react'
import {useCreateSettingsContext} from './useSettings'

export const SettingsContext = createContext<ReturnType<typeof useCreateSettingsContext>>(null)

export function useSettings() {
  const context = useContext(SettingsContext)
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider')
  }
  return context
}

export function useServiceData(serviceName: string, category: string) {
  const {services} = useSettings()
  const categoryServices = (() => {
    if (category === 'services') return services.servicesList
    if (category === 'justo') return services.justoList
    if (category === 'delivery') return services.deliveryList
    return []
  })()

  const service = categoryServices.find(service => service.name === serviceName)
  return service
}
