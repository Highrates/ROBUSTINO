import { useEffect, useRef } from 'react'
import gsap from 'gsap'

/**
 * Custom hook for GSAP animations
 * @param {Function} animationFn - Function containing GSAP animations
 * @param {Array} dependencies - Dependencies array for useEffect
 */
const useGSAP = (animationFn, dependencies = []) => {
  const ctx = useRef()

  useEffect(() => {
    ctx.current = gsap.context(() => {
      animationFn()
    })

    return () => ctx.current.revert()
  }, dependencies)

  return ctx
}

export default useGSAP

