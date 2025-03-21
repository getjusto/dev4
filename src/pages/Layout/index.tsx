import {SidebarProvider} from '@/components/ui/sidebar'
import {AppSidebar} from './AppSidebar'
import {Toaster} from '@/components/ui/sonner'

export default function Layout({children}: {children: React.ReactNode}) {
  return (
    <div className="font-mono">
      <SidebarProvider>
        <AppSidebar />
        <main className="flex-1 h-screen flex flex-col w-full overflow-hidden">{children}</main>
      </SidebarProvider>
      <Toaster />
    </div>
  )
}
