/**
 * Shared shapes for the contact form.
 *
 * Kept out of the action module on purpose: a file marked `"use server"` may
 * only export async functions, so the constants and types the client component
 * needs have to live somewhere neutral that both sides can import.
 */

export type ContactState = {
  status: "idle" | "success" | "error";
  /** Shown above the form. */
  message?: string;
  /** Keyed by field name. */
  errors?: Record<string, string>;
  /** Echoed back so a rejected submission does not lose what was typed. */
  values?: Record<string, string>;
};

export const initialContactState: ContactState = { status: "idle" };

/** Enquiry types offered in the form, and accepted by the action. */
export const ENQUIRY_TYPES = [
  "Bryllup",
  "Event",
  "Kommerciel opgave",
  "Portræt",
  "Andet",
] as const;

export type EnquiryType = (typeof ENQUIRY_TYPES)[number];

/** Field limits, enforced server-side and mirrored as input attributes. */
export const LIMITS = {
  navn: 120,
  email: 200,
  telefon: 40,
  dato: 60,
  besked: 4000,
  beskedMin: 10,
} as const;
