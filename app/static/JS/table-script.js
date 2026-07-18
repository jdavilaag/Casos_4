// ============================================
// CARGAS NO GUIADAS - SIN ENDPOINT ADICIONAL
// ============================================

(function() {
    'use strict';
    
    console.log('🔧 Iniciando módulo Cargas No Guiadas...');

    // Estado global
    let currentPage = 1;
    let currentSize = 5;
    let currentSort = 'create_date_time';
    let currentDir = 'desc';
    let currentSearch = '';
    let totalPages = 0;
    let totalRecords = 0;
    let allData = []; // Guardar todos los datos para calcular stats

    // ============================================
    // ACTUALIZAR STATS CARDS DESDE DATOS DE TABLA
    // ============================================
    function updateStatsCardsFromTableData(tableResult) {
        console.log(' Actualizando Stats Cards desde datos de tabla...');
        
        try {
            const statsCards = document.querySelectorAll('.stat-card-top');
            
            if (statsCards.length < 4) {
                console.warn(' No se encontraron 4 stats cards');
                return;
            }

            // Usar el total de la tabla
            const totalCargas = tableResult.total || 0;
            
            // Agrupar por bodega desde los datos disponibles
            const bodegasMap = new Map();
            
            if (tableResult.data && Array.isArray(tableResult.data)) {
                tableResult.data.forEach(item => {
                    const bodega = item.BODEGA;
                    if (bodega) {
                        bodegasMap.set(bodega, (bodegasMap.get(bodega) || 0) + 1);
                    }
                });
            }
            
            // Si necesitamos más datos, hacer un fetch de todas las cargas
            // (solo primera vez o cuando sea necesario)
            fetchAllCargas().then(allCargas => {
                const bodegasCompleto = new Map();
                
                allCargas.forEach(item => {
                    const bodega = item.BODEGA;
                    if (bodega) {
                        bodegasCompleto.set(bodega, (bodegasCompleto.get(bodega) || 0) + 1);
                    }
                });
                
                const bodegasArray = Array.from(bodegasCompleto.entries()).map(([bodega, cantidad]) => ({
                    bodega,
                    cantidad
                })).sort((a, b) => b.cantidad - a.cantidad);
                
                const bodegasAfectadas = bodegasArray.length;
                const bodegaMasAfectada = bodegasArray[0] || { bodega: '-', cantidad: 0 };
                const promedioPorBodega = bodegasAfectadas > 0 ? (totalCargas / bodegasAfectadas).toFixed(1) : '0';
                
                console.log(' Métricas calculadas:');
                console.log('   - Total:', totalCargas);
                console.log('   - Bodegas:', bodegasAfectadas);
                console.log('   - Top:', bodegaMasAfectada.bodega, '(' + bodegaMasAfectada.cantidad + ')');
                console.log('   - Promedio:', promedioPorBodega);
                
                // Card 1: Total Cargas
                updateCard(statsCards[0], {
                    value: totalCargas.toLocaleString(),
                    label: 'Cargas No Guiadas',
                    icon: 'inventory_2'
                });
                
                // Card 2: Bodegas Afectadas
                updateCard(statsCards[1], {
                    value: bodegasAfectadas,
                    label: 'Bodegas Afectadas',
                    icon: 'warehouse'
                });

                // Card 3: Bodega Más Afectada
                updateCard(statsCards[2], {
                    value: `BD ${bodegaMasAfectada.bodega}`,
                    label: 'Bodega Más Afectada',
                    icon: 'emoji_events',
                    trend: `${bodegaMasAfectada.cantidad} cargas`
                });

                // Card 4: Promedio
                updateCard(statsCards[3], {
                    value: promedioPorBodega,
                    label: 'Promedio por Bodega',
                    icon: 'equalizer'
                });
                
                console.log(' Stats cards actualizadas');
            });
            
        } catch (error) {
            console.error(' Error actualizando stats:', error);
        }
    }

    async function fetchAllCargas() {
        try {
            // Obtener TODAS las cargas (sin paginación) para calcular correctamente
            const response = await fetch('/api/cargas/no-guiadas?page=1&page_size=10000');
            const result = await response.json();
            
            if (result.ok && result.data && Array.isArray(result.data)) {
                return result.data;
            }
            return [];
        } catch (error) {
            console.error('Error fetching all cargas:', error);
            return [];
        }
    }

    function updateCard(card, data) {
        if (!card) return;
        
        const cardValue = card.querySelector('.stat-card-top-value');
        const cardLabel = card.querySelector('.stat-card-top-label');
        const cardIcon = card.querySelector('.stat-card-top-icon .material-icons');
        const cardTrend = card.querySelector('.stat-card-top-trend span:last-child');
        
        if (cardValue) cardValue.textContent = data.value;
        if (cardLabel) cardLabel.textContent = data.label;
        if (cardIcon) cardIcon.textContent = data.icon;
        if (cardTrend && data.trend) cardTrend.textContent = data.trend;
    }

    // ============================================
    // HELPERS
    // ============================================
    function toNumberSafe(value, fallback = 0) {
        const n = Number(value);
        return Number.isFinite(n) ? n : fallback;
    }

    function formatFechaLocal(isoDate) {
        try {
            const d = new Date(isoDate);
            if (isNaN(d.getTime())) return String(isoDate ?? '-');
            return d.toLocaleString('es-CL', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch {
            return String(isoDate ?? '-');
        }
    }

    function escapeCSV(value) {
        const v = value == null ? '' : String(value);
        return `"${v.replace(/"/g, '""')}"`;
    }

    // ============================================
    // CONSTRUIR FILA
    // ============================================
    function construirFila(fila, numero) {
        const tr = document.createElement('tr');
        const isEven = numero % 2 === 0;
        
        tr.style.background = isEven ? '#ffffff' : '#fafafa';
        tr.style.borderBottom = '1px solid #f0f0f0';
        tr.style.transition = 'all 0.2s';
        
        tr.onmouseover = function() { this.style.background = '#f0f4ff'; };
        tr.onmouseout = function() { this.style.background = isEven ? '#ffffff' : '#fafafa'; };

        // Columna #
        const tdNum = document.createElement('td');
        tdNum.style.padding = '14px 16px';
        tdNum.style.fontWeight = '600';
        tdNum.style.color = '#5500dd';
        tdNum.style.fontSize = '13px';
        tdNum.textContent = numero;
        tr.appendChild(tdNum);

        // Columna Bodega
        const tdBod = document.createElement('td');
        tdBod.style.padding = '14px 16px';
        tdBod.innerHTML = `
            <div style="display:flex;align-items:center;justify-content:flex-start;">
                <div style="width:32px;
                            height:32px;
                            background:linear-gradient(135deg,#5500dd,#4400bb);
                            border-radius:6px;
                            display:flex;
                            align-items:center;
                            justify-content:center;
                            color:white;
                            font-weight:600;
                            font-size:13px;
                            box-shadow:0 2px 4px rgba(85,0,221,0.2);">
                    ${fila.BODEGA || '-'}
                </div>
            </div>
        `;
        tr.appendChild(tdBod);

        // Columna Carga
        const tdCar = document.createElement('td');
        tdCar.style.padding = '14px 16px';
        tdCar.innerHTML = `
            <span style="font-weight:600;
                         color:#5500dd;
                         font-size:13px;
                         cursor:pointer;
                         transition:all 0.2s;"
                  onmouseover="this.style.textDecoration='underline'"
                  onmouseout="this.style.textDecoration='none'">
                ${fila.CARGA || '-'}
            </span>
        `;
        tr.appendChild(tdCar);

        // Columna Tienda
        const tdTie = document.createElement('td');
        tdTie.style.padding = '14px 16px';
        tdTie.innerHTML = `
            <div style="display:flex;align-items:center;gap:8px;">
                <span class="material-icons" style="font-size:18px;color:#999;">storefront</span>
                <span style="color:#666;font-size:13px;">${fila.TIENDA || 'Sin asignar'}</span>
            </div>
        `;
        tr.appendChild(tdTie);

        // Columna Fecha
        const tdFec = document.createElement('td');
        tdFec.style.padding = '14px 16px';
        const fecha = fila.FECHA_CREACION ? formatFechaLocal(fila.FECHA_CREACION) : '-';
        tdFec.innerHTML = `
            <div style="display:flex;align-items:center;gap:8px;">
                <span class="material-icons" style="font-size:18px;color:#999;">schedule</span>
                <span style="color:#666;font-size:13px;">${fecha}</span>
            </div>
        `;
        tr.appendChild(tdFec);

        return tr;
    }

    function pintarSkeleton(tbody, texto = '⏳ Cargando...') {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align:center;padding:40px;">
                    <div style="display:flex;flex-direction:column;align-items:center;gap:16px;">
                        <div style="width:48px;
                                    height:48px;
                                    border:4px solid #5500dd;
                                    border-top-color:transparent;
                                    border-radius:50%;
                                    animation:spin 1s linear infinite;"></div>
                        <p style="color:#999;font-size:14px;">${texto}</p>
                    </div>
                </td>
            </tr>
        `;
    }

    // ============================================
    // CARGAR DATOS DEL BACKEND
    // ============================================
    async function cargarDatos() {
        console.log('\n📡 === CARGANDO DATOS ===');

        const tbody = document.getElementById('tableBody');
        if (!tbody) {
            console.error(' No se encontró #tableBody');
            return;
        }

        pintarSkeleton(tbody);

        try {
            let url = `/api/cargas/no-guiadas?page=${currentPage}&page_size=${currentSize}&sort_by=${encodeURIComponent(currentSort)}&sort_dir=${encodeURIComponent(currentDir)}`;
            if (currentSearch) {
                url += `&q=${encodeURIComponent(currentSearch)}`;
            }

            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Error HTTP: ${response.status}`);
            }

            const json = await response.json();

            if (!json || json.ok === false) {
                throw new Error('Respuesta no válida del servidor');
            }

            const data = Array.isArray(json.data) ? json.data : [];
            
            if (data.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="5" style="text-align:center;padding:60px;">
                            <span class="material-icons" style="font-size:64px;opacity:0.3;">inbox</span>
                            <p style="margin-top:16px;font-size:14px;color:#999;">No hay registros</p>
                        </td>
                    </tr>
                `;
                updatePaginationInfo(0, 0, 0);
                updatePagination(0);
                
                // Actualizar stats aunque no haya datos
                updateStatsCardsFromTableData(json);
                return;
            }

            totalRecords = toNumberSafe(json.total, data.length);
            totalPages = toNumberSafe(json.total_pages, Math.ceil(totalRecords / currentSize));

            console.log(` ${data.length} registros recibidos de ${totalRecords} totales`);

            // Limpiar y pintar filas
            tbody.innerHTML = '';
            const startNum = (currentPage - 1) * currentSize;

            data.forEach((fila, idx) => {
                const tr = construirFila(fila, startNum + idx + 1);
                tbody.appendChild(tr);
            });

            // Actualizar info y paginación
            const desde = startNum + 1;
            const hasta = Math.min(startNum + data.length, totalRecords);
            updatePaginationInfo(desde, hasta, totalRecords);
            updatePagination(totalPages);

            //  Actualizar stats cards
            updateStatsCardsFromTableData(json);

        } catch (error) {
            console.error('❌ ERROR AL CARGAR:', error);
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align:center;padding:40px;">
                        <span class="material-icons" style="font-size:64px;opacity:0.3;color:#f44336;">error_outline</span>
                        <p style="margin-top:16px;font-size:14px;color:#f44336;">Error: ${error.message}</p>
                    </td>
                </tr>
            `;
        }
    }

    // ============================================
    // ACTUALIZAR INFO DE PAGINACIÓN
    // ============================================
    function updatePaginationInfo(desde, hasta, total) {
        const info = document.getElementById('cargasShowing');
        if (!info) return;

        if (total === 0) {
            info.innerHTML = `
                <div style="display:flex;align-items:center;gap:8px;color:#666;font-size:14px;">
                    <span class="material-icons" style="font-size:18px;color:#999;">info</span>
                    Mostrando 0 a 0 de 0 registros
                </div>
            `;
        } else {
            info.innerHTML = `
                <div style="display:flex;align-items:center;gap:8px;color:#666;font-size:14px;">
                    <span class="material-icons" style="font-size:18px;color:#999;">info</span>
                    Mostrando <strong style="color:#5500dd;margin:0 4px;">${desde}</strong>
                    a <strong style="color:#5500dd;margin:0 4px;">${hasta}</strong>
                    de <strong style="color:#5500dd;margin:0 4px;">${total}</strong> registros
                </div>
            `;
        }
    }

    // ============================================
    // PAGINACIÓN
    // ============================================
    function updatePagination(totalPgs) {
        const pag = document.getElementById('cargasPagination');
        if (!pag) return;

        pag.innerHTML = '';
        if (totalPgs <= 1) return;

        const btnStyle = `
            padding:10px 16px;
            margin:0 4px;
            border:2px solid #e0e0e0;
            border-radius:8px;
            font-size:13px;
            font-weight:600;
            background:white;
            cursor:pointer;
            transition:all 0.2s;
            display:inline-flex;
            align-items:center;
            gap:4px;
        `;

        // Botón Anterior
        const btnPrev = document.createElement('button');
        btnPrev.innerHTML = '<span class="material-icons" style="font-size:16px;">chevron_left</span>Anterior';
        btnPrev.disabled = currentPage === 1;
        btnPrev.style.cssText = btnStyle + (currentPage === 1 ? 'opacity:0.5;cursor:not-allowed;' : '');
        if (currentPage > 1) {
            btnPrev.onclick = () => { currentPage--; cargarDatos(); };
        }
        pag.appendChild(btnPrev);

        // Botones de páginas
        const maxBotones = 10;
        let start = Math.max(1, currentPage - Math.floor(maxBotones / 2));
        let end = Math.min(totalPgs, start + maxBotones - 1);
        if (end - start < maxBotones - 1) start = Math.max(1, end - maxBotones + 1);

        for (let i = start; i <= end; i++) {
            const btn = document.createElement('button');
            btn.textContent = i;
            if (i === currentPage) {
                btn.style.cssText = btnStyle + 'background:linear-gradient(135deg,#5500dd,#4400bb);color:white;border-color:#5500dd;box-shadow:0 4px 8px rgba(85,0,221,0.3);';
            } else {
                btn.style.cssText = btnStyle;
                btn.onclick = () => { currentPage = i; cargarDatos(); };
            }
            pag.appendChild(btn);
        }

        // Botón Siguiente
        const btnNext = document.createElement('button');
        btnNext.innerHTML = 'Siguiente<span class="material-icons" style="font-size:16px;">chevron_right</span>';
        btnNext.disabled = currentPage === totalPgs;
        btnNext.style.cssText = btnStyle + (currentPage === totalPgs ? 'opacity:0.5;cursor:not-allowed;' : '');
        if (currentPage < totalPgs) {
            btnNext.onclick = () => { currentPage++; cargarDatos(); };
        }
        pag.appendChild(btnNext);
    }

    // ============================================
    // INICIALIZAR
    // ============================================
    function init() {
        console.log(' Inicializando Cargas No Guiadas...');

        const tbody = document.getElementById('tableBody');
        const select = document.getElementById('entriesPerPage');
        const search = document.getElementById('searchInput');

        if (!tbody || !select) {
            console.error('❌ Elementos no encontrados');
            return;
        }

        select.value = '5';
        currentSize = 5;

        select.addEventListener('change', function() {
            currentSize = toNumberSafe(this.value, 5);
            currentPage = 1;
            cargarDatos();
        });

        let timerBusqueda;
        if (search) {
            search.placeholder = 'Buscar por Load Nbr, Bodega, Tienda...';
            search.addEventListener('input', function() {
                clearTimeout(timerBusqueda);
                timerBusqueda = setTimeout(() => {
                    currentSearch = this.value.trim();
                    currentPage = 1;
                    cargarDatos();
                }, 400);
            });
        }

        document.querySelectorAll('[data-sort]').forEach(function(elemento) {
            elemento.style.cursor = 'pointer';
            elemento.addEventListener('click', function() {
                const campo = this.getAttribute('data-sort');
                if (currentSort === campo) {
                    currentDir = currentDir === 'asc' ? 'desc' : 'asc';
                } else {
                    currentSort = campo;
                    currentDir = 'desc';
                }
                document.querySelectorAll('.sort-icon').forEach(icon => {
                    icon.textContent = 'unfold_more';
                    icon.style.color = '';
                });
                const icon = this.querySelector('.sort-icon');
                if (icon) {
                    icon.textContent = currentDir === 'asc' ? 'arrow_upward' : 'arrow_downward';
                    icon.style.color = '#5500dd';
                }
                currentPage = 1;
                cargarDatos();
            });
        });

        const btnDescargar = document.querySelector('.icon-btn[title="Download"]');
        if (btnDescargar) {
            btnDescargar.addEventListener('click', async function(e) {
                e.preventDefault();
                const icono = this.querySelector('.material-icons');
                const iconoOriginal = icono ? icono.textContent : '';
                if (icono) icono.textContent = 'hourglass_empty';
                this.disabled = true;

                try {
                    let url = `/api/cargas/no-guiadas?page=1&page_size=10000&sort_by=${encodeURIComponent(currentSort)}&sort_dir=${encodeURIComponent(currentDir)}`;
                    if (currentSearch) url += `&q=${encodeURIComponent(currentSearch)}`;

                    const response = await fetch(url);
                    if (!response.ok) throw new Error(`Error HTTP: ${response.status}`);
                    const json = await response.json();

                    if (!json || !json.data || json.data.length === 0) {
                        alert('No hay datos para descargar');
                        return;
                    }

                    const filas = json.data;
                    const encabezados = ['#', 'Bodega', 'Carga', 'Tienda', 'Fecha Creación'];
                    const lineas = [encabezados.map(escapeCSV).join(',')];

                    filas.forEach((fila, idx) => {
                        const fecha = fila.FECHA_CREACION ? formatFechaLocal(fila.FECHA_CREACION) : '-';
                        const filaCsv = [idx + 1, fila.BODEGA || '', fila.CARGA || '', fila.TIENDA || '', fecha].map(escapeCSV);
                        lineas.push(filaCsv.join(','));
                    });

                    const csv = lineas.join('\n');
                    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
                    const a = document.createElement('a');
                    const url2 = URL.createObjectURL(blob);
                    const ahora = new Date();
                    const nombreArchivo = `cargas_no_guiadas_${ahora.getFullYear()}${String(ahora.getMonth() + 1).padStart(2, '0')}${String(ahora.getDate()).padStart(2, '0')}.csv`;
                    a.href = url2;
                    a.download = nombreArchivo;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url2);
                } catch (error) {
                    console.error('❌ Error al descargar:', error);
                    alert('Error al descargar: ' + error.message);
                } finally {
                    if (icono) icono.textContent = iconoOriginal;
                    this.disabled = false;
                }
            });
        }

        cargarDatos();

        window.recargarTabla = function() {
            currentPage = 1;
            currentSize = 5;
            select.value = '5';
            currentSort = 'create_date_time';
            currentDir = 'desc';
            cargarDatos();
        };

        console.log('Módulo inicializado');
    }

    const style = document.createElement('style');
    style.textContent = `
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    `;
    document.head.appendChild(style);

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();