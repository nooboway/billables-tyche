import { Request, Response } from "express";
import { supabaseAdmin } from "../supabase";

function isValidEmail(e: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
}

/**
 * Register a new user via Supabase Auth.
 * The `handle_new_user` database trigger automatically creates
 * a profile, business, membership, and role for every new signup.
 */
export async function register(req: Request, res: Response): Promise<void> {
  const { email, password, businessName, fullName } = req.body as {
    email: string;
    password: string;
    businessName?: string;
    fullName?: string;
  };

  if (!email || !password) {
    res.status(400).json({ error: "email and password are required" });
    return;
  }
  if (!isValidEmail(email)) {
    res.status(400).json({ error: "Invalid email address" });
    return;
  }
  if (password.length < 8) {
    res.status(400).json({ error: "Password must be at least 8 characters" });
    return;
  }
  if (typeof businessName === "string" && businessName.length > 200) {
    res.status(400).json({ error: "businessName too long" });
    return;
  }
  if (typeof fullName === "string" && fullName.length > 200) {
    res.status(400).json({ error: "fullName too long" });
    return;
  }

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: fullName ?? email.split("@")[0],
      firm_name: businessName ?? `${email.split("@")[0]}'s Firm`,
    },
  });

  if (error) {
    const status = error.message.includes("already") ? 409 : 400;
    res.status(status).json({ error: error.message });
    return;
  }

  const { data: session, error: signInErr } =
    await supabaseAdmin.auth.signInWithPassword({ email, password });

  if (signInErr || !session.session) {
    res.status(201).json({
      user: { id: data.user.id, email: data.user.email },
      message: "Account created. Please log in.",
    });
    return;
  }

  const { data: membership } = await supabaseAdmin
    .from("business_members")
    .select("business_id")
    .eq("user_id", data.user.id)
    .limit(1)
    .maybeSingle();

  let business = null;
  if (membership) {
    const { data: biz } = await supabaseAdmin
      .from("businesses")
      .select("id, name")
      .eq("id", membership.business_id)
      .single();
    business = biz;
  }

  res.status(201).json({
    token: session.session.access_token,
    refreshToken: session.session.refresh_token,
    user: { id: data.user.id, email: data.user.email },
    business,
  });
}

/**
 * Log in an existing user via Supabase Auth.
 */
export async function login(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body as { email: string; password: string };

  if (!email || !password) {
    res.status(400).json({ error: "email and password are required" });
    return;
  }
  if (!isValidEmail(email)) {
    res.status(400).json({ error: "Invalid email address" });
    return;
  }
  if (typeof password !== "string" || password.length > 1000) {
    res.status(400).json({ error: "Invalid password" });
    return;
  }

  const { data, error } = await supabaseAdmin.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const userId = data.user.id;

  const { data: membership } = await supabaseAdmin
    .from("business_members")
    .select("business_id")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();

  let business = null;
  if (membership) {
    const { data: biz } = await supabaseAdmin
      .from("businesses")
      .select("id, name")
      .eq("id", membership.business_id)
      .single();
    business = biz;
  }

  res.json({
    token: data.session.access_token,
    refreshToken: data.session.refresh_token,
    user: { id: userId, email: data.user.email },
    business,
  });
}