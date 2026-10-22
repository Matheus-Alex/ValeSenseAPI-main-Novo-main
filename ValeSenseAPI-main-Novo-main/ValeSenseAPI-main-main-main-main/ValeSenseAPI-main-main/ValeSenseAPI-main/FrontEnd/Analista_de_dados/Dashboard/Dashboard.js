const sections = document.querySelectorAll('.page-section');
const navItems = document.querySelectorAll('#scrollNav .nav-item[data-section]');
const api = window.ValeSenseApi;

function ativarNav(sectionId) {
  navItems.forEach((item) => {
    item.classList.toggle('active', item.dataset.section === sectionId);
  });
}

const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) ativarNav(entry.target.id);
    });
  },
  { rootMargin: '-96px 0px -60% 0px', threshold: 0 }
);

sections.forEach((section) => observer.observe(section));

navItems.forEach((item) => {
  item.addEventListener('click', (event) => {
    event.preventDefault();
    document.getElementById(item.dataset.section).scrollIntoView({ behavior: 'smooth' });
  });
});

document.getElementById('scrollTopBtn').addEventListener('click', () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

document.getElementById('selectedDayLabel').textContent = 'Últimas leituras registradas';

const horasHome = [];
let leiturasHome = [];
let modoTemperatura = 'normal';
let modoUmidade = 'normal';

const tempChart = new Chart(document.getElementById('tempChart'), {
  type: 'line',
  data: {
    labels: horasHome,
    datasets: [{
      label: 'Temperatura',
      data: [],
      borderColor: '#33512A',
      backgroundColor: 'transparent',
      tension: 0.35,
      pointRadius: 2
    }]
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: { x: { display: false }, y: { display: false } }
  }
});

const umidadeChart = new Chart(document.getElementById('umidadeChart'), {
  type: 'bar',
  data: {
    labels: horasHome,
    datasets: [{
      label: 'Umidade',
      data: [],
      backgroundColor: '#A9BB84',
      borderRadius: 4,
      maxBarThickness: 18
    }]
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: { x: { display: false }, y: { display: false } }
  }
});

function limparLeiturasHome(mensagem) {
  leiturasHome = [];
  horasHome.splice(0);
  tempChart.data.labels = [];
  umidadeChart.data.labels = [];
  tempChart.data.datasets[0].data = [];
  umidadeChart.data.datasets[0].data = [];
  tempChart.update();
  umidadeChart.update();
  document.getElementById('weatherTemp').textContent = '--';
  document.getElementById('weatherCondition').textContent = mensagem;
  document.getElementById('weatherSensacao').textContent = '';
  document.getElementById('umidadeValor').textContent = '--';
  document.getElementById('umidadeTag').hidden = true;
  document.getElementById('tempNote').textContent = mensagem;
  document.getElementById('umidadeNote').textContent = mensagem;
}

function aplicarModoHome() {
  const temperaturas = leiturasHome.map((item) => item.temperatura);
  const umidades = leiturasHome.map((item) => item.umidade);
  const temperaturaExtrema = modoTemperatura === 'max'
    ? Math.max(...temperaturas)
    : Math.min(...temperaturas);
  const umidadeExtrema = modoUmidade === 'max'
    ? Math.max(...umidades)
    : Math.min(...umidades);
  const nomeModoTemperatura = modoTemperatura === 'max' ? 'máxima' : 'mínima';
  const nomeModoUmidade = modoUmidade === 'max' ? 'máxima' : 'mínima';

  tempChart.data.datasets[0].data = modoTemperatura === 'normal'
    ? temperaturas
    : temperaturas.map(() => temperaturaExtrema);
  umidadeChart.data.datasets[0].data = modoUmidade === 'normal'
    ? umidades
    : umidades.map(() => umidadeExtrema);
  tempChart.update();
  umidadeChart.update();

  document.getElementById('tempNote').textContent = modoTemperatura === 'normal'
    ? `Leituras do sensor ${leiturasHome[0].sensor.identificador}`
    : `Temperatura ${nomeModoTemperatura} registrada: ${temperaturaExtrema.toLocaleString('pt-BR')} °C`;
  document.getElementById('umidadeNote').textContent = modoUmidade === 'normal'
    ? `Leituras do sensor ${leiturasHome[0].sensor.identificador}`
    : `Umidade ${nomeModoUmidade} registrada: ${umidadeExtrema.toLocaleString('pt-BR')}%`;
}

async function carregarLeiturasHome() {
  limparLeiturasHome('Carregando leituras do banco...');
  try {
    const { data } = await api.request('weather-data?horas=168');
    if (!data.length) {
      limparLeiturasHome('Nenhuma leitura de sensor registrada nos últimos 7 dias.');
      return;
    }

    const sensorMaisRecente = data[data.length - 1].sensor;
    leiturasHome = data
      .filter((item) => item.sensor.id === sensorMaisRecente.id)
      .slice(-6);
    const rotulos = leiturasHome.map((item) => new Date(item.timestamp).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    }));
    horasHome.splice(0, horasHome.length, ...rotulos);
    tempChart.data.labels = rotulos;
    umidadeChart.data.labels = rotulos;

    const ultimaLeitura = leiturasHome[leiturasHome.length - 1];
    const formatar = (valor) => valor.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
    document.getElementById('weatherTemp').textContent = `${formatar(ultimaLeitura.temperatura)} °C`;
    document.getElementById('weatherCondition').textContent = 'Última leitura registrada';
    document.getElementById('weatherSensacao').textContent =
      `${sensorMaisRecente.identificador} · ${new Date(ultimaLeitura.timestamp).toLocaleString('pt-BR')}`;
    document.getElementById('umidadeValor').textContent = `${formatar(ultimaLeitura.umidade)}%`;
    const tag = document.getElementById('umidadeTag');
    tag.hidden = false;
    tag.textContent = ultimaLeitura.umidade >= 70
      ? 'Úmido'
      : ultimaLeitura.umidade < 40 ? 'Seco' : 'Agradável';
    aplicarModoHome();
  } catch (error) {
    console.error('Falha ao carregar leituras climáticas:', error);
    limparLeiturasHome('Não foi possível carregar as leituras do banco.');
  }
}

document.querySelectorAll('[data-temperature-mode]').forEach((button) => {
  button.addEventListener('click', () => {
    const selectedMode = button.dataset.temperatureMode;
    modoTemperatura = modoTemperatura === selectedMode ? 'normal' : selectedMode;
    document.querySelectorAll('[data-temperature-mode]').forEach((modeButton) => {
      const isActive = modeButton.dataset.temperatureMode === modoTemperatura;
      modeButton.classList.toggle('active', isActive);
      modeButton.setAttribute('aria-pressed', String(isActive));
    });
    if (leiturasHome.length) aplicarModoHome();
  });
});

document.querySelectorAll('[data-humidity-mode]').forEach((button) => {
  button.addEventListener('click', () => {
    const selectedMode = button.dataset.humidityMode;
    modoUmidade = modoUmidade === selectedMode ? 'normal' : selectedMode;
    document.querySelectorAll('[data-humidity-mode]').forEach((modeButton) => {
      const isActive = modeButton.dataset.humidityMode === modoUmidade;
      modeButton.classList.toggle('active', isActive);
      modeButton.setAttribute('aria-pressed', String(isActive));
    });
    if (leiturasHome.length) aplicarModoHome();
  });
});

const sensorStatusChart = new Chart(document.getElementById('visaoGeralChart'), {
  type: 'bar',
  data: {
    labels: ['Ativos', 'Inativos', 'Manutenção'],
    datasets: [{
      label: 'Sensores',
      data: [],
      backgroundColor: ['#477A3B', '#B3413A', '#A9BB84'],
      borderRadius: 6
    }]
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { ticks: { font: { size: 10 } } },
      y: { beginAtZero: true, ticks: { precision: 0, font: { size: 10 } } }
    }
  }
});

const climChart = new Chart(document.getElementById('climChart'), {
  type: 'line',
  data: {
    labels: [],
    datasets: [
      { label: 'Temperatura (°C)', data: [], borderColor: '#D85A30', backgroundColor: 'transparent', tension: 0.3, yAxisID: 'y' },
      { label: 'Umidade (%)', data: [], borderColor: '#378ADD', backgroundColor: 'transparent', tension: 0.3, yAxisID: 'y1' }
    ]
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { labels: { font: { size: 10 } } } },
    scales: {
      x: { ticks: { font: { size: 9 } } },
      y: { position: 'left', ticks: { font: { size: 9 } } },
      y1: { position: 'right', grid: { drawOnChartArea: false }, ticks: { font: { size: 9 } } }
    }
  }
});

function aplicarTemaDosGraficos() {
  const dark = document.documentElement.classList.contains('dark-theme');
  const palette = dark
    ? { text: '#b8c9b3', grid: '#536354', axis: '#788a78', temperature: '#a9c796', humidity: '#85b8cf', bars: '#8aaa78' }
    : { text: '#4A4A4A', grid: '#d5dfc9', axis: '#a7b49b', temperature: '#33512A', humidity: '#378ADD', bars: '#A9BB84' };
  [tempChart, umidadeChart, sensorStatusChart, climChart].forEach((chart) => {
    chart.options.color = palette.text;
    Object.values(chart.options.scales || {}).forEach((scale) => {
      scale.ticks = scale.ticks || {};
      scale.ticks.color = palette.text;
      scale.grid = scale.grid || {};
      scale.grid.color = palette.grid;
      scale.border = scale.border || {};
      scale.border.color = palette.axis;
    });
  });
  tempChart.data.datasets[0].borderColor = palette.temperature;
  umidadeChart.data.datasets[0].backgroundColor = palette.bars;
  sensorStatusChart.data.datasets[0].backgroundColor = [dark ? '#78a66b' : '#477A3B', dark ? '#e08a82' : '#B3413A', palette.bars];
  climChart.data.datasets[0].borderColor = dark ? '#ff9b7a' : '#D85A30';
  climChart.data.datasets[1].borderColor = palette.humidity;
  [tempChart, umidadeChart, sensorStatusChart, climChart].forEach((chart) => chart.update('none'));
}

aplicarTemaDosGraficos();
new MutationObserver(aplicarTemaDosGraficos).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

const canalSelect = document.getElementById('canalSelect');
const periodoSelect = document.getElementById('periodoSelect');
const sensorList = document.getElementById('sensorList');
const historyNote = document.getElementById('historyNote');
let leiturasDoGrafico = [];

async function atualizarGraficos() {
  const diasSelecionados = periodoSelect.value === 'safra' ? 365 : Number(periodoSelect.value);
  const parametros = new URLSearchParams({ dias: String(diasSelecionados) });
  if (canalSelect.value) parametros.set('sensorId', canalSelect.value);

  try {
    const resultado = await api.request(`weather-data?${parametros}`);
    leiturasDoGrafico = resultado.data;
    climChart.data.labels = leiturasDoGrafico.map((item) => new Date(item.timestamp).toLocaleString('pt-BR'));
    climChart.data.datasets[0].data = leiturasDoGrafico.map((item) => item.temperatura);
    climChart.data.datasets[1].data = leiturasDoGrafico.map((item) => item.umidade);
    historyNote.textContent = leiturasDoGrafico.length
      ? `${leiturasDoGrafico.length} leitura(s) encontrada(s) no banco.`
      : 'Nenhuma leitura encontrada para o período selecionado.';
    climChart.update();
  } catch (error) {
    console.error('Falha ao atualizar o histórico de sensores:', error);
    leiturasDoGrafico = [];
    climChart.data.labels = [];
    climChart.data.datasets.forEach((dataset) => { dataset.data = []; });
    historyNote.textContent = 'Não foi possível carregar o histórico do banco.';
    climChart.update();
  }
}

async function carregarSensores() {
  sensorList.textContent = 'Carregando sensores do banco...';
  try {
    const { data: sensores } = await api.request('sensors');
    sensorList.replaceChildren();
    canalSelect.replaceChildren(new Option('Todos os sensores', ''));
    const contagem = { ATIVO: 0, INATIVO: 0, MANUTENCAO: 0 };

    sensores.forEach((sensor) => {
      contagem[sensor.status] = (contagem[sensor.status] || 0) + 1;
      canalSelect.add(new Option(sensor.identificador, sensor.id));
      const bloco = document.createElement('div');
      bloco.className = 'sensor-block';
      const nome = document.createElement('p');
      nome.className = 'sensor-name';
      nome.textContent = sensor.identificador;
      const linha = document.createElement('div');
      linha.className = 'sensor-row';
      const estado = document.createElement('div');
      estado.className = `sensor-status ${sensor.status === 'ATIVO' ? 'ok' : 'danger'}`;
      const texto = document.createElement('span');
      texto.textContent = `${sensor.status} · Talhão ${sensor.talhao.nome}`;
      estado.append(texto);
      const indicador = document.createElement('span');
      indicador.className = `status-dot ${sensor.status === 'ATIVO' ? 'ok' : 'danger'}`;
      indicador.title = sensor.status;
      linha.append(estado, indicador);
      bloco.append(nome, linha);
      sensorList.append(bloco);
    });

    if (!sensores.length) sensorList.textContent = 'Nenhum sensor cadastrado no banco.';
    sensorStatusChart.data.datasets[0].data = [contagem.ATIVO, contagem.INATIVO, contagem.MANUTENCAO];
    sensorStatusChart.update();
    await atualizarGraficos();
  } catch (error) {
    console.error('Falha ao carregar sensores:', error);
    sensorList.textContent = error.message || 'Não foi possível carregar os sensores do banco.';
    sensorStatusChart.data.datasets[0].data = [];
    sensorStatusChart.update();
    await atualizarGraficos();
  }
}

async function carregarPrevisoes() {
  const container = document.getElementById('forecastList');
  try {
    const { data: previsoes } = await api.request('forecasts');
    container.replaceChildren();
    if (!previsoes.length) {
      container.textContent = 'Nenhuma previsão de safra cadastrada no banco.';
      return;
    }

    previsoes.forEach((previsao) => {
      const item = document.createElement('div');
      item.className = 'forecast-item';
      const titulo = document.createElement('strong');
      titulo.textContent = previsao.tipo === 'COLHEITA' ? 'Colheita' : 'Exportação';
      const periodo = document.createElement('span');
      const inicio = new Date(`${previsao.dataInicio}T00:00:00`).toLocaleDateString('pt-BR');
      const fim = new Date(`${previsao.dataFim}T00:00:00`).toLocaleDateString('pt-BR');
      periodo.textContent = `${inicio} a ${fim} · Talhão ${previsao.talhao.nome}`;
      const confianca = document.createElement('span');
      confianca.textContent = previsao.confianca === null
        ? 'Confiança não informada'
        : `Confiança: ${previsao.confianca}%`;
      item.append(titulo, periodo, confianca);
      container.append(item);
    });
  } catch (error) {
    console.error('Falha ao carregar previsões:', error);
    container.textContent = 'Não foi possível carregar as previsões do banco.';
  }
}

canalSelect.addEventListener('change', atualizarGraficos);
periodoSelect.addEventListener('change', atualizarGraficos);

document.getElementById('exportBtn').addEventListener('click', () => {
  if (!leiturasDoGrafico.length) {
    window.alert('Não há leituras do banco para exportar.');
    return;
  }
  const csv = [
    'data_hora,sensor,talhao,temperatura,umidade',
    ...leiturasDoGrafico.map((item) => [
      item.timestamp,
      item.sensor.identificador,
      item.sensor.talhao.nome,
      item.temperatura,
      item.umidade
    ].map((value) => `"${String(value).replace(/"/g, '""')}"`).join(','))
  ].join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `leituras_${periodoSelect.value}.csv`;
  link.click();
  URL.revokeObjectURL(url);
});

document.getElementById('weatherTemp').textContent = '--';
document.getElementById('weatherCondition').textContent = 'Carregando leituras do banco...';
document.getElementById('weatherSensacao').textContent = '';
document.getElementById('umidadeValor').textContent = '--';
document.getElementById('umidadeTag').hidden = true;
historyNote.textContent = 'Carregando histórico do banco...';

carregarLeiturasHome();
carregarSensores();
carregarPrevisoes();
