import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

// Register GSAP plugins
gsap.registerPlugin(ScrollTrigger)

/**
 * Fade in animation with GSAP
 * @param {string|Element} target - Element or selector to animate
 * @param {Object} options - GSAP animation options
 */
export const fadeIn = (target, options = {}) => {
  return gsap.from(target, {
    opacity: 0,
    y: 30,
    duration: 0.8,
    ease: 'power3.out',
    ...options,
  })
}

/**
 * Stagger animation for multiple elements
 * @param {string|Element} target - Elements to animate
 * @param {Object} options - Animation options
 */
export const staggerIn = (target, options = {}) => {
  return gsap.from(target, {
    opacity: 0,
    y: 50,
    duration: 0.6,
    stagger: 0.15,
    ease: 'power3.out',
    ...options,
  })
}

/**
 * Scroll-triggered animation
 * @param {string|Element} target - Element to animate
 * @param {Object} animationOptions - GSAP animation options
 * @param {Object} scrollOptions - ScrollTrigger options
 */
export const scrollAnimation = (target, animationOptions = {}, scrollOptions = {}) => {
  return gsap.from(target, {
    scrollTrigger: {
      trigger: target,
      start: 'top 80%',
      toggleActions: 'play none none none',
      ...scrollOptions,
    },
    opacity: 0,
    y: 60,
    duration: 1,
    ease: 'power3.out',
    ...animationOptions,
  })
}

/**
 * Parallax effect
 * @param {string|Element} target - Element to apply parallax
 * @param {number} speed - Parallax speed (default: 0.5)
 */
export const parallax = (target, speed = 0.5) => {
  return gsap.to(target, {
    yPercent: 50 * speed,
    ease: 'none',
    scrollTrigger: {
      trigger: target,
      start: 'top bottom',
      end: 'bottom top',
      scrub: true,
    },
  })
}

/**
 * Counter animation
 * @param {string|Element} target - Element containing number
 * @param {number} endValue - Final number value
 * @param {number} duration - Animation duration
 */
export const animateCounter = (target, endValue, duration = 2) => {
  const obj = { value: 0 }
  return gsap.to(obj, {
    value: endValue,
    duration,
    ease: 'power2.out',
    onUpdate: () => {
      if (typeof target === 'string') {
        document.querySelector(target).textContent = Math.round(obj.value)
      } else {
        target.textContent = Math.round(obj.value)
      }
    },
  })
}

export default {
  fadeIn,
  staggerIn,
  scrollAnimation,
  parallax,
  animateCounter,
}

