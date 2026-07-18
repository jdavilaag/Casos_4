// ============================================
// MÓDULO CARGAS SIN RÉPLICA - VERSIÓN CORREGIDA
// ============================================

(function() {
    'use strict';
    
    window.CargasModule = window.CargasModule || {
        sinReplica: {
            currentPage: 1,
            currentPageSize: 5,
            currentSort: { by: 'mod_date_time', dir: 'desc' },
            currentFilters: { bodega: null, desde: null, hasta: null, q: '' },
            chartSettings: {
                sortOrder: 'desc', // desc, asc, alphabetic
                showAnimation: true,
                showComparison: false,
                periodFilter: '30days' // 7days, 30days, thisMonth, custom
            }
        }
    };

    // ============================================
    // ACTUALIZAR STATS CARDS SUPERIORES
    // ============================================
    function updateStatsCards(dataChart) {
        const statsCards = document.querySelectorAll('.stat-card-top');
        if (statsCards.length < 4) return;

        if (!dataChart || dataChart.length === 0) {
            console.log('No hay datos para actualizar stats cards');
            return;
        }

        const total = dataChart.reduce((sum, item) => sum + item.cantidad, 0);
        const promedio = (total / dataChart.length).toFixed(1);
        const topBodega = dataChart.reduce((max, item) => item.cantidad > max.cantidad ? item : max, dataChart[0]);
        const bodegasAfectadas = dataChart.length;

        const card1Value = statsCards[0].querySelector('.stat-card-top-value');
        const card1Label = statsCards[0].querySelector('.stat-card-top-label');
        const card1Icon = statsCards[0].querySelector('.stat-card-top-icon .material-icons');
        if (card1Value) card1Value.textContent = total.toLocaleString();
        if (card1Label) card1Label.textContent = 'Cargas Sin Réplica';
        if (card1Icon) card1Icon.textContent = 'warning';
        
        const card2Value = statsCards[1].querySelector('.stat-card-top-value');
        const card2Label = statsCards[1].querySelector('.stat-card-top-label');
        const card2Icon = statsCards[1].querySelector('.stat-card-top-icon .material-icons');
        if (card2Value) card2Value.textContent = promedio;
        if (card2Label) card2Label.textContent = 'Promedio por Bodega';
        if (card2Icon) card2Icon.textContent = 'bar_chart';

        const card3Value = statsCards[2].querySelector('.stat-card-top-value');
        const card3Label = statsCards[2].querySelector('.stat-card-top-label');
        const card3Icon = statsCards[2].querySelector('.stat-card-top-icon .material-icons');
        if (card3Value) card3Value.textContent = `BD ${topBodega.bodega}`;
        if (card3Label) card3Label.textContent = 'Bodega con más cargas';
        if (card3Icon) card3Icon.textContent = 'star';

        const card4Value = statsCards[3].querySelector('.stat-card-top-value');
        const card4Label = statsCards[3].querySelector('.stat-card-top-label');
        const card4Icon = statsCards[3].querySelector('.stat-card-top-icon .material-icons');
        if (card4Value) card4Value.textContent = bodegasAfectadas;
        if (card4Label) card4Label.textContent = 'Bodegas Afectadas';
        if (card4Icon) card4Icon.textContent = 'store';

        statsCards.forEach(card => {
            const trend = card.querySelector('.stat-card-top-trend');
            if (trend) trend.style.display = 'none';
        });
    }

    // ============================================
    // CARGAR GRÁFICO DE BARRAS Y TABLA
    // ============================================
    async function loadChartBarrasYTabla() {
        console.log('📊 Cargando gráfico y tabla');
        try {
            const responseChart = await fetch('/api/cargas/sin-replica-por-bodega');
            const resultChart = await responseChart.json();

            if (!resultChart.ok || !resultChart.data || resultChart.data.length === 0) {
                console.log('No hay datos del gráfico');
                showNoData();
                return;
            }

            const state = window.CargasModule.sinReplica;
            const params = new URLSearchParams({
                page: state.currentPage,
                page_size: state.currentPageSize,
                sort_by: state.currentSort.by,
                sort_dir: state.currentSort.dir,
                ...Object.fromEntries(
                    Object.entries(state.currentFilters).filter(([_, v]) => v !== null && v !== '')
                )
            });

            const responseTable = await fetch(`/api/cargas/sin-replica?${params}`);
            const resultTable = await responseTable.json();

            if (!resultTable.ok) {
                console.log('Error al cargar datos de tabla');
                return;
            }

            updateStatsCards(resultChart.data);
            renderChartBarras(resultChart.data);
            renderTablaDetalle(resultChart.data, resultTable);

        } catch (error) {
            console.error('Error:', error);
            showError();
        }
    }

    function showNoData() {
        const tablaContainer = document.getElementById('tablaDetalleCargas');
        if (tablaContainer) {
            tablaContainer.innerHTML = '<div style="padding:60px;text-align:center;"><span class="material-icons" style="font-size:64px;opacity:0.3;">inbox</span><p style="margin-top:16px;">No hay datos disponibles</p></div>';
        }

        const chartArea = document.getElementById('chartAreaNoGuiadas');
        if (chartArea) {
            chartArea.innerHTML = '<div style="padding:60px;text-align:center;"><span class="material-icons" style="font-size:64px;opacity:0.3;">bar_chart</span><p style="margin-top:16px;">No hay cargas sin réplica</p></div>';
        }
    }

    function showError() {
        const tablaContainer = document.getElementById('tablaDetalleCargas');
        if (tablaContainer) {
            tablaContainer.innerHTML = '<div style="padding:40px;text-align:center;color:#f44336;"><span class="material-icons" style="font-size:48px;">error_outline</span><p>Error al cargar datos</p></div>';
        }

        const chartArea = document.getElementById('chartAreaNoGuiadas');
        if (chartArea) {
            chartArea.innerHTML = '<div style="padding:40px;text-align:center;color:#f44336;"><span class="material-icons" style="font-size:48px;">error_outline</span><p>Error al cargar datos</p></div>';
        }
    }

    // ============================================
    // RENDERIZAR GRÁFICO - VERSIÓN CORREGIDA
    // ============================================
    function renderChartBarras(dataChart) {
        const chartArea = document.getElementById('chartAreaNoGuiadas');
        const yAxis = document.getElementById('yAxisNoGuiadas');
        const metricsContainer = document.getElementById('metricsNoGuiadas');
        
        if (!chartArea) {
            console.error('No se encontró el elemento chartAreaNoGuiadas');
            return;
        }

        if (!dataChart || dataChart.length === 0) {
            chartArea.innerHTML = `
                <div style="width:100%;text-align:center;color:#999;padding:30px 0;">
                    <span class="material-icons" style="font-size:40px;opacity:0.3;">inbox</span>
                    <p style="margin-top:10px;font-size:13px;">No hay cargas sin réplica</p>
                </div>
            `;
            if (yAxis) yAxis.innerHTML = '<div>-</div><div>-</div><div>-</div><div>-</div>';
            return;
        }

        if (metricsContainer) {
            const total = dataChart.reduce((sum, item) => sum + item.cantidad, 0);
            const promedio = (total / dataChart.length).toFixed(1);
            const topBodega = dataChart.reduce((max, item) => item.cantidad > max.cantidad ? item : max, dataChart[0]);
            
            const metrics = metricsContainer.querySelectorAll('.metric');
            if (metrics.length >= 3) {
                metrics[0].querySelector('.metric-value').textContent = total.toLocaleString();
                metrics[1].querySelector('.metric-value').textContent = promedio;
                metrics[2].querySelector('.metric-value').textContent = `BD ${topBodega.bodega}`;
            }
        }

        const barColors = [
            { gradient: 'linear-gradient(180deg, #5500dd, #4400bb)', shadow: 'rgba(85, 0, 221, 0.3)', solid: '#5500dd' },
            { gradient: 'linear-gradient(180deg, #ff6b6b, #ff5252)', shadow: 'rgba(255, 107, 107, 0.3)', solid: '#ff6b6b' },
            { gradient: 'linear-gradient(180deg, #4caf50, #45a049)', shadow: 'rgba(76, 175, 80, 0.3)', solid: '#4caf50' },
            { gradient: 'linear-gradient(180deg, #ff9800, #f57c00)', shadow: 'rgba(255, 152, 0, 0.3)', solid: '#ff9800' },
            { gradient: 'linear-gradient(180deg, #00bfa5, #00a896)', shadow: 'rgba(0, 191, 165, 0.3)', solid: '#00bfa5' },
            { gradient: 'linear-gradient(180deg, #2196f3, #1976d2)', shadow: 'rgba(33, 150, 243, 0.3)', solid: '#2196f3' },
            { gradient: 'linear-gradient(180deg, #9c27b0, #7b1fa2)', shadow: 'rgba(156, 39, 176, 0.3)', solid: '#9c27b0' },
            { gradient: 'linear-gradient(180deg, #ffa726, #fb8c00)', shadow: 'rgba(255, 167, 38, 0.3)', solid: '#ffa726' },
            { gradient: 'linear-gradient(180deg, #ec407a, #e91e63)', shadow: 'rgba(236, 64, 122, 0.3)', solid: '#ec407a' },
            { gradient: 'linear-gradient(180deg, #26c6da, #00acc1)', shadow: 'rgba(38, 198, 218, 0.3)', solid: '#26c6da' }
        ];

        const maxVal = Math.max(...dataChart.map(d => d.cantidad));
        const total = dataChart.reduce((sum, item) => sum + item.cantidad, 0);
        
        // Ordenamiento descendente por cantidad (mayor a menor)
        const state = window.CargasModule.sinReplica;
        let sortedData = [...dataChart].sort((a, b) => b.cantidad - a.cantidad);
        
        const viewportWidth = window.innerWidth;
        let maxHeight, barWidth, gap, circleSize, fontSize, labelFontSize;
        
        if (viewportWidth < 768) {
            maxHeight = 180;
            circleSize = 24;
            fontSize = '10px';
            labelFontSize = '11px';
            if (sortedData.length > 15) {
                barWidth = '18px';
                gap = '6px';
            } else if (sortedData.length > 10) {
                barWidth = '22px';
                gap = '8px';
            } else {
                barWidth = '28px';
                gap = '10px';
            }
        } else if (viewportWidth < 1024) {
            maxHeight = 200;
            circleSize = 28;
            fontSize = '11px';
            labelFontSize = '12px';
            if (sortedData.length > 15) {
                barWidth = '24px';
                gap = '8px';
            } else if (sortedData.length > 10) {
                barWidth = '30px';
                gap = '10px';
            } else {
                barWidth = '36px';
                gap = '12px';
            }
        } else {
            maxHeight = 220;
            circleSize = 32;
            fontSize = '12px';
            labelFontSize = '13px';
            if (sortedData.length > 20) {
                barWidth = '24px';
                gap = '8px';
            } else if (sortedData.length > 15) {
                barWidth = '28px';
                gap = '10px';
            } else if (sortedData.length > 10) {
                barWidth = '36px';
                gap = '14px';
            } else {
                barWidth = '44px';
                gap = '16px';
            }
        }

        // Umbral crítico (ejemplo: 20 cargas)
        const threshold = 20;
        const thresholdHeight = (threshold / maxVal) * maxHeight;

        if (yAxis) {
            yAxis.innerHTML = `
                <div style="font-weight:600;color:#333;font-size:${fontSize};">${maxVal}</div>
                <div style="color:#666;font-size:${fontSize};">${Math.round(maxVal * 0.66)}</div>
                <div style="color:#666;font-size:${fontSize};">${Math.round(maxVal * 0.33)}</div>
                <div style="font-weight:600;color:#333;font-size:${fontSize};">0</div>
            `;
            yAxis.style.paddingTop = `${circleSize + 20}px`;
        }

        // ✨ GENERAR BARRAS SIMPLIFICADAS (SIN TOOLTIP, SOLO HOVER SIMPLE)
        const barsHtml = sortedData.map((item, index) => {
            const height = maxVal > 0 ? (item.cantidad / maxVal) * maxHeight : 0;
            const color = barColors[index % barColors.length];
            const percentage = ((item.cantidad / total) * 100).toFixed(1);
            const isAboveThreshold = item.cantidad > threshold;
            const animationDelay = index * 0.05;
            
            return `
                <div style="display:flex;
                            flex-direction:column;
                            align-items:center;
                            flex-shrink:0;
                            min-width:${barWidth};
                            position:relative;
                            padding-top:${circleSize + 20}px;"
                     class="bar-container"
                     data-bodega="${item.bodega}">
                    
                    <div style="width:${barWidth};
                                height:${maxHeight}px;
                                display:flex;
                                flex-direction:column;
                                justify-content:flex-end;
                                position:relative;">
                        
                        <!-- 🎨 BARRA CON ANIMACIÓN -->
                        <div class="bar-chart-column"
                             style="width:100%;
                                    height:0;
                                    background:${color.gradient};
                                    border-radius:4px 4px 0 0;
                                    box-shadow:0 2px 4px ${color.shadow};
                                    transition:all 0.3s ease;
                                    cursor:pointer;
                                    position:relative;
                                    animation:growBar 0.8s ease-out ${animationDelay}s forwards;"
                             data-final-height="${height}"
                             data-cantidad="${item.cantidad}"
                             onclick="CargasModule.filterByBodega(${item.bodega})"
                             onmouseover="
                                 this.style.transform='scale(1.05)';
                                 this.style.boxShadow='0 8px 16px ${color.shadow}';
                                 this.style.filter='brightness(1.15)';
                                 const leg = document.querySelector('.legend-item[data-bodega=\'${item.bodega}\']');
                                 if (leg) { leg.style.background='#f0f4ff'; leg.style.transform='translateX(4px)'; }
                             "
                             onmouseout="
                                 this.style.transform='scale(1)';
                                 this.style.boxShadow='0 2px 4px ${color.shadow}';
                                 this.style.filter='brightness(1)';
                                 const leg = document.querySelector('.legend-item[data-bodega=\'${item.bodega}\']');
                                 if (leg) { leg.style.background='transparent'; leg.style.transform='translateX(0)'; }
                             ">
                             
                            <!-- 🔢 CÍRCULO CON NÚMERO - MÁS SEPARADO -->
                            <div class="circle-number"
                                 style="position:absolute;
                                        top:-${circleSize + 16}px;
                                        left:50%;
                                        transform:translateX(-50%);
                                        width:${circleSize}px;
                                        height:${circleSize}px;
                                        background:white;
                                        border-radius:50%;
                                        display:flex;
                                        align-items:center;
                                        justify-content:center;
                                        box-shadow:0 3px 8px rgba(0,0,0,0.2);
                                        border:2px solid ${color.solid};
                                        font-size:${fontSize};
                                        font-weight:700;
                                        color:#333;
                                        z-index:10;
                                        transition:all 0.3s;">
                                <span class="number-display">0</span>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        const totalHeight = maxHeight + circleSize + 40;

        // 🎨 GRID LINES HORIZONTALES
        const gridLinesHtml = [maxVal, Math.round(maxVal * 0.66), Math.round(maxVal * 0.33)].map(val => {
            const lineHeight = (val / maxVal) * maxHeight;
            return `
                <div style="position:absolute;
                            bottom:${lineHeight}px;
                            left:0;
                            right:0;
                            height:1px;
                            background:rgba(0,0,0,0.05);
                            z-index:1;"></div>
            `;
        }).join('');

        // ⚠️ LÍNEA DE UMBRAL CRÍTICO
        const thresholdLine = threshold <= maxVal ? `
            <div style="position:absolute;
                        bottom:${thresholdHeight}px;
                        left:0;
                        right:0;
                        height:2px;
                        background:#ff5252;
                        z-index:5;
                        opacity:0.5;">
                <span style="position:absolute;
                             right:10px;
                             top:-20px;
                             background:#ff5252;
                             color:white;
                             padding:2px 8px;
                             border-radius:4px;
                             font-size:10px;
                             font-weight:600;">
                    Umbral: ${threshold}
                </span>
            </div>
        ` : '';

        chartArea.innerHTML = `
            <div style="width:100%;
                        height:100%;
                        overflow-x:auto;
                        overflow-y:hidden;
                        padding-bottom:12px;
                        -webkit-overflow-scrolling:touch;">
                <div style="display:flex;
                            gap:${gap};
                            align-items:flex-end;
                            justify-content:flex-start;
                            padding:6px 12px 12px 12px;
                            min-height:${totalHeight}px;
                            min-width:max-content;
                            position:relative;">
                    ${gridLinesHtml}
                    ${thresholdLine}
                    ${barsHtml}
                </div>
            </div>
            
            <style>
                /* 🎬 ANIMACIONES */
                @keyframes growBar {
                    from {
                        height: 0;
                        opacity: 0;
                    }
                    to {
                        height: var(--final-height);
                        opacity: 1;
                    }
                }
                
                @keyframes countUp {
                    from { opacity: 0; transform: scale(0.5); }
                    to { opacity: 1; transform: scale(1); }
                }
                
                /* Scrollbar */
                #chartAreaNoGuiadas > div::-webkit-scrollbar {
                    height: 5px;
                }
                #chartAreaNoGuiadas > div::-webkit-scrollbar-track {
                    background: #f5f5f5;
                    border-radius: 10px;
                }
                #chartAreaNoGuiadas > div::-webkit-scrollbar-thumb {
                    background: #5500dd;
                    border-radius: 10px;
                }
                #chartAreaNoGuiadas > div::-webkit-scrollbar-thumb:hover {
                    background: #4400bb;
                }
                
                .chart-container {
                    height: ${totalHeight + 90}px !important;
                    min-height: ${totalHeight + 90}px !important;
                    max-height: ${totalHeight + 90}px !important;
                    overflow: hidden !important;
                }
                
                #chartAreaNoGuiadas {
                    overflow-x: auto !important;
                    overflow-y: hidden !important;
                    height: 100% !important;
                }
                
                .card-body {
                    overflow: visible !important;
                }
                
                @media (max-width: 768px) {
                    .chart-container {
                        height: ${totalHeight + 80}px !important;
                        min-height: ${totalHeight + 80}px !important;
                        max-height: ${totalHeight + 80}px !important;
                    }
                }
            </style>
        `;

        // 🏷️ RENDERIZAR LEYENDA CON BODEGAS
        const legendContainer = document.querySelector('.legend');
        if (legendContainer) {
            const legendHtml = sortedData.map((item, index) => {
                const color = barColors[index % barColors.length];
                const percentage = ((item.cantidad / total) * 100).toFixed(1);
                return `
                    <div class="legend-item" data-bodega="${item.bodega}" style="cursor:pointer;transition:all 0.2s;padding:4px 8px;border-radius:6px;"
                         onclick="CargasModule.filterByBodega(${item.bodega})"
                         onmouseover="
                             this.style.background='#f0f4ff';
                             this.style.transform='translateX(4px)';
                             const bar = document.querySelector('.bar-container[data-bodega=\\'${item.bodega}\\'] .bar-chart-column');
                             if (bar) {
                                 bar.style.transform='scale(1.05)';
                                 bar.style.filter='brightness(1.15)';
                                 bar.style.boxShadow='0 8px 16px ${color.shadow}';
                             }
                         "
                         onmouseout="
                             this.style.background='transparent';
                             this.style.transform='translateX(0)';
                             const bar = document.querySelector('.bar-container[data-bodega=\\'${item.bodega}\\'] .bar-chart-column');
                             if (bar) {
                                 bar.style.transform='scale(1)';
                                 bar.style.filter='brightness(1)';
                                 bar.style.boxShadow='0 2px 4px ${color.shadow}';
                             }
                         ">
                        <div class="legend-color" style="background:${color.solid};"></div>
                        <span style="font-weight:600;">Bodega ${item.bodega}</span>
                        <span style="color:#999;font-size:12px;margin-left:8px;">(${item.cantidad} - ${percentage}%)</span>
                    </div>
                `;
            }).join('');
            legendContainer.innerHTML = legendHtml;
        }

        // ✨ ANIMAR NÚMEROS EN LOS CÍRCULOS
        setTimeout(() => {
            sortedData.forEach((item, index) => {
                const barContainer = document.querySelectorAll('.bar-container')[index];
                if (!barContainer) return;
                
                const numberDisplay = barContainer.querySelector('.number-display');
                const barColumn = barContainer.querySelector('.bar-chart-column');
                const finalHeight = barColumn.getAttribute('data-final-height');
                
                // Establecer altura final para la animación CSS
                barColumn.style.setProperty('--final-height', finalHeight + 'px');
                
                // Animar contador
                let count = 0;
                const duration = 800;
                const increment = item.cantidad / (duration / 16);
                const interval = setInterval(() => {
                    count += increment;
                    if (count >= item.cantidad) {
                        numberDisplay.textContent = item.cantidad;
                        clearInterval(interval);
                    } else {
                        numberDisplay.textContent = Math.floor(count);
                    }
                }, 16);
            });
        }, 100);

        console.log('✨ Gráfico renderizado correctamente');
    }

    // ============================================
    // FUNCIONES DE INTERACCIÓN
    // ============================================
    
    // 🔍 FILTRAR TABLA POR BODEGA (AL HACER CLICK EN BARRA)
    window.CargasModule.filterByBodega = function(bodega) {
        console.log(`🔍 Filtrando por bodega: ${bodega}`);
        const bodegaFilter = document.getElementById('filterBodegaBarras');
        if (bodegaFilter) {
            bodegaFilter.value = bodega;
            window.CargasModule.sinReplica.currentFilters.bodega = bodega;
            window.CargasModule.sinReplica.currentPage = 1;
            loadChartBarrasYTabla();
            
            // Scroll suave a la tabla
            const tablaContainer = document.getElementById('tablaDetalleCargas');
            if (tablaContainer) {
                tablaContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }
    };

    // Event listener para resize con debounce
    let resizeTimeout;
    window.addEventListener('resize', function() {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(function() {
            if (typeof window.CargasModule !== 'undefined' && 
                typeof window.CargasModule.refreshAll === 'function') {
                console.log('🔄 Re-renderizando gráfico por cambio de viewport');
                window.CargasModule.refreshAll();
            }
        }, 300);
    });

    // ============================================
    // RENDERIZAR TABLA
    // ============================================
    function renderTablaDetalle(dataChart, resultTable) {
        const tablaContainer = document.getElementById('tablaDetalleCargas');
        if (!tablaContainer) {
            console.error('No se encontró el elemento tablaDetalleCargas');
            return;
        }

        const state = window.CargasModule.sinReplica;
        const sortedData = [...dataChart].sort((a, b) => b.cantidad - a.cantidad);

        const tableRows = resultTable.data && resultTable.data.length > 0 ? resultTable.data.map((row, idx) => {
            const isEven = idx % 2 === 0;
            const bgColor = isEven ? '#ffffff' : '#fafafa';
            return `
                <tr style="background:${bgColor};border-bottom:1px solid #f0f0f0;transition:all 0.2s;" 
                    onmouseover="this.style.background='#f0f4ff'" 
                    onmouseout="this.style.background='${bgColor}'">
                    <td style="padding:14px 16px;font-weight:600;border-right:1px solid #f0f0f0;">
                        <div style="display:flex;align-items:center;gap:8px;">
                            <span class="material-icons" style="font-size:18px;color:#5500dd;">store</span>
                            ${row.BODEGA || '-'}
                        </div>
                    </td>
                    <td style="padding:14px 16px;font-weight:700;color:#5500dd;border-right:1px solid #f0f0f0;cursor:pointer;"
                        onmouseover="this.style.textDecoration='underline'" 
                        onmouseout="this.style.textDecoration='none'">${row.CARGA || '-'}</td>
                    <td style="padding:14px 16px;border-right:1px solid #f0f0f0;">${row.TIENDA || '-'}</td>
                    <td style="padding:14px 16px;text-align:center;border-right:1px solid #f0f0f0;">
                        <span style="padding:4px 12px;background:${row.TIPO_PEDIDO === 'PED' ? '#e3f2fd' : '#fff3e0'};
                                     color:${row.TIPO_PEDIDO === 'PED' ? '#1976d2' : '#f57c00'};
                                     border-radius:12px;font-weight:600;font-size:11px;">${row.TIPO_PEDIDO || '-'}</span>
                    </td>
                    <td style="padding:14px 16px;border-right:1px solid #f0f0f0;">${row.BODEGA_DESTINO || '-'}</td>
                    <td style="padding:14px 16px;font-size:12px;border-right:1px solid #f0f0f0;">
                        <div style="display:flex;align-items:center;gap:6px;">
                            <span class="material-icons" style="font-size:16px;color:#999;">schedule</span>
                            ${row.FECHA_MODIFICACION ? new Date(row.FECHA_MODIFICACION).toLocaleString('es-CL', {
                                year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
                            }) : '-'}
                        </div>
                    </td>
                    <td style="padding:14px 16px;text-align:center;">
                        <span style="padding:6px 14px;background:linear-gradient(135deg,#ffebee,#ffcdd2);
                                     color:#c62828;border-radius:16px;font-size:11px;font-weight:700;">SIN RÉPLICA</span>
                    </td>
                </tr>
            `;
        }).join('') : '<tr><td colspan="7" style="text-align:center;padding:60px;"><span class="material-icons" style="font-size:48px;opacity:0.3;">inbox</span><p>No hay registros</p></td></tr>';

        tablaContainer.innerHTML = `
            <div style="margin-bottom:16px;padding:16px;background:linear-gradient(135deg,#f8f9fa,#ffffff);
                        border-radius:12px;border:1px solid #e0e0e0;">
                <div style="display:flex;gap:12px;flex-wrap:wrap;align-items:center;">
                    <div style="flex:1;min-width:280px;position:relative;">
                        <span class="material-icons" style="position:absolute;left:14px;top:50%;transform:translateY(-50%);
                                                             color:#999;font-size:20px;pointer-events:none;">search</span>
                        <input type="text" id="searchInputBarras" placeholder="Buscar por Load Nbr, Bodega, Tienda..." 
                               style="width:100%;padding:12px 14px 12px 44px;border:2px solid #e0e0e0;border-radius:8px;
                                      font-size:13px;transition:all 0.3s;background:white;"
                               onfocus="this.style.borderColor='#5500dd';this.style.boxShadow='0 0 0 4px rgba(85,0,221,0.1)'"
                               onblur="this.style.borderColor='#e0e0e0';this.style.boxShadow='none'">
                    </div>
                    
                    <div style="min-width:200px;position:relative;">
                        <span class="material-icons" style="position:absolute;left:14px;top:50%;transform:translateY(-50%);
                                                             color:#999;font-size:20px;pointer-events:none;">store</span>
                        <select id="filterBodegaBarras" style="width:100%;padding:12px 14px 12px 44px;border:2px solid #e0e0e0;
                                                                border-radius:8px;font-size:13px;cursor:pointer;background:white;"
                                onchange="CargasModule.applyFiltersBarras()">
                            <option value="">Todas las Bodegas</option>
                            ${sortedData.map(item => `<option value="${item.bodega}">Bodega ${item.bodega} (${item.cantidad})</option>`).join('')}
                        </select>
                    </div>

                    <button onclick="CargasModule.clearFiltersBarras()" 
                            style="padding:12px 24px;background:white;border:2px solid #e0e0e0;border-radius:8px;
                                   cursor:pointer;font-size:13px;font-weight:600;color:#666;transition:all 0.3s;
                                   display:flex;align-items:center;gap:6px;"
                            onmouseover="this.style.borderColor='#5500dd';this.style.color='#5500dd'"
                            onmouseout="this.style.borderColor='#e0e0e0';this.style.color='#666'">
                        <span class="material-icons" style="font-size:18px;">refresh</span>
                        Limpiar
                    </button>

                    <div style="display:flex;align-items:center;gap:10px;margin-left:auto;background:white;
                                padding:8px 12px;border-radius:8px;border:2px solid #e0e0e0;">
                        <span class="material-icons" style="font-size:18px;color:#999;">view_list</span>
                        <span style="font-size:12px;color:#666;font-weight:500;">Mostrar:</span>
                        <select id="entriesPerPageBarras" style="padding:6px 10px;border:1px solid #ddd;
                                                                   border-radius:6px;font-size:13px;cursor:pointer;font-weight:600;">
                            <option value="5">5</option>
                            <option value="10">10</option>
                            <option value="25">25</option>
                            <option value="50">50</option>
                            <option value="100">100</option>
                        </select>
                    </div>
                </div>
            </div>

            <div style="overflow-x:auto;border:1px solid #e0e0e0;border-radius:12px;box-shadow:0 4px 12px rgba(0,0,0,0.08);">
                <table style="width:100%;border-collapse:collapse;background:white;font-size:13px;min-width:1100px;">
                    <thead>
                        <tr style="background:linear-gradient(135deg,#5500dd,#4400bb);color:white;">
                            <th style="padding:16px;text-align:left;font-size:12px;text-transform:uppercase;
                                       border-right:1px solid rgba(255,255,255,0.1);cursor:pointer;"
                                onclick="CargasModule.sortTableBarras('bodega')">
                                <div style="display:flex;align-items:center;gap:8px;">
                                    <span class="material-icons" style="font-size:18px;">store</span>
                                    Bodega
                                    <span id="sort-bodega" class="material-icons" style="font-size:16px;margin-left:auto;">unfold_more</span>
                                </div>
                            </th>
                            <th style="padding:16px;text-align:left;font-size:12px;text-transform:uppercase;
                                       border-right:1px solid rgba(255,255,255,0.1);cursor:pointer;"
                                onclick="CargasModule.sortTableBarras('load_nbr')">
                                <div style="display:flex;align-items:center;gap:8px;">
                                    <span class="material-icons" style="font-size:18px;">local_shipping</span>
                                    Load Nbr
                                    <span id="sort-load_nbr" class="material-icons" style="font-size:16px;margin-left:auto;">unfold_more</span>
                                </div>
                            </th>
                            <th style="padding:16px;text-align:left;font-size:12px;text-transform:uppercase;
                                       border-right:1px solid rgba(255,255,255,0.1);">
                                <div style="display:flex;align-items:center;gap:8px;">
                                    <span class="material-icons" style="font-size:18px;">storefront</span>
                                    Tienda
                                </div>
                            </th>
                            <th style="padding:16px;text-align:center;font-size:12px;text-transform:uppercase;
                                       border-right:1px solid rgba(255,255,255,0.1);">
                                <div style="display:flex;align-items:center;gap:8px;justify-content:center;">
                                    <span class="material-icons" style="font-size:18px;">category</span>
                                    Tipo Pedido
                                </div>
                            </th>
                            <th style="padding:16px;text-align:left;font-size:12px;text-transform:uppercase;
                                       border-right:1px solid rgba(255,255,255,0.1);">
                                <div style="display:flex;align-items:center;gap:8px;">
                                    <span class="material-icons" style="font-size:18px;">place</span>
                                    Bodega Destino
                                </div>
                            </th>
                            <th style="padding:16px;text-align:left;font-size:12px;text-transform:uppercase;
                                       border-right:1px solid rgba(255,255,255,0.1);cursor:pointer;"
                                onclick="CargasModule.sortTableBarras('mod_date_time')">
                                <div style="display:flex;align-items:center;gap:8px;">
                                    <span class="material-icons" style="font-size:18px;">event</span>
                                    Fecha Modificación
                                    <span id="sort-mod_date_time" class="material-icons" style="font-size:16px;margin-left:auto;">unfold_more</span>
                                </div>
                            </th>
                            <th style="padding:16px;text-align:center;font-size:12px;text-transform:uppercase;">
                                <div style="display:flex;align-items:center;gap:8px;justify-content:center;">
                                    <span class="material-icons" style="font-size:18px;">error_outline</span>
                                    Error
                                </div>
                            </th>
                        </tr>
                    </thead>
                    <tbody>${tableRows}</tbody>
                </table>
            </div>

            <div style="display:flex;justify-content:space-between;align-items:center;margin-top:16px;
                        padding:16px;background:linear-gradient(135deg,#f8f9fa,#ffffff);border-radius:10px;
                        border:1px solid #e0e0e0;">
                <div style="color:#666;font-weight:500;display:flex;align-items:center;gap:8px;">
                    <span class="material-icons" style="font-size:18px;color:#999;">info</span>
                    Mostrando <strong style="color:#5500dd;margin:0 4px;">${resultTable.data.length > 0 ? ((state.currentPage - 1) * state.currentPageSize + 1) : 0}</strong>
                    a <strong style="color:#5500dd;margin:0 4px;">${Math.min(state.currentPage * state.currentPageSize, resultTable.total)}</strong>
                    de <strong style="color:#5500dd;margin:0 4px;">${resultTable.total}</strong> registros
                </div>
                <div id="paginacionInterna"></div>
            </div>
        `;

        renderPaginacionInterna(resultTable);
        setupFilterListenersBarras();

        console.log('✅ Tabla renderizada correctamente');
    }

    // ============================================
    // FUNCIONES AUXILIARES
    // ============================================
    
    function setupFilterListenersBarras() {
        const searchInput = document.getElementById('searchInputBarras');
        const entriesSelect = document.getElementById('entriesPerPageBarras');
        
        if (searchInput && !searchInput.dataset.listener) {
            searchInput.dataset.listener = 'true';
            let searchTimeout;
            searchInput.addEventListener('input', (e) => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    window.CargasModule.sinReplica.currentFilters.q = e.target.value.trim();
                    window.CargasModule.sinReplica.currentPage = 1;
                    loadChartBarrasYTabla();
                }, 400);
            });
        }

        if (entriesSelect && !entriesSelect.dataset.listener) {
            entriesSelect.dataset.listener = 'true';
            entriesSelect.value = window.CargasModule.sinReplica.currentPageSize;
            entriesSelect.addEventListener('change', (e) => {
                window.CargasModule.sinReplica.currentPageSize = parseInt(e.target.value);
                window.CargasModule.sinReplica.currentPage = 1;
                loadChartBarrasYTabla();
            });
        }
    }

    window.CargasModule.applyFiltersBarras = function() {
        const bodegaFilter = document.getElementById('filterBodegaBarras');
        if (bodegaFilter) {
            window.CargasModule.sinReplica.currentFilters.bodega = bodegaFilter.value || null;
            window.CargasModule.sinReplica.currentPage = 1;
            loadChartBarrasYTabla();
        }
    };

    window.CargasModule.clearFiltersBarras = function() {
        const searchInput = document.getElementById('searchInputBarras');
        const bodegaFilter = document.getElementById('filterBodegaBarras');
        
        if (searchInput) searchInput.value = '';
        if (bodegaFilter) bodegaFilter.value = '';
        
        window.CargasModule.sinReplica.currentFilters = { bodega: null, desde: null, hasta: null, q: '' };
        window.CargasModule.sinReplica.currentPage = 1;
        loadChartBarrasYTabla();
    };

    window.CargasModule.sortTableBarras = function(field) {
        const state = window.CargasModule.sinReplica;
        
        if (state.currentSort.by === field) {
            state.currentSort.dir = state.currentSort.dir === 'asc' ? 'desc' : 'asc';
        } else {
            state.currentSort.by = field;
            state.currentSort.dir = 'desc';
        }
        
        document.querySelectorAll('[id^="sort-"]').forEach(span => span.textContent = 'unfold_more');
        const sortIcon = document.getElementById(`sort-${field}`);
        if (sortIcon) {
            sortIcon.textContent = state.currentSort.dir === 'asc' ? 'arrow_upward' : 'arrow_downward';
        }
        
        loadChartBarrasYTabla();
    };

    function renderPaginacionInterna(result) {
        const container = document.getElementById('paginacionInterna');
        if (!container) return;

        const totalPages = result.total_pages || 1;
        const current = result.page;
        const btnBase = 'padding:10px 16px;margin:0 4px;border:2px solid #e0e0e0;border-radius:8px;font-size:13px;font-weight:500;display:inline-flex;align-items:center;gap:4px;transition:all 0.3s;';
        let html = '';
        
        html += `<button ${current === 1 ? 'disabled' : ''} onclick="CargasModule.goToPageBarras(${current - 1})" 
                 style="${btnBase}cursor:${current === 1 ? 'not-allowed' : 'pointer'};background:${current === 1 ? '#fafafa' : 'white'};">
                 <span class="material-icons" style="font-size:16px;">chevron_left</span>Anterior</button>`;
        
        const maxButtons = 5;
        let startPage = Math.max(1, current - 2);
        let endPage = Math.min(totalPages, startPage + maxButtons - 1);
        
        if (endPage - startPage < maxButtons - 1) {
            startPage = Math.max(1, endPage - maxButtons + 1);
        }
        
        for (let i = startPage; i <= endPage; i++) {
            if (i === current) {
                html += `<button style="${btnBase}background:linear-gradient(135deg,#5500dd,#4400bb);color:white;border-color:#5500dd;box-shadow:0 4px 8px rgba(85,0,221,0.3);">${i}</button>`;
            } else {
                html += `<button onclick="CargasModule.goToPageBarras(${i})" style="${btnBase}cursor:pointer;background:white;"
                         onmouseover="this.style.background='#f0f4ff';this.style.borderColor='#5500dd'" 
                         onmouseout="this.style.background='white';this.style.borderColor='#e0e0e0'">${i}</button>`;
            }
        }
        
        html += `<button ${current === totalPages ? 'disabled' : ''} onclick="CargasModule.goToPageBarras(${current + 1})" 
                 style="${btnBase}cursor:${current === totalPages ? 'not-allowed' : 'pointer'};background:${current === totalPages ? '#fafafa' : 'white'};">
                 Siguiente<span class="material-icons" style="font-size:16px;">chevron_right</span></button>`;
        
        container.innerHTML = html;
    }

    async function loadChartPieSinReplica() {
        try {
            const response = await fetch('/api/cargas/sin-replica-por-bodega');
            const result = await response.json();
            if (result.ok && result.data && result.data.length > 0) {
                renderPieChart(result.data);
            }
        } catch (error) {
            console.error('Error cargando pie chart:', error);
        }
    }

    function renderPieChart(data) {
        const cards = document.querySelectorAll('.card');
        if (cards.length < 3) return;

        const pieContainer = cards[2].querySelector('.pie-container');
        const pieLegend = cards[2].querySelector('.pie-legend');
        if (!pieContainer || !pieLegend || !data || data.length === 0) return;

        const total = data.reduce((sum, item) => sum + item.cantidad, 0);
        const colors = ['#5500dd', '#ff6b6b', '#4caf50', '#ff9800', '#00bfa5', '#9c27b0', '#ffa726', '#2196f3'];
        
        let currentAngle = 0;
        const circles = data.map((item, index) => {
            const percentage = (item.cantidad / total) * 100;
            const circumference = 2 * Math.PI * 40;
            const dashLength = (percentage / 100) * circumference;
            const dashOffset = -currentAngle;
            currentAngle += dashLength;
            
            return {
                color: colors[index % colors.length],
                dashArray: `${dashLength} ${circumference}`,
                dashOffset: dashOffset,
                bodega: item.bodega,
                cantidad: item.cantidad,
                percentage: percentage.toFixed(1)
            };
        });

        pieContainer.innerHTML = `
            <svg class="pie-chart" viewBox="0 0 100 100">
                ${circles.map(c => `<circle cx="50" cy="50" r="40" fill="none" stroke="${c.color}" stroke-width="20"
                    stroke-dasharray="${c.dashArray}" stroke-dashoffset="${c.dashOffset}" />`).join('')}
            </svg>
        `;

        pieLegend.innerHTML = circles.map(c => `
            <div class="pie-legend-item" style="transition:all 0.2s;cursor:pointer;padding:8px;border-radius:8px;"
                 onmouseover="this.style.background='#f0f4ff';this.style.transform='translateX(4px)'"
                 onmouseout="this.style.background='transparent';this.style.transform='translateX(0)'">
                <div class="pie-legend-color" style="background:${c.color};box-shadow:0 2px 4px rgba(0,0,0,0.2);"></div>
                <div class="pie-legend-label">
                    <strong style="font-size:14px;">Bodega ${c.bodega}</strong>
                    <span style="display:block;font-size:12px;color:#666;margin-top:2px;">
                        <strong>${c.cantidad.toLocaleString()}</strong> cargas (${c.percentage}%)
                    </span>
                </div>
            </div>
        `).join('');
    }

    // ============================================
    // FUNCIONES PÚBLICAS
    // ============================================
    window.CargasModule.init = function() {
        console.log('🚀 Inicializando módulo Cargas Sin Réplica - Versión Corregida');
        loadChartBarrasYTabla();
        // loadChartPieSinReplica();
    };

    window.CargasModule.refreshAll = function() {
        console.log('🔄 Refrescando todos los datos');
        loadChartBarrasYTabla();
        // loadChartPieSinReplica();
    };

    window.CargasModule.goToPageBarras = function(page) {
        window.CargasModule.sinReplica.currentPage = page;
        loadChartBarrasYTabla();
    };

    window.refreshChartNoGuiadas = () => {
        console.log('🔄 Refrescando gráfico de cargas no guiadas');
        loadChartBarrasYTabla();
    };
    
    window.refreshChartSinReplica = () => {
        console.log('🔄 Refrescando pie chart');
        loadChartPieSinReplica();
    };

    // Auto-inicialización
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(() => {
                console.log('DOM cargado, inicializando módulo...');
                window.CargasModule.init();
            }, 100);
        });
    } else {
        setTimeout(() => {
            console.log('Inicializando módulo directamente...');
            window.CargasModule.init();
        }, 100);
    }
})();