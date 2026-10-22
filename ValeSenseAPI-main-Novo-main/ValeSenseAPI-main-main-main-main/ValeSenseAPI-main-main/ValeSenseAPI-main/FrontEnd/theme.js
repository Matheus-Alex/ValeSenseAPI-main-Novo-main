(function () {
  function atualizarBotoesTema() {
    const dark = document.documentElement.classList.contains('dark-theme');
    document.querySelectorAll('[data-theme-toggle]').forEach((button) => {
      button.setAttribute('aria-pressed', String(dark));
      const label = dark ? 'Ativar modo claro' : 'Ativar modo escuro';
      button.setAttribute('aria-label', label);
      button.title = label;
      const icon = button.querySelector('[data-theme-icon]');
      if (icon) {
        icon.src = icon.src.replace(/(?:Lua|Sol)\.svg$/, dark ? 'Sol.svg' : 'Lua.svg');
        icon.dataset.themeReady = 'true';
      }
    });
    document.querySelectorAll('.logout-action').forEach((button) => {
      button.style.color = dark ? '#e59189' : '#a3433d';
    });
  }

  const dark = localStorage.getItem('valesense_theme') === 'dark';
  document.documentElement.classList.toggle('dark-theme', dark);
  atualizarBotoesTema();
  document.addEventListener('DOMContentLoaded', atualizarBotoesTema);

  window.applyTheme = function (enabled) {
    document.documentElement.classList.toggle('dark-theme', enabled);
    localStorage.setItem('valesense_theme', enabled ? 'dark' : 'light');
    atualizarBotoesTema();
  };

  document.addEventListener('click', (event) => {
    const button = event.target.closest('[data-theme-toggle]');
    if (button) window.applyTheme(!document.documentElement.classList.contains('dark-theme'));
  });
  document.addEventListener('click', (event) => {
    const logoutButton = event.target.closest('[data-logout]');
    if (!logoutButton) return;
    event.preventDefault();
    sessionStorage.removeItem('valesense_token');
    sessionStorage.removeItem('valesense_user');
    localStorage.removeItem('valesense_token');
    localStorage.removeItem('valesense_user');
    window.location.href = document.body.dataset.loginPath || '../Login/Login.html';
  });

})();