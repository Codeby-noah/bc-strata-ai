"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { getStrataContext } from "@/lib/strata/context";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { z } from "zod";

const signInSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(1).max(1024),
  legal_consent: z.literal("on"),
});

const signUpSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(12).max(1024),
  legal_consent: z.literal("on"),
});

export type SignInState = {
  error?: string;
};

export type SignUpState = {
  error?: string;
  success?: string;
};

function getCallbackUrl(requestHeaders: Headers) {
  const origin = requestHeaders.get("origin");
  const requestHost =
    requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  if (!origin || !requestHost) {
    return undefined;
  }

  try {
    const parsedOrigin = new URL(origin);
    const isLocalHost = ["localhost", "127.0.0.1"].includes(
      parsedOrigin.hostname,
    );
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

export async function signUp(
  _previousState: SignUpState,
  formData: FormData,
): Promise<SignUpState> {
  const parsed = signUpSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    legal_consent: formData.get("legal_consent"),
  });
  if (!parsed.success) {
    if (parsed.error.flatten().fieldErrors.legal_consent?.length) {
      return { error: "Agree to the Terms of Service and Privacy Policy to continue." };
    }
    return {
      error: "Enter a valid email and a password with at least 12 characters.",
    };
  }
  const { email, password } = parsed.data;

  const callbackUrl = getCallbackUrl(await headers());
  const supabase = await createSupabaseServerClient({ writeCookies: true });
  const { error } = await supabase.auth.signUp({
    email,
    password,
    ...(callbackUrl ? { options: { emailRedirectTo: callbackUrl } } : {}),
  });

  if (error) {
    return {
      error:
        "We couldn't create the account. If you've already signed up, try signing in or ask your administrator for help.",
    };
  }

  return {
    success:
      "If email confirmation is enabled, check your inbox for a verification link. After verifying, sign in to create a workspace or ask an administrator to add you.",
  };
}

export async function signIn(
  _previousState: SignInState,
  formData: FormData,
): Promise<SignInState> {
  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    legal_consent: formData.get("legal_consent"),
  });
  if (!parsed.success) {
    if (parsed.error.flatten().fieldErrors.legal_consent?.length) {
      return { error: "Agree to the Terms of Service and Privacy Policy to continue." };
    }
    return { error: "Enter a valid email address and password." };
  }
  const { email, password } = parsed.data;

  const supabase = await createSupabaseServerClient({ writeCookies: true });
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: "We couldn't sign you in. Check your details and try again." };
  }

  await supabase.rpc("accept_strata_pending_invites");

  const context = await getStrataContext();
  if (context?.activeMembership?.role === "member") {
    redirect("/portal");
  }
  redirect("/dashboard");
}

export async function signOut() {
  const supabase = await createSupabaseServerClient({ writeCookies: true });
  const { error } = await supabase.auth.signOut();
  if (error) {
    throw new Error("Unable to sign out. Please try again.");
  }

  const cookieStore = await cookies();
  cookieStore.delete("bc-strata-active-id");
  redirect("/login");
}

export async function switchActiveStrata(formData: FormData) {
  const strataId = formData.get("strataId");
  if (typeof strataId !== "string" || !/^[0-9a-f-]{36}$/i.test(strataId)) {
    throw new Error("Choose a valid strata.");
  }

  const supabase = await createSupabaseServerClient({ writeCookies: true });
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    redirect("/login");
  }

  const { data, error } = await supabase
    .from("strata_memberships")
    .select("strata_id")
    .eq("strata_id", strataId)
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  if (error || !data) {
    throw new Error("You don't have access to that strata.");
  }

  const cookieStore = await cookies();
  cookieStore.set("bc-strata-active-id", strataId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  redirect("/dashboard");
}
