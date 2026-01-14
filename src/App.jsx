import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'

// Pages
import Home from '@pages/Home'
import ProductPage from '@pages/ProductPage'
import Products from '@pages/Products'
import About from '@pages/About'
import Articles from '@pages/Articles'
import Article from '@pages/Article'
import Projects from '@pages/Projects'
import Page from '@pages/Page'

// Admin Pages
import Login from '@pages/Admin/Login'
import AdminDashboard from '@pages/Admin/AdminDashboard'
import AdminProducts from '@pages/Admin/AdminProducts'
import AdminProductForm from '@pages/Admin/AdminProductForm'
import AdminArticles from '@pages/Admin/AdminArticles'
import AdminArticleForm from '@pages/Admin/AdminArticleForm'
import AdminProjects from '@pages/Admin/AdminProjects'
import AdminProjectForm from '@pages/Admin/AdminProjectForm'
import AdminFAQ from '@pages/Admin/AdminFAQ'
import AdminFAQForm from '@pages/Admin/AdminFAQForm'
import AdminUpholstery from '@pages/Admin/AdminUpholstery'
import AdminUpholsteryForm from '@pages/Admin/AdminUpholsteryForm'
import AdminFAQLinks from '@pages/Admin/AdminFAQLinks'
import AdminFAQLinkForm from '@pages/Admin/AdminFAQLinkForm'
import AdminPresentation from '@pages/Admin/AdminPresentation'

// Admin Components
import ProtectedRoute from '@components/admin/ProtectedRoute'

// Dev Pages
import StyleGuideDemo from '@pages/StyleGuideDemo'

function App() {
  return (
    <Router
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Home />} />
        <Route path="/products" element={<Products />} />
        <Route path="/product/:id" element={<ProductPage />} />
        <Route path="/about" element={<About />} />
        <Route path="/articles" element={<Articles />} />
        <Route path="/article/:id" element={<Article />} />
        <Route path="/projects" element={<Projects />} />
        <Route path="/page/:id" element={<Page />} />
        
        {/* Dev Routes */}
        <Route path="/styleguide" element={<StyleGuideDemo />} />

        {/* Admin Routes */}
        <Route path="/admin/login" element={<Login />} />
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/products"
          element={
            <ProtectedRoute>
              <AdminProducts />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/products/new"
          element={
            <ProtectedRoute>
              <AdminProductForm />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/products/:id/edit"
          element={
            <ProtectedRoute>
              <AdminProductForm />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/articles"
          element={
            <ProtectedRoute>
              <AdminArticles />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/articles/new"
          element={
            <ProtectedRoute>
              <AdminArticleForm />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/articles/:id/edit"
          element={
            <ProtectedRoute>
              <AdminArticleForm />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/projects"
          element={
            <ProtectedRoute>
              <AdminProjects />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/projects/new"
          element={
            <ProtectedRoute>
              <AdminProjectForm />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/projects/:id/edit"
          element={
            <ProtectedRoute>
              <AdminProjectForm />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/faq"
          element={
            <ProtectedRoute>
              <AdminFAQ />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/faq/new"
          element={
            <ProtectedRoute>
              <AdminFAQForm />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/faq/:id/edit"
          element={
            <ProtectedRoute>
              <AdminFAQForm />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/upholstery"
          element={
            <ProtectedRoute>
              <AdminUpholstery />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/upholstery/new"
          element={
            <ProtectedRoute>
              <AdminUpholsteryForm />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/upholstery/:id/edit"
          element={
            <ProtectedRoute>
              <AdminUpholsteryForm />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/faq-links"
          element={
            <ProtectedRoute>
              <AdminFAQLinks />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/faq-links/new"
          element={
            <ProtectedRoute>
              <AdminFAQLinkForm />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/faq-links/:id/edit"
          element={
            <ProtectedRoute>
              <AdminFAQLinkForm />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/presentation"
          element={
            <ProtectedRoute>
              <AdminPresentation />
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  )
}

export default App

