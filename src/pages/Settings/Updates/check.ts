import {check} from '@tauri-apps/plugin-updater'
import {message} from '@tauri-apps/plugin-dialog'

export async function checkForAppUpdates(onUserClick = false) {
  const update = await check()
  if (update === null && onUserClick) {
    await message('Estás en la última versión.', {
      title: 'No hay actualizaciones disponibles',
      kind: 'info',
      okLabel: 'OK',
    })
    return
  }
  if (update?.available) {
    await update.downloadAndInstall()
    await message('Se instaló una actualización. Por favor, reinicia la aplicación.', {
      title: 'Actualización instalada',
      kind: 'info',
      okLabel: 'OK',
    })
  }
}
