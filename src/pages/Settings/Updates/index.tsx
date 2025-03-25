import {Button} from '@/components/ui/button'
import {checkForAppUpdates} from './check'
export default function Updates() {
  return (
    <Button variant="outline" onClick={() => checkForAppUpdates(true)}>
      Check for updates
    </Button>
  )
}
