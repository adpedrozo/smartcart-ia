# SmartCart IA

Asistente inteligente para la gestión de compras del hogar. Permite registrar tickets de supermercado mediante fotografía, controlar el stock del inventario doméstico y detectar variaciones de precios a lo largo del tiempo utilizando inteligencia artificial.

---

## Demo

> 🔗 **Frontend:** [smartcart-ia.vercel.app](https://smartcart-ia.vercel.app) *(disponible próximamente)*
> 🔗 **API:** [smartcart-ia.railway.app](https://smartcart-ia.railway.app) *(disponible próximamente)*

---

## Funcionalidades

- **Escaneo de tickets** — fotografiá un ticket de supermercado y el sistema extrae automáticamente los productos, precios y supermercado usando OCR + IA
- **Inventario inteligente** — controlá el stock de cada producto con alertas de nivel crítico, urgente y bajo
- **Detección de cambios de precio** — el agente compara los precios del ticket con el historial y genera alertas y sugerencias contextuales
- **Lista de compras** — lista priorizada generada automáticamente según el estado del stock, con opción de exportar como imagen o copiar al portapapeles
- **Estadísticas de precios** — evolución histórica de precios por producto y comparativa entre supermercados
- **PWA** — instalable como aplicación en dispositivos móviles desde el navegador

---

## Stack tecnológico

| Capa | Tecnología |
|---|---|
| Backend | Python / FastAPI |
| Frontend | JavaScript / React |
| Base de datos | Supabase / PostgreSQL |
| OCR | Google Cloud Vision API |
| IA generativa | Google Gemini AI |
| Orquestación agéntica | LangChain |
| Deploy backend | Railway |
| Deploy frontend | Vercel |

---

## Arquitectura

El sistema opera mediante una arquitectura multi-agente con ciclo de decisión cíclico:

```
Foto del ticket
      ↓
Google Vision API (OCR) → texto crudo
      ↓
Gemini AI → productos, precios y categorías estructurados
      ↓
Agente de análisis → comparación con inventario e historial de precios
      ↓
Sugerencias contextuales + actualización de inventario
```

---

## Instalación local

### Requisitos previos

- Python 3.11+
- Node.js 18+
- Cuenta en [Supabase](https://supabase.com)
- Cuenta en [Google Cloud](https://console.cloud.google.com) con Vision API habilitada
- API Key de [Google AI Studio](https://aistudio.google.com) para Gemini

### 1. Clonar el repositorio

```bash
git clone git@github-personal:adpedrozo/smartcart-ia.git
cd smartcart-ia
```

### 2. Configurar el backend

```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate

# Mac/Linux
source venv/bin/activate

pip install -r requirements.txt
```

Crear el archivo `.env` en la carpeta `backend/`:

```env
DATABASE_URL=postgresql://postgres:TU_PASSWORD@db.TU_PROJECT.supabase.co:5432/postgres
GOOGLE_APPLICATION_CREDENTIALS=credentials/google-vision-key.json
GEMINI_API_KEY=tu_api_key_de_google_ai_studio
```

Agregar el archivo de credenciales de Google Vision en `backend/credentials/google-vision-key.json`.

Levantar el servidor:

```bash
uvicorn app.main:app --reload
```

La API queda disponible en `http://127.0.0.1:8000`
Documentación interactiva en `http://127.0.0.1:8000/docs`

### 3. Configurar el frontend

```bash
cd frontend
npm install
```

Crear el archivo `.env.local` en la carpeta `frontend/`:

```env
VITE_API_URL=http://127.0.0.1:8000
```

Levantar el servidor de desarrollo:

```bash
npm run dev
```

La aplicación queda disponible en `http://localhost:5173`

### 4. Inicializar la base de datos

Las tablas se crean automáticamente cuando el backend levanta por primera vez. Para cargar los datos opcionales de demo ejecutá el archivo `backend/seed.sql` en el **SQL Editor de Supabase**.

---

## Datos de demo

La aplicación incluye datos precargados para facilitar el análisis de funcionamiento. El inventario contiene 8 productos de distintas categorías con historial de precios en múltiples supermercados:

| Producto | Categoría | Stock |
|---|---|---|
| Azúcar Ledesma 1 Kg | Almacén | Crítico |
| Cerveza Dunkel Mecklenburger X 500 Cc | Bebidas | Bajo |
| Gaseosa Regular Coca Cola Lata X 350 Ml | Bebidas | Bajo |
| Queso Azul San Ignacio | Lácteos | Bajo |
| Shampoo Sedal 350Ml | Higiene Personal | Bajo |
| Papas Fritas Lays 200 Grs | Almacén | OK |
| Pan Artesanal Bimbo X 500 Grs | Panadería | OK |
| Mermelada De Rosa Mosqueta El Brocal X 420 Grs | Almacén | OK |

Para recrear los datos demo en una instancia nueva, ejecutar `backend/seed.sql` en el SQL Editor de Supabase. Las tablas se crean automáticamente al levantar el backend por primera vez.

---

## Variables de entorno

### Backend

| Variable | Descripción |
|---|---|
| `DATABASE_URL` | String de conexión a PostgreSQL en Supabase |
| `GOOGLE_APPLICATION_CREDENTIALS` | Ruta al archivo JSON de credenciales de Google Vision |
| `GOOGLE_CREDENTIALS_JSON` | Contenido del JSON de credenciales (para deploy en Railway) |
| `GEMINI_API_KEY` | API Key de Google AI Studio para Gemini |

> **Nota:** `GOOGLE_APPLICATION_CREDENTIALS` se usa solo en desarrollo local 
> apuntando a un archivo JSON. En producción (Railway) usar `GOOGLE_CREDENTIALS_JSON` 
> con el contenido del archivo JSON como string.

> **Nota:** En producción (Railway) usar la URL de **Connection Pooling** de Supabase 
> (puerto 6543) en lugar de la conexión directa (puerto 5432). Se obtiene desde 
> el dashboard de Supabase → Connect → Connection pooling.

### Frontend

| Variable | Descripción |
|---|---|
| `VITE_API_URL` | URL base del backend (local o Railway en producción) |

---

## Estructura del proyecto

```
smartcart-ia/
├── backend/
│   ├── app/
│   │   ├── main.py        # Endpoints FastAPI
│   │   ├── models.py      # Modelos SQLAlchemy
│   │   ├── database.py    # Conexión a base de datos
│   │   ├── logic.py       # Lógica de negocio (lista de compras, alertas)
│   │   ├── ocr.py         # Procesamiento OCR con Google Vision y Gemini
│   │   └── agent.py       # Agente de análisis de precios e inventario
│   ├── credentials/       # Credenciales Google (no subir al repo)
│   ├── requirements.txt
│   └── .env               # Variables de entorno (no subir al repo)
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Inventory.jsx
│   │   │   ├── ShoppingList.jsx
│   │   │   └── Dashboard.jsx
│   │   ├── components/
│   │   │   ├── Navbar.jsx
│   │   │   └── TicketScanner.jsx
│   │   ├── api.js          # Funciones de llamada al backend
│   │   ├── constants.js    # Supermercados y categorías
│   │   └── App.jsx
│   ├── public/
│   │   └── logo.png
│   └── .env.local          # Variables de entorno locales (no subir al repo)
└── README.md
```

---

## Trabajo académico

Este proyecto fue desarrollado como trabajo final del curso **Inteligencia Artificial Aplicada a Organizaciones** — UTN-FRBA 2026.

Implementa los conceptos de:
- Orquestación agéntica cíclica
- Memoria persistente
- Ciclo Observar → Analizar → Planificar → Actuar → Evaluar → Aprender

---

## Licencia

Proyecto académico.
Desarrollado por Alejandro Pedrozo.