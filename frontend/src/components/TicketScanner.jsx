import { useState, useRef } from 'react'
import { scanTicket, createProduct, createPrice } from '../api'
import { CATEGORIES, SUPERMARKETS } from '../constants'

function TicketScanner({ onProductsAdded }) {
  const [scanning, setScanning] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [selectedItems, setSelectedItems] = useState([])
  const [saving, setSaving] = useState(false)
  const fileRef = useRef(null)

  const handleFileChange = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    setScanning(true)
    setError(null)
    setResult(null)
    setSelectedItems([])

    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await scanTicket(formData)
      setResult(res.data)
      setSelectedItems(res.data.items.map((_, i) => i))
    } catch (err) {
      setError('No se pudo procesar el ticket. Intenta con una foto mas clara.')
      console.error(err)
    } finally {
      setScanning(false)
    }
  }

  const toggleItem = (index) => {
    setSelectedItems(prev =>
      prev.includes(index)
        ? prev.filter(i => i !== index)
        : [...prev, index]
    )
  }

  const handleSave = async () => {
    if (selectedItems.length === 0) return
    setSaving(true)

    const itemsToSave = selectedItems.map(i => result.items[i])

    const normalizeSuper = (name) => {
      if (!name) return 'Otro'
      const upper = name.toUpperCase()
      const match = SUPERMARKETS.find(s => upper.includes(s.toUpperCase()))
      return match || 'Otro'
    }

    const supermarket = normalizeSuper(result.supermarket)

    for (const item of itemsToSave) {
      try {
        const productRes = await createProduct({
          name: item.name,
          category: item.category || 'Almacén',
          current_stock: 1,
          minimum_stock: 1,
        })

        if (item.price && supermarket) {
          await createPrice({
            product_id: productRes.data.id,
            supermarket: supermarket,
            price: item.price,
          })
        }
      } catch (err) {
        console.log(`Skipped: ${item.name}`)
      }
    }

    setSaving(false)
    setResult(null)
    setSelectedItems([])
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
                  <div className="scanner-item-info">
                    <div className="scanner-item-left">
                      <span className="scanner-item-name">{item.name}</span>
                      {item.category && (
                        <span className="scanner-item-category">{item.category}</span>
                      )}
                    </div>
                    {item.price && <span className="scanner-item-price">${item.price}</span>}
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