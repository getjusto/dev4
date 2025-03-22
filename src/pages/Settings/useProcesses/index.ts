import {useEffect, useRef} from 'react'
import {ServiceData} from '../useServices'
import {Command, Child} from '@tauri-apps/plugin-shell'
import {fireEvent} from 'react-app-events'
import {WebviewWindow} from '@tauri-apps/api/webviewWindow'

export function useProcesses(services: ServiceData[]) {
  const processes = useRef<Record<string, Child>>({}).current
  const outputs = useRef<Record<string, string>>({}).current

  const addContent = (service: ServiceData, content: string) => {
    outputs[service.fullName] = `${outputs[service.fullName] || ''}${content}`
    // strip to 1000 lines
    outputs[service.fullName] = outputs[service.fullName].split('\n').slice(-1000).join('\n')

    setTimeout(() => {
      fireEvent(`serviceOutput.${service.fullName}`, {})
    }, 100)
  }

  const resetOutput = (service: ServiceData) => {
    outputs[service.fullName] = ''
    addContent(service, '')
  }

  const startService = async (service: ServiceData) => {
    if (processes[service.fullName]) {
      return
    }

    console.log(`starting ${service.fullName}`)
    resetOutput(service)

    const commands = ['-l', '-c', `${service.startCommand}`]
    console.log('commands', commands.join(' '))
    const command = Command.create('/bin/zsh', commands, {
      cwd: service.path,
    })

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

    processes[service.fullName] = await command.spawn()
    console.log(`started ${service.fullName}`, {pid: processes[service.fullName].pid})
  }

  const stopService = async (service: ServiceData) => {
    try {
      if (!processes[service.fullName]) {
        return
      }

      console.log(`stopping ${service.fullName}`)

      const pid = processes[service.fullName].pid
      const {stdout: processList} = await Command.create('ps', [
        '-axco',
        'pid,ppid,command',
      ]).execute()
      const processListArray = processList.split('\n').map(line => {
        const [pid, ppid, command] = line.split(' ')
        return {pid: Number(pid), ppid: Number(ppid), command}
      })
      const getChildrenTree = (pid: number) => {
        return [
          ...processListArray.filter(line => line.ppid === pid).map(p => p.pid),
          ...processListArray
            .filter(line => line.ppid === pid)
            .flatMap(child => getChildrenTree(child.pid))
            .filter(Boolean),
        ]
      }

      const childrenPids = getChildrenTree(pid)

      console.log(`stopping ${service.fullName}`, {
        pid,
        children: childrenPids,
      })

      const killResult = await Command.create('kill-process', ['-9', pid.toString()]).execute()
      console.log('killResult', {killResult, pid})

      for (const childPid of childrenPids) {
        const killResult = await Command.create('kill-process', [
          '-9',
          childPid.toString(),
        ]).execute()
        console.log('killResult', {killResult, childPid, pid})
      }

      // await processes[service.fullName].kill()
      resetOutput(service)
      console.log(`stopped ${service.fullName}`)

      delete processes[service.fullName]
    } catch (error) {
      console.error(`error stopping ${service.fullName}:`, error)
    }
  }

  const ensureServicesRunning = async () => {
    for (const service of services) {
      if (service.on) {
        await startService(service)
      }
      if (!service.on) {
        await stopService(service)
      }
    }
  }

  useEffect(() => {
    ensureServicesRunning()

    let unlisten: () => void
    WebviewWindow.getCurrent()
      .onCloseRequested(async event => {
        event.preventDefault()
        console.log('close requested')
        for (const service of services) {
          console.log('stopping service', service.fullName)
          await stopService(service)
        }
        setTimeout(() => {
          WebviewWindow.getCurrent().destroy()
        }, 500)
      })
      .then(un => {
        unlisten = un
      })

    // you need to call unlisten if your handler goes out of scope e.g. the component is unmounted

    return () => {
      unlisten?.()
    }
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
    resetOutput,
  }
}
