const ProjectsSection = () => {
  return (
    <section className="projects-section section-padding bg-white">
      <div className="container-custom">
        <h2 className="text-4xl font-heading font-bold text-center mb-12">Реализованные объекты</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Project items will be added here */}
          {[1, 2].map((item) => (
            <div key={item} className="bg-gray-50 rounded-xl overflow-hidden">
              <div className="bg-gray-200 h-64"></div>
              <div className="p-6">
                <h3 className="text-xl font-semibold mb-2">Проект {item}</h3>
                <p className="text-gray-600">Описание проекта</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default ProjectsSection

