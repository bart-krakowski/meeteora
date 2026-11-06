import {
  Calendar03Icon,
  LayoutDashboardIcon,
  ListViewIcon,
} from "@hugeicons/core-free-icons";
import type { IconSvgElement } from "@hugeicons/react";

export interface NavItem {
  title: string;
  href: string;
  icon: IconSvgElement;
}

export const navItems: Array<NavItem> = [
  { title: "Overview", href: "/", icon: LayoutDashboardIcon },
  { title: "Calendar", href: "/calendar", icon: Calendar03Icon },
  { title: "Events", href: "/events", icon: ListViewIcon },
];

export function findNavItem(pathname: string): NavItem | undefined {
  return navItems.find((item) => item.href === pathname);
}
