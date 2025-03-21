import {useEffect, useState} from 'react'
import {AppSettings} from '../useSettings'
import {toast} from 'sonner'
import {getServicesInServices, getServicesInJusto, getServicesInDelivery} from './readServices'
import {prepareStart} from './prepareStart'

export interface ServiceData {
  name: string
  path: string
  port: number
  fullName: string
  on: boolean
  category: 'services' | 'justo' | 'delivery'
  config: Record<string, any>
  startCommand: string
}

export function useServices(settings: AppSettings) {
  const [loaded, setLoaded] = useState(false)
  const [servicesList, setServicesList] = useState<ServiceData[]>([])
  const [justoList, setJustoList] = useState<ServiceData[]>([])
  const [deliveryList, setDeliveryList] = useState<ServiceData[]>([])

  useEffect(() => {
    ;(async () => {
      console.log('checking services')
      const services = await getServicesInServices(settings)
      await prepareStart(services)
      setServicesList(services)
      const justo = await getServicesInJusto(settings)
      setJustoList(justo)
      const delivery = await getServicesInDelivery(settings)
      setDeliveryList(delivery)
    })()
      .then(() => setLoaded(true))
      .catch(error => {
        toast.error('Failed to load services:', {
          description: `${error}`,
        })
      })
  }, [settings])

  return {
    loaded,
    servicesList,
    justoList,
    deliveryList,
  }
}
