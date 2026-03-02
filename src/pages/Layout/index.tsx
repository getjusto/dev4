import {SidebarInset, SidebarProvider} from '@/components/ui/sidebar'
import {Toaster} from '@/components/ui/sonner'
import {AppSidebar} from './AppSidebar'
import CommandBar from './CommandBar'

export default function Layout({children}: {children: React.ReactNode}) {
  return (
    <div className="font-mono">
      <CommandBar>
        <SidebarProvider>
          <AppSidebar />
          <SidebarInset className="h-[calc(100vh-1rem)] overflow-hidden">{children}</SidebarInset>
        </SidebarProvider>
        <Toaster />
      </CommandBar>
    </div>
  )
}
