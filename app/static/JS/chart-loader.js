// ============================================
// SCRIPT PARA CARGAR DATOS DINÁMICOS EN EL GRÁFICO DE BARRAS
// ============================================

// Cargar datos al iniciar la página
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 DOM Cargado, iniciando script del gráfico...');
    
    // Verificar que existe el elemento chartArea
    const chartArea = document.getElementById('chartArea');
    if (chartArea) {
        console.log('✅ Elemento chartArea encontrado:', chartArea);
        console.log('📐 Dimensiones del chartArea:', {
            width: chartArea.offsetWidth,
            height: chartArea.offsetHeight,
            display: window.getComputedStyle(chartArea).display,
            flex: window.getComputedStyle(chartArea).flex
        });
    } else {
        console.error('❌ Elemento chartArea NO encontrado!');
    }
    
    // Cargar datos del gráfico
    setTimeout(() => {
        loadRevenueChart();
    }, 500);
});

/**
 * Carga los datos de cargas por bodega y actualiza el gráfico
 */
async function loadRevenueChart() {
    console.log('🔄 Iniciando carga de datos del gráfico...');
    
    try {
        // Llamar al endpoint de Flask
        console.log('📡 Llamando a /api/cargas/por-bodega');
        const response = await fetch('/api/cargas/por-bodega');
        
        console.log('📥 Respuesta recibida:', response.status);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('📊 Datos recibidos:', result);

        if (result.ok && result.data && result.data.length > 0) {
            console.log(`✅ ${result.data.length} bodegas encontradas`);
            updateChartWithData(result.data);
            updateMetricsWithData(result.data);
        } else {
            console.warn('⚠️ No hay datos disponibles');
            showChartError('No hay datos disponibles');
        }
    } catch (error) {
        console.error('❌ Error al cargar datos del gráfico:', error);
        showChartError('Error al cargar datos: ' + error.message);
    }
}

/**
 * Actualiza el gráfico de barras con los datos recibidos
 */
function updateChartWithData(data) {
    const chartArea = document.getElementById('chartArea');
    
    if (!chartArea) {
        console.error('❌ No se encontró el elemento chartArea');
        return;
    }

    console.log('📊 Actualizando gráfico con datos:', data);

    // Calcular el valor máximo para escalar las barras
    const maxValue = Math.max(...data.map(d => d.cantidad));
    const yMax = Math.ceil(maxValue * 1.2); // 120% del máximo para dar espacio
    
    console.log(`📏 Valor máximo: ${maxValue}, Escala Y: ${yMax}`);
    
    // Actualizar eje Y
    updateYAxis(yMax);
    
    // Limpiar el área del gráfico
    chartArea.innerHTML = '';
    
    // NO modificar el estilo del chartArea aquí - respetar el CSS existente
    
    // Crear barras para cada bodega
    data.forEach((item, index) => {
        console.log(`🔨 Creando barra ${index + 1}: Bodega ${item.bodega} = ${item.cantidad} cargas`);
        const barGroup = createBarGroup(item, yMax);
        chartArea.appendChild(barGroup);
    });
    
    console.log('✅ Gráfico renderizado completamente');
}

/**
 * Actualiza el eje Y con los valores calculados
 */
function updateYAxis(maxValue) {
    const yAxis = document.querySelector('.chart-y-axis');
    
    if (!yAxis) return;
    
    const steps = 3; // 4 valores en el eje Y (incluyendo 0)
    yAxis.innerHTML = '';
    
    for (let i = 0; i <= steps; i++) {
        const value = Math.round(maxValue * (steps - i) / steps);
        const div = document.createElement('div');
        div.textContent = value.toLocaleString();
        yAxis.appendChild(div);
    }
}

/**
 * Crea un grupo de barras (barra + etiqueta) - Estilo mejorado
 */
function createBarGroup(item, maxValue) {
    const barGroup = document.createElement('div');
    barGroup.style.cssText = `
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
        min-width: 70px;
        max-width: 120px;
    `;
    
    // Contenedor de las barras
    const barsContainer = document.createElement('div');
    barsContainer.style.cssText = `
        width: 100%;
        display: flex;
        gap: 4px;
        align-items: flex-end;
        height: 280px;
        justify-content: center;
        padding: 0 8px;
    `;
    
    // Barra "Año Anterior" (80% del valor actual - color claro)
    const previousBar = createBar(item.cantidad * 0.8, maxValue, '#b39ddb');
    
    // Barra "Año Actual" (valor real - color oscuro)
    const currentBar = createBar(item.cantidad, maxValue, '#5500dd');
    
    barsContainer.appendChild(previousBar);
    barsContainer.appendChild(currentBar);
    
    // Etiqueta con nombre de bodega
    const label = document.createElement('div');
    label.textContent = `Bod. ${item.bodega}`;
    label.style.cssText = `
        font-size: 13px;
        color: #666;
        margin-top: 8px;
        font-weight: 500;
        text-align: center;
    `;
    
    barGroup.appendChild(barsContainer);
    barGroup.appendChild(label);
    
    return barGroup;
}

/**
 * Crea una barra individual con animación - Estilo visual mejorado
 */
function createBar(value, maxValue, color) {
    const bar = document.createElement('div');
    const heightPercent = Math.max((value / maxValue) * 100, 2);
    
    console.log(`📊 Barra: valor=${value}, altura=${heightPercent}%, color=${color}`);
    
    bar.style.cssText = `
        flex: 1;
        max-width: 40px;
        background: ${color};
        border-radius: 4px 4px 0 0;
        transition: all 0.3s ease;
        cursor: pointer;
        position: relative;
        height: 0;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    `;
    
    // Tooltip con el valor
    const tooltip = document.createElement('div');
    tooltip.textContent = Math.round(value);
    tooltip.style.cssText = `
        position: absolute;
        top: -30px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 11px;
        font-weight: 600;
        white-space: nowrap;
        opacity: 0;
        transition: opacity 0.3s ease;
        pointer-events: none;
        z-index: 10;
    `;
    
    bar.appendChild(tooltip);
    
    // Animación de crecimiento
    setTimeout(() => {
        bar.style.height = `${heightPercent}%`;
    }, 150);
    
    // Interactividad hover
    bar.addEventListener('mouseenter', () => {
        tooltip.style.opacity = '1';
        bar.style.transform = 'translateY(-4px)';
        bar.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';
        bar.style.opacity = '0.85';
    });
    
    bar.addEventListener('mouseleave', () => {
        tooltip.style.opacity = '0';
        bar.style.transform = 'translateY(0)';
        bar.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
        bar.style.opacity = '1';
    });
    
    return bar;
}

/**
 * Actualiza las métricas del dashboard
 */
function updateMetricsWithData(data) {
    const totalCargas = data.reduce((sum, item) => sum + item.cantidad, 0);
    const avgCargas = Math.round(totalCargas / data.length);
    const bodegaTop = data.reduce((max, item) => 
        item.cantidad > max.cantidad ? item : max, data[0]
    );
    
    // Calcular porcentaje de la bodega top vs total
    const percentage = Math.round((bodegaTop.cantidad / totalCargas) * 100);
    
    // Actualizar métricas
    const metrics = document.querySelectorAll('.metric-value');
    const metricLabels = document.querySelectorAll('.metric-label');
    
    // Métrica 1: Total Cargas (simula "Actual Revenue")
    if (metrics[0]) {
        // Formato con coma de miles
        metrics[0].textContent = totalCargas.toLocaleString('en-US');
    }
    if (metricLabels[0]) {
        metricLabels[0].textContent = 'Total Cargas';
    }
    
    // Métrica 2: Promedio por Bodega (simula "Revenue Target")
    if (metrics[1]) {
        metrics[1].textContent = avgCargas.toLocaleString('en-US');
    }
    if (metricLabels[1]) {
        metricLabels[1].textContent = 'Promedio por Bodega';
    }
    
    // Métrica 3: Bodega Top con porcentaje (simula "Goal")
    if (metrics[2]) {
        metrics[2].textContent = `${percentage}%`;
        metrics[2].classList.add('success');
    }
    if (metricLabels[2]) {
        metricLabels[2].textContent = `Bodega ${bodegaTop.bodega} (${bodegaTop.cantidad} cargas)`;
    }
    
    console.log(`📈 Métricas actualizadas: Total=${totalCargas}, Promedio=${avgCargas}, Top=Bod.${bodegaTop.bodega} (${percentage}%)`);
}

/**
 * Muestra un mensaje de error en el gráfico
 */
function showChartError(message) {
    const chartArea = document.getElementById('chartArea');
    if (chartArea) {
        chartArea.innerHTML = `
            <div style="
                width: 100%;
                height: 100%;
                display: flex;
                align-items: center;
                justify-content: center;
                color: #6b7280;
                font-size: 14px;
            ">
                <span class="material-icons" style="margin-right: 8px;">error_outline</span>
                ${message}
            </div>
        `;
    }
}

/**
 * Función para actualizar los títulos de la card
 */
function updateChartTitles() {
    const cardTitle = document.querySelector('.card-title');
    const cardSubtitle = document.querySelector('.card-subtitle');
    
    if (cardTitle) {
        cardTitle.textContent = 'Cargas No Guiadas por Bodega';
    }
    
    if (cardSubtitle) {
        cardSubtitle.textContent = 'Distribución de cargas sin guiar';
    }
}

// Actualizar títulos al cargar
document.addEventListener('DOMContentLoaded', updateChartTitles);

// Función opcional para refrescar los datos
function refreshChart() {
    loadRevenueChart();
}

// Agregar evento al botón de download si existe
document.addEventListener('DOMContentLoaded', function() {
    const downloadBtn = document.querySelector('.card-actions .icon-btn[title="Download"]');
    if (downloadBtn) {
        downloadBtn.addEventListener('click', async function() {
            try {
                const response = await fetch('/api/cargas/por-bodega');
                const result = await response.json();
                
                if (result.ok && result.data) {
                    downloadCSV(result.data);
                }
            } catch (error) {
                console.error('Error al descargar:', error);
            }
        });
    }
});

/**
 * Descarga los datos en formato CSV
 */
function downloadCSV(data) {
    const headers = ['Bodega', 'Cantidad de Cargas'];
    const rows = data.map(item => [item.bodega, item.cantidad]);
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `cargas_por_bodega_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}