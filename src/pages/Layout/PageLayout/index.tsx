import {H2} from '@/components/ui/typography'

export interface Props {
  title: string
  subtitle?: string
  children: React.ReactNode
}
export default function PageLayout(props: Props) {
  return (
    <div className="p-5 space-y-5 overflow-auto">
      <H2 data-tauri-drag-region>{props.title}</H2>
      {props.subtitle && (
        <p className="text-muted-foreground" data-tauri-drag-region>
          {props.subtitle}
        </p>
      )}
      <div>{props.children}</div>
    </div>
  )
}
