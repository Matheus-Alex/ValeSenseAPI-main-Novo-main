const { $, node, setEmpty, request, formatDate } = window.ProdutorApp;
let plots = [];

function renderPlots() {
  const grid = $("#plotGrid");
  const term = $("#plotSearch").value.trim().toLocaleLowerCase("pt-BR");
  const visible = plots.filter((plot) => `${plot.nome} ${plot.propriedade.nome}`.toLocaleLowerCase("pt-BR").includes(term));
  grid.replaceChildren();
  if (!visible.length) {
    setEmpty(grid, plots.length ? "Nenhum talhão corresponde à pesquisa." : "Nenhum talhão foi cadastrado para suas propriedades.");
    return;
  }

  visible.forEach((plot) => {
    const card = node("article", "pe-panel pe-plot-card");
    const top = node("div", "pe-plot-top");
    const title = node("div");
    title.append(node("h2", "", plot.nome), node("p", "pe-property", plot.propriedade.nome));
    const attachedSensors = plot.sensors;
    const hasInactive = attachedSensors.some((sensor) => sensor.status !== "ATIVO");
    const badgeText = !attachedSensors.length ? "Sem sensor" : hasInactive ? "Verificar sensor" : "Ativo";
    const badgeClass = !attachedSensors.length ? "info" : hasInactive ? "warn" : "";
    top.append(title, node("span", `pe-badge ${badgeClass}`, badgeText));
    const metrics = node("div", "pe-plot-metrics");
    const area = node("div");
    area.append(node("span", "", "Área cadastrada"), node("strong", "", `${plot.area} ${plot.unidadeArea}`));
    const sensorCount = node("div");
    sensorCount.append(node("span", "", "Sensores vinculados"), node("strong", "", String(attachedSensors.length)));
    metrics.append(area, sensorCount);
    const latest = attachedSensors
      .map((sensor) => ({ sensor, reading: sensor.ultimaLeitura }))
      .filter((item) => item.reading)
      .sort((a, b) => new Date(b.reading.timestamp) - new Date(a.reading.timestamp))[0];
    const current = node("div", "pe-inline-meta");
    if (latest) {
      current.textContent = `Última leitura: ${latest.reading.temperatura} °C · ${latest.reading.umidade}% · ${formatDate(latest.reading.timestamp, { dateStyle: "short", timeStyle: "short" })}`;
    } else {
      current.textContent = "Sem leitura climática registrada para este talhão.";
    }
    card.append(top, metrics, current);
    grid.append(card);
  });
}

async function loadPlots() {
  const grid = $("#plotGrid");
  try {
    const [plotResult, sensorResult] = await Promise.all([
      request("sensors/plots"),
      request("sensors")
    ]);
    const sensorsByPlot = new Map();
    sensorResult.data.forEach((sensor) => {
      const list = sensorsByPlot.get(sensor.talhao.id) || [];
      list.push(sensor);
      sensorsByPlot.set(sensor.talhao.id, list);
    });
    plots = plotResult.data.map((plot) => ({
      ...plot,
      sensors: sensorsByPlot.get(plot.id) || []
    }));
    renderPlots();
  } catch (error) {
    setEmpty(grid, error.message || "Não foi possível carregar os talhões.");
  }
}

$("#plotSearch").addEventListener("input", renderPlots);
loadPlots();
