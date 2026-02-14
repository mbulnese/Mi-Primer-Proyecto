let baseDeDatos = JSON.parse(localStorage.getItem("usuariosKB")) || [];
let usuarioActual = null; // Aquí guardaremos quién se acaba de registrar

function irAPaso2(rol) {
    usuarioActual = { rol: rol }; // Guardamos el rol elegido
    document.getElementById("pantalla1").style.display = "none";
    document.getElementById("pantalla2").style.display = "block";
    document.getElementById("tituloRegistro").innerText = "Registro: " + (rol === 'padre' ? 'Padre' : 'Baby Sitter');
}

function finalizarRegistro() {
    const nombre = document.getElementById("regNombre").value.trim();
    const apellido = document.getElementById("regApellido").value.trim();
    const email = document.getElementById("regEmail").value.trim();
    const celular = document.getElementById("regCelular").value.trim();
    const edificio = document.getElementById("regEdificio").value;
    const dia = document.getElementById("regDia").value;
    const horario = document.getElementById("regHorario").value;

    if (!nombre || !apellido || !email || !celular) {
        alert("Por favor completa todos los campos.");
        return;
    }

    // Completamos el objeto del usuario actual
    usuarioActual = { ...usuarioActual, nombre, apellido, email, celular, edificio, dia, horario };
    
    // Guardamos en la lista general
    baseDeDatos.push(usuarioActual);
    localStorage.setItem("usuariosKB", JSON.stringify(baseDeDatos));

    // Pasamos a la pantalla de búsqueda
    document.getElementById("pantalla2").style.display = "none";
    document.getElementById("pantalla3").style.display = "block";
    document.getElementById("infoUsuarioLogueado").innerText = `Hola ${nombre}, buscando matches para ${dia} ${horario}...`;
}

function mostrarMatches() {
    const edificioBusqueda = document.getElementById("selectorEdificio").value;
    const contenedor = document.getElementById("listaResultados");

    // Lógica de Match: Mismo edificio, diferente rol, mismo día y mismo horario
    const matches = baseDeDatos.filter(p => 
        p.edificio === edificioBusqueda && 
        p.rol !== usuarioActual.rol && 
        p.dia === usuarioActual.dia && 
        p.horario === usuarioActual.horario
    );

    if (matches.length > 0) {
        contenedor.innerHTML = matches.map(m => `
            <div class="match-item">
                <strong>${m.nombre} ${m.apellido}</strong><br>
                <span>📍 ${m.edificio}</span><br>
                <span>⏰ ${m.dia} (${m.horario})</span><br>
                <div class="contact-links">
                    <a href="tel:${m.celular}" style="color: #0288d1;">📞 Llamar</a>
                    <a href="mailto:${m.email}" style="color: #64748b;">✉️ Email</a>
                </div>
            </div>
        `).join("");
    } else {
        contenedor.innerHTML = "<p>No hay matches exactos para tu horario y edificio.</p>";
    }
}