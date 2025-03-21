import {FlickeringGrid} from '@/components/magicui/flickering-grid'

export default function Home() {
  return (
    <div className="relative h-full w-full overflow-hidden rounded-lg border bg-background">
      <FlickeringGrid
        className="absolute inset-0 z-0 size-full"
        squareSize={4}
        gridGap={6}
        color="#737373"
        maxOpacity={0.3}
        flickerChance={0.1}
        height={2000}
        width={2000}
      />
    </div>
  )
}
