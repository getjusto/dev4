import {Command} from '@tauri-apps/plugin-shell'

/**
 * Opens the native terminal application in the specified directory
 * Tries Warp first, then falls back to the default Terminal app
 * @param cwd - The directory path to open the terminal in
 * @throws Error if no terminal can be opened
 */
export async function openNativeTerminal(cwd: string): Promise<void> {
  console.log('Attempting to open native terminal in:', cwd)

  try {
    // Try to open Warp first
    await Command.create('open', ['-a', 'Warp', cwd]).execute()
    console.log('Opened Warp terminal successfully')
  } catch (warpError) {
    console.log('Warp not available, trying default Terminal')

    try {
      // Fall back to default Terminal app
      await Command.create('open', ['-a', 'Terminal', cwd]).execute()
      console.log('Opened Terminal app successfully')
    } catch (terminalError) {
      console.error('Failed to open any terminal:', {warpError, terminalError})
      throw new Error(
        `Failed to open terminal in ${cwd}. Neither Warp nor Terminal could be opened.`,
      )
    }
  }
}
