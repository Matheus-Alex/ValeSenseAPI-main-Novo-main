const tabs = document.querySelectorAll('.tab');
const panels = document.querySelectorAll('.tab-panel');
const leiturasBody = document.getElementById('leituras-body');
const filtroSensor = document.getElementById('filtro-sensor');
let leituras = [];

tabs.forEach((tab) => {
  tab.addEventListener('click', () => {
    tabs.forEach((item) => item.classList.remove('active'));
    panels.forEach((panel) => panel.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById(`panel-${tab.dataset.tab}`).classList.add('active');
  });
});

document.getElementById('scrollTopBtn').addEventListener('click', () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

function adicionarCelula(row, texto) {
  const cell = document.createElement('td');
  cell.textContent = texto;
  row.append(cell);
}

function renderizarLeituras() {
  const termo = document.getElementById('registroSearch').value.trim().toLocaleLowerCase('pt-BR');
  const sensorSelecionado = filtroSensor.value;
  const registrosVisiveis = leituras.filter((leitura) => {
    const bateSensor = sensorSelecionado === 'todos' || leitura.sensor.identificador === sensorSelecionado;
    const conteudo = `${leitura.sensor.identificador} ${leitura.sensor.talhao.nome} ${leitura.temperatura} ${leitura.umidade} ${leitura.timestamp}`.toLocaleLowerCase('pt-BR');
    return bateSensor && conteudo.includes(termo);
  });

  leiturasBody.replaceChildren();
  if (!registrosVisiveis.length) {
    const row = document.createElement('tr');
    const message = document.createElement('td');
    message.colSpan = 5;
    message.textContent = 'Nenhuma leitura encontrada no banco para este filtro.';
    row.append(message);
    leiturasBody.append(row);
    return;
  }

  registrosVisiveis.forEach((leitura) => {
    const row = document.createElement('tr');
    adicionarCelula(row, new Date(leitura.timestamp).toLocaleString('pt-BR'));
    adicionarCelula(row, leitura.sensor.identificador);
    adicionarCelula(row, `${leitura.temperatura.toLocaleString('pt-BR')}°C`);
    adicionarCelula(row, `${leitura.umidade.toLocaleString('pt-BR')}%`);
    const statusCell = document.createElement('td');
    const badge = document.createElement('span');
    badge.className = 'badge up';
    badge.textContent = 'Recebido';
    statusCell.append(badge);
    row.append(statusCell);
    leiturasBody.append(row);
  });
}

async function carregarLeituras() {
  try {
    const { data } = await window.ValeSenseApi.request('weather-data?dias=7');
    leituras = data;
    const sensores = [...new Set(leituras.map((item) => item.sensor.identificador))].sort();
    filtroSensor.replaceChildren(new Option('Todos os sensores', 'todos'));
    sensores.forEach((sensor) => filtroSensor.add(new Option(sensor, sensor)));
    renderizarLeituras();
  } catch (error) {
    console.error('Falha ao carregar leituras do banco:', error);
    leiturasBody.replaceChildren();
    const row = document.createElement('tr');
    const message = document.createElement('td');
    message.colSpan = 5;
    message.textContent = error.message || 'Não foi possível carregar as leituras.';
    row.append(message);
    leiturasBody.append(row);
  }
}

document.getElementById('filtro-sensor').addEventListener('change', renderizarLeituras);
document.getElementById('registroSearch').addEventListener('input', renderizarLeituras);

const exportacoesBody = document.getElementById('exportacoes-body');
const vazio = document.createElement('tr');
const mensagemVazia = document.createElement('td');
mensagemVazia.colSpan = 5;
mensagemVazia.textContent = 'O banco atual não possui uma tabela de exportações para consultar.';
vazio.append(mensagemVazia);
exportacoesBody.append(vazio);

carregarLeituras();
