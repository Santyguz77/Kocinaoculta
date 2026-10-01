// Configuración de la API
const API_URL = 'https://kocina.codexisco.dpdns.org/api';
const APP_TIMEZONE = 'America/Bogota';

// Estado global de la aplicación
const AppState = {
	menuItems: [],
	tables: [],
	orders: [],
	transactions: [],
	waiters: [],
	config: {},
	cashClosures: [],
	isOnline: navigator.onLine
};

// Utilidades para LocalStorage
const Storage = {
	get(key) {
		const data = localStorage.getItem(key);
		return data ? JSON.parse(data) : null;
	},
	set(key, value) {
		localStorage.setItem(key, JSON.stringify(value));
	},
	remove(key) {
		localStorage.removeItem(key);
	}
};

// Cliente API - Solo backend, sin localStorage
const API = {
	async getAll(table) {
		try {
			const response = await fetch(`${API_URL}/${table}`, {
				timeout: 10000 // 10 segundos timeout
			});
			if (!response.ok) {
				throw new Error(`HTTP ${response.status}: ${response.statusText}`);
			}
			const data = await response.json();
			return data;
		} catch (error) {
			console.error(`Error obteniendo ${table}:`, error);
			// No mostrar notificación aquí, se maneja en el código llamante
			throw error;
		}
	},

	async save(table, items, retries = 2) {
		for (let i = 0; i <= retries; i++) {
			try {
				const response = await fetch(`${API_URL}/${table}`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(items)
				});
				if (!response.ok) throw new Error(`HTTP ${response.status}`);
				return await response.json();
			} catch (error) {
				if (i === retries) {
					console.error(`Error guardando ${table} después de ${retries + 1} intentos:`, error);
					throw error;
				}
				// Esperar antes de reintentar (500ms, 1000ms)
				await new Promise(resolve => setTimeout(resolve, 500 * (i + 1)));
			}
		}
	},

	async update(table, id, item) {
		try {
			const response = await fetch(`${API_URL}/${table}/${id}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(item)
			});
			if (!response.ok) throw new Error(`HTTP ${response.status}`);
			return await response.json();
		} catch (error) {
			console.error(`Error actualizando ${table}/${id}:`, error);
			throw error;
		}
	},

	async delete(table, id) {
		try {
			const response = await fetch(`${API_URL}/${table}/${id}`, {
				method: 'DELETE'
			});
			if (!response.ok) throw new Error(`HTTP ${response.status}`);
			return await response.json();
		} catch (error) {
			console.error(`Error eliminando ${table}/${id}:`, error);
			throw error;
		}
	}
};

// Utilidades generales
const Utils = {
	generateId() {
		return Date.now().toString(36) + Math.random().toString(36).substr(2);
	},

	formatCurrency(amount) {
		return new Intl.NumberFormat('es-MX', {
			style: 'currency',
			currency: 'MXN',
			minimumFractionDigits: 0,
			maximumFractionDigits: 0
		}).format(amount || 0);
	},

	formatDate(date) {
		return new Intl.DateTimeFormat('es-MX', {
			year: 'numeric',
			month: '2-digit',
			day: '2-digit',
			hour: '2-digit',
			minute: '2-digit'
		}).format(new Date(date));
	},

	getDateKey(date = new Date(), timeZone = APP_TIMEZONE) {
		return new Intl.DateTimeFormat('en-CA', {
			timeZone,
			year: 'numeric',
			month: '2-digit',
			day: '2-digit'
		}).format(date);
	},

	getMonthKey(date = new Date(), timeZone = APP_TIMEZONE) {
		const parts = new Intl.DateTimeFormat('en-CA', {
			timeZone,
			year: 'numeric',
			month: '2-digit'
		}).formatToParts(date);
		const year = parts.find(p => p.type === 'year')?.value || '0000';
		const month = parts.find(p => p.type === 'month')?.value || '01';
		return `${year}-${month}`;
	},

	getDateKeyFromISO(isoString, timeZone = APP_TIMEZONE) {
		if (!isoString) return '';
		return Utils.getDateKey(new Date(isoString), timeZone);
	},

	getMonthKeyFromISO(isoString, timeZone = APP_TIMEZONE) {
		if (!isoString) return '';
		return Utils.getMonthKey(new Date(isoString), timeZone);
	},

	formatDateKeyForChart(dateKey, timeZone = APP_TIMEZONE) {
		if (!dateKey) return '';
		const [year, month, day] = dateKey.split('-').map(Number);
		const anchor = new Date(Date.UTC(year, (month || 1) - 1, day || 1, 12, 0, 0));
		return new Intl.DateTimeFormat('es-MX', {
			timeZone,
			weekday: 'short',
			day: 'numeric'
		}).format(anchor);
	},

	showNotification(message, type = 'info') {
		console.log(`[${type.toUpperCase()}] ${message}`);
		// Solo mostrar alertas para errores críticos
		if (type === 'error') {
			alert(message);
		}
	},

	CATEGORY_ORDER: [
		'ENTRADAS',
		'MORDISCOS',
		'HAMBURGUESAS',
		'PERROS',
		'DESGRANADOS',
		'NACHOS',
		'PAPAS',
		'FUERTES',
		'SODAS ITALIANAS',
		'LIMONADAS NATURALES',
		'GASEOSAS',
		'CERVEZAS',
		'BEBIDAS REFRESCANTES',
		'BEBIDAS',
		'POSTRES',
		'OTROS'
	],

	getCategoryPriority(category) {
		if (!category) return 999;
		const upper = String(category).trim().toUpperCase();
		const idx = Utils.CATEGORY_ORDER.findIndex(cat => upper === cat || upper.includes(cat) || cat.includes(upper));
		return idx !== -1 ? idx : 900;
	},

	sortCategories(categories) {
		return [...categories].sort((a, b) => {
			const prioA = Utils.getCategoryPriority(a);
			const prioB = Utils.getCategoryPriority(b);
			if (prioA !== prioB) return prioA - prioB;
			return String(a).localeCompare(String(b));
		});
	},

	sortMenuItems(items) {
		if (!Array.isArray(items)) return [];
		return [...items].sort((a, b) => {
			const prioA = Utils.getCategoryPriority(a.category);
			const prioB = Utils.getCategoryPriority(b.category);
			if (prioA !== prioB) return prioA - prioB;
			return String(a.name || '').localeCompare(String(b.name || ''));
		});
	}
};

// Registro del Service Worker
if ('serviceWorker' in navigator) {
	window.addEventListener('load', () => {
		navigator.serviceWorker.register('/service-worker.js')
			.then(reg => console.log('✅ Service Worker registrado'))
			.catch(err => console.error('❌ Error en Service Worker:', err));
	});
}

// Detectar cambios en la conexión
window.addEventListener('online', () => {
	AppState.isOnline = true;
	console.log('✅ Conexión restaurada');
});

window.addEventListener('offline', () => {
	AppState.isOnline = false;
	console.warn('⚠️ Sin conexión al servidor');
});

// Cargar datos iniciales - Solo desde backend
async function loadInitialData() {
	try {
		const [menuItems, tables, orders, transactions, waiters, configArray] = await Promise.all([
			API.getAll('menu_items'),
			API.getAll('tables'),
			API.getAll('orders'),
			API.getAll('transactions'),
			API.getAll('waiters'),
			API.getAll('config')
		]);

		AppState.menuItems = menuItems;
		AppState.tables = tables;
		AppState.orders = orders;
		AppState.transactions = transactions;
		AppState.waiters = waiters;
		AppState.config = configArray.length > 0 ? configArray[0] : {};

		try {
			AppState.cashClosures = await API.getAll('cash_closures');
		} catch (err) {
			console.warn('⚠️ Tabla cash_closures no disponible');
			AppState.cashClosures = [];
		}
	} catch (error) {
		console.error('Error crítico cargando datos:', error);
		// No limpiar el estado si falla la carga para conservar lo que haya en memoria (si aplica)
		throw error;
	}
}

// Datos oficiales de la carta UMBRAL GASTROBAR
const UMBRAL_DEFAULT_MENU = [
	// ENTRADAS
	{ name: 'Chorizo en reducción de panela', category: 'ENTRADAS', price: 16000, cost: 6000, description: 'Chorizo artesanal bañado en reducción de panela', available: true },
	{ name: 'Snack de pollo crocante', category: 'ENTRADAS', price: 16000, cost: 6000, description: 'Snack de pollo crocante, papas francesa y mayo de ajo trufada', available: true },
	{ name: 'Patacones', category: 'ENTRADAS', price: 12000, cost: 4000, description: 'Acompañados de hogao y suero costeño', available: true },

	// HAMBURGUESAS
	{ name: 'UMBRAL', category: 'HAMBURGUESAS', price: 29000, cost: 10000, description: 'Pan de sémola sellado en mantequilla, mayo de ajo trufada, 140 gr de carne de res a la parrilla, queso gouda, panceta cubierta en glaseado de Jack Daniels, yuca crocante, vegetales frescos y papas a la francesa', available: true },
	{ name: 'TITAN', category: 'HAMBURGUESAS', price: 28000, cost: 9500, description: 'Pan de sémola sellado en mantequilla, 140 gr de carne de res a la parrilla, queso mozzarella, tocineta caramelizada, carne mechada, yuca crispí, vegetales frescos y papas a la francesa', available: true },
	{ name: 'CHAMPIONS', category: 'HAMBURGUESAS', price: 28000, cost: 9500, description: 'Pan de sémola sellado en mantequilla, 140 gr carne de res a la parrilla cubierta en chimichurri, queso mozzarella, tocineta, queso mozzarella apanado, mermelada de tomate, vegetales frescos y papas a la francesa', available: true },
	{ name: 'TENTACION', category: 'HAMBURGUESAS', price: 28000, cost: 9500, description: 'Pan de sémola sellado en mantequilla, 140 gr carne de res, tocineta, queso fundido con maíz tierno, chorizo artesanal, vegetales frescos y papas a la francesa', available: true },
	{ name: 'ESTRELLA', category: 'HAMBURGUESAS', price: 26500, cost: 9000, description: 'Pan de sémola sellado en mantequilla, 140 gr carne de res a la parrilla, queso gouda, tocineta, pollo en tártara, cebolla caramelizada, vegetales frescos y papas a la francesa', available: true },
	{ name: 'CLASICA', category: 'HAMBURGUESAS', price: 20000, cost: 7000, description: 'Pan de sémola sellado en mantequilla, 140 gr carne de res, tocineta, queso gouda, vegetales frescos y papas a la francesa', available: true },

	// PERROS
	{ name: 'MONSTER', category: 'PERROS', price: 24500, cost: 8000, description: 'Pan brioche, salchicha americana, piña caramelizada, tocineta, carne mechada, queso mozzarella y papas a la francesa', available: true },
	{ name: 'CALLEJERO', category: 'PERROS', price: 23500, cost: 7500, description: 'Pan brioche, queso mozzarella, salchicha americana, pollo en tártara, tocineta crispí y papas a la francesa', available: true },

	// DESGRANADOS
	{ name: 'DESGRANADO MIXTO', category: 'DESGRANADOS', price: 26000, cost: 8500, description: 'Pollo mechado, maíz tierno, carne mechada, crema de leche, hogao, queso mozzarella, tocineta y papas a la francesa', available: true },

	// NACHOS
	{ name: 'NACHOS MIXTOS', category: 'NACHOS', price: 28000, cost: 9000, description: 'Nachos crocantes, generosa porción de carne y pollo mechados, queso mozzarella y pico de gallo picante', available: true },

	// PAPAS
	{ name: 'PAPAS DE CERDO', category: 'PAPAS', price: 26000, cost: 8500, description: 'Pork belly laqueado en salsa BBQ Jack Daniels, tocineta crocante con mayo de ajo trufada y papas a la francesa', available: true },
	{ name: 'PAPAS DE POLLO', category: 'PAPAS', price: 24000, cost: 8000, description: 'Chicken tenders en bechamel, tocineta crocante, queso mozzarella fundido, papas a la francesa y tostada de parmesano', available: true },
	{ name: 'PAPAS CLASICAS', category: 'PAPAS', price: 20000, cost: 6500, description: 'Papas francesas bañadas en queso mozzarella, triple tocineta crocante y salchicha', available: true },

	// FUERTES
	{ name: 'SALTEADO DE RES', category: 'FUERTES', price: 35000, cost: 12000, description: 'Lomo de res salteado al estilo umbral (salsa de ostras, vino tinto y soja) con papas a la francesa', available: true },
	{ name: 'PICAÑA', category: 'FUERTES', price: 38000, cost: 14000, description: 'Corte de res a la parrilla, medallón de mantequilla trabajada, papas a la francesa y ensalada fresca', available: true },
	{ name: 'BIFE DE RES', category: 'FUERTES', price: 38000, cost: 14000, description: 'Corte de res parrillado con chimichurri argentino, papas a la francesa y ensalada fresca', available: true },
	{ name: 'SUPREMA DE POLLO', category: 'FUERTES', price: 32000, cost: 11000, description: 'Pollo parrillado gratinado en espejo de salsa cremosa de pollo y mollejas tostadas, papas a la francesa y ensalada', available: true },
	{ name: 'ALAS CROCANTES', category: 'FUERTES', price: 26000, cost: 8500, description: '8 piezas de alas apanadas muy crocantes con salsa a elección (BBQ Jack Daniels, BBQ Picante o Mielmostaza), papas a la francesa y ensalada', available: true },
	{ name: 'CEVICHE DE CHICHARRON', category: 'FUERTES', price: 28000, cost: 9500, description: 'Chicharron crujiente con cebolla morada, pimentón, mango, cilantro y tostones de plátano verde', available: true },
	{ name: 'ENSALADA', category: 'FUERTES', price: 28000, cost: 9000, description: 'Lechuga fresca, mix de quesos (mozzarella, costeño frito, parmesano), pollo en mostaza Dijon, crutones, tomates Cherry, vinagreta mielmostaza, reducción balsámica y tostones', available: true },

	// SODAS ITALIANAS
	{ name: 'Soda Italiana Arándanos', category: 'SODAS ITALIANAS', price: 15000, cost: 4000, description: 'Soda refrescante sabor Arándanos', available: true },
	{ name: 'Soda Italiana Kiwi', category: 'SODAS ITALIANAS', price: 12000, cost: 3500, description: 'Soda refrescante sabor Kiwi', available: true },
	{ name: 'Soda Italiana Lulo', category: 'SODAS ITALIANAS', price: 12000, cost: 3500, description: 'Soda refrescante sabor Lulo', available: true },

	// LIMONADAS NATURALES
	{ name: 'Limonada Cerezada', category: 'LIMONADAS NATURALES', price: 11000, cost: 3000, description: 'Limonada natural con infusión de cereza', available: true },
	{ name: 'Limonada Hierbabuenal', category: 'LIMONADAS NATURALES', price: 9000, cost: 2500, description: 'Limonada natural con hierbabuena fresca', available: true },
	{ name: 'Limonada Natural', category: 'LIMONADAS NATURALES', price: 8000, cost: 2000, description: 'Limonada 100% natural', available: true },

	// GASEOSAS
	{ name: 'Coca-Cola 400 ml', category: 'GASEOSAS', price: 5000, cost: 2500, description: 'Gaseosa Coca-Cola 400 ml', available: true },
	{ name: 'Coca-Cola Zero 400 ml', category: 'GASEOSAS', price: 5000, cost: 2500, description: 'Gaseosa Coca-Cola Zero 400 ml', available: true },
	{ name: 'Ginger 300 ml', category: 'GASEOSAS', price: 5000, cost: 2500, description: 'Ginger Ale 300 ml', available: true },
	{ name: 'Soda 300 ml', category: 'GASEOSAS', price: 5000, cost: 2500, description: 'Soda de agua carbonatada 300 ml', available: true },
	{ name: 'Agua', category: 'GASEOSAS', price: 3000, cost: 1200, description: 'Agua embotellada', available: true },

	// CERVEZAS
	{ name: 'Stella Artois', category: 'CERVEZAS', price: 10000, cost: 5000, description: 'Cerveza Stella Artois', available: true },
	{ name: 'Club Colombia Dorada', category: 'CERVEZAS', price: 8000, cost: 4000, description: 'Cerveza Club Colombia Dorada', available: true }
];

// Inicializar datos de ejemplo SOLO si el servidor confirma que están vacíos
async function initializeDefaultData() {
	if (AppState.menuItems.length === 0) {
		AppState.menuItems = UMBRAL_DEFAULT_MENU.map(item => ({
			id: Utils.generateId(),
			productionCost: 0,
			boxCost: 0,
			...item
		}));
		await API.save('menu_items', AppState.menuItems);
	} else {
		// Migración: Añadir campo cost a productos existentes que no lo tengan
		let needsUpdate = false;
		AppState.menuItems.forEach(item => {
			if (item.cost === undefined) {
				item.cost = 0;
				needsUpdate = true;
			}
		});
		if (needsUpdate) {
			await API.save('menu_items', AppState.menuItems);
		}
	}

	if (AppState.tables.length === 0) {
		AppState.tables = [];
		for (let i = 1; i <= 10; i++) {
			AppState.tables.push({
				id: Utils.generateId(),
				number: i,
				capacity: 4,
				status: 'available', // available, occupied, reserved
				currentOrder: null
			});
		}
		await API.save('tables', AppState.tables);
	}

	if (AppState.waiters.length === 0) {
		AppState.waiters = [
			{
				id: Utils.generateId(),
				name: 'Juan Pérez',
				active: true
			},
			{
				id: Utils.generateId(),
				name: 'María García',
				active: true
			}
		];
		await API.save('waiters', AppState.waiters);
	}
}

// Cargar cierres de caja
async function loadCashClosures() {
	return await API.getAll('cash_closures');
}

// Exportar para uso global
window.AppState = AppState;
window.API = API;
window.Utils = Utils;
window.Storage = Storage;
window.loadInitialData = loadInitialData;
window.initializeDefaultData = initializeDefaultData;
window.loadCashClosures = loadCashClosures;
window.APP_TIMEZONE = APP_TIMEZONE;
