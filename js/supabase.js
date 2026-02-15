// js/supabase.js
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const SUPABASE_URL = "https://tplsfwxuqjgnciufydtf.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRwbHNmd3h1cWpnbmNpdWZ5ZHRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEwODAxMjIsImV4cCI6MjA4NjY1NjEyMn0.VPPsMeDpneLsDeQfCT2073JYgHzyxkPPB6nBncI3LVM";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/* -------- AUTH -------- */
export async function signUpWithProfile({ email, password, nombre, rol }) {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;

  const user = data.user;
  if (!user) {
    return {
      ok: true,
      needsEmailConfirmation: true,
      message: "Account created. Check your email to confirm, then log in.",
    };
  }

  const { error: profileError } = await supabase.from("profiles").insert([
    { id: user.id, email, nombre, rol },
  ]);
  if (profileError) throw profileError;

  return { ok: true, needsEmailConfirmation: false };
}

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}

export async function getMyProfile() {
  const session = await getSession();
  if (!session?.user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("id,email,rol,nombre,created_at")
    .eq("id", session.user.id)
    .single();

  if (error) throw error;
  return data;
}

/* -------- BABYSITTERS -------- */
export async function listBabysitters() {
  const { data, error } = await supabase
    .from("babysitters")
    .select("id,nombre,bio,tarifa_hora,experiencia_anos,rating,zona,disponible,created_at")
    .order("rating", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function ensureMyBabysitterRow(profile) {
  const session = await getSession();
  if (!session?.user) throw new Error("Not signed in.");
  if (profile?.rol !== "babysitter") return { ok: true, skipped: true };

  const myId = session.user.id;

  const { data: existing, error: readErr } = await supabase
    .from("babysitters")
    .select("id")
    .eq("id", myId)
    .maybeSingle();

  if (readErr) throw readErr;
  if (existing?.id) return { ok: true, existed: true };

  const { error: insErr } = await supabase.from("babysitters").insert([
    {
      id: myId,
      nombre: profile?.nombre || "Babysitter",
      bio: "New on KB Baby Sitter Match ✅",
      tarifa_hora: 25,
      experiencia_anos: 1,
      rating: 5.0,
      zona: "Key Biscayne",
      disponible: true,
    },
  ]);

  if (insErr) throw insErr;
  return { ok: true, created: true };
}

/* -------- BOOKINGS -------- */
export async function createBooking({
  babysitter_id,
  start_at,
  hours,
  rate_hora,
  subtotal,
  commission_pct,
  commission_amount,
  total,
  notes,
}) {
  const session = await getSession();
  if (!session?.user) throw new Error("Not signed in.");

  const parent_id = session.user.id;

  const { data, error } = await supabase
    .from("bookings")
    .insert([
      {
        parent_id,
        babysitter_id,
        start_at,
        hours,
        rate_hora,
        subtotal,
        commission_pct,
        commission_amount,
        total,
        notes,
        status: "requested",
      },
    ])
    .select("id,parent_id,babysitter_id,start_at,hours,rate_hora,subtotal,commission_amount,total,notes,status,created_at")
    .single();

  if (error) throw error;
  return data;
}

export async function listMyBookings() {
  const session = await getSession();
  if (!session?.user) throw new Error("Not signed in.");

  const { data, error } = await supabase
    .from("bookings")
    .select("id,start_at,hours,rate_hora,subtotal,commission_amount,total,status,created_at,babysitters(nombre)")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

/* Incoming for babysitter:
   - First: get bookings (RLS filters only yours)
   - Then: fetch parent profiles by parent_id (robust)
*/
export async function listIncomingBookings() {
  const session = await getSession();
  if (!session?.user) throw new Error("Not signed in.");

  const { data: bookings, error } = await supabase
    .from("bookings")
    .select("id,parent_id,start_at,hours,rate_hora,subtotal,commission_amount,total,status,created_at")
    .order("created_at", { ascending: false });

  if (error) throw error;
  const rows = bookings ?? [];
  if (!rows.length) return [];

  const parentIds = [...new Set(rows.map((r) => r.parent_id).filter(Boolean))];

  const { data: parents, error: pErr } = await supabase
    .from("profiles")
    .select("id,nombre,email")
    .in("id", parentIds);

  if (pErr) throw pErr;

  const map = new Map((parents ?? []).map((p) => [p.id, p]));

  return rows.map((r) => ({
    ...r,
    parent: map.get(r.parent_id) || null,
  }));
}

export async function updateBookingStatus(id, status) {
  const session = await getSession();
  if (!session?.user) throw new Error("Not signed in.");

  const allowed = new Set(["accepted", "declined", "cancelled", "paid", "requested"]);
  if (!allowed.has(status)) throw new Error("Invalid status.");

  const { data, error } = await supabase
    .from("bookings")
    .update({ status })
    .eq("id", id)
    .select("id,status")
    .single();

  if (error) throw error;
  return data;
}
