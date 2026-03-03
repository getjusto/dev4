import type {IPty} from 'tauri-pty'
import {spawn} from 'tauri-pty'

export interface PtySession {
  pty: IPty
  buffer: string[]
  writeToXterm: ((data: string) => void) | null
}

const sessions = new Map<string, PtySession>()

export function getOrCreateSession(
  key: string,
  cwd: string,
  cols: number,
  rows: number,
): PtySession {
  const existing = sessions.get(key)
  if (existing) return existing

  const pty = spawn('/bin/zsh', ['-l'], {cols, rows, cwd})
  const session: PtySession = {
    pty,
    buffer: [],
    writeToXterm: null,
  }

  // Single listener: buffers all output and optionally forwards to xterm
  pty.onData((data: Uint8Array | number[] | string) => {
    let text: string
    if (typeof data === 'string') {
      text = data
    } else if (data instanceof Uint8Array) {
      text = new TextDecoder().decode(data)
    } else if (Array.isArray(data)) {
      text = new TextDecoder().decode(new Uint8Array(data))
    } else {
      return
    }
    session.buffer.push(text)
    try {
      session.writeToXterm?.(text)
    } catch {
      // Prevent xterm errors from killing the PTY read loop
    }
  })

  pty.onExit(() => {
    sessions.delete(key)
  })

  sessions.set(key, session)
  return session
}

export function killAllSessions(): void {
  for (const [, session] of sessions) {
    session.pty.kill()
  }
  sessions.clear()
}
