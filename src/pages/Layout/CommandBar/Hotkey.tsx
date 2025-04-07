import {useMousetrap} from '@/hooks/mousetrap'
import {useCommandBarContext} from './Context'
import {CommandBarCommand} from './types'

function Hotkey({command}: {command: CommandBarCommand}) {
  const key = Array.isArray(command.hotkeys) ? command.hotkeys.join(' ') : command.hotkeys

  const callback = () => {
    setTimeout(() => {
      command.action()
    }, 10)
  }

  useMousetrap({
    key,
    callback,
  })

  return null
}

export default function CommandBarHotkeysManager() {
  const context = useCommandBarContext()
  const commands = context.commands
    .filter(command => command.hotkeys)
    .filter(command => !command.omit)

  if (context.open || !context.hotkeysEnabled) return null

  return (
    <>
      {commands.map(command => (
        <Hotkey command={command} key={command.__id} />
      ))}
    </>
  )
}
