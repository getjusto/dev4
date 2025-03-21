import {Input} from '@/components/ui/input'
import PageLayout from '../Layout/PageLayout'
import {AppSettings} from './useSettings'
import {Button} from '@/components/ui/button'
import {useSettings} from './Context'
import {toast} from 'sonner'

export default function Settings() {
  const {settings, setSettings, isSaving, saveSettings} = useSettings()

  const handleChange = (field: keyof AppSettings) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setSettings({
      ...settings,
      [field]: e.target.value,
    })
  }

  return (
    <PageLayout title="Settings" subtitle="Ingresa los paths de los servicios, justo y delivery.">
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

        <div className="space-y-2">
          <label htmlFor="justoPath" className="text-sm font-medium">
            Justo Path
          </label>
          <Input
            id="justoPath"
            value={settings.justoPath}
            onChange={handleChange('justoPath')}
            placeholder="Enter justo path"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="deliveryPath" className="text-sm font-medium">
            Delivery Path
          </label>
          <Input
            id="deliveryPath"
            value={settings.deliveryPath}
            onChange={handleChange('deliveryPath')}
            placeholder="Enter delivery path"
          />
        </div>

        <Button
          onClick={() => {
            saveSettings()
            toast.info('Configuraciones guardadas correctamente')
          }}
          disabled={isSaving}
          className="mt-4"
        >
          {isSaving ? 'Guardando...' : 'Guadar'}
        </Button>
      </div>
    </PageLayout>
  )
}
