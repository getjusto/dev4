import {FitAddon} from '@xterm/addon-fit'
import {Terminal as XTerm} from '@xterm/xterm'
import {X} from 'lucide-react'
import {useTheme} from 'next-themes'
import {useEffect, useRef} from 'react'
import '@xterm/xterm/css/xterm.css'
import {getOrCreateSession} from './ptysessions'

const lightTheme = {
  background: '#ffffff',
  foreground: '#1e1e1e',
  cursor: '#1e1e1e',
  selectionBackground: '#add6ff',
  black: '#1e1e1e',
  red: '#cd3131',
  green: '#00bc7c',
  yellow: '#949800',
  blue: '#0451a5',
  magenta: '#bc05bc',
  cyan: '#0598bc',
  white: '#555555',
  brightBlack: '#666666',
  brightRed: '#cd3131',
  brightGreen: '#14ce14',
  brightYellow: '#b5ba00',
  brightBlue: '#0451a5',
  brightMagenta: '#bc05bc',
  brightCyan: '#0598bc',
  brightWhite: '#a5a5a5',
}

const darkTheme = {
  background: '#1e1e1e',
  foreground: '#d4d4d4',
  cursor: '#d4d4d4',
  selectionBackground: '#264f78',
  black: '#1e1e1e',
  red: '#f44747',
  green: '#6a9955',
  yellow: '#d7ba7d',
  blue: '#569cd6',
  magenta: '#c586c0',
  cyan: '#4ec9b0',
  white: '#d4d4d4',
  brightBlack: '#808080',
  brightRed: '#f44747',
  brightGreen: '#6a9955',
  brightYellow: '#d7ba7d',
  brightBlue: '#569cd6',
  brightMagenta: '#c586c0',
  brightCyan: '#4ec9b0',
  brightWhite: '#e8e8e8',
}

interface Props {
  sessionKey: string
  cwd: string
  onClose: () => void
}

export default function Terminal({sessionKey, cwd, onClose}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const xtermRef = useRef<XTerm | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)
  const {resolvedTheme} = useTheme()
  const isDark = resolvedTheme === 'dark'

  useEffect(() => {
    if (xtermRef.current) {
      xtermRef.current.options.theme = isDark ? darkTheme : lightTheme
    }
  }, [isDark])

  useEffect(() => {
    if (!containerRef.current) return

    const theme = isDark ? darkTheme : lightTheme

    const xterm = new XTerm({
      cursorBlink: true,
      fontSize: 13,
      fontFamily: '"Fira Code", "SF Mono", Menlo, Monaco, "Courier New", monospace',
      theme,
      allowProposedApi: true,
      scrollback: 5000,
    })

    const fitAddon = new FitAddon()
    xterm.loadAddon(fitAddon)
    xterm.open(containerRef.current)

    requestAnimationFrame(() => {
      fitAddon.fit()
    })

    xtermRef.current = xterm
    fitAddonRef.current = fitAddon

    const session = getOrCreateSession(sessionKey, cwd, xterm.cols, xterm.rows)

    // Replay buffered output from previous views
    for (const chunk of session.buffer) {
      xterm.write(chunk)
    }

    // Connect live output forwarding
    session.writeToXterm = (text: string) => xterm.write(text)

    // Keyboard input -> PTY
    const inputListener = xterm.onData((data: string) => {
      session.pty.write(data)
    })

    // PTY exit -> close panel
    const exitListener = session.pty.onExit(() => {
      onClose()
    })

    // Resize PTY when container resizes
    const observer = new ResizeObserver(() => {
      requestAnimationFrame(() => {
        if (fitAddonRef.current && xtermRef.current) {
          fitAddonRef.current.fit()
          session.pty.resize(xtermRef.current.cols, xtermRef.current.rows)
        }
      })
    })
    observer.observe(containerRef.current)

    // Let CMD+J close the terminal (only on keydown)
    xterm.attachCustomKeyEventHandler((event: KeyboardEvent) => {
      if (event.type === 'keydown' && (event.metaKey || event.ctrlKey) && event.key === 'j') {
        event.preventDefault()
        onClose()
        return false
      }
      return true
    })

    xterm.focus()

    return () => {
      observer.disconnect()
      session.writeToXterm = null
      inputListener.dispose()
      exitListener.dispose()
      xterm.dispose()
      xtermRef.current = null
      fitAddonRef.current = null
    }
  }, [sessionKey, cwd])

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-1 bg-muted/50 border-b border-border">
        <span className="text-xs text-muted-foreground font-medium">Terminal</span>
        <button
          type="button"
          onClick={onClose}
          className="p-0.5 rounded hover:bg-muted-foreground/20 text-muted-foreground"
          title="Close terminal (⌘J)"
        >
          <X size={14} />
        </button>
      </div>
      <div className="flex-1 min-h-0 overflow-hidden p-2">
        <div ref={containerRef} className="h-full w-full" />
      </div>
    </div>
  )
}
