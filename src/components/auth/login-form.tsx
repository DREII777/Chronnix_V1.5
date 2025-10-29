"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Step = "email" | "code";

export function LoginForm() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const codeInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (step === "code") {
      codeInputRef.current?.focus();
    }
  }, [step]);

  const handleEmailSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setMessage(null);

    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !trimmed.includes("@")) {
      setError("Entrez une adresse email valide");
      return;
    }

    startTransition(async () => {
      try {
        const response = await fetch("/api/auth/request-code", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: trimmed }),
        });
        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data.error ?? "Impossible d'envoyer le code");
        }
        setEmail(trimmed);
        setMessage("Nous avons envoyé un code à 8 chiffres sur votre email");
        setStep("code");
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Erreur inattendue");
      }
    });
  };

  const handleCodeSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setMessage(null);

    const normalizedCode = code.trim();
    if (!/^[0-9]{8}$/.test(normalizedCode)) {
      setError("Le code doit contenir 8 chiffres");
      return;
    }

    startTransition(async () => {
      try {
        const response = await fetch("/api/auth/verify-code", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, code: normalizedCode }),
        });
        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data.error ?? "Code invalide");
        }
        setMessage("Connexion réussie, redirection en cours...");
        router.replace("/");
        router.refresh();
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Code invalide");
      }
    });
  };

  const handleResend = () => {
    if (!email) return;
    setMessage(null);
    setError(null);
    startTransition(async () => {
      try {
        const response = await fetch("/api/auth/request-code", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });
        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data.error ?? "Impossible d'envoyer le code");
        }
        setMessage("Nouveau code envoyé");
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Erreur inattendue");
      }
    });
  };

  return (
    <div className="space-y-6">
      <header className="space-y-2 text-center">
        <h1 className="text-2xl font-semibold text-slate-900">Connexion Chronnix</h1>
        <p className="text-sm text-slate-500">
          Saisissez votre email pour recevoir un code de connexion à usage unique.
        </p>
      </header>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        {step === "email" ? (
          <form className="space-y-4" onSubmit={handleEmailSubmit}>
            <label className="space-y-2 text-sm">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Email professionnel
              </span>
              <Input
                autoFocus
                type="email"
                placeholder="prenom@entreprise.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                disabled={isPending}
              />
            </label>
            <Button type="submit" className="w-full" disabled={isPending}>
              Recevoir le code
            </Button>
          </form>
        ) : (
          <form className="space-y-4" onSubmit={handleCodeSubmit}>
            <div className="space-y-2 text-sm">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Code reçu par email
              </span>
              <Input
                ref={codeInputRef}
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={8}
                placeholder="12345678"
                value={code}
                onChange={(event) => setCode(event.target.value)}
                disabled={isPending}
              />
            </div>
            <Button type="submit" className="w-full" disabled={isPending}>
              Valider & accéder
            </Button>
            <button
              type="button"
              onClick={handleResend}
              disabled={isPending}
              className="w-full text-center text-xs font-medium text-slate-500 hover:text-slate-700"
            >
              Renvoyer le code
            </button>
          </form>
        )}

        {message ? <p className="mt-4 text-sm text-emerald-600">{message}</p> : null}
        {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
      </div>

      <p className="text-center text-xs text-slate-400">
        Sécurité : le code expire dans 10 minutes. Contactez votre administrateur si vous n&apos;avez pas accès.
      </p>
    </div>
  );
}
