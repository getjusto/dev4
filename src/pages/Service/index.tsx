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
import Logs from './Logs'
import Terminal from './Terminal'
import {Button} from '@/components/ui/button'
import {Code, Trash} from 'lucide-react'
import {cn} from '@/lib/utils'
import {Command} from '@tauri-apps/plugin-shell'
import {useProvideCommands} from '../Layout/CommandBar/Context'

export default function Service() {
  const {processes, setServiceOn, status: allStatus} = useSettings()
  const {serviceName, category} = useParams()
  const service = useServiceData(serviceName, category)
  const [tab, setTab] = useState<'logs' | 'terminal'>('logs')
  const currentStatus = allStatus[`${category}.${serviceName}`]

  useProvideCommands([
    {
      title: 'Ver logs',
      action: () => {
        setTab('logs')
      },
      defaultScore: 2,
      category: 'Servicio actual',
      dependencies: [serviceName],
      hotkeys: ['mod+1'],
    },
    {
      title: 'Abrir terminal',
      defaultScore: 2,
      action: () => {
        setTab('terminal')
      },
      category: 'Servicio actual',
      dependencies: [serviceName],
      hotkeys: ['mod+2'],
    },
    {
      title: currentStatus === 'off' ? 'Prender servicio' : 'Apagar servicio',
      action: () => {
        setServiceOn(category, serviceName, currentStatus === 'off')
      },
      category: 'Servicio actual',
      dependencies: [serviceName, currentStatus],
      hotkeys: ['mod+o'],
    },
    {
      title: 'Abrir en cursor',
      action: async () => {
        await Command.create('/bin/zsh', ['-l', '-c', 'cursor .'], {
          cwd: service.path,
        }).execute()
      },
      category: 'Servicio actual',
      dependencies: [serviceName],
      hotkeys: ['mod+p'],
    },
  ])

  if (!service) {
    return <div>Service not found</div>
  }

  return (
    <div className="flex flex-col overflow-hidden h-full" key={`${category}.${serviceName}`}>
      <div
        className="flex justify-between items-center space-x-2 p-5 bg-sidebar"
        data-tauri-drag-region
      >
        {/* <Switch
          checked={service.on}
          onCheckedChange={(checked: boolean) => setServiceOn(category, serviceName, checked)}
        /> */}
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
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            processes.resetOutput(service)
          }}
        >
          <Trash className="w-4 h-4" />
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={async () => {
            await Command.create('/bin/zsh', ['-l', '-c', 'cursor .'], {
              cwd: service.path,
            }).execute()
          }}
        >
          <Code className="w-4 h-4" />
        </Button>

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
      <Logs
        className={cn({
          '': tab === 'logs',
          hidden: tab !== 'logs',
        })}
      />
      <Terminal hidden={tab !== 'terminal'} />
    </div>
  )
}
