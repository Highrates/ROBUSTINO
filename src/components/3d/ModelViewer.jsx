import * as THREE from 'three'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Suspense, useState, useRef, useEffect } from 'react'
import { Environment, Center } from '@react-three/drei'
import ChairModel from './ChairModel'
import ErrorBoundary from './ErrorBoundary'

// Компонент для управления камерой
function CameraController({ zoomLevel }) {
  const { camera } = useThree()
  
  useEffect(() => {
    if (camera) {
      const baseZ = 2
      const newZ = baseZ - zoomLevel * 0.4  // Инвертировали знак: - вместо +
      camera.position.set(0, 0.65, newZ)  // Немного подняли камеру (было 0.5, стало 0.65)
      camera.updateProjectionMatrix()
    }
  }, [zoomLevel, camera])

  return null
}

// Компонент для кресла с инерцией
function ChairWrapper({ modelPath, autoRotate, onLoad, chairRef, scale = 1, initialRotation = 0 }) {
  const groupRef = useRef()

  // Устанавливаем начальный rotation при монтировании
  useEffect(() => {
    if (chairRef.current && groupRef.current) {
      chairRef.current.rotationY.current = initialRotation
      groupRef.current.rotation.y = initialRotation
    }
  }, [initialRotation])

  useFrame(() => {
    if (!groupRef.current) return

    // автоповорот
    if (autoRotate && !chairRef.current.isDragging.current) {
      chairRef.current.rotationY.current += 0.005
    }

    // инерция после отпускания
    if (!chairRef.current.isDragging.current && !autoRotate) {
      if (Math.abs(chairRef.current.velocity.current) > 0.0001) {
        chairRef.current.rotationY.current += chairRef.current.velocity.current
        chairRef.current.velocity.current *= 0.97
        if (Math.abs(chairRef.current.velocity.current) < 0.0001) {
          chairRef.current.velocity.current = 0
        }
      }
    }

    // числовая гигиена
    const rot = chairRef.current.rotationY.current
    if (rot > Math.PI * 1000 || rot < -Math.PI * 1000) {
      chairRef.current.rotationY.current = rot % (Math.PI * 2)
    }

    // применяем угол
    groupRef.current.rotation.y = chairRef.current.rotationY.current
  })

  return (
    <group ref={groupRef}>
      <ChairModel modelPath={modelPath} onLoad={onLoad} scale={scale} />
    </group>
  )
}

export default function ModelViewer({ 
  modelPath = '/models/armchair.glb',
  autoRotate = false,
  onUserInteraction = () => {},
  zoomLevel = 0,
  scale = 1,
  modelRotation = [0, -Math.PI * 0.15, 0] // Начальный rotation [x, y, z]
}) {
  const [isLoading, setIsLoading] = useState(true)

  // Константы для настройки чувствительности
  const ROTATION_FACTOR = 0.005
  const INERTIA_THRESHOLD = 0.0005

  const chairRef = useRef({
    rotationY: { current: 0 },
    velocity:  { current: 0 },
    isDragging:{ current: false },
    lastX:     { current: null }, // работает и для мыши, и для тача
  })

  // универсально: начало жеста
  const startDrag = (clientX) => {
    chairRef.current.isDragging.current = true
    chairRef.current.velocity.current = 0
    chairRef.current.lastX.current = clientX
    
    // Выключаем автоповорот при взаимодействии пользователя
    onUserInteraction()
  }

  // универсально: движение
  const moveDrag = (clientX) => {
    const prevX = chairRef.current.lastX.current
    if (prevX == null) {
        chairRef.current.lastX.current = clientX
        return
    }

    const dx = clientX - prevX
    const deltaAngle = dx * ROTATION_FACTOR

    // крутим модель
    chairRef.current.rotationY.current += deltaAngle

    // даём инерцию ТОЛЬКО если реально был флик
    if (Math.abs(deltaAngle) > INERTIA_THRESHOLD) {
      chairRef.current.velocity.current = deltaAngle
    }

    chairRef.current.lastX.current = clientX
  }

  // универсально: конец жеста
  const endDrag = () => {
    chairRef.current.isDragging.current = false
    chairRef.current.lastX.current = null
  }

  // теперь вешаем это на touch...
  const handleTouchStart = (e) => {
    const touch = e.touches[0]
    startDrag(touch.clientX)
  }

  const handleTouchMove = (e) => {
    e.preventDefault()
    const touch = e.touches[0]
    moveDrag(touch.clientX)
  }

  const handleTouchEnd = () => {
    endDrag()
  }

  // ...и на мышь
  const handleMouseDown = (e) => {
    // ЛКМ только
    if (e.button !== 0) return
    startDrag(e.clientX)
  }

  const handleMouseMove = (e) => {
    if (!chairRef.current.isDragging.current) return
    moveDrag(e.clientX)
  }

  const handleMouseUp = () => {
    if (!chairRef.current.isDragging.current) return
    endDrag()
  }

  return (
    <div
      className="relative w-full h-full"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp} // чтобы не залипало если увели курсор
    >
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
        </div>
      )}
      
      <ErrorBoundary
        key={modelPath}
        fallback={
          <div className="absolute inset-0 flex items-center justify-center text-sm text-red-500 bg-gray-100 rounded-lg">
            Ошибка загрузки модели
          </div>
        }
      >
        <Canvas
          shadows
          camera={{
            position: [0, 0.65, 2],  // Немного подняли камеру (было 0.5, стало 0.65)
            fov: 45,
          }}
          gl={{
            toneMapping: THREE.ACESFilmicToneMapping,
            outputColorSpace: THREE.SRGBColorSpace,
            physicallyCorrectLights: true,
          }}
        >
        <Suspense fallback={null}>
          {/* управление камерой */}
          <CameraController zoomLevel={zoomLevel} />
          
          {/* направленный свет */}
          <directionalLight
            position={[2, 5, 2]}
            intensity={3.7}
            castShadow
            shadow-mapSize-width={2048}
            shadow-mapSize-height={2048}
          />

          {/* важное место:
             Environment = единственный заполняющий свет,
             делаем его неярким */}
          <Environment
            preset="city"
            environmentIntensity={1.3}
            background={null}
          />

          {/* плоскость под моделью в цвете фона страницы */}
          <mesh
            rotation={[-Math.PI / 2, 0, 0]}
            position={[0, -0.5, 0]}
            receiveShadow
          >
            <planeGeometry args={[5, 5]} />
            <meshStandardMaterial 
              color="#DDDDDD"
              transparent
              opacity={0.9}
            />
          </mesh>


          {/* модель по центру */}
          <Center>
            <ChairWrapper
              modelPath={modelPath}
              autoRotate={autoRotate}
              onLoad={() => setIsLoading(false)}
              chairRef={chairRef}
              scale={scale}
              initialRotation={modelRotation[1]} // Используем Y rotation из массива
            />
          </Center>

        </Suspense>
        </Canvas>
      </ErrorBoundary>
    </div>
  )
}


