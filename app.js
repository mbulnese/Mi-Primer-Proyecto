// Simulación de una aplicación móvil
const appConfig = {
    name: "Mi Super App",
    version: "1.0.0",
    author: "Mbulnese"
};

function darBienvenida(usuario) {
    return `¡Bienvenido a ${appConfig.name}, ${usuario}!`;
}

console.log(darBienvenida("Martín"));