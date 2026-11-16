"use client";

import * as menu from "@base-ui/react/menu";
import { CheckIcon, ChevronRightIcon } from "@meeteora/ui/components/icons";
import { cn } from "cn";
import type * as React from "react";

function DropdownMenu({ ...props }: menu.Menu.Root.Props) {
  return <menu.Menu.Root data-slot="dropdown-menu" {...props} />;
}

function DropdownMenuPortal({ ...props }: menu.Menu.Portal.Props) {
  return <menu.Menu.Portal data-slot="dropdown-menu-portal" {...props} />;
}

function DropdownMenuTrigger({ ...props }: menu.Menu.Trigger.Props) {
  return <menu.Menu.Trigger data-slot="dropdown-menu-trigger" {...props} />;
}

function DropdownMenuContent({
  align = "start",
  alignOffset = 0,
  side = "bottom",
  sideOffset = 4,
  className,
  ...props
}: menu.Menu.Popup.Props &
  Pick<
    menu.Menu.Positioner.Props,
    "align" | "alignOffset" | "side" | "sideOffset"
  >) {
  return (
    <menu.Menu.Portal>
      <menu.Menu.Positioner
        className="isolate z-50 outline-none"
        align={align}
        alignOffset={alignOffset}
        side={side}
        sideOffset={sideOffset}
      >
        <menu.Menu.Popup
          data-slot="dropdown-menu-content"
          className={cn(
            "z-50 max-h-(--available-height) w-(--anchor-width) min-w-48 origin-(--transform-origin) overflow-x-hidden overflow-y-auto rounded-3xl bg-popover p-1.5 text-popover-foreground shadow-lg ring-1 ring-foreground/5 duration-100 outline-none data-[side=bottom]:slide-in-from-top-2 data-[side=inline-end]:slide-in-from-left-2 data-[side=inline-start]:slide-in-from-right-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 dark:ring-foreground/10 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:overflow-hidden data-closed:fade-out-0 data-closed:zoom-out-95",
            className,
          )}
          {...props}
        />
      </menu.Menu.Positioner>
    </menu.Menu.Portal>
  );
}

function DropdownMenuGroup({ ...props }: menu.Menu.Group.Props) {
  return <menu.Menu.Group data-slot="dropdown-menu-group" {...props} />;
}

function DropdownMenuLabel({
  className,
  inset,
  ...props
}: menu.Menu.GroupLabel.Props & {
  inset?: boolean;
}) {
  return (
    <menu.Menu.GroupLabel
      data-slot="dropdown-menu-label"
      data-inset={inset}
      className={cn(
        "px-3 py-2.5 text-xs text-muted-foreground data-inset:pl-9.5",
        className,
      )}
      {...props}
    />
  );
}

function DropdownMenuItem({
  className,
  inset,
  variant = "default",
  ...props
}: menu.Menu.Item.Props & {
  inset?: boolean;
  variant?: "default" | "destructive";
}) {
  return (
    <menu.Menu.Item
      data-slot="dropdown-menu-item"
      data-inset={inset}
      data-variant={variant}
      className={cn(
        "group/dropdown-menu-item relative flex cursor-default items-center gap-2.5 rounded-2xl px-3 py-2 text-sm font-medium outline-hidden select-none focus:bg-accent focus:text-accent-foreground not-data-[variant=destructive]:focus:**:text-accent-foreground data-inset:pl-9.5 data-[variant=destructive]:text-destructive data-[variant=destructive]:focus:bg-destructive/10 data-[variant=destructive]:focus:text-destructive dark:data-[variant=destructive]:focus:bg-destructive/20 data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 data-[variant=destructive]:*:[svg]:text-destructive",
        className,
      )}
      {...props}
    />
  );
}

function DropdownMenuSub({ ...props }: menu.Menu.SubmenuRoot.Props) {
  return <menu.Menu.SubmenuRoot data-slot="dropdown-menu-sub" {...props} />;
}

function DropdownMenuSubTrigger({
  className,
  inset,
  children,
  ...props
}: menu.Menu.SubmenuTrigger.Props & {
  inset?: boolean;
}) {
  return (
    <menu.Menu.SubmenuTrigger
      data-slot="dropdown-menu-sub-trigger"
      data-inset={inset}
      className={cn(
        "flex cursor-default items-center gap-2 rounded-2xl px-3 py-2 text-sm font-medium outline-hidden select-none focus:bg-accent focus:text-accent-foreground not-data-[variant=destructive]:focus:**:text-accent-foreground data-inset:pl-9.5 data-popup-open:bg-accent data-popup-open:text-accent-foreground data-open:bg-accent data-open:text-accent-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    >
      {children}
      <ChevronRightIcon className="ml-auto" />
    </menu.Menu.SubmenuTrigger>
  );
}

function DropdownMenuSubContent({
  align = "start",
  alignOffset = -3,
  side = "right",
  sideOffset = 0,
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuContent>) {
  return (
    <DropdownMenuContent
      data-slot="dropdown-menu-sub-content"
      className={cn(
        "w-auto min-w-36 rounded-3xl bg-popover p-1.5 text-popover-foreground shadow-lg ring-1 ring-foreground/5 duration-100 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 dark:ring-foreground/10 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
        className,
      )}
      align={align}
      alignOffset={alignOffset}
      side={side}
      sideOffset={sideOffset}
      {...props}
    />
  );
}

function DropdownMenuCheckboxItem({
  className,
  children,
  checked,
  inset,
  ...props
}: menu.Menu.CheckboxItem.Props & {
  inset?: boolean;
}) {
  return (
    <menu.Menu.CheckboxItem
      data-slot="dropdown-menu-checkbox-item"
      data-inset={inset}
      className={cn(
        "relative flex cursor-default items-center gap-2.5 rounded-2xl py-2 pr-8 pl-3 text-sm font-medium outline-hidden select-none focus:bg-accent focus:text-accent-foreground focus:**:text-accent-foreground data-inset:pl-9.5 data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      checked={checked}
      {...props}
    >
      <span
        className="pointer-events-none absolute right-2 flex items-center justify-center"
        data-slot="dropdown-menu-checkbox-item-indicator"
      >
        <menu.Menu.CheckboxItemIndicator>
          <CheckIcon />
        </menu.Menu.CheckboxItemIndicator>
      </span>
      {children}
    </menu.Menu.CheckboxItem>
  );
}

function DropdownMenuRadioGroup({ ...props }: menu.Menu.RadioGroup.Props) {
  return (
    <menu.Menu.RadioGroup data-slot="dropdown-menu-radio-group" {...props} />
  );
}

function DropdownMenuRadioItem({
  className,
  children,
  inset,
  ...props
}: menu.Menu.RadioItem.Props & {
  inset?: boolean;
}) {
  return (
    <menu.Menu.RadioItem
      data-slot="dropdown-menu-radio-item"
      data-inset={inset}
      className={cn(
        "relative flex cursor-default items-center gap-2.5 rounded-2xl py-2 pr-8 pl-3 text-sm font-medium outline-hidden select-none focus:bg-accent focus:text-accent-foreground focus:**:text-accent-foreground data-inset:pl-9.5 data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    >
      <span
        className="pointer-events-none absolute right-2 flex items-center justify-center"
        data-slot="dropdown-menu-radio-item-indicator"
      >
        <menu.Menu.RadioItemIndicator>
          <CheckIcon />
        </menu.Menu.RadioItemIndicator>
      </span>
      {children}
    </menu.Menu.RadioItem>
  );
}

function DropdownMenuSeparator({
  className,
  ...props
}: menu.Menu.Separator.Props) {
  return (
    <menu.Menu.Separator
      data-slot="dropdown-menu-separator"
      className={cn("-mx-1.5 my-1.5 h-px bg-border/50", className)}
      {...props}
    />
  );
}

function DropdownMenuShortcut({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="dropdown-menu-shortcut"
      className={cn(
        "ml-auto text-xs tracking-widest text-muted-foreground group-focus/dropdown-menu-item:text-accent-foreground",
        className,
      )}
      {...props}
    />
  );
}

export {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
};
