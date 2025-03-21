import {useEffect, useRef} from 'react'
import {ServiceData} from '../useServices'
import {Command, Child} from '@tauri-apps/plugin-shell'
import {fireEvent} from 'react-app-events'

export function useProcesses(services: ServiceData[]) {
  const processes = useRef<Record<string, Child>>({}).current
  const commands = useRef<Record<string, Command<string>>>({}).current
  const outputs = useRef<Record<string, string>>({}).current

  const addContent = (service: ServiceData, content: string) => {
    outputs[`${service.category}.${service.name}`] =
      `${outputs[`${service.category}.${service.name}`] || ''}${content}`
    // strip to 10000 lines
    outputs[`${service.category}.${service.name}`] = outputs[`${service.category}.${service.name}`]
      .split('\n')
      .slice(-10000)
      .join('\n')

    setTimeout(() => {
      fireEvent(`serviceOutput.${service.name}.${service.category}`, {})
    }, 100)
  }

  const startService = async (service: ServiceData) => {
    console.log(`starting ${service.name}`)
    if (processes[service.name]) {
      return
    }
    if (commands[`${service.category}.${service.name}`]) {
      return
    }
    const command = Command.create(service.startCommand, service.startCommand.split(' '), {
      cwd: service.path,
    })

    commands[`${service.category}.${service.name}`] = command

    command.stdout.on('data', data => {
      addContent(service, data)
    })
    command.stderr.on('data', data => {
      addContent(service, data)
    })

    command.on('close', data => {
      console.log(`command finished with code ${data.code} and signal ${data.signal}`)
      addContent(service, `command finished with code ${data.code} and signal ${data.signal}`)
    })
    command.on('error', error => {
      console.error(`command error: "${error}"`)
      addContent(service, `command error: "${error}"`)
    })

    const child = await command.spawn()

    processes[service.name] = child
  }

  const stopService = (service: ServiceData) => {
    console.log(`stopping ${service.name}`)
    if (!processes[service.name]) {
      return
    }

    outputs[`${service.category}.${service.name}`] = ''
    addContent(service, `Stopped ${service.name}\n\n`)

    processes[service.name].kill()
    delete processes[service.name]
    delete commands[`${service.category}.${service.name}`]
  }

  const ensureServicesRunning = async () => {
    for (const service of services) {
      if (service.on) {
        if (!processes[service.name]) {
          await startService(service)
        }
      }
      if (!service.on) {
        if (processes[service.name]) {
          stopService(service)
        }
      }
    }
  }

  useEffect(() => {
    ensureServicesRunning()
  }, [JSON.stringify(services)])

  return {
    processes,
    outputs,
  }
}
