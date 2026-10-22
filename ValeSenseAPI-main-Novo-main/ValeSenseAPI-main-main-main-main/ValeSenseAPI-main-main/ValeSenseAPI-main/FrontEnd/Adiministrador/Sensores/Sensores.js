const api = window.ValeSenseApi;

document.getElementById('scrollTopBtn').addEventListener('click', () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

async function carregarSensores() {
  const sensorList = document.getElementById('sensorList');
  try {
    const { data: sensores } = await api.request('sensors');
    sensorList.replaceChildren();
    sensores.forEach((sensor) => {
      const bloco = document.createElement('div');
      bloco.className = 'sensor-block';
      bloco.dataset.sensor = sensor.id;
      const nome = document.createElement('p');
      nome.className = 'sensor-name';
      nome.textContent = `${sensor.identificador} · ${sensor.talhao.nome}`;
      const row = document.createElement('div');
      row.className = 'sensor-row';
      const status = document.createElement('div');
      status.className = `sensor-status ${sensor.status === 'ATIVO' ? 'ok' : 'danger'}`;
      const detail = document.createElement('span');
      detail.textContent = sensor.status === 'ATIVO'
        ? 'Ativo e disponível para registrar leituras'
        : sensor.status === 'MANUTENCAO' ? 'Em manutenção' : 'Inativo';
      status.append(detail);
      const label = document.createElement('label');
      label.className = 'toggle';
      label.setAttribute('aria-label', `Ativar ou desativar ${sensor.identificador}`);
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = sensor.status === 'ATIVO';
      checkbox.dataset.sensorToggle = sensor.id;
      checkbox.dataset.previousStatus = sensor.status;
      const track = document.createElement('span');
      track.className = 'toggle-track';
      track.innerHTML = '<span class="toggle-thumb"></span>';
      label.append(checkbox, track);
      row.append(status, label);
      bloco.append(nome, row);
      sensorList.append(bloco);
    });
    if (!sensores.length) sensorList.textContent = 'Nenhum sensor cadastrado no banco.';
  } catch (error) {
    console.error('Falha ao carregar sensores:', error);
    sensorList.textContent = error.message || 'Não foi possível carregar os sensores.';
  }
}

document.getElementById('sensorList').addEventListener('change', async (event) => {
  const toggle = event.target.closest('[data-sensor-toggle]');
  if (!toggle) return;
  const oldStatus = toggle.dataset.previousStatus;
  const status = toggle.checked ? 'ATIVO' : 'INATIVO';
  toggle.disabled = true;
  try {
    const { sensor } = await api.request(`sensors/${toggle.dataset.sensorToggle}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    });
    toggle.dataset.previousStatus = sensor.status;
    await carregarSensores();
  } catch (error) {
    toggle.checked = oldStatus === 'ATIVO';
    window.alert(error.message || 'Não foi possível atualizar o sensor.');
  } finally {
    toggle.disabled = false;
  }
});

document.getElementById('addSensorBtn').addEventListener('click', async () => {
  try {
    const { data: talhoes } = await api.request('sensors/plots');
    if (!talhoes.length) {
      window.alert('Cadastre uma propriedade e um talhão no banco antes de adicionar sensores.');
      return;
    }
    const opcoes = talhoes.map((talhao) => `${talhao.nome} (${talhao.propriedade.nome}) — ${talhao.id}`).join('\n');
    const talhaoId = window.prompt(`Informe o ID do talhão:\n${opcoes}`);
    if (talhaoId === null) return;
    const identificador = window.prompt('Identificador do sensor:');
    if (identificador === null) return;
    const canalThingSpeak = window.prompt('Canal ThingSpeak (opcional):');
    if (canalThingSpeak === null) return;
    await api.request('sensors', {
      method: 'POST',
      body: JSON.stringify({ talhaoId: talhaoId.trim(), identificador, canalThingSpeak })
    });
    await carregarSensores();
  } catch (error) {
    window.alert(error.message || 'Não foi possível cadastrar o sensor.');
  }
});

carregarSensores();
