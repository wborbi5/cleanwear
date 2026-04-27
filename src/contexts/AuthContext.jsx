import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../supabase.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const initializedRef = useRef(false);
  const prevSessionRef = useRef(null);

  useEffect(() => {
    if (!supabase) { setLoading(false); return; }

    // Get initial session
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      prevSessionRef.current = s;
      setLoading(false);
      if (s?.user) {
        identifyUser(s.user, false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        setSession(newSession);
        setUser(newSession?.user ?? null);

        const ph = window.posthog;
        if (event === "SIGNED_IN" && newSession?.user) {
          const u = newSession.user;
          const isFirstSignIn = !prevSessionRef.current;

          if (isFirstSignIn) {
            // New sign-in: identify, migrate anonymous data, alias
            identifyUser(u, true);
            await migrateAnonymousScans(u.id);
            await migrateLocalWardrobe(u.id);
          } else {
            identifyUser(u, false);
          }
          prevSessionRef.current = newSession;
        }

        if (event === "SIGNED_OUT") {
          prevSessionRef.current = null;
          ph?.reset();
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  function identifyUser(u, isNew) {
    const ph = window.posthog;
    if (!ph) return;

    if (isNew) {
      // Capture the anonymous distinct_id before identifying
      const anonId = ph.get_distinct_id();
      ph.identify(u.id, { email: u.email, created_at: u.created_at });
      ph.capture("user_signed_up", { method: "magic_link" });
      // Alias merges anonymous profile into identified profile
      if (anonId && anonId !== u.id) {
        ph.alias(u.id, anonId);
      }
    } else {
      ph.identify(u.id, { email: u.email });
      ph.capture("user_logged_in", { method: "magic_link" });
    }
  }

  async function migrateAnonymousScans(userId) {
    if (!supabase) return;
    const ph = window.posthog;
    const distinctId = ph?.get_distinct_id();
    if (!distinctId) return;
    try {
      await supabase.rpc("migrate_anonymous_scans", {
        p_posthog_id: distinctId,
        p_user_id: userId,
      });
    } catch (e) {
      console.warn("Scan migration failed:", e);
    }
  }

  async function migrateLocalWardrobe(userId) {
    if (!supabase) return;
    try {
      const stored = localStorage.getItem("cw_wardrobe");
      if (!stored) return;
      const items = JSON.parse(stored);
      if (!items?.length) return;

      const rows = items.map((item) => ({
        user_id: userId,
        product_name: item.name,
        brand: item.brand || null,
        score: item.score || null,
        category: item.category || null,
        scan_data: item,
      }));

      const { error } = await supabase.from("wardrobe").insert(rows);
      if (!error) {
        localStorage.removeItem("cw_wardrobe");
      }
    } catch (e) {
      console.warn("Local wardrobe migration failed:", e);
    }
  }

  const signInWithEmail = useCallback(async (email) => {
    if (!supabase) return { error: { message: "Supabase not configured" } };
    // Send OTP code (6-digit). emailRedirectTo is kept as a fallback for
    // installations that still use the link form, but the email template
    // shows the code as primary — link prefetchers (Safe Links / Defender)
    // can't consume a code, only a click.
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: window.location.origin + "/auth/callback",
      },
    });
    return { error };
  }, []);

  const verifyEmailOtp = useCallback(async (email, token) => {
    if (!supabase) return { error: { message: "Supabase not configured" } };
    // signInWithOtp generates different token types depending on user state:
    //   - Existing user                    -> recovery_token     -> type 'magiclink'
    //   - New user (shouldCreateUser=true) -> confirmation_token -> type 'signup' / 'email'
    // verifyOtp({ type }) is strict about which token_type it matches.
    // Wrong-type attempts return "invalid or expired" without consuming the
    // real token, so we fire the two common types in parallel and take the
    // first non-error result. Single verify is ~3s; parallel keeps total
    // latency at ~3s instead of 6s sequential.
    const attempts = await Promise.all([
      supabase.auth.verifyOtp({ email, token, type: "email" }),
      supabase.auth.verifyOtp({ email, token, type: "magiclink" }),
    ]);
    const success = attempts.find((a) => !a.error);
    if (success) return { data: success.data, error: null };
    return { data: null, error: attempts[0].error };
  }, []);

  const signOut = useCallback(async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
  }, []);

  return (
    <AuthContext.Provider value={{ user, session, loading, signInWithEmail, verifyEmailOtp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
