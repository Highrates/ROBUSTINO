import { useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'

/**
 * Chair 3D Model Component
 * @param {string} modelPath - Path to GLB model file
 * @param {boolean} autoRotate - Enable auto rotation
 * @param {Array} rotation - Model rotation [x, y, z] in radians
 * @param {number} scale - Model scale multiplier
 * @param {Object} props - Additional props
 */
const ChairModel = ({ modelPath, autoRotate = false, rotation = [0, -Math.PI * 0.15, 0], scale = 1, onLoad, ...props }) => {
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
  
  // Auto-rotation animation
  useFrame(() => {
    if (autoRotate && group.current) {
      group.current.rotation.y += 0.005
    }
  })

  return (
    <group ref={group} {...props} scale={scale} rotation={rotation}>
      <primitive object={scene} />
    </group>
  )
}

export default ChairModel

