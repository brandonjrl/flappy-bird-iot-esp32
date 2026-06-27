# 🎮 Taller Flappy Bird IoT - Guía de Proyectos

Este espacio de trabajo contiene un ecosistema de proyectos diseñados para experimentar con Internet de las Cosas (IoT), protocolos de comunicación inalámbrica y telemetría industrial en tiempo real. 

Utilizando el clásico juego **Flappy Bird** y placas de desarrollo **ESP32**, explorarás arquitecturas locales de ultra baja latencia frente a arquitecturas distribuidas en la nube.

> 📝 **Nota**: Puedes consultar el [prompt original utilizado para la generación del clon de Flappy Bird aquí](./PROMPT.md).

---

## 📂 Estructura del Workspace

El taller se divide en tres proyectos de software independientes:

```text
Workshop/
├── 📡 project-mqtt/        # Edición Cloud utilizando un broker MQTT externo (HiveMQ)
├── ⚡ project-espnow/      # Edición Local de ultra baja latencia con ESP-NOW + Web Serial
└── 📊 Dashboard/           # Panel industrial para visualizar KPIs de hardware y leaderboard
```

### 1. [📡 project-mqtt](./project-mqtt/README.md)
- **Descripción**: Control inalámbrico a través de Internet. El ESP32 se conecta al WiFi local y envía la señal de salto a un broker público de MQTT en la nube. El juego en el navegador escucha el broker por WebSockets.
- **Latencia**: Media-alta (~150 - 500 ms) dependiente de tu conexión a Internet.
- **Hardware necesario**: 1x ESP32 + 1x Pulsador físico.
- **Ideal para**: Demostraciones remotas (el control y la pantalla pueden estar en continentes distintos).

### 2. [⚡ project-espnow](./project-espnow/README.md)
- **Descripción**: Control inalámbrico local de latencia casi nula. Un ESP32 emisor envía el comando por radiofrecuencia (ESP-NOW) a un ESP32 receptor conectado por USB a tu PC. El juego lee el puerto serie directo con la Web Serial API.
- **Latencia**: Virtualmente imperceptible (~1 - 2 ms). Respuesta inmediata.
- **Hardware necesario**: 2x ESP32 + 1x Pulsador físico.
- **Ideal para**: Competiciones y juego preciso donde cada milisegundo cuenta.

### 3. [📊 Dashboard](./Dashboard/README.md)
- **Descripción**: Panel de monitoreo tipo SCADA / Industria 4.0. Se conecta con **Supabase** para recibir telemetría de vuelo del ave en vivo (Broadcast) y sincronizar una tabla de clasificación (Leaderboard) global.
- **Características**: Gráficas de rendimiento en tiempo real, latencias históricas, señal WiFi (dBm), temperatura/batería simulada del dispositivo y consola de logs.
---

## 🏎️ Tabla Comparativa de Conectividad

| Módulo/Edición | Protocolo Primario | Latencia Promedio | Depende de Internet | Placas Requeridas |
| :--- | :--- | :--- | :--- | :--- |
| **`project-espnow`** | ESP-NOW + Web Serial | **~1-2 ms** | ❌ No | 2x ESP32 + Botón |
| **Teclado / Local** | Entrada USB HID estándar | **~4-8 ms** | ❌ No | Ninguna (Teclado) |
| **`project-mqtt`** | MQTT sobre WebSockets | **~150-400 ms** |  Sí | 1x ESP32 + Botón |

---

## 🗄️ Integración con Supabase (Base de Datos e Hilos en Tiempo Real)

Tanto la edición `project-espnow` como el `Dashboard` utilizan **Supabase** como backend en la nube para persistir récords de puntuación y habilitar canales de comunicación web interactivos.

### 1. ¿Cómo crear un proyecto en Supabase?
1. Ingresa a [Supabase](https://supabase.com/) y regístrate o inicia sesión.
2. Haz clic en el botón **"New Project"** y selecciona tu organización (o crea una nueva).
3. Ingresa el **Name** (Nombre) del proyecto, define una **Database Password** (Contraseña) segura y elige la **Region** más cercana a ti.
4. Haz clic en **"Create new project"** y espera unos minutos a que se aprovisione la infraestructura.
5. Una vez creado, ve al menú lateral izquierdo, selecciona **Project Settings** (el ícono de engranaje) y entra al apartado **API**. Allí encontrarás tu `Project URL` y tu `anon public key`, que usarás en el paso de Variables de Entorno.

### 2. ¿Cómo se hace la conexión en el código?
Para que el proyecto en React se comunique con Supabase, se utiliza la librería oficial `@supabase/supabase-js`. 

El cliente se inicializa leyendo las variables de entorno. Dependiendo del proyecto, encontrarás la configuración en:
- En `Dashboard`: archivo `src/supabaseClient.js`
- En `project-espnow`: archivo `src/lib/supabaseClient.js`

El código de inicialización es el siguiente:

```javascript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Se crea y exporta el cliente para utilizarlo en la aplicación
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

Luego, en cualquier componente que lo requiera, se importa `supabase` para realizar consultas a la base de datos o suscribirse a eventos en tiempo real.

### 3. Estructura de Tablas SQL
Crea las siguientes tablas ejecutando estas consultas en el **SQL Editor** de tu panel de Supabase:

> [!TIP]
> Para facilitar este proceso, puedes abrir el archivo [`supabase_schema.sql`](./supabase_schema.sql) que está en la raíz de este proyecto. Simplemente copia su contenido y pégalo directamente en el editor SQL de Supabase para crear la base de datos de inmediato.

#### A. Tabla de Puntuaciones (`scores`)
```sql
create table public.scores (
  id bigint generated by default as identity primary key,
  player_name text not null,
  score integer not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Habilitar seguridad de nivel de fila (RLS) para lectura/escritura pública
alter table public.scores enable row level security;
create policy "Allow public read access" on public.scores for select using (true);
create policy "Allow public insert access" on public.scores for insert with check (true);
```

#### B. Tabla de Pruebas (`test_table`)
```sql
create table public.test_table (
  id uuid default gen_random_uuid() primary key,
  mensaje text,
  creado_en timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Habilitar RLS pública para depuración rápida de inserciones
alter table public.test_table enable row level security;
create policy "Allow public read access" on public.test_table for select using (true);
create policy "Allow public insert access" on public.test_table for insert with check (true);
```

### 4. Configuración de Variables de Entorno
Crea un archivo de variables de entorno en la raíz de cada proyecto (`.env` para el `Dashboard` y `.env.local` para `project-espnow`) e incluye las credenciales exactas del proyecto:
```env
VITE_SUPABASE_URL="https://pbsyaszrbckyxqqucelb.supabase.co"
VITE_SUPABASE_ANON_KEY="sb_publishable_IZ76KqkNxaoMiSReMOtaVA_On7WMdRG"
```

### 5. Telemetría Reactiva (Supabase Broadcast)
- Los datos de vuelo, saltos y KPIs que ves en el Dashboard no se graban en la base de datos de manera constante para evitar saturación de almacenamiento. En su lugar, viajan a través de los Edge Servers de Supabase usando **Realtime Broadcast** de forma instantánea.
- El Leaderboard del Dashboard se auto-actualiza reactivamente escuchando eventos `postgres_changes` en la tabla `scores`. En el momento exacto en que un jugador pierde y el juego inserta su score, el Dashboard reorganiza la tabla de posiciones.

---

## 🚀 Guía Rápida de Inicio

Cada proyecto web se inicia de forma independiente. Por ejemplo, para arrancar cualquiera de ellos (`project-espnow`, `project-mqtt` o `Dashboard`):

1. Abre una terminal en la carpeta correspondiente:
   ```bash
   cd project-espnow
   ```
2. Instala las dependencias necesarias:
   ```bash
   npm install
   ```
3. Ejecuta el servidor de desarrollo en modo local:
   ```bash
   npm run dev
   ```
4. Abre tu navegador en la URL indicada por la consola (usualmente [http://localhost:5173](http://localhost:5173)).
