"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { sendContact } from "@/app/kontakt/actions";
import {
  ENQUIRY_TYPES,
  LIMITS,
  initialContactState,
  type ContactState,
} from "@/lib/contact";

/**
 * The enquiry form.
 *
 * Progressive by construction: it is a plain <form> wired to a Server Action,
 * so it submits and validates without JavaScript. The client-side pieces —
 * inline errors, the pending state, the honeypot timer — are refinements on top
 * of something that already works.
 */

const field =
  "w-full border-b border-hairline bg-transparent py-3 text-[0.9375rem] " +
  "outline-none transition-colors duration-300 placeholder:text-ink-faint " +
  "focus:border-ink";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="mt-10 inline-flex items-center gap-3 rounded-full bg-ink px-8 py-4 text-[0.875rem] text-paper transition-all duration-500 [transition-timing-function:var(--ease-weight)] hover:scale-[1.03] disabled:scale-100 disabled:opacity-50"
    >
      {pending ? "Sender…" : "Send besked"}
      <span
        aria-hidden="true"
        className="transition-transform duration-500 [transition-timing-function:var(--ease-material)] group-hover:translate-x-1"
      >
        →
      </span>
    </button>
  );
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="mt-2 text-[0.8125rem] text-ink" role="alert">
      {message}
    </p>
  );
}

export function ContactForm() {
  const [state, formAction] = useActionState<ContactState, FormData>(
    sendContact,
    initialContactState,
  );
  const formRef = useRef<HTMLFormElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);

  /*
   * Timestamp for the timing check.
   *
   * Set on mount rather than rendered on the server: this page is statically
   * prerendered, so a server-rendered timestamp would be the build time and the
   * check would pass for everyone, bots included.
   */
  const [startedAt, setStartedAt] = useState("");
  useEffect(() => setStartedAt(String(Date.now())), []);

  // Clear the form once a message has actually gone, and move focus to the
  // confirmation so it is announced rather than silently appearing.
  useEffect(() => {
    if (state.status === "success") {
      formRef.current?.reset();
      setStartedAt(String(Date.now()));
    }
    if (state.status !== "idle") statusRef.current?.focus();
  }, [state]);

  const v = state.values ?? {};
  const err = state.errors ?? {};
  const describedBy = (name: string) => (err[name] ? `${name}-error` : undefined);

  return (
    <div>
      <div
        ref={statusRef}
        tabIndex={-1}
        role="status"
        aria-live="polite"
        className={state.message ? "mb-10 outline-none" : "sr-only"}
      >
        {state.message && (
          <p
            className={[
              "rounded-[3px] border px-5 py-4 text-[0.9375rem]",
              state.status === "success"
                ? "border-ink bg-ink text-paper"
                : "border-hairline bg-paper-raised text-ink",
            ].join(" ")}
          >
            {state.message}
          </p>
        )}
      </div>

      <form ref={formRef} action={formAction} noValidate className="group">
        {/*
          Honeypot. Hidden from people with CSS rather than `type="hidden"`,
          because bots skip hidden inputs but happily fill visible ones they
          find in the DOM. aria-hidden and tabIndex keep it away from screen
          readers and the keyboard.
        */}
        <div aria-hidden="true" className="absolute left-[-9999px] h-px w-px overflow-hidden">
          <label htmlFor="website">Website</label>
          <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
        </div>
        <input type="hidden" name="startedAt" value={startedAt} readOnly />

        <div className="grid gap-x-10 gap-y-8 sm:grid-cols-2">
          <div>
            <label htmlFor="navn" className="label mb-1 block">
              Navn *
            </label>
            <input
              id="navn"
              name="navn"
              type="text"
              required
              maxLength={LIMITS.navn}
              autoComplete="name"
              defaultValue={v.navn}
              aria-invalid={!!err.navn}
              aria-describedby={describedBy("navn")}
              className={field}
              placeholder="Dit navn"
            />
            <FieldError id="navn-error" message={err.navn} />
          </div>

          <div>
            <label htmlFor="email" className="label mb-1 block">
              E-mail *
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              maxLength={LIMITS.email}
              autoComplete="email"
              defaultValue={v.email}
              aria-invalid={!!err.email}
              aria-describedby={describedBy("email")}
              className={field}
              placeholder="dig@eksempel.dk"
            />
            <FieldError id="email-error" message={err.email} />
          </div>

          <div>
            <label htmlFor="telefon" className="label mb-1 block">
              Telefon
            </label>
            <input
              id="telefon"
              name="telefon"
              type="tel"
              maxLength={LIMITS.telefon}
              autoComplete="tel"
              defaultValue={v.telefon}
              aria-invalid={!!err.telefon}
              aria-describedby={describedBy("telefon")}
              className={field}
              placeholder="Valgfrit"
            />
            <FieldError id="telefon-error" message={err.telefon} />
          </div>

          <div>
            <label htmlFor="type" className="label mb-1 block">
              Type opgave
            </label>
            <select
              id="type"
              name="type"
              defaultValue={v.type ?? ""}
              className={`${field} appearance-none`}
            >
              <option value="">Vælg…</option>
              {ENQUIRY_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <FieldError id="type-error" message={err.type} />
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="dato" className="label mb-1 block">
              Dato eller periode
            </label>
            <input
              id="dato"
              name="dato"
              type="text"
              maxLength={LIMITS.dato}
              defaultValue={v.dato}
              aria-invalid={!!err.dato}
              aria-describedby={describedBy("dato")}
              className={field}
              placeholder="F.eks. 14. juni, eller efteråret 2026"
            />
            <FieldError id="dato-error" message={err.dato} />
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="besked" className="label mb-1 block">
              Besked *
            </label>
            <textarea
              id="besked"
              name="besked"
              required
              rows={6}
              minLength={LIMITS.beskedMin}
              maxLength={LIMITS.besked}
              defaultValue={v.besked}
              aria-invalid={!!err.besked}
              aria-describedby={describedBy("besked")}
              className={`${field} resize-y`}
              placeholder="Fortæl lidt om opgaven — hvad, hvornår og hvor."
            />
            <FieldError id="besked-error" message={err.besked} />
          </div>
        </div>

        <Submit />

        <p className="mt-6 text-[0.8125rem] text-ink-faint">
          Felter markeret med * er påkrævede. Dine oplysninger bruges kun til at svare på din
          henvendelse.
        </p>
      </form>
    </div>
  );
}
