import {TerminalIcon} from 'lucide-react'
import {useCommandBarContext} from '../CommandBar/Context'

export interface Props {
  title?: string
}

export default function CommandsButton(props: Props) {
  const context = useCommandBarContext()
  const controlIcon = 'CMD'

  return (
    <div className="px-2">
      <button
        type="button"
        className="cursor-pointer px-2 group flex w-full items-center space-x-2 rounded-md border bg-white dark:bg-gray-800 dark:border-gray-700 py-1.5 text-left text-sm shadow-sm outline-none"
        onClick={() => context.setOpen(true)}
      >
        <TerminalIcon
          className="h-4 w-4 text-gray-400 group-hover:text-gray-500 dark:text-gray-400 dark:group-hover:text-gray-300"
          aria-hidden="true"
        />
        <div className="flex-1 text-gray-400 group-hover:text-gray-500 dark:text-gray-400 dark:group-hover:text-gray-300 truncate">
          {props.title || 'Comandos'}
        </div>
        <div className="flex space-x-1">
          <div className="rounded border bg-gray-200 dark:bg-gray-700 dark:border-gray-600 px-1 text-xs text-gray-400 dark:text-gray-400">
            {controlIcon}
          </div>
          <div className="rounded border bg-gray-200 dark:bg-gray-700 dark:border-gray-600 px-1 text-xs text-gray-400 dark:text-gray-400">
            K
          </div>
        </div>
      </button>
    </div>
  )
}
