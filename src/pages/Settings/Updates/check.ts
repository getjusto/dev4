import {check} from '@tauri-apps/plugin-updater'
import {ask, message} from '@tauri-apps/plugin-dialog'
import {relaunch} from '@tauri-apps/plugin-process'

export async function checkForAppUpdates(onUserClick = false) {
  try {
    const update = await check()
    if (!update || !update.available) {
      if (onUserClick) {
        await message('Estás en la última versión.', {
          title: 'No hay actualizaciones disponibles',
          kind: 'info',
          okLabel: 'OK',
        })
      }
      return
    }

    await update.downloadAndInstall()

    const restartNow = await ask('Se instaló una actualización. ¿Deseas reiniciar ahora?', {
      title: 'Actualización instalada',
      kind: 'info',
      okLabel: 'Reiniciar',
      cancelLabel: 'Luego',
    })

    if (restartNow) {
      await relaunch()
    }
  } catch (error) {
    console.error('Update check failed:', error)
    if (onUserClick) {
      await message(`No se pudo actualizar la app.\n\n${String(error)}`, {
        title: 'Error al buscar actualizaciones',
        kind: 'error',
        okLabel: 'OK',
      })
    }
  }
}
