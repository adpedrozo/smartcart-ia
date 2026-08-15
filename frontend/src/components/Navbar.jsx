import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'

function Navbar() {
  const location = useLocation()
  const [showInfo, setShowInfo] = useState(false)

  return (
    <>
      <nav className="navbar">
        <div className="navbar-brand">
          <span className="navbar-logo">SC</span>
          <span className="navbar-title">SmartCart IA</span>
        </div>
        <div className="navbar-links">
          <Link
            to="/"
            className={location.pathname === '/' ? 'nav-link active' : 'nav-link'}
          >
            Inventario
          </Link>
          <Link
            to="/shopping-list"
            className={location.pathname === '/shopping-list' ? 'nav-link active' : 'nav-link'}
          >
            Lista de compras
          </Link>
          <button className="btn-info" onClick={() => setShowInfo(true)}>i</button>
        </div>
      </nav>

      {showInfo && (
        <div className="info-overlay" onClick={() => setShowInfo(false)}>
          <div className="info-modal" onClick={(e) => e.stopPropagation()}>
            <button className="info-close" onClick={() => setShowInfo(false)}>✕</button>
            <div className="info-logo">SC</div>
            <h2 className="info-title">SmartCart IA</h2>
            <p className="info-version">Versión 1.0</p>
            <p className="info-description">
              Asistente inteligente para la gestión de compras del hogar.
              Registrá tickets, controlá tu stock y detectá cambios de precios
              con ayuda de inteligencia artificial.
            </p>
            <div className="info-divider" />
            <div className="info-row">
              <span className="info-label">Desarrollado por</span>
              <span className="info-value">Alejandro Pedrozo</span>
            </div>
            <div className="info-divider" />
            <div className="info-tech">
              <span className="info-label">Tecnologías</span>
              <div className="info-tags">
                <span className="info-tag">Python / FastAPI</span>
                <span className="info-tag">React</span>
                <span className="info-tag">Gemini AI</span>
                <span className="info-tag">LangChain</span>
                <span className="info-tag">Google Vision</span>
                <span className="info-tag">Supabase / PostgreSQL</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default Navbar