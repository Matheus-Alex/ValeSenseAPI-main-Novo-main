(() => {
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  function formatDate(value, options = { dateStyle: "medium" }) {
    if (!value) return "Data não informada";
    const date = /^\d{4}-\d{2}-\d{2}$/.test(value)
      ? new Date(`${value}T12:00:00`)
      : new Date(value);
    return Number.isNaN(date.getTime()) ? "Data inválida" : new Intl.DateTimeFormat("pt-BR", options).format(date);
  }

  function setEmpty(container, message) {
    container.replaceChildren();
    const wrapper = document.createElement("div");
    wrapper.className = "pe-empty";
    const text = document.createElement("p");
    text.textContent = message;
    wrapper.append(text);
    container.append(wrapper);
  }

  function node(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }

  async function request(path, options) {
    return window.ValeSenseApi.request(path, options);
  }

  function readSessionUser() {
    try {
      return JSON.parse(sessionStorage.getItem("valesense_user") || "null");
    } catch {
      return null;
    }
  }

  document.querySelectorAll('[data-scroll-top]').forEach((button) => {
    button.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  });

  window.ProdutorApp = { $, $$, formatDate, setEmpty, node, request, readSessionUser };
})();
