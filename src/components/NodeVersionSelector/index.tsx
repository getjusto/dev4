import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Settings, Check, X } from 'lucide-react'
import { toast } from 'sonner'
import { invoke } from '@tauri-apps/api/core'

interface NodeVersionSelectorProps {
  currentVersion?: string
  serviceName: string
  category: string
  onVersionChange: (version: string) => void
}

export function NodeVersionSelector({
  currentVersion,
  serviceName,
  category,
  onVersionChange,
}: NodeVersionSelectorProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [inputValue, setInputValue] = useState(currentVersion || '')
  const [availableVersions, setAvailableVersions] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)

  useEffect(() => {
    if (isEditing) {
      // Load available Node versions when starting to edit
      invoke<string[]>('get_available_node_versions')
        .then(setAvailableVersions)
        .catch(console.error)
    }
  }, [isEditing])

  const handleSave = () => {
    const version = inputValue.trim()
    if (version !== currentVersion) {
      onVersionChange(version)
      if (version) {
        toast.success(`Node.js version set to ${version} for ${serviceName}`)
      } else {
        toast.success(`Using default Node.js version for ${serviceName}`)
      }
    }
    setIsEditing(false)
    setShowSuggestions(false)
  }

  const handleCancel = () => {
    setInputValue(currentVersion || '')
    setIsEditing(false)
    setShowSuggestions(false)
  }

  const handleClear = () => {
    setInputValue('')
    onVersionChange('')
    setIsEditing(false)
    setShowSuggestions(false)
    toast.success(`Using default Node.js version for ${serviceName}`)
  }

  const filteredVersions = availableVersions.filter(version => 
    version.toLowerCase().includes(inputValue.toLowerCase())
  )

  if (isEditing) {
    return (
      <div className="relative flex items-center space-x-2 text-sm">
        <span className="text-muted-foreground">Node.js:</span>
        <div className="relative">
          <Input
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value)
              setShowSuggestions(true)
            }}
            onFocus={() => setShowSuggestions(true)}
            placeholder="e.g. 18.17.0, 20.10.0"
            className="h-7 w-32 text-xs"
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSave()
              if (e.key === 'Escape') handleCancel()
            }}
            autoFocus
          />
          {showSuggestions && filteredVersions.length > 0 && (
            <div className="absolute top-8 left-0 w-32 bg-popover border rounded-md shadow-md z-50 max-h-32 overflow-y-auto">
              {filteredVersions.map((version) => (
                <button
                  key={version}
                  className="w-full px-2 py-1 text-xs text-left hover:bg-muted"
                  onClick={() => {
                    setInputValue(version)
                    setShowSuggestions(false)
                  }}
                >
                  {version}
                </button>
              ))}
            </div>
          )}
        </div>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 w-7 p-0"
          onClick={handleSave}
          title="Save"
        >
          <Check className="w-3 h-3" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 w-7 p-0"
          onClick={handleCancel}
          title="Cancel"
        >
          <X className="w-3 h-3" />
        </Button>
        {currentVersion && (
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-xs"
            onClick={handleClear}
            title="Clear (use default)"
          >
            Clear
          </Button>
        )}
      </div>
    )
  }

  return (
    <div className="flex items-center space-x-2 text-sm">
      <span className="text-muted-foreground">Node.js:</span>
      <span className="font-mono text-xs bg-muted px-2 py-1 rounded">
        {currentVersion || 'default'}
      </span>
      <Button
        size="sm"
        variant="ghost"
        className="h-7 w-7 p-0"
        onClick={() => setIsEditing(true)}
        title="Change Node.js version"
      >
        <Settings className="w-3 h-3" />
      </Button>
    </div>
  )
}