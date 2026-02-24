import {SidebarProvider} from '@/components/ui/sidebar'
import {Toaster} from '@/components/ui/sonner'
import {AppSidebar} from './AppSidebar'
import CommandBar from './CommandBar'

export default function Layout({children}: {children: React.ReactNode}) {
  return (
    <div className="font-mono">
      <CommandBar>
        <SidebarProvider>
          <AppSidebar />
          <main className="flex-1 h-screen flex flex-col w-full overflow-hidden">{children}</main>
        </SidebarProvider>
        <Toaster />
      </CommandBar>
    </div>
  )
}
