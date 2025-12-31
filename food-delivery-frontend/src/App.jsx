import { Routes, Route } from 'react-router-dom' // Removed 'Navigate'
import Login from './pages/Login'
import Home from './pages/Home'
import Menu from './pages/Menu'
import Cart from './pages/Cart'
import OrderTracking from './pages/OrderTracking'
import OwnerDashboard from './pages/OwnerDashboard'
import Signup from './pages/Signup'
import OrderHistory from './pages/OrderHistory'
import AddMenu from './pages/AddMenu'
import DriverDashboard from './pages/DriverDashboard'

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/" element={<Home />} />
      <Route path="/menu/:id" element={<Menu />} />
      <Route path="/cart" element={<Cart />} />
      <Route path="/my-orders" element={<OrderHistory />} />
      <Route path="/tracking" element={<OrderTracking />} />
      <Route path="/owner" element={<OwnerDashboard />} />
      <Route path="/add-menu" element={<AddMenu />} />
      <Route path="/driver" element={<DriverDashboard />} />
    </Routes>
  )
}

export default App