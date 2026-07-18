
// ============================================
// DONUT con tarjetas compactas y leyenda ajustada
// - Rotación -90° de arcos (inicia a las 12)
// - Tarjetas tipo "card" compactas pegadas al segmento (offset corto) + línea guía
// - Conversión de coordenadas SVG -> contenedor (corrige desfases)
// - Anti-solape básico
// - Leyenda inferior con toggle y padding reducido
// ============================================

'use strict';

const PIE_COLORS = [
  '#5500dd', // Púrpura (ej. Bodega 91)
  '#00bfa5', // Teal / verde agua (ej. Bodega 97)
  '#9c27b0',
  '#ffa726',
  '#e91e63',
  '#3f51b5',
  '#4caf50',
  '#ff5722'
];

let segmentVisibility = {};
let pieData = [];

document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => loadPieChart(), 400);
});

async function loadPieChart() {
  try {
    const resp = await fetch('/api/cargas/por-bodega');
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const result = await resp.json();

    if (result.ok && Array.isArray(result.data) && result.data.length) {
      pieData = result.data.slice(0, 8);
      pieData.forEach((_, i) => (segmentVisibility[i] = true));
      updatePieChart();
      updatePieDataInCenter();
    } else {
      showPieError('No hay datos disponibles');
    }
  } catch (e) {
    console.error('❌ Error al cargar datos del pie:', e);
    showPieError('Error al cargar datos');
  }
}

function updatePieChart() {
  const svg = document.querySelector('.pie-chart');
  if (!svg) return;

  const total = pieData.reduce(
    (s, it, i) => s + (segmentVisibility[i] ? it.cantidad : 0),
    0
  );

  svg.innerHTML = '';

  const r = 40;
  const stroke = 20;
  const C = 2 * Math.PI * r;
  let offset = 0;

  pieData.forEach((it, i) => {
    if (!segmentVisibility[i]) return;

    const pct = it.cantidad / total;
    const dash = pct * C;

    const arc = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    arc.setAttribute('cx', '50');
    arc.setAttribute('cy', '50');
    arc.setAttribute('r', String(r));
    arc.setAttribute('fill', 'none');
    arc.setAttribute('stroke', PIE_COLORS[i % PIE_COLORS.length]);
    arc.setAttribute('stroke-width', String(stroke));
    arc.setAttribute('stroke-dasharray', `${dash} ${C}`);
    arc.setAttribute('stroke-dashoffset', -offset);
    arc.setAttribute('transform', 'rotate(-90 50 50)'); // inicia a las 12
    arc.setAttribute('data-index', i);
    arc.style.cursor = 'pointer';
    arc.style.transition = 'all .2s ease';

    const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
    title.textContent = `Bodega ${it.bodega}: ${it.cantidad} (${(pct * 100).toFixed(1)}%)`;
    arc.appendChild(title);

    arc.addEventListener('mouseenter', function () {
      this.setAttribute('stroke-width', String(stroke + 2));
      this.style.opacity = '0.9';
      
      // Resaltar item de leyenda correspondiente
      const legendItem = document.querySelector(`.pie-legend-item[data-index="${i}"]`);
      if (legendItem && segmentVisibility[i]) {
          legendItem.style.background = 'rgba(102, 0, 255, 0.15)';
          legendItem.style.transform = 'translateY(-2px)';
      }
    });
    arc.addEventListener('mouseleave', function () {
      this.setAttribute('stroke-width', String(stroke));
      this.style.opacity = '1';
      
      // Restaurar item de leyenda correspondiente
      const legendItem = document.querySelector(`.pie-legend-item[data-index="${i}"]`);
      if (legendItem && segmentVisibility[i]) {
          legendItem.style.background = 'rgba(102, 0, 255, 0.04)';
          legendItem.style.transform = 'translateY(0)';
      }
    });

    svg.appendChild(arc);
    offset += dash;
  });
}

function updatePieDataInCenter() {
  const container = document.querySelector('.pie-container');
  if (!container) return;

  container
    .querySelectorAll('.pie-data-center, .pie-segment-label, .pie-segment-leader')
    .forEach((n) => n.remove());

  const total = pieData.reduce(
    (s, it, i) => s + (segmentVisibility[i] ? it.cantidad : 0),
    0
  );

  const center = document.createElement('div');
  center.className = 'pie-data-center';
  center.style.cssText = `
    position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);
    text-align:center;pointer-events:none;
  `;
  center.innerHTML = `
    <div style="font-size:64px;font-weight:700;color:#2d2d2d;line-height:1;margin-bottom:8px;">
      ${total}
    </div>
    <div style="font-size:14px;color:#9e9e9e;font-weight:400;">Total Cargas</div>
  `;
  if (getComputedStyle(container).position === 'static') container.style.position = 'relative';
  container.appendChild(center);

  const svg = document.querySelector('.pie-chart');
  const svgRect = svg.getBoundingClientRect();
  const contRect = container.getBoundingClientRect();

  createCardLabels(total, svgRect, contRect);
  updatePieLegendBelow();
}

/**
 * Tarjetas COMPACTAS pegadas al segmento
 * - Sin cuadrito de color
 * - Sin min-width (se ajusta al texto)
 * - Padding reducido, bordes y sombra sutil
 */
function createCardLabels(totalVisible, svgRect, contRect) {
  const container = document.querySelector('.pie-container');
  const svg = document.querySelector('.pie-chart');
  if (!container || !svg) return;

  const toContainerX = (x) => x - contRect.left;
  const toContainerY = (y) => y - contRect.top;

  const cx = svgRect.width / 2;
  const cy = svgRect.height / 2;

  const r = 40, stroke = 20;
  const pxPerUnit = cx / 50;
  const ringOuterPx = (r + stroke / 2) * pxPerUnit;

  const CARD_OUTSIDE_OFFSET = 6; // pegado
  const LEADER_LEN = 6;          // línea guía corta
  const startAngle = -90;

  const visibleSum = totalVisible;
  const placed = [];
  let currentAngle = startAngle;

  pieData.forEach((item, idx) => {
    if (!segmentVisibility[idx]) return;

    const value = item.cantidad;
    const pct = value / visibleSum;
    const angleSize = pct * 360;
    const mid = currentAngle + angleSize / 2;
    const rad = (mid * Math.PI) / 180;

    const anchorAbsX = svgRect.left + (cx + (ringOuterPx + 2) * Math.cos(rad));
    const anchorAbsY = svgRect.top  + (cy + (ringOuterPx + 2) * Math.sin(rad));

    let cardAbsX = svgRect.left + (cx + (ringOuterPx + CARD_OUTSIDE_OFFSET) * Math.cos(rad));
    let cardAbsY = svgRect.top  + (cy + (ringOuterPx + CARD_OUTSIDE_OFFSET) * Math.sin(rad));

    let cardX = toContainerX(cardAbsX);
    let cardY = toContainerY(cardAbsY);
    const anchorX = toContainerX(anchorAbsX);
    const anchorY = toContainerY(anchorAbsY);

    const color = PIE_COLORS[idx % PIE_COLORS.length];
    const card = document.createElement('div');
    card.className = 'pie-segment-label';
    card.style.cssText = `
      position:absolute;
      left:${cardX}px; top:${cardY}px;
      transform:translate(-50%,-50%);
      background:#fff; color:#1f2937;
      padding:4px 8px;                  /* compacto */
      border-radius:8px;                /* bordes más rectos */
      box-shadow:0 4px 12px rgba(0,0,0,0.10); /* sombra sutil */
      pointer-events:none; z-index:10;
      text-align:left;
      border:1px solid rgba(0,0,0,0.06);
      /* sin min-width: se ajusta al texto */
    `;
    card.innerHTML = `
      <div style="font-size:12.5px;font-weight:800;color:${color};margin-bottom:2px;">
        Bodega ${item.bodega}
      </div>
      <div style="font-size:12px;color:#555;font-weight:600;">
        ${value} cargas
      </div>
      <div style="font-size:11px;color:#9aa0a6;">
        (${(pct * 100).toFixed(1)}%)
      </div>
    `;
    container.appendChild(card);

    const dx = cardX - anchorX;
    const dy = cardY - anchorY;
    const angleDeg = Math.atan2(dy, dx) * 180 / Math.PI;

    const line = document.createElement('div');
    line.className = 'pie-segment-leader';
    line.style.cssText = `
      position:absolute;
      left:${anchorX}px; top:${anchorY}px;
      width:${LEADER_LEN}px; height:2px;
      background:${color};
      transform-origin:left center;
      transform: rotate(${angleDeg}deg);
      opacity:.6; pointer-events:none; z-index:6; border-radius:2px;
    `;
    container.appendChild(line);

    // Anti-solape básico
    const resolveOverlap = () => {
      const rect = card.getBoundingClientRect();
      const box = { x: rect.left, y: rect.top, w: rect.width, h: rect.height };
      for (const p of placed) {
        const overlapX = Math.max(0, Math.min(box.x + box.w, p.x + p.w) - Math.max(box.x, p.x));
        const overlapY = Math.max(0, Math.min(box.y + box.h, p.y + p.h) - Math.max(box.y, p.y));
        if (overlapX > 0 && overlapY > 0) {
          const step = 5; // empuja poco para mantener compactas
          cardX += step * Math.cos(rad);
          cardY += step * Math.sin(rad);
          card.style.left = `${cardX}px`;
          card.style.top  = `${cardY}px`;

          const ndx = cardX - anchorX;
          const ndy = cardY - anchorY;
          const ndeg = Math.atan2(ndy, ndx) * 180 / Math.PI;
          line.style.left = `${anchorX}px`;
          line.style.top  = `${anchorY}px`;
          line.style.transform = `rotate(${ndeg}deg)`;

          return false;
        }
      }
      placed.push(box);
      return true;
    };
    let tries = 0;
    while (tries < 6 && !resolveOverlap()) tries++;

    currentAngle += angleSize;
  });
}

/**
 * Leyenda (ON/OFF) compacta con separación restaurada
 */
function updatePieLegendBelow() {
  const legend = document.querySelector('.pie-legend');
  if (!legend) return;

  legend.innerHTML = '';
  legend.style.cssText = `
    display:flex;
    justify-content:center;
    align-items:center;
    gap:16px;
    margin-top:16px;      /* separación con el donut */
    padding:0;            /* sin padding extra (evita “ensanchar”) */
    flex-wrap:wrap;
  `;

  pieData.forEach((item, index) => {
    const legendItem = document.createElement('div');
    legendItem.className = 'pie-legend-item';
    legendItem.setAttribute('data-index', index);
    legendItem.style.cssText = `
      display:flex; align-items:center; gap:8px; cursor:pointer;
      padding:6px 10px;           /* compacto (antes 8px 12px) */
      border-radius:6px;          /* bordes menos redondeados */
      transition:all .2s ease;
      opacity:${segmentVisibility[index] ? '1' : '0.4'};
      user-select:none;
      background:${segmentVisibility[index] ? 'rgba(102,0,255,0.04)' : 'transparent'};
    `;

    const colorBox = document.createElement('div');
    colorBox.className = 'pie-legend-color';
    colorBox.style.cssText = `
      width:16px; height:16px;    /* más pequeño (antes 18px) */
      border-radius:4px;
      background:${PIE_COLORS[index % PIE_COLORS.length]};
      flex-shrink:0; transition:all .2s ease;
      opacity:${segmentVisibility[index] ? '1' : '0.3'};
    `;

    const label = document.createElement('div');
    label.className = 'pie-legend-label';
    label.style.cssText = `
      font-size:14px;
      color:${segmentVisibility[index] ? '#555' : '#aaa'};
      font-weight:600;
      text-decoration:${segmentVisibility[index] ? 'none' : 'line-through'};
    `;
    label.textContent = item.bodega;

    legendItem.addEventListener('click', function () {
      const idx = parseInt(this.getAttribute('data-index'));
      segmentVisibility[idx] = !segmentVisibility[idx];

      if (segmentVisibility[idx]) {
        colorBox.style.opacity = '1';
        label.style.color = '#555';
        label.style.textDecoration = 'none';
        this.style.opacity = '1';
        this.style.background = 'rgba(102,0,255,0.04)';
      } else {
        colorBox.style.opacity = '0.3';
        label.style.color = '#aaa';
        label.style.textDecoration = 'line-through';
        this.style.opacity = '0.4';
        this.style.background = 'transparent';
      }

      updatePieChart();
      updatePieDataInCenter();
    });

    legendItem.addEventListener('mouseenter', function () {
      const idx = parseInt(this.getAttribute('data-index'));
      if (!segmentVisibility[idx]) return;
      const svg = document.querySelector('.pie-chart');
      const arc = svg ? svg.querySelector(`circle[data-index="${idx}"]`) : null;
      if (arc) {
        arc.setAttribute('stroke-width', String(20 + 3)); // 20 is the default stroke width
        arc.style.opacity = '0.85';
      }
      this.style.background = 'rgba(102, 0, 255, 0.15)';
      this.style.transform = 'translateY(-2px)';
    });

    legendItem.addEventListener('mouseleave', function () {
      const idx = parseInt(this.getAttribute('data-index'));
      if (!segmentVisibility[idx]) return;
      const svg = document.querySelector('.pie-chart');
      const arc = svg ? svg.querySelector(`circle[data-index="${idx}"]`) : null;
      if (arc) {
        arc.setAttribute('stroke-width', '20');
        arc.style.opacity = '1';
      }
      this.style.background = 'rgba(102, 0, 255, 0.04)';
      this.style.transform = 'translateY(0)';
    });

    legendItem.appendChild(colorBox);
    legendItem.appendChild(label);
    legend.appendChild(legendItem);
  });
}

function showPieError(message) {
  const c = document.querySelector('.pie-container');
  if (!c) return;
  c.innerHTML = `
    <div style="
      width:100%;height:100%;display:flex;align-items:center;justify-content:center;
      flex-direction:column;color:#6b7280;gap:12px;
    ">
      <span class="material-icons" style="font-size:48px;opacity:.3;">pie_chart</span>
      <span style="font-size:14px;">${message}</span>
    </div>
  `;
}

function refreshPieChart() { loadPieChart(); }
window.refreshPieChart = refreshPieChart;
window.loadPieChart = loadPieChart;
