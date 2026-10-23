const buscaFrutas = document.getElementById('frutaSearch');
const plantacoes = Array.from(document.querySelectorAll('.fruit-card[data-fruit]'));
const estadoVazio = document.getElementById('fruitEmpty');
const plantacoesComDados = new Set();
const normalizar = (valor) => valor.normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLocaleLowerCase('pt-BR');

plantacoes.forEach((plantacao) => { plantacao.hidden = true; });
estadoVazio.hidden = false;
estadoVazio.textContent = 'Carregando dados reais das plantaï¿½ï¿½es...';

function filtrarPlantacoes() {
  const termo = normalizar(buscaFrutas.value.trim());
  let visiveis = 0;

  plantacoes.forEach((plantacao) => {
    const corresponde = plantacoesComDados.has(plantacao)
      && normalizar(plantacao.textContent).includes(termo);
    plantacao.hidden = !corresponde;
    if (corresponde) visiveis += 1;
  });

  estadoVazio.hidden = visiveis > 0;
  if (!visiveis && plantacoesComDados.size) {
    estadoVazio.textContent = 'Nenhuma plantaï¿½ï¿½o corresponde ï¿½ pesquisa.';
  }
}

buscaFrutas.addEventListener('input', filtrarPlantacoes);

document.getElementById('scrollTopBtn').addEventListener('click', () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

async function carregarPrecosMercado() {
  const precos = document.querySelectorAll('[data-market-product]');
  try {
    const { data } = await window.ValeSenseApi.request('market-data?dias=365');
    precos.forEach((element) => {
      const produto = normalizar(element.dataset.marketProduct);
      const registro = data
        .filter((item) => normalizar(item.produto).includes(produto))
        .sort((a, b) => b.data.localeCompare(a.data))[0];
      if (!registro) {
        element.textContent = 'Preï¿½o de mercado: sem registro no banco';
        return;
      }
      const valor = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
        .format(registro.preco);
      const unidade = registro.unidadePreco ? ` ${registro.unidadePreco}` : '';
      element.textContent = `Preï¿½o de mercado: ${valor}${unidade} (${new Date(`${registro.data}T00:00:00`).toLocaleDateString('pt-BR')})`;
    });
  } catch (error) {
    console.error('Falha ao carregar preï¿½os de mercado:', error);
    precos.forEach((element) => {
      element.textContent = 'Preï¿½o de mercado indisponï¿½vel. Verifique a conexï¿½o com a API.';
    });
  }
}

async function carregarLeituras() {
  try {
    const { data } = await window.ValeSenseApi.request('weather-data?dias=7');
    plantacoes.forEach((card) => {
      const fruta = normalizar(card.dataset.fruit).replace(/s$/, '');
      const leituras = data.filter((item) => normalizar(
        `${item.sensor.identificador} ${item.sensor.talhao.nome}`
      ).includes(fruta));
      if (!leituras.length) return;

      const clima = card.querySelector('.current-weather');
      const grupos = card.querySelectorAll('.reading-group');
      const status = card.querySelector('.sensor-status');
      const ultima = leituras[leituras.length - 1];
      const temperaturas = leituras.map((item) => item.temperatura);
      const umidades = leituras.map((item) => item.umidade);
      const formatar = (valor) => valor.toLocaleString('pt-BR', { maximumFractionDigits: 2 });

      clima.querySelector('.weather-temp').textContent = `${formatar(ultima.temperatura)} ï¿½C`;
      clima.querySelectorAll('.weather-sub')[0].textContent = 'ï¿½ltima leitura registrada';
      clima.querySelectorAll('.weather-sub')[1].textContent =
        `${ultima.sensor.identificador} ï¿½ ${new Date(ultima.timestamp).toLocaleString('pt-BR')}`;
      grupos[0].querySelector('.reading-current strong').textContent = `${formatar(ultima.temperatura)} ï¿½C`;
      grupos[0].querySelectorAll('.reading-extreme strong')[0].textContent =
        `${formatar(Math.min(...temperaturas))} ï¿½C`;
      grupos[0].querySelectorAll('.reading-extreme strong')[1].textContent =
        `${formatar(Math.max(...temperaturas))} ï¿½C`;
      grupos[1].querySelector('.reading-current strong').textContent = `${formatar(ultima.umidade)}%`;
      grupos[1].querySelectorAll('.reading-extreme strong')[0].textContent =
        `${formatar(Math.min(...umidades))}%`;
      grupos[1].querySelectorAll('.reading-extreme strong')[1].textContent =
        `${formatar(Math.max(...umidades))}%`;
      status.className = `sensor-status ${ultima.sensor.status === 'ATIVO' ? 'ok' : 'danger'}`;
      status.querySelector('span').textContent = ultima.sensor.status === 'ATIVO'
        ? 'Sensor ativo e registrando leituras'
        : 'Sensor inativo';

      plantacoesComDados.add(card);
      card.hidden = false;
    });

    if (!plantacoesComDados.size) {
      estadoVazio.textContent = 'Nenhuma leitura cadastrada no banco corresponde ï¿½s plantaï¿½ï¿½es exibidas.';
    }
    filtrarPlantacoes();
  } catch (error) {
    console.error('Falha ao carregar leituras das plantaï¿½ï¿½es:', error);
    estadoVazio.hidden = false;
    estadoVazio.textContent = 'Nï¿½o foi possï¿½vel carregar os dados das plantaï¿½ï¿½es do banco.';
  }
}

carregarPrecosMercado();
carregarLeituras();

