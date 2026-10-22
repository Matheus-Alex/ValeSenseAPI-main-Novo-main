const saveMessage = document.getElementById('save-msg');

function aplicarConfiguracoes(configuracao) {
  if (configuracao.unidadeTemp !== undefined) {
    document.getElementById('unidade-temp').value = configuracao.unidadeTemp;
  }
  if (configuracao.formatoExport !== undefined) {
    document.getElementById('formato-export').value = configuracao.formatoExport;
  }
  if (configuracao.alertaDivergencia !== undefined) {
    document.getElementById('alerta-divergencia').checked = configuracao.alertaDivergencia;
  }
  if (configuracao.limiteDivergencia !== undefined) {
    document.getElementById('limite-divergencia').value = configuracao.limiteDivergencia;
  }
  if (configuracao.alertaSensor !== undefined) {
    document.getElementById('alerta-sensor').checked = configuracao.alertaSensor;
  }
  if (configuracao.frequenciaAtualizacao !== undefined) {
    document.getElementById('freq-atualizacao').value = configuracao.frequenciaAtualizacao;
  }
}

async function carregarConfiguracoes() {
  try {
    const { data } = await window.ValeSenseApi.request('users/me/configuration');
    aplicarConfiguracoes(data);
  } catch (error) {
    console.error('Falha ao carregar preferências:', error);
    window.alert(error.message || 'Não foi possível carregar as preferências do banco.');
  }
}

async function carregarCanais() {
  const lista = document.getElementById('canais-lista');
  try {
    const { data: sensores } = await window.ValeSenseApi.request('sensors');
    lista.replaceChildren();
    sensores.forEach((sensor) => {
      const linha = document.createElement('div');
      linha.className = 'channel-row';
      const nome = document.createElement('span');
      nome.textContent = sensor.identificador;
      const canal = document.createElement('span');
      canal.textContent = sensor.canalThingSpeak
        ? `Canal ThingSpeak: ${sensor.canalThingSpeak}`
        : 'Sem canal ThingSpeak associado';
      linha.append(nome, canal);
      lista.append(linha);
    });
    if (!sensores.length) lista.textContent = 'Nenhum sensor cadastrado.';
  } catch (error) {
    console.error('Falha ao carregar canais dos sensores:', error);
    lista.textContent = error.message || 'Não foi possível carregar os canais.';
  }
}

document.getElementById('salvar-btn').addEventListener('click', async () => {
  const config = {
    unidadeTemp: document.getElementById('unidade-temp').value,
    formatoExport: document.getElementById('formato-export').value,
    alertaDivergencia: document.getElementById('alerta-divergencia').checked,
    limiteDivergencia: Number(document.getElementById('limite-divergencia').value),
    alertaSensor: document.getElementById('alerta-sensor').checked,
    frequenciaAtualizacao: Number(document.getElementById('freq-atualizacao').value)
  };
  const saveButton = document.getElementById('salvar-btn');
  saveButton.disabled = true;
  try {
    await window.ValeSenseApi.request('users/me/configuration', {
      method: 'PUT',
      body: JSON.stringify(config)
    });
    saveMessage.textContent = 'Preferências salvas no banco';
    saveMessage.classList.add('show');
    setTimeout(() => saveMessage.classList.remove('show'), 2500);
  } catch (error) {
    console.error('Falha ao salvar preferências:', error);
    saveMessage.textContent = error.message || 'Não foi possível salvar as preferências.';
    saveMessage.classList.add('show');
  } finally {
    saveButton.disabled = false;
  }
});

document.getElementById('scrollTopBtn').addEventListener('click', () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

carregarConfiguracoes();
carregarCanais();
