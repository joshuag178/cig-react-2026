// App es el unico archivo que sabe de donde salen los datos.
// En la sesion 4 esta linea se cambia por una llamada a la API y
// ningun otro componente se modifica.
import { useEffect, useState } from "react";
import { ordenes as ordenesIniciales } from "./data/datos.js";
import BarraFiltros from "./components/BarraFiltros.jsx";
import FormularioOrden from "./components/FormularioOrden.jsx";

import Panel from "./components/Panel.jsx";
import ResumenOrdenes from "./components/ResumenOrdenes.jsx";
import ListaOrdenes from "./components/ListaOrdenes.jsx";
import "./App.css";

import { obtenerOrdenes } from "./services/ordenes.js";

function normalizar(texto) {
  return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

// Una funcion de comparacion por cada criterio de orden.
const COMPARADORES = {
  fecha: (a, b) => b.fecha.localeCompare(a.fecha), // mas recientes primero
  monto: (a, b) => b.monto - a.monto, // mayor monto primero
  codigo: (a, b) => a.codigo.localeCompare(b.codigo),
};

function App() {

  const [ordenes, setOrdenes] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [departamento, setDepartamento] = useState("");
  const [criterio, setCriterio] = useState("fecha");

  // Estados de la vista conectada a red.
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  // Cambiar intento repite el efecto porque esta en sus dependencias.
  const [intento, setIntento] = useState(0);
  const recargar = () => setIntento((n) => n + 1);

  // EFECTO: se ejecuta despues del render, no durante.
  useEffect(() => {
    let ignorar = false; // lo cambia la limpieza

    // El efecto no puede ser async: la funcion async va adentro.
    async function cargar() {
      setCargando(true);
      setError(null);
      try {
        const datos = await obtenerOrdenes();
        if (!ignorar) setOrdenes(datos);
      } catch (err) {
        // Sin conexion o con un 404/500 convertido en error por el servicio.
        if (!ignorar) setError(err.message);
      } finally {
        // Con exito o con error, la carga termina.
        if (!ignorar) setCargando(false);
      }
    }
    cargar();

    // Limpieza: si el componente se desmonta antes de la respuesta,
    // esa respuesta se descarta. StrictMode lo provoca en desarrollo.
    return () => {
      ignorar = true;
    };
  }, [intento]); // al montar y cada vez que se presiona Reintentar



  // ALTA: arreglo nuevo con un elemento mas. Nunca push sobre el estado.
  // Forma funcional: recibe el arreglo mas reciente, no la foto del render.
  function agregarOrden(datos) {
    setOrdenes((anteriores) => {
      const ids = anteriores.map((o) => o.id);
      const id = Math.max(0, ...ids) + 1; // siguiente id: el mayor + 1
      const codigo = "OS-2026-" + String(id).padStart(3, "0");
      const nueva = {
        ...datos, id, codigo, estado: "pendiente",
      };
      return [...anteriores, nueva];
    });
  }

  // CAMBIO: map devuelve un objeto nuevo solo para la orden que coincide.
  // TarjetaOrden la llama con el id de su orden.
  function completarOrden(id) {
    setOrdenes((anteriores) =>
      anteriores.map((o) =>
        o.id === id
          ? { ...o, estado: "completada" }
          : o
      )
    );
  }

  // DERIVADO: se calcula en cada render. No se guarda en otro useState.
  // [...ordenes] copia el arreglo antes de ordenar: sort modifica el original.
  const texto = normalizar(busqueda.trim());
  const ordenesVisibles = [...ordenes]
    .sort(COMPARADORES[criterio])
    .filter((orden) => departamento === "" || orden.departamento === departamento)
    .filter(
      (orden) =>
        normalizar(orden.codigo).includes(texto) ||
        normalizar(orden.cliente).includes(texto)
    );

  return (
    <div className="contenedor">
      <header className="cabecera">
        <p className="cabecera__etiqueta">Serviclima, S.A.</p>
        <h1>Panel de ordenes de servicio</h1>
      </header>

      <Panel titulo="Resumen">
        <ResumenOrdenes ordenes={ordenesVisibles} />
      </Panel>

      <Panel titulo={`Ordenes registradas (${ordenesVisibles.length} de ${ordenes.length})`}>
        <BarraFiltros
          busqueda={busqueda}
          departamento={departamento}
          criterio={criterio}
          onBusquedaChange={setBusqueda}
          onDepartamentoChange={setDepartamento}
          onCriterioChange={setCriterio}
        />
        {cargando ? (
          <p className="mensaje mensaje--cargando">Cargando ordenes...</p>
        ) : error ? (
          <div className="mensaje mensaje--error">
            <p>No se pudo cargar: {error}</p>
            <p>Revise que la terminal de npm run api siga corriendo.</p>
            <button className="boton" type="button" onClick={recargar}>
              Reintentar
            </button>
          </div>
        ) : (
          <ListaOrdenes
            ordenes={ordenesVisibles}
            onCompletar={completarOrden}
            mensajeVacio="Ninguna orden coincide con los filtros."
          />
        )}

      </Panel>

      <Panel titulo="Registrar orden">
        <FormularioOrden onAgregar={agregarOrden} />
      </Panel>

    </div>
  );
}

export default App;