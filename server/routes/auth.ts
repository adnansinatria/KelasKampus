import { RequestHandler } from "express";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

class SupabaseConfigError extends Error {}

function getSupabaseClient(): SupabaseClient {
  const supabaseUrl = process.env.VITE_SUPABASE_URL ?? "";
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY ?? "";

  // Fail fast for clearly placeholder values to avoid attempting DNS/network calls
  const looksLikePlaceholder = (s: string) => !s || s.includes("your-supabase") || s.includes("your-anon-key") || s.includes("__BUILDER_PUBLIC_KEY__");
  if (looksLikePlaceholder(supabaseUrl) || looksLikePlaceholder(supabaseAnonKey)) {
    throw new SupabaseConfigError(
      "Supabase not configured: set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env (do not use the placeholder values).",
    );
  }

  return createClient(supabaseUrl, supabaseAnonKey);
}

export const handleSignup: RequestHandler = async (req, res) => {
  const { email, password, full_name } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return res.status(400).json({ error: error.message });
    // attempt to create profile row if user created
    try {
      const userId = (data as any)?.user?.id;
      if (userId && full_name) {
        await supabase.from("profiles").insert({ id: userId, full_name, user_id: userId, created_at: new Date() });
      }
    } catch (e) {
      // ignore profile creation errors in this dev placeholder
    }
    res.json({ data });
  } catch (err: any) {
    // Map clearly-configured errors to 503 so frontend knows it's a server configuration issue
    if (err instanceof SupabaseConfigError) {
      return res.status(503).json({ error: err.message });
    }

    // Map DNS/network errors to 502 (bad gateway)
    const causeCode = err?.cause?.code || err?.code || err?.errno;
    if (causeCode === "ENOTFOUND" || causeCode === "EAI_AGAIN") {
      return res.status(502).json({ error: `Could not resolve Supabase host (${String(err?.cause?.hostname || err.message)}). Check VITE_SUPABASE_URL in .env` });
    }

    res.status(500).json({ error: err.message || String(err) });
  }
};

export const handleSignin: RequestHandler = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return res.status(400).json({ error: error.message });
    res.json({ data });
  } catch (err: any) {
    if (err instanceof SupabaseConfigError) {
      return res.status(503).json({ error: err.message });
    }
    const causeCode = err?.cause?.code || err?.code || err?.errno;
    if (causeCode === "ENOTFOUND" || causeCode === "EAI_AGAIN") {
      return res.status(502).json({ error: `Could not resolve Supabase host. Check VITE_SUPABASE_URL in .env` });
    }
    res.status(500).json({ error: err.message || String(err) });
  }
};

export const handleGoogle: RequestHandler = async (req, res) => {
  // Redirect user to supabase oauth authorize URL (using anon key flow - placeholder)
  const redirectTo = req.query.redirect_to || process.env.CLIENT_ORIGIN || "http://localhost:8080/auth/callback";
  const supabaseUrl = process.env.VITE_SUPABASE_URL ?? "";
  if (!supabaseUrl) {
    return res.status(500).json({ error: "VITE_SUPABASE_URL is not configured on server" });
  }
  const authorizeUrl = `${supabaseUrl.replace(/\/$/, "")}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(
    String(redirectTo),
  )}`;
  res.redirect(authorizeUrl);
};

export const handleMe: RequestHandler = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: "Missing Authorization header" });
    const parts = (authHeader as string).split(" ");
    if (parts.length !== 2 || parts[0] !== "Bearer") return res.status(401).json({ error: "Invalid Authorization header" });
    const token = parts[1];

    const supabase = getSupabaseClient();
    const { data, error } = await supabase.auth.getUser(token);
    if (error) return res.status(400).json({ error: error.message });
    res.json({ user: data.user });
  } catch (err: any) {
    if (err instanceof SupabaseConfigError) {
      return res.status(503).json({ error: err.message });
    }
    const causeCode = err?.cause?.code || err?.code || err?.errno;
    if (causeCode === "ENOTFOUND" || causeCode === "EAI_AGAIN") {
      return res.status(502).json({ error: `Could not resolve Supabase host. Check VITE_SUPABASE_URL in .env` });
    }
    res.status(500).json({ error: err.message || String(err) });
  }
};
