import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

// Importamos los componentes
import Login from "./components/Login";
import Layout from "./components/Layout";
import Dashboard from "./components/Dashboard"; // Tu concentrado de tareas
import Colaboradores from "./components/Colaboradores";
import Clientes from "./components/Clientes";
import Marca from "./components/Marca";
import ResetPassword from "./components/ResetPassword";
import SuscripcionVencida from './components/SuscripcionVencida';
import ForgotPassword from './components/ForgotPassword';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const savedUser = localStorage.getItem("user");
    if (token && savedUser) {
      setIsAuthenticated(true);
      setUser(JSON.parse(savedUser));
    }
  }, []);

  const handleLoginSuccess = (userData) => {
    setIsAuthenticated(true);
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setIsAuthenticated(false);
    setUser(null);
  };

  return (
    <BrowserRouter>
      <Routes>
        
        {/* ==========================================
            🔓 1. RUTAS PÚBLICAS (Sin restricciones)
            ========================================== */}
        <Route 
          path="/login" 
          element={!user ? <Login onLoginSuccess={handleLoginSuccess} /> : <Navigate to="/" />} 
        />
        
        {/* Dejamos la ruta de restablecer completamente LIBRE de condiciones para que nada la bloquee */}
        <Route 
          path="/restablecer" 
          element={<ResetPassword />} 
        />
        <Route 
          path="/olvide-mi-contrasena" 
          element={<ForgotPassword />} 
        />


        {/* ==========================================
            🔒 2. RUTAS PRIVADAS (Requieren sesión)
            ========================================== */}
        <Route 
          path="/" 
          element={user ? <Layout user={user} onLogout={handleLogout} /> : <Navigate to="/login" />}
        >
          <Route index element={<Dashboard />} /> 
          
          <Route 
            path="colaboradores" 
            element={(user?.role === 'admin' || user?.role === 'marca' || user?.role === 'supervisor') ? <Colaboradores /> : <Navigate to="/" />} 
          />
          
          <Route 
            path="clientes" 
            element={(user?.role === 'admin' || user?.role === 'marca' || user?.role === 'supervisor') ? <Clientes /> : <Navigate to="/" />} 
          />
          
          <Route 
            path="marca" 
            element={user?.role === 'admin' ? <Marca /> : <Navigate to="/" />} 
          />
        </Route>


        {/* ==========================================
            🛑 3. RUTA COMODÍN (Si escriben mal la URL)
            ========================================== */}
        <Route 
          path="*" 
          element={<Navigate to={user ? "/" : "/login"} />} 
        />
        <Route 
          path="/suscripcion-vencida" 
          element={<SuscripcionVencida />} 
        />

      </Routes>
    </BrowserRouter>
  );
}

export default App;
