import {useEffect, useRef} from 'react'
import {ServiceData} from '../useServices'
import {Command, Child} from '@tauri-apps/plugin-shell'
import {fireEvent} from 'react-app-events'

export function useProcesses(services: ServiceData[]) {
  const processes = useRef<Record<string, Child>>({}).current
  const commands = useRef<Record<string, Command<string>>>({}).current
  const outputs = useRef<Record<string, string>>({}).current

  const addContent = (service: ServiceData, content: string) => {
    outputs[service.fullName] = `${outputs[service.fullName] || ''}${content}`
    // strip to 1000 lines
    outputs[service.fullName] = outputs[service.fullName].split('\n').slice(-1000).join('\n')

    setTimeout(() => {
      fireEvent(`serviceOutput.${service.fullName}`, {})
    }, 100)
  }

  const startService = async (service: ServiceData) => {
    console.log(`starting ${service.fullName}`)
    if (processes[service.fullName]) {
      return
    }
    if (commands[service.fullName]) {
      return
    }
    const command = Command.create(service.startCommand, service.startCommand.split(' '), {
      cwd: service.path,
    })

    commands[service.fullName] = command

    command.stdout.on('data', data => {
      addContent(service, data)
    })
    command.stderr.on('data', data => {
      addContent(service, data)
    })

    command.on('close', data => {
      addContent(service, `command finished with code ${data.code} and signal ${data.signal}\n\n`)
    })
    command.on('error', error => {
      console.error(`command error: "${error}"`)
      addContent(service, `command error: "${error}"`)
    })

    const child = await command.spawn()

    processes[service.fullName] = child
  }

  const stopService = (service: ServiceData) => {
    console.log(`stopping ${service.fullName}`)
    if (!processes[service.fullName]) {
      return
    }

    outputs[service.fullName] = ''
    addContent(service, `Stopped ${service.fullName}\n\n`)

    processes[service.fullName].kill()
    delete processes[service.fullName]
    delete commands[service.fullName]
  }

  const ensureServicesRunning = async () => {
    for (const service of services) {
      if (service.on) {
        if (!processes[service.fullName]) {
          await startService(service)
        }
      }
      if (!service.on) {
        if (processes[service.fullName]) {
          stopService(service)
        }
      }
    }
  }

  useEffect(() => {
    ensureServicesRunning()
  }, [JSON.stringify(services)])

  useEffect(() => {
    return () => {
      for (const service of services) {
        stopService(service)
      }
    }
  }, [])

  return {
    processes,
    outputs,
    resetOutput: (service: ServiceData) => {
      outputs[service.fullName] = ''
      addContent(service, '')
    },
  }
}
