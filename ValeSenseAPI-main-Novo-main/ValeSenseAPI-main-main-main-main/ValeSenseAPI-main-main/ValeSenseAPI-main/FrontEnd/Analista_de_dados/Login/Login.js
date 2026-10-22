const loginForm = document.getElementById('loginForm');
const emailInput = document.getElementById('email');
const senhaInput = document.getElementById('senha');
const passwordToggle = document.querySelector('.password-toggle');
const forgotPasswordLink = document.getElementById('forgotPasswordLink');
const forgotPasswordModal = document.getElementById('forgotPasswordModal');
const closeForgotPassword = document.getElementById('closeForgotPassword');
const forgotPasswordForm = document.getElementById('forgotPasswordForm');
const recoveryEmail = document.getElementById('recoveryEmail');
const recoveryMessage = document.getElementById('recoveryMessage');
const errorMessage = document.getElementById('errorMessage');
const btnLogin = loginForm.querySelector('.btn-login');

function redirectUser(user, token) {
  sessionStorage.setItem('valesense_token', token);
  sessionStorage.setItem('valesense_user', JSON.stringify(user));
  localStorage.removeItem('valesense_token');
  localStorage.removeItem('valesense_user');
  const destinations = {
    ADMIN: '../../Adiministrador/Home/Home.html',
    PRODUTOR_EXPORTADOR: '../../Produtor_Exportador/Home/Home.html',
    ANALISTA: '../Dashboard/Dashboard.html'
  };
  window.location.href = destinations[user.role] || '../Dashboard/Dashboard.html';
}

function mostrarErro(mensagem) {
  errorMessage.textContent = mensagem;
  emailInput.closest('.field').classList.add('has-error');
  senhaInput.closest('.field').classList.add('has-error');
}

function limparErro() {
  errorMessage.textContent = '';
  emailInput.closest('.field').classList.remove('has-error');
  senhaInput.closest('.field').classList.remove('has-error');
}

passwordToggle.addEventListener('click', () => {
  const senhaVisivel = senhaInput.type === 'text';
  senhaInput.type = senhaVisivel ? 'password' : 'text';
  passwordToggle.classList.toggle('is-visible', !senhaVisivel);
  passwordToggle.setAttribute('aria-label', senhaVisivel ? 'Mostrar senha' : 'Esconder senha');
});

function fecharRecuperacao() {
  forgotPasswordModal.hidden = true;
  recoveryMessage.textContent = '';
  recoveryMessage.classList.remove('is-error');
}

forgotPasswordLink.addEventListener('click', () => {
  forgotPasswordModal.hidden = false;
  recoveryEmail.value = emailInput.value.trim();
  recoveryEmail.focus();
});

closeForgotPassword.addEventListener('click', fecharRecuperacao);

forgotPasswordModal.addEventListener('click', (event) => {
  if (event.target === forgotPasswordModal) fecharRecuperacao();
});

forgotPasswordForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const email = recoveryEmail.value.trim();

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    recoveryMessage.textContent = 'Informe um e-mail válido.';
    recoveryMessage.classList.add('is-error');
    return;
  }

  recoveryMessage.classList.remove('is-error');
  const submitButton = forgotPasswordForm.querySelector('button[type="submit"]');
  submitButton.disabled = true;
  try {
    const result = await window.ValeSenseApi.request('auth/forgot-password', {
      method: 'POST',
      auth: false,
      body: JSON.stringify({ email })
    });
    recoveryMessage.textContent = result.message || 'Se o e-mail estiver cadastrado, você receberá as instruções.';
  } catch (error) {
    recoveryMessage.textContent = error.message || 'Não foi possível solicitar a redefinição.';
    recoveryMessage.classList.add('is-error');
  } finally {
    submitButton.disabled = false;
  }
});

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  limparErro();

  const email = emailInput.value.trim();
  const senha = senhaInput.value;

  // Validação simples de front-end
  if (!email || !senha) {
    mostrarErro('Preencha e-mail e senha para continuar.');
    return;
  }

  const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  if (!emailValido) {
    mostrarErro('Informe um e-mail válido.');
    return;
  }

  btnLogin.disabled = true;
  btnLogin.textContent = 'Entrando...';
  try {
    const data = await window.ValeSenseApi.request('auth/login', {
      method: 'POST',
      auth: false,
      body: JSON.stringify({ email, password: senha })
    });
    if (!data.user || !data.token) throw new Error('A API não retornou uma sessão válida.');
    redirectUser(data.user, data.token);
  } catch (error) {
    mostrarErro(error.message || 'Não foi possível entrar.');
    btnLogin.disabled = false;
    btnLogin.textContent = 'Login';
  }
});