# Sistema PWA para Restaurante

Sistema completo de gestión para restaurantes con PWA (Progressive Web App)

## 🚀 Características

### 📱 Aplicaciones
- **Admin (index.html)**: Panel de control con dashboard, gestión de mesas, pedidos, menú, finanzas y cierre de caja
- **Meseros (meseros.html)**: Interfaz para tomar pedidos por mesa con notas especiales
- **Menú Clientes (Menu.html)**: Vista pública de la carta con precios

### ✨ Funcionalidades
- ✅ PWA instalable (funciona offline)
- ✅ Sistema de mesas con estados (disponible/ocupada)
- ✅ Gestión completa de pedidos
- ✅ Notas especiales en productos
- ✅ Dashboard con estadísticas en tiempo real
- ✅ Configuración de menú (agregar/editar/eliminar productos)
- ✅ Historial de transacciones
- ✅ Cierre de caja diario
- ✅ Generación de PDFs (tickets y cierres)
- ✅ Sincronización con servidor
- ✅ Modo offline con LocalStorage

## 📦 Instalación

### Backend (VPS)

1. Instalar dependencias:
```bash
npm install
```

2. Iniciar servidor:
```bash
npm start
```

El servidor correrá en el puerto 3000 y creará automáticamente la base de datos SQLite.

### Frontend (Netlify)

1. Sube los siguientes archivos a tu repositorio Git:
   - index.html
   - meseros.html
   - Menu.html
   - styles.css
   - app.js
   - manifest.json
   - service-worker.js

2. En Netlify:
   - Conecta tu repositorio
   - Build command: (dejar vacío)
   - Publish directory: `/`

3. **IMPORTANTE**: En `app.js` línea 2, cambia la URL de la API:
```javascript
const API_URL = 'https://tu-vps.com/api'; // Cambiar por tu VPS
```

## 🔧 Configuración

### Estructura de Datos

**menu_items**: Productos del menú
```javascript
{
  id: string,
  name: string,
  description: string,
  category: string,
  price: number,
  available: boolean
}
```

**tables**: Mesas del restaurante
```javascript
{
  id: string,
  number: number,
  capacity: number,
  status: 'available' | 'occupied' | 'reserved',
  currentOrder: string | null
}
```

**orders**: Pedidos
```javascript
{
  id: string,
  tableId: string,
  tableNumber: number,
  items: Array<{
    itemId: string,
    name: string,
    price: number,
    quantity: number,
    notes: string
  }>,
  total: number,
  status: 'pending' | 'completed' | 'cancelled',
  createdAt: string,
  updatedAt: string
}
```

**transactions**: Transacciones financieras
```javascript
{
  id: string,
  orderId: string,
  tableNumber: number,
  amount: number,
  type: 'sale',
  date: string,
  concept: string
}
```

## 🎯 Uso

### Panel de Administración (index.html)
1. Accede al dashboard para ver estadísticas
2. Gestiona mesas desde la sección "Mesas"
3. Configura productos del menú en "Menú"
4. Revisa pedidos activos en "Pedidos"
5. Completa pedidos y genera facturas PDF
6. Consulta finanzas en "Finanzas"
7. Genera cierre de caja diario

### Meseros (meseros.html)
1. Selecciona una mesa
2. Agrega productos del menú al pedido
3. Ajusta cantidades con +/-
4. Agrega notas especiales (ej: "sin cebolla")
5. Guarda el pedido

### Menú Público (Menu.html)
- Los clientes pueden ver la carta completa
- Filtrar por categorías
- Buscar platillos
- Ver precios actualizados

## 📱 PWA

La aplicación es instalable como PWA:
- En móvil: "Agregar a pantalla de inicio"
- En desktop: Icono de instalación en la barra de direcciones
- Funciona offline con datos en caché

## 🔐 Seguridad

- Validación de tablas permitidas en API
- Transacciones SQLite para integridad de datos
- CORS configurado
- Límite de 50MB para body parser

## 🛠️ Tecnologías

- **Frontend**: HTML5, CSS3, JavaScript Vanilla
- **Backend**: Node.js, Express
- **Base de datos**: SQLite
- **PWA**: Service Worker, Manifest
- **PDF**: jsPDF
- **Almacenamiento**: LocalStorage + SQLite

## 📝 Notas

- Los datos se sincronizan automáticamente entre LocalStorage y el servidor
- En modo offline, los cambios se guardan localmente
- Al recuperar conexión, sincroniza automáticamente
- Los PDFs se generan en formato ticket (80mm) para impresoras POS

## 🚀 Próximas Mejoras

- [ ] Autenticación de usuarios
- [ ] Múltiples roles (admin, mesero, cajero)
- [ ] Estadísticas avanzadas con gráficos
- [ ] Notificaciones push
- [ ] Integración con impresora térmica
- [ ] Sistema de propinas
- [ ] Reservaciones
- [ ] Gestión de inventario

## 📄 Licencia

MIT
