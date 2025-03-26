import {Settings} from 'lucide-react'

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'
import {Link, useLocation} from 'react-router-dom'
import {H4} from '@/components/ui/typography'
import {useSettings} from '../Settings/Context'
import {ServiceData} from '../Settings/useServices'
import {cn} from '@/lib/utils'
import {SwitchSmall} from '@/components/ui/switch-small'

function ServiceStatusComp({service}: {service: ServiceData}) {
  const {status: allStatus, setServiceOn} = useSettings()
  const status = allStatus[`${service.category}.${service.name}`]

  return (
    <SwitchSmall
      checked={status !== 'off'}
      className={cn('cursor-pointer', {
        '!bg-green-500': status === 'on',
        // '!bg-blue-500': status === 'off',
        '!bg-red-500': status === 'error',
      })}
      onCheckedChange={(checked: boolean) => setServiceOn(service.category, service.name, checked)}
    />
  )
}

export function AppSidebar() {
  const {services} = useSettings()
  const location = useLocation()

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
          <SidebarGroupLabel>Services</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {services.servicesList.map(item => (
                <SidebarMenuItem key={item.name}>
                  <SidebarMenuButton
                    asChild
                    isActive={location.pathname.includes(`/services/${item.category}/${item.name}`)}
                  >
                    <Link to={`/services/services/${item.name}`}>
                      <ServiceStatusComp service={item} />
                      <span>{item.name}</span>
                      {item.port && (
                        <span className="ml-auto text-xs font-bold rounded-md px-1.5 py-0.5 bg-muted-foreground/10">
                          {item.port}
                        </span>
                      )}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>Main</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {services.justoList.map(item => (
                <SidebarMenuItem key={item.name}>
                  <SidebarMenuButton
                    asChild
                    isActive={location.pathname.includes(`/services/${item.category}/${item.name}`)}
                  >
                    <Link to={`/services/justo/${item.name}`}>
                      <ServiceStatusComp service={item} />
                      <span>{item.name}</span>
                      {item.port && (
                        <span className="ml-auto text-xs font-bold rounded-md px-1.5 py-0.5 bg-muted-foreground/10">
                          {item.port}
                        </span>
                      )}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>Delivery</SidebarGroupLabel>
          <SidebarMenu>
            {services.deliveryList.map(item => (
              <SidebarMenuItem key={item.name}>
                <SidebarMenuButton
                  asChild
                  isActive={location.pathname.includes(`/services/${item.category}/${item.name}`)}
                >
                  <Link to={`/services/delivery/${item.name}`}>
                    <ServiceStatusComp service={item} />
                    <span>{item.name}</span>
                    {item.port && (
                      <span className="ml-auto text-xs font-bold rounded-md px-1.5 py-0.5 bg-muted-foreground/10">
                        {item.port}
                      </span>
                    )}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
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
