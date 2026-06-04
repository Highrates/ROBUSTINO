import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { prefersReducedMotion } from '@utils/motion'

/**
 * Custom hook for GSAP animations
 * @param {Function} animationFn - Function containing GSAP animations
 * @param {Array} dependencies - Dependencies array for useEffect
 */
const useGSAP = (animationFn, dependencies = []) => {
  const ctx = useRef()

  useEffect(() => {
    if (prefersReducedMotion()) return

    ctx.current = gsap.context(() => {
      animationFn()
    })

    return () => ctx.current?.revert()
  }, dependencies)

  return ctx
}

export default useGSAP

