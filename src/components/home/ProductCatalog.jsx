const ProductCatalog = () => {
  return (
    <section className="catalog-section section-padding bg-gray-50">
      <div className="container-custom">
        <h2 className="text-4xl font-heading font-bold text-center mb-12">Наша продукция</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Product cards will be added here */}
          {[1, 2, 3].map((item) => (
            <div key={item} className="bg-white rounded-xl shadow-md p-6 hover:shadow-xl transition-shadow">
              <div className="bg-gray-200 h-64 rounded-lg mb-4"></div>
              <h3 className="text-xl font-semibold mb-2">Кресло {item}</h3>
              <p className="text-gray-600">Описание продукта</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default ProductCatalog

