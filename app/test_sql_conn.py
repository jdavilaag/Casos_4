
# test_sql_conn.py
import pyodbc
import os
from dotenv import load_dotenv

# Cargar variables desde .env en la raiz
dotenv_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env')
if os.path.exists(dotenv_path):
    load_dotenv(dotenv_path)
else:
    load_dotenv()

SERVER   = os.getenv('SQLSERVER_HOST')
DATABASE = os.getenv('SQLSERVER_DB')
USERNAME = os.getenv('SQLSERVER_USER')
PASSWORD = os.getenv('SQLSERVER_PWD')

CONN_STR = (
    "DRIVER={ODBC Driver 17 for SQL Server};"
    f"SERVER={SERVER};DATABASE={DATABASE};UID={USERNAME};PWD={PASSWORD};"
    "TrustServerCertificate=Yes;"
)

try:
    print("Conectando...")
    with pyodbc.connect(CONN_STR, timeout=5) as cn:
        with cn.cursor() as cur:
            cur.execute("SELECT 1 AS ok;")
            print("OK -> Resultado:", cur.fetchone())
    print("[OK] Conexion EXITOSA.")
except Exception as e:
    print("[ERROR] Conexion FALLIDA.")
    print("Detalle:", e)
