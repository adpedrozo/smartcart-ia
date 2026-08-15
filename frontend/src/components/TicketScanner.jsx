import { useState, useRef } from 'react'
import { analyzeTicket, createProduct, createPrice, updateStock } from '../api'
import { SUPERMARKETS } from '../constants'
import axios from 'axios'

const API_URL = 'http://127.0.0.1:8000'

function TicketScanner({ onProductsAdded }) {
  const [scanning, setScanning] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [selectedItems, setSelectedItems] = useState([])
  const [quantities, setQuantities] = useState({})
  const [saving, setSaving] = useState(false)
  const fileRef = useRef(null)

  const handleFileChange = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    setScanning(true)
    setError(null)
    setResult(null)
    setSelectedItems([])
    setQuantities({})

    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await analyzeTicket(formData)
      setResult(res.data)
      const indices = res.data.items.map((_, i) => i)
      setSelectedItems(indices)
      const defaultQty = {}
      indices.forEach(i => { defaultQty[i] = 1 })
      setQuantities(defaultQty)
    } catch (err) {
      if (err.response?.status === 503) {
        setError('El servicio de IA está temporalmente ocupado. Intenta de nuevo en unos segundos.')
      } else if (err.response?.status === 422) {
        setError('No se pudo leer el ticket. Asegurate de que la foto sea clara y sea un ticket de supermercado.')
      } else {
        setError('Ocurrió un error inesperado. Intenta de nuevo.')
      }
      console.error(err)
    } finally {
      setScanning(false)
    }
  }

  const toggleItem = (index) => {
    setSelectedItems(prev => {
      if (prev.includes(index)) {
        return prev.filter(i => i !== index)
      } else {
        setQuantities(q => ({ ...q, [index]: q[index] || 1 }))
        return [...prev, index]
      }
    })
  }

  const handleQuantityChange = (e, index, newQty) => {
    e.stopPropagation()
    if (newQty < 1) return
    setQuantities(prev => ({ ...prev, [index]: newQty }))
  }

  const handleSave = async () => {
    if (selectedItems.length === 0) return
    setSaving(true)

    const normalizeSuper = (name) => {
      if (!name) return 'Otro'
      const upper = name.toUpperCase()
      const mapping = {
        'CARREFOUR': 'Carrefour',
        'CHANGOMAS': 'Changomás',
        'CHANGO MAS': 'Changomás',
        'HIPERCHANGOMAS': 'Changomás',
        'COTO': 'Coto',
        'DIA': 'Dia',
        'DISCO': 'Disco',
        'DIARCO': 'Diarco',
        'JUMBO': 'Jumbo',
        'LA ANONIMA': 'La Anónima',
        'ANONIMA': 'La Anónima',
        'LIBERTAD': 'Libertad',
        'MAKRO': 'Makro',
        'NORTE': 'Norte',
        'TADICOR': 'Tadicor',
        'TOLEDO': 'Toledo',
        'VEA': 'Vea',
        'WALMART': 'Walmart',
        'WAL MART': 'Walmart',
      }
      for (const [key, value] of Object.entries(mapping)) {
        if (upper.includes(key)) return value
      }
      return 'Otro'
    }

    const supermarket = normalizeSuper(result.supermarket)

    for (const index of selectedItems) {
      const item = result.items[index]
      const qty = quantities[index] || 1

      try {
        if (item.exists_in_inventory && item.existing_product_id) {
          const productRes = await axios.get(`${API_URL}/products/${item.existing_product_id}`)
          const currentStock = productRes.data.current_stock
          await updateStock(item.existing_product_id, currentStock + qty)

          if (item.price && supermarket) {
            await createPrice({
              product_id: item.existing_product_id,
              supermarket: supermarket,
              price: item.price,
            })
          }
        } else {
          const productRes = await createProduct({
            name: item.name,
            category: item.category || 'Almacén',
            current_stock: qty,
            minimum_stock: 1,
          })
          if (item.price && supermarket) {
            await createPrice({
              product_id: productRes.data.id,
              supermarket: supermarket,
              price: item.price,
            })
          }
        }
      } catch (err) {
        console.log(`Skipped: ${item.name}`)
      }
    }

    setSaving(false)
    setResult(null)
    setSelectedItems([])
    setQuantities({})
    if (fileRef.current) fileRef.current.value = ''
    onProductsAdded()
  }

  return (
    <>
      {scanning && (
        <div className="scanner-overlay">
          <div className="scanner-overlay-box">
            <div className="scanner-spinner"></div>
            <p>Procesando ticket...</p>
            <span>Esto puede tardar unos segundos</span>
          </div>
        </div>
      )}

      <div className="ticket-scanner">
        <div className="scanner-header">
          <h3>Escanear ticket</h3>
          <label className="btn-primary scanner-btn">
            {scanning ? 'Procesando...' : 'Subir foto del ticket'}
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileChange}
              disabled={scanning}
              style={{ display: 'none' }}
            />
          </label>
        </div>

        {error && (
          <div className="warning-box" style={{ margin: '16px 20px' }}>{error}</div>
        )}

        {result && (
          <div className="scanner-result">

            <div className="scanner-meta">
              {result.supermarket && <span>Supermercado: <strong>{result.supermarket}</strong></span>}
              {result.date && <span>Fecha: <strong>{result.date}</strong></span>}
              {result.total && <span>Total: <strong>${result.total}</strong></span>}
            </div>

            {result.suggestions && result.suggestions.length > 0 && (
              <div className="scanner-suggestions">
                <div className="scanner-suggestions-title">Sugerencias del sistema</div>
                {result.suggestions.map((s, i) => (
                  <div key={i} className="scanner-suggestion-item">{s}</div>
                ))}
              </div>
            )}

            {result.alerts && result.alerts.length > 0 && (
              <div className="scanner-alerts">
                {result.alerts.map((alert, i) => (
                  <div key={i} className={`scanner-alert ${alert.direction === 'subio' ? 'up' : 'down'}`}>
                    <span className="alert-arrow">{alert.direction === 'subio' ? '↑' : '↓'}</span>
                    <span className="alert-text">
                      <strong>{alert.product}</strong> {alert.direction} {alert.percent}%
                      — antes ${alert.old_price}, ahora ${alert.new_price}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <p className="scanner-instructions">
              Selecciona los productos que queres agregar al inventario:
            </p>

            <div className="scanner-items">
              {result.items.map((item, index) => (
                <div
                  key={index}
                  className={`scanner-item ${selectedItems.includes(index) ? 'selected' : ''}`}
                  onClick={() => toggleItem(index)}
                >
                  <div className="scanner-item-check">
                    {selectedItems.includes(index) ? '✓' : '○'}
                  </div>
                  <div className="scanner-item-body">
                    <div className="scanner-item-info">
                      <div className="scanner-item-left">
                        <span className="scanner-item-name">{item.name}</span>
                        <div className="scanner-item-meta">
                          {item.category && <span className="scanner-item-category">{item.category}</span>}
                          {item.exists_in_inventory && (
                            <span className="scanner-item-exists">ya en inventario</span>
                          )}
                          {item.price_change_percent !== null && item.price_change_percent !== undefined && (
                            <span className={`scanner-item-change ${item.price_change_percent > 0 ? 'up' : 'down'}`}>
                              {item.price_change_percent > 0 ? '↑' : '↓'} {Math.abs(item.price_change_percent)}%
                            </span>
                          )}
                        </div>
                      </div>
                      {item.price && <span className="scanner-item-price">${item.price}</span>}
                    </div>

                    {selectedItems.includes(index) && (
                      <div className="scanner-item-qty" onClick={(e) => e.stopPropagation()}>
                        <span className="scanner-item-qty-label">Cantidad a sumar:</span>
                        <div className="scanner-qty-controls">
                          <button onClick={(e) => handleQuantityChange(e, index, (quantities[index] || 1) - 1)}>-</button>
                          <span>{quantities[index] || 1}</span>
                          <button onClick={(e) => handleQuantityChange(e, index, (quantities[index] || 1) + 1)}>+</button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="scanner-actions">
              <div className="scanner-actions-left">
                <span className="scanner-count">
                  {selectedItems.length} de {result.items.length} seleccionados
                </span>
                <button
                  className="btn-cancel"
                  onClick={() => {
                    setResult(null)
                    setSelectedItems([])
                    setQuantities({})
                    if (fileRef.current) fileRef.current.value = ''
                  }}
                >
                  Descartar
                </button>
              </div>
              <button
                className="btn-primary"
                onClick={handleSave}
                disabled={saving || selectedItems.length === 0}
              >
                {saving ? 'Guardando...' : 'Agregar al inventario'}
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

export default TicketScanner