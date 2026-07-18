
// =======================
//  TOGGLE SIDEBAR
// =======================
const toggleBtn = document.getElementById('toggleSidebar');
const sidebar = document.getElementById('sidebar');
const mainContent = document.querySelector('.main-content');

toggleBtn.addEventListener('click', (e) => {
  e.stopPropagation();

  if (window.innerWidth > 768) {
    // Desktop: toggle expanded
    sidebar.classList.toggle('closed');
    mainContent.classList.toggle('expanded');
  } else {
    // Mobile: toggle open
    sidebar.classList.toggle('closed');
    sidebar.classList.toggle('open');
  }
});

// Cerrar sidebar al hacer click fuera en móviles
document.addEventListener('click', (e) => {
  if (window.innerWidth <= 768) {
    if (!sidebar.contains(e.target) && !toggleBtn.contains(e.target)) {
      sidebar.classList.add('closed');
      sidebar.classList.remove('open');
    }
  }
});

// Ajustar al cambiar el tamaño de ventana
let resizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    if (window.innerWidth > 768) {
      sidebar.classList.remove('open');
      if (!sidebar.classList.contains('closed')) {
        mainContent.classList.remove('expanded');
      }
    } else {
      sidebar.classList.add('closed');
      mainContent.classList.add('expanded');
    }
  }, 250);
});

// Inicializar estado en carga
if (window.innerWidth <= 768) {
  sidebar.classList.add('closed');
  mainContent.classList.add('expanded');
}


// =======================
//  BARCHART (estático con animación)
// =======================
const chartData = [
  { month: 'January', prev: 3000, curr: 5000 },
  { month: 'February', prev: 6000, curr: 10000 },
  { month: 'March', prev: 13000, curr: 18000 },
  { month: 'April', prev: 20000, curr: 24000 },
  { month: 'May', prev: 40000, curr: 48000 },
  { month: 'June', prev: 52000, curr: 60000 }
];

const maxValue = 60000;
const chartArea = document.getElementById('chartArea');

if (chartArea) {
  chartData.forEach(data => {
    const barGroup = document.createElement('div');
    barGroup.className = 'bar-group';

    const bars = document.createElement('div');
    bars.className = 'bars';

    // Previous year bar
    const prevBar = document.createElement('div');
    prevBar.className = 'bar light';
    const prevHeight = (data.prev / maxValue) * 100;
    prevBar.style.height = prevHeight + '%';
    prevBar.title = `Previous: $${data.prev.toLocaleString()}`;

    // Current year bar
    const currBar = document.createElement('div');
    currBar.className = 'bar dark';
    const currHeight = (data.curr / maxValue) * 100;
    currBar.style.height = currHeight + '%';
    currBar.title = `Current: $${data.curr.toLocaleString()}`;

    bars.appendChild(prevBar);
    bars.appendChild(currBar);

    const label = document.createElement('div');
    label.className = 'month-label';
    label.textContent = data.month;

    barGroup.appendChild(bars);
    barGroup.appendChild(label);
    chartArea.appendChild(barGroup);
  });
}

// Animación de barras al cargar
window.addEventListener('load', () => {
  const bars = document.querySelectorAll('.bar');
  bars.forEach((bar, index) => {
    bar.style.opacity = '0';
    bar.style.transform = 'scaleY(0)';
    bar.style.transformOrigin = 'bottom';

    setTimeout(() => {
      bar.style.transition = 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
      bar.style.opacity = '1';
      bar.style.transform = 'scaleY(1)';
    }, index * 100);
  });
});


// =======================
//  BÚSQUEDA EN TABLA (filtro visual DOM)
// =======================
const searchInput = document.getElementById('searchInput');
const tableBody = document.getElementById('tableBody');

if (searchInput && tableBody) {
  searchInput.addEventListener('input', (e) => {
    const searchTerm = (e.target.value || '').toLowerCase();
    const rows = tableBody.getElementsByTagName('tr');

    Array.from(rows).forEach(row => {
      const text = row.textContent.toLowerCase();
      row.style.display = text.includes(searchTerm) ? '' : 'none';
    });
  });
}


// =======================
//  TABLA RESPONSIVE + ajustes gráficos en resize
// =======================

// Hacer la tabla responsive con scroll horizontal en móviles
const tableResponsive = document.querySelector('.table-responsive');
if (tableResponsive && window.innerWidth <= 768) {
  tableResponsive.addEventListener('touchstart', function () {
    this.style.overflowX = 'scroll';
  });
}

// Ajustar gráficos al cambiar tamaño de ventana (evitar “saltos” bruscos)
window.addEventListener('resize', () => {
  const bars = document.querySelectorAll('.bar');
  bars.forEach(bar => {
    bar.style.transition = 'none';
    setTimeout(() => {
      bar.style.transition = 'all 0.3s';
    }, 100);
  });
});





//FOOTER

  // Año dinámico (© …)
  (function () {
    const y = document.getElementById('year');
    if (y) y.textContent = new Date().getFullYear();
  })();

  // (Opcional) Evita micro-scroll horizontal durante el toggle del menú
  (function () {
    const root = document.documentElement;
    const toggle = document.getElementById('toggleSidebar');
    if (!toggle) return;
    function lockX(){ root.style.overflowX = 'clip'; }
    function unlockX(){ root.style.overflowX = ''; }
    toggle.addEventListener('click', () => {
      lockX();
      setTimeout(unlockX, 320); // ligeramente mayor a tu transition .25s
    });
  })();


  
// === Estado de sidebar en <body> para alinear el footer ===
(function () {
  const body = document.body;
  const sidebar = document.getElementById('sidebar');
  const toggleBtn = document.getElementById('toggleSidebar');

  function syncSidebarStateToBody() {
    const collapsed = sidebar.classList.contains('closed') || window.innerWidth <= 768;
    body.classList.toggle('sidebar-collapsed', collapsed);
  }

  // Sincroniza al cargar
  window.addEventListener('DOMContentLoaded', syncSidebarStateToBody);
  // Sincroniza cuando hacen toggle
  toggleBtn?.addEventListener('click', () => setTimeout(syncSidebarStateToBody, 0));
  // Sincroniza en resize
  window.addEventListener('resize', () => {
    clearTimeout(window.__sbSync);
    window.__sbSync = setTimeout(syncSidebarStateToBody, 150);
  });
})();
