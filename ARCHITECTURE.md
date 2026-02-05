# 🏗️ Arquitectura del Sistema - DiagnoVET Backend

## Visión General

DiagnoVET Backend es una API REST serverless diseñada para procesar reportes de ultrasonido veterinario utilizando servicios gestionados de Google Cloud Platform.

## Diagrama de Arquitectura

```
                                    ┌─────────────────────────────────────────────────────────────┐
                                    │                    Google Cloud Platform                    │
                                    │                                                             │
┌──────────────┐                    │  ┌─────────────────────────────────────────────────────┐   │
│              │   HTTPS Request    │  │                    Cloud Run                        │   │
│   Cliente    │───────────────────▶│  │  ┌───────────────────────────────────────────────┐  │   │
│   (HTTP)     │                    │  │  │              Express.js Server                │  │   │
│              │◀───────────────────│  │  │                                               │  │   │
└──────────────┘   JSON Response    │  │  │  ┌─────────┐ ┌──────────┐ ┌───────────────┐  │  │   │
                                    │  │  │  │ Routes  │→│Controller│→│   Services    │  │  │   │
                                    │  │  │  └─────────┘ └──────────┘ └───────┬───────┘  │  │   │
                                    │  │  │                                   │          │  │   │
                                    │  │  │  ┌─────────────────────────────────┼─────┐   │  │   │
                                    │  │  │  │         Middleware Layer        │     │   │  │   │
                                    │  │  │  │  • Rate Limiting                │     │   │  │   │
                                    │  │  │  │  • Helmet (Security)            │     │   │  │   │
                                    │  │  │  │  • CORS                         │     │   │  │   │
                                    │  │  │  │  • Request Logging (Winston)    │     │   │  │   │
                                    │  │  │  └─────────────────────────────────┼─────┘   │  │   │
                                    │  │  └────────────────────────────────────┼─────────┘  │   │
                                    │  └───────────────────────────────────────┼────────────┘   │
                                    │                                          │                │
                                    │              ┌───────────────────────────┼───────────┐    │
                                    │              │                           │           │    │
                                    │              ▼                           ▼           ▼    │
                                    │  ┌─────────────────┐  ┌─────────────────┐  ┌───────────┐ │
                                    │  │  Cloud Storage  │  │   Document AI   │  │ Firestore │ │
                                    │  │                 │  │                 │  │           │ │
                                    │  │  • PDFs         │  │  • Form Parser  │  │ • Reports │ │
                                    │  │  • Images       │  │  • OCR          │  │ • Metadata│ │
                                    │  │                 │  │  • Entities     │  │ • Stats   │ │
                                    │  └─────────────────┘  └─────────────────┘  └───────────┘ │
                                    │                                                          │
                                    └──────────────────────────────────────────────────────────┘
```

## Componentes del Sistema

### 1. Cloud Run (Compute)

**Responsabilidad**: Ejecutar la aplicación Express.js en contenedores serverless.

| Característica | Configuración |
|----------------|---------------|
| Runtime | Node.js 18 Alpine |
| Memoria | 512Mi |
| CPU | 1 vCPU |
| Escalado | 0-10 instancias |
| Cold Start | ~2-3 segundos |

**Ventajas**:
- Escala a cero (costo $0 sin tráfico)
- Auto-scaling basado en requests
- HTTPS automático
- Integración nativa con otros servicios GCP

### 2. Cloud Storage (Almacenamiento)

**Responsabilidad**: Almacenar archivos binarios (PDFs e imágenes).

```
gs://diagnovet-reports/
├── reports/                    # PDFs originales
│   └── {timestamp}-{filename}
└── images/                     # Imágenes extraídas
    └── {reportId}/
        └── image-{index}.{format}
```

**Configuración**:
- Clase: Standard
- Región: us-central1
- Lifecycle: 90 días → Nearline (opcional)

### 3. Document AI (Procesamiento)

**Responsabilidad**: Extraer información estructurada de PDFs.

**Processor**: Form Parser

**Campos extraídos**:
- Información del paciente (mascota)
- Datos del propietario
- Información del veterinario
- Hallazgos clínicos
- Diagnóstico y recomendaciones

### 4. Firestore (Base de Datos)

**Responsabilidad**: Almacenar metadata y datos estructurados.

**Colección principal**: `ultrasound_reports`

```javascript
{
  id: "uuid",
  patient: {
    name: "Max",
    species: "Canino",
    breed: "Golden Retriever",
    age: "5 años",
    weight: "30kg"
  },
  owner: {
    name: "Juan Pérez",
    phone: "+1234567890"
  },
  veterinarian: {
    name: "Dra. María García",
    clinic: "Clínica Veterinaria ABC"
  },
  clinical: {
    diagnosis: "Sin alteraciones significativas",
    recommendations: "Control en 6 meses"
  },
  files: {
    originalPdf: { url, path, size }
  },
  images: [{ url, path, width, height }],
  status: "processed" | "deleted",
  createdAt: "ISO8601",
  updatedAt: "ISO8601"
}
```

## Flujo de Datos

### Upload de Reporte (POST /upload)

```
1. Cliente envía PDF
        │
        ▼
2. Validación (tipo, tamaño, magic bytes)
        │
        ▼
3. Upload a Cloud Storage
        │
        ├────────────────────┐
        ▼                    ▼
4. Extracción de       5. Procesamiento
   imágenes (pdf-lib)     Document AI
        │                    │
        ▼                    │
6. Upload imágenes           │
   a Cloud Storage           │
        │                    │
        └────────┬───────────┘
                 ▼
7. Combinar resultados
        │
        ▼
8. Guardar en Firestore
        │
        ▼
9. Respuesta JSON al cliente
```

### Tiempo de procesamiento típico

| Paso | Duración |
|------|----------|
| Validación | ~10ms |
| Upload PDF | ~200ms |
| Extracción imágenes | ~500ms |
| Document AI | ~2-5s |
| Upload imágenes | ~300ms |
| Guardar Firestore | ~100ms |
| **Total** | **~3-6s** |

## Seguridad

### Capas de Seguridad

```
┌─────────────────────────────────────────────┐
│           Rate Limiting (100/min)           │
├─────────────────────────────────────────────┤
│         Helmet (Security Headers)           │
├─────────────────────────────────────────────┤
│            CORS (Origins List)              │
├─────────────────────────────────────────────┤
│      File Validation (Type, Size, Magic)    │
├─────────────────────────────────────────────┤
│         Input Sanitization                  │
├─────────────────────────────────────────────┤
│     Docker Non-Root User                    │
└─────────────────────────────────────────────┘
```

### Headers de Seguridad (Helmet)

- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Strict-Transport-Security` (HSTS)

## Escalabilidad

### Horizontal Scaling

| Componente | Estrategia |
|------------|------------|
| Cloud Run | Auto-scale 0-N instancias |
| Firestore | Sharding automático |
| Cloud Storage | Diseñado para petabytes |
| Document AI | Serverless, sin límites prácticos |

### Límites y Cuotas

| Recurso | Límite |
|---------|--------|
| Tamaño PDF | 10MB (configurable) |
| Requests/min | 100 (rate limit) |
| Instancias máx | 10 (configurable) |
| Document AI | 600 páginas/min |

## Observabilidad

### Logging (Winston)

```javascript
{
  timestamp: "2024-01-15T10:30:00.000Z",
  level: "info",
  message: "Request received",
  requestId: "uuid",
  method: "POST",
  path: "/upload",
  duration: 3500,
  statusCode: 201
}
```

### Métricas Clave

- **Latencia**: p50, p95, p99
- **Tasa de errores**: 4xx, 5xx
- **Throughput**: requests/segundo
- **Instancias activas**: Cloud Run
- **Storage usage**: GB almacenados

## Decisiones de Diseño

### ¿Por qué Cloud Run?

| Alternativa | Pros | Contras |
|-------------|------|---------|
| **Cloud Run** ✓ | Serverless, escala a 0, bajo costo | Cold start |
| Cloud Functions | Más simple | Límite 9 min, menos control |
| GKE | Control total | Overhead operacional |
| Compute Engine | Máximo control | Gestión manual |

### ¿Por qué Firestore?

| Alternativa | Pros | Contras |
|-------------|------|---------|
| **Firestore** ✓ | NoSQL flexible, tiempo real, serverless | Queries limitados |
| Cloud SQL | SQL completo | Gestión de instancias |
| Bigtable | Alto volumen | Overkill para este caso |

### ¿Por qué Express.js?

| Alternativa | Pros | Contras |
|-------------|------|---------|
| **Express** ✓ | Maduro, extensible, gran ecosistema | Performance |
| Fastify | Más rápido | Menos middleware |
| NestJS | Estructura robusta | Overhead para APIs simples |

## Costos Estimados

### Escenario: 1,000 reportes/mes

| Servicio | Uso | Costo/mes |
|----------|-----|-----------|
| Cloud Run | ~3,000 invocaciones | ~$0.50 |
| Cloud Storage | ~10 GB | ~$0.20 |
| Document AI | 1,000 páginas | ~$1.50 |
| Firestore | 10,000 lecturas | ~$0.04 |
| **Total** | | **~$2.24** |

*Los costos pueden variar según región y uso real.*

## Mejoras Futuras

1. **Caché**: Redis para resultados frecuentes
2. **Webhooks**: Notificaciones asíncronas
3. **ML personalizado**: Modelo fine-tuned para veterinaria
4. **Multi-tenant**: Soporte para múltiples clínicas
5. **API Gateway**: Apigee para gestión avanzada
