import Button from '@components/common/Button'

const Hero = () => {
  return (
    <section className="hero-section min-h-screen flex items-center bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="container-custom">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Text Content */}
          <div className="space-y-6">
            <h1 className="text-5xl md:text-6xl font-heading font-bold text-balance">
              Премиальные кресла для вашего комфорта
            </h1>
            <p className="text-xl text-gray-600">
              Производим эргономичные кресла для офиса и дома с использованием современных технологий и материалов
            </p>
            <div className="flex gap-4">
              <Button variant="primary" size="lg">Каталог</Button>
              <Button variant="outline" size="lg">Связаться</Button>
            </div>
          </div>

          {/* 3D Model Placeholder */}
          <div className="relative h-96 lg:h-[500px] bg-gray-200 rounded-xl flex items-center justify-center">
            <p className="text-gray-500">3D модель кресла</p>
            {/* ChairModel component will be added here */}
          </div>
        </div>
      </div>
    </section>
  )
}

export default Hero

