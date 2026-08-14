import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import api from "../api/axios";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  useEffect(() => {
    document.title = "Restablecer Contraseña - Gigafiber";
  }, []);
  const navigate = useNavigate();

  // Atrapamos los datos que vienen en la URL (el enlace del correo)
  const email = searchParams.get("email");
  const token = searchParams.get("token");

  // Estados del formulario
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Estados de la interfaz
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");

    if (password !== passwordConfirmation) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setIsLoading(true);

    try {
      // Mandamos todo a la ruta que hicimos en Laravel
      const response = await api.post("/reset-password", {
        email: email,
        token: token,
        password: password,
        password_confirmation: passwordConfirmation,
      });

      setMessage(response.data.message); // "¡Tu contraseña ha sido restablecida!"

      // Esperamos 3 segundos y lo mandamos al login
      setTimeout(() => {
        navigate("/login");
      }, 3000);
    } catch (err) {
      console.error(err);
      if (err.response && err.response.data.message) {
        setError(err.response.data.message);
      } else {
        setError("Ocurrió un error al intentar cambiar la contraseña.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.header}>
          <div style={styles.logoWrapper}>🔐</div>
          <h2 style={styles.title}>Nueva Contraseña</h2>
          <p style={styles.subtitle}>
            Ingresa tu nueva clave de acceso para <b>{email}</b>
          </p>
        </div>

        {error && <div style={styles.errorBox}>⚠️ {error}</div>}
        {message && (
          <div style={styles.successBox}>
            ✅ {message}
            <br />
            Redirigiendo al login...
          </div>
        )}

        {!message && (
          <form onSubmit={handleSubmit} style={styles.form}>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Nueva Contraseña</label>
              <div style={styles.passwordContainer}>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={styles.inputWithIcon}
                  placeholder="Mínimo 6 caracteres"
                  required
                  minLength="6"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={styles.eyeButton}
                  tabIndex="-1"
                >
                  {showPassword ? (
                    // Icono de "Ojo cerrado" (SVG)
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
                    // Icono de "Ojo abierto" (SVG)
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
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>Confirmar Contraseña</label>
              <div style={styles.passwordContainer}>
                <input
                  type={showPassword ? "text" : "password"}
                  value={passwordConfirmation}
                  onChange={(e) => setPasswordConfirmation(e.target.value)}
                  style={styles.inputWithIcon}
                  placeholder="Repite tu nueva contraseña"
                  required
                  minLength="6"
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
              {isLoading ? "Guardando..." : "Guardar Contraseña"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

// Reutilizamos los estilos elegantes de tu Login
const styles = {
  container: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f4f6f9",
    fontFamily: "'Segoe UI', Roboto, sans-serif",
  },
  card: {
    width: "100%",
    maxWidth: "400px",
    backgroundColor: "#ffffff",
    padding: "40px",
    borderRadius: "16px",
    boxShadow: "0 10px 25px rgba(0,0,0,0.05)",
    boxSizing: "border-box",
  },
  header: { textAlign: "center", marginBottom: "30px" },
  logoWrapper: { fontSize: "40px", marginBottom: "10px" },
  title: {
    margin: "0 0 5px 0",
    fontSize: "24px",
    color: "#2c3e50",
    fontWeight: "bold",
  },
  subtitle: { margin: 0, color: "#7f8c8d", fontSize: "14px" },
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
  successBox: {
    color: "#155724",
    backgroundColor: "#d4edda",
    padding: "12px",
    borderRadius: "8px",
    marginBottom: "20px",
    fontSize: "14px",
    fontWeight: "bold",
    textAlign: "center",
    border: "1px solid #c3e6cb",
  },
  form: { display: "flex", flexDirection: "column", gap: "20px" },
  inputGroup: { display: "flex", flexDirection: "column", gap: "8px" },
  label: { fontSize: "13px", fontWeight: "bold", color: "#4a5568" },
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
        padding: '12px 45px 12px 15px', // Espacio extra a la derecha para el SVG
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
        background: 'transparent', // Fondo invisible
        border: 'none',            // Sin borde gris
        cursor: 'pointer',
        padding: '0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        outline: 'none',
        height: '100%' // Centra el icono verticalmente
    },
};
