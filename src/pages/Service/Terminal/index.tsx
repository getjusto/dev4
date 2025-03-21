import {useEffect, useRef} from 'react'
import {Terminal as XTerm} from '@xterm/xterm'
import {spawn} from 'tauri-pty'
import '@xterm/xterm/css/xterm.css'
import {FitAddon} from '@xterm/addon-fit'
import {platform} from '@tauri-apps/plugin-os'
import {useServiceData} from '@/pages/Settings/Context'
import {useParams} from 'react-router-dom'
import {WebLinksAddon} from '@xterm/addon-web-links'

export default function Terminal() {
  const {serviceName, category} = useParams()
  const service = useServiceData(serviceName, category)
  const terminalRef = useRef<HTMLDivElement>(null)
  const xtermRef = useRef<XTerm | null>(null)
  const ptyRef = useRef<any>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)

  useEffect(() => {
    if (!terminalRef.current) return

    // Initialize xterm.js
    const term = new XTerm({
      convertEol: true,
      cursorBlink: true,
      fontFamily: 'FiraCode Nerd Font',
      fontSize: 14,
      theme: {
        background: '#000000',
        foreground: '#ffffff',
      },
    })

    // Create the fit addon to auto-resize terminal
    const fitAddon = new FitAddon()
    term.loadAddon(fitAddon)

    const webLinksAddon = new WebLinksAddon()
    term.loadAddon(webLinksAddon)

    // Open the terminal in the container
    term.open(terminalRef.current)
    fitAddon.fit()

    // Determine which shell to use based on OS
    const shellCommand = getDefaultShell()

    // Spawn the terminal process
    const pty = spawn(shellCommand.command, shellCommand.args, {
      cols: term.cols,
      rows: term.rows,
      cwd: service.path,
    })

    // Make sure terminal is properly sized
    setTimeout(() => {
      fitAddon.fit()
      console.log('Terminal dimensions:', {cols: term.cols, rows: term.rows})
    }, 100)

    // Set up data transport between the terminal and the process
    pty.onData((data: string) => {
      term.write(data)
    })

    term.onData((data: string) => {
      pty.write(data)
    })

    // Handle terminal resize
    term.onResize(({cols, rows}) => {
      pty.resize(cols, rows)
    })

    // Resize handler for window
    const handleResize = () => {
      fitAddon.fit()
    }

    window.addEventListener('resize', handleResize)

    // Store references
    xtermRef.current = term
    ptyRef.current = pty
    fitAddonRef.current = fitAddon

    return () => {
      // Clean up
      window.removeEventListener('resize', handleResize)
      term.dispose()
      pty.kill()
    }
  }, [])

  return (
    <div className="h-full w-full flex flex-col">
      <div
        ref={terminalRef}
        className="flex-1 min-h-0 w-full"
        style={{height: 'calc(100vh - 64px)'}}
      />
    </div>
  )
}

// Helper function to determine default shell based on operating system
function getDefaultShell() {
  const name = platform()

  if (name.includes('win')) {
    return {command: 'powershell.exe', args: []}
  }

  if (name.includes('mac')) {
    return {command: '/bin/zsh', args: []}
  }

  // Linux or other Unix-like systems
  return {command: '/bin/bash', args: []}
}
