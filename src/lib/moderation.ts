// Shared, client-safe moderation rules. The authoritative check runs server-side
// in src/lib/moderation.functions.ts; the client uses this only for instant feedback.

const BLOCKED_TERMS = [
  // profanity
  "fuck",
  "shit",
  "bitch",
  "bastard",
  "asshole",
  "slut",
  "whore",
  "randi",
  "chutiya",
  "madarchod",
  "behenchod",
  "gaand",
  // illegal / dangerous
  "cocaine",
  "heroin",
  "weed",
  "ganja",
  "mdma",
  "lsd",
  "meth",
  "drugs",
  "gun",
  "pistol",
  "ammo",
  "escort",
  "hookup for cash",
  "sex",
  "nude",
  "porn",
  "hitman",
  "kill you",
  "bomb",
  "acid attack",
  "ragging",
  // exam / academic fraud
  "exam leak",
  "question paper leak",
  "fake degree",
  "fake marksheet",
  "proxy attendance",
  "write my exam",
  // scams / spam triggers
  "otp",
  "cvv",
  "credit card number",
  "bank password",
  "upi pin",
  "crypto investment",
  "double your money",
  "guaranteed returns",
  "click this link",
  "telegram channel",
  "loan approval",
  "betting",
  "satta",
  "casino",
  // system bypass
  "ignore previous instructions",
  "ignore all instructions",
  "system prompt",
  "you are now",
  "jailbreak",
  "drop table",
  "select * from",
  "admin override",
  "bypass verification",
  "<script",
];

const LEET: Record<string, string> = {
  "0": "o",
  "1": "i",
  "!": "i",
  "|": "i",
  "3": "e",
  "4": "a",
  "@": "a",
  "5": "s",
  $: "s",
  "7": "t",
  "8": "b",
  "9": "g",
  "+": "t",
  "(": "c",
  "€": "e",
};

/** Lowercase, strip accents, undo leetspeak, collapse repeats and separators. */
export function normalizeForModeration(input: string): string {
  const lowered = input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "");

  const deLeet = lowered.replace(/[01!|34@5$789+(€]/g, (c) => LEET[c] ?? c);

  return (
    deLeet
      // drop separators used to break up words: f.u.c.k, f-u-c-k, f_u_c_k, f u c k
      .replace(/[^a-z0-9\s]/g, "")
      // collapse stretched letters: fuuuuck -> fuck
      .replace(/([a-z])\1{2,}/g, "$1$1")
      .replace(/\s+/g, " ")
      .trim()
  );
}

function variants(text: string): string[] {
  const normalized = normalizeForModeration(text);
  // also a spaceless form so "f u c k" and "e x a m l e a k" are caught
  return [normalized, normalized.replace(/\s/g, "")];
}

/** Returns every blocked term found in the text. Empty array means the text is clean. */
export function scanText(...parts: (string | null | undefined)[]): string[] {
  const haystacks = variants(parts.filter(Boolean).join(" "));
  const hits = new Set<string>();

  for (const term of BLOCKED_TERMS) {
    const flat = term.replace(/\s/g, "");
    const spaced = normalizeForModeration(term);
    const pattern = new RegExp(`(^|[^a-z0-9])${flat}([^a-z0-9]|$)`, "i");

    for (const hay of haystacks) {
      if (pattern.test(hay) || hay.includes(spaced)) {
        hits.add(term);
        break;
      }
    }
  }

  return [...hits];
}

export const VERIFICATION_DAYS = 30;

export function restrictionMessage(
  status: string | null | undefined,
  suspendedUntil: string | null | undefined,
): string | null {
  if (status === "permanently_banned") {
    return "Your account has been permanently suspended following a policy violation.";
  }
  if (status === "in_verification") {
    const until = suspendedUntil
      ? new Date(suspendedUntil).toLocaleDateString(undefined, {
          day: "numeric",
          month: "short",
          year: "numeric",
        })
      : "further notice";
    return `Your account is under review for a policy violation. Access is restricted until ${until}.`;
  }
  return null;
}
