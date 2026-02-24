import {Command} from '@tauri-apps/plugin-shell'
import {Code, Cpu, MemoryStick, RotateCcw, Terminal, Trash} from 'lucide-react'
import {useState} from 'react'
import {useParams} from 'react-router-dom'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import {Button} from '@/components/ui/button'
import {openNativeTerminal} from '@/lib/openTerminal'
import {useProvideCommands} from '../Layout/CommandBar/Context'
import {useServiceData, useSettings} from '../Settings/Context'
import Logs from './Logs'

export default function Service() {
  const {serviceName, category} = useParams()
  const service = useServiceData(serviceName, category)
  const {setServiceOn, status: allStatus, processes, metrics} = useSettings()
  const [_tab, setTab] = useState<'logs'>('logs') // Only logs tab now
  const currentStatus = allStatus[`${category}.${serviceName}`] || 'off'

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
      title: 'Abrir terminal nativo',
      defaultScore: 2,
      action: async () => {
        try {
          await openNativeTerminal(service.path)
        } catch (error) {
          console.error('Failed to open native terminal:', error)
        }
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
      title: 'Reiniciar servicio',
      action: async () => {
        await setServiceOn(category, serviceName, false)
        await new Promise(resolve => setTimeout(resolve, 500))
        await setServiceOn(category, serviceName, true)
      },
      category: 'Servicio actual',
      dependencies: [serviceName],
      hotkeys: ['mod+r'],
    },
    {
      title: 'Abrir en cursor',
      action: async () => {
        console.log('[OpenCursor Command] Starting...', {path: service.path})
        try {
          // Try using the cursor CLI command directly via /bin/zsh (must use full path per shell scope)
          const result = await Command.create('/bin/zsh', [
            '-l',
            '-c',
            `cursor "${service.path}"`,
          ]).execute()
          console.log('[OpenCursor Command] cursor CLI result:', result)
        } catch (error) {
          console.error('[OpenCursor Command] cursor CLI failed:', error)
          // Fallback to open with bundle identifier
          try {
            console.log('[OpenCursor Command] Trying open -b (bundle id) fallback...')
            const fallbackResult = await Command.create('open', [
              '-b',
              'com.todesktop.230313mzl4w4u92',
              service.path,
            ]).execute()
            console.log('[OpenCursor Command] Fallback result:', fallbackResult)
          } catch (fallbackError) {
            console.error('[OpenCursor Command] Fallback method failed:', fallbackError)
          }
        }
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
        {metrics[`${category}.${serviceName}`] && (
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Cpu className="h-3 w-3" />
              {metrics[`${category}.${serviceName}`].cpu}%
            </span>
            <span className="flex items-center gap-1">
              <MemoryStick className="h-3 w-3" />
              {metrics[`${category}.${serviceName}`].memory_mb} MB
            </span>
          </div>
        )}
        <div className="flex-1" />
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            processes.resetOutput(service)
          }}
          title="Clear logs"
        >
          <Trash className="w-4 h-4" />
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={async () => {
            // Restart service by turning it off and then on again
            await setServiceOn(category, serviceName, false)
            // Small delay to ensure the service is fully stopped before restarting
            await new Promise(resolve => setTimeout(resolve, 500))
            await setServiceOn(category, serviceName, true)
          }}
          title="Restart service"
        >
          <RotateCcw className="w-4 h-4" />
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={async () => {
            console.log('[OpenCursor Button] Starting...', {path: service.path})
            try {
              // Try using the cursor CLI command directly via /bin/zsh (must use full path per shell scope)
              const result = await Command.create('/bin/zsh', [
                '-l',
                '-c',
                `cursor "${service.path}"`,
              ]).execute()
              console.log('[OpenCursor Button] cursor CLI result:', result)
            } catch (error) {
              console.error('[OpenCursor Button] cursor CLI failed:', error)
              // Fallback to open with bundle identifier
              try {
                console.log('[OpenCursor Button] Trying open -b (bundle id) fallback...')
                const fallbackResult = await Command.create('open', [
                  '-b',
                  'com.todesktop.230313mzl4w4u92',
                  service.path,
                ]).execute()
                console.log('[OpenCursor Button] Fallback result:', fallbackResult)
              } catch (fallbackError) {
                console.error('[OpenCursor Button] Fallback method failed:', fallbackError)
              }
            }
          }}
          title="Open in Cursor"
        >
          <Code className="w-4 h-4" />
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={async () => {
            try {
              await openNativeTerminal(service.path)
            } catch (error) {
              console.error('Failed to open native terminal:', error)
            }
          }}
          title="Open native terminal (Warp or Terminal)"
        >
          <Terminal className="w-4 h-4" />
        </Button>
      </div>

      {/* Only show Logs component since we removed the embedded terminal */}
      <Logs />
    </div>
  )
}
