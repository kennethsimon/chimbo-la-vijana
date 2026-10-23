"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LogIn } from "lucide-react";
import { api, post } from "../../lib/api";
import { getStaffHome } from "../../lib/authRouting.mjs";
import { useToast } from "../../components/ToastProvider";
import { Button, Card, CardContent, Field, Spinner, TextInput } from "../../components/ui";
import { BrandMark } from "../../components/BrandMark";
import { ThemeToggle } from "../../components/ThemeToggle";
import { LanguageSwitcher } from "../../components/LanguageProvider";

export default function LoginPage() {
  const toast = useToast();
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    let active = true;
    api("/auth/me", { cache: "no-store" })
      .then(({ user }) => {
        if (active) window.location.replace(getStaffHome(user));
      })
      .catch(() => {
        if (active) setCheckingSession(false);
      });
    return () => {
      active = false;
    };
  }, []);

  async function submit(event) {
    event.preventDefault();
    setLoading(true);
    try {
      const { user } = await post("/auth/login", form);
      toast.success(`Welcome back, ${user.name}.`);
      window.location.replace(getStaffHome(user));
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_10%_0%,rgba(245,185,66,0.22),transparent_32%),linear-gradient(135deg,hsl(var(--background))_0%,hsl(var(--secondary))_58%,hsl(var(--background))_100%)] px-4 py-6">
      <div className="fixed right-4 top-4 z-10 flex items-center gap-2">
        <ThemeToggle />
        <LanguageSwitcher />
      </div>
      <div className="mx-auto flex min-h-[calc(100vh-48px)] w-full max-w-md flex-col justify-center">
        <Link className="mb-6 flex items-center gap-3" href="/register">
          <BrandMark />
          <span>
            <span className="block text-lg font-bold">Chimbo La Vijana Brunch</span>
            <span className="block text-sm text-muted-foreground">Ingia kwa timu ya tukio</span>
          </span>
        </Link>

        <Card>
          <CardContent className="grid gap-5 p-6">
            <div>
              <div className="mb-3 inline-flex rounded-full bg-accent/20 px-3 py-1 text-xs font-bold uppercase text-accent-foreground">Timu ya tukio</div>
              <h1 className="text-3xl font-bold tracking-normal">Ingia kwenye mfumo</h1>
              <p className="mt-2 text-sm text-muted-foreground">Wasimamizi na wahudumu wa mabanda hutumia akaunti zilizotengenezwa na admin.</p>
            </div>

            <form className="grid gap-4" onSubmit={submit}>
              <Field label="Email">
                <TextInput type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
              </Field>
              <Field label="Nenosiri">
                <TextInput type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
              </Field>
              <Button disabled={loading || checkingSession} size="lg">
                {loading || checkingSession ? <Spinner /> : <LogIn size={18} />}
                {checkingSession ? "Inakagua..." : loading ? "Inaingia..." : "Ingia"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
