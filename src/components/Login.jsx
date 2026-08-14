import { useState } from "react";
import { useNavigate } from 'react-router-dom';
import api from "../api/axios";
import { Link } from "react-router-dom";
import { useEffect } from "react";

export default function Login({ onLoginSuccess }) {
  // 1. Limpiamos la cuenta iniciada para que los campos aparezcan vacíos
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    document.title = "Login - Gigafiber";
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const response = await api.post("/login", { email, password });
      const { token, user } = response.data;

      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));

      onLoginSuccess(user);
    } catch (err) {
      console.error(err);
      
      // 🛑 NUEVO: Atrapamos el 403 de Suscripción Vencida
      if (err.response && err.response.status === 403) {
        navigate('/suscripcion-vencida');
      } 
      // Los errores que ya tenías configurados
      else if (err.response && err.response.status === 401) {
        setError("Correo o contraseña incorrectos.");
      } else if (err.response && err.response.status === 429) {
        setError("Error de conexión.");
      } else {
        setError("Error de conexión.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.loginCard}>
        <div style={styles.header}>
          <div style={styles.logoWrapper}>🛜</div>
          <h2 style={styles.title}>Gigafiber - Plataforma</h2>
          <p style={styles.subtitle}>Ingresa tus credenciales para continuar</p>
        </div>

        {error && <div style={styles.errorBox}>⚠️ {error}</div>}

        <form onSubmit={handleLogin} style={styles.form}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Correo Electrónico</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={styles.input}
              placeholder="admin@empresa.com"
              required
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Contraseña</label>
            <div style={styles.passwordContainer}>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={styles.inputWithIcon}
                placeholder="••••••••"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={styles.eyeButton}
                tabIndex="-1"
              >
                {showPassword ? (
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#a0aec0"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                    <line x1="1" y1="1" x2="23" y2="23"></line>
                  </svg>
                ) : (
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#a0aec0"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                )}
              </button>
            </div>
            <div style={{ textAlign: "right", marginTop: "8px" }}>
              <Link to="/olvide-mi-contrasena" style={styles.forgotPasswordLink}>
                ¿Olvidaste tu contraseña?
              </Link>
            </div>
          </div>

          <button
            type="submit"
            style={{
              ...styles.button,
              backgroundColor: isLoading ? "#6c757d" : "#007bff",
              cursor: isLoading ? "not-allowed" : "pointer",
            }}
            disabled={isLoading}
          >
            {isLoading ? "Verificando..." : "Iniciar Sesión"}
          </button>
        </form>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f4f6f9",
    fontFamily: "'Segoe UI', Roboto, 'Helvetica Neue', sans-serif",
  },
  loginCard: {
    width: "100%",
    maxWidth: "400px",
    backgroundColor: "#ffffff",
    padding: "40px",
    borderRadius: "16px",
    boxShadow: "0 10px 25px rgba(0,0,0,0.05)",
    boxSizing: "border-box",
  },
  header: {
    textAlign: "center",
    marginBottom: "30px",
  },
  logoWrapper: {
    fontSize: "40px",
    marginBottom: "10px",
  },
  title: {
    margin: "0 0 5px 0",
    fontSize: "24px",
    color: "#2c3e50",
    fontWeight: "bold",
  },
  subtitle: {
    margin: 0,
    color: "#7f8c8d",
    fontSize: "14px",
  },
  errorBox: {
    color: "#dc3545",
    backgroundColor: "#f8d7da",
    padding: "12px",
    borderRadius: "8px",
    marginBottom: "20px",
    fontSize: "13px",
    fontWeight: "bold",
    textAlign: "center",
    border: "1px solid #f5c6cb",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "20px",
  },
  inputGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  label: {
    fontSize: "13px",
    fontWeight: "bold",
    color: "#4a5568",
  },
  input: {
    width: "100%",
    padding: "12px 15px",
    borderRadius: "8px",
    border: "1px solid #e2e8f0",
    backgroundColor: "#f8fafc",
    fontSize: "15px",
    color: "#2d3748",
    boxSizing: "border-box",
    outline: "none",
    transition: "border-color 0.2s",
  },
  button: {
    width: "100%",
    padding: "14px",
    color: "white",
    border: "none",
    borderRadius: "8px",
    fontSize: "16px",
    fontWeight: "bold",
    marginTop: "10px",
    transition: "background-color 0.3s",
  },
  passwordContainer: {
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        width: '100%'
    },
    inputWithIcon: {
        width: '100%',
        padding: '12px 45px 12px 15px', 
        borderRadius: '8px',
        border: '1px solid #e2e8f0',
        backgroundColor: '#f8fafc',
        fontSize: '15px',
        color: '#2d3748',
        boxSizing: 'border-box',
        outline: 'none',
        transition: 'border-color 0.2s',
        fontFamily: 'inherit'
    },
    eyeButton: {
        position: 'absolute',
        right: '12px',
        background: 'transparent',
        border: 'none',
        cursor: 'pointer',
        padding: '0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        outline: 'none',
        height: '100%'
    },
    forgotPasswordLink: {
    color: '#0984e3', // Color de enlace clásico (puedes usar tu color corporativo)
    fontSize: '13px',
    textDecoration: 'none',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'color 0.2s ease',
  },
};
