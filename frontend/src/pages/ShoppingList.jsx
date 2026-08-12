import { useState, useEffect, useRef } from 'react'
import { getShoppingList } from '../api'
import html2canvas from 'html2canvas'

function ShoppingList() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const listRef = useRef(null)

  useEffect(() => {
    fetchShoppingList()
  }, [])

  const fetchShoppingList = async () => {
    try {
      const res = await getShoppingList()
      setItems(res.data)
    } catch (err) {
      console.error('Error fetching shopping list:', err)
    } finally {
      setLoading(false)
    }
  }

  const getStatusLabel = (status) => {
    const labels = {
      critical: 'Critico',
      urgent: 'Urgente',
      low: 'Bajo',
    }
    return labels[status] || status
  }

  const copyToClipboard = () => {
    if (items.length === 0) return
    const text = items
      .map((item) => `${getStatusLabel(item.status)} - ${item.name}${item.latest_price ? ` ($${item.latest_price} en ${item.supermarket})` : ''}`)
      .join('\n')
    navigator.clipboard.writeText(text)
    alert('Lista copiada al portapapeles')
  }

  const exportAsImage = async () => {
    if (!listRef.current) return
    try {
      const canvas = await html2canvas(listRef.current, {
        backgroundColor: '#0F1923',
        scale: 2,
      })
      const link = document.createElement('a')
      link.download = 'lista-smartcart.png'
      link.href = canvas.toDataURL('image/png')
      link.click()
    } catch (err) {
      console.error('Error exporting image:', err)
    }
  }

  if (loading) return <div className="loading">Generando lista de compras...</div>

  return (
    <div className="page">
      <div className="page-header">
        <h1>Lista de compras</h1>
        {items.length > 0 && (
          <div className="list-actions">
            <button className="btn-secondary" onClick={copyToClipboard}>
              Copiar lista
            </button>
            <button className="btn-primary" onClick={exportAsImage}>
              Exportar imagen
            </button>
          </div>
        )}
      </div>

      {items.length === 0 ? (
        <div className="empty-state">
          <p>No hay productos para comprar.</p>
          <p>Tu inventario esta en buen estado.</p>
        </div>
      ) : (
        <div className="shopping-list" ref={listRef}>
          <div className="list-header">
            <span>SmartCart IA - Lista de compras</span>
            <span>{new Date().toLocaleDateString('es-AR')}</span>
          </div>
          {items.map((item) => (
            <div key={item.product_id} className={`shopping-item ${item.status}`}>
              <div className="item-left">
                <span className={`badge ${item.status}`}>{getStatusLabel(item.status)}</span>
                <span className="item-name">{item.name}</span>
              </div>
              <div className="item-right">
                {item.latest_price ? (
                  <div className="item-price">
                    <span className="price">${item.latest_price}</span>
                    <span className="supermarket">{item.supermarket}</span>
                  </div>
                ) : (
                  <span className="no-price">Sin precio registrado</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default ShoppingList