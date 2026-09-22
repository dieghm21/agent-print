# 🚀 Configuración Avanzada

## Tabla de Contenidos

1. [Seguridad](#seguridad)
2. [Balanceo de Carga](#balanceo-de-carga)
3. [Monitoreo Avanzado](#monitoreo-avanzado)
4. [Performance](#performance)
5. [Integración con Bases de Datos](#integración-con-bases-de-datos)
6. [Escalabilidad](#escalabilidad)

## Seguridad

### 1. Autenticación Bearer Token

Crea un middleware personalizado en `src/middleware/auth.js`:

```javascript
const auth = (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  const validTokens = process.env.VALID_TOKENS?.split(',') || [];
  
  if (!token || !validTokens.includes(token)) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized'
    });
  }
  
  next();
};

module.exports = auth;
```

Usa en `src/index.js`:

```javascript
const auth = require('./middleware/auth');
app.use('/api/print', auth);
app.use('/api/printers', auth);
```

En `.env`:

```env
VALID_TOKENS=token-123,token-456,token-789
```

### 2. HTTPS/TLS

Para producción, usa un proxy reverso (nginx):

```nginx
upstream printer_agent {
  server localhost:3001;
}

server {
  listen 443 ssl http2;
  server_name printer.miempresa.com;
  
  ssl_certificate /etc/ssl/certs/cert.pem;
  ssl_certificate_key /etc/ssl/private/key.pem;
  
  location / {
    proxy_pass http://printer_agent;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

### 3. Rate Limiting

Instala express-rate-limit:

```bash
npm install express-rate-limit
```

En `src/index.js`:

```javascript
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // 100 requests por ventana
  message: 'Demasiadas solicitudes, intenta más tarde'
});

app.use('/api/', limiter);
```

### 4. CORS Restrictivo

En `.env`:

```env
CORS_ORIGIN=https://tuapp.com,https://admin.tuempresa.com
```

En `src/index.js`:

```javascript
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(','),
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

## Balanceo de Carga

### PM2 con Cluster Mode

Instala PM2:

```bash
npm install -g pm2
```

Crea `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [{
    name: 'thermal-printer-agent',
    script: './src/index.js',
    instances: 4, // Número de instancias
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production'
    },
    // Reiniciar si usa >500MB RAM
    max_memory_restart: '500M',
    
    // Logs
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    
    // Graceful shutdown
    kill_timeout: 10000,
    wait_ready: true,
    
    // Monitoreo
    max_restarts: 10,
    min_uptime: '10s'
  }]
};
```

Usa:

```bash
pm2 start ecosystem.config.js
pm2 monit          # Monitoreo en tiempo real
pm2 logs            # Ver logs
pm2 restart all     # Reiniciar todas las instancias
pm2 stop all        # Detener
pm2 save            # Guardar configuración
pm2 startup         # Iniciar con el sistema
```

### Nginx como Proxy Reverso

```nginx
upstream printer_agents {
  least_conn;
  server localhost:3001;
  server localhost:3002;
  server localhost:3003;
}

server {
  listen 80;
  server_name api.printers.com;
  
  location /api {
    proxy_pass http://printer_agents;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
    
    # Timeouts
    proxy_connect_timeout 60s;
    proxy_send_timeout 60s;
    proxy_read_timeout 60s;
  }
}
```

## Monitoreo Avanzado

### Prometheus Metrics

Instala prometheus client:

```bash
npm install prom-client
```

Crea `src/utils/metrics.js`:

```javascript
const client = require('prom-client');

const printJobsTotal = new client.Counter({
  name: 'print_jobs_total',
  help: 'Total de trabajos de impresión',
  labelNames: ['status', 'printer']
});

const printJobDuration = new client.Histogram({
  name: 'print_job_duration_seconds',
  help: 'Duración de trabajos de impresión',
  buckets: [1, 5, 10, 30, 60]
});

const queueSize = new client.Gauge({
  name: 'print_queue_size',
  help: 'Tamaño de la cola de impresión'
});

module.exports = {
  printJobsTotal,
  printJobDuration,
  queueSize,
  register: client.register
};
```

En `src/routes/health.js`:

```javascript
const metrics = require('../utils/metrics');

router.get('/metrics', (req, res) => {
  res.set('Content-Type', metrics.register.contentType);
  res.end(metrics.register.metrics());
});
```

### Grafana Dashboard

1. Configura Prometheus para scraping:

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'printer-agent'
    static_configs:
      - targets: ['localhost:3001']
    metrics_path: '/api/health/metrics'
    scrape_interval: 15s
```

2. Crea dashboard en Grafana con queries como:

```promql
# Trabajos por segundo
rate(print_jobs_total[1m])

# Promedio de duración
histogram_quantile(0.95, rate(print_job_duration_seconds_bucket[5m]))

# Cola actual
print_queue_size
```

## Performance

### Compresión GZIP

En `src/index.js`:

```javascript
const compression = require('compression');
app.use(compression());
```

### Caching

```javascript
router.get('/printers', (req, res) => {
  res.set('Cache-Control', 'public, max-age=300'); // 5 minutos
  // ... resto del código
});
```

### Connection Pooling

Para operaciones de base de datos:

```javascript
const pool = new ConnectionPool({
  max: 10,
  idleTimeoutMillis: 30000
});
```

## Integración con Bases de Datos

### SQLite para Historial de Trabajos

```bash
npm install sqlite3
```

Crea `src/db/database.js`:

```javascript
const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./printer-history.db');

const initDB = () => {
  db.run(`
    CREATE TABLE IF NOT EXISTS print_jobs (
      id TEXT PRIMARY KEY,
      printer_id TEXT NOT NULL,
      job_type TEXT NOT NULL,
      status TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      completed_at DATETIME,
      error TEXT
    )
  `);
};

const savePrintJob = (job) => {
  return new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO print_jobs 
       (id, printer_id, job_type, status, created_at) 
       VALUES (?, ?, ?, ?, ?)`,
      [job.id, job.printerId, job.type, job.status, job.createdAt],
      (err) => err ? reject(err) : resolve()
    );
  });
};

module.exports = { initDB, savePrintJob, db };
```

### MongoDB para Análisis

```bash
npm install mongoose
```

```javascript
const mongoose = require('mongoose');

const printJobSchema = new mongoose.Schema({
  jobId: String,
  printerId: String,
  type: String,
  status: String,
  createdAt: Date,
  completedAt: Date,
  duration: Number,
  error: String
});

const PrintJob = mongoose.model('PrintJob', printJobSchema);

module.exports = PrintJob;
```

## Escalabilidad

### Redis para Cola Distribuida

```bash
npm install redis
```

```javascript
const redis = require('redis');
const client = redis.createClient({
  host: 'localhost',
  port: 6379
});

// Encolar trabajo
async function enqueueJob(job) {
  await client.lpush('print-queue', JSON.stringify(job));
}

// Procesar trabajos
async function processQueue() {
  while (true) {
    const jobData = await client.rpop('print-queue');
    if (jobData) {
      const job = JSON.parse(jobData);
      await executeJob(job);
    }
    await new Promise(r => setTimeout(r, 100));
  }
}
```

### Múltiples Instancias con Redis Pub/Sub

```javascript
const pubsub = redis.createPubSub();

// Publicar evento
pubsub.publish('printer-events', JSON.stringify({
  type: 'job-completed',
  jobId: job.id
}));

// Suscribirse
pubsub.subscribe('printer-events', (message) => {
  console.log('Evento:', message);
});
```

### Docker Compose para Ambiente Completo

Crea `docker-compose.yml`:

```yaml
version: '3.8'

services:
  printer-agent:
    build: .
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - REDIS_URL=redis://redis:6379
    depends_on:
      - redis
      - mongodb
    volumes:
      - ./logs:/app/logs

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  mongodb:
    image: mongo:5
    ports:
      - "27017:27017"
    environment:
      - MONGO_INITDB_DATABASE=printer_db

  prometheus:
    image: prom/prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml

  grafana:
    image: grafana/grafana
    ports:
      - "3000:3000"
    depends_on:
      - prometheus
```

Inicia con:

```bash
docker-compose up -d
```

### Dockerfile

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copiar package.json
COPY package*.json ./
RUN npm ci --only=production

# Copiar código
COPY src ./src
COPY scripts ./scripts

# Crear directorio de logs
RUN mkdir -p ./logs

# Usuario no-root
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001
USER nodejs

EXPOSE 3001

CMD ["node", "src/index.js"]
```

Build:

```bash
docker build -t printer-agent .
docker run -p 3001:3001 printer-agent
```

---

**Nota:** La configuración avanzada es opcional. El agente funciona perfectamente con configuración básica.
