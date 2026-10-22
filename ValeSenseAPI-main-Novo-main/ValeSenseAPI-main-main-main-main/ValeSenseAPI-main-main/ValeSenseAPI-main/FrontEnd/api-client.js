(() => {
  const apiUrl = (window.VALESENSE_API_URL || "http://localhost:3333/api").replace(/\/+$/, "");

  async function request(path, options = {}) {
    const { auth = true, ...requestOptions } = options;
    const headers = new Headers(requestOptions.headers);
    if (requestOptions.body && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }

    const token = auth && sessionStorage.getItem("valesense_token");
    if (token) headers.set("Authorization", `Bearer ${token}`);

    let response;
    try {
      response = await fetch(`${apiUrl}/${path.replace(/^\/+/, "")}`, {
        ...requestOptions,
        headers,
      });
    } catch {
      throw new Error("Não foi possível conectar à API ValeSense.");
    }

    const body = response.status === 204 ? null : await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(body?.message || body?.error || "Não foi possível concluir a solicitação.");
    }
    return body;
  }

  window.ValeSenseApi = { request };
})();