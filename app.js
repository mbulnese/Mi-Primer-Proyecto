console.log("app.js cargado ✅");

// =====================
// KB Match - Supabase (Cloud) MVP
// =====================

// ✅ Cliente global (NO declaramos "const supabase" para evitar redeclare)
if (!window.supabaseClient) {
  window.supabaseClient = window.supabase.createClient(
    "https://tplsfwxuqjgnciufydtf.supabase.co",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRwbHNmd3h1cWpnbmNpdWZ5ZHRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEwODAxMjIsImV4cCI6MjA4NjY1NjEyMn0.VPPsMeDpneLsDeQfCT2073JYgHzyxkPPB6nBncI3LVM",
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}

let usuarioActual = null; // { id, email, rol, nombre, fecha, horario, edificioPerfil }

// =======================
// UI helpers
// =======================
function toast(id, msg, type = "") {
  const el = document.getElementById(id);
  if (!el) return;
  el.className = "toast show" + (type ? ` ${type}` : "");
  el.textContent = msg;
}

function clearToast(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.className = "toast";
  el.textContent = "";
}

function setLoading(btnId, loading, label = null) {
  const b = document.getElementById(btnId);
  if (!b) return;
  b.disabled = !!loading;
  if (label) b.textContent = label;
}

function mostrarPantalla(id) {
  ["pantalla1", "pantalla2", "pantalla3"].forEach(p => {
    const el = document.getElementById(p);
    if (el) el.style.display = (p === id) ? "block" : "none";
  });
}

function establecerFechaMinima(idInput) {
  const hoy = new Date().toISOString().split("T")[0];
  const input = document.getElementById(idInput);
  if (input) input.setAttribute("min", hoy);
}

function limpiarTelefono(tel) {
  return (tel || "").replace(/[^\d]/g, "");
}

function validarEmail(email) {
  return /^\S+@\S+\.\S+$/.test(email);
}

function iniciales(nombre, apellido) {
  const n = (nombre || "").trim();
  const a = (apellido || "").trim();
  return `${(n[0] || "K").toUpperCase()}${(a[0] || "B").toUpperCase()}`;
}

function ratingMock(email) {
  let hash = 0;
  for (let i = 0; i < (email || "").length; i++) hash = (hash * 31 + email.charCodeAt(i)) % 1000;
  const base = 40 + (hash % 11);
  return (base / 10).toFixed(1);
}

// Limpieza (para que NO queden datos del anterior)
function limpiarCamposPantalla1() {
  const e = document.getElementById("loginEmail");
  const p = document.getElementById("loginPassword");
  if (e) e.value = "";
  if (p) p.value = "";
  clearToast("toast1");
}

function limpiarCamposRegistro() {
  const ids = ["regNombre","regApellido","regEmail","regPassword","regCelular","regTarifa","regExperiencia","regBio"];
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });
  clearToast("toast2");
}

function limpiarPantalla3() {
  const info = document.getElementById("infoUsuarioLogueado");
  const lista = document.getElementById("listaResultados");
  if (info) info.innerText = "";
  if (lista) lista.innerHTML = "";
  ocultarPaneles();
  clearToast("toast3");
}

function ocultarPaneles() {
  const p1 = document.getElementById("panelPublicar");
  const p2 = document.getElementById("panelMisPublicaciones");
  if (p1) p1.style.display = "none";
  if (p2) p2.style.display = "none";
}

function toggleBabysitterExtras(rol) {
  const box = document.getElementById("babysitterExtras");
  if (!box) return;
  box.style.display = (rol === "babysitter") ? "block" : "none";
}

// Helpers visibles desde HTML
window.togglePassword = function (id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.type = (el.type === "password") ? "text" : "password";
};

window.limpiarLogin = function () { limpiarCamposPantalla1(); };

window.autofillDemo = function () {
  // Solo para probar rápido
  const rN = document.getElementById("regNombre");
  const rA = document.getElementById("regApellido");
  const rE = document.getElementById("regEmail");
  const rP = document.getElementById("regPassword");
  const rC = document.getElementById("regCelular");
  if (rN) rN.value = "Demo";
  if (rA) rA.value = "User";
  if (rE) rE.value = `demo${Math.floor(Math.random()*9999)}@kbmatch.com`;
  if (rP) rP.value = "123456";
  if (rC) rC.value = "3055551234";
};

// =======================
// Supabase helpers
// =======================
async function getProfile(userId) {
  const { data, error } = await window.supabaseClient
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (error) throw error;
  return data;
}

async function tryGetProfile(userId) {
  const { data, error } = await window.supabaseClient
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;
  return data || null;
}

async function upsertProfile(profile) {
  const { error } = await window.supabaseClient.from("profiles").upsert(profile);
  if (error) throw error;
}

async function getLatestPost(userId) {
  const { data, error } = await window.supabaseClient
    .from("availability_posts")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1);

  if (error) throw error;
  return data?.[0] || null;
}

async function getMyPosts(userId) {
  const { data, error } = await window.supabaseClient
    .from("availability_posts")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

async function createPostNoDuplicate({ user_id, rol, edificio, fecha, horario }) {
  // evita duplicados por código (además de unique constraint si la tienes)
  const { data: existing, error: exErr } = await window.supabaseClient
    .from("availability_posts")
    .select("id")
    .eq("user_id", user_id)
    .eq("edificio", edificio)
    .eq("fecha", fecha)
    .eq("horario", horario)
    .limit(1);

  if (exErr) throw exErr;
  if (existing && existing.length > 0) return { duplicated: true };

  const { error } = await window.supabaseClient
    .from("availability_posts")
    .insert({ user_id, rol, edificio, fecha, horario });

  if (error) throw error;
  return { duplicated: false };
}

async function deletePost(postId, userId) {
  const { error } = await window.supabaseClient
    .from("availability_posts")
    .delete()
    .eq("id", postId)
    .eq("user_id", userId);

  if (error) throw error;
}

async function fetchMatches({ edificio, fecha, horario, rolOpuesto }) {
  const { data, error } = await window.supabaseClient
    .from("availability_posts")
    .select(`
      id, user_id, rol, edificio, fecha, horario, created_at,
      profiles:profiles (id, email, rol, nombre, apellido, celular, edificio, tarifa, experiencia, bio)
    `)
    .eq("edificio", edificio)
    .eq("fecha", fecha)
    .eq("horario", horario)
    .eq("rol", rolOpuesto)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

// =======================
// Registro (SIN fecha/horario)
// =======================
window.irAPaso2 = function (rol) {
  usuarioActual = { rol }; // temporal
  const t = document.getElementById("tituloRegistro");
  if (t) t.innerText = "Crear cuenta: " + (rol === "padre" ? "Padre / Madre" : "Baby Sitter");

  toggleBabysitterExtras(rol);
  limpiarCamposRegistro();
  mostrarPantalla("pantalla2");
};

function pendingKey(email) {
  return `kb_pending_profile_${(email || "").toLowerCase()}`;
}

function savePendingProfile(email, obj) {
  try { localStorage.setItem(pendingKey(email), JSON.stringify(obj)); } catch {}
}

function loadPendingProfile(email) {
  try {
    const raw = localStorage.getItem(pendingKey(email));
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function clearPendingProfile(email) {
  try { localStorage.removeItem(pendingKey(email)); } catch {}
}

window.finalizarRegistro = async function () {
  clearToast("toast2");
  setLoading("btnRegistro", true, "Creando cuenta...");

  try {
    const rol = usuarioActual?.rol;
    if (!rol) { toast("toast2", "Selecciona tu rol primero.", "err"); return; }

    const nombre = document.getElementById("regNombre").value.trim();
    const apellido = document.getElementById("regApellido").value.trim();
    const email = document.getElementById("regEmail").value.trim().toLowerCase();
    const password = (document.getElementById("regPassword")?.value || "").trim();
    const celular = document.getElementById("regCelular").value.trim();
    const edificio = document.getElementById("regEdificio").value;

    if (!nombre || !apellido || !email || !password || !celular) {
      toast("toast2", "Completa nombre, apellido, email, contraseña y celular.", "err");
      return;
    }
    if (!validarEmail(email)) { toast("toast2", "Email inválido.", "err"); return; }
    if (password.length < 6) { toast("toast2", "La contraseña debe tener al menos 6 caracteres.", "err"); return; }

    // Extras babysitter
    let tarifa = null, experiencia = null, bio = "";
    if (rol === "babysitter") {
      tarifa = Number(document.getElementById("regTarifa")?.value || 0) || null;
      experiencia = Number(document.getElementById("regExperiencia")?.value || 0) || null;
      bio = (document.getElementById("regBio")?.value || "").trim();
    }

    // 1) Crear usuario en Auth
    const { data: signUpData, error: signUpError } =
      await window.supabaseClient.auth.signUp({ email, password });

    if (signUpError) throw signUpError;

    const user = signUpData.user;
    const session = signUpData.session; // puede ser null si hay email confirmation

    if (!user) throw new Error("No se pudo crear el usuario.");

    // Guardamos “pendiente” por si NO hay sesión (email confirmation ON)
    const pending = {
      id: user.id,
      email,
      rol,
      nombre,
      apellido,
      celular,
      edificio,
      tarifa,
      experiencia,
      bio
    };

    // Si no hay sesión, NO podemos escribir a profiles (da 401). Guardamos y pedimos login luego.
    if (!session) {
      savePendingProfile(email, pending);
      toast("toast2", "✅ Cuenta creada. Revisa tu email para confirmar (si aplica) y luego ingresa con tu email y contraseña.", "ok");
      // Lo dejamos volver a pantalla 1
      setTimeout(() => volverInicio(), 600);
      return;
    }

    // Si sí hay sesión, ya podemos escribir a tablas
    await upsertProfile(pending);
    clearPendingProfile(email);

    toast("toast2", "✅ Cuenta creada. Ahora ingresa con tu email y contraseña.", "ok");
    setTimeout(() => volverInicio(), 700);

  } catch (err) {
    const msg = (err.message || "").toLowerCase();
    if (msg.includes("already") || msg.includes("registered")) {
      toast("toast2", "Ese email ya está registrado. Intenta ingresar.", "err");
      return;
    }
    toast("toast2", `Error: ${err.message || err}`, "err");
  } finally {
    setLoading("btnRegistro", false, "Crear cuenta");
  }
};

// =======================
// Login
// =======================
window.login = async function () {
  clearToast("toast1");
  setLoading("btnLogin", true, "Ingresando...");

  try {
    const email = (document.getElementById("loginEmail")?.value || "").trim().toLowerCase();
    const password = (document.getElementById("loginPassword")?.value || "").trim();

    if (!email || !password) { toast("toast1", "Ingresa email y contraseña.", "err"); return; }
    if (!validarEmail(email)) { toast("toast1", "Email inválido.", "err"); return; }

    const { data, error } =
      await window.supabaseClient.auth.signInWithPassword({ email, password });

    if (error) throw error;

    const user = data.user;
    if (!user) throw new Error("No se pudo iniciar sesión.");

    // Si el perfil no existe aún (caso email confirmation), lo creamos desde pending localStorage
    let profile = await tryGetProfile(user.id);
    if (!profile) {
      const pending = loadPendingProfile(email);
      if (pending && pending.id === user.id) {
        await upsertProfile(pending);
        clearPendingProfile(email);
        profile = await getProfile(user.id);
      } else {
        throw new Error("Tu perfil aún no está creado en la base. Vuelve a registrarte o revisa las policies/RLS de profiles.");
      }
    }

    const lastPost = await getLatestPost(user.id);

    usuarioActual = {
      id: user.id,
      email: profile.email,
      rol: profile.rol,
      nombre: profile.nombre,
      fecha: lastPost?.fecha || null,
      horario: lastPost?.horario || null,
      edificioPerfil: profile.edificio || null
    };

    mostrarPantalla("pantalla3");
    ocultarPaneles();
    document.getElementById("listaResultados").innerHTML = "";
    establecerFechaMinima("postFecha");

    // Default: edificio selector = edificio del perfil (más lógico)
    const selectorEd = document.getElementById("selectorEdificio");
    if (selectorEd && usuarioActual.edificioPerfil) selectorEd.value = usuarioActual.edificioPerfil;

    // Y en publicar, por defecto igual
    const postEd = document.getElementById("postEdificio");
    if (postEd && usuarioActual.edificioPerfil) postEd.value = usuarioActual.edificioPerfil;

    const info = document.getElementById("infoUsuarioLogueado");
    if (lastPost) {
      info.innerText = `Hola ${profile.nombre} 👋 Tu última disponibilidad: ${lastPost.fecha} (${lastPost.horario}).`;
    } else {
      info.innerText = `Hola ${profile.nombre} 👋 Publica una disponibilidad para empezar a matchear.`;
      // Abrimos publicar automáticamente (saltito de UX)
      mostrarPublicar();
    }

  } catch (err) {
    toast("toast1", `Error: ${err.message || err}`, "err");
  } finally {
    setLoading("btnLogin", false, "Ingresar");
  }
};

// =======================
// Publicar / Mis disponibilidades
// =======================
window.mostrarPublicar = function () {
  if (!usuarioActual?.id) { toast("toast3", "Debes ingresar.", "err"); volverInicio(); return; }
  clearToast("toast3");
  ocultarPaneles();
  const p = document.getElementById("panelPublicar");
  if (p) p.style.display = "block";
  establecerFechaMinima("postFecha");

  // default edificio
  const postEd = document.getElementById("postEdificio");
  if (postEd && usuarioActual.edificioPerfil) postEd.value = usuarioActual.edificioPerfil;
};

window.publicarDisponibilidad = async function () {
  clearToast("toast3");
  setLoading("btnPublicar", true, "Publicando...");

  try {
    if (!usuarioActual?.id) { toast("toast3", "Debes ingresar.", "err"); volverInicio(); return; }

    const fecha = document.getElementById("postFecha")?.value;
    const horario = document.getElementById("postHorario")?.value;
    const edificio = document.getElementById("postEdificio")?.value;

    if (!fecha || !horario || !edificio) { toast("toast3", "Completa fecha, horario y edificio.", "err"); return; }

    const hoy = new Date().toISOString().split("T")[0];
    if (fecha < hoy) { toast("toast3", "No puedes elegir una fecha pasada.", "err"); return; }

    const res = await createPostNoDuplicate({
      user_id: usuarioActual.id,
      rol: usuarioActual.rol,
      edificio,
      fecha,
      horario
    });

    if (res.duplicated) {
      toast("toast3", "Esa disponibilidad ya existe.", "err");
      return;
    }

    usuarioActual.fecha = fecha;
    usuarioActual.horario = horario;

    toast("toast3", `✅ Publicado: ${fecha} (${horario}). Ahora busca matches abajo.`, "ok");

    const selectorEd = document.getElementById("selectorEdificio");
    if (selectorEd) selectorEd.value = edificio;

    document.getElementById("listaResultados").innerHTML = "";
    ocultarPaneles();

  } catch (err) {
    toast("toast3", `Error: ${err.message || err}`, "err");
  } finally {
    setLoading("btnPublicar", false, "Publicar");
  }
};

window.mostrarMisPublicaciones = async function () {
  try {
    if (!usuarioActual?.id) { toast("toast3", "Debes ingresar.", "err"); volverInicio(); return; }

    clearToast("toast3");
    ocultarPaneles();
    const panel = document.getElementById("panelMisPublicaciones");
    const list = document.getElementById("misPublicacionesList");
    if (!panel || !list) return;

    panel.style.display = "block";

    const mine = await getMyPosts(usuarioActual.id);

    if (mine.length === 0) {
      list.innerHTML = `<p style="color:#64748b; margin:0;">Aún no tienes disponibilidades.</p>`;
      return;
    }

    list.innerHTML = mine.map(p => `
      <div class="match-item">
        <div style="display:flex; justify-content:space-between; gap:10px; align-items:center;">
          <div>
            <div style="font-weight:900;">📅 ${p.fecha} · ⏰ ${p.horario}</div>
            <div style="color:#64748b; margin-top:4px;">📍 ${p.edificio}</div>
          </div>
          <button class="mini" style="margin-top:0;" onclick="borrarPublicacion('${p.id}')">Borrar</button>
        </div>
        <button class="btn btn-primary" style="margin-top:10px;" onclick="usarPublicacion('${p.id}')">
          Usar para buscar matches
        </button>
      </div>
    `).join("");

  } catch (err) {
    toast("toast3", `Error: ${err.message || err}`, "err");
  }
};

window.borrarPublicacion = async function (postId) {
  try {
    if (!usuarioActual?.id) return;
    await deletePost(postId, usuarioActual.id);

    const last = await getLatestPost(usuarioActual.id);
    usuarioActual.fecha = last?.fecha || null;
    usuarioActual.horario = last?.horario || null;

    if (!usuarioActual.fecha) {
      toast("toast3", "Publicación borrada. Publica o elige otra disponibilidad para buscar.", "ok");
    } else {
      toast("toast3", `Usando disponibilidad: ${usuarioActual.fecha} (${usuarioActual.horario}).`, "ok");
    }

    await mostrarMisPublicaciones();

  } catch (err) {
    toast("toast3", `Error: ${err.message || err}`, "err");
  }
};

window.usarPublicacion = async function (postId) {
  try {
    if (!usuarioActual?.id) return;

    const { data, error } = await window.supabaseClient
      .from("availability_posts")
      .select("*")
      .eq("id", postId)
      .eq("user_id", usuarioActual.id)
      .single();

    if (error) throw error;

    usuarioActual.fecha = data.fecha;
    usuarioActual.horario = data.horario;

    toast("toast3", `✅ Usando disponibilidad: ${data.fecha} (${data.horario}).`, "ok");

    const selectorEd = document.getElementById("selectorEdificio");
    if (selectorEd) selectorEd.value = data.edificio;

    ocultarPaneles();
    document.getElementById("listaResultados").innerHTML = "";

  } catch (err) {
    toast("toast3", `Error: ${err.message || err}`, "err");
  }
};

// =======================
// Matches
// =======================
window.mostrarMatches = async function () {
  try {
    const edificioBusqueda = document.getElementById("selectorEdificio").value;
    const contenedor = document.getElementById("listaResultados");

    if (!usuarioActual?.id) {
      contenedor.innerHTML = "<p>No hay sesión activa. Vuelve a ingresar.</p>";
      volverInicio();
      return;
    }
    if (!usuarioActual.fecha || !usuarioActual.horario) {
      contenedor.innerHTML = "<p>Primero publica o selecciona una disponibilidad (fecha/horario).</p>";
      return;
    }

    const rolOpuesto = (usuarioActual.rol === "padre") ? "babysitter" : "padre";

    const data = await fetchMatches({
      edificio: edificioBusqueda,
      fecha: usuarioActual.fecha,
      horario: usuarioActual.horario,
      rolOpuesto
    });

    if (!data.length) {
      contenedor.innerHTML = "<p>No hay matches para esa fecha/horario en ese edificio.</p>";
      return;
    }

    const cards = data.map(row => {
      const u = row.profiles;
      if (!u) return null;

      const cell = limpiarTelefono(u.celular);
      const msj = encodeURIComponent(
        `Hola ${u.nombre}, vi tu perfil en KB Match para el ${row.fecha} (${row.horario}). ¿Estás disponible?`
      );

      const initials = iniciales(u.nombre, u.apellido);
      const rating = ratingMock(u.email);

      const isBabysitter = (u.rol === "babysitter");
      const tarifaTxt = isBabysitter && u.tarifa ? `$${u.tarifa}/hr` : null;
      const expTxt = isBabysitter && (u.experiencia !== null && u.experiencia !== undefined) ? `${u.experiencia} años exp.` : null;
      const bioTxt = isBabysitter && u.bio ? u.bio : null;

      return `
        <div class="match-item">
          <div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start;">
            <div style="display:flex;gap:10px;align-items:center;">
              <div style="
                width:40px;height:40px;border-radius:14px;
                display:grid;place-items:center;
                background: rgba(14,165,233,.14);
                border:1px solid rgba(14,165,233,.22);
                font-weight:900;color: rgba(2,132,199,.95);
              ">${initials}</div>

              <div>
                <div style="font-weight:900;">${u.nombre} ${u.apellido}</div>
                <div style="color:#64748b;font-size:13px;margin-top:2px;">⭐ ${rating} · 📍 ${row.edificio}</div>
              </div>
            </div>

            <div style="
              font-size:11px;font-weight:900;padding:6px 9px;border-radius:999px;
              border:1px solid rgba(14,165,233,.22);
              background: rgba(14,165,233,.10);
              color: rgba(2,132,199,.95);
              white-space:nowrap;height:fit-content;
            ">
              ${row.horario}
            </div>
          </div>

          <div style="margin-top:8px;color:#64748b;font-size:13px;line-height:1.35;">
            📅 ${row.fecha}
            ${tarifaTxt ? ` · 💵 ${tarifaTxt}` : ""}
            ${expTxt ? ` · 🧠 ${expTxt}` : ""}
          </div>

          ${bioTxt ? `<div style="margin-top:8px;color:#334155;font-size:13px;">“${bioTxt}”</div>` : ""}

          <div style="display:flex;gap:10px;margin-top:10px;">
            <a href="https://wa.me/${cell}?text=${msj}" target="_blank"
              style="flex:1;text-align:center;padding:10px 12px;border-radius:14px;text-decoration:none;font-weight:900;color:white;background:#22c55e;">
              WhatsApp
            </a>
            <a href="tel:${cell}"
              style="min-width:92px;text-align:center;padding:10px 12px;border-radius:14px;text-decoration:none;font-weight:900;color: rgba(2,132,199,.95);background: rgba(14,165,233,.10);border:1px solid rgba(14,165,233,.18);">
              📞 Llamar
            </a>
          </div>
        </div>
      `;
    }).filter(Boolean);

    contenedor.innerHTML = cards.join("");

  } catch (err) {
    toast("toast3", `Error: ${err.message || err}`, "err");
  }
};

// =======================
// Volver / Logout
// =======================
window.volverInicio = function () {
  usuarioActual = null;
  limpiarCamposRegistro();
  limpiarPantalla3();
  limpiarCamposPantalla1();
  mostrarPantalla("pantalla1");
};

window.cerrarSesion = async function () {
  usuarioActual = null;
  limpiarPantalla3();
  limpiarCamposPantalla1();
  try { await window.supabaseClient.auth.signOut(); } catch {}
  mostrarPantalla("pantalla1");
};

// =======================
// Init
// =======================
document.addEventListener("DOMContentLoaded", async () => {
  // fuerza logout por si quedó token
  try { await window.supabaseClient.auth.signOut(); } catch {}

  usuarioActual = null;
  limpiarCamposPantalla1();
  limpiarCamposRegistro();
  limpiarPantalla3();
  mostrarPantalla("pantalla1");

  establecerFechaMinima("postFecha");
});
