import InternalCommandBar from './Bar'
import {CommandBarInternalContext, useCreateCommandBarContext} from './Context'
import CommandBarHotkeysManager from './Hotkey'

export interface Props {
  children: React.ReactNode
}

export default function CommandBar(props: Props) {
  const contextValue = useCreateCommandBarContext()
  return (
    <CommandBarInternalContext.Provider value={contextValue}>
      {props.children}
      <InternalCommandBar />
      <CommandBarHotkeysManager />
    </CommandBarInternalContext.Provider>
  )
}
