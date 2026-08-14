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

// Prices
export const getPrices = (productId) => api.get(`/prices/${productId}`)
export const createPrice = (price) => api.post('/prices', price)
export const getPriceAlert = (productId) => api.get(`/prices/${productId}/alert`)

// Shopping list
export const getShoppingList = () => api.get('/shopping-list')

// Tickets
export const scanTicket = (formData) => api.post('/tickets/scan', formData, {
  headers: { 'Content-Type': 'multipart/form-data' }
})