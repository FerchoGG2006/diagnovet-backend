# 🚀 Guía de Despliegue - DiagnoVET Backend

Esta guía detalla cómo desplegar DiagnoVET Backend en Google Cloud Platform.

## 📋 Prerrequisitos

1. **Cuenta de Google Cloud** con facturación habilitada
2. **gcloud CLI** instalado y autenticado
3. **Docker** instalado (para desarrollo local)
4. **Node.js 18+** instalado

## 🔧 Configuración Inicial de GCP

### 1. Crear proyecto y habilitar APIs

```bash
# Establecer variables
export PROJECT_ID="tu-proyecto-id"
export REGION="us-central1"

# Crear proyecto (si no existe)
gcloud projects create $PROJECT_ID

# Establecer proyecto activo
gcloud config set project $PROJECT_ID

# Habilitar APIs necesarias
gcloud services enable \
  run.googleapis.com \
  storage.googleapis.com \
  documentai.googleapis.com \
  firestore.googleapis.com \
  cloudbuild.googleapis.com \
  secretmanager.googleapis.com
```

### 2. Crear Cloud Storage Bucket

```bash
export BUCKET_NAME="${PROJECT_ID}-diagnovet-reports"

# Crear bucket
gsutil mb -l $REGION gs://$BUCKET_NAME

# Configurar CORS (necesario para acceso desde frontend)
cat > cors-config.json << EOF
[
  {
    "origin": ["*"],
    "method": ["GET", "HEAD", "PUT", "POST"],
    "responseHeader": ["Content-Type"],
    "maxAgeSeconds": 3600
  }
]
EOF

gsutil cors set cors-config.json gs://$BUCKET_NAME
rm cors-config.json
```

### 3. Configurar Document AI

1. Ve a [Document AI Console](https://console.cloud.google.com/ai/document-ai)
2. Crea un procesador tipo **"Form Parser"**
3. Guarda el **Processor ID** y **Location**

```bash
export PROCESSOR_ID="tu-processor-id"
export PROCESSOR_LOCATION="us"  # o "eu" según tu ubicación
```

### 4. Configurar Firestore

```bash
# Crear base de datos Firestore (modo nativo)
gcloud firestore databases create --location=$REGION
```

### 5. Crear Service Account

```bash
# Crear cuenta de servicio
gcloud iam service-accounts create diagnovet-backend \
  --display-name="DiagnoVET Backend Service Account"

# Asignar roles necesarios
SA_EMAIL="diagnovet-backend@${PROJECT_ID}.iam.gserviceaccount.com"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$SA_EMAIL" \
  --role="roles/storage.objectAdmin"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$SA_EMAIL" \
  --role="roles/datastore.user"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$SA_EMAIL" \
  --role="roles/documentai.apiUser"

# Generar clave JSON (para desarrollo local)
gcloud iam service-accounts keys create ./sa-key.json \
  --iam-account=$SA_EMAIL

echo "⚠️ IMPORTANTE: Agrega sa-key.json a .gitignore"
```

## 🐳 Despliegue Manual

### Opción A: Desde código fuente (más simple)

```bash
# Desplegar directamente desde código
gcloud run deploy diagnovet-backend \
  --source . \
  --region $REGION \
  --allow-unauthenticated \
  --memory 512Mi \
  --min-instances 0 \
  --max-instances 10 \
  --set-env-vars "NODE_ENV=production,GCP_PROJECT_ID=$PROJECT_ID,GCS_BUCKET_NAME=$BUCKET_NAME,GCP_PROCESSOR_ID=$PROCESSOR_ID,GCP_PROCESSOR_LOCATION=$PROCESSOR_LOCATION"
```

### Opción B: Desde Docker (más control)

```bash
# Build de imagen
docker build -t gcr.io/$PROJECT_ID/diagnovet-backend:latest .

# Push a Container Registry
docker push gcr.io/$PROJECT_ID/diagnovet-backend:latest

# Desplegar
gcloud run deploy diagnovet-backend \
  --image gcr.io/$PROJECT_ID/diagnovet-backend:latest \
  --region $REGION \
  --allow-unauthenticated \
  --memory 512Mi
```

## 🔄 Despliegue Automático (CI/CD)

### Configurar Cloud Build

1. **Conectar repositorio**:
   ```bash
   # En Cloud Console: Cloud Build > Triggers > Connect Repository
   # O usar gcloud:
   gcloud builds triggers create github \
     --name="diagnovet-deploy" \
     --repo-name="diagnovet-backend" \
     --repo-owner="tu-usuario" \
     --branch-pattern="^main$" \
     --build-config="cloudbuild.yaml" \
     --substitutions="_BUCKET_NAME=$BUCKET_NAME,_PROCESSOR_ID=$PROCESSOR_ID,_PROCESSOR_LOCATION=$PROCESSOR_LOCATION"
   ```

2. **Configurar variables de sustitución** en Cloud Build:
   - `_REGION`: `us-central1`
   - `_BUCKET_NAME`: Tu bucket de Storage
   - `_PROCESSOR_ID`: Tu processor de Document AI
   - `_PROCESSOR_LOCATION`: `us` o `eu`

3. **Guardar secretos en Secret Manager** (opcional pero recomendado):
   ```bash
   # Crear secreto para la clave de servicio
   gcloud secrets create diagnovet-sa-key \
     --data-file=./sa-key.json
   
   # Dar acceso a Cloud Build
   gcloud secrets add-iam-policy-binding diagnovet-sa-key \
     --member="serviceAccount:${PROJECT_ID}@cloudbuild.gserviceaccount.com" \
     --role="roles/secretmanager.secretAccessor"
   ```

## ✅ Verificación del Despliegue

### 1. Obtener URL del servicio

```bash
SERVICE_URL=$(gcloud run services describe diagnovet-backend \
  --region $REGION \
  --format 'value(status.url)')

echo "🌐 URL del servicio: $SERVICE_URL"
```

### 2. Probar endpoints

```bash
# Health check
curl $SERVICE_URL/health

# Información de la API
curl $SERVICE_URL/

# Documentación Swagger
echo "📚 Swagger UI: $SERVICE_URL/api-docs"
```

### 3. Subir un PDF de prueba

```bash
curl -X POST $SERVICE_URL/upload \
  -F "report=@./example-Ultrasound-Sample.pdf"
```

## 📊 Monitoreo

### Cloud Run Metrics

```bash
# Ver logs en tiempo real
gcloud run services logs tail diagnovet-backend --region $REGION

# Ver métricas en consola
echo "📈 Métricas: https://console.cloud.google.com/run/detail/$REGION/diagnovet-backend/metrics"
```

### Alertas recomendadas

1. **Latencia alta**: > 2 segundos en p95
2. **Errores 5xx**: > 1% de requests
3. **Instancias**: Alert cuando > 5 instancias

## 🔐 Seguridad en Producción

### Variables de entorno recomendadas

| Variable | Descripción | Valor sugerido |
|----------|-------------|----------------|
| `NODE_ENV` | Ambiente | `production` |
| `ALLOWED_ORIGINS` | Dominios permitidos | `https://tudominio.com` |
| `RATE_LIMIT_WINDOW_MS` | Ventana de rate limit | `60000` |
| `RATE_LIMIT_MAX` | Requests por ventana | `100` |

### Checklist de seguridad

- [ ] CORS configurado con dominios específicos
- [ ] Rate limiting activo
- [ ] Secrets en Secret Manager
- [ ] Service Account con mínimos privilegios
- [ ] HTTPS forzado (Cloud Run lo hace automáticamente)
- [ ] Logging habilitado

## 🆘 Troubleshooting

### Error: "Permission denied"

```bash
# Verificar permisos del service account
gcloud projects get-iam-policy $PROJECT_ID \
  --filter="bindings.members:$SA_EMAIL"
```

### Error: "Document AI processor not found"

```bash
# Verificar que el processor existe
gcloud documentai processors list --location=$PROCESSOR_LOCATION
```

### Error: "Bucket not found"

```bash
# Verificar que el bucket existe
gsutil ls gs://$BUCKET_NAME
```

## 📝 Notas adicionales

- Cloud Run escala automáticamente de 0 a N instancias
- La primera request después de cold start puede tardar 2-3 segundos
- Para producción, considera `--min-instances 1` para evitar cold starts
- Los logs se almacenan en Cloud Logging por 30 días por defecto
