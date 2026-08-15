import { useState, useEffect, useRef } from "react";
import { GoogleMap, useJsApiLoader, Marker, Autocomplete } from "@react-google-maps/api";
import api from "../api/axios";

// Paleta de colores para los colaboradores en el calendario
const PALETA_COLORES = [
  "#00b894",
  "#0984e3",
  "#fdcb6e",
  "#e17055",
  "#6c5ce7",
  "#e84393",
];

const STATUS_CONFIG = {
  pendiente: { label: "Pendiente", color: "#e74c3c", bg: "#fceaea" },        // Rojo
  en_proceso: { label: "En Proceso", color: "#27ae60", bg: "#eafaf1" },       // Verde
  completada: { label: "Finalizado", color: "#7f8c8d", bg: "#f4f6f7" },       // Gris
  finalizado_con_pendientes: { label: "Con Pendientes", color: "#f1c40f", bg: "#fef9e7" }, // Amarillo
  reagendar: { label: "Reagendar", color: "#e84393", bg: "#fcecf4" },         // Rosa
};

const MAP_CONTAINER_STYLE = {
  width: "100%",
  height: "250px",
  borderRadius: "8px",
  marginTop: "10px",
  border: "1px solid #ccc"
};

const MAP_DEFAULT_CENTER = {
  lat: 21.8818,
  lng: -102.2915
};

const MAPS_LIBRARIES = ["places"];


export default function Dashboard() {
  const [tasks, setTasks] = useState([]);
  const [collaborators, setCollaborators] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // 👇 NUEVO: Estado avanzado para la alerta flotante (Mensaje + Color)
  const [toast, setToast] = useState({ message: null, type: "success" });

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast({ message: null, type: "success" }); // Se apaga sola después de 3 segundos
    }, 3000);
  };

  // Estado para controlar el mes actual del calendario
  const [calendarDate, setCalendarDate] = useState(new Date());

  // Estados para los Modales
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isEvidenceModalOpen, setIsEvidenceModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("create");
  const [activeTab, setActiveTab] = useState("detalles");

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    status: "pendiente",
    date: "",
    user_id: "",
    address: "", 
    lat: null,   
    lng: null, 
    // 👇 NUEVO: Campos para la repetición
    recurrence: "none",
    recurrence_end: "",
    reschedule_reason: ""
  });
  // --- ESTADOS PARA LA EVIDENCIA ---
  const [evidenceFile, setEvidenceFile] = useState(null);
  const [evidencePreview, setEvidencePreview] = useState(null);
  const [evidenceNotes, setEvidenceNotes] = useState("");
  const evidenceInputRef = useRef(null);
  const [evidenceIndex, setEvidenceIndex] = useState(0);
  const [isAddingEvidence, setIsAddingEvidence] = useState(false);
  const [fullScreenImage, setFullScreenImage] = useState(null);

  // 👇 NUEVO: Estados para el Gestor de Rutinas (Acordeón) 👇
  const [isRecurringManagerOpen, setIsRecurringManagerOpen] = useState(false);
  const [recurringSearchTerm, setRecurringSearchTerm] = useState("");
  const [expandedRecurringTaskId, setExpandedRecurringTaskId] = useState(null);

  // 👇 NUEVO: Estados para los filtros
  const [searchTerm, setSearchTerm] = useState("");
  const [filterColab, setFilterColab] = useState("");
  const [showRecurringOnly, setShowRecurringOnly] = useState(false);

  // 👇 NUEVO: Lógica que filtra las tareas en tiempo real
  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (task.description && task.description.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesColab = filterColab === "" || String(task.user_id) === String(filterColab);
    
    // 👈 NUEVO: Filtra si tiene repetición activa
    const matchesRecurrence = showRecurringOnly ? (task.recurrence && task.recurrence !== "none") : true; 
    
    return matchesSearch && matchesColab && matchesRecurrence;
  });

  const [showMap, setShowMap] = useState(false); // 👈 ESTADO PARA ABRIR/CERRAR EL MAPA

  // 👇 NUEVO: Estados para el modal de "Ver más tareas" en un día
  const [dayModalDateStr, setDayModalDateStr] = useState(null); // Guarda "YYYY-MM-DD"
  const [dayModalTitle, setDayModalTitle] = useState("");       // Guarda "6 de Agosto"

  const uniqueTitles = [...new Set(tasks.map(t => t.title))].filter(Boolean);

  // 👇 ACTUALIZADO: Le decimos que cargue la librería de "places"
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries: MAPS_LIBRARIES // 👈 NUEVO
  });

  const handleMapClick = (event) => {
    setFormData({
      ...formData,
      lat: event.latLng.lat(),
      lng: event.latLng.lng()
    });
  };

  // 👇 NUEVO: Estados y funciones para el Buscador (Autocomplete)
  const [autocomplete, setAutocomplete] = useState(null);
  const [mapInstance, setMapInstance] = useState(null)

  const onLoadAutocomplete = (autocompleteInstance) => {
    setAutocomplete(autocompleteInstance);
  };

  const onPlaceChanged = () => {
    if (autocomplete !== null) {
      const place = autocomplete.getPlace();
      if (place.geometry && place.geometry.location) {
        
        const newLat = place.geometry.location.lat();
        const newLng = place.geometry.location.lng();

        // 1. Guardamos los datos en tu formulario
        setFormData({
          ...formData,
          address: place.formatted_address || place.name,
          lat: newLat,
          lng: newLng
        });
        
        setShowMap(true); // Nos aseguramos de que el mapa esté abierto

        // 👇 2. LA MAGIA: Si el mapa ya cargó, volamos hacia la nueva ubicación
        if (mapInstance) {
          mapInstance.panTo({ lat: newLat, lng: newLng });
          mapInstance.setZoom(17); // Zoom a nivel de calle
        }
      }
    }
  };

  const carouselRef = useRef(null);

  // Funciones para cambiar de mes
  // Funciones para cambiar de mes
  const handlePrevMonth = () => {
    setCalendarDate(
      new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1),
    );
  };

  const handleNextMonth = () => {
    setCalendarDate(
      new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1),
    );
  };

  //Recursividad
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    // Escuchar cuando la ventana cambie de tamaño
    window.addEventListener("resize", handleResize);

    // Limpiar el evento
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // 👇 1. PRIMERO declaramos los nombres de los meses para que React los conozca
  const mesesNombres = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];

  // Formatear el título del mes (Ej: "Junio 2026")
  const tituloMes = `${mesesNombres[calendarDate.getMonth()]} ${calendarDate.getFullYear()}`;

  // 👇 2. Funciones para cambiar de DÍA en la versión móvil
  const handlePrevDay = () => {
    setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth(), calendarDate.getDate() - 1));
  };

  const handleNextDay = () => {
    setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth(), calendarDate.getDate() + 1));
  };

  // 👇 3. AHORA SÍ creamos el título del día, porque mesesNombres ya existe arriba
  const diasNombres = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
  const tituloDia = `${diasNombres[calendarDate.getDay()]}, ${calendarDate.getDate()} de ${mesesNombres[calendarDate.getMonth()]}`;

 useEffect(() => {
    document.title = "Dashboard | Gigafiber";
    const storedUser = JSON.parse(localStorage.getItem("user"));
    setUser(storedUser);
    
    // 1. Carga inicial al abrir la página
    fetchDashboardData();

    // 2. 👇 LA MAGIA: Recarga silenciosa (Short Polling) 👇
    // Esto actualizará las tareas automáticamente en el fondo cada 15 segundos
    const intervalId = setInterval(() => {
      fetchDashboardData();
    }, 15000); // 15000 milisegundos = 15 segundos

    // 3. Limpieza: Si el usuario cierra sesión o cambia de página, detenemos el reloj
    return () => clearInterval(intervalId);
  }, []);

  // 1. TRAER DATOS REALES (Colaboradores y Tareas al mismo tiempo)
  const fetchDashboardData = async () => {
    try {
      const userLocalStorage = JSON.parse(localStorage.getItem("user"));
      // LA MAGIA: Si no es colaborador, es Jefe (Admin o Marca)
      const isBoss = userLocalStorage?.role !== "colaborador";
      const [resTasks, resColabs, resClientes] = await Promise.all([
        api.get("/tasks"),
        isBoss ? api.get("/collaborators") : Promise.resolve({ data: [] }),
        isBoss ? api.get("/clients") : Promise.resolve({ data: [] }), // 👈 NUEVO
      ]);
      let colabsConColor = [];
      if (isBoss) {
        // Es jefe: le pintamos a su equipo (Ej. Fátima)
        colabsConColor = resColabs.data.map((c, index) => ({
          ...c,
          color: PALETA_COLORES[index % PALETA_COLORES.length],
        }));
        setClientes(resClientes.data);
      } else {
        // Es técnico: se ve a sí mismo
        colabsConColor = [{ ...userLocalStorage, color: "#0984e3" }];
      }
      setCollaborators(colabsConColor);
      const today = new Date().toISOString().split("T")[0];
      const tasksWithData = resTasks.data.map((t) => ({
        ...t,
        date: t.date || today,
      }));
      setTasks(tasksWithData);
    } catch (error) {
      console.error("Error cargando el dashboard:", error);
    } finally {
      setIsLoading(false); // Asumiendo que ya tienes tu pantalla de carga
    }
  };
  // 2. Unir datos para el Carrusel (Contar tareas por colaborador)
  const activeColaboradores = collaborators.map((colab) => {
    // EL FIX: Convertimos ambos a String para que coincidan sin importar cómo lleguen de Laravel
    const taskCount = tasks.filter(
      (t) =>
        String(t.user_id) === String(colab.id) && t.status !== "completada",
    ).length;
    return { ...colab, taskCount };
  });

  const scrollCarousel = (direction) => {
    if (carouselRef.current) {
      const scrollAmount = direction === "left" ? -250 : 250;
      carouselRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  // 3. Lógica de Tareas (Crear vs Editar)
  const openCreateModal = () => {
    const firstColabId = collaborators.length > 0 ? collaborators[0].id : "";
    setFormData({
      title: "",
      description: "",
      status: "pendiente",
      date: new Date().toISOString().split("T")[0],
      time: "",    
      user_id: "",
      address: "", 
      lat: null,   
      lng: null,  
      recurrence: "none", // 👈 NUEVO
      recurrence_end: ""  // 👈 NUEVO
    });
    setModalMode("create");
    setActiveTab("detalles"); // 👈 NUEVO: Siempre abre en la primera pestaña
    setIsTaskModalOpen(true);
  };

 const openEditModal = async (task) => {
    setFormData({ ...task });
    // 👇 LA MAGIA: Reseteamos todo a vacío para no re-enviar datos viejos accidentalmente 👇
    setEvidenceNotes(""); 
    setEvidenceFile(null);
    setEvidencePreview(null);
    setEvidenceIndex(0); // Reinicia el carrusel
    setIsAddingEvidence(false); // Apaga el modo añadir
    setModalMode("edit");
    setActiveTab("detalles"); 
    setIsTaskModalOpen(true);

    if (user?.role === "colaborador" && !task.viewed_at) {
      try {
        const dataToSend = { ...task };
        if (!dataToSend.client_id || dataToSend.client_id === "") dataToSend.client_id = null;
        if (!dataToSend.recurrence_end || dataToSend.recurrence_end === "") dataToSend.recurrence_end = null;
        if (!dataToSend.time || dataToSend.time === "") dataToSend.time = null;
        if (!dataToSend.reschedule_reason || dataToSend.reschedule_reason === "") dataToSend.reschedule_reason = null;
        if (!dataToSend.lat || dataToSend.lat === "") dataToSend.lat = null;
        if (!dataToSend.lng || dataToSend.lng === "") dataToSend.lng = null;

        const response = await api.put(`/tasks/${task.id}`, dataToSend);
        setFormData((prev) => ({ ...prev, viewed_at: response.data.viewed_at }));
        fetchDashboardData();
      } catch (error) {
        console.error("Error al registrar la vista del técnico:", error);
      }
    }
  };

 const handleSubmit = async (e) => {
    e.preventDefault();

    // 👇 FIX: Agregamos formData.address a los campos estrictamente obligatorios 👇
    if (user?.role !== "colaborador" && (!formData.title?.trim() || !formData.date || !formData.time || !formData.user_id || !formData.description?.trim() || !formData.address?.trim())) {
        showToast("⚠️ Faltan campos obligatorios por llenar.", "warning");
        return; 
    }

    setIsSaving(true);

    // 👇 LA MAGIA: ÚNICA DECLARACIÓN DEL FormData 👇
    const dataToSend = new FormData();
    
    // Lista de campos prohibidos que el Frontend JAMÁS debe reescribir
    const camposProtegidos = ['client', 'recurrence', 'creator_id', 'updater_id', 'created_at', 'updated_at', 'viewed_at', 'started_at', 'completed_at', 'evidence_path', 'evidence_notes'];

    // Agregamos solo lo permitido
    Object.keys(formData).forEach(key => {
      if (formData[key] !== null && formData[key] !== undefined && !camposProtegidos.includes(key)) {
        dataToSend.append(key, formData[key]);
      }
    });
    
    // Formateamos la recurrencia
    dataToSend.append('recurrence', typeof formData.recurrence === 'object' ? JSON.stringify(formData.recurrence) : (formData.recurrence || 'none'));

    // Agregamos evidencia si existe
    if (evidenceFile) dataToSend.append("evidence_photo", evidenceFile);
    if (evidenceNotes) dataToSend.append("evidence_notes", evidenceNotes);

    try {
      if (modalMode === "create") {
        await api.post("/tasks", dataToSend, { headers: { "Content-Type": "multipart/form-data" } });
        showToast("✅ Tarea asignada correctamente."); // 👈 Reemplazamos el alert
      } else {
        dataToSend.append("_method", "PUT"); 
        await api.post(`/tasks/${formData.id}`, dataToSend, { headers: { "Content-Type": "multipart/form-data" } });
        showToast("✅ Cambios guardados con éxito."); // 👈 Reemplazamos el alert
      }

      setIsTaskModalOpen(false);
      fetchDashboardData(); 
    } catch (error) {
      if (error.response?.status === 403) showToast("❌ " + error.response.data.message, "error");
      else showToast("❌ Error crítico al guardar la tarea.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteTask = async (id) => {
    if (!window.confirm("⚠️ ¿Estás seguro de eliminar esta tarea definitivamente?")) return;
    
    try {
      await api.delete(`/tasks/${id}`);
      setTasks(tasks.filter((t) => t.id !== id));
      setIsTaskModalOpen(false);
      setDayModalTasks(null); // 👇 NUEVO: Cerramos la lista si la tarea fue destruida
    } catch (error) {
      showToast("❌ Error al eliminar la tarea.", "error");
    }
  };

  const getTaskStyle = (tareaStatus, baseColor) => {
    // Estilo base (Pendiente)
    let style = {
      backgroundColor: baseColor || "#6c757d",
      color: "white",
      padding: "4px 6px",
      borderRadius: "4px",
      marginBottom: "4px",
      fontSize: "11px",
      cursor: "pointer",
      textDecoration: "none",
      border: "1px solid transparent",
      overflow: "hidden",
      whiteSpace: "nowrap",
      textOverflow: "ellipsis"
    };

    if (tareaStatus === "completada") {
      style.textDecoration = "line-through";
      style.opacity = 0.6;
    } else if (tareaStatus === "en_proceso") {
      // MAGIA: Borde punteado blanco para resaltar que está en acción
      style.border = "2px dashed white";
      style.boxShadow = "0px 2px 4px rgba(0,0,0,0.3)";
      style.fontWeight = "bold";
    }

    return style;
  };

  // 4. Lógica del Calendario
  const renderCalendarDays = () => {
    // 👇 FIX: Ahora usamos la fecha del estado, no la fecha actual estática
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayIndex = new Date(year, month, 1).getDay();

    const days = [];
    for (let i = 0; i < firstDayIndex; i++)
      days.push(<div key={`empty-${i}`} style={styles.calendarDayEmpty}></div>);

   for (let i = 1; i <= daysInMonth; i++) {
      const dayString = `${year}-${String(month + 1).padStart(2, "0")}-${String(i).padStart(2, "0")}`;
      
      // 👇 FIX: Usa filteredTasks y acomoda por hora (de mañana a noche)
      const dayTasks = filteredTasks
        .filter((t) => t.date === dayString)
        .sort((a, b) => (a.time || "23:59").localeCompare(b.time || "23:59"));

      const MAX_VISIBLE = 3;
      const visibleTasks = dayTasks.slice(0, MAX_VISIBLE);
      const hiddenCount = dayTasks.length - MAX_VISIBLE;

      days.push(
        <div key={i} style={styles.calendarDay}>
          <div style={styles.dayNumber}>{i}</div>
          <div style={styles.taskList}>
            
            {/* 👇 Solo dibujamos las tareas visibles (hasta 3) */}
            {visibleTasks.map((task) => {
              const colabInfo = collaborators.find(
                (c) => String(c.id) === String(task.user_id),
              ) || { color: "#6c757d", name: "Desconocido" };

              return (
                <div
                  key={task.id}
                  style={{
                    ...styles.taskPill,
                    backgroundColor: colabInfo.color,
                    opacity: task.status === "completada" ? 0.6 : 1,
                    border: task.status === "en_proceso" ? "2px dashed black" : "none",
                  }}
                  onClick={() => openEditModal(task)}
                  title={`Asignado a: ${colabInfo.name} | Estado: ${task.status}`}
                >
                  {/* 👇 AQUÍ ESTÁ EL CÍRCULO DE COLOR PARA ESCRITORIO 👇 */}
                  <span style={{
                    display: "inline-block",
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    backgroundColor: STATUS_CONFIG[task.status]?.color || "#ccc",
                    marginRight: "6px",
                    border: "1px solid white",
                    verticalAlign: "middle"
                  }}></span>
                  
                  <span
                    style={{
                      textDecoration: task.status === "completada" ? "line-through" : "none",
                      color: "#fff",
                      fontWeight: task.status === "en_proceso" ? "bold" : "normal",
                      verticalAlign: "middle"
                    }}
                  >
                    {/* 👇 MAGIA: Si la tarea tiene recurrencia, le pone el ícono 🔄 👇 */}
                    {task.recurrence && task.recurrence !== "none" && <span title="Se repite automáticamente">🔄 </span>}
                    
                    {task.time ? ` ${task.time.substring(0, 5)} - ` : ""}{task.title}
                  </span>
                </div>
              );
            })}

            {/* 👇 NUEVO: Botón de "Ver más" si superamos el límite */}
            {hiddenCount > 0 && (
              <div
                onClick={() => {
                  setDayModalTitle(`${i} de ${mesesNombres[month]}`);
                  setDayModalDateStr(dayString); // 👈 Pasamos el string para que escuche cambios en vivo
                }}
                style={{
                  fontSize: "11px", color: "#007bff", fontWeight: "bold",
                  cursor: "pointer", textAlign: "center", marginTop: "2px",
                  padding: "4px 2px", backgroundColor: "#e9ecef", borderRadius: "4px"
                }}
              >
                + {hiddenCount} más...
              </div>
            )}

          </div>
        </div>,
      );
    }
    return days;
  };

  // --- FUNCIONES PARA LA EVIDENCIA ---
  const handleEvidenceFileChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith("image/")) {
      setEvidenceFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setEvidencePreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

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
        <span style={{ fontSize: "40px", marginBottom: "10px" }}>📊</span>
        <h3 style={{ color: "#2c3e50", margin: 0 }}>
          Cargando panel de operaciones...
        </h3>
        <p style={{ color: "#7f8c8d" }}>Calculando rendimiento y calendario</p>
      </div>
    );
  }
  const renderSingleDay = () => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    const date = calendarDate.getDate();

    const dayString = `${year}-${String(month + 1).padStart(2, "0")}-${String(date).padStart(2, "0")}`;
    
    // 👇 FIX: Usa filteredTasks y acomoda por hora también en móvil
    const dayTasks = filteredTasks
        .filter((t) => t.date === dayString)
        .sort((a, b) => (a.time || "23:59").localeCompare(b.time || "23:59"));
    
    return (
      <div style={{ padding: "10px", minHeight: "150px" }}>
        {dayTasks.length > 0 ? (
          dayTasks.map((task) => {
            const colabInfo = collaborators.find((c) => String(c.id) === String(task.user_id)) || { color: "#6c757d", name: "Desconocido" };
           return (
                <div
                  key={task.id}
                  style={{
                    ...styles.taskPill,
                    backgroundColor: colabInfo.color,
                    opacity: task.status === "completada" ? 0.6 : 1,
                    border: task.status === "en_proceso" ? "2px dashed black" : "none",
                  }}
                  onClick={() => openEditModal(task)}
                  title={`Asignado a: ${colabInfo.name} | Estado: ${task.status}`}
                >
                  {/* 👇 AQUÍ SÍ VA EL CÍRCULO DE COLOR 👇 */}
                  <span style={{
                    display: "inline-block",
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    backgroundColor: STATUS_CONFIG[task.status]?.color || "#ccc",
                    marginRight: "6px",
                    border: "1px solid white",
                    verticalAlign: "middle"
                  }}></span>
                  
                  <span
                    style={{
                      textDecoration: task.status === "completada" ? "line-through" : "none",
                      color: "#fff",
                      fontWeight: task.status === "en_proceso" ? "bold" : "normal",
                      verticalAlign: "middle"
                    }}
                  >
                    {task.time ? ` ${task.time.substring(0, 5)} - ` : ""}{task.title}
                  </span>
                <span style={{ color: "#f0f0f0", fontSize: "12px" }}>
                  👤 {colabInfo.name} | 📌 {task.status.replace("_", " ").toUpperCase()}
                </span>
              </div>
            );
          })
        ) : (
          <div style={{ textAlign: "center", color: "#999", padding: "20px 0" }}>
            🌴 No hay operaciones programadas.
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ padding: "10px" }}>
      {/* ENCABEZADO */}
      <div style={{
        ...styles.header, 
        // 👇 LA MAGIA: Apilamos en columna si es celular, fila si es computadora
        display: "flex",
        flexDirection: isMobile ? "column" : "row",
        alignItems: isMobile ? "flex-start" : "center",
        justifyContent: "space-between",
        gap: isMobile ? "15px" : "0" // Da aire entre los elementos en celular
      }}>
        <div>
          <h2 style={{ 
            margin: 0, 
            color: "#2c3e50",
            fontSize: isMobile ? "20px" : "24px" // Texto un poco más ajustado en móvil
          }}>
            ¡Hola, {user?.name || "Administrador"}! 👋
          </h2>
          <p style={{ margin: "5px 0 0", color: "#7f8c8d", fontSize: isMobile ? "14px" : "16px" }}>
            {user?.role !== "colaborador"
              ? "Resumen operativo de tu equipo para este mes."
              : "Aquí están tus tareas asignadas."}
          </p>
        </div>

        {/* Mostramos botón si es JEFE (no colaborador) */}
        {user?.role !== "colaborador" &&
          (collaborators.length > 0 ? (
            <button 
              onClick={openCreateModal} 
              style={{
                ...styles.btnAction,
                width: isMobile ? "100%" : "auto", // Botón ancho en celular
                marginTop: isMobile ? "10px" : "0"
              }}
            >
              ➕ Asignar Nueva Tarea
            </button>
          ) : (
            // 👇 NUEVO ESTILO: Metimos la advertencia en una cajita amarilla profesional
            <div style={{ 
              backgroundColor: "#fff3cd", 
              padding: "10px", 
              borderRadius: "8px", 
              border: "1px solid #ffeeba",
              width: isMobile ? "100%" : "auto",
              boxSizing: "border-box"
            }}>
              <p style={{ color: "#856404", margin: 0, fontSize: "14px", fontWeight: "bold" }}>
                ⚠️ Registra colaboradores primero para asignar tareas.
              </p>
            </div>
          ))}
      </div>

      {/* CARRUSEL ACTUALIZADO CON DATOS REALES */}
      {/* 👇 LA CONDICIÓN: Solo se dibuja si NO es móvil (!isMobile) */}
      {!isMobile && (
        <> {/* 👈 Fragmento de React para agrupar el título y el carrusel */}
          <div style={styles.sectionTitle}>👨‍💻 Rendimiento del Equipo de Campo</div>
          <div style={styles.carouselContainer}>
            <button
              onClick={() => scrollCarousel("left")}
              style={styles.carouselBtn}
            >
              ❮
            </button>
            <div ref={carouselRef} style={styles.carouselScroll}>
              {activeColaboradores.length === 0 && (
                <p style={{ color: "#999", margin: "auto" }}>
                  No hay personal en tu plantilla.
                </p>
              )}

              {activeColaboradores.map((colab) => (
                <div
                  key={colab.id}
                  style={{
                    ...styles.colabCard,
                    borderTop: `4px solid ${colab.color}`,
                  }}
                >
                  <div
                    style={{ display: "flex", alignItems: "center", gap: "10px" }}
                  >
                    {colab.logo_path ? (
                      <img
                        src={`https://api.gigafiber.mx/storage/${colab.logo_path}`}
                        style={{
                          width: "40px",
                          height: "40px",
                          borderRadius: "50%",
                          objectFit: "cover",
                        }}
                        onError={(e) => {
                          e.target.style.display = "none";
                          e.target.nextSibling.style.display = "flex";
                        }}
                      />
                    ) : null}
                    <div
                      style={{
                        width: "40px",
                        height: "40px",
                        borderRadius: "50%",
                        backgroundColor: colab.color,
                        color: "white",
                        display: colab.logo_path ? "none" : "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        fontWeight: "bold",
                      }}
                    >
                      {colab.name.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flex: 1 }}>
                      <h4 style={{ margin: 0, fontSize: "14px", color: "#333" }}>
                        {colab.name}
                      </h4>
                      <small style={{ color: "#666" }}>
                        {colab.job_title || "Técnico"}
                      </small>
                      <div style={{ marginTop: "2px" }}>
                        <span
                          style={{
                            fontSize: "11px",
                            background: "#f0f0f0",
                            padding: "2px 6px",
                            borderRadius: "10px",
                            color: "#555",
                          }}
                        >
                          {colab.taskCount} tareas pendientes
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={() => scrollCarousel("right")}
              style={styles.carouselBtn}
            >
              ❯
            </button>
          </div>
        </>
      )} 
      
      {/* 👇 NUEVA BARRA DE BÚSQUEDA Y FILTROS 👇 */}
      <div style={{
        display: "flex", flexDirection: isMobile ? "column" : "row", gap: "10px", 
        marginBottom: "20px", backgroundColor: "white", padding: "15px",
        borderRadius: "8px", boxShadow: "0 2px 4px rgba(0,0,0,0.05)"
      }}>
        <div style={{ flex: 2, display: "flex", alignItems: "center", border: "1px solid #ddd", borderRadius: "6px", padding: "0 10px", backgroundColor: "#f8f9fa" }}>
          <span>🔍</span>
          <input 
            type="text" 
            placeholder="Buscar por título, palabra clave o descripción..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ ...styles.input, border: "none", backgroundColor: "transparent", boxShadow: "none", outline: "none", width: "100%" }}
          />
        </div>

        {user?.role !== "colaborador" && (
          <>
            <select 
              value={filterColab} 
              onChange={(e) => setFilterColab(e.target.value)} 
              style={{ ...styles.input, flex: 1 }}
            >
              <option value="">👥 Todos los colaboradores</option>
              {collaborators.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
           
            <button 
              type="button"
              onClick={() => setShowRecurringOnly(!showRecurringOnly)}
              title={showRecurringOnly ? "Ocultar tareas automatizadas" : "Ver solo tareas automatizadas"}
              style={{
                padding: "10px", borderRadius: "6px", cursor: "pointer", 
                backgroundColor: showRecurringOnly ? "#e3f2fd" : "#fff",
                border: `1px solid ${showRecurringOnly ? "#007bff" : "#ddd"}`,
                display: "flex", alignItems: "center", justifyContent: "center", width: "42px"
              }}
            >
              🔄
            </button>

            {/* 👇 NUEVO: Botón para abrir el Gestor de Rutinas 👇 */}
            <button 
              type="button"
              onClick={() => setIsRecurringManagerOpen(true)}
              title="Administrar Rutinas"
              style={{
                padding: "10px", borderRadius: "6px", cursor: "pointer", 
                backgroundColor: "#fff", color: "#6c5ce7",
                border: "1px solid #6c5ce7",
                display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", whiteSpace: "nowrap"
              }}
            >
              ⚙️ {isMobile ? "" : " Gestionar Rutinas"}
            </button>
          </>
        )}
      </div>

      {/* CALENDARIO */}
      <div style={styles.sectionTitle}>📅 Calendario de Operaciones</div>
      <div style={styles.calendarWrapper}>

        {isMobile ? (
          /* =========================================
             📱 VERSIÓN MÓVIL (DÍA POR DÍA)
             ========================================= */
          <div>
            <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "15px",
            backgroundColor: "#fff",
            padding: "10px",
            borderRadius: "8px",
            boxShadow: "0 2px 5px rgba(0,0,0,0.05)"
          }}>
              <button onClick={handlePrevDay} style={{ ...styles.calendarNavButton, fontSize: "14px", padding: "5px 10px" }}>
                &lt; Ayer
              </button>
              <h3 style={{ ...styles.calendarMonthTitle, fontSize: "15px", margin: 0 }}>
                {tituloDia}
              </h3>
              <button onClick={handleNextDay} style={{ ...styles.calendarNavButton, fontSize: "14px", padding: "5px 10px" }}>
                Mañana &gt;
              </button>
            </div>

            {/* Contenedor de las tareas del día */}
            <div style={{ 
            backgroundColor: "#f8f9fa", 
            borderRadius: "8px", 
            border: "1px solid #e9ecef",
            minHeight: "60vh",  /* 👈 LA MAGIA: Ocupa el 60% de la pantalla */
            display: "flex",
            flexDirection: "column", 
            justifyContent: "flex-start", /* Mantiene las tareas arriba */
            padding: "10px"
          }}>
            {renderSingleDay()}
          </div>
          </div>
        ) : (
          /* =========================================
             🖥️ VERSIÓN ESCRITORIO (MES COMPLETO)
             ========================================= */
          <div>
            <div style={styles.calendarControls}>
              <button onClick={handlePrevMonth} style={styles.calendarNavButton}>
                &lt; Anterior
              </button>
              <h3 style={styles.calendarMonthTitle}>{tituloMes}</h3>
              <button onClick={handleNextMonth} style={styles.calendarNavButton}>
                Siguiente &gt;
              </button>
            </div>

            <div style={styles.calendarHeader}>
              <div>Dom</div><div>Lun</div><div>Mar</div><div>Mié</div><div>Jue</div><div>Vie</div><div>Sáb</div>
            </div>
            <div style={styles.calendarGrid}>{renderCalendarDays()}</div>
          </div>
        )}

      </div>

      {/* 👇 NUEVO: MODAL PARA VER TODAS LAS TAREAS DE UN DÍA (SOLO ESCRITORIO) 👇 */}
      {dayModalDateStr && !isMobile && (
        <div style={styles.modalOverlay} onClick={() => setDayModalDateStr(null)}>
          <div 
            style={{ ...styles.modalContent, maxWidth: "500px" }} 
            onClick={(e) => e.stopPropagation()} 
          >
            <h3 style={{ marginTop: 0, color: "#333", borderBottom: "1px solid #eee", paddingBottom: "10px" }}>
              📅 Operaciones del {dayModalTitle}
            </h3>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", maxHeight: "60vh", overflowY: "auto", padding: "10px 0" }}>
              {/* 👇 LA MAGIA: Filtramos directo de la matriz principal para reflejar cambios automáticos */}
              {filteredTasks
                .filter((t) => t.date === dayModalDateStr)
                .sort((a, b) => (a.time || "23:59").localeCompare(b.time || "23:59"))
                .map((task) => {
                const colabInfo = collaborators.find((c) => String(c.id) === String(task.user_id)) || { color: "#6c757d", name: "Desconocido" };
                return (
                  <div
                    key={task.id}
                    style={{
                      backgroundColor: colabInfo.color,
                      padding: "12px", borderRadius: "6px", cursor: "pointer",
                      opacity: task.status === "completada" ? 0.6 : 1,
                      border: task.status === "en_proceso" ? "2px dashed black" : "none",
                      display: "flex", flexDirection: "column", gap: "4px"
                    }}
                    onClick={() => {
                      openEditModal(task);
                    }}
                  >
                    <span style={{ color: "#fff", fontWeight: "bold", fontSize: "15px", textDecoration: task.status === "completada" ? "line-through" : "none" }}>
                      {task.time ? ` ${task.time.substring(0, 5)} | ` : ""}{task.title}
                    </span>
                    <span style={{ color: "#f0f0f0", fontSize: "12px" }}>
                      👤 {colabInfo.name} | 📌 {task.status.replace("_", " ").toUpperCase()}
                    </span>
                  </div>
                );
              })}
            </div>
            
            <button
              onClick={() => setDayModalDateStr(null)}
              style={{ ...styles.btnSecondary, width: "100%", marginTop: "15px" }}
            >
              Cerrar Lista
            </button>
          </div>
        </div>
      )}
      {/* 👆 FIN DEL NUEVO MODAL 👆 */}

      {/* MODAL UNIFICADO DE TAREAS */}
      {isTaskModalOpen && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <h3 style={{ marginTop: 0, color: "#333" }}>
              {modalMode === "create"
                ? "➕ Nueva Tarea Operativa"
                : "✏️ Detalle de Tarea Operativa"}
            </h3>
            {/* 👇 MENÚ DE PESTAÑAS 👇 */}
            <div style={styles.tabContainer}>
              <button 
                type="button"
                style={{...styles.tabButton, ...(activeTab === "detalles" ? styles.tabButtonActive : {})}}
                onClick={() => setActiveTab("detalles")}
              >
                📝 Detalles
              </button>
              
              {/* Info solo en modo edición */}
              {modalMode === "edit" && user?.role !== "colaborador" && (
                <button 
                  type="button"
                  style={{...styles.tabButton, ...(activeTab === "info" ? styles.tabButtonActive : {})}}
                  onClick={() => setActiveTab("info")}
                >
                  📊 Info y Métricas
                </button>
              )}

              {/* Repetición solo en creación y para el jefe/supervisor */}
              {modalMode === "create" && user?.role !== "colaborador" && (
                <button 
                  type="button"
                  style={{...styles.tabButton, ...(activeTab === "repetir" ? styles.tabButtonActive : {})}}
                  onClick={() => setActiveTab("repetir")}
                >
                  🔄 Repetir Tarea
                </button>
              )}
            </div>

            <form
              onSubmit={handleSubmit}
              noValidate
              style={{ display: "flex", flexDirection: "column", gap: "15px" }}
            >
              {/* =========================================
                  PESTAÑA 1: DETALLES
                  ========================================= */}
              <div style={{ display: activeTab === "detalles" ? "flex" : "none", flexDirection: "column", gap: "15px" }}>
              {/* Título - Fila Completa */}
              <div>
                <label style={styles.label}>Título de la Tarea:</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  style={styles.input}
                  required
                  placeholder="Ej. Mantenimiento preventivo"
                  disabled={user?.role === "colaborador"} // 🔒 Bloqueado para técnicos
                  list="historial-titulos" /* 👈 LA MAGIA: Conecta el input con la lista de abajo */
                  autoComplete="off" /* Evita que el navegador meta su propio historial basura */
                />
                
                {/* 👇 LA LISTA DESPLEGABLE INVISIBLE 👇 */}
                <datalist id="historial-titulos">
                  {uniqueTitles.map((titulo, index) => (
                    <option key={index} value={titulo} />
                  ))}
                </datalist>
              </div>

              {/* GRID 1: Fecha, Hora y Colaborador */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1.5fr",
                  gap: "15px",
                }}
              >
                <div>
                  <label style={styles.label}>Fecha:</label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) =>
                      setFormData({ ...formData, date: e.target.value })
                    }
                    /* 👇 LA MAGIA: Fuerza al navegador a desplegar el calendario visual 
                        con solo dar clic en cualquier parte del cuadro 👇 */
                    onClick={(e) => {
                      if (user?.role !== "colaborador" && typeof e.target.showPicker === 'function') {
                        e.target.showPicker();
                      }
                    }}
                    style={{ 
                      ...styles.input, 
                      cursor: user?.role === "colaborador" ? "default" : "pointer" 
                    }}
                    required
                    disabled={user?.role === "colaborador"} // 🔒 Bloqueado para técnicos
                  />
                </div>
                
                {/* ⏰ NUEVO: Campo de Hora */}
                <div>
                  <label style={styles.label}>Hora(24h):</label>
                  <input
                    type="time"
                    value={formData.time || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, time: e.target.value })
                    }
                    style={styles.input}
                    required
                    disabled={user?.role === "colaborador"} // 🔒 Bloqueado
                  />
                </div>

                <div>
                  <label style={styles.label}>Colaborador Asignado:</label>
                  <select
                    value={formData.user_id || ""} // 👈 FIX: Ahora sí modifica al Colaborador (user_id)
                    onChange={(e) =>
                      setFormData({ ...formData, user_id: e.target.value })
                    }
                    style={styles.input}
                    disabled={user?.role === "colaborador"}
                    required
                  >
                    <option value="" disabled>
                      Selecciona uno...
                    </option>
                    {formData.user_id === user?.id && (
                      <option value={user?.id}> Sin Asignar </option>
                    )}
                    {collaborators.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* GRID 2: Estado y Cliente / Botones de Acción */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "15px",
                }}
              >
                {/* COLUMNA IZQUIERDA: Select de Estado Operativo y Motivo */}
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <label style={styles.label}>Estado Operativo:</label>
                  <select
                    value={formData.status}
                    onChange={(e) =>
                      setFormData({ ...formData, status: e.target.value })
                    }
                    style={styles.input}
                    // 🔒 El estado se bloquea para el técnico SI YA SUBIÓ evidencia
                    disabled={user?.role === "colaborador" && !!formData.evidence_path} 
                  >
                    {Object.keys(STATUS_CONFIG).map((key) => (
                      <option key={key} value={key}>
                        {STATUS_CONFIG[key].label}
                      </option>
                    ))}
                  </select>

                  {/* 👇 CAMPO CONDICIONAL: AHORA ESTÁ DEBAJO DEL SELECT 👇 */}
                  {formData.status === "reagendar" && (
                    <div style={{ 
                      marginTop: "12px", // Lo separa un poquito del select
                      backgroundColor: "#fcecf4", 
                      padding: "10px", 
                      borderRadius: "6px", 
                      border: "1px solid #f8bbd0" 
                    }}>
                      <label style={{...styles.label, color: "#e84393", fontSize: "11px"}}>
                        ¿Motivo para reagendar? *
                      </label>
                      <textarea
                        value={formData.reschedule_reason || ""}
                        onChange={(e) =>
                          setFormData({ ...formData, reschedule_reason: e.target.value })
                        }
                        // Ajustamos la altura y el tamaño de letra para que no sea estorboso
                        style={{ ...styles.input, height: "60px", borderColor: "#f8bbd0", fontSize: "12px", padding: "8px" }}
                        placeholder="Ej. Cliente ausente, falta de material..."
                        required={formData.status === "reagendar"}
                        disabled={false} /* 👈 2. FIX: Quitamos el candado para que el técnico SIEMPRE pueda escribir */
                      />
                      {user?.role === "colaborador" && (
                         <small style={{ color: "#e84393", display: "block", marginTop: "6px", fontSize: "10px", fontWeight: "bold", lineHeight: "1.2" }}>
                           ⚠️ Escribe el motivo y guarda los cambios para confirmar.
                         </small>
                      )}
                    </div>
                  )}
                </div>

                {/* COLUMNA DERECHA: Dinámica según el Rol */}
                {user?.role === "colaborador" ? (
                  // 👉 VISTA DEL TÉCNICO: Botones en el espacio vacío
                  <div>
                    <label style={{...styles.label, color: "#007bff"}}>⚡ Actualización rápida:</label>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                      {Object.keys(STATUS_CONFIG).map((statusKey) => {
                        const config = STATUS_CONFIG[statusKey];
                        const isActive = formData.status === statusKey;
                        
                        // 👇 FIX: Evitar que el técnico retroceda a pendiente o en proceso si ya terminó 👇
                        const isColaborador = user?.role === "colaborador";
                        const isFinalizada = ["completada", "finalizado_con_pendientes", "reagendar"].includes(formData.status);
                        const isRetroceso = ["pendiente", "en_proceso"].includes(statusKey);

                        if (isColaborador && isFinalizada && isRetroceso) {
                            return null; // Oculta el botón para que no pueda dar clic
                        }
                        
                        return (
                          <button
                            key={statusKey}
                            type="button"
                            onClick={async () => {
                              if (statusKey === "reagendar") {
                                setFormData({ ...formData, status: statusKey });
                                return;
                              }
                              
                              const necesitaEvidencia = statusKey === "completada" || statusKey === "finalizado_con_pendientes";
                              const tieneEvidenciaNueva = evidenceFile || evidenceNotes;
                              const teniaEvidenciaVieja = formData.evidence_path || formData.evidence_notes;

                              if (necesitaEvidencia && !tieneEvidenciaNueva && !teniaEvidenciaVieja) {
                                  showToast("⚠️ Agrega una foto o nota antes de finalizar.", "warning");
                                  return;
                              }

                              try {
                                const updateData = new FormData();
                                const camposProtegidos = ['client', 'recurrence', 'creator_id', 'updater_id', 'created_at', 'updated_at', 'viewed_at', 'started_at', 'completed_at', 'evidence_path', 'evidence_notes'];

                                Object.keys(formData).forEach(key => {
                                  if (formData[key] !== null && formData[key] !== undefined && !camposProtegidos.includes(key)) {
                                    updateData.append(key, formData[key]);
                                  }
                                });
                                
                                updateData.set("status", statusKey); 
                                updateData.append("_method", "PUT"); 
                                
                                if (evidenceFile) updateData.append("evidence_photo", evidenceFile);
                                if (evidenceNotes) updateData.append("evidence_notes", evidenceNotes);

                                await api.post(`/tasks/${formData.id}`, updateData, { headers: { "Content-Type": "multipart/form-data" } });
                                
                                // 👇 1. FIX DEFINITIVO: BORRAMOS EL CÓDIGO FANTASMA QUE CHOCABA 👇
                                showToast("✅ Estado actualizado");
                                setIsTaskModalOpen(false);
                                setDayModalTasks(null); 
                                fetchDashboardData();

                              } catch (err) { 
                                showToast("❌ Error al registrar la operación. Revisa tu conexión.", "error"); 
                              }
                            }}
                            style={{
                              width: "100%", 
                              justifyContent: "center", 
                              padding: "10px", 
                              backgroundColor: isActive ? config.color : config.bg,
                              color: isActive ? "white" : config.color,
                              border: `1px solid ${isActive ? config.color : config.color + "50"}`,
                              borderRadius: "6px",
                              cursor: "pointer",
                              fontSize: "12px",
                              fontWeight: "bold",
                              transition: "all 0.2s ease-in-out",
                              display: "flex",
                              alignItems: "center",
                              gap: "6px",
                              boxShadow: isActive ? `0 3px 8px ${config.color}60` : "none",
                              gridColumn: statusKey === "reagendar" ? "1 / -1" : "auto" 
                            }}
                          >
                            {isActive && <span style={{ fontSize: "12px" }}>✓</span>}
                            {config.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  // 👉 VISTA DEL JEFE: Selector de Cliente
                  <div>
                    <label style={styles.label}>
                      Cliente Asociado (Opcional):
                    </label>
                    <select
                      value={formData.client_id || ""} 
                      onChange={(e) => {
                        const selectedId = e.target.value;
                        const selectedClient = clientes?.find(c => String(c.id) === String(selectedId));
                        
                        setFormData({
                          ...formData,
                          client_id: selectedId,
                          address: selectedClient ? (selectedClient.address || "") : formData.address
                        });
                      }}
                      style={styles.input}
                    >
                      <option value="">
                        -- Tarea Interna (Sin Cliente) --
                      </option>
                      {clientes?.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Descripción */}
              <div>
                <label style={styles.label}>Descripción / Instrucciones:</label>
                <textarea
                  value={formData.description || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  style={{ ...styles.input, height: "60px" }}
                  placeholder="Detalles de lo que se debe hacer..."
                  disabled={user?.role === "colaborador"} 
                  required
                />
              <div style={{ display: "flex", gap: "10px" }}>
                  
                  {/* 👇 NUEVO: Input envuelto en Autocomplete 👇 */}
                  <div style={{ flex: 1 }}>
                    {isLoaded && user?.role !== "colaborador" ? (
                      <Autocomplete
                        onLoad={onLoadAutocomplete}
                        onPlaceChanged={onPlaceChanged}
                      >
                        <input
                          type="text"
                          value={formData.address || ""}
                          onChange={(e) =>
                            setFormData({ ...formData, address: e.target.value })
                          }
                          style={{ ...styles.input, width: "100%", marginBottom: 0 }}
                          placeholder="Busca una dirección o lugar..."
                          required
                        />
                      </Autocomplete>
                    ) : (
                      <input
                        type="text"
                        value={formData.address || ""}
                        onChange={(e) =>
                          setFormData({ ...formData, address: e.target.value })
                        }
                        style={{ ...styles.input, width: "100%", marginBottom: 0 }}
                        placeholder="Dirección del servicio..."
                        disabled={user?.role === "colaborador"}
                        required
                      />
                    )}
                  </div>
                  
                  {/* Botón para abrir/cerrar el mapa */}
                  {user?.role !== "colaborador" && (
                    <button
                      type="button"
                      onClick={() => setShowMap(!showMap)}
                      style={{
                        padding: "10px 15px",
                        backgroundColor: showMap ? "#6c757d" : "#f39c12", 
                        color: "white",
                        border: "none",
                        borderRadius: "6px",
                        cursor: "pointer",
                        fontWeight: "bold",
                        whiteSpace: "nowrap"
                      }}
                    >
                      {showMap ? "❌ Cerrar Mapa" : "📍 Ubicar en Mapa"}
                    </button>
                  )}
                  {/* 👇 NUEVO: BOTÓN DE RUTA DIRECTA (JEFE Y TÉCNICO) 👇 */}
                  {formData.lat && formData.lng && (
                    <button
                      type="button"
                      onClick={() => {
                        // Esta URL universal abre la app de Google Maps en Android e iOS
                        const url = `https://www.google.com/maps/search/?api=1&query=${formData.lat},${formData.lng}`;
                        window.open(url, "_blank");
                      }}
                      style={{
                        padding: "10px 15px",
                        backgroundColor: "#149004", /* Azul característico de Google */
                        color: "white",
                        border: "none",
                        borderRadius: "6px",
                        cursor: "pointer",
                        fontWeight: "bold",
                        whiteSpace: "nowrap"
                      }}
                    >
                      🗺️ Abrir en Google Maps
                    </button>
                  )}
                </div>

                {/* EL MAPA DE GOOGLE */}
                {showMap && isLoaded && (
                  <div style={{ marginTop: "10px" }}>
                    <p style={{ fontSize: "12px", color: "#666", margin: "0 0 5px 0" }}>
                      👆 Haz clic en el mapa para colocar el pin exacto del servicio:
                    </p>
                    <GoogleMap
                      mapContainerStyle={MAP_CONTAINER_STYLE}
                      /* 👇 FIX: Envolvemos los datos en Number() para asegurar que sean coordenadas matemáticas */
                      center={formData.lat && formData.lng ? { lat: Number(formData.lat), lng: Number(formData.lng) } : MAP_DEFAULT_CENTER}
                      zoom={formData.lat && formData.lng ? 17 : 12}
                      onClick={handleMapClick}
                      onLoad={(map) => setMapInstance(map)} 
                    >
                      {/* 👇 FIX: También envolvemos los datos del Marker en Number() */}
                      {formData.lat && formData.lng && (
                        <Marker position={{ lat: Number(formData.lat), lng: Number(formData.lng) }} />
                      )}
                    </GoogleMap>
                  </div>
                )}
              </div>
              {/* 👆 FIN DIRECCIÓN Y MAPA 👆 */}

              {/* VISTA DEL TÉCNICO: Tarjeta de Información del Cliente */}
              {user?.role === "colaborador" && formData.client && (
                <div
                  style={{
                    marginTop: "5px",
                    backgroundColor: "#e3f2fd",
                    borderLeft: "4px solid #007bff",
                    padding: "12px",
                    borderRadius: "4px",
                  }}
                >
                  <h4 style={{ margin: "0 0 8px 0", color: "#0056b3", fontSize: "14px" }}>
                    📍 Información del Servicio
                  </h4>
                  <div
                    style={{
                      fontSize: "13px",
                      color: "#333",
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "8px",
                    }}
                  >
                    <span><strong>Empresa:</strong> {formData.client.name}</span>
                    <span><strong>Contacto:</strong> {formData.client.contact_person || "No especificado"}</span>
                    <span>
                      <strong>📞 Teléfono:</strong>{" "}
                      <a href={`tel:${formData.client.phone}`} style={{ color: "#007bff", textDecoration: "none" }}>
                        {formData.client.phone || "N/A"}
                      </a>
                    </span>
                    <span><strong>🗺️ Dirección:</strong> {formData.client.address || "N/A"}</span>
                  </div>
                </div>
              )}

              {/* SECCIÓN DE EVIDENCIA */}
             {/* 👇 SECCIÓN DE EVIDENCIA ACTUALIZADA (CARRUSEL MÚLTIPLE) 👇 */}
              {modalMode === "edit" && (
                <div style={{ marginTop: "15px", padding: "15px", backgroundColor: "#f8f9fa", borderRadius: "8px", border: "1px solid #e9ecef" }}>
                  <h4 style={{ margin: "0 0 10px 0", color: "#495057" }}>📸 Reporte de Evidencia</h4>

                  {(() => {
                    // 👇 LA SOLUCIÓN DEFINITIVA (EXTRACTOR TOTAL) 👇
                    let pathsArray = [];
                    if (formData.evidence_path && String(formData.evidence_path) !== "null" && String(formData.evidence_path).trim() !== "") {
                      // 1. Tomamos lo que venga de la base de datos
                      let rawPath = String(formData.evidence_path);
                      
                      // 2. Destruimos sin piedad: corchetes, comillas dobles, simples y diagonales invertidas
                      rawPath = rawPath.replace(/[\[\]"'\\]+/g, '');
                      
                      // 3. Separamos por comas (por si hay más de una foto en la lista)
                      pathsArray = rawPath.split(',').map(p => p.trim()).filter(Boolean);
                    }
                    
                    let notesArray = [];
                    if (formData.evidence_notes && String(formData.evidence_notes) !== "null" && String(formData.evidence_notes).trim() !== "") {
                      try { 
                        let parsed = JSON.parse(formData.evidence_notes);
                        // A veces el servidor empaca el texto dos veces, lo comprobamos:
                        if (typeof parsed === 'string') {
                            try { parsed = JSON.parse(parsed); } catch { /* nada */ }
                        }
                        notesArray = Array.isArray(parsed) ? parsed : [parsed]; 
                      } catch { 
                        notesArray = [formData.evidence_notes]; 
                      }
                    }

                    const totalEvidences = Math.max(pathsArray.length, notesArray.length);

                    return (
                      <>
                        {totalEvidences > 0 && !isAddingEvidence ? (
                          // 🖼️ MODO VISTA: CARRUSEL DE EVIDENCIAS
                          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                            
                            {/* CONTROLES DEL CARRUSEL (Solo si hay más de 1) */}
                            {totalEvidences > 1 && (
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", backgroundColor: "#e9ecef", padding: "8px", borderRadius: "6px", border: "1px solid #ddd" }}>
                                <button type="button" onClick={() => setEvidenceIndex(prev => Math.max(0, prev - 1))} disabled={evidenceIndex === 0} style={{ border: "none", background: "#6c757d", color: "white", padding: "5px 12px", borderRadius: "4px", cursor: evidenceIndex === 0 ? "not-allowed" : "pointer", opacity: evidenceIndex === 0 ? 0.4 : 1, fontWeight: "bold" }}>
                                  ◀ Anterior
                                </button>
                                <span style={{ fontSize: "13px", fontWeight: "bold", color: "#333" }}>
                                  Evidencia {evidenceIndex + 1} de {totalEvidences}
                                </span>
                                <button type="button" onClick={() => setEvidenceIndex(prev => Math.min(totalEvidences - 1, prev + 1))} disabled={evidenceIndex === totalEvidences - 1} style={{ border: "none", background: "#6c757d", color: "white", padding: "5px 12px", borderRadius: "4px", cursor: evidenceIndex === totalEvidences - 1 ? "not-allowed" : "pointer", opacity: evidenceIndex === totalEvidences - 1 ? 0.4 : 1, fontWeight: "bold" }}>
                                  Siguiente ▶
                                </button>
                              </div>
                            )}

                            {/* IMAGEN DEL CARRUSEL */}
                            {pathsArray[evidenceIndex] ? (
                              <div onClick={() => setFullScreenImage(`https://api.gigafiber.mx/storage/${pathsArray[evidenceIndex]}?v=${Date.now()}`)}>
                                <img 
                                  src={`https://api.gigafiber.mx/storage/${pathsArray[evidenceIndex]}?v=${Date.now()}`} 
                                  /* 👆 3. FIX: Engañamos a la memoria caché de Hostinger añadiendo la hora exacta */
                                  alt="Evidencia" 
                                  style={{ width: "100%", height: "180px", objectFit: "cover", borderRadius: "6px", border: "1px solid #ccc", cursor: "pointer" }} 
                                  title="Clic para ampliar" 
                                />
                              </div>
                            ) : (
                              <div style={{ width: "100%", height: "180px", backgroundColor: "#eee", display: "flex", justifyContent: "center", alignItems: "center", borderRadius: "6px", border: "1px dashed #ccc", color: "#999", fontSize: "12px" }}>
                                📷 Sin fotografía en este reporte
                              </div>
                            )}

                            {/* BOTÓN AGREGAR MÁS (Solo Colaborador) */}
                            {user?.role === "colaborador" && (
                              <button type="button" onClick={() => { setIsAddingEvidence(true); setEvidenceNotes(""); setEvidenceFile(null); setEvidencePreview(null); }} style={{ marginTop: "5px", padding: "10px", backgroundColor: "#17a2b8", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "bold", display: "flex", justifyContent: "center", alignItems: "center", gap: "5px" }}>
                                ➕ Añadir otro reporte a esta tarea
                              </button>
                            )}
                          </div>
                        ) : (
                          // 📝 MODO INPUT: SUBIR NUEVA EVIDENCIA
                          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                            {totalEvidences > 0 && (
                              <button type="button" onClick={() => setIsAddingEvidence(false)} style={{ alignSelf: "flex-start", padding: "6px 12px", backgroundColor: "#6c757d", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "12px", fontWeight: "bold" }}>
                                ❌ Cancelar y volver a galería
                              </button>
                            )}
                            
                            {user?.role === "colaborador" ? (
                              <>
                                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "5px" }}>
                                  <div style={{ width: "80px", height: "80px", borderRadius: "6px", overflow: "hidden", backgroundColor: "#eee", display: "flex", justifyContent: "center", alignItems: "center", border: "1px solid #ccc" }}>
                                    {evidencePreview ? <img src={evidencePreview} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ fontSize: "24px" }}>📁</span>}
                                  </div>
                                  <div style={{ flex: 1 }}>
                                    <input type="file" accept="image/*" onChange={handleEvidenceFileChange} ref={evidenceInputRef} style={{ display: "none" }} />
                                    <button type="button" onClick={() => evidenceInputRef.current.click()} style={{ padding: "8px 15px", backgroundColor: "#007bff", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "12px", fontWeight: "bold" }}>
                                      📷 {evidenceFile ? "Reemplazar Foto" : "Seleccionar Foto"}
                                    </button>
                                  </div>
                                </div>

                                <textarea
                                  placeholder="Describe el trabajo realizado o las refacciones utilizadas..."
                                  value={evidenceNotes}
                                  onChange={(e) => setEvidenceNotes(e.target.value)}
                                  style={{ width: "100%", height: "70px", padding: "10px", borderRadius: "6px", border: "1px solid #ccc", boxSizing: "border-box", fontFamily: "inherit" }}
                                />
                                
                                <div style={{ padding: "8px", backgroundColor: "#fff3cd", border: "1px solid #ffeeba", borderRadius: "6px" }}>
                                  <span style={{ fontSize: "11px", color: "#856404", fontWeight: "bold" }}>
                                    ⚠️ Para subir esta evidencia, da clic en un "Estado de Actualización Rápida" o en el botón verde de "Guardar Cambios" de abajo.
                                  </span>
                                </div>
                              </>
                            ) : (
                              <div style={{ textAlign: "center", padding: "20px 0", color: "#6c757d" }}>
                                <span style={{ fontSize: "24px", display: "block", marginBottom: "5px" }}>📵</span>
                                <span style={{ fontSize: "13px" }}>El técnico aún no ha subido evidencia.</span>
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              )}
              </div>

              {/* =========================================
                  PESTAÑA 2: INFORMACIÓN Y MÉTRICAS
                  ========================================= */}
              {activeTab === "info" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
                  <div style={{ backgroundColor: "#f8f9fa", padding: "15px", borderRadius: "8px", border: "1px solid #e9ecef" }}>
                    <h4 style={{ margin: "0 0 15px 0", color: "#495057", borderBottom: "1px solid #ddd", paddingBottom: "10px" }}>
                      Trazabilidad Operativa
                    </h4>
                    
                    {(() => {
                      const parseSafeDate = (d) => {
                        if (!d) return null;
                        let str = String(d);
                        if (!str.includes('T') && !str.includes('Z')) str = str.replace(' ', 'T') + 'Z'; 
                        return new Date(str);
                      };

                      const formatDate = (d) => {
                         const date = parseSafeDate(d);
                         return date ? date.toLocaleString() : "Pendiente";
                      };

                      const getDiffText = (start, end) => {
                        if (!start) return "---";
                        const d1 = parseSafeDate(start);
                        const d2 = end ? parseSafeDate(end) : new Date(); 
                        
                        const diffMs = d2 - d1;
                        if (diffMs < 0) return "Validando..."; 

                        const diffMins = Math.floor(diffMs / 60000);
                        const horas = Math.floor(diffMins / 60);
                        const minutos = diffMins % 60;
                        
                        if (horas === 0 && minutos === 0) return "Menos de un minuto";
                        if (horas === 0) return `${minutos} min`;
                        if (minutos === 0) return `${horas} h exactas`;
                        return `${horas} h y ${minutos} min`;
                      };

                      // 🛑 LA MAGIA DE CONGELAMIENTO 🛑
                      const estadosFinales = ["completada", "finalizado_con_pendientes", "reagendar"];
                      const isFinished = estadosFinales.includes(formData.status);
                      
                      // Si ya terminó, usamos su fecha de finalización. Si no, usa null para que el reloj siga corriendo en vivo.
                      const endTimePoint = isFinished ? (formData.completed_at || formData.updated_at) : null;

                      return (
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", fontSize: "14px" }}>
                          
                          {/* ================= DATOS BASE ================= */}
                          <span style={{ display: "flex", flexDirection: "column" }}>
                            <strong style={{ color: "#495057" }}>📅 Creada el:</strong> 
                            <span style={{ color: "#6c757d", marginTop: "4px" }}>
                              {formatDate(formData.created_at)}
                            </span>
                          </span>

                          <span style={{ display: "flex", flexDirection: "column" }}>
                            <strong style={{ color: "#495057" }}>👤 Asignada por:</strong> 
                            <span style={{ color: "#007bff", fontWeight: "500", marginTop: "4px" }}>
                              {(() => {
                                if (!formData.creator_id) return "Administrador (Por defecto)";
                                if (String(formData.creator_id) === String(user?.id)) return `Tú (${user?.role === 'marca' || user?.role === 'admin' ? 'Admin' : (user?.role.charAt(0).toUpperCase() + user?.role.slice(1))})`;
                                
                                const creador = collaborators.find(c => String(c.id) === String(formData.creator_id));
                                if (creador) {
                                  const rolFormat = creador.role.charAt(0).toUpperCase() + creador.role.slice(1);
                                  return `${creador.name} (${rolFormat})`;
                                }
                                return "Administrador del Sistema";
                              })()}
                            </span>
                          </span>

                          {/* 👇 NUEVO: Renderizado Inteligente para Supervisores 👇 */}
                          {(() => {
                            if (!formData.updater_id) return null; // Si nadie la ha modificado, no dibuja nada
                            
                            // Buscamos al modificador en nuestra lista de colaboradores
                            const modificador = collaborators.find(c => String(c.id) === String(formData.updater_id));
                            
                            // MAGIA: Solo lo dibuja SI el usuario existe y su rol es EXCLUSIVAMENTE 'supervisor'
                            if (modificador && modificador.role === 'supervisor') {
                              return (
                                <span style={{ display: "flex", flexDirection: "column" }}>
                                  <strong style={{ color: "#495057" }}>✏️ Modificada por:</strong> 
                                  <span style={{ color: "#e67e22", fontWeight: "bold", marginTop: "4px" }}>
                                    {modificador.name} (Supervisor)
                                  </span>
                                </span>
                              );
                            }
                            return null; // Si fue modificada por un colaborador o admin, la etiqueta se oculta
                          })()}

                          {/* ================= FECHAS DE ACCIÓN ================= */}
                          <span style={{ display: "flex", flexDirection: "column" }}>
                            <strong style={{ color: "#495057" }}>👁️ Visto por el técnico:</strong> 
                            <span style={{ color: formData.viewed_at ? "#28a745" : "#6c757d", marginTop: "4px" }}>
                              {formatDate(formData.viewed_at)}
                            </span>
                          </span>
                          
                          <span style={{ display: "flex", flexDirection: "column" }}>
                            <strong style={{ color: "#495057" }}>▶️ Iniciada (En proceso):</strong> 
                            <span style={{ color: formData.started_at ? "#17a2b8" : "#6c757d", marginTop: "4px" }}>
                              {formatDate(formData.started_at)}
                            </span>
                          </span>
                          
                          {/* ================= DESGLOSE DE TIEMPOS (NUEVO TIMELINE) ================= */}
                          <div style={{ gridColumn: "1 / -1", backgroundColor: "#fff", padding: "15px", borderRadius: "8px", border: "1px solid #ddd", marginTop: "10px" }}>
                            <h5 style={{ margin: "0 0 12px 0", color: "#333", fontSize: "15px" }}>⏳ Análisis de Tiempos (Timeline)</h5>
                            
                            <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "13px" }}>
                              
                              {/* 1. Apertura -> Inicio */}
                              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px dashed #eee", paddingBottom: "6px" }}>
                                <span style={{ color: "#555" }}><strong>Tiempo de Preparación</strong> (Apertura ➔ Inicio):</span>
                                <span style={{ color: "#f1c40f", fontWeight: "bold" }}>
                                  {formData.started_at ? getDiffText(formData.viewed_at, formData.started_at) : (formData.viewed_at ? "Preparando..." : "No abierta")}
                                </span>
                              </div>

                              {/* 2. Inicio -> Cierre */}
                              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px dashed #eee", paddingBottom: "6px" }}>
                                <span style={{ color: "#555" }}><strong>Tiempo de Ejecución</strong> (Inicio ➔ Cierre):</span>
                                <span style={{ color: "#27ae60", fontWeight: "bold" }}>
                                  {!formData.started_at ? "Esperando inicio" :
                                   isFinished ? getDiffText(formData.started_at, endTimePoint) : 
                                   `${getDiffText(formData.started_at, null)} (En curso)`}
                                </span>
                              </div>

                              {/* 3. TOTAL (Solo Preparación + Ejecución) */}
                              <div style={{ display: "flex", justifyContent: "space-between", marginTop: "5px", padding: "10px", backgroundColor: isFinished ? "#d4edda" : "#e3f2fd", borderRadius: "6px", border: `1px solid ${isFinished ? "#c3e6cb" : "#b6d4fe"}` }}>
                                <span style={{ color: isFinished ? "#155724" : "#0056b3", fontSize: "14px" }}>
                                  <strong>{isFinished ? "Tiempo Final Congelado" : "Tiempo Total Operativo"}</strong> (Prep. + Ejecución):
                                </span>
                                <span style={{ color: isFinished ? "#155724" : "#0056b3", fontSize: "14px", fontWeight: "bold" }}>
                                  {!formData.viewed_at ? "0 min" :
                                   isFinished ? getDiffText(formData.viewed_at, endTimePoint) : 
                                   `${getDiffText(formData.viewed_at, null)} (Hasta ahora)`}
                                </span>
                              </div>

                            </div>
                          </div>

                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}

              {/* =========================================
                  PESTAÑA 3: REPETICIÓN (JSON)
                  ========================================= */}
              {activeTab === "repetir" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
                  <div style={{ backgroundColor: "#fff3cd", padding: "15px", borderRadius: "8px", border: "1px solid #ffeeba" }}>
                    <p style={{ margin: "0 0 15px 0", color: "#856404", fontSize: "14px" }}>
                      Configura la automatización. El sistema generará las copias a la medianoche.
                    </p>
                    
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px" }}>
                      <div>
                        <label style={styles.label}>Frecuencia:</label>
                        <select
                          value={typeof formData.recurrence === 'object' ? formData.recurrence.type : (formData.recurrence || 'none')}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === 'weekly_custom') setFormData({ ...formData, recurrence: { type: 'weekly_custom', days: [] } });
                            else if (val === 'monthly_custom') setFormData({ ...formData, recurrence: { type: 'monthly_custom', dates: [] } });
                            else setFormData({ ...formData, recurrence: val });
                          }}
                          style={styles.input}
                        >
                          <option value="none">No repetir (Una sola vez)</option>
                          <option value="daily">Todos los días</option>
                          <option value="weekly_custom">Semanal (Elegir días)</option>
                          
                          {/* 👇 OPCIONES NUEVAS Y ACTUALIZADAS 👇 */}
                          <option value="monthly">Mensual (El mismo día cada mes)</option>
                          <option value="monthly_custom">Mensual (Elegir días exactos ej. 15 y 30)</option>
                          <option value="bimonthly">Bimestral (Cada 2 meses)</option>
                        </select>
                      </div>

                      {formData.recurrence !== "none" && (
                        <div>
                          <label style={styles.label}>Repetir hasta el día:</label>
                          <input
                            type="date"
                            value={formData.recurrence_end || ""}
                            onChange={(e) => setFormData({ ...formData, recurrence_end: e.target.value })}
                            style={styles.input}
                            required={formData.recurrence !== "none"}
                          />
                        </div>
                      )}

                      {/* Lógica JSON de Días Semanales */}
                      {typeof formData.recurrence === 'object' && formData.recurrence.type === 'weekly_custom' && (
                        <div style={{ gridColumn: "1 / -1", backgroundColor: "#fff", padding: "10px", borderRadius: "6px" }}>
                          <label style={{...styles.label, marginBottom: "8px"}}>¿Qué días de la semana?</label>
                          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                            {[{ num: 1, label: "Lun" }, { num: 2, label: "Mar" }, { num: 3, label: "Mié" }, { num: 4, label: "Jue" }, { num: 5, label: "Vie" }, { num: 6, label: "Sáb" }, { num: 0, label: "Dom" }].map(dia => (
                              <label key={dia.num} style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "13px" }}>
                                <input 
                                  type="checkbox" 
                                  checked={formData.recurrence.days.includes(dia.num)}
                                  onChange={(e) => {
                                    const actuales = new Set(formData.recurrence.days);
                                    if (e.target.checked) actuales.add(dia.num);
                                    else actuales.delete(dia.num);
                                    setFormData({ ...formData, recurrence: { ...formData.recurrence, days: Array.from(actuales) } });
                                  }}
                                /> {dia.label}
                              </label>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Lógica JSON de Días Mensuales */}
                      {typeof formData.recurrence === 'object' && formData.recurrence.type === 'monthly_custom' && (
                        <div style={{ gridColumn: "1 / -1" }}>
                          <label style={styles.label}>¿Qué días del mes? (Ej: 15, 30)</label>
                          <input 
                            type="text" 
                            style={styles.input} 
                            placeholder="15, 30"
                            value={formData.recurrence.dates.join(', ')}
                            onChange={(e) => {
                              const numeritos = e.target.value.split(',').map(n => parseInt(n.trim())).filter(n => !isNaN(n) && n >= 1 && n <= 31);
                              setFormData({ ...formData, recurrence: { ...formData.recurrence, dates: numeritos } });
                            }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* 👇 BOTONES DE ACCIÓN PRINCIPALES 👇 */}
              <div style={{ display: "flex", gap: "10px", marginTop: "15px" }}>
                
                {/* 🔴 BOTÓN ELIMINAR (Solo Administrador) */}
                {user?.role !== "colaborador" && modalMode === "edit" && (
                  <button
                    type="button"
                    onClick={() => handleDeleteTask(formData.id)} 
                    disabled={isSaving}
                    style={{
                      padding: "12px 15px", backgroundColor: "#dc3545", color: "white",
                      border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "bold",
                    }}
                  >
                    🗑️ Eliminar
                  </button>
                )}

                {/* 🟢 BOTÓN GUARDAR (Jefe siempre. Técnico solo si la tarea NO está completada) */}
                {(user?.role !== "colaborador" || 
                  formData.status === "pendiente" || 
                  formData.status === "en_proceso" || 
                  formData.status === "reagendar" || /* 👈 EL FIX: Forzamos a que aparezca al reagendar */
                  (!formData.evidence_path || String(formData.evidence_path) === "null" || String(formData.evidence_path) === "undefined" || String(formData.evidence_path).trim() === "")) && (
                  <button
                    type="submit"
                    disabled={isSaving}
                    style={{
                      flex: 1, padding: "12px", backgroundColor: "#28a745",
                      color: "white", border: "none", borderRadius: "6px",
                      cursor: "pointer", fontWeight: "bold",
                    }}
                  >
                    {isSaving
                      ? "Procesando..."
                      : modalMode === "create"
                      ? "Asignar Tarea"
                      : "Guardar Cambios"}
                  </button>
                )}

                {/* ⚪ BOTÓN CERRAR / CANCELAR */}
                <button
                  type="button"
                  onClick={() => setIsTaskModalOpen(false)} 
                  style={{
                    padding: "12px 25px", backgroundColor: "#e9ecef", color: "#333",
                    border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "bold",
                    flex: (user?.role === "colaborador" && formData.status === "completada") ? 1 : "initial"
                  }}
                >
                  {(user?.role === "colaborador" && formData.status === "completada") ? "Cerrar Ventana" : "Cancelar"}
                </button>
              </div>
              </form>
          </div>
        </div>
      )}

      {/* 👇 NUEVO: MODAL GESTOR DE RUTINAS (ACORDEÓN MEJORADO) 👇 */}
      {isRecurringManagerOpen && (
        <div style={styles.modalOverlay} onClick={() => setIsRecurringManagerOpen(false)}>
          <div 
            style={{ 
              ...styles.modalContent, 
              maxWidth: "600px", 
              padding: "20px", 
              display: "flex", 
              flexDirection: "column", 
              maxHeight: "85vh" /* 👈 Límite estricto de altura para la ventana */
            }} 
            onClick={(e) => e.stopPropagation()} 
          >
            {/* CABECERA FIJA */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px", borderBottom: "1px solid #eee", paddingBottom: "10px" }}>
              <h3 style={{ margin: 0, color: "#333" }}>⚙️ Administrador de Rutinas</h3>
              <button onClick={() => setIsRecurringManagerOpen(false)} style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: "#666" }}>✖</button>
            </div>

            {/* BUSCADOR FIJO */}
            <input 
              type="text" 
              placeholder="🔍 Buscar rutina por título o descripción..." 
              value={recurringSearchTerm}
              onChange={(e) => setRecurringSearchTerm(e.target.value)}
              style={{ ...styles.input, marginBottom: "15px", backgroundColor: "#f8f9fa", flexShrink: 0 }}
            />

            {/* 👇 CONTENEDOR CON SCROLL PERFECTO 👇 */}
            <div style={{ flex: 1, overflowY: "auto", paddingRight: "5px", display: "flex", flexDirection: "column", gap: "10px" }}>
              {(() => {
                const todayStr = new Date().toISOString().split("T")[0]; // Para comparar qué fechas ya pasaron

                // 👇 ORDEN: De menor a mayor (viejas primero)
                const rutinas = tasks.filter(t => 
                  t.recurrence && t.recurrence !== "none" && 
                  (t.title.toLowerCase().includes(recurringSearchTerm.toLowerCase()) || (t.description && t.description.toLowerCase().includes(recurringSearchTerm.toLowerCase())))
                ).sort((a, b) => new Date(a.date) - new Date(b.date)); 

                if (rutinas.length === 0) {
                  return <p style={{ textAlign: "center", color: "#999", padding: "20px" }}>No se encontraron rutinas activas.</p>;
                }

                return rutinas.map(task => {
                  const isExpanded = expandedRecurringTaskId === task.id;
                  const colabInfo = collaborators.find(c => String(c.id) === String(task.user_id)) || { name: "Sin asignar" };
                  const isPast = task.date < todayStr; // 👈 Comprueba si la fecha se quedó en el pasado
                  
                  let freqLabel = "Personalizada";
                  if (task.recurrence === "daily") freqLabel = "Todos los días";
                  else if (task.recurrence === "weekly") freqLabel = "Semanal";
                  else if (task.recurrence === "monthly") freqLabel = "Mensual";
                  else if (task.recurrence === "bimonthly") freqLabel = "Bimestral";
                  else if (typeof task.recurrence === 'string' && task.recurrence.includes("weekly_custom")) freqLabel = "Semanal (Días específicos)";
                  else if (typeof task.recurrence === 'string' && task.recurrence.includes("monthly_custom")) freqLabel = "Mensual (Fechas específicas)";

                  return (
                    <div key={task.id} style={{ 
                      border: "1px solid #ddd", 
                      borderRadius: "6px", 
                      overflow: "hidden", 
                      backgroundColor: "#fff", 
                      flexShrink: 0,
                      opacity: isPast ? 0.5 : 1 // 👈 MAGIA: Opaco si es pasado
                    }}>
                      
                      {/* CABECERA DEL ACORDEÓN */}
                      <div 
                        onClick={() => setExpandedRecurringTaskId(isExpanded ? null : task.id)}
                        style={{ padding: "12px", backgroundColor: isExpanded ? "#f4f6f9" : "#fff", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", transition: "background 0.2s" }}
                      >
                        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                          <strong style={{ 
                            color: "#333", 
                            fontSize: "14px", 
                            display: "flex", 
                            alignItems: "center", 
                            gap: "8px",
                            textDecoration: isPast ? "line-through" : "none" // 👈 MAGIA: Subrayado/Tachado si es pasado
                          }}>
                            <span style={{ fontSize: "14px", color: "#6c5ce7", textDecoration: "none" }}>🔄</span> 
                            {task.title}
                          </strong>
                          <span style={{ fontSize: "12px", color: "#6c757d", marginLeft: "22px" }}>
                            🗓️ Próxima: <span style={{ color: isPast ? "#dc3545" : "#007bff", fontWeight: "bold" }}>{task.date}</span> | {freqLabel}
                          </span>
                        </div>
                        <span style={{ transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.3s", fontSize: "12px", color: "#666", paddingLeft: "10px" }}>
                          ▼
                        </span>
                      </div>

                      {/* CONTENIDO DESPLEGABLE */}
                      {isExpanded && (
                        <div style={{ padding: "15px", borderTop: "1px solid #eee", fontSize: "13px", color: "#555" }}>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "15px", backgroundColor: "#f8f9fa", padding: "10px", borderRadius: "6px" }}>
                            <span style={{ display: "flex", flexDirection: "column" }}><strong style={{ color: "#333" }}>👤 Asignado a:</strong> {colabInfo.name}</span>
                            <span style={{ display: "flex", flexDirection: "column" }}><strong style={{ color: "#333" }}>📅 Próx. Ejecución:</strong> {task.date}</span>
                            <span style={{ display: "flex", flexDirection: "column" }}><strong style={{ color: "#333" }}>🔁 Frecuencia:</strong> <span style={{ color: "#6c5ce7", fontWeight: "bold" }}>{freqLabel}</span></span>
                            <span style={{ display: "flex", flexDirection: "column" }}><strong style={{ color: "#333" }}>🏁 Límite:</strong> {task.recurrence_end || "Indefinido"}</span>
                          </div>
                          
                         <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                            <button 
                              onClick={() => { setIsRecurringManagerOpen(false); openEditModal(task); setTimeout(() => setActiveTab("repetir"), 50); }}
                              style={{ flex: 1, padding: "10px", backgroundColor: "#007bff", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", fontWeight: "bold", minWidth: "140px" }}
                            >
                               ✏️ Editar
                            </button>
                            <button 
                              onClick={async () => {
                                if (!window.confirm("¿Detener automatización? Esta tarea se quedará en tu calendario con todo su historial, pero ya no se generarán copias en el futuro.")) return;
                                try {
                                  const updateData = new FormData();
                                  const camposProtegidos = ['client', 'creator_id', 'updater_id', 'created_at', 'updated_at', 'viewed_at', 'started_at', 'completed_at', 'evidence_path', 'evidence_notes'];
                                  Object.keys(task).forEach(key => {
                                    if (task[key] !== null && task[key] !== undefined && !camposProtegidos.includes(key)) {
                                      updateData.append(key, task[key]);
                                    }
                                  });
                                  updateData.set("recurrence", "none"); 
                                  updateData.append("_method", "PUT");
                                  await api.post(`/tasks/${task.id}`, updateData, { headers: { "Content-Type": "multipart/form-data" } });
                                  fetchDashboardData();
                                } catch (err) { showToast("❌ Error al detener la rutina.", "error"); }
                              }}
                              style={{ flex: 1, padding: "10px", backgroundColor: "#f39c12", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", fontWeight: "bold", minWidth: "140px" }}
                            >
                               ⏸️ Pausar Rutina
                            </button>
                            {user?.role !== "colaborador" && (
                              <button 
                                onClick={() => { handleDeleteTask(task.id); }}
                                style={{ padding: "10px", backgroundColor: "#dc3545", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", fontWeight: "bold" }}
                                title="Eliminar definitivamente"
                              >
                                🗑️
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                });
              })()}
            </div>
            
            {/* 👇 BOTÓN FIJO PARA CERRAR AL FONDO 👇 */}
            <div style={{ marginTop: "15px", paddingTop: "15px", borderTop: "1px solid #eee", display: "flex", justifyContent: "flex-end" }}>
              <button 
                onClick={() => setIsRecurringManagerOpen(false)}
                style={{ padding: "10px 25px", backgroundColor: "#e9ecef", color: "#333", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "bold" }}
              >
                Cerrar Administrador
              </button>
            </div>

          </div>
        </div>
      )}
      {/* 👆 FIN DEL MODAL GESTOR DE RUTINAS 👆 */}

      {/* 👇 NUEVO: VISOR DE IMÁGENES A PANTALLA COMPLETA (LIGHTBOX) 👇 */}
      {fullScreenImage && (
        <div 
          style={{
            position: "fixed",
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: "rgba(0,0,0,0.9)", // Fondo casi completamente negro
            zIndex: 9999, // Lo ponemos por encima de TODO
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            flexDirection: "column"
          }}
          onClick={() => setFullScreenImage(null)} // Si dan clic en lo negro, se cierra
        >
          {/* Botón flotante para cerrar */}
          <button 
            onClick={() => setFullScreenImage(null)}
            style={{
              position: "absolute", top: "20px", right: "20px",
              background: "rgba(255,255,255,0.2)", color: "white",
              border: "none", borderRadius: "50%", width: "40px", height: "40px",
              fontSize: "20px", cursor: "pointer", display: "flex", 
              justifyContent: "center", alignItems: "center"
            }}
          >
            ✖
          </button>

          {/* Imagen responsive */}
          <img 
            src={fullScreenImage} 
            alt="Evidencia Ampliada" 
            style={{
              maxWidth: "95vw", // Máximo 95% del ancho de la pantalla (ideal celular)
              maxHeight: "85vh", // Máximo 85% del alto de la pantalla (ideal compu)
              objectFit: "contain", // LA MAGIA: Asegura que NUNCA se deforme ni se recorte
              borderRadius: "8px",
              boxShadow: "0 4px 20px rgba(0,0,0,0.5)"
            }}
            onClick={(e) => e.stopPropagation()} // Evita que si dan clic a la foto se cierre por accidente
          />
        </div>
      )}
      {/* 👇 NUEVO: NOTIFICACIÓN FLOTANTE (TOAST) DINÁMICA 👇 */}
      {toast.message && (
        <div 
          style={{
            position: "fixed",
            bottom: "30px",
            right: "30px",
            backgroundColor: 
              toast.type === "error" ? "#dc3545" :    // Rojo para errores
              toast.type === "warning" ? "#ffc107" :  // Amarillo para advertencias
              "#28a745",                              // Verde para éxito (por defecto)
            color: toast.type === "warning" ? "#333" : "white", // Texto oscuro si es amarillo
            padding: "15px 25px",
            borderRadius: "8px",
            boxShadow: "0 4px 15px rgba(0,0,0,0.3)",
            zIndex: 10000, 
            fontWeight: "bold",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            animation: "fadeIn 0.3s ease-in-out"
          }}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
}

// Estilos
const styles = {
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "white",
    padding: "20px",
    borderRadius: "8px",
    boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
    marginBottom: "20px",
  },
  btnAction: {
    backgroundColor: "#007bff",
    color: "white",
    border: "none",
    padding: "12px 20px",
    borderRadius: "6px",
    cursor: "pointer",
    fontWeight: "bold",
    boxShadow: "0 2px 4px rgba(0,123,255,0.3)",
  },
  sectionTitle: {
    fontSize: "18px",
    fontWeight: "bold",
    color: "#34495e",
    margin: "20px 0 10px 0",
  },
  carouselContainer: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    marginBottom: "30px",
  },
  carouselBtn: {
    background: "#fff",
    border: "1px solid #ddd",
    borderRadius: "50%",
    width: "40px",
    height: "40px",
    cursor: "pointer",
    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
  },
  carouselScroll: {
    display: "flex",
    gap: "15px",
    overflowX: "hidden",
    scrollBehavior: "smooth",
    flex: 1,
    padding: "5px 0",
  },
  colabCard: {
    minWidth: "240px",
    backgroundColor: "white",
    padding: "15px",
    borderRadius: "8px",
    boxShadow: "0 2px 5px rgba(0,0,0,0.08)",
    flexShrink: 0,
  },
  calendarWrapper: {
    backgroundColor: "white",
    borderRadius: "8px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
    overflow: "hidden",
  },
  calendarHeader: {
    display: "grid",
    gridTemplateColumns: "repeat(7, 1fr)",
    backgroundColor: "#f8f9fa",
    padding: "10px 0",
    textAlign: "center",
    fontWeight: "bold",
    borderBottom: "1px solid #eee",
    color: "#333",
  },
  calendarGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(7, 1fr)",
    gridAutoRows: "minmax(120px, auto)",
  },
  calendarDay: {
    borderRight: "1px solid #eee",
    borderBottom: "1px solid #eee",
    padding: "8px",
    display: "flex",
    flexDirection: "column",
    minWidth: 0, 
    overflow: "hidden",
  },
  calendarDayEmpty: {
    backgroundColor: "#f9f9fc",
    borderRight: "1px solid #eee",
    borderBottom: "1px solid #eee",
  },
  dayNumber: {
    fontSize: "14px",
    color: "#999",
    alignSelf: "flex-end",
    marginBottom: "8px",
    fontWeight: "bold",
  },
  taskList: {
    display: "flex",
    flexDirection: "column",
    gap: "5px",
    flex: 1,
    overflowY: "auto",
    maxHeight: "110px",
  },
  taskPill: {
    fontSize: "12px",
    padding: "6px 8px",
    borderRadius: "4px",
    cursor: "pointer",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    width: "100%",
    boxSizing: "border-box",
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
    padding: "25px",
    borderRadius: "8px",
    width: "90%",
    maxWidth: "700px",
    boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
    maxHeight: "90vh", 
    overflowY: "auto",
  },
  label: {
    display: "block",
    marginBottom: "5px",
    fontWeight: "bold",
    fontSize: "13px",
    color: "#333",
  },
  input: {
    width: "100%",
    padding: "10px",
    borderRadius: "6px",
    border: "1px solid #ddd",
    boxSizing: "border-box",
    color: "#000",
    backgroundColor: "#fff",
  },
  btnPrimary: {
    flex: 1,
    backgroundColor: "#28a745",
    color: "white",
    border: "none",
    padding: "12px",
    borderRadius: "6px",
    cursor: "pointer",
    fontWeight: "bold",
  },
  btnSecondary: {
    flex: 1,
    backgroundColor: "#e9ecef",
    color: "#333",
    border: "none",
    padding: "12px",
    borderRadius: "6px",
    cursor: "pointer",
    fontWeight: "bold",
  },
  btnDanger: {
    width: "100%",
    backgroundColor: "#dc3545",
    color: "white",
    border: "none",
    padding: "10px",
    borderRadius: "6px",
    cursor: "pointer",
    fontWeight: "bold",
    marginTop: "10px",
  },
  calendarControls: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "15px 20px",
    backgroundColor: "#f8fafc",
    borderBottom: "1px solid #e2e8f0",
    borderTopLeftRadius: "12px",
    borderTopRightRadius: "12px",
  },
  calendarMonthTitle: {
    margin: 0,
    fontSize: "18px",
    color: "#2c3e50",
    fontWeight: "bold",
    textTransform: "capitalize",
  },
  calendarNavButton: {
    padding: "8px 16px",
    backgroundColor: "#ffffff",
    border: "1px solid #cbd5e1",
    borderRadius: "6px",
    color: "#475569",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "all 0.2s ease",
    outline: "none",
  },
  tabContainer: {
    display: "flex",
    borderBottom: "2px solid #eee",
    marginBottom: "20px",
  },
  tabButton: {
    flex: 1,
    padding: "12px",
    background: "none",
    border: "none",
    borderBottom: "3px solid transparent",
    fontSize: "14px",
    fontWeight: "bold",
    color: "#6c757d",
    cursor: "pointer",
    transition: "all 0.2s",
  },
  tabButtonActive: {
    borderBottom: "3px solid #007bff",
    color: "#007bff",
  },
};