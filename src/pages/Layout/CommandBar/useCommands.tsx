import {startTransition, useEffect, useMemo, useState} from 'react'
import {useCommandBarContext} from './Context'
import {commandScoreFilterAndSort} from './commandScore'
import {CommandBarCategory, CommandBarCommand} from './types'
import {isNil} from 'lodash-es'

function useFuseSearch(query: string): {
  filteredCommands: CommandBarCommand[]
  loadingCommands: boolean
} {
  const {commands, currentPrompt} = useCommandBarContext()
  const [allCommands, setAllCommands] = useState<CommandBarCommand[]>([])
  const [loadingCommands, setLoadingCommands] = useState(false)

  useEffect(() => {
    if (!currentPrompt) {
      setAllCommands(commands)
      return
    }
    let thisIsActive = true
    const result = currentPrompt.getCommands(query)
    if (result instanceof Promise) {
      setLoadingCommands(true)
      result.then(r => {
        if (!thisIsActive) return
        startTransition(() => {
          setLoadingCommands(false)
          setAllCommands(r)
        })
      })
    } else {
      setAllCommands(result)
    }
    return () => {
      thisIsActive = false
    }
  }, [commands, !!currentPrompt, query])

  const cleanedCommands = allCommands.filter(command => !command.omit)

  if (currentPrompt?.static) return {filteredCommands: cleanedCommands, loadingCommands}
  if (!query) {
    return {
      filteredCommands: cleanedCommands
        .sort((a, b) => {
          const aScore = a.defaultScore ?? 0
          const bScore = b.defaultScore ?? 0
          if (aScore === bScore) return 0
          if (aScore > bScore) return -1
          return 1
        })
        .filter(command => {
          if (!isNil(command.defaultScore)) return command.defaultScore > 0
          return true
        }),
      loadingCommands,
    }
  }

  const filteredCommands: CommandBarCommand[] = commandScoreFilterAndSort(
    cleanedCommands,
    ['title', 'aliases'],
    query,
  )

  return {filteredCommands, loadingCommands}
}

export function useCategories(commands: CommandBarCommand[]): CommandBarCategory[] {
  const categories = useMemo(() => {
    return commands.reduce(
      (acc, command) => {
        if (acc[command.category]) {
          acc[command.category].push(command)
        } else {
          acc[command.category] = [command]
        }
        return acc
      },
      {} as {[key: string]: CommandBarCommand[]},
    )
  }, [commands])

  return Object.keys(categories).map(category => {
    return {
      title: category,
      commands: categories[category],
    }
  })
}

export function useFilteredCommands(
  query: string,
  limitOptionsTo?: number,
): {
  categories: CommandBarCategory[]
  loadingCommands: boolean
} {
  let {filteredCommands, loadingCommands} = useFuseSearch(query)

  if (limitOptionsTo) {
    filteredCommands = filteredCommands.slice(0, limitOptionsTo)
  }

  const categories = useCategories(filteredCommands)

  return {categories, loadingCommands}
}
