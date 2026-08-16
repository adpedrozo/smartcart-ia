import { useState, useEffect } from 'react'
import { getProducts, createProduct, deleteProduct, updateStock, getPrices, createPrice, deletePrice, updateProductName } from '../api'
import { CATEGORIES, SUPERMARKETS } from '../constants'
import TicketScanner from '../components/TicketScanner'

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
  const [showPriceForm, setShowPriceForm] = useState(null)
  const [priceForm, setPriceForm] = useState({ supermarket: '', price: '' })
  const [priceError, setPriceError] = useState(null)
  const [pendingStock, setPendingStock] = useState({})
  const [showPriceHistory, setShowPriceHistory] = useState(null)
  const [priceHistory, setPriceHistory] = useState([])
  const [editingName, setEditingName] = useState(null)
  const [editingNameValue, setEditingNameValue] = useState('')
  const [stockSummary, setStockSummary] = useState(null)

  useEffect(() => {
    fetchProducts()
  }, [])

  const fetchProducts = async () => {
    try {
      const res = await getProducts()
      const priorityOrder = { critical: 0, urgent: 1, low: 2, ok: 3 }
      const sorted = res.data.sort((a, b) => {
        const getStatus = (p) => {
          if (p.current_stock <= 0) return 'critical'
          if (p.current_stock <= p.minimum_stock * 0.5) return 'urgent'
          if (p.current_stock <= p.minimum_stock) return 'low'
          return 'ok'
        }
        return priorityOrder[getStatus(a)] - priorityOrder[getStatus(b)]
      })
      setProducts(sorted)
      const critical = sorted.filter(p => p.current_stock <= 0).length
      const low = sorted.filter(p => p.current_stock > 0 && p.current_stock <= p.minimum_stock).length
      const ok = sorted.filter(p => p.current_stock > p.minimum_stock).length
      setStockSummary({ total: sorted.length, critical, low, ok })
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

  const handleStockChange = (id, newStock) => {
    if (newStock < 0) return
    setShowPriceForm(null)
    setPendingStock(prev => ({ ...prev, [id]: newStock }))
  }

  const handleStockSave = async (id) => {
    try {
      await updateStock(id, pendingStock[id])
      setPendingStock(prev => {
        const updated = { ...prev }
        delete updated[id]
        return updated
      })
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

  const handlePriceSubmit = async (productId) => {
    setPriceError(null)
    if (!priceForm.supermarket || !priceForm.price || parseFloat(priceForm.price) <= 0) {
      setPriceError('Completa todos los campos con valores válidos.')
      return
    }
    try {
      await createPrice({
        product_id: productId,
        supermarket: priceForm.supermarket,
        price: parseFloat(priceForm.price),
      })
      setShowPriceForm(null)
      setShowPriceHistory(null)
      setPriceHistory([])
      setPriceForm({ supermarket: '', price: '' })
      fetchProducts()
    } catch (err) {
      console.error('Error creating price:', err)
    }
  }

  const handleToggleHistory = async (productId) => {
    if (showPriceHistory === productId) {
      setShowPriceHistory(null)
      setPriceHistory([])
      return
    }
    try {
      const res = await getPrices(productId)
      setPriceHistory(res.data)
      setShowPriceHistory(productId)
    } catch (err) {
      console.error('Error fetching price history:', err)
    }
  }

  const handleDeletePrice = async (priceId, productId) => {
    if (!window.confirm('Eliminar este precio del historial?')) return
    try {
      await deletePrice(priceId)
      const res = await getPrices(productId)
      setPriceHistory(res.data)
    } catch (err) {
      console.error('Error deleting price:', err)
    }
  }

  const closePriceForm = (productId) => {
    setShowPriceForm(null)
    setPriceError(null)
    setPriceForm({ supermarket: '', price: '' })
    setShowPriceHistory(null)
    setPriceHistory([])
    setPendingStock(prev => {
      const updated = { ...prev }
      delete updated[productId]
      return updated
    })
  }

  const handleNameSave = async (productId) => {
    if (!editingNameValue.trim()) return
    try {
      await updateProductName(productId, editingNameValue.trim())
      setEditingName(null)
      setEditingNameValue('')
      fetchProducts()
    } catch (err) {
      console.error('Error updating name:', err)
    }
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

      {stockSummary && (
        <div className="inventory-summary-text">
          {stockSummary.total} productos en inventario —
          {stockSummary.critical > 0 && <span className="summary-critical"> {stockSummary.critical} crítico{stockSummary.critical > 1 ? 's' : ''}</span>}
          {stockSummary.low > 0 && <span className="summary-low"> · {stockSummary.low} bajo{stockSummary.low > 1 ? 's' : ''}</span>}
          <span className="summary-ok"> · {stockSummary.ok} en buen estado</span>
        </div>
      )}

      <TicketScanner onProductsAdded={fetchProducts} />

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
            <div key={product.id} className="product-card-wrapper">

              <div className="product-card">
                <div className="product-info">
                  {editingName === product.id ? (
                    <div className="product-name-edit">
                      <input
                        className="product-name-input"
                        value={editingNameValue}
                        onChange={(e) => setEditingNameValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleNameSave(product.id)
                          if (e.key === 'Escape') { setEditingName(null); setEditingNameValue('') }
                        }}
                        autoFocus
                      />
                      <button className="btn-name-save" onClick={() => handleNameSave(product.id)}>✓</button>
                      <button className="btn-name-cancel" onClick={() => { setEditingName(null); setEditingNameValue('') }}>✕</button>
                    </div>
                  ) : (
                    <div
                      className="product-name"
                      title={product.name}
                      onClick={() => { setEditingName(product.id); setEditingNameValue(product.name) }}
                      style={{ cursor: 'pointer' }}
                    >
                      {product.name}
                    </div>
                  )}
                  {showPriceForm !== product.id && editingName !== product.id && (
                    <div className="product-meta">
                      {product.category && <span>{product.category}</span>}
                    </div>
                  )}
                </div>

                <div className="product-stock">
                  {getStatusBadge(
                    pendingStock[product.id] !== undefined ? pendingStock[product.id] : product.current_stock,
                    product.minimum_stock
                  )}
                  <div className="stock-controls">
                    <button onClick={() => handleStockChange(
                      product.id,
                      (pendingStock[product.id] !== undefined ? pendingStock[product.id] : product.current_stock) - 1
                    )}>-</button>
                    <span>
                      {pendingStock[product.id] !== undefined ? pendingStock[product.id] : product.current_stock}
                    </span>
                    <button onClick={() => handleStockChange(
                      product.id,
                      (pendingStock[product.id] !== undefined ? pendingStock[product.id] : product.current_stock) + 1
                    )}>+</button>
                  </div>
                  <div className="stock-min">min: {product.minimum_stock}</div>
                  {pendingStock[product.id] !== undefined && (
                    <>
                      <button className="btn-stock-save" onClick={() => handleStockSave(product.id)}>
                        Guardar
                      </button>
                      <button
                        className="btn-cancel"
                        onClick={() => setPendingStock(prev => {
                          const updated = { ...prev }
                          delete updated[product.id]
                          return updated
                        })}
                      >
                        Cancelar
                      </button>
                    </>
                  )}
                </div>

                <div className="price-actions">
                  {showPriceForm !== product.id ? (
                    <button
                      className="btn-price"
                      onClick={() => {
                        setShowPriceForm(product.id)
                        setPriceError(null)
                        setPriceForm({ supermarket: '', price: '' })
                        setPendingStock(prev => {
                          const updated = { ...prev }
                          delete updated[product.id]
                          return updated
                        })
                      }}
                    >
                      $ Precio
                    </button>
                  ) : (
                    <button
                      className="btn-cancel"
                      onClick={() => closePriceForm(product.id)}
                    >
                      Cancelar
                    </button>
                  )}
                  <button className="btn-delete" onClick={() => handleDelete(product.id)}>x</button>
                </div>
              </div>

              {showPriceForm === product.id && (
                <div className="price-form-container">
                  <div className="price-form">
                    {priceError && <span className="price-error">{priceError}</span>}
                    <select
                      value={priceForm.supermarket}
                      onChange={(e) => setPriceForm({ ...priceForm, supermarket: e.target.value })}
                    >
                      <option value="">Supermercado...</option>
                      {SUPERMARKETS.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                    <input
                      type="number"
                      placeholder="Precio"
                      value={priceForm.price}
                      onChange={(e) => setPriceForm({ ...priceForm, price: e.target.value })}
                      min="0"
                    />
                    <button className="btn-primary" onClick={() => handlePriceSubmit(product.id)}>
                      Guardar
                    </button>
                  </div>

                  <div className="price-history-toggle">
                    <button
                      className="btn-history"
                      onClick={() => handleToggleHistory(product.id)}
                    >
                      {showPriceHistory === product.id ? 'Ocultar historial' : 'Ver historial'}
                    </button>
                  </div>

                  {showPriceHistory === product.id && (
                    <div className="price-history">
                      {priceHistory.length === 0 ? (
                        <p className="price-history-empty">Sin historial de precios.</p>
                      ) : (
                        <table className="price-history-table">
                          <thead>
                            <tr>
                              <th>Supermercado</th>
                              <th>Precio</th>
                              <th>Fecha</th>
                              <th>Eliminar</th>
                            </tr>
                          </thead>
                          <tbody>
                            {priceHistory.map((p) => (
                              <tr key={p.id}>
                                <td>{p.supermarket}</td>
                                <td>${p.price}</td>
                                <td>{new Date(p.recorded_at).toLocaleDateString('es-AR')}</td>
                                <td>
                                  <button
                                    className="btn-delete-price"
                                    onClick={() => handleDeletePrice(p.id, product.id)}
                                  >
                                    x
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  )}
                </div>
              )}

            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default Inventory