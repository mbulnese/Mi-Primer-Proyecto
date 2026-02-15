// js/validators.js (REEMPLAZA TODO el archivo por esto)
export function validateEmail(email) {
  if (!email) return "Please enter an email.";
  const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  if (!ok) return "Please enter a valid email.";
  return "";
}

export function validatePassword(password) {
  if (!password) return "Please enter a password.";
  if (password.length < 8) return "Password must be at least 8 characters.";
  return "";
}

export function validateName(name) {
  if (!name) return "Please enter your name.";
  if (name.length < 2) return "Name is too short.";
  return "";
}
