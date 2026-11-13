import type * as React from "react";

export type IconProps = Omit<React.SVGProps<SVGSVGElement>, "children"> & {
  size?: number | string;
  title?: string;
};
export type Icon = React.ComponentType<IconProps>;

function IconSvg({
  size = 16,
  strokeWidth = 1.5,
  viewBox = "0 0 16 16",
  title,
  children,
  ...props
}: IconProps & { children: React.ReactNode }) {
  const shared = {
    xmlns: "http://www.w3.org/2000/svg",
    width: size,
    height: size,
    viewBox,
    fill: "none",
    stroke: "currentColor",
    strokeWidth,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    ...props,
  } as const;
  if (title) {
    return (
      <svg role="img" {...shared}>
        <title>{title}</title>
        {children}
      </svg>
    );
  }
  return (
    <svg aria-hidden="true" {...shared}>
      {children}
    </svg>
  );
}

const dot = (cx: number, cy: number) => (
  <circle cx={cx} cy={cy} r="0.99" fill="currentColor" stroke="none" />
);

export function AlertIcon(props: IconProps) {
  return (
    <IconSvg {...props}>
      <path d="M9.311 4.36 L13.012 11.022 C13.567 12.021 12.844 13.25 11.701 13.25 L4.299 13.25 C3.156 13.25 2.433 12.021 2.988 11.022 L6.689 4.36 C7.26 3.332 8.74 3.332 9.311 4.36 Z" />
      <line x1="8" y1="6.25" x2="8" y2="8.75" />
      {dot(8, 10.9)}
    </IconSvg>
  );
}

export function ArrowRightIcon(props: IconProps) {
  return (
    <IconSvg {...props}>
      <line x1="2.75" y1="8" x2="13.25" y2="8" />
      <path d="M8.5 3.25 L13.25 8 L8.5 12.75" />
    </IconSvg>
  );
}

export function BadgeCheckIcon(props: IconProps) {
  return (
    <IconSvg {...props}>
      <path d="M8.778 2.413 L9.618 3.129 C9.81 3.292 10.049 3.391 10.301 3.412 L11.4 3.499 C11.987 3.546 12.454 4.013 12.501 4.6 L12.588 5.699 C12.609 5.951 12.708 6.19 12.871 6.382 L13.587 7.222 C13.969 7.67 13.969 8.33 13.587 8.778 L12.871 9.618 C12.708 9.81 12.609 10.049 12.588 10.301 L12.501 11.4 C12.454 11.987 11.987 12.454 11.4 12.501 L10.301 12.588 C10.049 12.609 9.81 12.708 9.618 12.871 L8.778 13.587 C8.33 13.969 7.67 13.969 7.222 13.587 L6.382 12.871 C6.19 12.708 5.951 12.609 5.699 12.588 L4.6 12.501 C4.013 12.454 3.546 11.987 3.499 11.4 L3.412 10.301 C3.391 10.049 3.292 9.81 3.129 9.618 L2.413 8.778 C2.031 8.33 2.031 7.67 2.413 7.222 L3.129 6.382 C3.292 6.19 3.391 5.951 3.412 5.699 L3.499 4.6 C3.546 4.013 4.013 3.546 4.6 3.499 L5.699 3.412 C5.951 3.391 6.19 3.292 6.382 3.129 L7.222 2.413 C7.67 2.031 8.33 2.031 8.778 2.413 Z" />
      <path d="M5.5 8.25 L7.25 10 L10.5 6.5" />
    </IconSvg>
  );
}

export function BellIcon(props: IconProps) {
  return (
    <IconSvg {...props}>
      <path d="M3.75 10.75 V6.5 A4.25 4.25 0 0 1 12.25 6.5 V10.75 L13.25 11.75 H2.75 Z" />
      <line x1="6.5" y1="13.75" x2="9.5" y2="13.75" />
    </IconSvg>
  );
}

const calendarFrame = (
  <>
    <line x1="5.5" y1="1.75" x2="5.5" y2="4.5" />
    <line x1="10.5" y1="1.75" x2="10.5" y2="4.5" />
    <line x1="2.25" y1="7" x2="13.75" y2="7" />
  </>
);

export function CalendarIcon(props: IconProps) {
  return (
    <IconSvg {...props}>
      <rect x="2.25" y="3.25" width="11.5" height="10.5" rx="2" />
      {calendarFrame}
    </IconSvg>
  );
}

export function CalendarCheckIcon(props: IconProps) {
  return (
    <IconSvg {...props}>
      <path d="M8.5 13.75 L4.25 13.75 C3.145 13.75 2.25 12.855 2.25 11.75 L2.25 5.25 C2.25 4.145 3.145 3.25 4.25 3.25 L11.75 3.25 C12.855 3.25 13.75 4.145 13.75 5.25 L13.75 8.25" />
      {calendarFrame}
      <path d="M9.75 11.75 L11.25 13.25 L14 10.5" />
    </IconSvg>
  );
}

export function CalendarMinusIcon(props: IconProps) {
  return (
    <IconSvg {...props}>
      <path d="M7.75 13.75 L4.25 13.75 C3.145 13.75 2.25 12.855 2.25 11.75 L2.25 5.25 C2.25 4.145 3.145 3.25 4.25 3.25 L11.75 3.25 C12.855 3.25 13.75 4.145 13.75 5.25 L13.75 10.75" />
      {calendarFrame}
      <line x1="9.5" y1="12.75" x2="14" y2="12.75" />
    </IconSvg>
  );
}

export function CalendarPlusIcon(props: IconProps) {
  return (
    <IconSvg {...props}>
      <path d="M8.5 13.75 L4.25 13.75 C3.145 13.75 2.25 12.855 2.25 11.75 L2.25 5.25 C2.25 4.145 3.145 3.25 4.25 3.25 L11.75 3.25 C12.855 3.25 13.75 4.145 13.75 5.25 L13.75 8.5" />
      {calendarFrame}
      <line x1="11.75" y1="9.75" x2="11.75" y2="13.75" />
      <line x1="9.75" y1="11.75" x2="13.75" y2="11.75" />
    </IconSvg>
  );
}

export function CheckIcon(props: IconProps) {
  return (
    <IconSvg {...props}>
      <path d="M2.75 8.5 L6.25 12 L13.25 4.5" />
    </IconSvg>
  );
}

const chevron = <path d="M5.875 3.75 L10.125 8 L5.875 12.25" />;

export function ChevronRightIcon(props: IconProps) {
  return <IconSvg {...props}>chevron</IconSvg>;
}

export function ChevronDownIcon(props: IconProps) {
  return (
    <IconSvg {...props}>
      <g transform="rotate(90 8 8)">{chevron}</g>
    </IconSvg>
  );
}

export function ChevronUpIcon(props: IconProps) {
  return (
    <IconSvg {...props}>
      <g transform="rotate(-90 8 8)">{chevron}</g>
    </IconSvg>
  );
}

export function ChevronsUpDownIcon(props: IconProps) {
  return (
    <IconSvg {...props}>
      <path d="M4.75 6 L8 2.75 L11.25 6" />
      <path d="M4.75 10 L8 13.25 L11.25 10" />
    </IconSvg>
  );
}

export function CircleCheckIcon(props: IconProps) {
  return (
    <IconSvg {...props}>
      <circle cx="8" cy="8" r="6" />
      <path d="M5.25 8.25 L7.25 10.25 L10.75 6.25" />
    </IconSvg>
  );
}

export function CloseIcon(props: IconProps) {
  return (
    <IconSvg {...props}>
      <line x1="3.75" y1="3.75" x2="12.25" y2="12.25" />
      <line x1="12.25" y1="3.75" x2="3.75" y2="12.25" />
    </IconSvg>
  );
}

export function CopyIcon(props: IconProps) {
  return (
    <IconSvg {...props}>
      <rect x="5.25" y="5.25" width="8.5" height="8.5" rx="2" />
      <path d="M3.5 10.75 L2.875 10.75 C2.53 10.75 2.25 10.47 2.25 10.125 L2.25 4.25 C2.25 3.145 3.145 2.25 4.25 2.25 L10.125 2.25 C10.47 2.25 10.75 2.53 10.75 2.875 L10.75 3.5" />
    </IconSvg>
  );
}

export function CreditCardIcon(props: IconProps) {
  return (
    <IconSvg {...props}>
      <rect x="1.75" y="3.25" width="12.5" height="9.5" rx="2" />
      <line x1="1.75" y1="6.5" x2="14.25" y2="6.5" />
      <line x1="4" y1="10" x2="6.5" y2="10" />
    </IconSvg>
  );
}

export function EraserIcon(props: IconProps) {
  return (
    <IconSvg {...props}>
      <path d="M10.849 3.099 L12.901 5.151 C13.37 5.62 13.37 6.38 12.901 6.849 L6.5 13.25 L3.599 10.349 C3.13 9.88 3.13 9.12 3.599 8.651 L9.151 3.099 C9.62 2.63 10.38 2.63 10.849 3.099 Z" />
      <line x1="5.375" y1="6.875" x2="9.125" y2="10.625" />
      <line x1="6.5" y1="13.25" x2="13.75" y2="13.25" />
    </IconSvg>
  );
}

export function EyeIcon(props: IconProps) {
  return (
    <IconSvg {...props}>
      <path d="M2 8 C3.4 5.2 5.6 3.75 8 3.75 C10.4 3.75 12.6 5.2 14 8 C12.6 10.8 10.4 12.25 8 12.25 C5.6 12.25 3.4 10.8 2 8 Z" />
      <circle cx="8" cy="8" r="2.25" />
    </IconSvg>
  );
}

export function EyeOffIcon(props: IconProps) {
  return (
    <IconSvg {...props}>
      <path d="M7.171 3.809 C7.444 3.77 7.721 3.75 8 3.75 C10.4 3.75 12.6 5.2 14 8 C13.717 8.565 13.402 9.075 13.06 9.529 M8.829 12.191 C8.556 12.23 8.279 12.25 8 12.25 C5.6 12.25 3.4 10.8 2 8 C2.283 7.435 2.598 6.925 2.94 6.471" />
      <path d="M7.044 10.037 A2.25 2.25 0 0 1 5.963 8.956 M8.956 5.963 A2.25 2.25 0 0 1 10.037 7.044" />
      <line x1="2.75" y1="2.75" x2="13.25" y2="13.25" />
    </IconSvg>
  );
}

export function FlaskIcon(props: IconProps) {
  return (
    <IconSvg {...props}>
      <path d="M6.25 2 L6.25 6.264 C6.25 6.419 6.214 6.572 6.144 6.711 L3.474 12.053 C3.141 12.718 3.625 13.5 4.368 13.5 L11.632 13.5 C12.375 13.5 12.859 12.718 12.526 12.053 L9.856 6.711 C9.786 6.572 9.75 6.419 9.75 6.264 L9.75 2" />
      <line x1="5" y1="2" x2="11" y2="2" />
      <line x1="4.375" y1="10.25" x2="11.625" y2="10.25" />
    </IconSvg>
  );
}

export function InfoIcon(props: IconProps) {
  return (
    <IconSvg {...props}>
      <circle cx="8" cy="8" r="6" />
      <line x1="8" y1="7.25" x2="8" y2="11" />
      {dot(8, 4.85)}
    </IconSvg>
  );
}

export function LayoutDashboardIcon(props: IconProps) {
  return (
    <IconSvg {...props}>
      <rect x="2.25" y="2.75" width="11.5" height="10.5" rx="2" />
      <line x1="7" y1="2.75" x2="7" y2="13.25" />
      <line x1="2.25" y1="9.5" x2="7" y2="9.5" />
      <line x1="7" y1="6.5" x2="13.75" y2="6.5" />
    </IconSvg>
  );
}

export function LoaderIcon(props: IconProps) {
  return (
    <IconSvg {...props}>
      <path d="M14 8 A6 6 0 1 1 8 2" />
    </IconSvg>
  );
}

export function LogOutIcon(props: IconProps) {
  return (
    <IconSvg {...props}>
      <path d="M6.25 2.25 L4.75 2.25 C3.922 2.25 3.25 2.922 3.25 3.75 L3.25 12.25 C3.25 13.078 3.922 13.75 4.75 13.75 L6.25 13.75" />
      <line x1="6.75" y1="8" x2="13.5" y2="8" />
      <path d="M10.5 5 L13.5 8 L10.5 11" />
    </IconSvg>
  );
}

export function MoreHorizontalIcon(props: IconProps) {
  return (
    <IconSvg {...props}>
      {dot(3.25, 8)}
      {dot(8, 8)}
      {dot(12.75, 8)}
    </IconSvg>
  );
}

/** Sidebar toggle, Linear-style: a soft frame with the panel inset on the left. */
export function SidebarLeftIcon({ expanded = true, ...props }: IconProps & { expanded?: boolean }) {
  return (
    <IconSvg {...props}>
      <rect x="1.75" y="2.75" width="12.5" height="10.5" rx="3" />
      {/* The panel: wide when the sidebar is expanded, a sliver when hidden. */}
      <rect
        x="4"
        y="5"
        width={expanded ? 4 : 1.5}
        height="6"
        rx="0.75"
        fill="currentColor"
        stroke="none"
        style={{ width: expanded ? 4 : 1.5, transition: "width 200ms ease-out" }}
      />
    </IconSvg>
  );
}

export function SparklesIcon(props: IconProps) {
  return (
    <IconSvg {...props}>
      <path d="M7 4 C7.5 7.25 8.75 8.5 12 9 C8.75 9.5 7.5 10.75 7 14 C6.5 10.75 5.25 9.5 2 9 C5.25 8.5 6.5 7.25 7 4 Z" />
      <path d="M12 1.75 C12.225 3.212 12.787 3.775 14.25 4 C12.787 4.225 12.225 4.787 12 6.25 C11.775 4.787 11.213 4.225 9.75 4 C11.213 3.775 11.775 3.212 12 1.75 Z" />
    </IconSvg>
  );
}

export function TicketIcon(props: IconProps) {
  return (
    <IconSvg {...props}>
      <path d="M3.25 3.5 H12.75 A1.25 1.25 0 0 1 14 4.75 V6.25 A1.75 1.75 0 0 0 14 9.75 V11.25 A1.25 1.25 0 0 1 12.75 12.5 H3.25 A1.25 1.25 0 0 1 2 11.25 V9.75 A1.75 1.75 0 0 0 2 6.25 V4.75 A1.25 1.25 0 0 1 3.25 3.5 Z" />
      {dot(9.75, 5.75)}
      {dot(9.75, 8)}
      {dot(9.75, 10.25)}
    </IconSvg>
  );
}

export function UsersIcon(props: IconProps) {
  return (
    <IconSvg {...props}>
      <circle cx="6" cy="5.25" r="2.5" />
      <path d="M1.75 13.5 C2.25 11.25 3.9 9.75 6 9.75 C8.1 9.75 9.75 11.25 10.25 13.5" />
      <path d="M10.25 2.85 A2.5 2.5 0 0 1 10.25 7.65" />
      <path d="M11.75 10 C12.9 10.5 13.7 11.8 14 13.5" />
    </IconSvg>
  );
}

export function XCircleIcon(props: IconProps) {
  return (
    <IconSvg {...props}>
      <circle cx="8" cy="8" r="6" />
      <line x1="5.75" y1="5.75" x2="10.25" y2="10.25" />
      <line x1="10.25" y1="5.75" x2="5.75" y2="10.25" />
    </IconSvg>
  );
}

/** Google "G" brand mark (not in IconMCP), single colour like the icons above. */
export function GoogleIcon(props: IconProps) {
  return (
    <IconSvg viewBox="0 0 24 24" fill="currentColor" stroke="none" {...props}>
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </IconSvg>
  );
}
