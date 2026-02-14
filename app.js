// =====================
// KB Match - Supabase (Cloud) MVP
// =====================

const SUPABASE_URL = "https://tplsfwxuqjgnciufydtf.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRwbHNmd3h1cWpnbmNpdWZ5ZHRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEwODAxMjIsImV4cCI6MjA4NjY1NjEyMn0.VPPsMeDpneLsDeQfCT2073JYgHzyxkPPB6nBncI3LVM";

// IMPORTANTE: persistSession:false = no deja sesión guardada en computador compartido
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

let usuarioActual = null; // { id, email, rol, nombre, fecha, horario }

// ---------- Helpers UI ----------
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

// Limpieza (para que NO queden datos del anterior en pantalla)
function limpiarCamposPantalla1() {
  const e = document.getElementById("loginEmail");
  const p = document.getElementById("loginPassword");
  if (e) e.value = "";
  if (p) p.value = "";
}

function limpiarCamposRegistro() {
  const ids = [
    "regNombre","regApellido","regEmail","regPassword","regCelular",
    "regTarifa","regExperiencia","regBio","regFecha"
  ];
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });
}

function limpiarPantalla3() {
  const info = document.getElementById("infoUsuarioLogueado");
  const lista = document.getElementById("listaResultados");
  if (info) info.innerText = "";
  if (lista) lista.innerHTML = "";
  ocultarPaneles();
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

// ---------- Supabase helpers ----------
async function getProfile(userId) {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();
  if (error) throw error;
  return data;
}

async function upsertProfile(profile) {
  const { error } = await supabase.from("profiles").upsert(profile);
  if (error) throw error;
}

async function getLatestPost(userId) {
  const { data, error } = await supabase
    .from("availability_posts")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1);
  if (error) throw error;
  return data?.[0] || null;
}

async function createPost(post) {
  const { error } = await supabase.from("availability_posts").insert(post);
  if (error) throw error;
}

async function getMyPosts(userId) {
  const { data, error } = await supabase
    .from("availability_posts")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

async function deletePost(postId, userId) {
  const { error } = await supabase
    .from("availability_posts")
    .delete()
    .eq("id", postId)
    .eq("user_id", userId); // extra seguridad
  if (error) throw error;
}

async function fetchMatches({ edificio, fecha, horario, rolOpuesto }) {
  // Trae posts del rol opuesto y además el perfil del dueño
  const { data, error } = await supabase
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
// Registro
// =======================
function irAPaso2(rol) {
  usuarioActual = { rol }; // sesión temporal hasta registrarse
  const t = document.getElementById("tituloRegistro");
  if (t) t.innerText = "Registro: " + (rol === "padre" ? "Padre / Madre" : "Baby Sitter");

  toggleBabysitterExtras(rol);
  establecerFechaMinima("regFecha");
  mostrarPantalla("pantalla2");
}

async function finalizarRegistro() {
  try {
    const rol = usuarioActual?.rol;
    if (!rol) { alert("Selecciona si eres Padre/Madre o Baby Sitter."); volverInicio(); return; }

    const nombre = document.getElementById("regNombre").value.trim();
    const apellido = document.getElementById("regApellido").value.trim();
    const email = document.getElementById("regEmail").value.trim().toLowerCase();
    const password = (document.getElementById("regPassword")?.value || "").trim();
    const celular = document.getElementById("regCelular").value.trim();

    const edificio = document.getElementById("regEdificio").value;
    const fecha = document.getElementById("regFecha").value;
    const horario = document.getElementById("regHorario").value;

    if (!nombre || !apellido || !email || !password || !celular || !fecha || !horario) {
      alert("Completa todos los campos (incluye contraseña y fecha).");
      return;
    }
    if (!validarEmail(email)) { alert("Email inválido."); return; }
    if (password.length < 6) { alert("La contraseña debe tener al menos 6 caracteres."); return; }

    const hoy = new Date().toISOString().split("T")[0];
    if (fecha < hoy) { alert("No puedes elegir una fecha pasada."); return; }

    // 1) Crear usuario en Auth
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({ email, password });
    if (signUpError) throw signUpError;
    const user = signUpData.user;
    if (!user) throw new Error("No se pudo crear el usuario.");

    // Extras babysitter
    let tarifa = null, experiencia = null, bio = "";
    if (rol === "babysitter") {
      tarifa = Number(document.getElementById("regTarifa")?.value || 0) || null;
      experiencia = Number(document.getElementById("regExperiencia")?.value || 0) || null;
      bio = (document.getElementById("regBio")?.value || "").trim();
    }

    // 2) Guardar perfil en la nube
    await upsertProfile({
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
    });

    // 3) Crear disponibilidad inicial (post)
    // (si es duplicado, Supabase devuelve error por unique constraint)
    try {
      await createPost({
        user_id: user.id,
        rol,
        edificio,
        fecha,
        horario
      });
    } catch (e) {
      // Si ya existe, no pasa nada (pero en primera vez debería ser nuevo)
      // Igual dejamos la sesión activa
      console.warn("Post duplicado o error creando post:", e?.message || e);
    }

    // 4) “Sesión” en memoria (como persistSession=false, no queda guardado)
    usuarioActual = { id: user.id, email, rol, nombre, fecha, horario };

    // UI
    mostrarPantalla("pantalla3");
    document.getElementById("infoUsuarioLogueado").innerText =
      `Hola ${nombre} 👋 Buscando matches para el ${fecha} (${horario})...`;

    const selectorEd = document.getElementById("selectorEdificio");
    if (selectorEd) selectorEd.value = edificio;

    ocultarPaneles();
    document.getElementById("listaResultados").innerHTML = "";
    establecerFechaMinima("postFecha");

  } catch (err) {
    alert(`Error: ${err.message || err}`);
  }
}

// =======================
// Login
// =======================
async function login() {
  try {
    const email = (document.getElementById("loginEmail")?.value || "").trim().toLowerCase();
    const password = (document.getElementById("loginPassword")?.value || "").trim();

    if (!email || !password) { alert("Ingresa email y contraseña."); return; }
    if (!validarEmail(email)) { alert("Email inválido."); return; }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;

    const user = data.user;
    if (!user) throw new Error("No se pudo iniciar sesión.");

    const profile = await getProfile(user.id);
    const lastPost = await getLatestPost(user.id);

    usuarioActual = {
      id: user.id,
      email: profile.email,
      rol: profile.rol,
      nombre: profile.nombre,
      fecha: lastPost?.fecha || null,
      horario: lastPost?.horario || null
    };

    mostrarPantalla("pantalla3");
    ocultarPaneles();
    document.getElementById("listaResultados").innerHTML = "";
    establecerFechaMinima("postFecha");

    const info = document.getElementById("infoUsuarioLogueado");
    if (lastPost) {
      info.innerText = `Hola ${profile.nombre} 👋 Buscando matches para el ${lastPost.fecha} (${lastPost.horario})...`;
      const selectorEd = document.getElementById("selectorEdificio");
      if (selectorEd) selectorEd.value = lastPost.edificio;
    } else {
      info.innerText = `Hola ${profile.nombre} 👋 No tienes disponibilidad publicada aún.`;
    }

  } catch (err) {
    alert(`Error: ${err.message || err}`);
  }
}

// =======================
// Publicar / Mis publicaciones
// =======================
function mostrarPublicar() {
  if (!usuarioActual?.id) { alert("Debes ingresar."); volverInicio(); return; }
  ocultarPaneles();
  const p = document.getElementById("panelPublicar");
  if (p) p.style.display = "block";
  establecerFechaMinima("postFecha");
}

async function publicarDisponibilidad() {
  try {
    if (!usuarioActual?.id) { alert("Debes ingresar."); volverInicio(); return; }

    const fecha = document.getElementById("postFecha")?.value;
    const horario = document.getElementById("postHorario")?.value;
    const edificio = document.getElementById("postEdificio")?.value;

    if (!fecha || !horario || !edificio) { alert("Completa fecha, horario y edificio."); return; }

    const hoy = new Date().toISOString().split("T")[0];
    if (fecha < hoy) { alert("No puedes elegir una fecha pasada."); return; }

    // Insert con UNIQUE (user_id, edificio, fecha, horario) => evita duplicados
    await createPost({
      user_id: usuarioActual.id,
      rol: usuarioActual.rol,
      edificio,
      fecha,
      horario
    });

    usuarioActual.fecha = fecha;
    usuarioActual.horario = horario;

    document.getElementById("infoUsuarioLogueado").innerText =
      `Listo ✅ Publicaste ${fecha} (${horario}). Ahora puedes buscar matches.`;

    const selectorEd = document.getElementById("selectorEdificio");
    if (selectorEd) selectorEd.value = edificio;

    document.getElementById("listaResultados").innerHTML = "";
    ocultarPaneles();

  } catch (err) {
    // Si es duplicado, Supabase suele devolver un error de "duplicate key value violates unique constraint"
    const msg = (err.message || "").toLowerCase();
    if (msg.includes("duplicate") || msg.includes("unique")) {
      alert("Esa disponibilidad ya existe.");
      return;
    }
    alert(`Error: ${err.message || err}`);
  }
}

async function mostrarMisPublicaciones() {
  try {
    if (!usuarioActual?.id) { alert("Debes ingresar."); volverInicio(); return; }

    ocultarPaneles();
    const panel = document.getElementById("panelMisPublicaciones");
    const list = document.getElementById("misPublicacionesList");
    if (!panel || !list) return;

    panel.style.display = "block";

    const mine = await getMyPosts(usuarioActual.id);

    if (mine.length === 0) {
      list.innerHTML = `<p style="color:#64748b; margin:0;">Aún no tienes publicaciones.</p>`;
      return;
    }

    list.innerHTML = mine.map(p => `
      <div class="match-item">
        <div style="display:flex; justify-content:space-between; gap:10px; align-items:center;">
          <div>
            <div style="font-weight:900;">📅 ${p.fecha} · ⏰ ${p.horario}</div>
            <div style="color:#64748b; margin-top:4px;">📍 ${p.edificio}</div>
          </div>
          <button class="btn btn-ghost" style="margin-top:0; padding:10px 12px; border-radius:14px;"
            onclick="borrarPublicacion('${p.id}')">
            Borrar
          </button>
        </div>
        <button class="btn btn-primary" style="margin-top:10px;" onclick="usarPublicacion('${p.id}')">
          Usar para buscar matches
        </button>
      </div>
    `).join("");

  } catch (err) {
    alert(`Error: ${err.message || err}`);
  }
}

async function borrarPublicacion(postId) {
  try {
    if (!usuarioActual?.id) return;
    await deletePost(postId, usuarioActual.id);

    // Si borraste la activa, la “apagamos”
    // (buscamos si coincide con la activa comparando con latest después)
    const last = await getLatestPost(usuarioActual.id);
    usuarioActual.fecha = last?.fecha || null;
    usuarioActual.horario = last?.horario || null;

    if (!usuarioActual.fecha) {
      document.getElementById("infoUsuarioLogueado").innerText =
        "Publicación borrada. Publica o elige otra disponibilidad para buscar matches.";
    } else {
      document.getElementById("infoUsuarioLogueado").innerText =
        `Usando disponibilidad: ${usuarioActual.fecha} (${usuarioActual.horario}).`;
    }

    await mostrarMisPublicaciones();

  } catch (err) {
    alert(`Error: ${err.message || err}`);
  }
}

async function usarPublicacion(postId) {
  try {
    if (!usuarioActual?.id) return;

    // Traer ese post y usarlo como “activo”
    const { data, error } = await supabase
      .from("availability_posts")
      .select("*")
      .eq("id", postId)
      .eq("user_id", usuarioActual.id)
      .single();

    if (error) throw error;

    usuarioActual.fecha = data.fecha;
    usuarioActual.horario = data.horario;

    document.getElementById("infoUsuarioLogueado").innerText =
      `Usando disponibilidad: ${data.fecha} (${data.horario}). Busca matches 👇`;

    const selectorEd = document.getElementById("selectorEdificio");
    if (selectorEd) selectorEd.value = data.edificio;

    ocultarPaneles();
    document.getElementById("listaResultados").innerHTML = "";

  } catch (err) {
    alert(`Error: ${err.message || err}`);
  }
}

// =======================
// Matches (desde la nube)
// =======================
async function mostrarMatches() {
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
    alert(`Error: ${err.message || err}`);
  }
}

// =======================
// Volver / Logout
// =======================
function volverInicio() {
  usuarioActual = null;
  limpiarCamposRegistro();
  limpiarPantalla3();
  limpiarCamposPantalla1();
  mostrarPantalla("pantalla1");
}

async function cerrarSesion() {
  usuarioActual = null;
  limpiarPantalla3();
  limpiarCamposPantalla1();
  await supabase.auth.signOut(); // cierra token (aunque no persiste)
  mostrarPantalla("pantalla1");
}

// =======================
// Init (limpia al cargar)
// =======================
document.addEventListener("DOMContentLoaded", () => {
  usuarioActual = null;
  limpiarCamposPantalla1();
  limpiarCamposRegistro();
  limpiarPantalla3();
  mostrarPantalla("pantalla1");
  establecerFechaMinima("regFecha");
  establecerFechaMinima("postFecha");
});
