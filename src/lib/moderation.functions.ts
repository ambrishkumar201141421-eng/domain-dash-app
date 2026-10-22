import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { scanText } from "@/lib/moderation";
import {
  CATEGORIES,
  SUBCATEGORIES,
  rewardRequired,
  type Category,
  type Compensation,
  type GroupPref,
  type ListingType,
} from "@/lib/campus";

type CreateTaskInput = {
  title: string;
  description: string | null;
  category: Category;
  reward: string;
  expiresAt: string | null;
  subcategory?: string | null;
  listingType?: ListingType | null;
  compensation?: Compensation | null;
  groupPref?: GroupPref | null;
  groupSize?: number | null;
  plannedFor?: string | null;
  locationNote?: string | null;
};


export class ModerationError extends Error {
  terms: string[];
  suspendedUntil: string | null;
  constructor(terms: string[], suspendedUntil: string | null) {
    super(
      "Your post was rejected for a policy violation. Your account is now under review for 30 days.",
    );
    this.name = "ModerationError";
    this.terms = terms;
    this.suspendedUntil = suspendedUntil;
  }
}

/**
 * Authoritative task creation. Text is screened before anything is stored;
 * flagged text is never written to the tasks table.
 */
export const createTaskChecked = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: CreateTaskInput) => {
    if (!CATEGORIES.includes(input.category)) throw new Error("Pick a section");
    if (!input.title?.trim()) throw new Error("A title is required");
    if (input.category === "Gigs" && !input.compensation) throw new Error("Choose paid, unpaid or skill exchange");
    if (rewardRequired(input.category, input.compensation) && !input.reward?.trim())
      throw new Error("Add the reward or what you offer in return");
    if (input.subcategory && !SUBCATEGORIES[input.category].includes(input.subcategory))
      throw new Error("Pick a type from the list");
    if (input.groupSize != null && (input.groupSize < 2 || input.groupSize > 50))
      throw new Error("Group size must be between 2 and 50");
    if ((input.locationNote ?? "").length > 80) throw new Error("Keep the meeting spot short");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Let a lapsed 30-day window clear itself before we check standing.
    await supabase.rpc("expire_verification");

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("status, suspended_until")
      .eq("id", userId)
      .single();
    if (profileError) throw new Error(profileError.message);

    if (profile.status !== "active") {
      return {
        ok: false as const,
        reason: "restricted" as const,
        status: profile.status,
        suspendedUntil: profile.suspended_until,
      };
    }

    const terms = scanText(data.title, data.description, data.reward ?? "", data.locationNote ?? "");
    if (terms.length > 0) {
      const { data: updated, error } = await supabase.rpc("record_violation", {
        p_content: [data.title, data.description ?? "", data.reward ?? "", data.locationNote ?? ""].join(" | "),
        p_terms: terms,
        p_context: "task",
      });
      if (error) throw new Error(error.message);
      const row = updated as unknown as { status: string; suspended_until: string | null } | null;
      return {
        ok: false as const,
        reason: "flagged" as const,
        status: row?.status ?? "in_verification",
        suspendedUntil: row?.suspended_until ?? null,
      };
    }

    const { data: task, error } = await supabase
      .from("tasks")
      .insert({
        poster_id: userId,
        title: data.title.trim(),
        description: data.description?.trim() || null,
        category: data.category,
        reward: (data.reward ?? "").trim(),
        expires_at: data.expiresAt,
        subcategory: data.subcategory || null,
        listing_type: data.category === "Gigs" ? (data.listingType ?? "request") : null,
        compensation: data.category === "Gigs" ? (data.compensation ?? null) : null,
        group_pref: data.category === "Playground" ? (data.groupPref ?? "either") : null,
        group_size:
          data.category === "Playground" && data.groupPref === "partner"
            ? 2
            : data.category === "Playground" || data.category === "Lounge"
              ? (data.groupSize ?? null)
              : null,
        planned_for: data.plannedFor || null,
        location_note: data.locationNote?.trim() || null,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    return { ok: true as const, id: task.id };
  });

/**
 * Admin verdict. "Guilty" permanently bans the account, kills live sessions and
 * invalidates its refresh tokens so no future login or API call succeeds.
 */
export const reviewFlagChecked = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { flagId: number; guilty: boolean }) => input)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: isAdmin, error: roleError } = await supabase.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });
    if (roleError) throw new Error(roleError.message);
    if (!isAdmin) throw new Error("Forbidden");

    const { data: flag, error: flagError } = await supabase
      .from("moderation_flags")
      .select("id, user_id")
      .eq("id", data.flagId)
      .single();
    if (flagError) throw new Error(flagError.message);

    const { error } = await supabase.rpc("review_flag", {
      p_flag_id: data.flagId,
      p_guilty: data.guilty,
    });
    if (error) throw new Error(error.message);

    if (data.guilty) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      // Ban at the auth layer: revokes refresh tokens and blocks all future logins.
      await supabaseAdmin.auth.admin.updateUserById(flag.user_id, { ban_duration: "876000h" });
    }

    return { ok: true as const };
  });
