import { useState } from 'react'

const FAQSection = () => {
  const [openIndex, setOpenIndex] = useState(null)

  const faqs = [
    { question: 'Вопрос 1', answer: 'Ответ на вопрос 1' },
    { question: 'Вопрос 2', answer: 'Ответ на вопрос 2' },
    { question: 'Вопрос 3', answer: 'Ответ на вопрос 3' },
  ]

  return (
    <section className="faq-section section-padding bg-white">
      <div className="container-custom max-w-3xl">
        <h2 className="text-4xl font-heading font-bold text-center mb-12">Частые вопросы</h2>
        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div key={index} className="border border-gray-200 rounded-lg">
              <button
                className="w-full p-6 text-left flex justify-between items-center hover:bg-gray-50 transition-colors"
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
              >
                <span className="font-semibold">{faq.question}</span>
                <span className="text-2xl">{openIndex === index ? '−' : '+'}</span>
              </button>
              {openIndex === index && (
                <div className="px-6 pb-6 text-gray-600">
                  {faq.answer}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default FAQSection

