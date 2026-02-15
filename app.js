// app.js
import { validateEmail, validatePassword, validateName } from "./js/validators.js";
import { saveUserSession, getUserSession, clearUserSession } from "./js/store.js";
import {
  signUpWithProfile,
  signIn,
  signOut,
  getSession,
  getMyProfile,
  listBabysitters,
  ensureMyBabysitterRow,
  createBooking,
  listMyBookings,
  listIncomingBookings,
  updateBookingStatus,
} from "./js/supabase.js";

const $ = (sel) => document.querySelector(sel);

const COMMISSION_PCT = 0;

const state = {
  mode: "signup",
  busy: false,
  profile: null,
  babysitters: [],
  selectedBabysitter: null,
};

function setBusy(v) {
  state.busy = v;
  document.body.classList.toggle("busy", v);
  [
    "#btnPrimary",
    "#btnSecondary",
    "#btnLogout",
    "#btnRefresh",
    "#btnSubmitBooking",
    "#btnReloadBookings",
    "#btnReloadIncoming",
  ].forEach((id) => {
    const el = $(id);
    if (el) el.disabled = v;
  });
}

function toast(msg) {
  const t = $("#toast");
  if (!t) return alert(msg);
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => t.classList.remove("show"), 2400);
}

function banner(msg = "", type = "") {
  const el = $("#banner");
  if (!el) return;
  if (!msg) {
    el.className = "banner hidden";
    el.textContent = "";
    return;
  }
  el.className = `banner ${type}`.trim();
  el.textContent = msg;
}

function setMode(mode) {
  state.mode = mode;
  const isSignup = mode === "signup";

  $("#toggleSignup")?.classList.toggle("active", isSignup);
  $("#toggleLogin")?.classList.toggle("active", !isSignup);

  $("#modeTitle").textContent = isSignup ? "Create your account" : "Welcome back";
  $("#modeSubtitle").textContent = isSignup ? "Create a profile and start matching." : "Log in to continue.";

  $("#fieldNombre")?.classList.toggle("hidden", !isSignup);
  $("#fieldRol")?.classList.toggle("hidden", !isSignup);

  $("#btnPrimary").textContent = isSignup ? "Create account" : "Log in";
  $("#btnSecondary").textContent = isSignup ? "I already have an account" : "Create a new account";

  banner("");
}

function showAuthed(profile) {
  state.profile = profile;

  $("#authCard")?.classList.add("hidden");
  $("#authedCard")?.classList.remove("hidden");

  $("#helloName").textContent = profile?.nombre || "friend";
  $("#helloMeta").textContent = profile?.rol ? `Signed in as ${profile.rol}` : "Signed in";

  // Panels depending on role
  const isSitter = profile?.rol === "babysitter";
  $("#panelBabysitter")?.classList.toggle("hidden", !isSitter);
  $("#panelParent")?.classList.toggle("hidden", isSitter);

  // Long-term: ensure babysitter row exists (id = auth.uid())
  if (isSitter) {
    ensureMyBabysitterRow(profile).catch((e) => console.warn("ensure babysitter row:", e));
  }

  loadBabysitters();

  if (isSitter) loadIncoming();
  else loadBookings();
}

function showAnon() {
  $("#authedCard")?.classList.add("hidden");
  $("#authCard")?.classList.remove("hidden");

  $("#cards").innerHTML = "";
  $("#resultsMeta").textContent = "";
  $("#bookingsList").innerHTML = "";
  $("#incomingList").innerHTML = "";
}

function valTrim(id) {
  return ($(id)?.value ?? "").trim();
}

function cleanEmail(raw) {
  return raw.replace(/\u00A0/g, " ").trim().toLowerCase();
}

function validateForm() {
  const email = valTrim("#email");
  const password = $("#password")?.value ?? "";

  const e1 = validateEmail(email);
  if (e1) return e1;

  const e2 = validatePassword(password);
  if (e2) return e2;

  if (state.mode === "signup") {
    const nombre = valTrim("#nombre");
    const e3 = validateName(nombre);
    if (e3) return e3;

    const rol = $("#rol")?.value ?? "";
    if (!rol) return "Please select a role.";
  }

  return "";
}

/* ---------------- Matching ---------------- */

function getFilters() {
  const q = valTrim("#q").toLowerCase();
  const maxRateRaw = valTrim("#maxRate");
  const minRatingRaw = valTrim("#minRating");
  const onlyAvailable = $("#onlyAvailable")?.value ?? "all";

  const maxRate = maxRateRaw ? Number(maxRateRaw) : null;
  const minRating = minRatingRaw ? Number(minRatingRaw) : null;

  return { q, maxRate, minRating, onlyAvailable };
}

function applyFilters(list) {
  const { q, maxRate, minRating, onlyAvailable } = getFilters();

  return list.filter((b) => {
    const text = `${b.nombre ?? ""} ${b.bio ?? ""}`.toLowerCase();
    if (q && !text.includes(q)) return false;

    if (maxRate != null && Number.isFinite(maxRate) && b.tarifa_hora > maxRate) return false;
    if (minRating != null && Number.isFinite(minRating) && b.rating < minRating) return false;

    if (onlyAvailable === "true" && b.disponible !== true) return false;

    return true;
  });
}

function renderCards() {
  const container = $("#cards");
  const meta = $("#resultsMeta");

  const filtered = applyFilters(state.babysitters);
  meta.textContent = `${filtered.length} babysitters found`;

  if (!filtered.length) {
    container.innerHTML = `
      <div class="card" style="grid-column: 1 / -1;">
        <div class="name">No results</div>
        <div class="small">Try changing filters.</div>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered
    .map((b) => {
      const availableBadge = b.disponible ? "Available" : "Not available";
      const rate = `$${b.tarifa_hora}/hr`;
      const rating = `⭐ ${Number(b.rating).toFixed(1)}`;
      const exp = `${b.experiencia_anos} yrs exp`;
      const zone = b.zona || "Key Biscayne";
      const safeBio = (b.bio || "").replaceAll("<", "&lt;").replaceAll(">", "&gt;");

      return `
        <div class="card">
          <div class="cardTop">
            <div>
              <div class="name">${b.nombre}</div>
              <div class="small">${safeBio}</div>
            </div>
            <div class="badge">${availableBadge}</div>
          </div>

          <div class="stats">
            <div class="stat">${rate}</div>
            <div class="stat">${rating}</div>
            <div class="stat">${exp}</div>
            <div class="stat">${zone}</div>
          </div>

          <div class="cardActions">
            <button class="btn primary" type="button" data-action="request" data-id="${b.id}">Request booking</button>
            <button class="btn" type="button" data-action="details" data-id="${b.id}">View details</button>
          </div>
        </div>
      `;
    })
    .join("");

  container.querySelectorAll("button[data-action]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const action = btn.getAttribute("data-action");
      const id = btn.getAttribute("data-id");
      const b = state.babysitters.find((x) => String(x.id) === String(id));
      if (!b) return;

      if (action === "details") {
        toast(`⭐ ${b.nombre} — $${b.tarifa_hora}/hr, rating ${Number(b.rating).toFixed(1)}`);
      }
      if (action === "request") {
        openBookingModal(b);
      }
    });
  });
}

async function loadBabysitters() {
  setBusy(true);
  try {
    $("#resultsMeta").textContent = "Loading babysitters…";
    state.babysitters = await listBabysitters();
    renderCards();
  } catch (e) {
    console.error(e);
    $("#resultsMeta").textContent = "Could not load babysitters.";
    toast(e?.message || "Error loading babysitters");
  } finally {
    setBusy(false);
  }
}

/* ---------------- Booking Modal ---------------- */

function openBookingModal(babysitter) {
  // babysitters.id is expected to be the sitter auth uid (long term)
  state.selectedBabysitter = babysitter;

  $("#modalBabysitterName").textContent = babysitter.nombre;
  $("#bkRate").value = babysitter.tarifa_hora;

  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  $("#bkDate").value = `${yyyy}-${mm}-${dd}`;
  $("#bkTime").value = "18:00";
  $("#bkHours").value = "3";
  $("#bkNotes").value = "";

  updateBookingSummary();
  $("#modalBackdrop").classList.add("show");
}

function closeBookingModal() {
  $("#modalBackdrop").classList.remove("show");
  state.selectedBabysitter = null;
}

function dollarsInt(n) {
  return Math.max(0, Math.round(Number(n) || 0));
}

function updateBookingSummary() {
  const b = state.selectedBabysitter;
  if (!b) return;

  const hours = Math.max(1, Math.min(24, Number(valTrim("#bkHours")) || 1));
  const rate = dollarsInt(valTrim("#bkRate"));

  const subtotal = rate * hours;
  const commission_amount = Math.round(subtotal * (COMMISSION_PCT / 100));
  const total = subtotal + commission_amount;

  const date = valTrim("#bkDate");
  const time = valTrim("#bkTime");

  $("#bkSummary").innerHTML = `
    <div><b>When:</b> ${date || "—"} ${time || ""}</div>
    <div><b>Hours:</b> ${hours}</div>
    <div><b>Rate:</b> $${rate}/hr</div>
    <div style="margin-top:8px;"><b>Subtotal:</b> $${subtotal}</div>
    <div><b>Commission (${COMMISSION_PCT}%):</b> $${commission_amount}</div>
    <div><b>Total:</b> $${total}</div>
  `;
}

async function submitBooking() {
  const b = state.selectedBabysitter;
  if (!b) return;

  const date = valTrim("#bkDate");
  const time = valTrim("#bkTime");
  if (!date || !time) {
    toast("Please choose date + time");
    return;
  }

  const hours = Math.max(1, Math.min(24, Number(valTrim("#bkHours")) || 1));
  const rate_hora = dollarsInt(valTrim("#bkRate"));

  const subtotal = rate_hora * hours;
  const commission_amount = Math.round(subtotal * (COMMISSION_PCT / 100));
  const total = subtotal + commission_amount;

  const notes = valTrim("#bkNotes");
  const start_at = new Date(`${date}T${time}:00`).toISOString();

  setBusy(true);
  try {
    await createBooking({
      babysitter_id: b.id,
      start_at,
      hours,
      rate_hora,
      subtotal,
      commission_pct: COMMISSION_PCT,
      commission_amount,
      total,
      notes,
    });

    toast("Request sent ✅");
    closeBookingModal();

    // refresh correct panel
    if (state.profile?.rol === "babysitter") loadIncoming();
    else loadBookings();
  } catch (e) {
    console.error(e);
    toast(e?.message || "Could not create booking");
  } finally {
    setBusy(false);
  }
}

/* ---------------- Requests (Parent) ---------------- */

function fmtWhen(iso) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function renderBookings(list) {
  const el = $("#bookingsList");
  if (!list?.length) {
    el.innerHTML = `<div class="reqItem"><div class="reqTitle">No requests yet</div><div class="reqMeta">Create one from the babysitter cards.</div></div>`;
    return;
  }

  el.innerHTML = list
    .map((bk) => {
      const sitter = bk?.babysitters?.nombre || "Babysitter";
      return `
        <div class="reqItem">
          <div class="reqTop">
            <div>
              <div class="reqTitle">${sitter}</div>
              <div class="reqMeta">${fmtWhen(bk.start_at)} • ${bk.hours}h • $${bk.rate_hora}/hr</div>
              <div class="reqMeta">Subtotal $${bk.subtotal} • Total $${bk.total}</div>
            </div>
            <div class="reqStatus">${bk.status}</div>
          </div>
        </div>
      `;
    })
    .join("");
}

async function loadBookings() {
  try {
    const list = await listMyBookings();
    renderBookings(list);
  } catch (e) {
    console.error(e);
    $("#bookingsList").innerHTML = `<div class="reqItem"><div class="reqTitle">Could not load bookings</div><div class="reqMeta">${e?.message || ""}</div></div>`;
  }
}

/* ---------------- Incoming (Babysitter) ---------------- */

function renderIncoming(list) {
  const el = $("#incomingList");
  if (!list?.length) {
    el.innerHTML = `<div class="reqItem"><div class="reqTitle">No incoming requests</div><div class="reqMeta">Once parents book you, they’ll appear here.</div></div>`;
    return;
  }

  el.innerHTML = list
    .map((bk) => {
      const parentName = bk?.parent?.nombre || "Parent";
const parentEmail = bk?.parent?.email ? ` (${bk.parent.email})` : "";
      const canAct = bk.status === "requested";

      return `
        <div class="reqItem" data-bkid="${bk.id}">
          <div class="reqTop">
            <div>
              <div class="reqTitle">${parentName}${parentEmail}</div>
              <div class="reqMeta">${fmtWhen(bk.start_at)} • ${bk.hours}h • $${bk.rate_hora}/hr</div>
              <div class="reqMeta">Subtotal $${bk.subtotal} • Total $${bk.total}</div>
              ${
                canAct
                  ? `<div class="cardActions" style="margin-top:10px;">
                      <button class="btn primary" data-act="accept" data-id="${bk.id}">Accept</button>
                      <button class="btn" data-act="decline" data-id="${bk.id}">Decline</button>
                    </div>`
                  : ""
              }
            </div>
            <div class="reqStatus">${bk.status}</div>
          </div>
        </div>
      `;
    })
    .join("");

  el.querySelectorAll("button[data-act]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const act = btn.getAttribute("data-act");
      const id = btn.getAttribute("data-id");
      const newStatus = act === "accept" ? "accepted" : "declined";

      setBusy(true);
      try {
        await updateBookingStatus(id, newStatus);
        toast(`Marked as ${newStatus} ✅`);
        await loadIncoming();
      } catch (e) {
        console.error(e);
        toast(e?.message || "Could not update status");
      } finally {
        setBusy(false);
      }
    });
  });
}

async function loadIncoming() {
  try {
    const list = await listIncomingBookings();
    renderIncoming(list);
  } catch (e) {
    console.error(e);
    $("#incomingList").innerHTML = `<div class="reqItem"><div class="reqTitle">Could not load incoming</div><div class="reqMeta">${e?.message || ""}</div></div>`;
  }
}

/* ---------------- Auth ---------------- */

async function handlePrimary() {
  const err = validateForm();
  if (err) {
    banner("Validation error: " + err, "warning");
    toast(err);
    return;
  }

  setBusy(true);
  try {
    if (state.mode === "signup") {
      const email = cleanEmail(valTrim("#email"));
      const password = $("#password")?.value ?? "";
      const nombre = valTrim("#nombre");
      const rol = $("#rol")?.value ?? "padre";

      const res = await signUpWithProfile({ email, password, nombre, rol });

      if (res?.needsEmailConfirmation) {
        banner(res.message, "warning");
        toast("Check your email to confirm");
        return;
      }

      const session = await getSession();
      if (session?.user) saveUserSession({ userId: session.user.id, email: session.user.email, at: Date.now() });

      const profile = await getMyProfile();
      toast("Account created ✅");
      banner("", "");
      showAuthed(profile || { email, nombre, rol });
      return;
    }

    const email = cleanEmail(valTrim("#email"));
    const password = $("#password")?.value ?? "";

    await signIn(email, password);

    const session = await getSession();
    if (session?.user) saveUserSession({ userId: session.user.id, email: session.user.email, at: Date.now() });

    const profile = await getMyProfile();
    toast("Logged in ✅");
    banner("", "");
    showAuthed(profile || { email });
  } catch (e) {
    console.error(e);
    const msg = e?.message || "Unknown error";
    banner("ERROR: " + msg, "danger");
    toast(msg);
  } finally {
    setBusy(false);
  }
}

function handleSecondary() {
  setMode(state.mode === "signup" ? "login" : "signup");
}

async function handleLogout() {
  setBusy(true);
  try {
    await signOut();
    clearUserSession();
    showAnon();
    setMode("login");
    toast("Logged out");
  } catch (e) {
    console.error(e);
    toast(e?.message || "Logout failed");
  } finally {
    setBusy(false);
  }
}

/* ---------------- Wiring ---------------- */

function wire() {
  $("#toggleSignup")?.addEventListener("click", () => setMode("signup"));
  $("#toggleLogin")?.addEventListener("click", () => setMode("login"));

  $("#btnPrimary")?.addEventListener("click", (e) => { e.preventDefault(); handlePrimary(); });
  $("#btnSecondary")?.addEventListener("click", (e) => { e.preventDefault(); handleSecondary(); });
  $("#btnLogout")?.addEventListener("click", (e) => { e.preventDefault(); handleLogout(); });

  $("#btnRefresh")?.addEventListener("click", (e) => { e.preventDefault(); loadBabysitters(); });
  $("#btnReloadBookings")?.addEventListener("click", (e) => { e.preventDefault(); loadBookings(); });
  $("#btnReloadIncoming")?.addEventListener("click", (e) => { e.preventDefault(); loadIncoming(); });

  ["#q", "#maxRate", "#minRating", "#onlyAvailable"].forEach((id) => {
    $(id)?.addEventListener("input", renderCards);
    $(id)?.addEventListener("change", renderCards);
  });

  $("#btnCloseModal")?.addEventListener("click", () => closeBookingModal());
  $("#modalBackdrop")?.addEventListener("click", (e) => {
    if (e.target?.id === "modalBackdrop") closeBookingModal();
  });

  ["#bkDate", "#bkTime", "#bkHours", "#bkRate", "#bkNotes"].forEach((id) => {
    $(id)?.addEventListener("input", updateBookingSummary);
    $(id)?.addEventListener("change", updateBookingSummary);
  });

  $("#btnSubmitBooking")?.addEventListener("click", (e) => {
    e.preventDefault();
    submitBooking();
  });

  ["#email", "#password", "#nombre"].forEach((sel) => {
    $(sel)?.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !$("#authCard")?.classList.contains("hidden")) handlePrimary();
    });
  });
}

async function init() {
  wire();
  setMode("signup");

  try {
    const session = await getSession();
    if (session?.user) {
      const profile = await getMyProfile();
      showAuthed(profile || { email: session.user.email });
      return;
    }
  } catch (e) {
    console.warn("session check failed:", e);
  }

  const cached = getUserSession?.();
  if (cached?.email && $("#email")) $("#email").value = cached.email;

  showAnon();
}

init();
