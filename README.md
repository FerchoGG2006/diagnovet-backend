# 🐾 DiagnoVET Backend API

<div align="center">

![Node.js](https://img.shields.io/badge/Node.js-18+-green?logo=node.js)
![Express](https://img.shields.io/badge/Express-4.x-lightgrey?logo=express)
![Google Cloud](https://img.shields.io/badge/Google%20Cloud-Platform-blue?logo=google-cloud)
![License](https://img.shields.io/badge/License-MIT-yellow)
![Tests](https://img.shields.io/badge/Tests-Passing-brightgreen)

**API serverless para procesar reportes de ultrasonido veterinario usando Google Cloud Platform**

[🚀 Quick Start](#-quick-start) •
[📖 Documentación](#-documentación) •
[🏗️ Arquitectura](#️-arquitectura) •
[🔧 API Endpoints](#-api-endpoints) •
[📦 Despliegue](#-despliegue)

</div>

---

## 📋 Descripción

DiagnoVET Backend es una API REST diseñada para automatizar el procesamiento de reportes de ultrasonido veterinario. Utiliza servicios gestionados de Google Cloud Platform para:

- 📤 **Subir** reportes PDF a Cloud Storage
- 🤖 **Extraer** información estructurada con Document AI
- 🖼️ **Extraer** imágenes incrustadas del PDF
- 💾 **Almacenar** datos procesados en Firestore
- 📊 **Consultar** reportes con filtros y paginación

## ✨ Características

| Feature | Descripción |
|---------|-------------|
| **🔐 Seguridad** | Helmet, CORS, Rate Limiting, validación de archivos |
| **📚 Documentación** | Swagger UI interactivo en `/api-docs` |
| **🧪 Testing** | Suite de tests con Jest + Supertest |
| **📝 Logging** | Winston con logs estructurados |
| **🐳 Containerizado** | Dockerfile optimizado multi-stage |
| **🔄 CI/CD** | Cloud Build pipeline listo para usar |
| **⚡ Serverless** | Escala automáticamente de 0 a N instancias |

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

Para más detalles, ver [ARCHITECTURE.md](./ARCHITECTURE.md)

## 📁 Estructura del Proyecto

```
diagnovet-backend/
├── src/
│   ├── config/               # Configuración de servicios
│   │   ├── gcp.config.js     # Clientes de GCP
│   │   └── swagger.config.js # Configuración OpenAPI
│   ├── controllers/          # Lógica de endpoints
│   │   └── reports.controller.js
│   ├── services/             # Integración con GCP
│   │   ├── storage.service.js    # Cloud Storage
│   │   ├── documentai.service.js # Document AI
│   │   └── firestore.service.js  # Firestore
│   ├── middleware/           # Express middlewares
│   │   └── rateLimiter.js    # Rate limiting
│   ├── routes/               # Definición de rutas
│   │   └── reports.routes.js
│   ├── utils/                # Utilidades
│   │   ├── imageExtractor.js # Extracción de imágenes
│   │   ├── validators.js     # Validaciones
│   │   └── logger.js         # Winston logger
│   └── __tests__/            # Tests automatizados
│       ├── api.test.js
│       └── validators.test.js
├── index.js                  # Punto de entrada
├── Dockerfile                # Contenedor optimizado
├── cloudbuild.yaml           # CI/CD pipeline
├── DEPLOYMENT.md             # Guía de despliegue
├── ARCHITECTURE.md           # Documentación técnica
└── package.json
```

## 🚀 Quick Start

### Prerrequisitos

- Node.js 18+
- Cuenta de Google Cloud Platform
- gcloud CLI instalado

### 1. Clonar e instalar

```bash
git clone https://github.com/FerchoGG2006/diagnovet-backend.git
cd diagnovet-backend
npm install
```

### 2. Configurar variables de entorno

```bash
cp .env.example .env
```

Edita `.env` con tus credenciales de GCP:

```env
# Google Cloud Project
GCP_PROJECT_ID=tu-proyecto-id
GCS_BUCKET_NAME=tu-bucket-name
GCP_PROCESSOR_ID=tu-processor-id
GCP_PROCESSOR_LOCATION=us

# Credenciales (desarrollo local)
GOOGLE_APPLICATION_CREDENTIALS=./sa-key.json

# Servidor
PORT=8080
NODE_ENV=development
```

### 3. Ejecutar en desarrollo

```bash
npm run dev
```

La API estará disponible en `http://localhost:8080`

### 4. Verificar funcionamiento

```bash
# Health check
curl http://localhost:8080/health

# Documentación Swagger
open http://localhost:8080/api-docs
```

## 🔧 API Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/` | Información de la API |
| `GET` | `/health` | Estado de servicios |
| `GET` | `/api-docs` | Documentación Swagger |
| `POST` | `/upload` | Subir y procesar PDF |
| `GET` | `/reports` | Listar reportes |
| `GET` | `/reports/:id` | Obtener reporte |
| `GET` | `/reports/stats` | Estadísticas |
| `DELETE` | `/reports/:id` | Eliminar reporte |

### Ejemplo: Subir un reporte

```bash
curl -X POST http://localhost:8080/upload \
  -F "report=@reporte-ultrasonido.pdf"
```

### Respuesta

```json
{
  "success": true,
  "message": "Reporte procesado exitosamente",
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
    },
    "imagesCount": 3,
    "processingTime": "3500ms"
  }
}
```

## 📦 Despliegue

### Despliegue rápido a Cloud Run

```bash
gcloud run deploy diagnovet-backend \
  --source . \
  --region us-central1 \
  --allow-unauthenticated
```

Para instrucciones detalladas, ver [DEPLOYMENT.md](./DEPLOYMENT.md)

### CI/CD con Cloud Build

El proyecto incluye `cloudbuild.yaml` para despliegue automático:

1. Conecta tu repositorio a Cloud Build
2. Configura un trigger para la rama `main`
3. ¡Cada push desplegará automáticamente!

## 🧪 Testing

```bash
# Ejecutar todos los tests
npm test

# Tests con coverage
npm test -- --coverage

# Watch mode
npm run test:watch
```

## 🔐 Seguridad

- ✅ **Helmet** - Headers HTTP seguros
- ✅ **CORS** - Control de orígenes permitidos
- ✅ **Rate Limiting** - 100 requests/minuto
- ✅ **Validación de archivos** - Tipo MIME y magic bytes
- ✅ **Sanitización** - Inputs validados y limpiados
- ✅ **Non-root Docker** - Contenedor seguro
- ✅ **Soft Delete** - Los datos nunca se pierden

## 📊 Tecnologías

| Categoría | Tecnología |
|-----------|------------|
| **Runtime** | Node.js 18 |
| **Framework** | Express.js 4.x |
| **Cloud** | Google Cloud Platform |
| **Compute** | Cloud Run |
| **Storage** | Cloud Storage |
| **Database** | Firestore |
| **AI/ML** | Document AI |
| **Container** | Docker (Alpine) |
| **CI/CD** | Cloud Build |
| **Testing** | Jest + Supertest |
| **Docs** | Swagger/OpenAPI 3.0 |

## 📖 Documentación

| Documento | Descripción |
|-----------|-------------|
| [README.md](./README.md) | Este archivo |
| [DEPLOYMENT.md](./DEPLOYMENT.md) | Guía completa de despliegue |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Arquitectura del sistema |
| [/api-docs](http://localhost:8080/api-docs) | Swagger UI interactivo |

## 🤝 Contribución

1. Fork el repositorio
2. Crea tu feature branch (`git checkout -b feature/amazing-feature`)
3. Commit tus cambios (`git commit -m 'Add amazing feature'`)
4. Push a la branch (`git push origin feature/amazing-feature`)
5. Abre un Pull Request

## 📄 Licencia

MIT License - ver [LICENSE](./LICENSE) para más detalles.

## 👤 Autor

**Fernando José Baquero Vergara**

- GitHub: [@FerchoGG2006](https://github.com/FerchoGG2006)
- Email: [tu-email@ejemplo.com]

---

<div align="center">

Hecho con ❤️ para DiagnoVET

</div>
