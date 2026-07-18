from flask import Flask, render_template, request, jsonify
import pyodbc
import os
from dotenv import load_dotenv

# Cargar variables desde .env en la raiz
dotenv_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env')
if os.path.exists(dotenv_path):
    load_dotenv(dotenv_path)
else:
    load_dotenv()

app = Flask(__name__)

# ---- Conexión SQL Server ----
SERVER   = os.getenv('SQLSERVER_HOST')
DATABASE = os.getenv('SQLSERVER_DB')
USERNAME = os.getenv('SQLSERVER_USER')
PASSWORD = os.getenv('SQLSERVER_PWD')

CONN_STR = (
    f"DRIVER={{ODBC Driver 17 for SQL Server}};"
    f"SERVER={SERVER};DATABASE={DATABASE};UID={USERNAME};PWD={PASSWORD};"
    "TrustServerCertificate=Yes;"
)

def get_conn():
    return pyodbc.connect(CONN_STR)

# Página principal
@app.get('/')
def home():
    return render_template('index.html')

@app.get('/reprocesos')
def reprocesos():
    return render_template('reproceso.html')

@app.get('/zonificacion')
def zonificacion_page():
    return render_template('zonificacion.html')

# API JSON: /api/cargas/no-guiadas
@app.get('/api/cargas/no-guiadas')
def api_cargas_no_guiadas():
    bodega   = request.args.get('bodega', type=int)
    desde    = request.args.get('desde', type=str)
    hasta    = request.args.get('hasta', type=str)
    q        = request.args.get('q', type=str, default='').strip()
    sort_by  = (request.args.get('sort_by') or 'create_date_time').lower()
    sort_dir = (request.args.get('sort_dir') or 'desc').lower()
    page     = max(1, request.args.get('page', default=1, type=int))
    page_sz  = request.args.get('page_size', default=50, type=int)
    page_sz  = min(max(page_sz, 5), 200)

    allowed_sort = {'create_date_time': 'create_date_time', 'load_nbr': 'load_nbr', 'bodega': 'bodega'}
    sort_col = allowed_sort.get(sort_by, 'create_date_time')
    sort_dir = 'ASC' if sort_dir == 'asc' else 'DESC'

    where_sql = "WHERE (LOWER(error) LIKE '%idx_c1g0e0r0s0m%')"
    params = []

    if bodega is not None:
        where_sql += " AND bodega = ?"
        params.append(bodega)
    if desde:
        where_sql += " AND create_date_time >= ?"
        params.append(desde)
    if hasta:
        where_sql += " AND create_date_time < DATEADD(DAY, 1, ?)"
        params.append(hasta)
    if q:
        like_val = f"%{q}%"
        where_sql += " AND (CAST(load_nbr AS NVARCHAR(50)) LIKE ? OR error LIKE ?)"
        params.extend([like_val, like_val])

    sql_count = f"SELECT COUNT(1) FROM dbo.CARGA_ENVIADA {where_sql}"

    offset = (page - 1) * page_sz
    sql_data = f"""
        SELECT
            bodega           AS BODEGA,
            load_nbr         AS CARGA,
            bodega_destino   AS TIENDA,
            tienda           AS COD_TIENDA,
            bodega_destino   AS DESTINO,
            bodega_destino   AS CLIENTE,
            create_date_time AS FECHA_CREACION,
            mod_date_time    AS FECHA_MODIFICACION
        FROM dbo.CARGA_ENVIADA
        {where_sql}
        ORDER BY {sort_col} {sort_dir}
        OFFSET ? ROWS FETCH NEXT ? ROWS ONLY;
    """

    try:
        with get_conn() as conn:
            cur = conn.cursor()

            cur.execute(sql_count, params)
            total = cur.fetchone()[0]

            cur.execute(sql_data, params + [offset, page_sz])
            cols = [c[0] for c in cur.description]
            data = [dict(zip(cols, row)) for row in cur.fetchall()]

            for r in data:
                if r.get("FECHA_CREACION") is not None:
                    r["FECHA_CREACION"] = str(r["FECHA_CREACION"])
                if r.get("FECHA_MODIFICACION") is not None:
                    r["FECHA_MODIFICACION"] = str(r["FECHA_MODIFICACION"])

        total_pages = (total + page_sz - 1) // page_sz if total else 0

        return jsonify({
            "ok": True,
            "filters": {"bodega": bodega, "desde": desde, "hasta": hasta, "q": q},
            "sort": {"by": sort_col, "dir": sort_dir},
            "page": page,
            "page_size": page_sz,
            "total": total,
            "total_pages": total_pages,
            "data": data
        })
    except Exception as e:
        print("API ERROR:", e)
        return jsonify({"ok": False, "error": str(e)}), 500

# *** NUEVO ENDPOINT: Cargas por bodega para el gráfico ***
@app.get('/api/cargas/por-bodega')
def api_cargas_por_bodega():
    """
    Retorna la cantidad de cargas no guiadas agrupadas por bodega.
    Parámetros opcionales:
      desde: YYYY-MM-DD
      hasta: YYYY-MM-DD
    """
    print("Endpoint /api/cargas/por-bodega llamado")  # Debug log
    
    desde = request.args.get('desde', type=str)
    hasta = request.args.get('hasta', type=str)

    where_sql = "WHERE (LOWER(error) LIKE '%idx_c1g0e0r0s0m%')"
    params = []

    if desde:
        where_sql += " AND create_date_time >= ?"
        params.append(desde)
        print(f"  Filtro desde: {desde}")
    if hasta:
        where_sql += " AND create_date_time < DATEADD(DAY, 1, ?)"
        params.append(hasta)
        print(f"   Filtro hasta: {hasta}")

    sql_query = f"""
        SELECT 
            bodega AS bodega,
            COUNT(*) AS cantidad
        FROM dbo.CARGA_ENVIADA
        {where_sql}
        GROUP BY bodega
        ORDER BY bodega ASC;
    """

    try:
        with get_conn() as conn:
            cur = conn.cursor()
            cur.execute(sql_query, params)
            
            data = []
            for row in cur.fetchall():
                data.append({
                    "bodega": row[0],
                    "cantidad": row[1]
                })

        print(f"   Datos obtenidos: {len(data)} bodegas")
        for item in data[:3]:  # Mostrar primeros 3
            print(f"     - Bodega {item['bodega']}: {item['cantidad']} cargas")
        
        return jsonify({
            "ok": True,
            "filters": {"desde": desde, "hasta": hasta},
            "data": data
        })
    except Exception as e:
        print(f" API ERROR: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"ok": False, "error": str(e)}), 500

# Health check
@app.get('/health/db')
def health_db():
    try:
        with get_conn() as cn:
            cn.cursor().execute("SELECT 1;").fetchone()
        return {"ok": True, "db": "up"}, 200
    except Exception as e:
        return {"ok": False, "db": "down", "error": str(e)}, 500


    
    
@app.get('/sin_replica')
def sin_replica():
    return render_template('sin_replica.html')

@app.before_request
def listar_endpoints():
    print(app.view_functions.keys())

print("ENDPOINTS REGISTRADOS:")
for e in app.view_functions:
    print(" -", e)
    
    # *** ENDPOINT: Cargas Sin Réplica (Caso 4) - Para tabla ***
@app.get('/api/cargas/sin-replica')
def api_cargas_sin_replica():
    """
    Retorna cargas con error IDX_C1G1E1R0S0M (Caso 4)
    """
    bodega   = request.args.get('bodega', type=int)
    desde    = request.args.get('desde', type=str)
    hasta    = request.args.get('hasta', type=str)
    q        = request.args.get('q', type=str, default='').strip()
    sort_by  = (request.args.get('sort_by') or 'mod_date_time').lower()
    sort_dir = (request.args.get('sort_dir') or 'desc').lower()
    page     = max(1, request.args.get('page', default=1, type=int))
    page_sz  = request.args.get('page_size', default=50, type=int)
    page_sz  = min(max(page_sz, 5), 200)

    allowed_sort = {
        'mod_date_time': 'mod_date_time',
        'load_nbr': 'load_nbr',
        'bodega': 'bodega',
        'tienda': 'tienda'
    }
    sort_col = allowed_sort.get(sort_by, 'mod_date_time')
    sort_dir = 'ASC' if sort_dir == 'asc' else 'DESC'

    where_sql = "WHERE (LOWER(error) LIKE '%idx_c1g1e1r0s0m%')"
    params = []

    if bodega is not None:
        where_sql += " AND bodega = ?"
        params.append(bodega)
    if desde:
        where_sql += " AND mod_date_time >= ?"
        params.append(desde)
    if hasta:
        where_sql += " AND mod_date_time < DATEADD(DAY, 1, ?)"
        params.append(hasta)
    if q:
        like_val = f"%{q}%"
        where_sql += """ AND (
            CAST(load_nbr AS NVARCHAR(50)) LIKE ? 
            OR CAST(tienda AS NVARCHAR(50)) LIKE ?
            OR error LIKE ?
        )"""
        params.extend([like_val, like_val, like_val])

    sql_count = f"SELECT COUNT(1) FROM dbo.CARGA_ENVIADA {where_sql}"

    offset = (page - 1) * page_sz
    sql_data = f"""
        SELECT
            bodega           AS BODEGA,
            load_nbr         AS CARGA,
            tienda           AS TIENDA,
            tipo_pedido      AS TIPO_PEDIDO,
            bodega_destino   AS BODEGA_DESTINO,
            mod_date_time    AS FECHA_MODIFICACION,
            error            AS ERROR
        FROM dbo.CARGA_ENVIADA
        {where_sql}
        ORDER BY {sort_col} {sort_dir}
        OFFSET ? ROWS FETCH NEXT ? ROWS ONLY;
    """

    try:
        with get_conn() as conn:
            cur = conn.cursor()

            cur.execute(sql_count, params)
            total = cur.fetchone()[0]

            cur.execute(sql_data, params + [offset, page_sz])
            cols = [c[0] for c in cur.description]
            data = [dict(zip(cols, row)) for row in cur.fetchall()]

            for r in data:
                if r.get("FECHA_MODIFICACION") is not None:
                    r["FECHA_MODIFICACION"] = str(r["FECHA_MODIFICACION"])

        total_pages = (total + page_sz - 1) // page_sz if total else 0

        return jsonify({
            "ok": True,
            "filters": {"bodega": bodega, "desde": desde, "hasta": hasta, "q": q},
            "sort": {"by": sort_col, "dir": sort_dir},
            "page": page,
            "page_size": page_sz,
            "total": total,
            "total_pages": total_pages,
            "data": data
        })
    except Exception as e:
        print("API ERROR (sin-replica):", e)
        import traceback
        traceback.print_exc()
        return jsonify({"ok": False, "error": str(e)}), 500


# *** ENDPOINT: Cargas Sin Réplica por Bodega - Para gráfico ***
@app.get('/api/cargas/sin-replica-por-bodega')
def api_cargas_sin_replica_por_bodega():
    """
    Retorna cantidad de cargas sin réplica agrupadas por bodega (para gráfico)
    """
    print("Endpoint /api/cargas/sin-replica-por-bodega llamado")
    
    desde = request.args.get('desde', type=str)
    hasta = request.args.get('hasta', type=str)

    where_sql = "WHERE (LOWER(error) LIKE '%idx_c1g1e1r0s0m%')"
    params = []

    if desde:
        where_sql += " AND mod_date_time >= ?"
        params.append(desde)
        print(f"  Filtro desde: {desde}")
    if hasta:
        where_sql += " AND mod_date_time < DATEADD(DAY, 1, ?)"
        params.append(hasta)
        print(f"  Filtro hasta: {hasta}")

    sql_query = f"""
        SELECT 
            bodega AS bodega,
            COUNT(*) AS cantidad
        FROM dbo.CARGA_ENVIADA
        {where_sql}
        GROUP BY bodega
        ORDER BY bodega ASC;
    """

    try:
        with get_conn() as conn:
            cur = conn.cursor()
            cur.execute(sql_query, params)
            
            data = []
            for row in cur.fetchall():
                data.append({
                    "bodega": row[0],
                    "cantidad": row[1]
                })

        print(f"  Datos obtenidos: {len(data)} bodegas")
        for item in data[:3]:
            print(f"    - Bodega {item['bodega']}: {item['cantidad']} cargas sin réplica")

        return jsonify({
            "ok": True,
            "filters": {"desde": desde, "hasta": hasta},
            "data": data
        })
    except Exception as e:
        print(f"API ERROR (sin-replica-por-bodega): {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"ok": False, "error": str(e)}), 500

# *** API: Estadísticas de Segmentación ***
@app.get('/api/segmentos/estadisticas')
def api_segmentos_estadisticas():
    """
    Retorna datos de segmentación para el dashboard de Zonificación/Segmentos:
    - Top Tiendas Destino
    - Distribución por Tipo de Pedido (PED, PEC, POS)
    - Distribución por Tipo de Envío (Omnicanal vs Tradicional)
    """
    sql_tiendas = """
        SELECT TOP 5 bodega_destino AS tienda, COUNT(*) AS cantidad
        FROM dbo.CARGA_ENVIADA
        WHERE bodega_destino IS NOT NULL AND bodega_destino != ''
        GROUP BY bodega_destino
        ORDER BY cantidad DESC;
    """
    
    sql_pedidos = """
        SELECT tipo_pedido AS tipo, COUNT(*) AS cantidad
        FROM dbo.CARGA_ENVIADA
        WHERE tipo_pedido IN ('PED', 'PEC', 'POS')
        GROUP BY tipo_pedido
        ORDER BY cantidad DESC;
    """
    
    sql_envios = """
        SELECT tipo_envio AS tipo, COUNT(*) AS cantidad
        FROM dbo.CARGA_ENVIADA
        WHERE tipo_envio IN ('001', '002')
        GROUP BY tipo_envio
        ORDER BY cantidad DESC;
    """

    try:
        with get_conn() as conn:
            cur = conn.cursor()
            
            # 1. Top Tiendas
            cur.execute(sql_tiendas)
            tiendas = [{"tienda": row[0], "cantidad": row[1]} for row in cur.fetchall()]
            
            # 2. Tipo Pedido
            cur.execute(sql_pedidos)
            pedidos = [{"tipo": row[0], "cantidad": row[1]} for row in cur.fetchall()]
            
            # 3. Tipo Envio
            cur.execute(sql_envios)
            envios = [{"tipo": row[0], "cantidad": row[1]} for row in cur.fetchall()]
            
        return jsonify({
            "ok": True,
            "tiendas": tiendas,
            "pedidos": pedidos,
            "envios": envios
        })
    except Exception as e:
        print("API ERROR (segmentos):", e)
        return jsonify({"ok": False, "error": str(e)}), 500

# *** ENDPOINTS: Reprocesamiento de Cargas ***
@app.get('/api/reprocesos/listado')
def api_reprocesos_listado():
    """
    Retorna el listado de cargas que tienen errores para ser reprocesadas
    """
    bodega   = request.args.get('bodega', type=int)
    q        = request.args.get('q', type=str, default='').strip()
    sort_by  = (request.args.get('sort_by') or 'mod_date_time').lower()
    sort_dir = (request.args.get('sort_dir') or 'desc').lower()
    page     = max(1, request.args.get('page', default=1, type=int))
    page_sz  = request.args.get('page_size', default=50, type=int)
    page_sz  = min(max(page_sz, 5), 200)

    allowed_sort = {
        'mod_date_time': 'mod_date_time',
        'load_nbr': 'load_nbr',
        'bodega': 'bodega'
    }
    sort_col = allowed_sort.get(sort_by, 'mod_date_time')
    sort_dir = 'ASC' if sort_dir == 'asc' else 'DESC'

    where_sql = "WHERE error IS NOT NULL AND error != ''"
    params = []

    if bodega is not None:
        where_sql += " AND bodega = ?"
        params.append(bodega)
    if q:
        like_val = f"%{q}%"
        where_sql += " AND (CAST(load_nbr AS NVARCHAR(50)) LIKE ? OR error LIKE ?)"
        params.extend([like_val, like_val])

    sql_count = f"SELECT COUNT(1) FROM dbo.CARGA_ENVIADA {where_sql}"

    offset = (page - 1) * page_sz
    sql_data = f"""
        SELECT
            bodega           AS BODEGA,
            load_nbr         AS CARGA,
            bodega_destino   AS BODEGA_DESTINO,
            mod_date_time    AS FECHA_MODIFICACION,
            error            AS ERROR
        FROM dbo.CARGA_ENVIADA
        {where_sql}
        ORDER BY {sort_col} {sort_dir}
        OFFSET ? ROWS FETCH NEXT ? ROWS ONLY;
    """

    try:
        with get_conn() as conn:
            cur = conn.cursor()

            cur.execute(sql_count, params)
            total = cur.fetchone()[0]

            cur.execute(sql_data, params + [offset, page_sz])
            cols = [c[0] for c in cur.description]
            data = [dict(zip(cols, row)) for row in cur.fetchall()]

            for r in data:
                if r.get("FECHA_MODIFICACION") is not None:
                    r["FECHA_MODIFICACION"] = str(r["FECHA_MODIFICACION"])

        total_pages = (total + page_sz - 1) // page_sz if total else 0

        return jsonify({
            "ok": True,
            "filters": {"bodega": bodega, "q": q},
            "sort": {"by": sort_col, "dir": sort_dir},
            "page": page,
            "page_size": page_sz,
            "total": total,
            "total_pages": total_pages,
            "data": data
        })
    except Exception as e:
        print("API ERROR (reprocesos):", e)
        return jsonify({"ok": False, "error": str(e)}), 500


@app.post('/api/reprocesos/ejecutar')
def api_reprocesos_ejecutar():
    """
    Ejecuta el reproceso de una lista de cargas reseteando sus flags y limpiando el error
    """
    data = request.json or {}
    cargas = data.get('cargas', [])
    if not cargas:
        return jsonify({"ok": False, "error": "No se proporcionaron cargas para reprocesar"}), 400

    try:
        cargas_seguras = [str(int(c)) for c in cargas]
    except ValueError:
        return jsonify({"ok": False, "error": "Formato de número de carga inválido"}), 400

    try:
        rows_affected = 0
        with get_conn() as conn:
            cur = conn.cursor()
            for i in range(0, len(cargas_seguras), 200):
                chunk = cargas_seguras[i:i+200]
                placeholders = ",".join("?" for _ in chunk)
                query = f"""
                    UPDATE dbo.CARGA_ENVIADA
                    SET guiada_ok = '0',
                        replica_ok = '0',
                        evento_ok = '0',
                        carga_enviada_ok = '0',
                        error = NULL
                    WHERE load_nbr IN ({placeholders});
                """
                cur.execute(query, chunk)
                rows_affected += cur.rowcount
            conn.commit()

        return jsonify({
            "ok": True,
            "message": f"Se programaron {rows_affected} cargas para reprocesar exitosamente."
        })
    except Exception as e:
        print("API ERROR (ejecutar reproceso):", e)
        return jsonify({"ok": False, "error": str(e)}), 500
    
if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)