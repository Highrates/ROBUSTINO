/** Strip HTML / collapse whitespace for schema.org text fields. */
export function plainTextForSchema(value) {
  return String(value || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * FAQPage node for JSON-LD @graph (no @context — parent provides it).
 * @param {Array<{ question?: string, answer?: string, is_active?: boolean }>} faqs
 * @returns {object|null}
 */
export function buildFaqPageEntity(faqs) {
  const items = (faqs || [])
    .filter((f) => f && f.is_active !== false)
    .map((f) => ({
      question: plainTextForSchema(f.question),
      answer: plainTextForSchema(f.answer),
    }))
    .filter((f) => f.question && f.answer)

  if (!items.length) return null

  return {
    '@type': 'FAQPage',
    mainEntity: items.map((f) => ({
      '@type': 'Question',
      name: f.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: f.answer,
      },
    })),
  }
}
