import {Command} from '@tauri-apps/plugin-shell'
import {Code, Cpu, MemoryStick, RotateCcw, Terminal as TerminalIcon, Trash} from 'lucide-react'
import {type MouseEvent as ReactMouseEvent, useCallback, useRef, useState} from 'react'
import {useParams} from 'react-router-dom'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import {Button} from '@/components/ui/button'
import {useProvideCommands} from '../Layout/CommandBar/Context'
import {useServiceData, useSettings} from '../Settings/Context'
import Logs from './Logs'
import Terminal from './Terminal'

export default function Service() {
  const {serviceName, category} = useParams()
  const service = useServiceData(serviceName, category)
  const {setServiceOn, status: allStatus, processes, metrics} = useSettings()
  const [_tab, setTab] = useState<'logs'>('logs') // Only logs tab now
  const terminalOpenMap = useRef<Record<string, boolean>>({})
  const serviceKey = `${category}.${serviceName}`
  const terminalOpen = terminalOpenMap.current[serviceKey] ?? false
  const [, forceRender] = useState(0)
  const setTerminalOpen = useCallback(
    (value: boolean | ((prev: boolean) => boolean)) => {
      const current = terminalOpenMap.current[serviceKey] ?? false
      const next = typeof value === 'function' ? value(current) : value
      terminalOpenMap.current[serviceKey] = next
      forceRender(n => n + 1)
    },
    [serviceKey],
  )
  const terminalEverOpenedMap = useRef<Record<string, boolean>>({})
  const terminalEverOpened = terminalEverOpenedMap.current[serviceKey] ?? false
  if (terminalOpen && !terminalEverOpened) {
    terminalEverOpenedMap.current[serviceKey] = true
  }
  const terminalHeightMap = useRef<Record<string, number>>({})
  const terminalHeight = terminalHeightMap.current[serviceKey] ?? 250
  const [isDragging, setIsDragging] = useState(false)

  const handleDragStart = useCallback(
    (e: ReactMouseEvent) => {
      e.preventDefault()
      setIsDragging(true)
      const startY = e.clientY
      const startHeight = terminalHeightMap.current[serviceKey] ?? 250

      const onMouseMove = (ev: globalThis.MouseEvent) => {
        const newHeight = Math.max(
          100,
          Math.min(startHeight + (startY - ev.clientY), window.innerHeight - 200),
        )
        terminalHeightMap.current[serviceKey] = newHeight
        forceRender(n => n + 1)
      }

      const onMouseUp = () => {
        setIsDragging(false)
        document.removeEventListener('mousemove', onMouseMove)
        document.removeEventListener('mouseup', onMouseUp)
      }

      document.addEventListener('mousemove', onMouseMove)
      document.addEventListener('mouseup', onMouseUp)
    },
    [serviceKey],
  )

  const currentStatus = allStatus[`${category}.${serviceName}`] || 'off'

  useProvideCommands([
    {
      title: 'Ver logs',
      action: () => {
        setTab('logs')
      },
      defaultScore: 2,
      category: 'Current service',
      dependencies: [serviceName],
      hotkeys: ['mod+1'],
    },
    {
      title: 'Toggle terminal',
      defaultScore: 2,
      action: () => {
        setTerminalOpen(prev => !prev)
      },
      category: 'Current service',
      dependencies: [serviceName],
      hotkeys: ['mod+2'],
    },
    {
      title: currentStatus === 'off' ? 'Start service' : 'Stop service',
      action: () => {
        setServiceOn(category, serviceName, currentStatus === 'off')
      },
      category: 'Current service',
      dependencies: [serviceName, currentStatus],
      hotkeys: ['mod+o'],
    },
    {
      title: 'Restart service',
      action: async () => {
        await setServiceOn(category, serviceName, false)
        await new Promise(resolve => setTimeout(resolve, 500))
        await setServiceOn(category, serviceName, true)
      },
      category: 'Current service',
      dependencies: [serviceName],
      hotkeys: ['mod+r'],
    },
    {
      title: terminalOpen ? 'Close embedded terminal' : 'Open embedded terminal',
      action: () => {
        setTerminalOpen(prev => !prev)
      },
      defaultScore: 2,
      category: 'Current service',
      dependencies: [serviceName, terminalOpen],
      hotkeys: ['mod+j'],
    },
    {
      title: 'Open in Cursor',
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
      category: 'Current service',
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
        className="flex justify-between items-center space-x-2 p-5 bg-muted/50"
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
          onClick={() => setTerminalOpen(prev => !prev)}
          title="Toggle terminal (⌘J)"
        >
          <TerminalIcon className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden">
        <Logs />
      </div>
      <div
        className={`overflow-hidden ${isDragging ? '' : 'transition-[height] duration-200 ease-in-out'}`}
        style={{height: terminalOpen ? terminalHeight : 0}}
      >
        {terminalOpen && (
          <div
            role="separator"
            aria-valuenow={terminalHeight}
            className="h-[4px] cursor-row-resize bg-border hover:bg-primary/30 active:bg-primary/40"
            onMouseDown={handleDragStart}
          />
        )}
        {terminalEverOpened && (
          <div style={{height: terminalOpen ? terminalHeight - 4 : 0}} className="overflow-hidden">
            <Terminal
              sessionKey={serviceKey}
              cwd={service.path}
              onClose={() => setTerminalOpen(false)}
            />
          </div>
        )}
      </div>
    </div>
  )
}
