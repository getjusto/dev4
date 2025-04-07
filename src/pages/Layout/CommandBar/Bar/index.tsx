import {useEffect} from 'react'
import {useCommandBarContext} from '../Context'
import {useFilteredCommands} from '../useCommands'
import ActiveCommandBarContext from './ActiveContext'
import Input from './Input'
import NoResults from './NoResults'
import Options from './Options'
import {CommandDialog, CommandList} from '@/components/ui/command'

export default function InternalCommandBar() {
  const {open, setOpen, query, setQuery, bottomBar, limitOptionsTo, currentPrompt} =
    useCommandBarContext()
  const {categories, loadingCommands} = useFilteredCommands(query, limitOptionsTo)

  useEffect(() => {
    if (!open) {
      setQuery('')
    }
  }, [open])

  return (
    <CommandDialog
      open={open}
      onOpenChange={setOpen}
      commandProps={{
        shouldFilter: false,
        loop: true,
      }}
    >
      <ActiveCommandBarContext />
      <Input loadingCommands={loadingCommands} categories={categories} />
      <CommandList>
        <Options categories={categories} />
        <NoResults
          loadingCommands={loadingCommands}
          categories={categories}
          query={query}
          noResults={currentPrompt?.noResults}
        />
      </CommandList>
      {bottomBar}
    </CommandDialog>
  )
}
