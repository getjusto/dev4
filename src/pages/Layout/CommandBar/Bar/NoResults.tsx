import {CommandEmpty} from '@/components/ui/command'
import {CommandBarCategory} from '../types'

export interface Props {
  query: string
  loadingCommands: boolean
  categories: CommandBarCategory[]
  noResults?: React.ComponentType<{query?: string}>
}
export default function NoResults(props: Props) {
  const {query, categories} = props

  if (categories.length) return null

  if (props.loadingCommands) {
    return null
  }

  if (props.noResults) {
    return <props.noResults query={query} />
  }

  return <CommandEmpty>No hay comandos disponibles para "{query}"</CommandEmpty>
}
