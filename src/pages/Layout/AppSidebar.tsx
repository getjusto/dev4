import {Settings} from 'lucide-react'

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
} from '@/components/ui/sidebar'
import {Link} from 'react-router-dom'
import {H4} from '@/components/ui/typography'
import {useSettings} from '../Settings/Context'
import {Collapsible, CollapsibleContent, CollapsibleTrigger} from '@/components/ui/collapsible'
import {ServiceStatus} from '../Settings/useServicesStatus'

function ServiceStatusComp({status}: {status: ServiceStatus}) {
  if (status === 'on') return <div className="w-2 h-2 bg-green-500 rounded-full" />
  if (status === 'off') return <div className="w-2 h-2 bg-gray-500 rounded-full" />
  if (status === 'error') return <div className="w-2 h-2 bg-red-500 rounded-full" />
  return <div className="w-2 h-2 bg-gray-500 rounded-full" />
}

export function AppSidebar() {
  const {services, status} = useSettings()
  return (
    <Sidebar>
      <SidebarHeader>
        <div className="h-5" data-tauri-drag-region />
        <Link to="/">
          <H4 className="text-center" data-tauri-drag-region>
            Justo Dev4
          </H4>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            <Collapsible className="group/collapsible">
              <SidebarMenuItem>
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton>Services</SidebarMenuButton>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarMenuSub>
                    {services.servicesList.map(item => (
                      <SidebarMenuItem key={item.name}>
                        <SidebarMenuButton asChild>
                          <Link to={`/services/services/${item.name}`}>
                            <ServiceStatusComp status={status[`${item.category}.${item.name}`]} />
                            <span>{item.name}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenuSub>
                </CollapsibleContent>
              </SidebarMenuItem>
            </Collapsible>
          </SidebarMenu>
          <SidebarMenu>
            <Collapsible className="group/collapsible">
              <SidebarMenuItem>
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton>Justo</SidebarMenuButton>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarMenuSub>
                    {services.justoList.map(item => (
                      <SidebarMenuItem key={item.name}>
                        <SidebarMenuButton asChild>
                          <Link to={`/services/justo/${item.name}`}>
                            <ServiceStatusComp status={status[`${item.category}.${item.name}`]} />
                            <span>{item.name}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenuSub>
                </CollapsibleContent>
              </SidebarMenuItem>
            </Collapsible>
          </SidebarMenu>
          <SidebarMenu>
            <Collapsible className="group/collapsible">
              <SidebarMenuItem>
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton>Delivery</SidebarMenuButton>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarMenuSub>
                    {services.deliveryList.map(item => (
                      <SidebarMenuItem key={item.name}>
                        <SidebarMenuButton asChild>
                          <Link to={`/services/delivery/${item.name}`}>
                            <ServiceStatusComp status={status[`${item.category}.${item.name}`]} />
                            <span>{item.name}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenuSub>
                </CollapsibleContent>
              </SidebarMenuItem>
            </Collapsible>
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link to="/settings">
                <Settings />
                <span>Settings</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
