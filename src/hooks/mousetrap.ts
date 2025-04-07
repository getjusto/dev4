import mousetrap from 'mousetrap'
import {useEffect, useRef} from 'react'

// Remove focus from the currently focused element
// when the user presses the escape key
// globaly
document.addEventListener('keydown', event => {
  if (event.key === 'Escape') {
    // Remove focus from the currently focused element
    if (document.activeElement) {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore - blur() is not a property of HTMLElement
      document.activeElement.blur()
    }
  }
})

export interface Options {
  key: string | string[]
  callback: (e: mousetrap.ExtendedKeyboardEvent, combo: string) => void
  omit?: boolean
}

/**
 * Use mousetrap hook
 * https://craig.is/killing/mice
 */
export function useMousetrap(options: Options) {
  const actionRef = useRef(null)
  actionRef.current = options.callback

  useEffect(() => {
    if (options.omit) return
    mousetrap.bind(options.key, (evt, combo) => {
      typeof actionRef.current === 'function' && actionRef.current(evt, combo)
    })
    return () => {
      mousetrap.unbind(options.key)
    }
  }, [options.key, options.omit])
}
