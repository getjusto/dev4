import React, {DependencyList, Dispatch, SetStateAction} from 'react'

export interface CommandBarInternalContextType {
  open: boolean
  setOpen: (open: boolean) => void
  query: string
  setQuery: (query: string) => void
  activeContext: string
  setActiveContext: (activeContext: string) => void
  commands: CommandBarCommand[]
  setCommands: Dispatch<SetStateAction<CommandBarCommand[]>>
  currentPrompt: PromptOptions
  setCurrentPrompt: (options: PromptOptions) => void
  hotkeysEnabled: boolean
  setComponentsDisablingHotkeys: Dispatch<SetStateAction<number>>
  placeholder?: string
  bottomBar: React.ReactNode
  limitOptionsTo?: number
}

export interface CommandBarCategory {
  title: string
  commands: CommandBarCommand[]
}

export interface CommandBarCommand {
  __id?: string
  title: string
  secondaryText?: string
  category: string
  omit?: boolean
  hotkeys?: string | string[]
  dependencies: DependencyList
  /**
   * The higher the score, the higher the priority without a query.
   * 0 will not show up without a query.
   */
  defaultScore?: number
  scoreScale?: number
  aliases?: string[]
  checkboxValue?: boolean
  icon?: React.ComponentType<{className?: string}>
  image?: {
    url: string
    blurhash?: string
  }
  action: () => void
  onTab?: () => void
  onEnter?: () => void
  skipCloseOnEnter?: boolean
  extraActions?: {
    icon: React.ReactNode
    action: () => void
  }[]
}

export interface PromptOptions {
  placeholder: string
  defaultQuery: string
  defaultQuerySelected?: boolean
  activeContext?: string
  static?: boolean
  noResults?: React.ComponentType<{query?: string}>
  getCommands: (query: string) => CommandBarCommand[] | Promise<CommandBarCommand[]>
}
