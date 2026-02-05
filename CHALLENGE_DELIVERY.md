# 📧 Entrega del Challenge Técnico - DiagnoVET

## 📅 Información de la Entrega

- **Candidato**: Fernando José Baquero Vergara
- **Posición**: Junior Backend Engineer
- **Fecha de entrega**: Febrero 2026
- **Empresa**: DiagnoVET (Finance Lab - Recruiting Partners)

---

## 🎯 Resumen Ejecutivo

He desarrollado una **API REST serverless** para procesar reportes de ultrasonido veterinario usando **Google Cloud Platform**. La solución incluye:

✅ **Funcionalidad completa** según los requisitos del challenge
✅ **Arquitectura escalable** con Cloud Run, Document AI, Cloud Storage y Firestore
✅ **Código de producción** con seguridad, tests y documentación
✅ **CI/CD listo** con Cloud Build para despliegue automático

---

## 🚀 Demo Rápida

### Ejecutar localmente

```bash
# Clonar repositorio
git clone https://github.com/FerchoGG2006/diagnovet-backend.git
cd diagnovet-backend

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env
# (Editar .env con credenciales de GCP)

# Ejecutar
npm run dev

# Abrir documentación
# http://localhost:8080/api-docs
```

### Ejecutar tests

```bash
npm test
# ✅ 24 tests passing
```

---

## 📂 Estructura del Proyecto

```
diagnovet-backend/
├── src/
│   ├── config/           # Configuración GCP y Swagger
│   ├── controllers/      # Lógica de endpoints
│   ├── services/         # Integración con servicios GCP
│   ├── middleware/       # Rate limiting, logging
│   ├── routes/           # Definición de rutas
│   ├── utils/            # Validadores, extractor de imágenes
│   └── __tests__/        # Tests automatizados
├── index.js              # Punto de entrada
├── Dockerfile            # Container optimizado
├── cloudbuild.yaml       # CI/CD pipeline
├── README.md             # Documentación principal
├── DEPLOYMENT.md         # Guía de despliegue
├── ARCHITECTURE.md       # Arquitectura detallada
└── package.json
```

---

## 🔧 Tecnologías Implementadas

| Requisito | Tecnología | Estado |
|-----------|------------|--------|
| Runtime | Node.js 18 + Express | ✅ |
| Almacenamiento de PDFs | Cloud Storage | ✅ |
| Procesamiento de documentos | Document AI | ✅ |
| Base de datos | Firestore | ✅ |
| Containerización | Docker (multi-stage) | ✅ |
| Deployment | Cloud Run | ✅ |
| CI/CD | Cloud Build | ✅ |
| Documentación API | Swagger/OpenAPI 3.0 | ✅ |
| Testing | Jest + Supertest | ✅ |
| Seguridad | Helmet, CORS, Rate Limit | ✅ |

---

## 📡 API Endpoints

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/` | Información de la API |
| GET | `/health` | Health check (requerido para Cloud Run) |
| GET | `/api-docs` | Documentación Swagger UI |
| POST | `/upload` | Subir y procesar PDF de ultrasonido |
| GET | `/reports` | Listar reportes (paginado) |
| GET | `/reports/:id` | Obtener reporte específico |
| GET | `/reports/stats` | Estadísticas de uso |
| DELETE | `/reports/:id` | Eliminar reporte (soft delete) |

---

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

### Flujo de procesamiento:
1. Cliente sube PDF → Cloud Run recibe
2. PDF se valida (tipo, tamaño, magic bytes)
3. PDF se sube a Cloud Storage
4. Imágenes se extraen del PDF
5. Document AI procesa el documento
6. Datos estructurados se guardan en Firestore
7. Respuesta JSON al cliente

---

## 🔐 Seguridad Implementada

- ✅ **Helmet** - Headers HTTP seguros
- ✅ **CORS** - Control de orígenes
- ✅ **Rate Limiting** - 100 req/min
- ✅ **Validación de archivos** - Magic bytes, MIME type, tamaño
- ✅ **Input sanitization** - Prevención de inyección
- ✅ **Non-root Docker** - Container seguro
- ✅ **Soft Delete** - Sin pérdida de datos

---

## 📊 Extras Implementados

Además de los requisitos base, incluí:

1. **📚 Documentación Swagger completa** - `/api-docs`
2. **🧪 Suite de tests** - 24 tests con mocks de GCP
3. **📝 Logging estructurado** - Winston con JSON
4. **🔄 CI/CD Pipeline** - Cloud Build listo
5. **📖 Documentación técnica** - ARCHITECTURE.md, DEPLOYMENT.md
6. **🖼️ Extracción de imágenes** - Usando pdf-lib
7. **📈 Endpoint de estadísticas** - Métricas de uso
8. **🔄 Paginación** - Con filtros en listados

---

## 💡 Decisiones de Diseño

### ¿Por qué Cloud Run?
- Escala automáticamente de 0 a N
- Costo $0 cuando no hay tráfico
- HTTPS automático
- Integración nativa con GCP

### ¿Por qué Firestore?
- NoSQL flexible para datos semiestructurados
- Serverless, sin gestión de infraestructura
- Escalado horizontal automático

### ¿Por qué Document AI con Form Parser?
- Diseñado para extraer campos de formularios
- Funciona con documentos médicos/veterinarios
- Mayor precisión que OCR genérico

---

## 📧 Contacto

**Fernando José Baquero Vergara**
- GitHub: [@FerchoGG2006](https://github.com/FerchoGG2006)
- LinkedIn: [Tu LinkedIn]
- Email: [Tu Email]

---

## 🙏 Agradecimientos

Gracias por la oportunidad de participar en este challenge técnico. Estoy entusiasmado con la posibilidad de unirme al equipo de DiagnoVET y contribuir a construir soluciones innovadoras en el espacio veterinario.

> *"Building the future of veterinary diagnostics, one API at a time."*

---

**Entrega lista para revisión** ✅
