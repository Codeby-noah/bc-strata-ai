"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getStrataContext } from "@/lib/strata/context";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const credentialsSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(1).max(1024),
  legal_consent: z.literal("on"),
});

function fail(message: string): never {
  redirect(`/login?message=${encodeURIComponent(message)}`);
}

function readCredentials(formData: FormData, minimumPasswordLength: number) {
  const parsed = credentialsSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    legal_consent: formData.get("legal_consent"),
  });
  if (!parsed.success) {
    if (parsed.error.flatten().fieldErrors.legal_consent?.length) {
      fail("Agree to the Terms of Service and Privacy Policy to continue.");
    }
    fail("Enter a valid email address and password.");
  }
  if (parsed.data.password.length < minimumPasswordLength) {
    fail(`Use a password with at least ${minimumPasswordLength} characters.`);
  }
  return parsed.data;
}

async function callbackUrl() {
  const requestHeaders = await headers();
  const origin = requestHeaders.get("origin");
  const requestHost =
    requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  if (!origin || !requestHost) return undefined;
  try {
    const parsedOrigin = new URL(origin);
    const isLocalHost = ["localhost", "127.0.0.1"].includes(parsedOrigin.hostname);
    if (
      parsedOrigin.host.toLowerCase() !== requestHost.toLowerCase() ||
      !["http:", "https:"].includes(parsedOrigin.protocol) ||
      (parsedOrigin.protocol !== "https:" && !isLocalHost)
    ) {
      return undefined;
    }
    return new URL("/auth/callback", parsedOrigin).toString();
  } catch {
    return undefined;
  }
}

async function redirectAfterSession() {
  revalidatePath("/", "layout");
  const context = await getStrataContext();
  redirect(context?.activeMembership?.role === "member" ? "/portal" : "/dashboard");
}

export async function login(formData: FormData) {
  const { email, password } = readCredentials(formData, 1);
  const supabase = await createSupabaseServerClient({ writeCookies: true });
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) fail("Could not authenticate user");

  await supabase.rpc("accept_strata_pending_invites");
  await redirectAfterSession();
}

export async function signup(formData: FormData) {
  const { email, password } = readCredentials(formData, 12);
  const supabase = await createSupabaseServerClient({ writeCookies: true });
  const emailRedirectTo = await callbackUrl();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    ...(emailRedirectTo ? { options: { emailRedirectTo } } : {}),
  });
  if (error) fail("Could not sign up user. If you already have an account, sign in.");

  if (!data.session) {
    redirect(
      `/login?notice=${encodeURIComponent("Check your inbox for a verification link, then sign in.")}`,
    );
  }

  await supabase.rpc("accept_strata_pending_invites");
  await redirectAfterSession();
}
