const baseDeDatos = [
    { nombre: "Ana", rol: "baby sitter", edificio: "The Grand Bay" },
    { nombre: "Carla", rol: "baby sitter", edificio: "The Grand Bay" },
    { nombre: "Lucía", rol: "baby sitter", edificio: "Ocean Club" },
    { nombre: "Marta", rol: "baby sitter", edificio: "Key Colony" }
];

function mostrarMatches() {
    // 1. Capturamos qué edificio eligió el usuario en el HTML
    const edificioSeleccionado = document.getElementById("selectorEdificio").value;
    
    // 2. Filtramos la base de datos
    const matches = baseDeDatos.filter(persona => persona.edificio === edificioSeleccionado);
    
    // 3. Mostramos el resultado en la pantalla
    const contenedor = document.getElementById("listaResultados");
    
    if (matches.length > 0) {
        const nombres = matches.map(m => m.nombre).join(", ");
        contenedor.innerHTML = `✅ Encontradas en ${edificioSeleccionado}: ${nombres}`;
    } else {
        contenedor.innerHTML = "❌ No hay baby sitters disponibles aquí todavía.";
    }
}