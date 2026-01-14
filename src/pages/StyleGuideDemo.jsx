// Демо-страница стайлгайда (только для разработки)
// Добавьте роут /styleguide для просмотра

const StyleGuideDemo = () => {
  return (
    <div className="min-h-screen bg-main-bg">
      {/* Colors Section */}
      <section className="padding-global py-20">
        <h1 className="text-5xl font-bold text-main-text mb-12">ROBUSTINO Style Guide</h1>
        
        <div className="space-y-16">
          {/* Цвета */}
          <div>
            <h2 className="text-3xl font-semibold text-main-text mb-6">Цветовая палитра</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="space-y-3">
                <div className="h-32 bg-main-bg border-2 border-main-text rounded-lg"></div>
                <p className="font-semibold text-main-text">main-bg</p>
                <p className="text-sm text-second-text">#F1F2F0</p>
              </div>
              <div className="space-y-3">
                <div className="h-32 bg-second-bg rounded-lg"></div>
                <p className="font-semibold text-main-text">second-bg</p>
                <p className="text-sm text-second-text">#D5D7D4</p>
              </div>
              <div className="space-y-3">
                <div className="h-32 bg-main-text rounded-lg"></div>
                <p className="font-semibold text-main-text">main-text</p>
                <p className="text-sm text-second-text">#363636</p>
              </div>
              <div className="space-y-3">
                <div className="h-32 bg-second-text rounded-lg"></div>
                <p className="font-semibold text-main-text">second-text</p>
                <p className="text-sm text-second-text">#A9A9A9</p>
              </div>
            </div>
          </div>

          {/* Типографика */}
          <div>
            <h2 className="text-3xl font-semibold text-main-text mb-6">Типографика - Commissioner</h2>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-second-text mb-2">Heading 1 (5xl, Bold)</p>
                <h1 className="text-5xl font-bold text-main-text">The quick brown fox jumps</h1>
              </div>
              <div>
                <p className="text-sm text-second-text mb-2">Heading 2 (4xl, Semibold)</p>
                <h2 className="text-4xl font-semibold text-main-text">The quick brown fox jumps</h2>
              </div>
              <div>
                <p className="text-sm text-second-text mb-2">Heading 3 (3xl, Semibold)</p>
                <h3 className="text-3xl font-semibold text-main-text">The quick brown fox jumps</h3>
              </div>
              <div>
                <p className="text-sm text-second-text mb-2">Heading 4 (2xl, Medium)</p>
                <h4 className="text-2xl font-medium text-main-text">The quick brown fox jumps</h4>
              </div>
              <div>
                <p className="text-sm text-second-text mb-2">Body Large (xl, Regular)</p>
                <p className="text-xl text-main-text">The quick brown fox jumps over the lazy dog. Съешь ещё этих мягких французских булок.</p>
              </div>
              <div>
                <p className="text-sm text-second-text mb-2">Body (base, Regular)</p>
                <p className="text-base text-main-text">The quick brown fox jumps over the lazy dog. Съешь ещё этих мягких французских булок.</p>
              </div>
              <div>
                <p className="text-sm text-second-text mb-2">Body Small (sm, Regular)</p>
                <p className="text-sm text-main-text">The quick brown fox jumps over the lazy dog. Съешь ещё этих мягких французских булок.</p>
              </div>
              <div>
                <p className="text-sm text-second-text mb-2">Caption (xs, Light)</p>
                <p className="text-xs font-light text-second-text">The quick brown fox jumps over the lazy dog</p>
              </div>
            </div>
          </div>

          {/* Начертания */}
          <div>
            <h2 className="text-3xl font-semibold text-main-text mb-6">Начертания шрифта</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <p className="font-thin text-2xl text-main-text">Thin (100)</p>
                <p className="font-extralight text-2xl text-main-text">Extra Light (200)</p>
                <p className="font-light text-2xl text-main-text">Light (300)</p>
              </div>
              <div className="space-y-2">
                <p className="font-normal text-2xl text-main-text">Regular (400)</p>
                <p className="font-medium text-2xl text-main-text">Medium (500)</p>
                <p className="font-semibold text-2xl text-main-text">Semi Bold (600)</p>
              </div>
              <div className="space-y-2">
                <p className="font-bold text-2xl text-main-text">Bold (700)</p>
                <p className="font-extrabold text-2xl text-main-text">Extra Bold (800)</p>
                <p className="font-black text-2xl text-main-text">Black (900)</p>
              </div>
            </div>
          </div>

          {/* Примеры использования */}
          <div>
            <h2 className="text-3xl font-semibold text-main-text mb-6">Примеры компонентов</h2>
            
            {/* Карточка */}
            <div className="space-y-8">
              <div>
                <p className="text-sm text-second-text mb-4">Карточка продукта</p>
                <div className="bg-second-bg rounded-lg p-6 max-w-sm">
                  <div className="bg-main-bg h-48 rounded-lg mb-4 flex items-center justify-center">
                    <span className="text-second-text">3D модель</span>
                  </div>
                  <h3 className="text-2xl font-semibold text-main-text mb-2">
                    Кресло Executive
                  </h3>
                  <p className="text-second-text mb-4">
                    Премиальное офисное кресло с эргономичной спинкой
                  </p>
                  <button className="bg-main-text text-main-bg px-6 py-3 rounded-lg font-medium hover:bg-opacity-90 transition-all">
                    Подробнее
                  </button>
                </div>
              </div>

              {/* Секции с чередующимися фонами */}
              <div>
                <p className="text-sm text-second-text mb-4">Чередующиеся секции</p>
                <div className="space-y-px">
                  <div className="bg-main-bg p-8">
                    <h3 className="text-2xl font-semibold text-main-text mb-2">Секция 1</h3>
                    <p className="text-second-text">Фон: main-bg</p>
                  </div>
                  <div className="bg-second-bg p-8">
                    <h3 className="text-2xl font-semibold text-main-text mb-2">Секция 2</h3>
                    <p className="text-second-text">Фон: second-bg</p>
                  </div>
                  <div className="bg-main-bg p-8">
                    <h3 className="text-2xl font-semibold text-main-text mb-2">Секция 3</h3>
                    <p className="text-second-text">Фон: main-bg</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Контейнер padding-global */}
          <div>
            <h2 className="text-3xl font-semibold text-main-text mb-6">Контейнер padding-global</h2>
            <div className="bg-second-bg p-4 rounded-lg">
              <div className="bg-main-text/10 border-2 border-dashed border-main-text p-4 rounded">
                <p className="text-main-text">
                  Этот контент находится внутри класса <code className="font-mono bg-main-text text-main-bg px-2 py-1 rounded">.padding-global</code>
                </p>
                <p className="text-second-text text-sm mt-2">
                  padding-left/right: 2.5rem (40px) | max-width: 1536px | margin: auto
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

export default StyleGuideDemo

