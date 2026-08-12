import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import Inventory from './pages/Inventory'
import ShoppingList from './pages/ShoppingList'
import './App.css'

function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <main className="container">
        <Routes>
          <Route path="/" element={<Inventory />} />
          <Route path="/shopping-list" element={<ShoppingList />} />
        </Routes>
      </main>
    </BrowserRouter>
  )
}

export default App