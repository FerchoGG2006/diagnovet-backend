# ============================================
# DiagnoVET - Comandos de Despliegue en GCP
# ============================================
# Ejecutar estos comandos en orden desde PowerShell/Terminal

# ============================
# PASO 1: CONFIGURACIÓN INICIAL
# ============================

# Autenticarse en Google Cloud
gcloud auth login

# Establecer el proyecto
$PROJECT_ID = "the-delight-382903"
gcloud config set project $PROJECT_ID

# ============================
# PASO 2: HABILITAR APIs
# ============================

gcloud services enable run.googleapis.com
gcloud services enable storage.googleapis.com
gcloud services enable documentai.googleapis.com
gcloud services enable firestore.googleapis.com

# ============================
# PASO 3: CREAR BUCKET
# ============================

$BUCKET_NAME = "diagnovet-reports"
$REGION = "us-central1"

# Crear bucket (si no existe)
gsutil mb -l $REGION gs://$BUCKET_NAME

# Configurar CORS para el bucket (opcional, para acceso desde frontend)
# gsutil cors set cors.json gs://$BUCKET_NAME

# ============================
# PASO 4: CREAR PROCESADOR DE DOCUMENT AI
# ============================

# Esto se debe hacer desde la consola de GCP:
# 1. Ir a https://console.cloud.google.com/ai/document-ai
# 2. Click en "Create Processor"
# 3. Seleccionar "Form Parser"
# 4. Nombrar el procesador (ej: "diagnovet-form-parser")
# 5. Seleccionar región: us
# 6. Copiar el PROCESSOR_ID y actualizarlo en el archivo .env

# ============================
# PASO 5: CREAR BASE DE DATOS FIRESTORE
# ============================

# Crear base de datos Firestore en modo Native
gcloud firestore databases create --location=$REGION

# ============================
# PASO 6: DESPLEGAR EN CLOUD RUN
# ============================

# Opción A: Despliegue desde código fuente (más simple)
gcloud run deploy diagnovet-backend `
  --source . `
  --region $REGION `
  --allow-unauthenticated `
  --set-env-vars "GCP_PROJECT_ID=$PROJECT_ID,GCS_BUCKET_NAME=$BUCKET_NAME,GCP_LOCATION=us,GCP_PROCESSOR_ID=TU_PROCESSOR_ID,NODE_ENV=production"

# Opción B: Despliegue desde imagen Docker (más control)
# Primero construir y subir imagen:
# docker build -t gcr.io/$PROJECT_ID/diagnovet-backend .
# docker push gcr.io/$PROJECT_ID/diagnovet-backend

# Luego desplegar:
# gcloud run deploy diagnovet-backend `
#   --image gcr.io/$PROJECT_ID/diagnovet-backend `
#   --region $REGION `
#   --allow-unauthenticated `
#   --set-env-vars "GCP_PROJECT_ID=$PROJECT_ID,GCS_BUCKET_NAME=$BUCKET_NAME"

# ============================
# PASO 7: VERIFICAR DESPLIEGUE
# ============================

# Obtener URL del servicio
gcloud run services describe diagnovet-backend --region=$REGION --format="value(status.url)"

# Probar endpoint de salud
# curl https://TU-URL.run.app/health

# ============================
# COMANDOS ÚTILES
# ============================

# Ver logs en tiempo real
# gcloud run services logs tail diagnovet-backend --region=$REGION

# Actualizar despliegue
# gcloud run deploy diagnovet-backend --source . --region $REGION

# Ver métricas
# gcloud monitoring dashboards list
