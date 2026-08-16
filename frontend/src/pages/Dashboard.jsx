import { useState, useEffect } from 'react'
import { getInventorySummary, getPriceHistoryChart, getProducts } from '../api'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer
} from 'recharts'

function Dashboard() {
  const [summary, setSummary] = useState(null)
  const [products, setProducts] = useState([])
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [priceHistory, setPriceHistory] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [summaryRes, productsRes] = await Promise.all([
        getInventorySummary(),
        getProducts()
      ])
      setSummary(summaryRes.data)
      setProducts(productsRes.data)
      if (productsRes.data.length > 0) {
        setSelectedProduct(productsRes.data[0].id)
      }
    } catch (err) {
      console.error('Error fetching dashboard:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!selectedProduct) return
    getPriceHistoryChart(selectedProduct).then(res => {
      setPriceHistory(res.data)
    })
  }, [selectedProduct])

  if (loading) return <div className="loading">Cargando dashboard...</div>

  // Group price history by supermarket for multi-line chart
  const supermarkets = [...new Set(priceHistory.map(p => p.supermarket))]
  const chartData = priceHistory.reduce((acc, p) => {
    const existing = acc.find(d => d.date === p.date)
    if (existing) {
      existing[p.supermarket] = p.price
    } else {
      acc.push({ date: p.date, [p.supermarket]: p.price })
    }
    return acc
  }, [])

  const lineColors = ['#E8A838', '#A855F7', '#06B6D4', '#EC4899', '#84CC16', '#F97316']

  return (
    <div className="page">
      <div className="page-header">
        <h1>Estadísticas de precios</h1>
      </div>

      {/* Price history chart */}
      <div className="dashboard-chart-box">
        <div className="dashboard-chart-header">
          <h3>Evolucion de precios</h3>
          <select
            className="dashboard-select"
            value={selectedProduct || ''}
            onChange={(e) => setSelectedProduct(parseInt(e.target.value))}
          >
            {products.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        {priceHistory.length === 0 ? (
          <div className="dashboard-empty">
            Este producto no tiene historial de precios todavia.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2E4057" />
              <XAxis dataKey="date" tick={{ fill: '#556677', fontSize: 11 }} />
              <YAxis tick={{ fill: '#556677', fontSize: 11 }} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1A2B3C', border: '1px solid #2E4057', borderRadius: '8px' }}
                labelStyle={{ color: '#8BADC7' }}
                itemStyle={{ color: '#E0E0E0' }}
              />
              <Legend wrapperStyle={{ fontSize: '12px', color: '#8BADC7' }} />
              {supermarkets.map((super_, i) => (
                <Line
                  key={super_}
                  type="monotone"
                  dataKey={super_}
                  stroke={lineColors[i % lineColors.length]}
                  strokeWidth={2}
                  dot={{ r: 4, fill: lineColors[i % lineColors.length] }}
                  activeDot={{ r: 6 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Supermarket comparison */}
      {priceHistory.length > 0 && (
        <div className="dashboard-chart-box">
          <div className="dashboard-chart-header">
            <h3>Precio registrado por supermercado</h3>
          </div>
          <div className="dashboard-super-list">
            {supermarkets
              .map((super_, i) => {
                const latestPrice = [...priceHistory]
                  .filter(p => p.supermarket === super_)
                  .pop()
                return { super_, i, price: latestPrice?.price }
              })
              .sort((a, b) => a.price - b.price)
              .map(({ super_, i, price }) => (
                <div key={super_} className="dashboard-super-item">
                  <span className="dashboard-super-name">{super_}</span>
                  <span className="dashboard-super-price" style={{ color: lineColors[i % lineColors.length] }}>
                    ${price}
                  </span>
                </div>
              ))
            }
          </div>
        </div>
      )}
    </div>
  )
}

export default Dashboard