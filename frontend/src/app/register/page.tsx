"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { ApiError } from "@/lib/api";
import { useAuth } from "@/components/auth-provider";
import { PublicOnly } from "@/components/public-only";

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (password !== confirmation) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 8) {
      setError("Password must contain at least 8 characters.");
      return;
    }

    setIsSubmitting(true);
    try {
      await register(name, email, password);
      router.replace("/dashboard");
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Unable to create your account. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <PublicOnly>
      <main className="auth-page">
        <section className="auth-card" aria-labelledby="register-heading">
          <p className="eyebrow">VoxInsight</p>
          <h1 id="register-heading">Create your account</h1>
          <p className="muted">Your Personal workspace is created automatically.</p>
          <form onSubmit={handleSubmit} className="auth-form">
            <label>
              Name
              <input type="text" autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} required maxLength={255} />
            </label>
            <label>
              Email
              <input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
            </label>
            <label>
              Password
              <input type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={8} maxLength={128} />
            </label>
            <label>
              Confirm password
              <input type="password" autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} required minLength={8} />
            </label>
            {error && <p className="form-error" role="alert">{error}</p>}
            <button type="submit" disabled={isSubmitting}>{isSubmitting ? "Creating account…" : "Create account"}</button>
          </form>
          <p className="muted">Already have an account? <Link href="/login">Sign in</Link></p>
        </section>
      </main>
    </PublicOnly>
  );
}
