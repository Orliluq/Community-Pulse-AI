# 🌟 Community Pulse AI 🌟

<div align="center">
  
![Python](https://img.shields.io/badge/Python-3.12-3776AB?logo=python&logoColor=white&style=for-the-badge)
![AWS](https://img.shields.io/badge/AWS-FF9900?logo=amazonaws&logoColor=white&style=for-the-badge)
![React](https://img.shields.io/badge/React-61DAFB?logo=react&logoColor=black&style=for-the-badge)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white&style=for-the-badge)
![CDK](https://img.shields.io/badge/CDK-1F4265?logo=aws-cdk&logoColor=white&style=for-the-badge)
![SageMaker](https://img.shields.io/badge/SageMaker-FF9900?logo=amazon-sagemaker&logoColor=white&style=for-the-badge)
![Bedrock](https://img.shields.io/badge/Bedrock-FF9900?logo=amazon-bedrock&logoColor=white&style=for-the-badge)
![Lambda](https://img.shields.io/badge/Lambda-FF9900?logo=aws-lambda&logoColor=white&style=for-the-badge)
![APIGateway](https://img.shields.io/badge/API_Gateway-EE77AA?logo=amazon-apigateway&logoColor=white&style=for-the-badge)

**Powered by Generative AI & Machine Learning on AWS**  
*By Orli Dun* ✨

---

![Project Demo](https://img.shields.io/badge/Status-🚀_Production-28a745?style=for-the-badge) ![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)
![Architecture](https://img.shields.io/badge/Architecture-Serverless-64B589?style=for-the-badge)
![AI_Models](https://img.shields.io/badge/AI_Models-2_Unique-9C27B0?style=for-the-badge)

</div>

---

## 📚 Table of Contents

1. [✨ Project Description](#1-project-description)
2. [🏗️ Architecture Overview](#2-architecture-overview)
3. [🔧 AWS Services & Technologies](#3-aws-services--technologies)
4. [🤖 Selected AI Models](#4-selected-ai-models)
5. [📦 Installation Guide](#5-installation-guide)
6. [⚙️ Configuration Details](#6-configuration-details)
7. [🚀 Deployment Process](#7-deployment-process)
8. [🧪 Testing Suite](#8-testing-suite)
9. [💰 Cost Management](#9-cost-management)
10. [🗑️ Cleanup Instructions](#10-cleanup-instructions)
11. [🎓 Lessons Learned](#11-lessons-learned)

---

## 1. 🌟 Project Description

**Community Pulse AI** es una aplicación **serverless** que analiza retroalimentación de comunidades utilizando una combinación innovadora de **Machine Learning** y **Generative AI** en AWS. 🚀

### 🔍 ¿Qué hace exactamente?

Esta aplicación revolucionaria procesa comentarios de la comunidad (hasta **50 comentarios por solicitud**) y proporciona un análisis completo y accionable:

| � Funcionalidad | � Detalles Técnicos | 📊 Resultado |
|-----------------|---------------------|-------------|
| 📌 **Clasificación de Sentimiento** | Usa modelo RoBERTa en SageMaker para identificar sentimiento de cada comentario | 🟢 Positivo, 🟡 Neutral, 🔴 Negativo |
| 📊 **Cálculo de Métricas** | Genera recuentos y porcentajes de cada categoría de sentimiento | 📈 Distrubución visual de sentimientos |
| 🧠 **Resumen Narrativo** | Bedrock genera un resumen cohesivo de toda la retroalimentación | 📝 Resumen ejecutivo automatizado |
| 🗺️ **Identificación de Tópicos** | Extrae y agrupa automáticamente los temas principales | 🗺️ Mapa de temas detectados |
| 💡 **Insights Accionables** | Identifica hallazgos específicos y significativos | 🎯 Insights respaldados por datos |
| 🛠️ **Recomendaciones** | Propone acciones concretas para managers de comunidad | 📋 Plan de acción automatizado |

### 🤝 ¿Por qué SageMaker + Bedrock JUNTOS?

Esta arquitectura combina lo mejor de ambos mundos:

| 🔍 **Requerimiento** | 🛠️ **Servicio** | 📖 **Razón** |
|---------------------|----------------|-------------|
| 📏 Clasificación determinista | **SageMaker** | ML rápido, determinista, bajo costo por llamada, modelo especializado |
| 🧠 Generación y razonamiento | **Bedrock** | Generativo, maneja razonamiento abierto, sin entrenamiento necesario |
| 💰 Optimización de costos | **Combinación** | Prompt pequeño en Bedrock usando datos estructurados, mejora calidad y reduce tokens |

> 💡 **Ingeniería Inteligente**: Usar SageMaker para clasificación mantiene el prompt de Bedrock pequeño y enfocado — el modelo recibe datos estructurados de sentimiento en lugar de texto crudo, mejorando la calidad y reduciendo costos de tokens.

---

## 2. 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│              🌐 USER BROWSER (React + TypeScript)                   │
│        📱 Frontend interactivo en Amplify/S3+CloudFront            │
└──────────────────────────┬──────────────────────────────────────────┘
                           │ 📤 HTTPS POST /analyze
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│              🌐 Amazon API Gateway (REST API)                       │
│          🔐 POST /analyze → Lambda Proxy Integration                │
│        ⚡ Throttle: 10 rps / burst 20 (protección automática)      │
└──────────────────────────┬──────────────────────────────────────────┘
                           │ ⚡ Invoke
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│        💫 AWS Lambda (Python 3.12, 512 MB, 60s timeout)             │
│      🎯 community-pulse-analyzer (orquestador inteligente)          │
│                                                                      │
│   1. ✅ Validate request (1-50 comments, max 2000 chars each)       │
│   2. 🧪 Call SageMaker endpoint per comment                         │
│   3. 📊 Aggregate sentiment results                                 │
│   4. 🤖 Call Bedrock Converse API                                   │
│   5. 📦 Return unified JSON response                                │
└──────────┬──────────────────────────────┬───────────────────────────┘
           │ InvokeEndpoint               │ Converse
           ▼                              ▼
┌──────────────────────┐    ┌─────────────────────────────────────────┐
│  🧠 Amazon SageMaker │    │  🤖 Amazon Bedrock                     │
│  Serverless Endpoint │    │  🎯 amazon.nova-lite-v1:0               │
│                      │    │                                         │
│  🏷️ cardiffnlp/      │    │  📥 Input: comments + sentiment results│
│  twitter-roberta-    │    │  📤 Output (JSON):                      │
│  base-sentiment      │    │   - 📝 summary                          │
│                      │    │   - 🗺️ main_topics[]                    │
│  3 classes:          │    │   - 💡 insights[]                        │
│  negative / neutral  │    │   - 🛠️ suggested_actions[]              │
│  / positive          │    │                                          │
│                      │    │  🔌 API: Converse (no InvokeModel)       │
│  💾 3072 MB serverless │    │  🌡️ Temp: 0.3 / Max tokens: 1024       │
│  ⚡ Max concurrency: 5 │    │                                       │
└──────────────────────┘    └─────────────────────────────────────────┘
           │                              │
           └──────────────┬───────────────┘
                          ▼
┌─────────────────────────────────────────────────────────────────────┐
│              📊 Amazon CloudWatch (monitoring comprehensive)        │
│   📝 Logs: /aws/lambda/community-pulse-analyzer                     │
│   📝 Logs: /aws/apigateway/community-pulse                          │
│   📈 Metrics: SageMaker endpoint invocation                         │
│   🚨 Alarms: Lambda errors, P99 duration, API 5xx                   │
│   📊 Dashboard: CommunityPulseAI (visualización en tiempo real)     │
└─────────────────────────────────────────────────────────────────────┘
```

### 🎯 Componentes Clave del Flujograma

1. **👤 User Interface**: React + TypeScript con interfaz amigable y responsive
2. **🔄 API Layer**: API Gateway con throttling y validación de seguridad
3. **🧠 Processing Layer**: Lambda como orquestador principal
4. **🤖 ML Layer**: SageMaker para clasificación determinista
5. **✨ GenAI Layer**: Bedrock para generación de insights inteligentes
6. **📊 Monitoring**: CloudWatch para observabilidad completa

---

## 3. 🔧 AWS Services & Technologies

### 🌐 AWS Services

| 🔧 Servicio | 📝 Descripción | 🎯 Uso en Proyecto |
|------------|---------------|-------------------|
| 📊 **Amazon SageMaker** | Plataforma ML completa | Endpoint serverless con modelo RoBERTa (3072 MB, 5 concurrencia) |
| 🤖 **Amazon Bedrock** | LLMs y modelos generativos | amazon.nova-lite-v1:0 para insights generativos |
| ⚡ **AWS Lambda** | Computing serverless | Orquestador Python 3.12 (512 MB, 60s timeout) |
| 🌐 **Amazon API Gateway** | API RESTful | Endpoints protegidos con CORS y throttling (10 rps) |
| 📝 **Amazon CloudWatch** | Monitoring y logging | Logs, métricas, alarmas y dashboards |
| 🗄️ **AWS CDK** | IaC (Infrastructure as Code) | Despliegue automatizado de toda la infraestructura |

### 🛠️ Technologies

| 📦 Technology | 📝 Version | 🎯 Purpose |
|--------------|-----------|-----------|
| 🐍 Python | 3.12 | Backend Lambda |
| 🌐 TypeScript | Latest | Frontend React |
| ⚛️ React | Latest | UI interactiva |
| 📦 AWS CDK | v2 | IaC Python |
| 🧪 pytest | Latest | Testing automatizado |
| 📝 Amplify | Latest | Hosting frontend |

---

## 4. 🤖 Selected AI Models

### 🧠 SageMaker: `cardiffnlp/twitter-roberta-base-sentiment`

| 📊 Característica | 🔍 Detalles |
|------------------|------------|
| 🏷️ **Modelo** | RoBERTa (Recursion-optimized BERT) |
| 📚 **Entrenamiento** | HuggingFace PyTorch Inference Deep Learning Container |
| 🌍 **Datos** | 58M+ tweets procesados |
| 🎯 **Clases** | 🟡 `negative`, 🟡 `neutral`, 🟢 `positive` |
| 🚀 **Ventaja** | Sin trucos artificiales de thresholding, clases nativas |
| 💪 **Rendimiento** | Optimizado para feedback informal de comunidades |

### 🎨 Bedrock: `amazon.nova-lite-v1:0`

| 📊 Característica | 🔍 Detalles |
|------------------|------------|
| 🏷️ **Modelo** | Amazon Nova Lite |
| 💰 **Costo** | $0.00006/1K tokens (input) / $0.00024/1K tokens (output) |
| 🌐 **Accesibilidad** | ON_DEMAND sin cross-region inference profile |
| 🔌 **API** | Converse API (no InvokeModel) |
| 🧪 **Temperatura** | 0.3 (determinista pero creativo) |
| 📝 **Tokens** | Max 1024 tokens de output |
| 🎯 **Usos** | Sumarización, tópicos, insights y recomendaciones |

---

## 5. 📦 Installation Guide

### 🔧 Backend Setup

```bash
# Navegar al directorio backend
cd backend

# Instalar dependencias Lambda
pip install -r lambda/requirements.txt

# Instalar testing
pip install pytest pytest-cov
```

### 🏗️ Infrastructure Setup

```bash
# Navegar al directorio infrastructure
cd infrastructure

# Crear y activar entorno virtual
python -m venv .venv
source .venv/bin/activate  # En Windows: .venv\Scripts\activate

# Instalar dependencias
pip install -r requirements.txt
```

### 🎨 Frontend Setup

```bash
# Navegar al directorio frontend
cd frontend

# Instalar dependencias
npm install
```

---

## 6. ⚙️ Configuration Details

### 🔑 Infrastructure Environment Variables

Crear archivo `infrastructure/.env` con:

```env
CDK_DEFAULT_REGION=us-east-2
CDK_DEFAULT_ACCOUNT=123456789012
BEDROCK_MODEL_ID=amazon.nova-lite-v1:0
```

### 🔑 Frontend Environment Variables

Crear archivo `frontend/.env.local` con:

```env
REACT_APP_API_URL=https://YOUR_API_ID.execute-api.us-east-2.amazonaws.com/prod/
```

> ⚠️ **Importante**: Reemplazar `YOUR_API_ID` con el ID real de API Gateway generado en el despliegue.

---

## 7. 🚀 Deployment Process

### 📋 Pre-requisitos

1. **AWS Credentials** configurados (`aws configure`)
2. **CDK CLI** instalado (`npm install -g aws-cdk`)
3. **Python 3.12+** instalado
4. **Node.js 18+** instalado

### 🔥 Deployment Steps

#### Paso 1: Habilitar Acceso Bedrock

1. Ir a [AWS Console → Bedrock](https://console.aws.amazon.com/bedrock)
2. Click en **Model access**
3. Habilitar **Amazon Nova Lite** (`amazon.nova-lite-v1:0`)

#### Paso 2: Bootstrapping CDK

```bash
cd infrastructure
cdk bootstrap aws://YOUR_ACCOUNT/us-east-2
```

#### Paso 3: Desplegar Stack

```bash
cdk deploy
```

> ⏱️ Este proceso tarda ~15-20 minutos creando todos los recursos.

#### Paso 4: Desplegar Frontend

```bash
cd ../frontend
npm run build

# Subir a S3/CloudFront manualmente o usar Amplify
```

---

## 8. 🧪 Testing Suite

### 🧪 Backend Unit Tests

```bash
pytest backend/tests/ -v --cov=backend/lambda
```

**Coverage**: 54 unit tests con **cero requerimientos de credenciales AWS**

### 🧪 Infrastructure Tests

```bash
pytest infrastructure/tests/ -v
```

**Validación**: Verificación completa de recursos CDK

### 🧪 Manual Testing

```bash
# Test con curl
curl -X POST https://YOUR_API.execute-api.us-east-2.amazonaws.com/prod/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "comments": [
      "This product is amazing! 🎉",
      "Could be better, but okay.",
      "Terrible experience, never again."
    ]
  }'
```

---

## 9. 💰 Cost Management

### 💵 Estimación Mensual (500 batches/month)

| 🔧 Servicio | 📊 Uso | 💰 Costo Estimado |
|------------|-------|------------------|
| 🧠 SageMaker | 500 invocations | ~$0.05 |
| 🤖 Bedrock | ~10K tokens | ~$0.30 |
| ⚡ Lambda | ~500 invocations | ~$0.20 |
| 🌐 API Gateway | ~500 requests | ~$3.50 |
| 📊 CloudWatch | 1 mes retention | ~$0.60 |
| **>Total** | | **~$4.65/mes** |

### 💡 Estrategias de Optimización

| 🎯 Estrategia | 📝 Implementación |
|--------------|-----------------|
| 📉 Scaling automático | SageMaker escala a 0 cuando está idle |
| 💰 Free tier | Lambda y API Gateway tienen tier gratuito |
| 📊 Retention control | Configurar CloudWatch para short retention |
| 📝 Token optimization | Prompts minimalistas en Bedrock |

### 📈 Cost Monitoring

- **CloudWatch Alarms**: Configuradas para latencia y errores
- **Budget Alarms**: Recomendado crear en AWS Budgets
- **Cost Explorer**: Usar para tracking detallado

---

## 10. 🗑️ Cleanup Instructions

### 🔥 Complete Cleanup

```bash
cd infrastructure
cdk destroy
```

> ⚠️ **Advertencia**: Esto destruirá todos los recursos AWS creados.

### 🧹 Manual Cleanup

1. Eliminar CloudWatch Dashboards manualmente
2. Limpiar S3 buckets (frontend build)
3. Verificar Lambda layers no quedaron huérfanos

---

## 11. 🎓 Lessons Learned

### 🎯 Key Takeaways

| 📚 Lección | 💡 Detalles |
|-----------|------------|
| 🏷️ **3-Class Sentiment** | Modelo nativo 3-clases (RoBERTa) es superior a thresholding 2-clases (DistilBERT SST-2) |
| 🔌 **Converse API** | Bedrock Converse API proporciona JSON enforcement limpio y swapping de modelos uniforme |
| 🌡️ **Cold Starts** | UX frontend debe comunicar 30-60s wake-up de containers serverless |
| 🧩 **Decoupling** | Separar ML de GenAI reduce costos de tokens y aumenta precisión |
| 📊 **Structured Input** | Datos estructurados en prompts mejoran calidad de output generativo |

---

## 🙌 Credits & Acknowledgments

**Designed & Developed by**  
✨ **Orli Dun** ✨

*AI Engineer | Machine Learning Specialist | AWS Solutions Architect*

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🤝 Contributing

Contributions, issues and feature requests are welcome!

---

<div align="center">

### 💖 Thanks for checking out Community Pulse AI!

**Made with ❤️ and Generative AI by Orli Dun**

---

![GitHub](https://img.shields.io/badge/GitHub-orlidun-181717?logo=github&logoColor=white&style=flat)

</div>

---

*🚀 Proyectado para el futuro con inteligencia artificial y machine learning en la nube de AWS*
