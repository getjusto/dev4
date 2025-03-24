import {warn, trace, info, error} from '@tauri-apps/plugin-log'

function forwardConsole(
  fnName: 'log' | 'debug' | 'info' | 'warn' | 'error',
  logger: (message: string) => Promise<void>,
) {
  const original = console[fnName]
  console[fnName] = (message, ...args) => {
    original(message, ...args)

    if (args.length > 0) {
      const argsString = args
        .map(arg => {
          if (typeof arg === 'string') {
            return arg
          }

          return JSON.stringify(arg)
        })
        .join(' ')
      logger(`${message} ${argsString}`)
    } else {
      logger(message)
    }
  }
}

forwardConsole('log', trace)
// forwardConsole('debug', debug)
forwardConsole('info', info)
forwardConsole('warn', warn)
forwardConsole('error', error)
