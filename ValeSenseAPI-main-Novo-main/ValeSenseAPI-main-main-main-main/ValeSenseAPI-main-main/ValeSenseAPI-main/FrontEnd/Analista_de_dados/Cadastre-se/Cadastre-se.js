"use strict";

const eyeOpen = `
  <svg viewBox="0 0 24 24" fill="none">
    <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2"/>
  </svg>`;

const eyeClosed = `
  <svg viewBox="0 0 24 24" fill="none">
    <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2"/>
    <line x1="3" y1="21" x2="21" y2="3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
  </svg>`;

function togglePassword(id, element) {
  const input = document.getElementById(id);
  input.type = input.type === "password" ? "text" : "password";
  element.innerHTML = input.type === "password" ? eyeClosed : eyeOpen;
}

const registerForm = document.getElementById('registerForm');
const statusMessage = document.getElementById('statusMessage');

registerForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  statusMessage.textContent = 'Cadastrando...';
  const password = document.getElementById('senha').value;
  const confirmation = document.getElementById('confirmaSenha').value;
  if (password !== confirmation) {
    statusMessage.textContent = 'As senhas não conferem.';
    return;
  }

  try {
    const result = await window.ValeSenseApi.request('auth/register', {
      method: 'POST',
      auth: false,
      body: JSON.stringify({
        name: document.getElementById('name').value,
        email: document.getElementById('email').value,
        document: document.getElementById('document').value,
        password
      })
    });
    statusMessage.textContent = result.message || 'Cadastro realizado. Redirecionando para o login...';
    setTimeout(() => { window.location.href = '../Login/Login.html'; }, 700);
  } catch (error) {
    statusMessage.textContent = error.message || 'Não foi possível concluir o cadastro.';
  }
});
