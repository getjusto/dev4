import {CommandGroup, CommandItem} from '@/components/ui/command'
import {useCommandBarContext} from '../Context'
import {CommandBarCategory} from '../types'
import Option from './Option'

export interface Props {
  categories: CommandBarCategory[]
}

export default function Options(props: Props) {
  const {categories} = props
  const context = useCommandBarContext()

  if (categories.length === 0) return null

  let i = 0
  return (
    <>
      {categories.map((category, index) => {
        return (
          <CommandGroup key={index} heading={category.title}>
            {category.commands.map((command, cIndex) => {
              i++
              return (
                <CommandItem
                  data-command-index={`${i - 1}`}
                  onSelect={() => {
                    context.setOpen(false)
                    if (command.action) {
                      command.action()
                    }
                  }}
                  key={cIndex}
                >
                  <Option command={command} />
                </CommandItem>
              )
            })}
          </CommandGroup>
        )
      })}
    </>
  )
}
