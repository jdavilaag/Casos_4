// ============================================
// REPORTE DE CARGAS CON ERROR - CODIGO DE CLIENTE
// ============================================

(function() {
    'use strict';

    console.log('📝 Iniciando reporte de Cargas con Error...');

    // Estado global de paginación y ordenamiento
    let currentPage = 1;
    let currentSize = 10;
    let currentSort = 'mod_date_time';
    let currentDir = 'desc';
    let currentSearch = '';
    let totalPages = 0;
    let totalRecords = 0;

    // ============================================
    // CONSTRUIR FILA
    // ============================================
    function construirFila(fila, numero) {
        const tr = document.createElement('tr');
        const isEven = numero % 2 === 0;
        
        tr.style.background = isEven ? '#ffffff' : '#fafafa';
        tr.style.borderBottom = '1px solid #f0f0f0';
        tr.style.transition = 'all 0.2s';
        
        tr.onmouseover = function() { this.style.background = '#ffebee'; }; // Soft red background on hover
        tr.onmouseout = function() { this.style.background = isEven ? '#ffffff' : '#fafafa'; };

        // Columna Bodega
        const tdBod = document.createElement('td');
        tdBod.style.padding = '14px 16px';
        tdBod.style.borderRight = '1px solid #f0f0f0';
        tdBod.innerHTML = `
            <div style="display:flex;align-items:center;justify-content:flex-start;">
                <div style="width:32px;
                            height:32px;
                            background:linear-gradient(135deg,#c62828,#e53935);
                            border-radius:6px;
                            display:flex;
                            align-items:center;
                            justify-content:center;
                            color:white;
                            font-weight:600;
                            font-size:13px;
                            box-shadow:0 2px 4px rgba(198,40,40,0.25);">
                    ${fila.BODEGA || '-'}
                </div>
            </div>
        `;
        tr.appendChild(tdBod);

        // Columna Carga
        const tdCar = document.createElement('td');
        tdCar.style.padding = '14px 16px';
        tdCar.style.borderRight = '1px solid #f0f0f0';
        tdCar.innerHTML = `
            <span style="font-weight:700; color:#c62828; font-size:13px;">
                ${fila.CARGA || '-'}
            </span>
        `;
        tr.appendChild(tdCar);

        // Columna Bodega Destino
        const tdDest = document.createElement('td');
        tdDest.style.padding = '14px 16px';
        tdDest.style.borderRight = '1px solid #f0f0f0';
        tdDest.innerHTML = `
            <div style="display:flex;align-items:center;gap:8px;">
                <span class="material-icons" style="font-size:18px;color:#999;">storefront</span>
                <span style="color:#666;font-size:13px;">${fila.BODEGA_DESTINO || 'Sin asignar'}</span>
            </div>
        `;
        tr.appendChild(tdDest);

        // Columna Fecha Registro Error
        const tdFec = document.createElement('td');
        tdFec.style.padding = '14px 16px';
        tdFec.style.borderRight = '1px solid #f0f0f0';
        
        let fechaFormatted = '-';
        if (fila.FECHA_MODIFICACION) {
            try {
                const d = new Date(fila.FECHA_MODIFICACION);
                if (!isNaN(d.getTime())) {
                    fechaFormatted = d.toLocaleString('es-CL', {
                        year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
                    });
                }
            } catch {
                fechaFormatted = fila.FECHA_MODIFICACION;
            }
        }
        
        tdFec.innerHTML = `
            <div style="display:flex;align-items:center;gap:8px;">
                <span class="material-icons" style="font-size:18px;color:#999;">schedule</span>
                <span style="color:#666;font-size:13px;">${fechaFormatted}</span>
            </div>
        `;
        tr.appendChild(tdFec);

        // Columna Detalle Error
        const tdErr = document.createElement('td');
        tdErr.style.padding = '14px 16px';
        tdErr.style.maxWidth = '350px';
        tdErr.style.overflow = 'hidden';
        tdErr.style.textOverflow = 'ellipsis';
        tdErr.style.whiteSpace = 'nowrap';
        tdErr.style.fontWeight = '500';
        tdErr.style.color = '#c62828';
        tdErr.title = fila.ERROR || '';
        tdErr.textContent = fila.ERROR || '-';
        tr.appendChild(tdErr);

        return tr;
    }

    function pintarSkeleton(tbody, texto = '⏳ Cargando registros de errores...') {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align:center;padding:40px;">
                    <div style="display:flex;flex-direction:column;align-items:center;gap:16px;">
                        <div style="width:48px;
                                    height:48px;
                                    border:4px solid #c62828;
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
    // CARGAR DATOS
    // ============================================
    async function cargarCargas() {
        const tbody = document.getElementById('reprocesoTableBody');
        const totalErroresLabel = document.getElementById('statsTotalErrores');
        if (!tbody) return;

        pintarSkeleton(tbody);

        try {
            let url = `/api/reprocesos/listado?page=${currentPage}&page_size=${currentSize}&sort_by=${currentSort}&sort_dir=${currentDir}`;
            if (currentSearch) {
                url += `&q=${encodeURIComponent(currentSearch)}`;
            }

            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const result = await response.json();

            if (!result.ok) throw new Error(result.error || 'Respuesta fallida');

            const data = result.data || [];

            if (data.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="5" style="text-align:center;padding:60px;">
                            <span class="material-icons" style="font-size:64px;opacity:0.3;">inbox</span>
                            <p style="margin-top:16px;font-size:14px;color:#999;">No se encontraron registros de error</p>
                        </td>
                    </tr>
                `;
                if (totalErroresLabel) totalErroresLabel.textContent = '0';
                updatePaginationInfo(0, 0, 0);
                updatePagination(0);
                return;
            }

            totalRecords = result.total || 0;
            totalPages = result.total_pages || 1;

            if (totalErroresLabel) totalErroresLabel.textContent = totalRecords.toLocaleString();

            tbody.innerHTML = '';
            const startNum = (currentPage - 1) * currentSize;

            data.forEach((fila, idx) => {
                const tr = construirFila(fila, startNum + idx + 1);
                tbody.appendChild(tr);
            });

            const desde = startNum + 1;
            const hasta = Math.min(startNum + data.length, totalRecords);
            updatePaginationInfo(desde, hasta, totalRecords);
            updatePagination(totalPages);

        } catch (error) {
            console.error('❌ Error al cargar listado de errores:', error);
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align:center;padding:40px;color:#f44336;">
                        <span class="material-icons" style="font-size:48px;">error_outline</span>
                        <p style="margin-top:12px;">Error al obtener datos: ${error.message}</p>
                    </td>
                </tr>
            `;
        }
    }

    function updatePaginationInfo(desde, hasta, total) {
        const info = document.getElementById('reprocesoShowingInfo');
        if (!info) return;
        if (total === 0) {
            info.innerHTML = `
                <span class="material-icons" style="font-size:18px;color:#999;">info</span>
                Mostrando 0 a 0 de 0 registros
            `;
        } else {
            info.innerHTML = `
                <span class="material-icons" style="font-size:18px;color:#999;">info</span>
                Mostrando <strong style="color:#c62828;margin:0 2px;">${desde}</strong> a <strong style="color:#c62828;margin:0 2px;">${hasta}</strong> de <strong style="color:#c62828;margin:0 2px;">${total}</strong> registros
            `;
        }
    }

    // ============================================
    // CONTROLES DE PAGINACION
    // ============================================
    function updatePagination(totalPgs) {
        const pag = document.getElementById('reprocesoPagination');
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
            btnPrev.onclick = () => { currentPage--; cargarCargas(); };
        }
        pag.appendChild(btnPrev);

        // Botones numerados
        const maxBotones = 5;
        let start = Math.max(1, currentPage - Math.floor(maxBotones / 2));
        let end = Math.min(totalPgs, start + maxBotones - 1);
        if (end - start < maxBotones - 1) start = Math.max(1, end - maxBotones + 1);

        for (let i = start; i <= end; i++) {
            const btn = document.createElement('button');
            btn.textContent = i;
            if (i === currentPage) {
                btn.style.cssText = btnStyle + 'background:linear-gradient(135deg,#c62828,#b71c1c);color:white;border-color:#c62828;box-shadow:0 4px 8px rgba(198,40,40,0.3);';
            } else {
                btn.style.cssText = btnStyle;
                btn.onclick = () => { currentPage = i; cargarCargas(); };
            }
            pag.appendChild(btn);
        }

        // Botón Siguiente
        const btnNext = document.createElement('button');
        btnNext.innerHTML = 'Siguiente<span class="material-icons" style="font-size:16px;">chevron_right</span>';
        btnNext.disabled = currentPage === totalPgs;
        btnNext.style.cssText = btnStyle + (currentPage === totalPgs ? 'opacity:0.5;cursor:not-allowed;' : '');
        if (currentPage < totalPgs) {
            btnNext.onclick = () => { currentPage++; cargarCargas(); };
        }
        pag.appendChild(btnNext);
    }

    // ============================================
    // FILTROS Y ORDENAMIENTO
    // ============================================
    window.ordenarReprocesos = function(campo) {
        if (currentSort === campo) {
            currentDir = currentDir === 'asc' ? 'desc' : 'asc';
        } else {
            currentSort = campo;
            currentDir = 'desc';
        }

        // Resetear iconos
        document.querySelectorAll('[id^="sort-reproceso-"]').forEach(span => {
            span.textContent = 'unfold_more';
            span.style.color = '';
        });

        const icon = document.getElementById(`sort-reproceso-${campo}`);
        if (icon) {
            icon.textContent = currentDir === 'asc' ? 'arrow_upward' : 'arrow_downward';
            icon.style.color = '#c62828';
        }

        currentPage = 1;
        cargarCargas();
    };

    window.recargarTablaReprocesos = function() {
        currentPage = 1;
        cargarCargas();
    };

    // ============================================
    // INICIALIZAR
    // ============================================
    function init() {
        const searchInput = document.getElementById('reprocesoSearch');
        const entriesSelect = document.getElementById('reprocesoEntriesPerPage');

        if (searchInput) {
            let searchTimeout;
            searchInput.addEventListener('input', function(e) {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    currentSearch = e.target.value.trim();
                    currentPage = 1;
                    cargarCargas();
                }, 400);
            });
        }

        if (entriesSelect) {
            entriesSelect.value = String(currentSize);
            entriesSelect.addEventListener('change', function(e) {
                currentSize = parseInt(e.target.value);
                currentPage = 1;
                cargarCargas();
            });
        }

        cargarCargas();
    }

    // Auto-inicializar
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
