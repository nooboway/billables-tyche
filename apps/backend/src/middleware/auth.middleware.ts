import { Request, Response, NextFunction } from "express";
import { supabaseAdmin } from "../supabase";

export interface AuthPayload {
  /** Supabase auth.users.id (UUID) */
  userId: string;
  email: string;
  /** Will be resolved from business_members after auth */
  businessId?: string;
}

declare global {
  namespace Express {
    interface Request {
      auth?: AuthPayload;
    }
  }
}

/**
 * Verifies a Supabase access token from the Authorization header.
 * Works with tokens issued by both the web frontend (Supabase Auth)
 * and the mobile app (via our /api/v1/auth/login proxy).
 */
export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing token" });
    return;
  }
  const token = header.slice(7);

  try {
    const {
      data: { user },
      error,
    } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) {
      res.status(401).json({ error: "Invalid or expired token" });
      return;
    }

    // Look up the user's default business via business_members
    const { data: membership } = await supabaseAdmin
      .from("business_members")
      .select("business_id")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();

    req.auth = {
      userId: user.id,
      email: user.email ?? "",
      businessId: membership?.business_id ?? undefined,
    };

    next();
  } catch {
    res.status(401).json({ error: "Token verification failed" });
  }
}
