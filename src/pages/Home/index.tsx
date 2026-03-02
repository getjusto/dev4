import {FlickeringGrid} from '@/components/magicui/flickering-grid'

export default function Home() {
  return (
    <div className="relative h-full w-full overflow-hidden bg-background">
      <FlickeringGrid
        data-tauri-drag-region
        className="absolute inset-0 z-0 size-full"
        squareSize={4}
        gridGap={6}
        color="currentColor"
        maxOpacity={0.1}
        flickerChance={0.1}
        height={2000}
        width={2000}
      />
    </div>
  )
}
