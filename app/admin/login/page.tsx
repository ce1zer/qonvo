"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const LoginSchema = z.object({
  email: z.string().email("Vul een geldig e-mailadres in."),
  password: z.string().min(1, "Vul je wachtwoord in."),
  redirectTo: z.string().optional()
});

type FormValues = z.infer<typeof LoginSchema>;
type LoginResponse = { ok?: boolean; message?: string; redirectTo?: string };

export default function AdminLoginPage() {
  const [isPending, startTransition] = useTransition();
  const [state, setState] = useState<{ ok: boolean; message: string; redirectTo?: string }>({ ok: false, message: "" });

  const form = useForm<FormValues>({
    resolver: zodResolver(LoginSchema),
    mode: "onChange",
    defaultValues: { email: "", password: "", redirectTo: "" }
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const redirectTo = params.get("redirectTo") ?? "/admin";
    const error = params.get("error") ?? "";
    form.setValue("redirectTo", redirectTo, { shouldDirty: false, shouldValidate: false });
    if (error) setState({ ok: false, message: error });
  }, [form]);

  useEffect(() => {
    if (!state.message) return;
    if (state.ok) toast.success(state.message);
    else toast.error(state.message);
  }, [state]);

  useEffect(() => {
    if (state.ok && state.redirectTo) {
      window.location.assign(state.redirectTo);
    }
  }, [state]);

  function onSubmit(values: FormValues) {
    startTransition(async () => {
      const res = await fetch("/api/admin/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          email: values.email,
          password: values.password,
          redirectTo: values.redirectTo ?? "/admin"
        })
      }).catch(() => null);

      if (!res) {
        setState({ ok: false, message: "Inloggen is niet gelukt. Probeer het opnieuw." });
        return;
      }

      const json = (await res.json().catch(() => null)) as LoginResponse | null;
      if (!res.ok) {
        setState({ ok: false, message: json?.message ?? "Inloggen is niet gelukt. Probeer het opnieuw." });
        return;
      }

      setState({ ok: true, message: json?.message ?? "Welkom terug.", redirectTo: json?.redirectTo ?? "/admin" });
    });
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-6 px-6 py-10">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Platformbeheer</h1>
        <p className="text-sm text-zinc-600">Log in met een platform admin account om door te gaan.</p>
      </header>

      <Card>
        <CardContent className="p-5">
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <input type="hidden" {...form.register("redirectTo")} />

            <div className="space-y-1">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" type="email" autoComplete="email" placeholder="naam@bedrijf.nl" {...form.register("email")} />
              {form.formState.errors.email?.message ? (
                <p className="text-xs text-red-600">{form.formState.errors.email.message}</p>
              ) : null}
            </div>

            <div className="space-y-1">
              <Label htmlFor="password">Wachtwoord</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                {...form.register("password")}
              />
              {form.formState.errors.password?.message ? (
                <p className="text-xs text-red-600">{form.formState.errors.password.message}</p>
              ) : null}
            </div>

            {state.ok === false && state.message ? (
              <div role="alert" aria-live="polite" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {state.message}
              </div>
            ) : null}

            <Button type="submit" className="w-full" disabled={isPending || !form.formState.isValid}>
              {isPending ? "Bezig..." : "Inloggen"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <p className="text-sm text-zinc-600">
        Naar de app?{" "}
        <Link href="/login" className="font-medium text-zinc-900 underline underline-offset-4">
          Normale login
        </Link>
      </p>
    </main>
  );
}

