# 🐾 DiagnoVET Backend API

API para procesar reportes de ultrasonido veterinario usando Google Cloud Platform.

## 📋 Descripción

Esta API permite:
- Subir reportes de ultrasonido en formato PDF
- Extraer automáticamente información estructurada usando Document AI
- Extraer imágenes incrustadas del PDF
- Almacenar archivos en Cloud Storage
- Persistir datos en Firestore

## 🏗️ Arquitectura

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Cliente   │────▶│  Cloud Run  │────▶│  Document   │
│   (HTTP)    │     │  (Express)  │     │     AI      │
└─────────────┘     └──────┬──────┘     └─────────────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
       ┌───────────┐ ┌───────────┐ ┌───────────┐
       │  Cloud    │ │ Firestore │ │  Images   │
       │  Storage  │ │    DB     │ │(Extracted)│
       └───────────┘ └───────────┘ └───────────┘
```

## 📁 Estructura del Proyecto

```
diagnovet-backend/
├── src/
│   ├── config/           # Configuración de GCP
│   │   └── gcp.config.js
│   ├── controllers/      # Controladores
│   │   └── reports.controller.js
│   ├── services/         # Lógica de negocio
│   │   ├── storage.service.js
│   │   ├── documentai.service.js
│   │   └── firestore.service.js
│   ├── routes/           # Definición de rutas
│   │   └── reports.routes.js
│   └── utils/            # Utilidades
│       ├── imageExtractor.js
│       └── validators.js
├── index.js              # Punto de entrada
├── Dockerfile            # Contenedor
├── package.json
└── .env.example
```

## 🚀 Inicio Rápido

### 1. Clonar e instalar

```bash
cd diagnovet-backend
npm install
```

### 2. Configurar variables de entorno

```bash
cp .env.example .env
# Editar .env con tus valores de GCP
```

### 3. Ejecutar en desarrollo

```bash
npm run dev
```

## 🔧 Configuración de GCP

### Requisitos previos

1. Cuenta de Google Cloud con billing habilitado
2. gcloud CLI instalado y autenticado

### Crear recursos

```bash
# Variables
PROJECT_ID="tu-proyecto"
REGION="us-central1"
BUCKET_NAME="diagnovet-reports"

# Habilitar APIs
gcloud services enable \
  run.googleapis.com \
  storage.googleapis.com \
  documentai.googleapis.com \
  firestore.googleapis.com

# Crear bucket
gsutil mb -l $REGION gs://$BUCKET_NAME

# Crear procesador de Document AI (Form Parser)
# Esto se hace desde la consola de GCP
```

## 📡 Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| `POST` | `/upload` | Sube y procesa un PDF |
| `GET` | `/reports` | Lista reportes |
| `GET` | `/reports/:id` | Obtiene un reporte |
| `GET` | `/reports/stats` | Estadísticas |
| `DELETE` | `/reports/:id` | Elimina reporte |
| `GET` | `/health` | Estado del servicio |

### Ejemplo: Subir reporte

```bash
curl -X POST http://localhost:8080/upload \
  -F "report=@reporte.pdf"
```

### Respuesta

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "patient": {
      "name": "Max",
      "species": "Canino",
      "breed": "Golden Retriever"
    },
    "owner": {
      "name": "Juan Pérez"
    },
    "clinical": {
      "diagnosis": "Sin alteraciones significativas"
    }
  }
}
```

## 🐳 Despliegue en Cloud Run

### Opción 1: Desde código fuente

```bash
gcloud run deploy diagnovet-backend \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars "GCP_PROJECT_ID=tu-proyecto,GCS_BUCKET_NAME=tu-bucket,GCP_PROCESSOR_ID=tu-processor"
```

### Opción 2: Desde Docker

```bash
# Build
docker build -t gcr.io/$PROJECT_ID/diagnovet-backend .

# Push
docker push gcr.io/$PROJECT_ID/diagnovet-backend

# Deploy
gcloud run deploy diagnovet-backend \
  --image gcr.io/$PROJECT_ID/diagnovet-backend \
  --region us-central1 \
  --allow-unauthenticated
```

## 🔐 Seguridad

- Helmet para cabeceras HTTP seguras
- CORS configurado
- Validación de archivos (tipo, tamaño, magic bytes)
- Sanitización de inputs
- Usuario no-root en Docker
- Soft delete en lugar de eliminación física

## 📊 Escalabilidad

- Cloud Run escala automáticamente de 0 a N instancias
- Firestore escala horizontalmente
- Cloud Storage diseñado para cualquier volumen
- Document AI procesamiento serverless

## 🧪 Testing

```bash
# Health check
curl http://localhost:8080/health

# Subir PDF de prueba
curl -X POST http://localhost:8080/upload \
  -F "report=@test.pdf"
```

## 📄 Licencia

MIT License
