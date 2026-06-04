export function getNavbarHeight() {
  if (typeof window === 'undefined') return 90
  const value = getComputedStyle(document.documentElement).getPropertyValue('--navbar-height').trim()
  return parseInt(value, 10) || 90
}
