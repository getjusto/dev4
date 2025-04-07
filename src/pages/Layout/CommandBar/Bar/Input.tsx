import {useCommandState} from 'cmdk'
import {useEffect, useRef} from 'react'
import {useOnEvent} from 'react-app-events'
import {useCommandBarContext} from '../Context'
import {CommandBarCategory} from '../types'
import {CommandInput} from '@/components/ui/command'

export interface Props {
  categories: CommandBarCategory[]
  loadingCommands: boolean
}

function getCommand(categories: CommandBarCategory[], index: number) {
  let i = 0
  for (const category of categories) {
    for (const command of category.commands) {
      if (i === index) {
        return command
      }
      i++
    }
  }
  return null
}

export default function Input(props: Props) {
  const context = useCommandBarContext()
  const input = useRef<HTMLInputElement>()
  const selectedItemId = useCommandState(state => state.selectedItemId)
  const getSelectedCommand = () => {
    const element = document.getElementById(selectedItemId)
    if (!element) return getCommand(props.categories, 0)
    if (!element.dataset.commandIndex) return getCommand(props.categories, 0)
    return getCommand(props.categories, Number.parseInt(element.dataset.commandIndex))
  }

  useOnEvent('commandBar.selectCurrentQuery', () => {
    input?.current?.select()
  })

  useEffect(() => {
    if (!context.open) return
    // if the input is not focused, focus it
    input?.current?.focus()
    setTimeout(() => {
      input?.current?.select()
    }, 100)
  }, [context.open])

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      context.setOpen(false)
    }
    if (event.key === 'Enter') {
      event.preventDefault()
      const command = getSelectedCommand()
      if (!command) return

      if (!command.skipCloseOnEnter) {
        context.setOpen(false)
      }

      if (command.onEnter) {
        command.onEnter()
      } else {
        command.action()
      }
    }
    if (event.key === 'Tab') {
      event.preventDefault()
      const command = getSelectedCommand()
      if (!command) return
      if (command?.onTab) {
        command.onTab()
      }
    }
  }

  return (
    <CommandInput
      ref={input}
      loading={props.loadingCommands}
      placeholder={
        context.placeholder || context.currentPrompt?.placeholder || 'Escribe un comando...'
      }
      value={context.query}
      onValueChange={context.setQuery}
      onKeyDown={onKeyDown}
    />
  )
}
