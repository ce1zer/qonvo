"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import { setUserRole } from "@/actions/admin/setUserRole";

export type AdminUserRow = {
  user_id: string;
  email: string;
  role: "member" | "company_admin" | "platform_admin";
  company_slug: string | null;
};

export function UsersTable({ users }: { users: AdminUserRow[] }) {
  const [isPending, startTransition] = useTransition();

  function onChangeRole(userId: string, current: AdminUserRow["role"], next: "member" | "company_admin") {
    if (current === "platform_admin") {
      toast.error("Platform admins kun je hier niet aanpassen.");
      return;
    }

    const ok = confirm(`Rol wijzigen naar “${next === "member" ? "Lid" : "Bedrijfsbeheerder"}”?`);
    if (!ok) return;

    startTransition(async () => {
      const res = await setUserRole(userId, next);
      if (!res.ok) toast.error(res.message);
      else {
        toast.success(res.message);
        window.location.reload();
      }
    });
  }

  return (
    <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
      <div className="grid grid-cols-12 gap-2 border-b border-zinc-200 bg-zinc-50 px-4 py-3 text-xs font-medium uppercase tracking-wide text-zinc-500">
        <div className="col-span-4">E-mail</div>
        <div className="col-span-4">User ID</div>
        <div className="col-span-2">Bedrijf</div>
        <div className="col-span-2">Rol</div>
      </div>

      {users.map((u) => (
        <div key={u.user_id} className="grid grid-cols-12 gap-2 px-4 py-3 text-sm">
          <div className="col-span-4 min-w-0 truncate text-zinc-900">{u.email}</div>
          <div className="col-span-4 font-mono text-xs text-zinc-700">{u.user_id}</div>
          <div className="col-span-2 text-zinc-700">{u.company_slug ?? "—"}</div>
          <div className="col-span-2">
            {u.role === "platform_admin" ? (
              <span className="rounded-md bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-800">
                Platform admin
              </span>
            ) : (
              <select
                className="w-full rounded-md border border-zinc-200 bg-white px-2 py-1 text-sm"
                defaultValue={u.role}
                disabled={isPending}
                onChange={(e) => onChangeRole(u.user_id, u.role, e.target.value as "member" | "company_admin")}
              >
                <option value="member">Lid</option>
                <option value="company_admin">Bedrijfsbeheerder</option>
              </select>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

