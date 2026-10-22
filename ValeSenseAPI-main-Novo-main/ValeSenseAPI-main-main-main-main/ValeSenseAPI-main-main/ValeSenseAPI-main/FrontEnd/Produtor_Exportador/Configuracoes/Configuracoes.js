const { $, $$, request } = window.ProdutorApp;
const profileMessage = $("#profileMessage");
const preferenceMessage = $("#preferenceMessage");

function setMessage(element, message, failed = false) {
  element.textContent = message;
  element.classList.toggle("pe-error", failed);
}

async function loadSettings() {
  try {
    const [{ user }, { data: preferences }] = await Promise.all([
      request("users/me"),
      request("users/me/configuration")
    ]);
    $("#profileName").value = user.name || "";
    $("#profileEmail").value = user.email || "";
    $("#profileDocument").value = user.document || "";
    $("#sensorAlerts").checked = preferences.alertaSensor === true;
    const channels = Array.isArray(preferences.canais) ? preferences.canais : [];
    $$('input[name="channel"]').forEach((input) => { input.checked = channels.includes(input.value); });
  } catch (error) {
    setMessage(profileMessage, error.message || "NÃ£o foi possÃ­vel carregar os dados da conta.", true);
    setMessage(preferenceMessage, "PreferÃªncias indisponÃ­veis.", true);
  }
}

$("#profileForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = event.currentTarget.querySelector("button[type='submit']");
  button.disabled = true;
  setMessage(profileMessage, "Salvando...");
  try {
    await request("users/me", {
      method: "PATCH",
      body: JSON.stringify({ name: $("#profileName").value.trim(), document: $("#profileDocument").value.trim() })
    });
    setMessage(profileMessage, "Perfil salvo.");
  } catch (error) {
    setMessage(profileMessage, error.message || "NÃ£o foi possÃ­vel salvar o perfil.", true);
  } finally {
    button.disabled = false;
  }
});

$("#preferenceForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = event.currentTarget.querySelector("button[type='submit']");
  button.disabled = true;
  setMessage(preferenceMessage, "Salvando...");
  try {
    const canais = $$('input[name="channel"]:checked').map((input) => input.value);
    await request("users/me/configuration", {
      method: "PUT",
      body: JSON.stringify({ alertaSensor: $("#sensorAlerts").checked, canais })
    });
    setMessage(preferenceMessage, "PreferÃªncias salvas.");
  } catch (error) {
    setMessage(preferenceMessage, error.message || "NÃ£o foi possÃ­vel salvar as preferÃªncias.", true);
  } finally {
    button.disabled = false;
  }
});

function updateThemeSelection() {
  const dark = document.documentElement.classList.contains("dark-theme");
  $$('[data-theme-choice]').forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.themeChoice === (dark ? "dark" : "light"))));
}

$$('[data-theme-choice]').forEach((button) => {
  button.addEventListener("click", () => {
    window.applyTheme(button.dataset.themeChoice === "dark");
    updateThemeSelection();
  });
});

document.addEventListener("DOMContentLoaded", updateThemeSelection);
loadSettings();
