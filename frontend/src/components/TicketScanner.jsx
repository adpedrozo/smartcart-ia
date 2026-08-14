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
      // Select all items by default
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

    for (const item of itemsToSave) {
      try {
        // Create product
        const productRes = await createProduct({
          name: item.name,
          category: 'Almacen',
          current_stock: 1,
          minimum_stock: 1,
        })

        // Create price if available
        if (item.price && result.supermarket) {
          await createPrice({
            product_id: productRes.data.id,
            supermarket: result.supermarket,
            price: item.price,
          })
        }
      } catch (err) {
        // Skip duplicates silently
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
        <div className="warning-box">{error}</div>
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
                  <span className="scanner-item-name">{item.name}</span>
                  {item.price && <span className="scanner-item-price">${item.price}</span>}
                </div>
              </div>
            ))}
          </div>

          <div className="scanner-actions">
            <span className="scanner-count">
              {selectedItems.length} de {result.items.length} seleccionados
            </span>
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
  )
}

export default TicketScanner