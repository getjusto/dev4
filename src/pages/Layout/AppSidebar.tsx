import {Search, Settings, Star} from 'lucide-react'
import {useMemo, useState} from 'react'

import {Input} from '@/components/ui/input'
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
import {SwitchSmall} from '@/components/ui/switch-small'
import {H4} from '@/components/ui/typography'
import {cn} from '@/lib/utils'
import {Link, useLocation, useNavigate} from 'react-router-dom'
import {useSettings} from '../Settings/Context'
import {ServiceData} from '../Settings/useServices'
import {useProvideCommands} from './CommandBar/Context'
import CommandsButton from './CommandsButton'

function ServiceStatusComp({service}: {service: ServiceData}) {
  const {status: allStatus, setServiceOn} = useSettings()
  const status = allStatus[`${service.category}.${service.name}`]

  return (
    <SwitchSmall
      checked={status !== 'off'}
      className={cn('cursor-pointer', {
        '!bg-green-500': status === 'on',
        '!bg-red-500': status === 'error',
      })}
      onCheckedChange={(checked: boolean) => setServiceOn(service.category, service.name, checked)}
    />
  )
}

function FavoriteButton({service}: {service: ServiceData}) {
  const {settings, toggleFavorite} = useSettings()
  const isFavorite = settings.favoriteServices?.[`${service.category}.${service.name}`] ?? false

  return (
    <button
      type="button"
      className="cursor-pointer"
      onClick={e => {
        e.preventDefault()
        e.stopPropagation()
        toggleFavorite(service.category, service.name)
      }}
    >
      <Star
        className={cn('h-3.5 w-3.5 transition-colors', {
          'fill-yellow-400 text-yellow-400': isFavorite,
          'text-muted-foreground/40 hover:text-muted-foreground': !isFavorite,
        })}
      />
    </button>
  )
}

function ServiceItem({item, isActive}: {item: ServiceData; isActive: boolean}) {
  return (
    <SidebarMenuItem key={item.name}>
      <SidebarMenuButton asChild isActive={isActive}>
        <Link to={`/services/services/${item.name}`}>
          <ServiceStatusComp service={item} />
          <span className="flex-1">{item.name}</span>
          <div className="ml-auto flex items-center gap-1.5">
            {item.port && (
              <span className="text-xs font-bold rounded-md px-1.5 py-0.5 bg-muted-foreground/10">
                {item.port}
              </span>
            )}
            <FavoriteButton service={item} />
          </div>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}

export function AppSidebar() {
  const {services, settings} = useSettings()
  const location = useLocation()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')

  const allServices = [...services.servicesList]
  const favorites = settings.favoriteServices || {}

  const {favoriteServices, nonFavoriteServices} = useMemo(() => {
    const query = search.toLowerCase()
    const filtered = query
      ? allServices.filter(s => s.name.toLowerCase().includes(query))
      : allServices
    return {
      favoriteServices: filtered.filter(s => favorites[`${s.category}.${s.name}`]),
      nonFavoriteServices: filtered.filter(s => !favorites[`${s.category}.${s.name}`]),
    }
  }, [allServices, favorites, search])

  useProvideCommands(
    allServices.map(service => ({
      title: `Entrar a ${service.category} ${service.name}`,
      action: () => {
        navigate(`/services/${service.category}/${service.name}`)
      },
      category: 'Servicios',
      dependencies: [],
    })),
  )

  const isActive = (item: ServiceData) =>
    location.pathname.includes(`/services/${item.category}/${item.name}`)

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="h-5" data-tauri-drag-region />
        <Link to="/">
          <H4 className="text-center" data-tauri-drag-region>
            Justo Dev4
          </H4>
        </Link>
        <CommandsButton />
        <div className="relative px-2">
          <Search className="absolute left-4 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar servicio..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="h-7 pl-7 text-xs"
          />
        </div>
      </SidebarHeader>
      <SidebarContent>
        {favoriteServices.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>Favoritos</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {favoriteServices.map(item => (
                  <ServiceItem key={item.name} item={item} isActive={isActive(item)} />
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
        <SidebarGroup>
          <SidebarGroupLabel>Services</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {nonFavoriteServices.map(item => (
                <ServiceItem key={item.name} item={item} isActive={isActive(item)} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
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
