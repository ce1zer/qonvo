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

const Step1Schema = z.object({
  companyName: z.string().min(2, "Vul een bedrijfsnaam in."),
  slug: z
    .string()
    .min(2, "Vul een slug in.")
    .max(64, "De slug is te lang.")
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Gebruik alleen kleine letters, cijfers en koppeltekens.")
});

const FullSchema = Step1Schema.extend({
  email: z.string().email("Vul een geldig e-mailadres in."),
  password: z.string().min(8, "Gebruik minimaal 8 tekens."),
  redirectTo: z.string().optional()
});

type FormValues = z.infer<typeof FullSchema>;
type SignupResponse = { ok?: boolean; message?: string; redirectTo?: string; fieldErrors?: Record<string, string> };

function slugify(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export default function SignupPage() {
  const [step, setStep] = useState<1 | 2>(1);
  const [isPending, startTransition] = useTransition();
  const [state, setState] = useState<{ ok: boolean; message: string; redirectTo?: string; fieldErrors?: Record<string, string> }>({
    ok: false,
    message: ""
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(FullSchema),
    mode: "onChange",
    defaultValues: {
      companyName: "",
      slug: "",
      email: "",
      password: "",
      redirectTo: ""
    }
  });

  // Avoid hydration mismatch: only read window location after mount.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const redirectTo = params.get("redirectTo") ?? "";
    form.setValue("redirectTo", redirectTo, { shouldDirty: false, shouldValidate: false });
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

  const fieldError = (name: keyof FormValues) => {
    return (
      (form.formState.errors[name]?.message as string | undefined) ??
      state.fieldErrors?.[String(name)]
    );
  };

  async function goNext() {
    const values = form.getValues();
    const parsed = Step1Schema.safeParse({
      companyName: values.companyName,
      slug: values.slug
    });
    if (!parsed.success) {
      parsed.error.issues.forEach((issue) => {
        const key = issue.path[0] as keyof FormValues;
        form.setError(key, { type: "manual", message: issue.message });
      });
      return;
    }
    setStep(2);
  }

  function onSubmit(values: FormValues) {
    startTransition(async () => {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          companyName: values.companyName,
          slug: values.slug,
          email: values.email,
          password: values.password,
          redirectTo: values.redirectTo ?? ""
        })
      }).catch(() => null);

      if (!res) {
        setState({ ok: false, message: "Er is iets misgegaan. Probeer het opnieuw." });
        return;
      }

      const json = (await res.json().catch(() => null)) as SignupResponse | null;
      if (!res.ok) {
        setState({
          ok: false,
          message: json?.message ?? "Er is iets misgegaan. Probeer het opnieuw.",
          fieldErrors: json?.fieldErrors
        });
        return;
      }

      setState({ ok: true, message: json?.message ?? "Je account is aangemaakt.", redirectTo: json?.redirectTo });
    });
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-6 px-6 py-10">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Account aanmaken</h1>
        <p className="text-sm text-zinc-600">
          Maak eerst je bedrijf aan, daarna je account. Je krijgt direct toegang tot het dashboard.
        </p>
      </header>

      <Card>
        <CardContent className="p-5">
        <div className="mb-4 flex items-center justify-between text-sm">
          <span className={step === 1 ? "font-medium text-zinc-900" : "text-zinc-500"}>
            Stap 1: Bedrijfsgegevens
          </span>
          <span className={step === 2 ? "font-medium text-zinc-900" : "text-zinc-500"}>
            Stap 2: Account
          </span>
        </div>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <input type="hidden" {...form.register("redirectTo")} />

          {step === 1 ? (
            <>
              <div className="space-y-1">
                <Label htmlFor="companyName">Bedrijfsnaam</Label>
                <Input
                  id="companyName"
                  autoComplete="organization"
                  placeholder="Bijv. Acme Training"
                  {...form.register("companyName", {
                    onChange: (e) => {
                      const nextName = String(e.target.value);
                      form.setValue("companyName", nextName, { shouldValidate: true });
                      const currentSlug = form.getValues("slug");
                      if (!currentSlug) {
                        form.setValue("slug", slugify(nextName), { shouldValidate: true });
                      }
                    }
                  })}
                />
                {fieldError("companyName") ? (
                  <p className="text-xs text-red-600">{fieldError("companyName")}</p>
                ) : (
                  <p className="text-xs text-zinc-500">Dit is zichtbaar voor je team.</p>
                )}
              </div>

              <div className="space-y-1">
                <Label htmlFor="slug">Slug</Label>
                <Input
                  id="slug"
                  autoComplete="off"
                  placeholder="bijv-acme-training"
                  {...form.register("slug", {
                    setValueAs: (v) => slugify(String(v))
                  })}
                />
                {fieldError("slug") ? (
                  <p className="text-xs text-red-600">{fieldError("slug")}</p>
                ) : (
                  <p className="text-xs text-zinc-500">
                    Je dashboard komt straks op <span className="font-mono">/bedrijf/[slug]</span>.
                  </p>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <Button
                  type="button"
                  onClick={() => void goNext()}
                  disabled={isPending}
                >
                  Verder
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="space-y-1">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="naam@bedrijf.nl"
                  {...form.register("email")}
                />
                {fieldError("email") ? (
                  <p className="text-xs text-red-600">{fieldError("email")}</p>
                ) : (
                  <p className="text-xs text-zinc-500">Gebruik een e-mailadres dat je kunt bereiken.</p>
                )}
              </div>

              <div className="space-y-1">
                <Label htmlFor="password">Wachtwoord</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  placeholder="Minimaal 8 tekens"
                  {...form.register("password")}
                />
                {fieldError("password") ? (
                  <p className="text-xs text-red-600">{fieldError("password")}</p>
                ) : (
                  <p className="text-xs text-zinc-500">Kies een sterk wachtwoord.</p>
                )}
              </div>

              {state.ok === false && state.message ? (
                <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {state.message}
                </div>
              ) : null}

              <div className="flex items-center justify-between gap-3 pt-2">
                <Button
                  type="button"
                  onClick={() => setStep(1)}
                  variant="outline"
                  disabled={isPending}
                >
                  Terug
                </Button>
                <Button
                  type="submit"
                  disabled={isPending || !form.formState.isValid}
                >
                  {isPending ? "Bezig..." : "Account aanmaken"}
                </Button>
              </div>
            </>
          )}
        </form>
        </CardContent>
      </Card>

      <p className="text-sm text-zinc-600">
        Heb je al een account?{" "}
        <Link href="/login" className="font-medium text-zinc-900 underline underline-offset-4">
          Inloggen
        </Link>
      </p>
    </main>
  );
}

