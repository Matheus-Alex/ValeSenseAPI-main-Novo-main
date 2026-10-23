const api = window.ValeSenseApi;

document.getElementById('scrollTopBtn').addEventListener('click', () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

const nomesPerfis = {
  ADMIN: 'Administrador',
  ANALISTA: 'Analista de dados',
  PRODUTOR_EXPORTADOR: 'Produtor/exportador'
};
const statusLabel = (status) => status === 'ACTIVE' ? 'Ativo' : 'Inativo';

function criarCelula(texto) {
  const cell = document.createElement('td');
  cell.textContent = texto;
  return cell;
}

function mostrarMensagemNaTabela(tbody, colunas, texto) {
  const row = document.createElement('tr');
  const cell = document.createElement('td');
  cell.colSpan = colunas;
  cell.textContent = texto;
  row.append(cell);
  tbody.replaceChildren(row);
}

async function carregarUsuarios() {
  const tbody = document.getElementById('userTableBody');
  try {
    const { data: usuarios } = await api.request('users');
    tbody.replaceChildren();
    usuarios.forEach((usuario) => {
      const row = document.createElement('tr');
      row.dataset.userId = usuario.id;
      row.append(criarCelula(usuario.name), criarCelula(nomesPerfis[usuario.role] || usuario.role));
      const statusCell = document.createElement('td');
      const badge = document.createElement('span');
      badge.className = `badge ${usuario.status === 'ACTIVE' ? 'ok' : 'inactive'}`;
      badge.textContent = statusLabel(usuario.status);
      statusCell.append(badge);
      const actions = document.createElement('td');
      actions.className = 'actions-cell';
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'btn-outline';
      button.dataset.userStatus = usuario.status;
      button.dataset.userId = usuario.id;
      button.textContent = usuario.status === 'ACTIVE' ? 'Inativar' : 'Ativar';
      actions.append(button);
      row.append(statusCell, actions);
      tbody.append(row);
    });
    if (!usuarios.length) mostrarMensagemNaTabela(tbody, 4, 'Nenhum usuário cadastrado.');
  } catch (error) {
    console.error('Falha ao carregar usuários:', error);
    mostrarMensagemNaTabela(tbody, 4, error.message || 'Não foi possível carregar os usuários.');
  }
}

document.getElementById('addUserBtn').addEventListener('click', async () => {
  const name = window.prompt('Nome do novo usuário:');
  if (name === null) return;
  const email = window.prompt('E-mail do novo usuário:');
  if (email === null) return;
  const password = window.prompt('Senha temporária (mínimo de 8 caracteres):');
  if (password === null) return;
  const perfil = window.prompt('Perfil: ADMIN, ANALISTA ou PRODUTOR_EXPORTADOR', 'ANALISTA');
  if (perfil === null) return;
  const role = perfil.trim().toUpperCase();
  if (!Object.hasOwn(nomesPerfis, role)) {
    window.alert('Perfil inválido.');
    return;
  }
  try {
    await api.request('users', {
      method: 'POST',
      body: JSON.stringify({ name, email, password, role })
    });
    await carregarUsuarios();
  } catch (error) {
    window.alert(error.message || 'Não foi possível cadastrar o usuário.');
  }
});

document.getElementById('userTableBody').addEventListener('click', async (event) => {
  const button = event.target.closest('[data-user-status]');
  if (!button) return;
  const novoStatus = button.dataset.userStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
  try {
    await api.request(`users/${button.dataset.userId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: novoStatus })
    });
    await carregarUsuarios();
  } catch (error) {
    window.alert(error.message || 'Não foi possível alterar o status do usuário.');
  }
});

async function carregarResumoMonitoramento() {
  const ids = ['activeUsersCount', 'activeSensorsCount', 'readingsCount', 'openAlertsCount'];
  const [users, sensors, readings, alerts] = await Promise.allSettled([
    api.request('users'), api.request('sensors'),
    api.request('weather-data?horas=24'), api.request('forecasts/alerts')
  ]);
  if (users.status === 'fulfilled') document.getElementById(ids[0]).textContent =
    (users.value.data || []).filter((item) => item.status === 'ACTIVE').length;
  const sensorList = document.getElementById('monitorSensorList');
  if (sensors.status === 'fulfilled') {
    const items = sensors.value.data || [];
    document.getElementById(ids[1]).textContent = items.filter((item) => item.status === 'ATIVO').length;
    sensorList.replaceChildren();
    items.slice(0, 6).forEach((sensor) => {
      const row = document.createElement('p');
      const last = sensor.ultimaLeitura;
      row.textContent = last
        ? `${sensor.identificador} · ${sensor.talhao.nome} · ${last.temperatura} °C · ${last.umidade}% · ${new Date(last.timestamp).toLocaleString('pt-BR')}`
        : `${sensor.identificador} · ${sensor.talhao.nome} · sem leitura`;
      sensorList.append(row);
    });
    if (!items.length) sensorList.textContent = 'Nenhum sensor cadastrado.';
  } else sensorList.textContent = sensors.reason?.message || 'Falha ao carregar sensores.';
  if (readings.status === 'fulfilled') document.getElementById(ids[2]).textContent = (readings.value.data || []).length;
  const alertList = document.getElementById('monitorAlertList');
  if (alerts.status === 'fulfilled') {
    const open = (alerts.value.data || []).filter((item) => !['RESOLVIDO', 'FECHADO'].includes(item.status));
    document.getElementById(ids[3]).textContent = open.length;
    alertList.replaceChildren();
    open.slice(0, 5).forEach((alert) => {
      const row = document.createElement('p');
      row.textContent = `${alert.mensagem || alert.tipo} · ${alert.previsao.talhao.propriedade.nome}`;
      alertList.append(row);
    });
    if (!open.length) alertList.textContent = 'Nenhum alerta em aberto.';
  } else alertList.textContent = alerts.reason?.message || 'Falha ao carregar alertas.';
}

carregarResumoMonitoramento();

carregarUsuarios();

