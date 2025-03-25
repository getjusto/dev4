import { cn } from '@/lib/utils'
import Ansi from 'ansi-to-react'

export interface Match {
  text: string;
  index: number;
}

export interface HighlightProps {
  text: string
  searchQuery: string
  currentMatchIndex: number
}

export const HighlightedText = ({ text, searchQuery, currentMatchIndex }: HighlightProps) => {
  if (!searchQuery || !text) return <Ansi>{text}</Ansi>
  
  const safeSearchQuery = searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  
  const regex = new RegExp(safeSearchQuery, 'gi');
  const matches: Match[] = [];
  
  let match = regex.exec(text);
  while (match !== null) {
    matches.push({
      text: match[0],
      index: match.index
    });
    
    if (match.index === regex.lastIndex) {
      regex.lastIndex++;
    }
    
    match = regex.exec(text);
  }
  
  if (matches.length === 0) return <Ansi>{text}</Ansi>;
  
  const segments: JSX.Element[] = [];
  let lastIndex = 0;
  
  matches.forEach((match, i) => {
    if (match.index > lastIndex) {
      segments.push(
        <span key={`text-${i}`} className="inline max-w-full break-words whitespace-pre-wrap">
          <Ansi>{text.substring(lastIndex, match.index)}</Ansi>
        </span>
      );
    }
    
    const isCurrentMatch = i === currentMatchIndex;
    segments.push(
      <span 
        key={`match-${i}`}
        className={cn(
          'search-match bg-yellow-100 text-black px-0.5 inline-block max-w-full break-words whitespace-pre-wrap',
          isCurrentMatch && 'current-match bg-yellow-300 font-bold rounded-sm'
        )}
        id={isCurrentMatch ? 'current-search-match' : `search-match-${i}`}
      >
        <Ansi>{match.text}</Ansi>
      </span>
    );
    
    lastIndex = match.index + match.text.length;
  });
  
  if (lastIndex < text.length) {
    segments.push(
      <span key="text-end" className="inline max-w-full break-words whitespace-pre-wrap">
        <Ansi>{text.substring(lastIndex)}</Ansi>
      </span>
    );
  }
  
  return <div className="w-full whitespace-pre-wrap break-words">{segments}</div>;
};

export default HighlightedText;