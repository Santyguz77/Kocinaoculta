// Configuración de la API
const API_URL = 'https://auction-array-comedy-its.trycloudflare.com/api'; // Cambiar por tu VPS en producción

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
			currency: 'MXN'
		}).format(amount);
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
	
	showNotification(message, type = 'info') {
		console.log(`[${type.toUpperCase()}] ${message}`);
		// Solo mostrar alertas para errores críticos
		if (type === 'error') {
			alert(message);
		}
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
		AppState.menuItems = await API.getAll('menu_items');
		AppState.tables = await API.getAll('tables');
		AppState.orders = await API.getAll('orders');
		AppState.transactions = await API.getAll('transactions');
		AppState.waiters = await API.getAll('waiters');
		
		// Intentar cargar cash_closures, si falla, usar array vacío
		try {
			AppState.cashClosures = await API.getAll('cash_closures');
		} catch (err) {
			console.warn('⚠️ Tabla cash_closures no disponible en el servidor');
			AppState.cashClosures = [];
		}
		
		const configArray = await API.getAll('config');
		AppState.config = configArray.length > 0 ? configArray[0] : {};
	} catch (error) {
		console.error('Error cargando datos iniciales:', error);
		throw error;
	}
}

// Inicializar datos de ejemplo si no existen
async function initializeDefaultData() {
	if (AppState.menuItems.length === 0) {
		AppState.menuItems = [
			{
				id: Utils.generateId(),
				name: 'Hamburguesa Clásica',
				description: 'Carne de res, lechuga, tomate, queso',
				cost: 21000,
				price: 30000,
				category: 'Hamburguesas',
				available: true
			},
			{
				id: Utils.generateId(),
				name: 'Pizza Margarita',
				description: 'Tomate, mozzarella, albahaca',
				cost: 0,
				price: 25000,
				category: 'Pizzas',
				available: true
			},
			{
				id: Utils.generateId(),
				name: 'Ensalada César',
				description: 'Lechuga romana, pollo, crutones, parmesano',
				cost: 0,
				price: 12000,
				category: 'Ensaladas',
				available: true
			}
		];
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
