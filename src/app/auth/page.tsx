"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const endpoint = mode === "sign-in" ? "/api/auth/sign-in/email" : "/api/auth/sign-up/email";
    const body = mode === "sign-in" ? { email, password } : { name, email, password };
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      setError(payload?.message || payload?.error || "Unable to authenticate");
      setLoading(false);
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <main className="min-h-dvh bg-gray-950 text-white flex items-center justify-center px-4">
      <section className="w-full max-w-md rounded-2xl border border-white/10 bg-gray-900 p-8 shadow-2xl">
        <p className="text-sm font-semibold text-blue-400">Real-time Meeting</p>
        <h1 className="mt-2 text-2xl font-bold">{mode === "sign-in" ? "Welcome back" : "Create your account"}</h1>
        <p className="mt-2 text-sm text-gray-400">Use your account to create and join secure meetings.</p>
        <form onSubmit={submit} className="mt-8 space-y-5">
          {mode === "sign-up" && (
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={name} onChange={(event) => setName(event.target.value)} required className="bg-white/5 border-white/10 text-white" />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required className="bg-white/5 border-white/10 text-white" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} required className="bg-white/5 border-white/10 text-white" />
          </div>
          {error && <p className="rounded-lg border border-red-400/30 bg-red-950/40 p-3 text-sm text-red-200">{error}</p>}
          <Button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-500">{loading ? "Please wait…" : mode === "sign-in" ? "Sign in" : "Create account"}</Button>
        </form>
        <button type="button" className="mt-6 text-sm text-blue-400 hover:text-blue-300" onClick={() => { setMode(mode === "sign-in" ? "sign-up" : "sign-in"); setError(null); }}>
          {mode === "sign-in" ? "Need an account? Register" : "Already have an account? Sign in"}
        </button>
      </section>
    </main>
  );
}
