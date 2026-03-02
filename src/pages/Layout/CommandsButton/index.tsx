import {TerminalIcon} from 'lucide-react'
import {useCommandBarContext} from '../CommandBar/Context'

export interface Props {
  title?: string
}

export default function CommandsButton(props: Props) {
  const context = useCommandBarContext()
  const controlIcon = 'CMD'

  return (
    <div>
      <button
        type="button"
        className="cursor-pointer px-2 group flex w-full items-center space-x-2 rounded-md border border-border bg-background py-1.5 text-left text-sm shadow-sm outline-none"
        onClick={() => context.setOpen(true)}
      >
        <TerminalIcon
          className="h-4 w-4 text-muted-foreground group-hover:text-foreground"
          aria-hidden="true"
        />
        <div className="flex-1 text-muted-foreground group-hover:text-foreground truncate">
          {props.title || 'Commands'}
        </div>
        <div className="flex space-x-1">
          <div className="rounded border border-border bg-muted px-1 text-xs text-muted-foreground">
            {controlIcon}
          </div>
          <div className="rounded border border-border bg-muted px-1 text-xs text-muted-foreground">
            K
          </div>
        </div>
      </button>
    </div>
  )
}
