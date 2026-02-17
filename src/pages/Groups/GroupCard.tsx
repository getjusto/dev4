import {Button} from '@/components/ui/button'
import {Pencil, Play, Power, Trash2} from 'lucide-react'
import {useSettings} from '../Settings/Context'
import {ServiceGroup} from '../Settings/useSettings'

interface GroupCardProps {
  group: ServiceGroup
  onEdit: () => void
}

export default function GroupCard({group, onEdit}: GroupCardProps) {
  const {setServiceOn, deleteServiceGroup, services} = useSettings()

  const serviceNames = group.services
    .map(key => {
      const name = key.split('.').pop()
      return name
    })
    .filter(Boolean)

  const existingServices = group.services.filter(key =>
    services.servicesList.some(s => `${s.category}.${s.name}` === key),
  )

  const handleToggleAll = async (on: boolean) => {
    for (const key of existingServices) {
      const [category, ...nameParts] = key.split('.')
      const name = nameParts.join('.')
      await setServiceOn(category, name, on)
    }
  }

  return (
    <div className="rounded-lg border p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">{group.name}</h3>
          <p className="text-xs text-muted-foreground">
            {serviceNames.join(', ')} ({existingServices.length})
          </p>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={onEdit} title="Editar grupo">
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => deleteServiceGroup(group.id)}
            title="Eliminar grupo"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={() => handleToggleAll(true)}>
          <Play className="h-3.5 w-3.5" />
          Encender todos
        </Button>
        <Button variant="outline" size="sm" onClick={() => handleToggleAll(false)}>
          <Power className="h-3.5 w-3.5" />
          Apagar todos
        </Button>
      </div>
    </div>
  )
}
