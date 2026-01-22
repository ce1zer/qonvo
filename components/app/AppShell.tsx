"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import type { NavItem } from "@/components/app/types";
import { SidebarNav } from "@/components/app/SidebarNav";
import { TopBar } from "@/components/app/TopBar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";

export function AppShell({
  sidebarTitle,
  sidebarSubtitle,
  navItems,
  sidebarFooter,
  topbarLeft,
  topbarRight,
  children,
  className
}: {
  sidebarTitle?: ReactNode;
  sidebarSubtitle?: ReactNode;
  navItems: NavItem[];
  sidebarFooter?: ReactNode;
  topbarLeft?: ReactNode;
  topbarRight?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("min-h-screen bg-muted/30", className)}>
      <div className="flex min-h-screen w-full">
        {/* Desktop sidebar */}
        <aside className="hidden w-64 flex-col gap-6 border-r bg-background p-5 md:flex">
          <div className="space-y-1">
            {sidebarSubtitle ? (
              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{sidebarSubtitle}</div>
            ) : null}
            {sidebarTitle ? <div className="text-sm font-semibold">{sidebarTitle}</div> : null}
          </div>
          <SidebarNav items={navItems} />
          {sidebarFooter ? (
            <div className="mt-auto border-t pt-4">
              <div className="space-y-2">{sidebarFooter}</div>
            </div>
          ) : null}
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur">
            <div className="flex items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
              <div className="flex min-w-0 items-center gap-3">
                {/* Mobile nav */}
                <div className="md:hidden">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" aria-label="Menu openen">
                        Menu
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-sm">
                      <DialogHeader>
                        <DialogTitle>Menu</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="space-y-1">
                          {sidebarSubtitle ? (
                            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                              {sidebarSubtitle}
                            </div>
                          ) : null}
                          {sidebarTitle ? <div className="text-sm font-semibold">{sidebarTitle}</div> : null}
                        </div>
                        <SidebarNav items={navItems} />
                        {sidebarFooter ? (
                          <div className="border-t pt-4">
                            <div className="space-y-2">{sidebarFooter}</div>
                          </div>
                        ) : null}
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>

                <div className="min-w-0">
                  <TopBar left={topbarLeft} right={topbarRight} />
                </div>
              </div>
            </div>
          </header>

          <main className="w-full flex-1 px-4 py-6 sm:px-6 lg:px-8">
            <div className="space-y-6">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}

