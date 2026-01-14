import { useRef, useEffect } from 'react'
import { useGLTF } from '@react-three/drei'

/**
 * Chair 3D Model Component
 * @param {string} modelPath - Path to GLB model file
 * @param {number} scale - Model scale multiplier
 * @param {Function} onLoad - Callback when model is loaded
 * @param {Object} props - Additional props
 */
const ChairModel = ({ modelPath, scale = 1, onLoad, ...props }) => {
  const group = useRef()
  
  // Load GLB model
  const { scene } = useGLTF(modelPath)
  
  // Auto-setup shadows for all meshes
  useEffect(() => {
    scene.traverse(o => {
      if (o.isMesh) {
        o.castShadow = true
        o.receiveShadow = true
      }
    })
    
    // Уведомляем о загрузке модели
    if (onLoad) {
      onLoad()
    }
  }, [scene, onLoad])

  return (
    <group ref={group} {...props} scale={scale}>
      <primitive object={scene} />
    </group>
  )
}

export default ChairModel

