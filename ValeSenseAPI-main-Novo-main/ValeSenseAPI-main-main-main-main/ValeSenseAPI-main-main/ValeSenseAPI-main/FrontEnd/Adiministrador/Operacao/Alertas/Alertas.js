const { $, node, setEmpty, request, formatDate } = window.ProdutorApp;
let notifications = [];
let alerts = [];
let filter = "all";

function renderAlerts() {
	const list = $("#alertList");
	list.replaceChildren();
	if (!alerts.length) {
		setEmpty(list, "Nenhum alerta foi registrado para suas previsões.");
		return;
	}
	alerts.forEach((alert) => {
		const row = node("article", "pe-row");
		const copy = node("div", "pe-row-main");
		const plot = alert.previsao.talhao;
		copy.append(node("strong", "", `${alert.tipo} · ${plot.nome}`));
		copy.append(node("small", "", alert.mensagem));
		copy.append(node("small", "", `${plot.propriedade.nome} · ${alert.previsao.tipo} · ${formatDate(alert.criadoEm, { dateStyle: "short", timeStyle: "short" })}`));
		const badgeClass = alert.nivel === "CRITICO" || alert.nivel === "ALTO" ? "danger" : alert.nivel === "MEDIO" ? "warn" : "info";
		row.append(copy, node("span", `pe-badge ${badgeClass}`, `${alert.nivel} · ${alert.status}`));
		list.append(row);
	});
}

function renderNotifications() {
	const list = $("#notificationList");
	const filtered = notifications.filter((item) => filter === "all" || !item.lida);
	list.replaceChildren();
	if (!filtered.length) {
		setEmpty(list, notifications.length ? "Não há notificações não lidas." : "Nenhuma notificação foi cadastrada para sua conta.");
		return;
	}
	filtered.forEach((item) => {
		const row = node("article", `pe-row pe-notification ${item.lida ? "" : "unread"}`);
		const copy = node("div", "pe-row-main");
		copy.append(node("strong", "", item.titulo));
		copy.append(node("small", "", item.mensagem));
		const alert = item.alerta;
		if (alert) {
			const plotName = alert.previsao?.talhao?.nome;
			const detail = `${alert.tipo} · ${alert.nivel} · ${alert.status}${plotName ? ` · ${plotName}` : ""}`;
			copy.append(node("small", "", detail));
		}
		const end = node("div", "pe-row-end");
		end.append(node("span", `pe-badge ${item.lida ? "info" : "warn"}`, item.lida ? "Lida" : "Não lida"));
		end.append(node("small", "pe-stat-note", formatDate(item.criadaEm, { dateStyle: "short", timeStyle: "short" })));
		row.append(copy, end);
		list.append(row);
	});
}

document.querySelectorAll("[data-notification-filter]").forEach((button) => {
	button.addEventListener("click", () => {
		filter = button.dataset.notificationFilter;
		document.querySelectorAll("[data-notification-filter]").forEach((option) => option.setAttribute("aria-pressed", String(option === button)));
		renderNotifications();
	});
});

async function loadNotifications() {
	const list = $("#notificationList");
	const [notificationResult, alertResult] = await Promise.allSettled([
		request("users/me/notifications"),
		request("forecasts/alerts")
	]);
	if (notificationResult.status === "fulfilled") {
		notifications = notificationResult.value.data;
		$("#notificationCount").textContent = String(notifications.length);
		$("#unreadCount").textContent = String(notifications.filter((item) => !item.lida).length);
		renderNotifications();
	} else {
		$("#notificationCount").textContent = "—";
		$("#unreadCount").textContent = "—";
		setEmpty(list, notificationResult.reason.message || "Não foi possível carregar as notificações.");
	}
	if (alertResult.status === "fulfilled") {
		alerts = alertResult.value.data;
		$("#alertCount").textContent = String(alerts.length);
		renderAlerts();
	} else {
		$("#alertCount").textContent = "—";
		setEmpty($("#alertList"), alertResult.reason.message || "Não foi possível carregar os alertas.");
	}
}

loadNotifications();
