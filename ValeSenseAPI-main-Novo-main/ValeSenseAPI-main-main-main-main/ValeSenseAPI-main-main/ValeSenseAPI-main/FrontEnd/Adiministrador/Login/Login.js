const form = document.getElementById('adminLoginForm');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const errorMessage = document.getElementById('loginError');
const submitButton = document.getElementById('submitButton');

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  errorMessage.textContent = '';
  submitButton.disabled = true;
  submitButton.textContent = 'Verificando...';

  try {
    const result = await window.ValeSenseApi.request('auth/login', {
      method: 'POST',
      auth: false,
      body: JSON.stringify({ email: emailInput.value.trim(), password: passwordInput.value })
    });
    if (!result.user || !result.token) throw new Error('A API não retornou uma sessão válida.');
    if (result.user.role !== 'ADMIN') throw new Error('Esta página aceita somente contas de Administrador.');

    sessionStorage.setItem('valesense_token', result.token);
    sessionStorage.setItem('valesense_user', JSON.stringify(result.user));
    localStorage.removeItem('valesense_token');
    localStorage.removeItem('valesense_user');
    window.location.replace('../Home/Home.html');
  } catch (error) {
    errorMessage.textContent = error.message || 'Não foi possível entrar. Verifique a API e suas credenciais.';
    submitButton.disabled = false;
    submitButton.textContent = 'Entrar';
  }
});