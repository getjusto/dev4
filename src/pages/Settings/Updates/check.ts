import {check} from '@tauri-apps/plugin-updater'
import {ask, message} from '@tauri-apps/plugin-dialog'

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
    const yes = await ask(`¡Actualización a ${update.version} disponible!`, {
      title: 'Actualización Disponible',
      kind: 'info',
      okLabel: 'Actualizar',
      cancelLabel: 'Cancelar',
    })
    if (yes) {
      await update.downloadAndInstall()
    }
  } else if (onUserClick) {
    await message('Estás en la última versión.', {
      title: 'No hay actualizaciones disponibles',
      kind: 'info',
      okLabel: 'OK',
    })
  }
}
