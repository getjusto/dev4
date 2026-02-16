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
  const categoryServices = category === 'services' ? services.servicesList : []

  const service = categoryServices.find(service => service.name === serviceName)
  return service
}
