import "server-only";
import nodemailer, { type Transporter } from "nodemailer";

/**
 * SMTP transport for the contact form.
 *
 * Deliberately server-only and lazily constructed: the credentials must never
 * reach the client bundle, and a site with no SMTP configured should still
 * build and boot — the contact page falls back to showing the address and the
 * phone number directly.
 */

export type MailConfig = {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  /** Where enquiries are delivered. Defaults to the authenticated account. */
  to: string;
};

/**
 * Reads SMTP settings from the environment. Returns null when the deployment
 * has not been configured, which callers treat as "form unavailable" rather
 * than as an error.
 */
export function readMailConfig(): MailConfig | null {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) return null;

  const port = Number(process.env.SMTP_PORT ?? 587);
  return {
    host,
    port,
    // 465 is implicit TLS; 587 upgrades with STARTTLS.
    secure: port === 465,
    user,
    pass,
    to: process.env.CONTACT_TO || user,
  };
}

export const mailConfigured = () => readMailConfig() !== null;

let cached: Transporter | null = null;

/** One pooled transport per process, rather than a connection per enquiry. */
export function getTransport(config: MailConfig): Transporter {
  if (cached) return cached;
  cached = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: { user: config.user, pass: config.pass },
    pool: true,
    maxConnections: 2,
    /*
     * Deliberately short. Someone is watching a "Sender…" button while this
     * runs, so these are user-interface timeouts, not batch-job ones: a stalled
     * SMTP server should surface as "try again or email me directly" within a
     * few seconds rather than after a wait long enough to look like a hang.
     * Gmail normally completes the whole exchange in well under two seconds.
     */
    connectionTimeout: 7_000,
    greetingTimeout: 7_000,
    socketTimeout: 10_000,
  });
  return cached;
}

/**
 * Strips CR and LF from anything destined for a mail header.
 *
 * Subject and Reply-To are built from visitor input, and a newline inside a
 * header value is how header injection works — it lets an attacker append
 * their own headers, Bcc included. nodemailer guards most of this, but the
 * cheapest place to be certain is before the value ever reaches it.
 */
export function headerSafe(value: string, max = 200): string {
  return value.replace(/[\r\n]+/g, " ").trim().slice(0, max);
}
