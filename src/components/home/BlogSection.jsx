const BlogSection = () => {
  return (
    <section className="blog-section section-padding bg-gray-50">
      <div className="container-custom">
        <h2 className="text-4xl font-heading font-bold text-center mb-12">Блог</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Blog articles will be added here */}
          {[1, 2, 3].map((item) => (
            <div key={item} className="bg-white rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-shadow">
              <div className="bg-gray-200 h-48"></div>
              <div className="p-6">
                <h3 className="text-xl font-semibold mb-2">Статья {item}</h3>
                <p className="text-gray-600 text-sm mb-4">21 октября 2025</p>
                <p className="text-gray-600">Краткое описание статьи...</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default BlogSection

