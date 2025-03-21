import {useParams} from 'react-router-dom'
import {useSettings} from '../../Settings/Context'
import Ansi from 'ansi-to-react'
import {useEffect, useRef, useState} from 'react'
import {useOnEvent} from 'react-app-events'

export default function Logs() {
  const {serviceName, category} = useParams()
  // const {service} = useServiceData(serviceName, category)
  const {processes} = useSettings()
  const serviceOutput = processes.outputs[`${category}.${serviceName}`] || ''
  const container = useRef<HTMLPreElement>(null)
  const [content, setContent] = useState('')
  useEffect(() => {
    setContent(serviceOutput)
    setTimeout(() => {
      const scrollToBottom = document.getElementById('scroll-to-bottom')
      if (scrollToBottom) {
        scrollToBottom.scrollIntoView({})
      }
    }, 50)
  }, [`${serviceName}.${category}`])

  useOnEvent(`serviceOutput.${serviceName}.${category}`, () => {
    const isAtBottom = getIsScrolledAtBottom()

    setContent(serviceOutput)

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

  return (
    <pre
      className="flex flex-1 flex-col h-full w-full overflow-auto p-5 border-t text-xs"
      ref={container}
    >
      <Ansi>{content}</Ansi>
      <div id="scroll-to-bottom" />
    </pre>
  )
}
