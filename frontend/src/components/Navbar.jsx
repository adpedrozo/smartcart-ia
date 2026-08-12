import { Link, useLocation } from 'react-router-dom'

function Navbar() {
  const location = useLocation()

  return (
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
      </div>
    </nav>
  )
}

export default Navbar