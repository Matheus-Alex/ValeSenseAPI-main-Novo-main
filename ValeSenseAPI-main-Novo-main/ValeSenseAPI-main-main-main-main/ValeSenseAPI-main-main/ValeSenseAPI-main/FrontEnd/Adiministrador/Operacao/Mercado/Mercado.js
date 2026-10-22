const { $, node, setEmpty, request, formatDate } = window.ProdutorApp;
const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
let records = [];
let chart;
let fruitSalesChart;

function selectedRecords() {
  const product = $("#marketProduct").value;
  return records.filter((entry) => product && entry.produto === product)
    .sort((a, b) => a.data.localeCompare(b.data));
}

function numericDemand(value) {
  if (value === null || value === undefined) return null;
  const normalized = String(value).trim();
  if (!/^\d+(?:[.,]\d+)?$/.test(normalized)) return null;
  const amount = Number(normalized.replace(',', '.'));
  return Number.isFinite(amount) ? amount : null;
}

function renderFruitSales() {
  const totals = new Map();
  records.forEach((entry) => {
    const amount = numericDemand(entry.demanda);
    if (amount === null) return;
    totals.set(entry.produto, (totals.get(entry.produto) || 0) + amount);
  });
  const ranking = [...totals.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  fruitSalesChart.data.labels = ranking.map(([product]) => product);
  fruitSalesChart.data.datasets[0].data = ranking.map(([, amount]) => amount);
  document.querySelector('#fruitSalesEmpty').hidden = ranking.length > 0;
  document.querySelector('#fruitSalesNote').textContent = ranking.length
    ? 'Soma dos valores numéricos de demanda informados por produto; registros textuais foram omitidos.'
    : 'Sem valores numéricos de demanda neste período. Cadastre a demanda como número para comparar.';
  fruitSalesChart.update('none');
}

function renderMarket() {
  const rows = $("#marketRows");
  const empty = $("#marketEmpty");
  const selected = selectedRecords();
  rows.replaceChildren();
  if (!selected.length) {
    $("#latestPrice").textContent = "—";
    $("#latestPriceDate").textContent = "Sem registro no período";
    $("#latestDemand").textContent = "—";
    $("#latestUnit").textContent = "Sem informação de demanda";
    $("#marketChartNote").textContent = "Nenhuma série disponível.";
    empty.hidden = false;
    chart.data.labels = [];
    chart.data.datasets[0].data = [];
    chart.update("none");
    const row = node("tr");
    row.append(node("td", "", "Nenhum registro encontrado."));
    row.firstChild.colSpan = 5;
    rows.append(row);
    return;
  }
  empty.hidden = true;
  const newest = selected[selected.length - 1];
  $("#latestPrice").textContent = currency.format(newest.preco);
  $("#latestPriceDate").textContent = `${newest.produto} · ${formatDate(newest.data)}`;
  $("#latestDemand").textContent = newest.demanda || "Não informada";
  $("#latestUnit").textContent = newest.unidadePreco ? `Unidade: ${newest.unidadePreco}` : "Unidade de preço não informada";
  $("#marketChartNote").textContent = `${selected.length} registro(s) de ${newest.produto} no período.`;
  chart.data.labels = selected.map((entry) => formatDate(entry.data, { day: "2-digit", month: "short" }));
  chart.data.datasets[0].data = selected.map((entry) => entry.preco);
  chart.data.datasets[0].label = `Preço (${newest.unidadePreco || "R$"})`;
  chart.update("none");
  [...selected].reverse().slice(0, 20).forEach((entry) => {
    const row = node("tr");
    row.append(node("td", "", formatDate(entry.data)), node("td", "", entry.produto), node("td", "pe-price", currency.format(entry.preco)), node("td", "", entry.unidadePreco || "—"), node("td", "", entry.demanda || "Não informada"));
    rows.append(row);
  });
}

async function loadMarket() {
  const rows = $("#marketRows");
  rows.replaceChildren();
  try {
    const { data } = await request(`market-data?dias=${$("#marketDays").value}`);
    records = data;
    renderFruitSales();
    const products = [...new Set(records.map((entry) => entry.produto))].sort((a, b) => a.localeCompare(b, "pt-BR"));
    const select = $("#marketProduct");
    const previous = select.value;
    select.replaceChildren(new Option("Selecione um produto", ""));
    products.forEach((product) => select.add(new Option(product, product)));
    select.value = products.includes(previous) ? previous : products[0] || "";
    if (!records.length) {
      $("#latestPrice").textContent = "—";
      $("#latestPriceDate").textContent = "Sem registro no período";
      $("#latestDemand").textContent = "—";
      $("#latestUnit").textContent = "Sem informação de demanda";
      $("#marketChartNote").textContent = "Sem dados para desenhar o gráfico.";
      $("#marketEmpty").hidden = false;
      const row = node("tr");
      row.append(node("td", "", "Nenhum registro encontrado."));
      row.firstChild.colSpan = 5;
      rows.append(row);
      chart.data.labels = [];
      chart.data.datasets[0].data = [];
      chart.update();
      return;
    }
    renderMarket();
  } catch (error) {
    document.querySelector("#fruitSalesEmpty").hidden = false;
    document.querySelector("#fruitSalesNote").textContent = "N\u00e3o foi poss\u00edvel carregar a demanda.";
    fruitSalesChart.data.labels = [];
    fruitSalesChart.data.datasets[0].data = [];
    fruitSalesChart.update("none");
    $("#marketChartNote").textContent = error.message || "Não foi possível carregar os dados de mercado.";
    $("#marketEmpty").hidden = false;
    rows.replaceChildren();
    const row = node("tr");
    row.append(node("td", "", error.message || "Não foi possível carregar os registros."));
    row.firstChild.colSpan = 5;
    rows.append(row);
  }
}

function marketChartColors() {
  const dark = document.documentElement.classList.contains("dark-theme");
  return dark
    ? { text: "#b8c9b3", grid: "#435443", line: "#a9c796", fill: "#a9c79624", bar: "#8aaa78" }
    : { text: "#687365", grid: "#d4ddca", line: "#6f8f62", fill: "#a9c88d35", bar: "#a9bb84" };
}

const initialChartColors = marketChartColors();
chart = new Chart($("#marketChart"), {
  type: "line",
  data: { labels: [], datasets: [{ label: "Preço", data: [], borderColor: initialChartColors.line, backgroundColor: initialChartColors.fill, fill: true, tension: 0.28, pointRadius: 3, pointHoverRadius: 5 }] },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    color: initialChartColors.text,
    interaction: { intersect: false, mode: "index" },
    plugins: { legend: { display: false }, tooltip: { callbacks: { label: (context) => currency.format(context.parsed.y) } } },
    scales: {
      y: { beginAtZero: false, ticks: { color: initialChartColors.text, callback: (value) => currency.format(value) }, grid: { color: initialChartColors.grid } },
      x: { ticks: { color: initialChartColors.text }, grid: { display: false } }
    }
  }
});

fruitSalesChart = new Chart(document.querySelector('#fruitSalesChart'), {
  type: 'bar',
  data: { labels: [], datasets: [{ label: 'Demanda informada', data: [], backgroundColor: initialChartColors.bar, borderColor: initialChartColors.line, borderWidth: 1, borderRadius: 6 }] },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    color: initialChartColors.text,
    plugins: { legend: { display: false }, tooltip: { callbacks: { label: (context) => 'Demanda: ' + new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(context.parsed.y) } } },
    scales: {
      y: { beginAtZero: true, ticks: { color: initialChartColors.text }, grid: { color: initialChartColors.grid } },
      x: { ticks: { color: initialChartColors.text }, grid: { display: false } }
    }
  }
});

new MutationObserver(() => {
  const colors = marketChartColors();
  chart.options.color = colors.text;
  chart.options.scales.x.ticks.color = colors.text;
  chart.options.scales.y.ticks.color = colors.text;
  chart.options.scales.y.grid.color = colors.grid;
  chart.data.datasets[0].borderColor = colors.line;
  chart.data.datasets[0].backgroundColor = colors.fill;
  fruitSalesChart.options.color = colors.text;
  fruitSalesChart.options.scales.x.ticks.color = colors.text;
  fruitSalesChart.options.scales.y.ticks.color = colors.text;
  fruitSalesChart.options.scales.y.grid.color = colors.grid;
  fruitSalesChart.data.datasets[0].backgroundColor = colors.bar;
  fruitSalesChart.data.datasets[0].borderColor = colors.line;
  fruitSalesChart.update("none");
  chart.update("none");
}).observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });

$("#marketProduct").addEventListener("change", renderMarket);
$("#marketDays").addEventListener("change", loadMarket);
loadMarket();
