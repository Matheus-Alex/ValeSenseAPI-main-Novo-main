(() => {
  const loginPath = document.body.dataset.loginPath || "../../Analista_de_dados/Login/Login.html";
  const token = sessionStorage.getItem("valesense_token");
  const sair = () => {
    sessionStorage.removeItem("valesense_token");
    sessionStorage.removeItem("valesense_user");
    window.location.replace(loginPath);
  };
  if (!token || !window.ValeSenseApi) {
    sair();
    return;
  }
  window.ValeSenseApi.request("auth/me").then(({ user }) => {
    if (!user || user.role !== "ADMIN") {
      sair();
      return;
    }
    sessionStorage.setItem("valesense_user", JSON.stringify(user));
  }).catch(sair);
})();
