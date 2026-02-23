import {useEffect, useRef} from 'react'
import {ServiceData} from '../useServices'
import {invoke} from '@tauri-apps/api/core'
import {fireEvent} from 'react-app-events'
import {WebviewWindow} from '@tauri-apps/api/webviewWindow'

export function useProcesses(services: ServiceData[]) {
  const outputs = useRef<Record<string, string>>({}).current

  const addContent = (service: ServiceData, content: string) => {
    outputs[service.fullName] = content
    setTimeout(() => {
      fireEvent(`serviceOutput.${service.fullName}`, {})
    }, 100)
  }

  const resetOutput = async (service: ServiceData) => {
    try {
      await invoke('clear_service_output', {
        serviceName: service.fullName,
        servicePath: service.path,
      })
      outputs[service.fullName] = ''
      addContent(service, '')
    } catch (error) {
      console.error('Failed to clear service output:', error)
    }
  }

  // Poll for service output updates
  useEffect(() => {
    const pollOutputs = async () => {
      for (const service of services) {
        try {
          const output = await invoke<string>('get_service_output', {
            serviceName: service.fullName,
            servicePath: service.path,
          })
          
          if (outputs[service.fullName] !== output) {
            outputs[service.fullName] = output
            fireEvent(`serviceOutput.${service.fullName}`, {})
          }
        } catch (error) {
          console.error(`Failed to get output for ${service.fullName}:`, error)
        }
      }
    }

    // Initial load
    pollOutputs()

    // Set up polling interval
    const interval = setInterval(pollOutputs, 1000) // Poll every second

    return () => {
      clearInterval(interval)
    }
  }, [JSON.stringify(services.map(s => s.fullName))])

  useEffect(() => {
    let unlisten: () => void
    WebviewWindow.getCurrent()
      .onCloseRequested(async event => {
        event.preventDefault()
        console.log('close requested')
        // Services are managed by dev5 in the background.
        setTimeout(() => {
          WebviewWindow.getCurrent().destroy()
        }, 500)
      })
      .then(un => {
        unlisten = un
      })

    return () => {
      unlisten?.()
    }
  }, [])

  return {
    processes: {}, // No longer tracking processes in frontend
    outputs,
    resetOutput,
  }
}
