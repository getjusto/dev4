import classNames from 'clsx'
import {Fragment} from 'react'
import {CommandBarCommand} from '../types'

export interface Props {
  command: CommandBarCommand
}

export default function Option(props: Props) {
  const {command} = props

  const active = false

  return (
    <>
      {/* {!isNil(command.checkboxValue) && <Checkbox value={command.checkboxValue} />} */}
      {!!command.icon && (
        <command.icon
          className={classNames('h-4 w-4 flex-none text-gray-600 dark:text-gray-400', {})}
          aria-hidden="true"
        />
      )}
      {!!command.image && (
        <img
          alt=""
          className={classNames('-m-1 h-7 w-7 flex-none rounded-full bg-gray-50', {})}
          loading="lazy"
          src={command.image.url}
        />
      )}

      <span className="ml-3 flex-auto truncate">
        <span>{command.title}</span>
        {command.secondaryText && (
          <span className="text-gray-500">{` ${command.secondaryText}`}</span>
        )}
      </span>

      {command.hotkeys && (
        <span
          className={classNames('ml-3 flex-none text-xs font-semibold', {
            'text-gray-500 dark:text-gray-400': active,
            'text-gray-400 dark:text-gray-500': !active,
          })}
        >
          <div className="space-x-1">
            {Array.isArray(command.hotkeys)
              ? command.hotkeys.map((key, index) => (
                  <Fragment key={index}>
                    <Hotkey label={key} />
                    {index === command.hotkeys.length - 1 ? null : (
                      <span className="font-normal">luego</span>
                    )}
                  </Fragment>
                ))
              : command.hotkeys.split('+').map((key, index) => <Hotkey key={index} label={key} />)}
          </div>
        </span>
      )}
      {command.extraActions?.length ? (
        <div className="-my-1 flex items-center space-x-1">
          {command.extraActions.map((action, index) => (
            <button
              type="button"
              key={index}
              onClick={event => {
                action.action()
                event.stopPropagation()
              }}
              className={classNames('rounded-lg border p-1 ', {
                'bg-gray-300 hover:bg-gray-400 dark:bg-gray-700 dark:hover:bg-gray-600': active,
                'bg-gray-200 hover:bg-gray-300 dark:bg-gray-800 dark:hover:bg-gray-700 dark:border-gray-700':
                  !active,
              })}
            >
              {action.icon}
            </button>
          ))}
        </div>
      ) : null}
    </>
  )
}

function Hotkey({label}: {label: string}) {
  return (
    <kbd
      className={classNames('rounded border px-1 py-1 font-mono text-xs font-normal ', {
        'bg-gray-200 text-gray-400 dark:bg-gray-700 dark:text-gray-400 dark:border-gray-600': true,
      })}
    >
      {label.toUpperCase()}
    </kbd>
  )
}
