import {Button} from '@/components/ui/button'
import {checkForAppUpdates} from './check'
export default function Updates() {
  return (
    <Button variant="outline" onClick={() => checkForAppUpdates(false)}>
      Check for updates
    </Button>
  )
}
