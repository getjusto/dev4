import {check} from '@tauri-apps/plugin-updater'
import {ask, message} from '@tauri-apps/plugin-dialog'
import {invoke} from '@tauri-apps/api/core'

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
      // Reiniciar la aplicación después de que la actualización se instale llamando al comando Tauri que maneja el reinicio para tu aplicación
      // Es una buena práctica cerrar cualquier proceso en segundo plano de manera adecuada antes de reiniciar
      // Como alternativa, podrías pedir al usuario que reinicie la aplicación manualmente
      await invoke('graceful_restart')
    }
  } else if (onUserClick) {
    await message('Estás en la última versión.', {
      title: 'No hay actualizaciones disponibles',
      kind: 'info',
      okLabel: 'OK',
    })
  }
}
