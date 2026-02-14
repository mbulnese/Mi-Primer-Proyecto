// --- SISTEMA DE MATCH KEY BISCAYNE V2 (Con Horarios) ---

const usuario = {
    nombre: "Martín",
    rol: "padre",
    edificio: "The Grand Bay",
    horarios: ["tarde", "noche"] // Los horarios que necesitas
};

const baseDeDatos = [
    { nombre: "Ana", rol: "baby sitter", edificio: "The Grand Bay", horarios: ["tarde"] },
    { nombre: "Carla", rol: "baby sitter", edificio: "The Grand Bay", horarios: ["mañana"] },
    { nombre: "Pedro", rol: "padre", edificio: "Key Colony", horarios: ["noche"] },
    { nombre: "Lucía", rol: "baby sitter", edificio: "Ocean Club", horarios: ["tarde", "noche"] }
];

function buscarMatchAvanzado(usuarioActual, listaUsuarios) {
    return listaUsuarios.filter(u => {
        const mismoEdificio = u.edificio === usuarioActual.edificio;
        const rolOpuesto = u.rol !== usuarioActual.rol;
        
        // Esta línea busca si tienen al menos un horario en común
        const coincidenciaHorario = u.horarios.some(h => usuarioActual.horarios.includes(h));

        return mismoEdificio && rolOpuesto && coincidenciaHorario;
    });
}

const resultados = buscarMatchAvanzado(usuario, baseDeDatos);
console.log("Matches precisos encontrados:", resultados);