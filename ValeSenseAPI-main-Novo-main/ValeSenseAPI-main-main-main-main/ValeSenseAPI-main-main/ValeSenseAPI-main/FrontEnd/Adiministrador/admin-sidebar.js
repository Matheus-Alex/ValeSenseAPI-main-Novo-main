(() => {
  const scriptUrl = document.currentScript?.src;
  if (!scriptUrl) return;
  const adminRoot = new URL('.', scriptUrl);
  const current = new URL(window.location.href);
  const groups = [
    {
      title: 'Minha conta',
      links: [
        ['Visão geral', 'Home/Home.html'],
        ['Usuários', 'Home/Home.html#usuarios'],
        ['Sensores', 'Sensores/Sensores.html'],
        ['Registros de acesso', 'Registros/Registros.html'],
      ],
    },
    {
      title: 'Acompanhamento',
      links: [
        ['Analistas', 'Acompanhamento/Analistas/Analistas.html'],
        ['Produtores', 'Acompanhamento/Produtores/Produtores.html'],
        ['Dashboard climático', 'Monitoramento/Dashboard/Dashboard.html#home'],
        ['Sensores monitorados', 'Monitoramento/Dashboard/Dashboard.html#sensores'],
        ['Mapas', 'Monitoramento/Mapas/Mapas.html'],
        ['Histórico de leituras', 'Monitoramento/Registro/Registro.html'],
        ['Frutas', 'Monitoramento/Frutas/Frutas.html'],
        ['Resumo operacional', 'Operacao/Home/Home.html'],
        ['Plantações', 'Operacao/Plantacoes/Plantacoes.html'],
        ['Safra', 'Operacao/Colheita/Colheita.html'],
        ['Mercado', 'Operacao/Mercado/Mercado.html'],
        ['Alertas', 'Operacao/Alertas/Alertas.html'],
      ],
    },
  ];
  const nav = document.createElement('nav');
  nav.className = 'admin-sidebar-nav';
  nav.setAttribute('aria-label', 'Navegação administrativa');
  let activeGroup = null;
  for (const group of groups) {
    const details = document.createElement('details');
    details.className = 'admin-sidebar-group';
    const summary = document.createElement('summary');
    summary.textContent = group.title;
    details.append(summary);
    let hasActiveLink = false;
    for (const [label, path] of group.links) {
      const link = document.createElement('a');
      const target = new URL(path, adminRoot);
      link.href = target.href;
      link.className = 'nav-item';
      link.textContent = label;
      const pathMatches = target.pathname.toLowerCase() === current.pathname.toLowerCase();
      const hashMatches = target.hash && target.hash === current.hash;
      const isActive = pathMatches && (target.hash ? hashMatches : !current.hash || !group.links.some(([, siblingPath]) => {
        const sibling = new URL(siblingPath, adminRoot);
        return sibling.pathname.toLowerCase() === current.pathname.toLowerCase() && sibling.hash === current.hash;
      }));
      if (isActive) {
        link.classList.add('active');
        link.setAttribute('aria-current', 'page');
        hasActiveLink = true;
      }
      details.append(link);
    }
    if (hasActiveLink) activeGroup = details;
    nav.append(details);
  }
  if (activeGroup) activeGroup.open = true;
  else nav.firstElementChild.open = true;
  const sidebar = document.querySelector('.pe-sidebar, .sidebar');
  if (sidebar) {
    sidebar.replaceChildren(nav);
    sidebar.classList.add('admin-sidebar');
  }
})();




