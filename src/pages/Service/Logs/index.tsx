import {useParams} from 'react-router-dom'
import {useServiceData, useSettings} from '../../Settings/Context'
import Ansi from 'ansi-to-react'
import {useEffect, useRef, useState, useCallback} from 'react'
import {useOnEvent} from 'react-app-events'
import {cn} from '@/lib/utils'
import { Search, X, ChevronUp, ChevronDown } from 'lucide-react'
import HighlightedText, { Match } from '@/components/HighlightedText'

interface Props {
  className?: string
}

export default function Logs(props: Props) {
  const {serviceName, category} = useParams()
  const service = useServiceData(serviceName, category)
  const {processes} = useSettings()
  const container = useRef<HTMLPreElement>(null)
  const [content, setContent] = useState('')
  
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [matches, setMatches] = useState<Match[]>([])
  const [currentMatch, setCurrentMatch] = useState(-1)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const processingKeyRef = useRef(false)
  
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
  
  const navigateToNextMatch = useCallback(() => {
    if (matches.length === 0) return
    
    const nextMatch = currentMatch >= matches.length - 1 ? 0 : currentMatch + 1
    setCurrentMatch(nextMatch)
  }, [matches.length, currentMatch])
  
  const navigateToPrevMatch = useCallback(() => {
    if (matches.length === 0) return
    
    const prevMatch = currentMatch <= 0 ? matches.length - 1 : currentMatch - 1
    setCurrentMatch(prevMatch)
  }, [matches.length, currentMatch])
  
  const handleSearchKeyDown = useCallback((e: React.KeyboardEvent | KeyboardEvent) => {    
    if (processingKeyRef.current) {
      return;
    }
    
    try {
      processingKeyRef.current = true;
      
      if (searchOpen && matches.length > 0) {
        if (e.key === 'Enter') {
          e.preventDefault();
          
          if (e.shiftKey) {
            navigateToPrevMatch();
          } else {
            navigateToNextMatch();
          }
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          navigateToNextMatch();
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          navigateToPrevMatch();
        }
      }
      
      if (e.key === 'Escape' && searchOpen) {
        e.preventDefault();
        setSearchOpen(false);
      }
    } finally {
      setTimeout(() => {
        processingKeyRef.current = false;
      }, 50);
    }
  }, [searchOpen, matches.length, navigateToNextMatch, navigateToPrevMatch]);
  
  const focusAndSelectSearchInput = useCallback(() => {
    setTimeout(() => {
      if (searchInputRef.current) {
        searchInputRef.current.focus();
        if (searchQuery) {
          searchInputRef.current.select();
        }
      }
    }, 50);
  }, [searchQuery]);
  
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
        e.preventDefault();
        setSearchOpen(true);
        focusAndSelectSearchInput();
        return;
      }
      
      if (searchOpen && e.key === 'Escape') {
        e.preventDefault();
        setSearchOpen(false);
        return;
      }
      
      if (document.activeElement === searchInputRef.current) {
        return;
      }
    };
    
    document.addEventListener('keydown', handleGlobalKeyDown, { capture: true });
    return () => {
      document.removeEventListener('keydown', handleGlobalKeyDown, { capture: true });
    };
  }, [searchOpen, handleSearchKeyDown, focusAndSelectSearchInput]);
  
  useEffect(() => {
    if (!searchQuery || !container.current) {
      setMatches([])
      setCurrentMatch(-1)
      return
    }
    
    const safeSearchQuery = searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(safeSearchQuery, 'gi');
    const foundMatches: Match[] = [];
    
    let match = regex.exec(content);
    while (match !== null) {
      foundMatches.push({
        text: match[0],
        index: match.index
      });
      
      if (match.index === regex.lastIndex) {
        regex.lastIndex++;
      }
      
      match = regex.exec(content);
    }
        
    setMatches(foundMatches);
    setCurrentMatch(foundMatches.length > 0 ? 0 : -1);
  }, [searchQuery, content]);
  
  useEffect(() => {
    if (currentMatch >= 0 && matches.length > 0) {
    }
  }, [currentMatch, matches]);
  
  useEffect(() => {
    if (currentMatch >= 0 && searchQuery) {
      setTimeout(() => {
        const currentMatchElement = document.getElementById('current-search-match');
        if (currentMatchElement) {
          currentMatchElement.scrollIntoView({
            behavior: 'smooth',
            block: 'center'
          });
          
          currentMatchElement.classList.add('flash-highlight');
          setTimeout(() => {
            currentMatchElement.classList.remove('flash-highlight');
          }, 500);
          
          searchInputRef.current?.focus();
        } else {
          console.warn('Could not find current match element');
        }
      }, 50);
    }
  }, [currentMatch, searchQuery]);

  // Handle ⌘+K (Command+K) to clear output
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        if (service) {
          processes.resetOutput(service)
        }
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [service])

  return (
    <div className="relative flex flex-1 flex-col h-full w-full max-h-[calc(100vh-64px)] overflow-hidden">
      {/* Search button - show with indicator if there's an active search query */}
      {!searchOpen && (
        <button
          type="button"
          onClick={() => {
            setSearchOpen(true);
            focusAndSelectSearchInput();
          }}
          className={cn(
            "absolute top-3 right-3 p-1 rounded-md z-10 flex items-center gap-1 text-xs transition-colors",
            searchQuery ? "bg-yellow-100 text-black hover:bg-yellow-200" : "bg-muted/80 text-muted-foreground hover:bg-muted"
          )}
        >
          <Search size={14} />
          <span className="hidden sm:inline">
            {searchQuery ? `"${searchQuery.length > 10 ? `${searchQuery.substring(0, 10)}...` : searchQuery}" (${matches.length})` : 'Search logs'}
          </span>
        </button>
      )}
      
      {/* Search bar */}
      {searchOpen && (
        <div className="absolute top-3 right-3 z-20 flex items-center gap-2 bg-muted rounded-md p-1 border shadow-sm">
          <Search size={14} className="text-muted-foreground" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search logs..."
            className="bg-transparent border-none outline-none text-xs w-32 sm:w-48"
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'Escape') {
                e.preventDefault();
                e.stopPropagation();
                
                handleSearchKeyDown(e);
              }
            }}
          />
          
          {/* Match navigation */}
          {matches.length > 0 && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <span>{`${currentMatch + 1}/${matches.length}`}</span>
              <div className="flex flex-col">
                <button 
                  type="button"
                  onClick={() => {
                    navigateToPrevMatch();
                    searchInputRef.current?.focus();
                  }}
                  className="p-0.5"
                >
                  <ChevronUp size={12} />
                </button>
                <button 
                  type="button"
                  onClick={() => {
                    navigateToNextMatch();
                    searchInputRef.current?.focus();
                  }}
                  className="p-0.5"
                >
                  <ChevronDown size={12} />
                </button>
              </div>
            </div>
          )}
          
          <button
            type="button"
            onClick={() => {
              setSearchOpen(false);
            }}
            className="p-1 hover:bg-muted-foreground/20 rounded-sm"
          >
            <X size={14} />
          </button>
        </div>
      )}
      
      <pre
        className={cn(
          'flex flex-1 flex-col w-full overflow-auto p-5 border-t text-xs',
          'font-mono whitespace-pre-wrap break-words', 
          props.className,
          {
            'opacity-50': !service.on,
          },
        )}
        ref={container}
        id="log-container"
      >
        {searchOpen && searchQuery ? (
          <div id="highlighted-content" className="w-full whitespace-pre-wrap break-words">
            <HighlightedText 
              text={content} 
              searchQuery={searchQuery} 
              currentMatchIndex={currentMatch} 
            />
          </div>
        ) : (
          <Ansi>{content}</Ansi>
        )}
        <div id="scroll-to-bottom" />
      </pre>
    </div>
  )
}
