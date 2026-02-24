import {Check} from 'lucide-react'
import {useState} from 'react'
import {Button} from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {Input} from '@/components/ui/input'
import {SwitchSmall} from '@/components/ui/switch-small'
import {cn} from '@/lib/utils'
import {useSettings} from '../Settings/Context'
import {ServiceGroup} from '../Settings/useSettings'

interface GroupFormProps {
  open: boolean
  onClose: () => void
  group?: ServiceGroup | null
}

export default function GroupForm({open, onClose, group}: GroupFormProps) {
  const {services, status: allStatus, addServiceGroup, updateServiceGroup} = useSettings()
  const [name, setName] = useState(group?.name || '')
  const [selected, setSelected] = useState<Set<string>>(new Set(group?.services || []))

  const toggleService = (fullName: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(fullName)) {
        next.delete(fullName)
      } else {
        next.add(fullName)
      }
      return next
    })
  }

  const handleSave = () => {
    if (!name.trim() || selected.size === 0) return
    if (group) {
      updateServiceGroup(group.id, {name: name.trim(), services: [...selected]})
    } else {
      addServiceGroup({name: name.trim(), services: [...selected]})
    }
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{group ? 'Editar grupo' : 'Crear grupo'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Input
            placeholder="Nombre del grupo"
            value={name}
            onChange={e => setName(e.target.value)}
            autoFocus
          />

          <div className="space-y-1">
            <p className="text-sm font-medium">Servicios</p>
            <div className="max-h-64 overflow-auto space-y-1 rounded-md border p-2">
              {services.servicesList.map(s => {
                const key = `${s.category}.${s.name}`
                const isSelected = selected.has(key)
                const st = allStatus[key]
                return (
                  <button
                    type="button"
                    key={key}
                    className={cn(
                      'flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 cursor-pointer transition-colors',
                      isSelected
                        ? 'bg-primary/10 border border-primary/30'
                        : 'hover:bg-accent border border-transparent',
                    )}
                    onClick={() => toggleService(key)}
                  >
                    <div
                      className={cn(
                        'flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors',
                        isSelected
                          ? 'bg-primary border-primary text-primary-foreground'
                          : 'border-muted-foreground/30',
                      )}
                    >
                      {isSelected && <Check className="h-3 w-3" />}
                    </div>
                    <SwitchSmall
                      checked={st === 'on' || st === 'error'}
                      className={cn('pointer-events-none', {
                        '!bg-green-500': st === 'on',
                        '!bg-red-500': st === 'error',
                      })}
                    />
                    <span className="text-sm flex-1 text-left">{s.name}</span>
                    {s.port && (
                      <span className="text-xs font-bold rounded-md px-1.5 py-0.5 bg-muted-foreground/10">
                        {s.port}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
            <p className="text-xs text-muted-foreground">{selected.size} seleccionados</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={!name.trim() || selected.size === 0}>
            {group ? 'Guardar' : 'Crear'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
