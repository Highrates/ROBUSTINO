import { useEffect, useState, useRef } from 'react'

/**
 * Custom hook to detect when element is in viewport
 * @param {Object} options - IntersectionObserver options
 * @returns {Array} [ref, isIntersecting]
 */
const useIntersectionObserver = (options = {}) => {
  const [isIntersecting, setIsIntersecting] = useState(false)
  const elementRef = useRef(null)

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      setIsIntersecting(entry.isIntersecting)
    }, {
      threshold: 0.1,
      ...options,
    })

    const currentElement = elementRef.current
    if (currentElement) {
      observer.observe(currentElement)
    }

    return () => {
      if (currentElement) {
        observer.unobserve(currentElement)
      }
    }
  }, [options])

  return [elementRef, isIntersecting]
}

export default useIntersectionObserver

