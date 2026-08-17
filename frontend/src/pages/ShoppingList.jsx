import { useState, useEffect, useRef } from 'react'
import { getShoppingList, getProductsWithPrices } from '../api'
import html2canvas from 'html2canvas'

function ShoppingList() {
  const [items, setItems] = useState([])
  const [allProducts, setAllProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAll, setShowAll] = useState(false)
  const [selectedItems, setSelectedItems] = useState([])
  const listRef = useRef(null)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [listRes, productsRes] = await Promise.all([
        getShoppingList(),
        getProductsWithPrices()
      ])
      setItems(listRes.data)
      setAllProducts(productsRes.data)
      setSelectedItems(listRes.data.map((_, i) => i))
    } catch (err) {
      console.error('Error fetching data:', err)
    } finally {
      setLoading(false)
    }
  }

  const getStatusLabel = (status) => {
    const labels = {
      critical: 'Crítico',
      urgent: 'Urgente',
      low: 'Bajo',
      ok: 'OK',
    }
    return `Stock ${labels[status] || status}`
  }

  const okProducts = allProducts
    .filter(p => !items.find(i => i.product_id === p.id))
    .map(p => ({
      product_id: p.id,
      name: p.name,
      category: p.category,
      current_stock: p.current_stock,
      minimum_stock: p.minimum_stock,
      status: 'ok',
      latest_price: p.latest_price,
      supermarket: p.supermarket,
    }))

  const displayItems = showAll
    ? [...items, ...okProducts]
    : items

  const toggleItem = (index) => {
    setSelectedItems(prev =>
      prev.includes(index)
        ? prev.filter(i => i !== index)
        : [...prev, index]
    )
  }

  const getSelectedDisplayItems = () =>
    selectedItems.map(i => displayItems[i]).filter(Boolean)

  const copyToClipboard = () => {
    const selected = getSelectedDisplayItems()
    if (selected.length === 0) return
    const text = selected
      .map(item => `${getStatusLabel(item.status)} - ${item.name}${item.latest_price ? ` ($${item.latest_price} en ${item.supermarket})` : ''}`)
      .join('\n')
    navigator.clipboard.writeText(text)
    alert('Lista copiada al portapapeles')
  }

  const exportAsImage = async () => {
    const selected = getSelectedDisplayItems()
    if (selected.length === 0) return

    // Create hidden container with only selected items
    const container = document.createElement('div')
    container.style.cssText = `
      position: fixed;
      top: -9999px;
      left: -9999px;
      width: 600px;
      background-color: #0F1923;
      padding: 20px;
      font-family: Arial, sans-serif;
    `

    // Header
    const header = document.createElement('div')
    header.style.cssText = `
      display: flex;
      justify-content: space-between;
      padding: 12px 20px;
      background-color: #1A2B3C;
      border-radius: 10px 10px 0 0;
      border: 1px solid #2E4057;
      border-bottom: none;
      color: #8BADC7;
      font-size: 13px;
      font-weight: bold;
      margin-bottom: 0;
    `
    header.innerHTML = `
      <span>SmartCart IA - Lista de compras</span>
      <span>${new Date().toLocaleDateString('es-AR')}</span>
    `
    container.appendChild(header)

    // Items
    const statusColors = {
      critical: { border: '#E24B4A', bg: '#1F1A1A', badge: '#3D1A1A', badgeText: '#FF6B6B' },
      urgent:   { border: '#EF9F27', bg: '#1F1D1A', badge: '#3D2E10', badgeText: '#FFB347' },
      low:      { border: '#2E75B6', bg: '#1A1D1F', badge: '#1A2B3D', badgeText: '#5BA3D9' },
      ok:       { border: '#2E4057', bg: '#1A2B3C', badge: '#1A2D1A', badgeText: '#6DBF67' },
    }

    selected.forEach(item => {
      const colors = statusColors[item.status] || statusColors.ok
      const row = document.createElement('div')
      row.style.cssText = `
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 14px 20px;
        background-color: ${colors.bg};
        border: 1px solid #2E4057;
        border-left: 5px solid ${colors.border};
        margin-top: 8px;
        border-radius: 8px;
        gap: 12px;
      `
      row.innerHTML = `
        <div style="display:flex;align-items:center;gap:12px;flex:1;">
          <span style="
            padding: 4px 10px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: bold;
            background-color: ${colors.badge};
            color: ${colors.badgeText};
            white-space: nowrap;
          ">${getStatusLabel(item.status)}</span>
          <span style="font-size:14px;font-weight:bold;color:#E0E0E0;">${item.name}</span>
        </div>
        <div style="text-align:right;flex-shrink:0;">
          ${item.latest_price != null
            ? `<div style="font-size:15px;font-weight:bold;color:#4A9EDB;">$${item.latest_price}</div>
              <div style="font-size:11px;color:#556677;">${item.supermarket}</div>`
            : `<span style="font-size:12px;color:#556677;">Sin precio</span>`
          }
        </div>
      `
      container.appendChild(row)
    })

    document.body.appendChild(container)

    try {
      const canvas = await html2canvas(container, {
        backgroundColor: '#0F1923',
        scale: 2,
      })
      const link = document.createElement('a')

      const now = new Date()
      const pad = (n) => String(n).padStart(2, '0')
      const filename = `lista-smartcart_${pad(now.getDate())}-${pad(now.getMonth() + 1)}-${now.getFullYear()}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}.png`
      link.download = filename

      link.href = canvas.toDataURL('image/png')
      link.click()
    } catch (err) {
      console.error('Error exporting image:', err)
    } finally {
      document.body.removeChild(container)
    }
  }

  if (loading) return <div className="loading">Generando lista de compras...</div>

  return (
    <div className="page">
      <div className="page-header">
        <h1>Lista de compras</h1>
        {displayItems.length > 0 && (
          <div className="list-actions">
            <button
              className="btn-secondary"
              onClick={copyToClipboard}
              disabled={selectedItems.length === 0}
              style={{ opacity: selectedItems.length === 0 ? 0.4 : 1, cursor: selectedItems.length === 0 ? 'not-allowed' : 'pointer' }}
            >
              Copiar lista
            </button>
            <button
              className="btn-primary"
              onClick={exportAsImage}
              disabled={selectedItems.length === 0}
            >
              Exportar imagen
            </button>
          </div>
        )}
      </div>

      <div className="list-toggle">
        <label className="toggle-label">
          <div
            className={`toggle-switch ${showAll ? 'active' : ''}`}
            onClick={() => {
              const newShowAll = !showAll
              setShowAll(newShowAll)
              if (newShowAll) {
                const allCount = items.length + okProducts.length
                setSelectedItems(Array.from({ length: allCount }, (_, i) => i))
              } else {
                setSelectedItems(items.map((_, i) => i))
              }
            }}
          >
            <div className="toggle-knob" />
          </div>
          <span>{showAll ? 'Mostrando todos los productos' : 'Mostrando solo faltantes'}</span>
        </label>
      </div>

      {displayItems.length === 0 ? (
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
          {displayItems.map((item, index) => (
            <div
              key={`${item.product_id}-${index}`}
              className={`shopping-item ${item.status} ${selectedItems.includes(index) ? '' : 'deselected'}`}
            >
              <div className="item-checkbox" onClick={() => toggleItem(index)}>
                <div className={`checkbox ${selectedItems.includes(index) ? 'checked' : ''}`}>
                  {selectedItems.includes(index) ? '✓' : ''}
                </div>
              </div>
              <div className="item-left">
                <span className={`badge ${item.status}`}>{getStatusLabel(item.status)}</span>
                <span className="item-name">{item.name}</span>
              </div>
              <div className="item-right">
                {item.latest_price != null ? (
                  <div className="item-price">
                    <span className="price">${item.latest_price}</span>
                    <span className="supermarket">{item.supermarket}</span>
                  </div>
                ) : (
                  <span className="no-price">Sin precio</span>
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