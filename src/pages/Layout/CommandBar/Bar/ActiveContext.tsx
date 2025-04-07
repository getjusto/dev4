import {useCommandBarContext} from '../Context'

export default function ActiveCommandBarContext() {
  const context = useCommandBarContext()
  if (!context.activeContext) return null
  return (
    <div className="px-4 pt-4">
      <div className="inline-flex rounded-md bg-gray-100 px-2 py-1 text-sm text-gray-500">
        {context.activeContext}
      </div>
    </div>
  )
}
