"use client";

import { logoutAction } from "@/actions/auth/logout";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

export function AccountMenu({
  variant = "outline",
  size = "sm",
  className,
  align = "end"
}: {
  variant?: React.ComponentProps<typeof Button>["variant"];
  size?: React.ComponentProps<typeof Button>["size"];
  className?: string;
  align?: "start" | "center" | "end";
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size={size} className={className}>
          Account
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="w-44">
        <DropdownMenuItem asChild>
          <form action={logoutAction} className="w-full">
            <button type="submit" className="w-full text-left">
              Uitloggen
            </button>
          </form>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

