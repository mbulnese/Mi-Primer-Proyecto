const STORAGE_KEY = "kbMatchStorage_v1";

function loadStorage() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return { usersByEmail: {}, posts: [] };
  try {
    const parsed = JSON.parse(raw);
    return { usersByEmail: parsed.usersByEmail || {}, posts: parsed.posts || [] };
  } catch {
    return { usersByEmail: {}, posts: [] };
  }
}

function saveStorage(storage) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(storage));
}

let storage = loadStorage();
let usuarioActual = null;

// ===== Helpers UI =====
function mostrarPantalla(id) {
  ["pantalla1", "pantalla2", "pantalla3"].forEach(p => {
    const el = document.getElementById(p);
    if (el) el.style.display = (p === id) ? "block" : "none";
  });
}

function establecerFechaMinima(idInput = "regFecha") {
  const hoy = new Date().toISOString().split("T")[0];
  const inputFecha = document.getElementById(idInput);
  if (inputFecha) inputFecha.setAttribute("min", hoy);
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
  const i1 = n ? n[0].toUpperCase() : "K";
  const i2 = a ? a[0].toUpperCase() : "B";
  return `${i1}${i2}`;
}

function ratingMock(email) {
  let hash = 0;
  for (let i = 0; i < email.length; i++) hash = (hash * 31 + email.charCodeAt(i)) % 1000;
  const base = 40 + (hash % 11);
  return (base / 10).toFixed(1);
}

// ===== Hash contraseña =====
async function sha256(texto) {
  const enc = new TextEncoder().encode(texto);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  const arr = Array.from(new Uint8Array(buf));
  return arr.map(b => b.toString(16).padStart(2, "0")).join("");
}

// Mostrar/ocultar extras babysitter
function toggleBabysitterExtras(rol) {
  const box = document.getElementById("babysitterExtras");
  if (!box) return;
  box.style.display = (rol === "babysitter") ? "block" : "none";
}

// =======================
// Registro
// =======================
function irAPaso2(rol) {
  usuarioActual = { rol };
  document.getElementById("tituloRegistro").innerText =
    "Registro: " + (rol === "padre" ? "Padre / Madre" : "Baby Sitter");

  toggleBabysitterExtras(rol);
  establecerFechaMinima("regFecha");
  mostrarPantalla("pantalla2");
}

async function finalizarRegistro() {
  const nombre = document.getElementById("regNombre").value.trim();
  const apellido = document.getElementById("regApellido").value.trim();
  const email = document.getElementById("regEmail").value.trim().toLowerCase();
  const password = (document.getElementById("regPassword")?.value || "").trim();
  const celular = document.getElementById("regCelular").value.trim();

  const edificio = document.getElementById("regEdificio").value;
  const fecha = document.getElementById("regFecha").value;
  const horario = document.getElementById("regHorario").value;

  if (!usuarioActual?.rol) {
    alert("Selecciona si eres Padre/Madre o Baby Sitter.");
    volverInicio();
    return;
  }

  if (!nombre || !apellido || !email || !password || !celular || !fecha || !horario) {
    alert("Completa todos los campos (incluye contraseña y fecha).");
    return;
  }

  if (!validarEmail(email)) {
    alert("Email inválido.");
    return;
  }

  if (password.length < 6) {
    alert("La contraseña debe tener al menos 6 caracteres.");
    return;
  }

  const hoy = new Date().toISOString().split("T")[0];
  if (fecha < hoy) {
    alert("No puedes elegir una fecha pasada.");
    return;
  }

  // Evitar duplicado de usuario por email
  if (storage.usersByEmail[email]) {
    alert("Ya existe una cuenta con ese email. Ingresa con tu contraseña.");
    volverInicio();
    return;
  }

  // Extras babysitter
  let tarifa = null;
  let experiencia = null;
  let bio = "";
  if (usuarioActual.rol === "babysitter") {
    tarifa = Number(document.getElementById("regTarifa")?.value || 0) || null;
    experiencia = Number(document.getElementById("regExperiencia")?.value || 0) || null;
    bio = (document.getElementById("regBio")?.value || "").trim();
  }

  const passwordHash = await sha256(password);

  const user = {
    email, nombre, apellido, celular, edificio,
    rol: usuarioActual.rol,
    passwordHash,
    tarifa, experiencia, bio,
    createdAt: new Date().toISOString(),
  };

  storage.usersByEmail[email] = user;

  // Publicación inicial (evitar duplicado)
  const postExiste = storage.posts.some(p =>
    p.email === email &&
    p.rol === user.rol &&
    p.edificio === edificio &&
    p.fecha === fecha &&
    p.horario === horario
  );

  if (!postExiste) {
    storage.posts.push({ email, rol: user.rol, edificio, fecha, horario, createdAt: new Date().toISOString() });
  }

  saveStorage(storage);

  usuarioActual = { email, rol: user.rol, fecha, horario };

  mostrarPantalla("pantalla3");
  document.getElementById("infoUsuarioLogueado").innerText =
    `Hola ${nombre} 👋 Buscando matches para el ${fecha} (${horario})...`;

  const selectorEd = document.getElementById("selectorEdificio");
  if (selectorEd) selectorEd.value = edificio;

  ocultarPaneles();
  document.getElementById("listaResultados").innerHTML = "";

  // set min date para publicar
  establecerFechaMinima("postFecha");
}

// =======================
// Login
// =======================
async function login() {
  const email = (document.getElementById("loginEmail")?.value || "").trim().toLowerCase();
  const password = (document.getElementById("loginPassword")?.value || "").trim();

  if (!email || !password) {
    alert("Ingresa email y contraseña.");
    return;
  }
  if (!validarEmail(email)) {
    alert("Email inválido.");
    return;
  }

  const user = storage.usersByEmail[email];
  if (!user) {
    alert("No existe una cuenta con ese email. Regístrate primero.");
    return;
  }

  const hash = await sha256(password);
  if (hash !== user.passwordHash) {
    alert("Contraseña incorrecta.");
    return;
  }

  // Último post del usuario
  const postsUsuario = storage.posts
    .filter(p => p.email === email)
    .sort((a, b) => (a.createdAt > b.createdAt ? -1 : 1));

  const lastPost = postsUsuario[0] || null;

  usuarioActual = { email, rol: user.rol, fecha: lastPost?.fecha || null, horario: lastPost?.horario || null };

  mostrarPantalla("pantalla3");
  ocultarPaneles();

  const info = document.getElementById("infoUsuarioLogueado");
  if (info) {
    if (lastPost) {
      info.innerText = `Hola ${user.nombre} 👋 Buscando matches para el ${lastPost.fecha} (${lastPost.horario})...`;
      const selectorEd = document.getElementById("selectorEdificio");
      if (selectorEd) selectorEd.value = lastPost.edificio;
    } else {
      info.innerText = `Hola ${user.nombre} 👋 No tienes disponibilidad publicada aún.`;
    }
  }

  document.getElementById("listaResultados").innerHTML = "";
  establecerFechaMinima("postFecha");
}

// =======================
// Paneles: Publicar y Mis publicaciones
// =======================
function ocultarPaneles() {
  const p1 = document.getElementById("panelPublicar");
  const p2 = document.getElementById("panelMisPublicaciones");
  if (p1) p1.style.display = "none";
  if (p2) p2.style.display = "none";
}

function mostrarPublicar() {
  if (!usuarioActual?.email) { alert("Debes ingresar."); volverInicio(); return; }
  ocultarPaneles();
  const p = document.getElementById("panelPublicar");
  if (p) p.style.display = "block";

  establecerFechaMinima("postFecha");

  // Set defaults cómodos
  const user = storage.usersByEmail[usuarioActual.email];
  const postEd = document.getElementById("postEdificio");
  if (postEd && user?.edificio) postEd.value = user.edificio;
}

function publicarDisponibilidad() {
  if (!usuarioActual?.email) { alert("Debes ingresar."); volverInicio(); return; }

  const fecha = document.getElementById("postFecha")?.value;
  const horario = document.getElementById("postHorario")?.value;
  const edificio = document.getElementById("postEdificio")?.value;

  if (!fecha || !horario || !edificio) {
    alert("Completa fecha, horario y edificio.");
    return;
  }

  const hoy = new Date().toISOString().split("T")[0];
  if (fecha < hoy) {
    alert("No puedes elegir una fecha pasada.");
    return;
  }

  const user = storage.usersByEmail[usuarioActual.email];
  if (!user) {
    alert("Usuario no encontrado. Vuelve a ingresar.");
    volverInicio();
    return;
  }

  // Evitar duplicado
  const existe = storage.posts.some(p =>
    p.email === user.email &&
    p.rol === user.rol &&
    p.edificio === edificio &&
    p.fecha === fecha &&
    p.horario === horario
  );

  if (existe) {
    alert("Esa disponibilidad ya existe.");
    return;
  }

  storage.posts.push({
    email: user.email,
    rol: user.rol,
    edificio,
    fecha,
    horario,
    createdAt: new Date().toISOString(),
  });

  saveStorage(storage);

  // Hacerla la disponibilidad "activa" para buscar matches
  usuarioActual.fecha = fecha;
  usuarioActual.horario = horario;

  // UI
  document.getElementById("infoUsuarioLogueado").innerText =
    `Listo ✅ Publicaste ${fecha} (${horario}). Ahora puedes buscar matches.`;

  const selectorEd = document.getElementById("selectorEdificio");
  if (selectorEd) selectorEd.value = edificio;

  document.getElementById("listaResultados").innerHTML = "";
  ocultarPaneles();
}

function mostrarMisPublicaciones() {
  if (!usuarioActual?.email) { alert("Debes ingresar."); volverInicio(); return; }

  ocultarPaneles();
  const panel = document.getElementById("panelMisPublicaciones");
  const list = document.getElementById("misPublicacionesList");
  if (!panel || !list) return;

  panel.style.display = "block";

  const user = storage.usersByEmail[usuarioActual.email];
  const mine = storage.posts
    .map((p, idx) => ({ ...p, idx }))
    .filter(p => p.email === user.email)
    .sort((a,b) => (a.createdAt > b.createdAt ? -1 : 1));

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
          onclick="borrarPublicacion(${p.idx})">
          Borrar
        </button>
      </div>
      <button class="btn btn-primary" style="margin-top:10px;" onclick="usarPublicacion(${p.idx})">
        Usar para buscar matches
      </button>
    </div>
  `).join("");
}

function borrarPublicacion(idx) {
  if (!usuarioActual?.email) return;

  const p = storage.posts[idx];
  if (!p) return;

  // seguridad: solo borrar si es del usuario
  if (p.email !== usuarioActual.email) {
    alert("No puedes borrar esta publicación.");
    return;
  }

  storage.posts.splice(idx, 1);
  saveStorage(storage);

  // Si borró la publicación activa, desactivamos fecha/horario
  if (usuarioActual.fecha === p.fecha && usuarioActual.horario === p.horario) {
    usuarioActual.fecha = null;
    usuarioActual.horario = null;
    document.getElementById("infoUsuarioLogueado").innerText =
      "Publicación borrada. Elige otra publicación para buscar matches.";
  }

  mostrarMisPublicaciones();
}

function usarPublicacion(idx) {
  if (!usuarioActual?.email) return;

  const p = storage.posts[idx];
  if (!p) return;
  if (p.email !== usuarioActual.email) return;

  usuarioActual.fecha = p.fecha;
  usuarioActual.horario = p.horario;

  document.getElementById("infoUsuarioLogueado").innerText =
    `Usando disponibilidad: ${p.fecha} (${p.horario}). Busca matches 👇`;

  const selectorEd = document.getElementById("selectorEdificio");
  if (selectorEd) selectorEd.value = p.edificio;

  ocultarPaneles();
  document.getElementById("listaResultados").innerHTML = "";
}

// =======================
// Matches (cards pro)
// =======================
function mostrarMatches() {
  const edificioBusqueda = document.getElementById("selectorEdificio").value;
  const contenedor = document.getElementById("listaResultados");

  if (!usuarioActual?.email) {
    contenedor.innerHTML = "<p>No hay sesión activa. Vuelve a ingresar.</p>";
    volverInicio();
    return;
  }

  if (!usuarioActual.fecha || !usuarioActual.horario) {
    contenedor.innerHTML = "<p>Primero publica o selecciona una disponibilidad (fecha/horario).</p>";
    return;
  }

  const matchesPosts = storage.posts.filter(p =>
    p.edificio === edificioBusqueda &&
    p.rol !== usuarioActual.rol &&
    p.fecha === usuarioActual.fecha &&
    p.horario === usuarioActual.horario
  );

  if (matchesPosts.length === 0) {
    contenedor.innerHTML = "<p>No hay matches para esa fecha/horario en ese edificio.</p>";
    return;
  }

  const cards = matchesPosts.map(p => {
    const u = storage.usersByEmail[p.email];
    if (!u) return null;

    const cell = limpiarTelefono(u.celular);
    const msj = encodeURIComponent(
      `Hola ${u.nombre}, vi tu perfil en KB Match para el ${p.fecha} (${p.horario}). ¿Estás disponible?`
    );

    const initials = iniciales(u.nombre, u.apellido);
    const rating = ratingMock(u.email);

    const isBabysitter = (u.rol === "babysitter");
    const tarifaTxt = isBabysitter && u.tarifa ? `$${u.tarifa}/hr` : null;
    const expTxt = isBabysitter && (u.experiencia !== null && u.experiencia !== undefined)
      ? `${u.experiencia} años exp.`
      : null;
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
              <div style="color:#64748b;font-size:13px;margin-top:2px;">⭐ ${rating} · 📍 ${p.edificio}</div>
            </div>
          </div>

          <div style="
            font-size:11px;font-weight:900;padding:6px 9px;border-radius:999px;
            border:1px solid rgba(14,165,233,.22);
            background: rgba(14,165,233,.10);
            color: rgba(2,132,199,.95);
            white-space:nowrap;height:fit-content;
          ">
            ${p.horario}
          </div>
        </div>

        <div style="margin-top:8px;color:#64748b;font-size:13px;line-height:1.35;">
          📅 ${p.fecha}
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
}

// =======================
// Volver / Logout
// =======================
function volverInicio() {
  usuarioActual = null;
  mostrarPantalla("pantalla1");
}

function cerrarSesion() {
  usuarioActual = null;
  document.getElementById("listaResultados").innerHTML = "";
  ocultarPaneles();
  mostrarPantalla("pantalla1");
}

// =======================
// Init
// =======================
document.addEventListener("DOMContentLoaded", () => {
  mostrarPantalla("pantalla1");
});
