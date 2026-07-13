"use client";

import { type FormEvent, useEffect, useState } from "react";

type Props = {
  isLoading: boolean;
  message: string | null;
  onSignIn: (email: string, password: string) => Promise<void>;
  onSignUp: (email: string, password: string) => Promise<void>;
  onMessage: (message: string | null) => void;
};

export function AuthPanel({
  isLoading,
  message,
  onSignIn,
  onSignUp,
  onMessage,
}: Props) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [language, setLanguage] = useState<"de" | "en">("de");
  const en = language === "en";
  const [isSubmitting, setIsSubmitting] = useState(false);
  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") || "").trim();
    const password = String(form.get("password") || "");
    setIsSubmitting(true);
    onMessage(null);
    try {
      if (mode === "login") await onSignIn(email, password);
      else await onSignUp(email, password);
    } catch (error) {
      onMessage(
        error instanceof Error
          ? error.message
          : en
            ? "Sign-in failed."
            : "Anmeldung fehlgeschlagen.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 p-6 text-white">
      <section className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-8">
        <p className="text-sm font-bold uppercase tracking-[0.3em] text-amber-400">
          Clash Tool
        </p>
        <button
          type="button"
          onClick={() => setLanguage(en ? "de" : "en")}
          className="float-right -mt-5 rounded-lg border border-white/10 px-3 py-1 text-xs font-bold"
        >
          {en ? "DE" : "EN"}
        </button>
        <h1 className="mt-3 text-3xl font-bold">
          {mode === "login"
            ? en
              ? "Sign in"
              : "Anmelden"
            : en
              ? "Create account"
              : "Account erstellen"}
        </h1>
        <p className="mt-2 text-sm text-slate-400">
          {en
            ? "Your Clash accounts and plans are securely assigned to your user."
            : "Deine Clash-Accounts und Planungen werden sicher deinem Benutzer zugeordnet."}
        </p>
        <form onSubmit={submit} className="mt-6 flex flex-col gap-4">
          <input
            required
            name="email"
            type="email"
            autoComplete="email"
            placeholder={en ? "Email address" : "E-Mail-Adresse"}
            className="rounded-xl border border-white/10 bg-slate-900 p-3"
          />
          <input
            required
            minLength={8}
            name="password"
            type="password"
            autoComplete={
              mode === "login" ? "current-password" : "new-password"
            }
            placeholder={
              en
                ? "Password (at least 8 characters)"
                : "Passwort (mindestens 8 Zeichen)"
            }
            className="rounded-xl border border-white/10 bg-slate-900 p-3"
          />
          {message ? (
            <p className="rounded-xl bg-amber-400/10 p-3 text-sm text-amber-100">
              {message}
            </p>
          ) : null}
          <button
            disabled={isLoading || isSubmitting}
            className="rounded-xl bg-amber-400 p-3 font-bold text-slate-950 disabled:opacity-50"
          >
            {isSubmitting
              ? en
                ? "Please wait …"
                : "Bitte warten …"
              : mode === "login"
                ? en
                  ? "Sign in"
                  : "Anmelden"
                : en
                  ? "Register"
                  : "Registrieren"}
          </button>
        </form>
        <button
          type="button"
          onClick={() => {
            setMode(mode === "login" ? "register" : "login");
            onMessage(null);
          }}
          className="mt-4 w-full text-sm text-slate-300"
        >
          {mode === "login"
            ? en
              ? "No account yet? Register"
              : "Noch keinen Account? Registrieren"
            : en
              ? "Already registered? Sign in"
              : "Bereits registriert? Anmelden"}
        </button>
      </section>
    </main>
  );
}
