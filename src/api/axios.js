import axios from 'axios';

// Creamos una instancia centralizada
const api = axios.create({
    baseURL: 'https://api.gigafiber.mx/api',
    // baseURL: 'http://192.168.0.104:8000/api', // La URL de tu API Laravel
    headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
    }
});

// Interceptor: Antes de cada petición, revisa si tenemos el token y lo inyecta
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

api.interceptors.response.use(
    (response) => {
        // Si todo sale bien (Código 200, 201), dejamos pasar la respuesta intacta
        return response;
    },
    (error) => {
        // Si Laravel nos da un portazo con un Error 429...
        if (error.response && error.response.status === 429) {
            
            // Aquí atrapamos el golpe y mostramos un mensaje amigable
            alert("¡Woah, vas muy rápido! 🛑\nPor seguridad el sistema está en pausa. Espera 60 segundos antes de volver a intentar.");
        }

        // Devolvemos el error para que tu pantalla sepa que la petición falló y quite los "Loadings"
        return Promise.reject(error);
    }
);

export default api;