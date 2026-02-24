import { useRef, useEffect } from 'react'
import { useGLTF } from '@react-three/drei'

export function setupShadows(scene) {
  scene.traverse(o => {
    if (o.isMesh) {
      o.castShadow = true
      o.receiveShadow = true
    }
  })
}

/**
 * Preloaded scene: уже загруженная сцена (для отображения прогресса загрузки).
 * @param {THREE.Group} scene - Готовая сцена из GLTFLoader
 * @param {Function} onLoad - Callback когда модель готова к отображению
 */
export function PreloadedChairModel({ scene, onLoad, scale = 1, ...props }) {
  const group = useRef()
  useEffect(() => {
    if (!scene) return
    setupShadows(scene)
    if (onLoad) onLoad()
  }, [scene, onLoad])

  if (!scene) return null
  return (
    <group ref={group} {...props} scale={scale}>
      <primitive object={scene} />
    </group>
  )
}

/**
 * Chair 3D Model Component (загрузка через useGLTF)
 * @param {string} modelPath - Path to GLB model file
 * @param {number} scale - Model scale multiplier
 * @param {Function} onLoad - Callback when model is loaded
 * @param {Object} props - Additional props
 */
const ChairModel = ({ modelPath, scale = 1, onLoad, ...props }) => {
  const group = useRef()
  const { scene } = useGLTF(modelPath)

  useEffect(() => {
    setupShadows(scene)
    if (onLoad) onLoad()
  }, [scene, onLoad])

  return (
    <group ref={group} {...props} scale={scale}>
      <primitive object={scene} />
    </group>
  )
}

export default ChairModel

