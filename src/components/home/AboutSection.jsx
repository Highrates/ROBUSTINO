const AboutSection = () => {
  return (
    <section className="about-section section-padding bg-white">
      <div className="container-custom">
        <h2 className="text-4xl font-heading font-bold text-center mb-12">О компании</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Placeholder content */}
          <div className="text-center">
            <h3 className="text-2xl font-semibold mb-4">Качество</h3>
            <p className="text-gray-600">Премиальные материалы и тщательный контроль качества</p>
          </div>
          <div className="text-center">
            <h3 className="text-2xl font-semibold mb-4">Опыт</h3>
            <p className="text-gray-600">Многолетний опыт в производстве мебели</p>
          </div>
          <div className="text-center">
            <h3 className="text-2xl font-semibold mb-4">Инновации</h3>
            <p className="text-gray-600">Современные технологии и дизайн</p>
          </div>
        </div>
      </div>
    </section>
  )
}

export default AboutSection

