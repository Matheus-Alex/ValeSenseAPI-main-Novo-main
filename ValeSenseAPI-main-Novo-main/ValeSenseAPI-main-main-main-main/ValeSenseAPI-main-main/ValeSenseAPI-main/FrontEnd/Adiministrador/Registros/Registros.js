const api = window.ValeSenseApi;
const filtroAcao = document.getElementById('filtroAcao');
const filtroData = document.getElementById('filtroData');

document.getElementById('scrollTopBtn').addEventListener('click', () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

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

function aplicarFiltroRegistros() {
  document.querySelectorAll('#tabelaRegistros tbody tr[data-categoria]').forEach((linha) => {
    const bateCategoria = filtroAcao.value === 'todas' || linha.dataset.categoria === filtroAcao.value;
    const dataFiltro = filtroData.value;
    const bateData = !dataFiltro || linha.cells[0].textContent.slice(0, 10).split('/').reverse().join('-') === dataFiltro;
    linha.classList.toggle('hidden-row', !bateCategoria || !bateData);
  });
}

async function carregarRegistros() {
  const body = document.getElementById('accessLogBody');
  const alerta = document.getElementById('loginAlert');
  const alertaVazio = document.getElementById('loginAlertEmpty');
  try {
    const { data: logs } = await api.request('users/access-logs');
    body.replaceChildren();
    const falhasLogin = logs.filter((log) => log.action === 'LOGIN' && log.result === 'FALHA');
    alerta.hidden = falhasLogin.length === 0;
    alerta.style.display = falhasLogin.length ? 'flex' : 'none';
    alertaVazio.hidden = falhasLogin.length !== 0;
    alertaVazio.style.display = falhasLogin.length ? 'none' : 'block';
    if (falhasLogin.length) {
      document.getElementById('loginAlertTitle').textContent = `${falhasLogin.length} tentativas de login falhas`;
      document.getElementById('loginAlertSub').textContent = `Última ocorrência: ${new Date(falhasLogin[0].timestamp).toLocaleString('pt-BR')}`;
    }

    logs.forEach((log) => {
      const categoria = log.action === 'SENSOR' ? 'sensor'
        : log.result === 'FALHA' ? 'seguranca' : 'usuario';
      const nomeCategoria = categoria === 'sensor' ? 'Sensores'
        : categoria === 'seguranca' ? 'Segurança' : 'Usuários';
      const descricao = log.action === 'LOGIN' ? (log.result === 'SUCESSO' ? 'Login realizado' : 'Login falho')
        : log.action === 'CADASTRO' ? 'Cadastro de usuário'
          : log.action === 'SENSOR' ? 'Alteração de sensor' : log.action;
      const row = document.createElement('tr');
      row.dataset.categoria = categoria;
      row.append(
        criarCelula(new Date(log.timestamp).toLocaleString('pt-BR')),
        criarCelula(log.user),
        criarCelula(descricao),
        criarCelula(log.email || log.ip || '—'),
        criarCelula(log.result === 'FALHA' ? 'Operação não concluída' : 'Operação concluída')
      );
      const categoryCell = document.createElement('td');
      const tag = document.createElement('span');
      tag.className = `tag ${categoria}`;
      tag.textContent = nomeCategoria;
      categoryCell.append(tag);
      row.append(categoryCell);
      body.append(row);
    });
    if (!logs.length) mostrarMensagemNaTabela(body, 6, 'Nenhum registro de acesso no banco.');
    aplicarFiltroRegistros();
  } catch (error) {
    console.error('Falha ao carregar registros de acesso:', error);
    mostrarMensagemNaTabela(body, 6, error.message || 'Não foi possível carregar os registros.');
    alerta.hidden = true;
    alerta.style.display = 'none';
    alertaVazio.textContent = error.message || 'Não foi possível carregar os alertas.';
    alertaVazio.hidden = false;
    alertaVazio.style.display = 'block';
  }
}

filtroAcao.addEventListener('change', aplicarFiltroRegistros);
filtroData.addEventListener('change', aplicarFiltroRegistros);

document.getElementById('exportRegistrosBtn').addEventListener('click', () => {
  const cabecalho = ['Data/Hora', 'Usuário', 'Ação', 'Alvo', 'Detalhes', 'Categoria'];
  const rows = Array.from(document.querySelectorAll('#tabelaRegistros tbody tr[data-categoria]'))
    .filter((row) => !row.classList.contains('hidden-row'));
  const csv = [cabecalho, ...rows.map((row) => Array.from(row.cells, (cell) => cell.textContent.trim()))]
    .map((row) => row.map((value) => `"${value.replace(/"/g, '""')}"`).join(','))
    .join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'registros_valesense.csv';
  link.click();
  URL.revokeObjectURL(url);
});

carregarRegistros();
