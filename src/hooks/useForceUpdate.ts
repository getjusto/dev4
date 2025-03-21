import {useEffect, useState} from 'react'

export function useForceUpdate() {
  const [, setState] = useState(0)
  return () => setState(state => state + 1)
}

export function useForceUpdateInterval(interval: number) {
  const forceUpdate = useForceUpdate()
  useEffect(() => {
    const intervalId = setInterval(forceUpdate, interval)
    return () => clearInterval(intervalId)
  }, [forceUpdate, interval])
}
