import {useParams} from 'react-router-dom'
import {useState} from 'react'
import {Tabs, TabsList, TabsTrigger} from '@/components/ui/tabs'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import {useServiceData, useSettings} from '../Settings/Context'
import {Switch} from '@/components/ui/switch'
import Logs from './Logs'
import Terminal from './Terminal'

export default function Service() {
  const {setServiceOn} = useSettings()
  const {serviceName, category} = useParams()
  const service = useServiceData(serviceName, category)
  const [tab, setTab] = useState<'logs' | 'terminal'>('logs')

  if (!service) {
    return <div>Service not found</div>
  }

  return (
    <div className="flex flex-col overflow-hidden h-full" key={`${category}.${serviceName}`}>
      <div
        className="flex justify-between items-center space-x-4 p-5 bg-sidebar"
        data-tauri-drag-region
      >
        <Switch
          checked={service.on}
          onCheckedChange={(checked: boolean) => setServiceOn(category, serviceName, checked)}
        />
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbPage>{category}</BreadcrumbPage>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{serviceName}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <div className="flex-1" />

        <Tabs
          className=""
          onValueChange={(newTab: 'logs' | 'terminal') => setTab(newTab)}
          value={tab}
        >
          <TabsList>
            <TabsTrigger value="logs">Logs</TabsTrigger>
            <TabsTrigger value="terminal">Terminal</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      {tab === 'logs' && <Logs />}
      {tab === 'terminal' && <Terminal />}
    </div>
  )
}
