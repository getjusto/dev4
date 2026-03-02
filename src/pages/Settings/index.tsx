import {toast} from 'sonner'
import {Button} from '@/components/ui/button'
import {Input} from '@/components/ui/input'
import {Switch} from '@/components/ui/switch'
import PageLayout from '../Layout/PageLayout'
import {useSettings} from './Context'
import Updates from './Updates'
import {AppSettings} from './useSettings'

export default function Settings() {
  const {settings, setSettings, isSaving, saveSettings} = useSettings()

  const handleChange = (field: keyof AppSettings) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setSettings({
      ...settings,
      [field]: e.target.value,
    })
  }

  return (
    <PageLayout title="Settings" subtitle="Enter the path to the services monorepo.">
      <div className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="servicesPath" className="text-sm font-medium">
            Services Path
          </label>
          <Input
            id="servicesPath"
            value={settings.servicesPath}
            onChange={handleChange('servicesPath')}
            placeholder="Enter services path"
          />
        </div>

        <div className="flex items-center justify-between rounded-lg border p-3">
          <div className="space-y-0.5">
            <label htmlFor="startOnLaunch" className="text-sm font-medium">
              Resume services on launch
            </label>
            <p className="text-xs text-muted-foreground">
              Automatically start services that were active when the app was closed
            </p>
          </div>
          <Switch
            id="startOnLaunch"
            checked={settings.startServicesOnLaunch !== false}
            onCheckedChange={(checked: boolean) => {
              const newSettings = {...settings, startServicesOnLaunch: checked}
              setSettings(newSettings)
              saveSettings(newSettings)
            }}
          />
        </div>

        <div className="space-x-5">
          <Button
            onClick={() => {
              saveSettings()
              toast.info('Settings saved successfully')
            }}
            disabled={isSaving}
            className="mt-4"
          >
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
          <Updates />
        </div>
      </div>
    </PageLayout>
  )
}
