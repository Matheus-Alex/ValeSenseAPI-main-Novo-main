const { $, node, formatDate, setEmpty, request } = window.ProdutorApp;
const temperatureFormat = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 });

async function loadSensors() {
  const list = $("#sensorStatusList");
  try {
    const { data: sensors } = await request("sensors");
    const active = sensors.filter((sensor) => sensor.status === "ATIVO").length;
    $("#activeCount").textContent = String(active);
    $("#sensorCountNote").textContent = `${sensors.length} sensor(es) vinculado(s) aos seus talhões`;
    list.replaceChildren();
    if (!sensors.length) {
      setEmpty(list, "Nenhum sensor está vinculado aos seus talhões.");
      return sensors;
    }
    sensors.forEach((sensor) => {
      const row = node("div", "pe-row");
      const main = node("div", "pe-row-main");
      main.append(node("strong", "", sensor.identificador), node("small", "", `${sensor.talhao.nome} · ${sensor.talhao.propriedade.nome}`));
      const badge = node("span", `pe-badge ${sensor.status === "ATIVO" ? "" : sensor.status === "MANUTENCAO" ? "warn" : "danger"}`, sensor.status);
      row.append(main, badge);
      list.append(row);
    });
    return sensors;
  } catch (error) {
    $("#activeCount").textContent = "—";
    $("#sensorCountNote").textContent = "Não foi possível consultar sensores";
    setEmpty(list, error.message || "Não foi possível carregar os sensores.");
    return [];
  }
}

async function loadWeather() {
  const empty = $("#weatherEmpty");
  try {
    const { data: sensors } = await request("sensors");
    const latestReading = sensors
      .filter((sensor) => sensor.ultimaLeitura)
      .map((sensor) => ({ ...sensor.ultimaLeitura, sensor }))
      .sort((first, second) => new Date(second.timestamp) - new Date(first.timestamp))[0];
    if (!latestReading) {
      $("#latestTemperature").textContent = "—";
      $("#latestReadingTime").textContent = "Nenhuma leitura registrada";
      $("#weatherTemperature").innerHTML = "— <small>°C</small>";
      $("#weatherHumidity").innerHTML = "— <small>%</small>";
      $("#readingStatus").textContent = "Sem leitura";
      $("#readingStatus").className = "pe-badge info";
      empty.hidden = false;
      return;
    }
    const latest = latestReading;
    $("#latestTemperature").textContent = `${temperatureFormat.format(latest.temperatura)} °C`;
    $("#latestReadingTime").textContent = formatDate(latest.timestamp, { dateStyle: "short", timeStyle: "short" });
    $("#weatherTemperature").innerHTML = `${temperatureFormat.format(latest.temperatura)} <small>°C</small>`;
    $("#weatherHumidity").innerHTML = `${temperatureFormat.format(latest.umidade)} <small>%</small>`;
    $("#readingSensor").textContent = `${latest.sensor.identificador} · ${latest.sensor.talhao.nome}`;
    $("#readingTimestamp").textContent = `Registrada em ${formatDate(latest.timestamp, { dateStyle: "medium", timeStyle: "short" })}`;
    $("#readingStatus").textContent = latest.sensor.status;
    $("#readingStatus").className = `pe-badge ${latest.sensor.status === "ATIVO" ? "" : "danger"}`;
    empty.hidden = true;
  } catch (error) {
    $("#latestTemperature").textContent = "—";
    $("#latestReadingTime").textContent = "Não foi possível consultar leituras";
    $("#readingStatus").textContent = "Indisponível";
    $("#readingStatus").className = "pe-badge danger";
    empty.hidden = false;
    empty.querySelector("p").textContent = error.message || "Não foi possível carregar as leituras.";
  }
}

async function loadForecast() {
  const panel = $("#forecastPanel");
  try {
    const { data: forecasts } = await request("forecasts");
    if (!forecasts.length) {
      setEmpty(panel, "Nenhuma janela futura foi cadastrada para seus talhões.");
      $("#nextWindowDate").textContent = "—";
      $("#nextWindowNote").textContent = "Sem previsão cadastrada";
      return;
    }
    const next = forecasts[0];
    $("#nextWindowDate").textContent = formatDate(next.dataInicio, { day: "2-digit", month: "short" });
    $("#nextWindowNote").textContent = `${next.tipo === "COLHEITA" ? "Colheita" : "Exportação"} · ${next.talhao.nome}`;
    panel.replaceChildren();
    const row = node("div", "pe-row");
    const main = node("div", "pe-row-main");
    main.append(node("strong", "", `${next.talhao.nome} · ${next.tipo === "COLHEITA" ? "Colheita" : "Exportação"}`));
    main.append(node("small", "", `${formatDate(next.dataInicio)} até ${formatDate(next.dataFim)}${next.talhao.propriedade?.nome ? ` · ${next.talhao.propriedade.nome}` : ""}`));
    const confidence = next.confianca === null ? "Confiança não informada" : `${temperatureFormat.format(next.confianca)}% de confiança`;
    row.append(main, node("span", "pe-badge info", confidence));
    panel.append(row);
  } catch (error) {
    setEmpty(panel, error.message || "Não foi possível carregar as previsões.");
    $("#nextWindowDate").textContent = "—";
    $("#nextWindowNote").textContent = "Previsões indisponíveis";
  }
}

loadSensors();
loadWeather();
loadForecast();
