import { useState, useEffect } from 'react'
import { getProducts, createProduct, deleteProduct, updateStock } from '../api'
import { CATEGORIES } from '../constants'

function Inventory() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [similarWarning, setSimilarWarning] = useState(null)
  const [form, setForm] = useState({
    name: '',
    category: '',
    current_stock: 0,
    minimum_stock: 1,
  })

  useEffect(() => {
    fetchProducts()
  }, [])

  const fetchProducts = async () => {
    try {
      const res = await getProducts()
      setProducts(res.data)
    } catch (err) {
      console.error('Error fetching products:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSimilarWarning(null)
    try {
      await createProduct(form)
      setForm({ name: '', category: '', current_stock: 0, minimum_stock: 1 })
      setShowForm(false)
      fetchProducts()
    } catch (err) {
      if (err.response?.status === 409) {
        setSimilarWarning(err.response.data.detail)
      } else if (err.response?.status === 422) {
        setSimilarWarning('Debes seleccionar una categoria antes de guardar.')
      } else {
        console.error('Error creating product:', err)
      }
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Eliminar este producto?')) return
    try {
      await deleteProduct(id)
      fetchProducts()
    } catch (err) {
      console.error('Error deleting product:', err)
    }
  }

  const handleStockChange = async (id, newStock) => {
    if (newStock < 0) return
    try {
      await updateStock(id, newStock)
      fetchProducts()
    } catch (err) {
      console.error('Error updating stock:', err)
    }
  }

  const getStatusBadge = (current, minimum) => {
    if (current <= 0) return <span className="badge critical">Critico</span>
    if (current <= minimum * 0.5) return <span className="badge urgent">Urgente</span>
    if (current <= minimum) return <span className="badge low">Bajo</span>
    return <span className="badge ok">OK</span>
  }

  if (loading) return <div className="loading">Cargando inventario...</div>

  return (
    <div className="page">
      <div className="page-header">
        <h1>Inventario</h1>
        <button className="btn-primary" onClick={() => { setShowForm(!showForm); setSimilarWarning(null) }}>
          {showForm ? 'Cancelar' : '+ Agregar producto'}
        </button>
      </div>

      {showForm && (
        <form className="product-form" onSubmit={handleSubmit}>
          <h3>Nuevo Producto</h3>

            {similarWarning && (
            <div className="warning-box">
                <strong>Atención.</strong>{' '}
                {similarWarning.includes('Similar product already exists:')
                ? `Ya existe un producto similar: ${similarWarning.replace('Similar product already exists: ', '')}`
                : similarWarning}
                {similarWarning.includes('Similar product already exists:') && (
                <>
                    <br />
                    <span>Revisa el inventario antes de agregar uno nuevo.</span>
                </>
                )}
            </div>
            )}

          <div className="form-grid">
            <div className="field-group full-width">
              <label>Nombre del Producto</label>
              <input
                placeholder="Ej: Aceite Girasol 1L"
                value={form.name}
                onChange={(e) => { setForm({ ...form, name: e.target.value }); setSimilarWarning(null) }}
                required
              />
            </div>
            <div className="field-group full-width">
            <label>Categoría</label>
            <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
            >
                <option value="">Seleccionar categoria...</option>
                {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
                ))}
            </select>
            </div>
            <div className="field-group">
              <label>Stock actual (unidades)</label>
              <input
                type="number"
                value={form.current_stock}
                onChange={(e) => setForm({ ...form, current_stock: parseInt(e.target.value) || 0 })}
                min="0"
              />
            </div>
            <div className="field-group">
              <label>Stock mínimo (unidades)</label>
              <input
                type="number"
                value={form.minimum_stock}
                onChange={(e) => setForm({ ...form, minimum_stock: parseInt(e.target.value) || 1 })}
                min="1"
              />
            </div>
          </div>
          <button type="submit" className="btn-primary">Guardar producto</button>
        </form>
      )}

      {products.length === 0 ? (
        <div className="empty-state">
          <p>No hay productos en el inventario.</p>
          <p>Agrega tu primer producto para empezar.</p>
        </div>
      ) : (
        <div className="product-list">
          {products.map((product) => (
            <div key={product.id} className="product-card">
              <div className="product-info">
                <div className="product-name">{product.name}</div>
                <div className="product-meta">
                  {product.category && <span>{product.category}</span>}
                  <span>unidades</span>
                </div>
              </div>
              <div className="product-stock">
                {getStatusBadge(product.current_stock, product.minimum_stock)}
                <div className="stock-controls">
                  <button onClick={() => handleStockChange(product.id, product.current_stock - 1)}>-</button>
                  <span>{product.current_stock}</span>
                  <button onClick={() => handleStockChange(product.id, product.current_stock + 1)}>+</button>
                </div>
                <div className="stock-min">min: {product.minimum_stock}</div>
              </div>
              <button className="btn-delete" onClick={() => handleDelete(product.id)}>x</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default Inventory