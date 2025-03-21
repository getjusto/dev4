import {useParams} from 'react-router-dom'
import {useServiceData, useSettings} from '../../Settings/Context'
import Ansi from 'ansi-to-react'
import {useEffect, useRef, useState} from 'react'
import {useOnEvent} from 'react-app-events'
import {cn} from '@/lib/utils'

interface Props {
  className?: string
}

export default function Logs(props: Props) {
  const {serviceName, category} = useParams()
  const service = useServiceData(serviceName, category)
  const {processes} = useSettings()
  const container = useRef<HTMLPreElement>(null)
  const [content, setContent] = useState('')
  useEffect(() => {
    setContent(processes.outputs[`${category}.${serviceName}`] || '')
    setTimeout(() => {
      const scrollToBottom = document.getElementById('scroll-to-bottom')
      if (scrollToBottom) {
        scrollToBottom.scrollIntoView({})
      }
    }, 50)
  }, [`${serviceName}.${category}`])

  useOnEvent(`serviceOutput.${service.fullName}`, () => {
    console.log(`serviceOutput.${service.fullName}`)
    const isAtBottom = getIsScrolledAtBottom()

    setContent(processes.outputs[`${category}.${serviceName}`] || '')

    if (!isAtBottom) return
    setTimeout(() => {
      const scrollToBottom = document.getElementById('scroll-to-bottom')
      if (scrollToBottom) {
        scrollToBottom.scrollIntoView()
      }
    }, 50)
  })

  const getIsScrolledAtBottom = () => {
    if (!container.current) {
      return false
    }

    const {scrollHeight, scrollTop, clientHeight} = container.current
    const margin = 100

    const isAtBottom = scrollHeight - scrollTop - clientHeight < margin
    return isAtBottom
  }

  if (!service.on) {
    return (
      <div className="flex flex-1 flex-col h-full w-full overflow-auto p-5 border-t text-xs">
        <div className="text-center text-muted-foreground">Servicio apagado</div>
      </div>
    )
  }

  return (
    <pre
      className={cn(
        'flex flex-1 flex-col h-full w-full overflow-auto p-5 border-t text-xs',
        props.className,
      )}
      ref={container}
    >
      <Ansi>{content}</Ansi>
      <div id="scroll-to-bottom" />
    </pre>
  )
}
