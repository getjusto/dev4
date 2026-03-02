import {Plus} from 'lucide-react'
import {useState} from 'react'
import {Button} from '@/components/ui/button'
import {useProvideCommands} from '../Layout/CommandBar/Context'
import PageLayout from '../Layout/PageLayout'
import {useSettings} from '../Settings/Context'
import {ServiceGroup} from '../Settings/useSettings'
import GroupCard from './GroupCard'
import GroupForm from './GroupForm'

export default function Groups() {
  const {settings, setServiceOn, services} = useSettings()
  const groups = settings.serviceGroups || []
  const [formOpen, setFormOpen] = useState(false)
  const [editingGroup, setEditingGroup] = useState<ServiceGroup | null>(null)

  const handleToggleGroup = async (group: ServiceGroup, on: boolean) => {
    for (const key of group.services) {
      const exists = services.servicesList.some(s => `${s.category}.${s.name}` === key)
      if (!exists) continue
      const [category, ...nameParts] = key.split('.')
      await setServiceOn(category, nameParts.join('.'), on)
    }
  }

  useProvideCommands(
    groups.flatMap(group => [
      {
        title: `Start group: ${group.name}`,
        action: () => handleToggleGroup(group, true),
        category: 'Groups',
        dependencies: [groups],
      },
      {
        title: `Stop group: ${group.name}`,
        action: () => handleToggleGroup(group, false),
        category: 'Groups',
        dependencies: [groups],
      },
    ]),
  )

  return (
    <PageLayout
      title="Service Groups"
      subtitle="Create groups to start or stop multiple services at once."
    >
      <div className="space-y-4">
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="h-4 w-4" />
          Create group
        </Button>

        {groups.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No groups created yet. Create one to get started.
          </p>
        )}

        {groups.map(group => (
          <GroupCard
            key={group.id}
            group={group}
            onEdit={() => {
              setEditingGroup(group)
              setFormOpen(true)
            }}
          />
        ))}
      </div>

      {formOpen && (
        <GroupForm
          open={formOpen}
          onClose={() => {
            setFormOpen(false)
            setEditingGroup(null)
          }}
          group={editingGroup}
        />
      )}
    </PageLayout>
  )
}
