import axios from 'axios'

const API_URL = 'http://127.0.0.1:8000'

const api = axios.create({
  baseURL: API_URL,
})

// Products
export const getProducts = () => api.get('/products')
export const createProduct = (product) => api.post('/products', product)
export const deleteProduct = (id) => api.delete(`/products/${id}`)
export const updateStock = (id, stock) => api.patch(`/products/${id}/stock`, null, { params: { stock } })
export const getProductsWithPrices = () => api.get('/products/with-prices')
export const updateProductName = (id, name) => api.patch(`/products/${id}/name`, null, { params: { name } })

// Prices
export const getPrices = (productId) => api.get(`/prices/${productId}`)
export const createPrice = (price) => api.post('/prices', price)
export const getPriceAlert = (productId) => api.get(`/prices/${productId}/alert`)
export const deletePrice = (priceId) => api.delete(`/prices/${priceId}`)

// Shopping list
export const getShoppingList = () => api.get('/shopping-list')

// Tickets
export const analyzeTicket = (formData) => api.post('/tickets/analyze', formData, {
  headers: { 'Content-Type': 'multipart/form-data' }
})

// Dashboard
export const getInventorySummary = () => api.get('/dashboard/inventory-summary')
export const getPriceHistoryChart = (productId) => api.get(`/dashboard/price-history/${productId}`)