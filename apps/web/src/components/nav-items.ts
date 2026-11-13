import { CalendarCheckIcon, CalendarIcon, type Icon, LayoutDashboardIcon, TicketIcon, UsersIcon } from "@meeteora/ui/components/icons"

export interface NavItem {
  title: string;
  href: string;
  icon: Icon;
}

export const navItems: Array<NavItem> = [
  { title: "Overview", href: "/", icon: LayoutDashboardIcon },
  { title: "Bookings", href: "/bookings", icon: CalendarCheckIcon },
  { title: "Calendar", href: "/calendar", icon: CalendarIcon },
  { title: "Events", href: "/events", icon: TicketIcon },
  { title: "Resources", href: "/resources", icon: UsersIcon },
];

export function findNavItem(pathname: string): NavItem | undefined {
  return navItems.find((item) => item.href === pathname);
}
