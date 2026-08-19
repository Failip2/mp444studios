"use server";

import { headers } from "next/headers";
import { getTransport, headerSafe, readMailConfig } from "@/lib/mail";
import { ENQUIRY_TYPES, LIMITS, type ContactState, type EnquiryType } from "@/lib/contact";
import { site } from "@/content/site";

/**
 * Contact form submission.
 *
 * Everything here is authoritative — the client-side validation exists only so
 * the visitor gets an answer without a round trip, and is assumed to be absent.
 */

/**
 * How long a human plausibly takes to fill this in. Anything faster is
 * automated. Paired with a honeypot field below.
 */
const MIN_FILL_MS = 2500;

/** One wording for a delivered message, so the spam gates are indistinguishable. */
const SENT_MESSAGE = "Tak — din besked er sendt. Jeg vender tilbage hurtigst muligt.";

/**
 * In-memory rate limit.
 *
 * Good enough for a single-container site: it caps the damage a bot can do
 * without adding a datastore. It resets on redeploy and is per-process, so it
 * is a speed bump rather than a guarantee — the honeypot and timing checks do
 * most of the actual work.
 */
const RATE_LIMIT = { max: 5, windowMs: 10 * 60 * 1000 };
const hits = new Map<string, { count: number; resetAt: number }>();

function rateLimited(key: string): boolean {
  const now = Date.now();
  const entry = hits.get(key);

  // Opportunistic sweep so the map cannot grow without bound.
  if (hits.size > 5000) {
    for (const [k, v] of hits) if (v.resetAt < now) hits.delete(k);
  }

  if (!entry || entry.resetAt < now) {
    hits.set(key, { count: 1, resetAt: now + RATE_LIMIT.windowMs });
    return false;
  }
  entry.count += 1;
  return entry.count > RATE_LIMIT.max;
}

async function clientKey(): Promise<string> {
  const h = await headers();
  // nginx sets X-Forwarded-For; the left-most entry is the original client.
  const forwarded = h.get("x-forwarded-for");
  return (forwarded?.split(",")[0] ?? h.get("x-real-ip") ?? "unknown").trim();
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export async function sendContact(
  _prev: ContactState,
  formData: FormData,
): Promise<ContactState> {
  const get = (k: string) => String(formData.get(k) ?? "").trim();

  const values = {
    navn: get("navn"),
    email: get("email"),
    telefon: get("telefon"),
    type: get("type"),
    dato: get("dato"),
    besked: get("besked"),
  };

  // --- spam gates -----------------------------------------------------------
  // Both gates return the ordinary success response and send nothing. Telling a
  // bot it failed only teaches it what to change, and returning *nothing* would
  // leave the form silent for the rare human who trips a gate — so the reply is
  // identical to a real send either way, and the rejection is logged instead.
  if (get("website") !== "") {
    console.warn("[kontakt] honeypot tripped, discarding submission");
    return { status: "success", message: SENT_MESSAGE };
  }

  const startedAt = Number(formData.get("startedAt"));
  if (Number.isFinite(startedAt) && startedAt > 0 && Date.now() - startedAt < MIN_FILL_MS) {
    console.warn("[kontakt] submitted in under %dms, discarding submission", MIN_FILL_MS);
    return { status: "success", message: SENT_MESSAGE };
  }

  // --- validation -----------------------------------------------------------
  const errors: Record<string, string> = {};
  if (values.navn.length < 2) errors.navn = "Skriv venligst dit navn.";
  if (values.navn.length > LIMITS.navn) errors.navn = "Navnet er for langt.";
  if (!EMAIL_RE.test(values.email)) errors.email = "Skriv en gyldig e-mailadresse.";
  if (values.email.length > LIMITS.email) errors.email = "E-mailadressen er for lang.";
  if (values.telefon.length > LIMITS.telefon) errors.telefon = "Telefonnummeret er for langt.";
  if (values.dato.length > LIMITS.dato) errors.dato = "Datoen er for lang.";
  if (values.type && !ENQUIRY_TYPES.includes(values.type as EnquiryType)) {
    errors.type = "Vælg en gyldig type.";
  }
  if (values.besked.length < LIMITS.beskedMin) errors.besked = "Skriv lidt mere om opgaven.";
  if (values.besked.length > LIMITS.besked) errors.besked = "Beskeden er for lang.";

  if (Object.keys(errors).length > 0) {
    return { status: "error", errors, values, message: "Der mangler noget i formularen." };
  }

  // --- rate limit -----------------------------------------------------------
  if (rateLimited(await clientKey())) {
    return {
      status: "error",
      values,
      message: `For mange henvendelser på kort tid. Prøv igen om lidt, eller skriv direkte til ${site.email}.`,
    };
  }

  // --- send -----------------------------------------------------------------
  const config = readMailConfig();
  if (!config) {
    // Not configured. Say so plainly and hand over the direct address rather
    // than pretending the message went somewhere.
    return {
      status: "error",
      values,
      message: `Formularen er ikke sat op endnu. Skriv direkte til ${site.email}.`,
    };
  }

  const subject = headerSafe(
    `Henvendelse fra ${values.navn}${values.type ? ` — ${values.type}` : ""}`,
  );

  // Header block first, then the message. Built separately because a blank
  // separator line is itself falsy — folding it into the list and filtering
  // with Boolean silently drops it, running the message straight into the
  // metadata.
  const details = [
    `Navn:     ${values.navn}`,
    `E-mail:   ${values.email}`,
    values.telefon ? `Telefon:  ${values.telefon}` : null,
    values.type ? `Type:     ${values.type}` : null,
    values.dato ? `Dato:     ${values.dato}` : null,
  ].filter((line): line is string => line !== null);

  // ASCII rather than an em dash: the rule is repeated 40 times, and in a
  // quoted-printable body every multi-byte character becomes three escape
  // sequences — turning the divider into a wall of "=E2=80=94" in a plain view.
  const body = [...details, "", "-".repeat(40), "", values.besked, ""].join("\n");

  try {
    await getTransport(config).sendMail({
      // Gmail rewrites From to the authenticated account anyway, so send as
      // ourselves and put the visitor in Reply-To — that way hitting reply in
      // the mail client goes to them, not to us.
      from: `"${headerSafe(site.name, 60)}" <${config.user}>`,
      to: config.to,
      replyTo: `"${headerSafe(values.navn, 60)}" <${headerSafe(values.email)}>`,
      subject,
      text: body,
    });
  } catch (err) {
    // The real reason belongs in the server log, not on the visitor's screen.
    console.error("[kontakt] send failed:", err);
    return {
      status: "error",
      values,
      message: `Beskeden kunne ikke sendes lige nu. Prøv igen, eller skriv direkte til ${site.email}.`,
    };
  }

  return { status: "success", message: SENT_MESSAGE };
}
