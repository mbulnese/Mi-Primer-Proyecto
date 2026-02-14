// 1. Intentar cargar los datos del "cajón" (localStorage)
// Si no hay nada, usamos la lista básica de Ana y Sofia
let datosGuardados = localStorage.getItem("usuariosKB");
let baseDeDatos = datosGuardados ? JSON.parse(datosGuardados) : [
    { nombre: "Ana", rol: "baby sitter", edificio: "The Grand Bay" },
    { nombre: "Sofia", rol: "baby sitter", edificio: "Casa del Mar" }
];

function registrarUsuario() {
    const nombre = document.getElementById("regNombre").value;
    const rol = document.getElementById("regRol").value;
    const edificio = document.getElementById("regEdificio").value;

    if (nombre === "") {
        alert("Por favor, escribe tu nombre");
        return;
    }

    const nuevoUsuario = { nombre: nombre, rol: rol, edificio: edificio };
    
    // Agregamos al usuario a nuestra lista en memoria
    baseDeDatos.push(nuevoUsuario);

    // 2. ¡EL TRUCO! Guardamos la lista actualizada en el "cajón" permanente
    localStorage.setItem("usuariosKB", JSON.stringify(baseDeDatos));

    document.getElementById("regNombre").value = "";
    alert("¡Registro exitoso y guardado permanentemente!");
}

function mostrarMatches() {
    const edificioSeleccionado = document.getElementById("selectorEdificio").value;
    const matches = baseDeDatos.filter(p => p.edificio === edificioSeleccionado);
    const contenedor = document.getElementById("listaResultados");
    
   if (matches.length > 0) {
        // Creamos cajitas visuales para cada nombre
        const htmlMatches = matches.map(m => `
            <div class="match-item">
                <strong>${m.nombre}</strong><br>
                <small>${m.rol.toUpperCase()}</small>
            </div>
        `).join("");
        contenedor.innerHTML = htmlMatches;
    } else {
        contenedor.innerHTML = "<p>❌ No hay nadie aquí aún.</p>";
    }
}