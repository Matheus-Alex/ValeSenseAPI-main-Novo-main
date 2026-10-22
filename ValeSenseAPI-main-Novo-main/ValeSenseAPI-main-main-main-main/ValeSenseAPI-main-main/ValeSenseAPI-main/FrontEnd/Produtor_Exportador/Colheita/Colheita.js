const { $, node, setEmpty, request, formatDate } = window.ProdutorApp;
let forecasts = [];

function renderForecasts() {
  const container = $("#forecastTimeline");
  const type = $("#forecastType").value;
  const filtered = forecasts.filter((item) => !type || item.tipo === type);
  container.replaceChildren();
  if (!filtered.length) {
    setEmpty(container, forecasts.length ? "Não há previsões deste tipo." : "Nenhuma janela futura foi cadastrada para seus talhões.");
    return;
  }
  filtered.forEach((item) => {
    const row = node("article", "pe-timeline-item");
    const dates = node("div", "pe-timeline-date", `${formatDate(item.dataInicio)}\naté ${formatDate(item.dataFim)}`);
    dates.style.whiteSpace = "pre-line";
    const copy = node("div", "pe-timeline-copy");
    copy.append(node("strong", "", `${item.tipo === "COLHEITA" ? "Janela de colheita" : "Janela de exportação"} · ${item.talhao.nome}`));
    copy.append(node("small", "", item.talhao.propriedade?.nome || "Propriedade não informada"));
    const confidence = item.confianca === null ? "Confiança não informada" : `${Number(item.confianca).toLocaleString("pt-BR")}% de confiança`;
    row.append(dates, copy, node("span", `pe-badge ${item.confianca === null ? "info" : ""}`, confidence));
    container.append(row);
  });
}

$("#forecastType").addEventListener("change", renderForecasts);

async function loadForecasts() {
  const container = $("#forecastTimeline");
  try {
    const result = await request("forecasts");
    forecasts = result.data;
    renderForecasts();
  } catch (error) {
    setEmpty(container, error.message || "Não foi possível carregar as previsões.");
  }
}

loadForecasts();
