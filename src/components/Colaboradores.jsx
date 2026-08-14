import { useState, useEffect, useRef } from "react";
import api from "../api/axios";

export default function Colaboradores() {
  const [empleados, setEmpleados] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  // NUEVO: Separamos la carga de la página y la carga del botón
  const [isLoading, setIsLoading] = useState(true); // Empieza en true para ocultar la pantalla vacía
  const [isSaving, setIsSaving] = useState(false); // Empieza en false porque aún no guardamos nada
  const [editingId, setEditingId] = useState(null);

  // Estado del expediente completo (RRHH)
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    job_title: "",
    phone: "",
    curp_rfc: "",
    address: "",
    emergency_contact: "",
    status: "activo",
  });

  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchColaboradores();
  }, []);

  const fetchColaboradores = async () => {
    try {
      const response = await api.get("/collaborators");
      setEmpleados(response.data);
    } catch (error) {
      console.error("Error al obtener colaboradores", error);
    } finally {
      // 👇 NUEVO: Apagamos la pantalla de carga
      setIsLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith("image/")) {
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setPhotoPreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const openModal = () => {
    setEditingId(null);
    setFormData({
      name: "",
      email: "",
      password: "",
      job_title: "",
      phone: "",
      curp_rfc: "",
      address: "",
      emergency_contact: "",
      status: "activo",
      role: "colaborador",
    });
    setPhotoFile(null);
    setPhotoPreview(null);
    setIsModalOpen(true);
  };

  const openEditModal = (emp) => {
    setEditingId(emp.id);
    setFormData({
      name: emp.name,
      email: emp.email,
      password: "",
      job_title: emp.job_title || "",
      phone: emp.phone || "",
      curp_rfc: emp.curp_rfc || "",
      address: emp.address || "",
      emergency_contact: emp.emergency_contact || "",
      status: emp.status || "activo",
      role: emp.role || "colaborador",
    });
    setPhotoFile(null);
    setPhotoPreview(
      emp.logo_path
        ? `https://api.gigafiber.mx/api/storage/${emp.logo_path}`
        : null,
    );
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);

    const data = new FormData();
    data.append("name", formData.name);
    data.append("email", formData.email);
    if (formData.password) data.append("password", formData.password);
    data.append("job_title", formData.job_title);
    data.append("phone", formData.phone);
    data.append("curp_rfc", formData.curp_rfc);
    data.append("address", formData.address);
    data.append("emergency_contact", formData.emergency_contact);
    data.append("status", formData.status);
    data.append("role", formData.role);
    if (photoFile) data.append("photo", photoFile); // Mandamos la foto

    if (editingId) {
       data.append("_method", "PUT"); 
    }

    try {
      if (editingId) {
        // Actualizar (Simulamos la ruta que crearás en Laravel)
        const response = await api.post(`/collaborators/${editingId}`, data, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        setEmpleados(
          empleados.map((emp) =>
            emp.id === editingId ? response.data.collaborator : emp,
          ),
        );
        alert("Expediente actualizado.");
      } else {
        // Crear
        const response = await api.post("/collaborators", data, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        setEmpleados([...empleados, response.data.collaborator]);
        alert("Colaborador dado de alta exitosamente.");
      }
      setIsModalOpen(false);
    } catch (error) {
      alert(
        "Error al guardar: " +
          (error.response?.data?.message || "Revisa los datos"),
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleEliminarColaborador = async (id) => {
        const confirmar = window.confirm("¿Estás seguro de eliminar a este técnico? Esta acción liberará un espacio en tu plan actual.");
        
        if (!confirmar) return;

        try {
            // 1. Mandamos la orden a Laravel
            await api.delete(`/collaborators/${id}`);
            
            // 2. Cerramos el modal del fantasma
            setIsModalOpen(false); 
            
            // 3. Mostramos el éxito
            alert("Técnico eliminado con éxito.");

            // 4. EL FIX INFALIBLE: Recargamos la página discretamente para que 
            // traiga la lista fresca desde Laravel sin el técnico borrado
            window.location.reload();
            
        } catch (error) {
            console.error(error);
            alert("Ocurrió un error al intentar eliminar el colaborador.");
        }
    };

  // 👇 NUEVO: PANTALLA DE ESPERA
  if (isLoading) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          height: "80vh",
        }}
      >
        <span style={{ fontSize: "50px", marginBottom: "15px" }}>🧑‍💻</span>
        <h3 style={{ color: "#2c3e50", margin: 0 }}>
          Cargando Plantilla Operativa...
        </h3>
        <p style={{ color: "#7f8c8d" }}>
          Sincronizando expedientes con el servidor
        </p>
      </div>
    );
  }
  return (
    <div style={styles.pageContainer}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.pageTitle}>🧑‍💼 Plantilla Operativa</h1>
          <p style={styles.pageSubtitle}>
            Gestiona los expedientes y accesos de tus técnicos de campo.
          </p>
        </div>
        <button onClick={openModal} style={styles.btnPrimary}>
          ➕ Alta de Personal
        </button>
      </div>

      <div style={styles.gridDashboard}>
        {empleados.length === 0 && (
          <p style={{ color: "#666" }}>No hay colaboradores registrados aún.</p>
        )}

        {empleados.map((emp) => (
          <div key={emp.id} style={styles.empCard}>
            <div style={styles.cardHeader}>
              <div style={styles.avatarContainer}>
                {emp.logo_path ? (
                  <img
                    src={`https://api.gigafiber.mx/api/storage/${emp.logo_path}`}
                    style={styles.avatarImage}
                    onError={(e) => {
                      e.target.style.display = "none";
                      e.target.nextSibling.style.display = "flex";
                    }}
                  />
                ) : null}   
                <div
                  style={{
                    ...styles.avatarFallback,
                    display: emp.logo_path ? "none" : "flex",
                  }}
                >
                  {emp.name.charAt(0).toUpperCase()}
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={styles.empName}>{emp.name}</h3>
                <p style={styles.empTitle}>{emp.job_title || "Técnico"}</p>
              </div>
              <div>
                <span
                  style={{
                    ...styles.statusBadge,
                    backgroundColor:
                      emp.status === "activo"
                        ? "#d4edda"
                        : emp.status === "vacaciones"
                          ? "#fff3cd"
                          : "#f8d7da",
                    color:
                      emp.status === "activo"
                        ? "#155724"
                        : emp.status === "vacaciones"
                          ? "#856404"
                          : "#721c24",
                  }}
                >
                  {emp.status?.toUpperCase() || "ACTIVO"}
                </span>
              </div>
            </div>

            <div style={styles.empDetails}>
              <p style={styles.detailText}>📧 {emp.email}</p>
              <p style={styles.detailText}>📱 {emp.phone || "Sin teléfono"}</p>
              <p style={styles.detailText}>
                🆔 {emp.curp_rfc || "Sin CURP/RFC"}
              </p>
            </div>

            <button
              style={styles.btnSecondary}
              onClick={() => openEditModal(emp)}
            >
              ✏️ Ver Expediente
            </button>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <h2 style={{ color: "#333", marginTop: 0 }}>
              {editingId
                ? "✏️ Actualizar Expediente"
                : "➕ Nuevo Registro de Personal"}
            </h2>

            <form onSubmit={handleSubmit} style={styles.form}>
              {/* Sección Foto Perfil */}
              <div style={styles.uploadSection}>
                <div style={styles.previewContainer}>
                  {photoPreview ? (
                    <img src={photoPreview} style={styles.previewImage} />
                  ) : (
                    <span>👤</span>
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <label style={styles.labelDark}>Fotografía de Gafete</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    ref={fileInputRef}
                    style={{ display: "none" }}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current.click()}
                    style={styles.btnUpload}
                  >
                    Subir Fotografía
                  </button>
                </div>
              </div>

              <div style={styles.formGrid}>
                <div>
                  <label style={styles.labelDark}>Nombre Completo</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    required
                    style={styles.inputDark}
                  />
                </div>
                <div>
                  <label style={styles.labelDark}>Puesto (Ej: Técnico)</label>
                  <input
                    type="text"
                    value={formData.job_title}
                    onChange={(e) =>
                      setFormData({ ...formData, job_title: e.target.value })
                    }
                    required
                    style={styles.inputDark}
                  />
                </div>
                <div>
                  <label style={styles.labelDark}>Correo (Login Móvil)</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    required
                    style={styles.inputDark}
                  />
                </div>
                <div>
                  <label style={styles.labelDark}>Contraseña Acceso</label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    required={!editingId}
                    placeholder={editingId ? "(Oculta)" : "Requerida"}
                    style={styles.inputDark}
                  />
                </div>
                <div>
                  <label style={styles.labelDark}>Teléfono</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                    style={styles.inputDark}
                  />
                </div>
                <div>
                  <label style={styles.labelDark}>CURP o RFC</label>
                  <input
                    type="text"
                    value={formData.curp_rfc}
                    onChange={(e) =>
                      setFormData({ ...formData, curp_rfc: e.target.value })
                    }
                    style={styles.inputDark}
                  />
                </div>
                <div>
                  <label style={styles.labelDark}>Estado Operativo</label>
                  <select
                    value={formData.status}
                    onChange={(e) =>
                      setFormData({ ...formData, status: e.target.value })
                    }
                    style={styles.inputDark}
                  >
                    <option value="activo">Activo</option>
                    <option value="vacaciones">Vacaciones</option>
                    <option value="inactivo">Inactivo / Baja</option>
                  </select>
                </div>
                <div>
                  <label style={styles.labelDark}>Rol de Acceso</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    style={styles.inputDark}
                  >
                    <option value="colaborador">Colaborador</option>
                    <option value="supervisor">Supervisor</option>
                  </select>
                </div>
              </div>

              <div style={{ marginTop: "10px" }}>
                <label style={styles.labelDark}>Contacto de Emergencia</label>
                <input
                  type="text"
                  value={formData.emergency_contact}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      emergency_contact: e.target.value,
                    })
                  }
                  style={styles.inputDark}
                  placeholder="Nombre y Teléfono"
                />
              </div>

              <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
                <button
                  type="submit"
                  style={styles.btnPrimary}
                  disabled={isSaving}
                >
                  {isSaving ? "Guardando..." : "Guardar Expediente"}
                </button>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  style={styles.btnSecondaryCancel}
                >
                  Cancelar
                </button>
                
                {/* 👇 EL FIX: Solo se muestra si estamos editando (editingId existe) 
                     y usamos type="button" para no enviar el formulario por error */}
                {editingId && (
                    <button
                      type="button" 
                      onClick={() => {
                          handleEliminarColaborador(editingId);
                          setIsModalOpen(false); // Cerramos el modal después de borrar
                      }}
                      style={styles.btnEliminar}
                    >
                      🗑️ Eliminar
                    </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  pageContainer: { padding: "20px" },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "30px",
  },
  pageTitle: {
    margin: 0,
    fontSize: "28px",
    color: "#2c3e50",
    fontWeight: "bold",
  },
  pageSubtitle: { margin: "5px 0 0", color: "#6c757d" },
  btnPrimary: {
    padding: "12px 20px",
    backgroundColor: "#28a745",
    color: "white",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "bold",
  },
  gridDashboard: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
    gap: "20px",
  },
  empCard: {
    backgroundColor: "white",
    padding: "20px",
    borderRadius: "12px",
    boxShadow: "0 4px 6px rgba(0,0,0,0.05)",
    display: "flex",
    flexDirection: "column",
    gap: "15px",
  },
  cardHeader: { display: "flex", alignItems: "center", gap: "15px" },
  avatarContainer: { position: "relative", width: "55px", height: "55px" },
  avatarImage: {
    width: "100%",
    height: "100%",
    borderRadius: "50%",
    objectFit: "cover",
    border: "2px solid #eee",
  },
  avatarFallback: {
    width: "100%",
    height: "100%",
    borderRadius: "50%",
    backgroundColor: "#6c757d",
    color: "white",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    fontSize: "24px",
    fontWeight: "bold",
  },
  empName: { margin: 0, fontSize: "16px", color: "#333" },
  empTitle: {
    margin: "2px 0 0",
    fontSize: "13px",
    color: "#007bff",
    fontWeight: "bold",
  },
  statusBadge: {
    fontSize: "10px",
    padding: "4px 8px",
    borderRadius: "12px",
    fontWeight: "bold",
  },
  empDetails: {
    backgroundColor: "#f8f9fa",
    padding: "10px",
    borderRadius: "8px",
    display: "flex",
    flexDirection: "column",
    gap: "5px",
  },
  detailText: { margin: 0, fontSize: "13px", color: "#495057" },
  btnSecondary: {
    width: "100%",
    padding: "10px",
    backgroundColor: "transparent",
    color: "#495057",
    border: "1px solid #ced4da",
    borderRadius: "6px",
    cursor: "pointer",
    fontWeight: "bold",
    transition: "0.2s",
  },
  btnSecondaryCancel: {
    flex: 1,
    padding: "10px",
    backgroundColor: "#e9ecef",
    color: "#495057",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontWeight: "bold",
  },
  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.6)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: "white",
    padding: "30px",
    borderRadius: "12px",
    width: "90%",
    maxWidth: "650px",
    maxHeight: "90vh",
    overflowY: "auto",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "15px",
    marginTop: "20px",
  },
  formGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px" },
  labelDark: {
    display: "block",
    marginBottom: "5px",
    fontWeight: "bold",
    fontSize: "13px",
    color: "#333",
  },
  inputDark: {
    width: "100%",
    padding: "10px",
    borderRadius: "6px",
    border: "1px solid #ccc",
    boxSizing: "border-box",
    backgroundColor: "#fff",
    color: "#000",
  },
  uploadSection: {
    display: "flex",
    alignItems: "center",
    gap: "15px",
    padding: "15px",
    border: "1px dashed #ccc",
    borderRadius: "8px",
    backgroundColor: "#fafafa",
  },
  previewContainer: {
    width: "70px",
    height: "70px",
    borderRadius: "50%",
    overflow: "hidden",
    backgroundColor: "#e9ecef",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    fontSize: "24px",
  },
  previewImage: { width: "100%", height: "100%", objectFit: "cover" },
  btnUpload: {
    padding: "8px 15px",
    backgroundColor: "#007bff",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "12px",
    color: "white",
    fontWeight: "bold",
  },
  btnEliminar: {
    backgroundColor: "#ef4444", // Rojo semántico moderno (estilo Tailwind)
    color: "#ffffff",
    border: "none",
    borderRadius: "8px",
    padding: "8px 16px",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px", // Da un pequeño espacio entre el ícono 🗑️ y el texto
    boxShadow: "0 2px 4px rgba(239, 68, 68, 0.25)", // Sombra roja suave
    transition: "all 0.2s ease", // Transición suave si decides agregarle hover después
    outline: "none",
  },
};
