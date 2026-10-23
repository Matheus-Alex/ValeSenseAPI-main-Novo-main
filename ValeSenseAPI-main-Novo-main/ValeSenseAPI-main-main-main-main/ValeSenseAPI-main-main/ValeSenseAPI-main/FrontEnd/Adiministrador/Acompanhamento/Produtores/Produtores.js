(() => {
  const api = window.ValeSenseApi;
  const role = document.body.dataset.activityRole;
  const labels = { LOGIN: 'Login', CADASTRO: 'Cadastro', SENSOR: 'Gestão de sensor', USUARIO_STATUS: 'Alteração de usuário', USUARIO_PERFIL: 'Alteração de perfil' };
  const roleNames = { ANALISTA: 'Analista de dados', PRODUTOR_EXPORTADOR: 'Produtor/exportador' };
  const el = (id) => document.getElementById(id);
  const cell = (row, value) => { const td = document.createElement('td'); td.textContent = value ?? '—'; row.append(td); };
  const date = (value) => value ? new Date(value).toLocaleString('pt-BR') : 'Sem atividade registrada';
  function message(body, columns, text) { const row = document.createElement('tr'); const td = document.createElement('td'); td.colSpan = columns; td.textContent = text; row.append(td); body.replaceChildren(row); }
  async function load() {
    const usersBody = el('roleUsersBody'); const activityBody = el('roleActivityBody');
    try {
      const [usersResponse, logsResponse] = await Promise.all([api.request('users'), api.request('users/access-logs')]);
      const users = (usersResponse.data || []).filter((user) => user.role === role);
      const logs = logsResponse.data || [];
      const userByEmail = new Map(users.map((user) => [user.email?.toLowerCase(), user]));
      const roleLogs = logs.filter((log) => userByEmail.has(log.email?.toLowerCase()));
      const latestByEmail = new Map();
      roleLogs.forEach((log) => { const key = log.email.toLowerCase(); if (!latestByEmail.has(key)) latestByEmail.set(key, log); });
      el('roleCount').textContent = users.length;
      el('activeCount').textContent = users.filter((user) => user.status === 'ACTIVE').length;
      el('eventCount').textContent = roleLogs.length;
      usersBody.replaceChildren();
      users.forEach((user) => {
        const row = document.createElement('tr'); const latest = latestByEmail.get(user.email?.toLowerCase());
        cell(row, user.name); cell(row, user.email);
        const status = document.createElement('td'); const badge = document.createElement('span');
        badge.className = 'activity-badge'; badge.textContent = user.status === 'ACTIVE' ? 'Ativo' : 'Inativo'; status.append(badge); row.append(status);
        cell(row, latest ? (labels[latest.action] || latest.action) : 'Sem atividade registrada'); cell(row, date(latest?.timestamp)); usersBody.append(row);
      });
      if (!users.length) message(usersBody, 5, `Nenhum ${role === 'ANALISTA' ? 'analista' : 'produtor'} cadastrado.`);
      activityBody.replaceChildren();
      roleLogs.slice(0, 100).forEach((log) => {
        const row = document.createElement('tr'); cell(row, date(log.timestamp)); cell(row, log.user); cell(row, labels[log.action] || log.action); cell(row, log.result === 'SUCESSO' ? 'Concluída' : 'Falhou'); cell(row, log.ip || '—'); activityBody.append(row);
      });
      if (!roleLogs.length) message(activityBody, 5, 'Nenhuma ação registrada para este perfil.');
    } catch (error) {
      message(usersBody, 5, error.message || 'Não foi possível carregar os usuários.');
      message(activityBody, 5, error.message || 'Não foi possível carregar as atividades.');
    }
  }
  document.getElementById('scrollTopBtn')?.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  load();
})();

