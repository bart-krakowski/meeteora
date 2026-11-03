import {
  CalendarDaysIcon,
  LayoutDashboardIcon,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
}

export const navItems: Array<NavItem> = [
  { title: 'Overview', href: '/', icon: LayoutDashboardIcon },
  { title: 'Calendar', href: '/calendar', icon: CalendarDaysIcon },
];

export function findNavItem(pathname: string): NavItem | undefined {
  return navItems.find((item) => item.href === pathname);
}
