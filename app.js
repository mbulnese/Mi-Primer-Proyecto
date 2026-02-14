// --- SISTEMA DE REGISTRO KEY BISCAYNE BABY SITTERS ---

// 1. Datos del Usuario (Paso 1 y 2)
const usuario = {
    nombre: "Martín",
    email: "martin@email.com",
    rol: "padre", // Opciones: "baby sitter" o "padre"
    edificio: "The Grand Bay" // Ejemplo de edificio en Key Biscayne
};

// 2. Lista de edificios en Key Biscayne (Paso 3)
const edificiosKeyBiscayne = [
    "The Grand Bay",
    "Ocean Club",
    "Key Colony",
    "Commodore Club",
    "Towers of Key Biscayne"
    "Casa del Mar"
    "Mar Azul"
];

// 3. Función de Lógica de Match
function buscarMatch(usuarioActual, listaUsuarios) {
    console.log(`Buscando matches para ${usuarioActual.nombre} en ${usuarioActual.edificio}...`);
    
    // Filtramos: que sea del mismo edificio y que tenga el rol opuesto
    const matches = listaUsuarios.filter(u => 
        u.edificio === usuarioActual.edificio && u.rol !== usuarioActual.rol
    );

    return matches;
}

// 4. Simulación de otros usuarios en la base de datos
const baseDeDatos = [
    { nombre: "Ana", rol: "baby sitter", edificio: "The Grand Bay" },
    { nombre: "Pedro", rol: "padre", edificio: "Key Colony" },
    { nombre: "Lucía", rol: "baby sitter", edificio: "Ocean Club" },
    { nombre: "Carla", rol: "baby sitter", edificio: "The Grand Bay" }
];

// EJECUCIÓN
const misMatches = buscarMatch(usuario, baseDeDatos);
console.log("¡Matches encontrados!", misMatches);