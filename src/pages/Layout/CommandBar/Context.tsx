import {createContext, useContext, useEffect, useState} from 'react'
import {fireEvent} from 'react-app-events'
import useDeepCompareEffect from 'use-deep-compare-effect'
import {CommandBarCommand, CommandBarInternalContextType, PromptOptions} from './types'
import generateId from '@/lib/generateId'
import {useMousetrap} from '@/hooks/mousetrap'

export const CommandBarInternalContext = createContext<CommandBarInternalContextType>(null)

export function useCommandBarContext() {
  return useContext(CommandBarInternalContext)
}

export function useCreateCommandBarContext(): CommandBarInternalContextType {
  const [open, setOpen] = useState(false)
  const [componentsDisablingHotkeys, setComponentsDisablingHotkeys] = useState(0)
  const [query, setQuery] = useState('')
  const [activeContext, setActiveContext] = useState('')
  const [commands, setCommands] = useState<CommandBarCommand[]>([])
  const [currentPrompt, setCurrentPrompt] = useState<PromptOptions>(null)

  useMousetrap({
    key: 'mod+k',
    callback: () => {
      setOpen(true)
      return false
    },
  })

  useEffect(() => {
    if (!open) {
      setTimeout(() => {
        try {
          setQuery('')
          setCurrentPrompt(null)
        } catch (error) {
          // Ignore
          alert(error.message)
        }
      }, 300)
    }
  }, [open])

  return {
    open,
    setOpen,
    query,
    setQuery,
    activeContext,
    setActiveContext,
    commands,
    setCommands,
    currentPrompt,
    setCurrentPrompt,
    hotkeysEnabled: componentsDisablingHotkeys === 0,
    setComponentsDisablingHotkeys,
    bottomBar: null,
  }
}

export function useSetCommandBarActiveContext(title: string) {
  const context = useCommandBarContext()

  useEffect(() => {
    if (!context) return
    context.setActiveContext(title)
    return () => {
      context.setActiveContext('')
    }
  }, [title])
}

export function useProvideCommand(command: CommandBarCommand) {
  useProvideCommands([command])
}

export function useDisableCommandBarHotkeys(omit?: boolean) {
  const context = useCommandBarContext()

  useEffect(() => {
    if (!context) return
    if (omit) return
    context.setComponentsDisablingHotkeys(prev => prev + 1)
    return () => {
      context.setComponentsDisablingHotkeys(prev => prev - 1)
    }
  }, [omit])
}

export function useProvideCommands(commands: CommandBarCommand[]) {
  const context = useCommandBarContext()
  const deps = commands.map(command => command.dependencies || [])

  useDeepCompareEffect(() => {
    if (!context) return

    const commandsWithIds: CommandBarCommand[] = commands.map(command => {
      return {
        ...command,
        __id: command.__id || generateId(),
      }
    })

    context.setCommands(prev => {
      return [...prev, ...commandsWithIds]
    })

    return () => {
      context.setCommands(prev => {
        return prev.filter(command => !commandsWithIds.includes(command))
      })
    }
  }, [deps])
}

export function useSetCommandBarPrompt() {
  const context = useCommandBarContext()

  return (options: PromptOptions) => {
    console.log('setting prompt', options)
    context.setOpen(true)
    context.setQuery(options.defaultQuery)
    context.setCurrentPrompt(options)
    if (options.defaultQuerySelected) {
      setTimeout(() => {
        fireEvent('commandBar.selectCurrentQuery', {})
      }, 10)
    }
  }
}
