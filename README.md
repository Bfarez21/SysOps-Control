#  SysOps-Control

**SysOps-Control** es un ecosistema de monitoreo, telemetría y automatización *headless* para infraestructura basada en Docker, desplegado íntegramente sobre microservicios containerizados.

---

##  Resultados e Impacto Operativo

Este proyecto transforma la administración tradicional de servidores en un flujo moderno, eficiente y remoto:

* **Eliminación del Acceso por SSH:** Reduce la dependencia de la consola de comandos (`top`, `htop`, `docker ps`) al concentrar el estado del procesador, memoria y uptime del servidor Ubuntu en un único dashboard web.
* **Reducción del Tiempo de Respuesta (MTTR):** Permite reiniciar o detener contenedores instantáneamente desde la interfaz gráfica sin ejecutar comandos manuales en el terminal.
* **Monitoreo Proactivo Ubicuo:** Gracias al flujo *event-driven* con n8n, el equipo de TI recibe notificaciones instantáneas en Telegram ante la caída de cualquier servicio, incluyendo el timestamp exacto en hora local (`America/Guayaquil`), permitiendo la toma de decisiones desde cualquier lugar y dispositivo.
* **Infraestructura Desacoplada y Portable:** Al estar 100% containerizado con Docker Compose y variables de entorno parametrizadas, el stack se despliega en cuestión de segundos en cualquier servidor Linux.

---
##  Arquitectura del Sistema

- **Frontend:** Next.js 16 + Tailwind CSS (Dashboard interactivo en tiempo real).
- **Backend:** Express.js + Dockerode (lectura directa de `/var/run/docker.sock` y métricas del sistema).
- **Motor de automatización:** n8n (orquestación de flujos de trabajo y notificaciones).
- **Base de datos:** PostgreSQL 15 (persistencia de datos para n8n y métricas).
- **Alertamiento:** bot de Telegram para notificaciones inmediatas de caída de servicios.

---

##  Estructura del Proyecto

```text
SysOps-Control/
├── apps/
│   ├── api/        # Backend Node.js / Express
│   └── web/        # Frontend Next.js (Dashboard Web)
└── docker/
    ├── .env        # IP y variables del servidor
    └── docker-compose.yml
```

---

##  Variables de Entorno

### 1. Archivo `docker/.env`

```env
SERVER_IP=192.168.18.82
```

### 2. Archivo `apps/api/.env`

```env
PORT=3001
DOCKER_SOCKET_PATH=/var/run/docker.sock
N8N_WEBHOOK_URL=http://sysops-n8n:5678/webhook/container-alert
```

---

##  Despliegue Rápido

1. **Clonar el repositorio y entrar a la carpeta de orquestación:**

```bash
git clone https://github.com/Bfarez21/SysOps-Control.git
cd SysOps-Control/docker
```

2. **Configurar la IP de tu servidor en `docker/.env`:**

```env
SERVER_IP=TU_IP_LOCAL
```

3. **Construir y levantar todo el stack:**

```bash
docker compose up -d --build
```

---

##  Servicios Expuestos

- **Dashboard Web:** `http://<SERVER_IP>:3000`
- **API REST Telemetría:** `http://<SERVER_IP>:3001/api/metrics`
- **Panel de n8n:** `http://<SERVER_IP>:5678`
- **PostgreSQL:** puerto `5432`

---

##  Flujo de Alertas (Telegram)

1. El backend monitorea el estado de los contenedores a través del socket Unix de Docker.
2. Si un contenedor cambia su estado a `EXITED`, la API envía un Webhook en tiempo real (con zona horaria `America/Guayaquil`) a n8n.
3. n8n procesa la alerta y envía la notificación inmediata al canal o bot de Telegram configurado.
