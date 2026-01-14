import * as THREE from 'three'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Suspense, useState, useRef, useEffect, useMemo } from 'react'
import { Environment } from '@react-three/drei'
import ChairModel from './ChairModel'
import ErrorBoundary from './ErrorBoundary'

// Компонент для управления камерой
function CameraController({ zoomLevel, cameraPosition = [0, 0.65, 2] }) {
  const { camera } = useThree()
  
  useEffect(() => {
    if (camera) {
      // Используем baseZ = 2 для расчета zoom, чтобы сохранить правильный масштаб
      const baseZ = 2
      const newZ = baseZ - zoomLevel * 0.4  // Инвертировали знак: - вместо +
      // Используем X и Y из cameraPosition, но Z рассчитываем от baseZ для zoom
      camera.position.set(cameraPosition[0], cameraPosition[1], newZ)
      camera.updateProjectionMatrix()
    }
  }, [zoomLevel, camera, cameraPosition])

  return null
}

// Компонент для кресла с инерцией
function ChairWrapper({ modelPath, autoRotate, onLoad, onAutoRotateEnd, chairRef, scale = 1, initialRotation = 0 }) {
  const groupRef = useRef()
  const isModelLoadedRef = useRef(false)
  const autoRotateStartTimeRef = useRef(null)
  const autoRotateSpeedRef = useRef(0)
  const hasCalledOnAutoRotateEndRef = useRef(false) // Флаг, чтобы вызвать callback только один раз

  // Сбрасываем состояние при смене модели
  useEffect(() => {
    isModelLoadedRef.current = false
    autoRotateStartTimeRef.current = null
    autoRotateSpeedRef.current = 0
    hasCalledOnAutoRotateEndRef.current = false // Сбрасываем флаг при смене модели
    // Сбрасываем позицию при смене модели
    if (groupRef.current) {
      groupRef.current.position.set(0, -0.45, 0)
    }
  }, [modelPath])

  // Устанавливаем начальный rotation при монтировании
  useEffect(() => {
    if (chairRef.current && groupRef.current) {
      chairRef.current.rotationY.current = initialRotation
      groupRef.current.rotation.y = initialRotation
    }
  }, [initialRotation])

  // Запуск автоповорота при изменении autoRotate
  useEffect(() => {
    if (autoRotate && isModelLoadedRef.current && !autoRotateStartTimeRef.current) {
      autoRotateStartTimeRef.current = Date.now()
      autoRotateSpeedRef.current = 0.05 // Начальная скорость вращения (увеличена)
      hasCalledOnAutoRotateEndRef.current = false // Сбрасываем флаг при запуске автоповорота
    } else if (!autoRotate) {
      autoRotateSpeedRef.current = 0
      autoRotateStartTimeRef.current = null
      hasCalledOnAutoRotateEndRef.current = false // Сбрасываем флаг при выключении
    }
  }, [autoRotate])

  // Обработчик загрузки модели
  const handleModelLoad = () => {
    isModelLoadedRef.current = true
    // Устанавливаем фиксированную позицию модели сразу после загрузки
    if (groupRef.current) {
      // Фиксированная позиция: X=0 (центр), Y=-0.45 (на полу), Z=0 (центр)
      groupRef.current.position.set(0, -0.45, 0)
    }
    // Запускаем автоповорот после загрузки модели
    if (autoRotate && !autoRotateStartTimeRef.current) {
      autoRotateStartTimeRef.current = Date.now()
      autoRotateSpeedRef.current = 0.05 // Начальная скорость вращения (увеличена)
      hasCalledOnAutoRotateEndRef.current = false // Сбрасываем флаг при запуске
    }
    if (onLoad) {
      onLoad()
    }
  }

  useFrame(() => {
    if (!groupRef.current) return

    // Поддерживаем фиксированную позицию после загрузки модели
    if (isModelLoadedRef.current) {
      // Фиксированная позиция: X=0, Y=-0.45 (на полу), Z=0
      groupRef.current.position.set(0, -0.45, 0)
    }

    // Обновляем скорость автоповорота с затуханием каждый кадр
    if (autoRotateStartTimeRef.current) {
      const elapsed = (Date.now() - autoRotateStartTimeRef.current) / 1000
      const duration = 4.3
      
      if (elapsed >= duration) {
        // Время истекло, останавливаем вращение
        autoRotateSpeedRef.current = 0
        autoRotateStartTimeRef.current = null
        // Вызываем callback для выключения кнопки rotate только один раз
        if (!hasCalledOnAutoRotateEndRef.current && onAutoRotateEnd) {
          hasCalledOnAutoRotateEndRef.current = true
          // Вызываем callback в следующем тике, чтобы избежать проблем с обновлением состояния
          setTimeout(() => {
            onAutoRotateEnd()
          }, 0)
        }
      } else {
        // Вычисляем скорость с затуханием (от 0.05 до 0)
        const progress = elapsed / duration
        autoRotateSpeedRef.current = 0.05 * (1 - progress) // Линейное затухание
      }
    }

    // автоповорот с переменной скоростью
    if (autoRotateSpeedRef.current > 0 && !chairRef.current.isDragging.current) {
      chairRef.current.rotationY.current += autoRotateSpeedRef.current
    }

    // инерция после отпускания
    if (!chairRef.current.isDragging.current && !autoRotate && autoRotateSpeedRef.current === 0) {
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
      <ChairModel modelPath={modelPath} onLoad={handleModelLoad} scale={scale} />
    </group>
  )
}

export default function ModelViewer({ 
  modelPath = '/models/armchair.glb',
  autoRotate = false,
  onUserInteraction = () => {},
  onAutoRotateEnd = () => {}, // Callback когда автоповорот закончился
  zoomLevel = 0,
  scale = 1,
  modelRotation = [0, -Math.PI * 0.15, 0], // Начальный rotation [x, y, z]
  cameraPosition = [0, 0.65, 2] // Позиция камеры [x, y, z]
}) {
  const [isLoading, setIsLoading] = useState(true)
  
  // Создаем текстуру с градиентом для пола
  const gradientTexture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 512
    canvas.height = 512
    const ctx = canvas.getContext('2d')
    
    // Создаем радиальный градиент от центра к краям
    const gradient = ctx.createRadialGradient(256, 256, 0, 256, 256, 256)
    gradient.addColorStop(0, 'rgba(241, 242, 240, 0.8)') // #F1F2F0 с прозрачностью
    gradient.addColorStop(0.5, 'rgba(241, 242, 240, 0.4)')
    gradient.addColorStop(1, 'rgba(241, 242, 240, 0)') // Полностью прозрачный по краям
    
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, 512, 512)
    
    const texture = new THREE.CanvasTexture(canvas)
    texture.wrapS = THREE.RepeatWrapping
    texture.wrapT = THREE.RepeatWrapping
    return texture
  }, [])

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
            position: [cameraPosition[0], cameraPosition[1], 2], // Z всегда 2 для правильного масштаба, Y из cameraPosition для вертикальной позиции
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
          <CameraController zoomLevel={zoomLevel} cameraPosition={cameraPosition} />
          
          {/* направленный свет */}
          <directionalLight
            position={[3, 7, 3]}
            intensity={5}
            castShadow
            shadow-mapSize-width={2048}
            shadow-mapSize-height={2048}
          />

          {/* важное место:
             Environment = единственный заполняющий свет,
             делаем его неярким */}
          <Environment
            preset="city"
            environmentIntensity={1.5}
            background={null}
          />

          {/* плоскость под моделью с градиентом */}
          <mesh
            rotation={[-Math.PI / 2, 0, 0]}
            position={[0, -0.45, 0]}
            receiveShadow
          >
            <planeGeometry args={[5, 5]} />
            <meshStandardMaterial 
              map={gradientTexture}
              transparent
              color="#F1F2F0"
              roughness={0.9}
              metalness={0}
              shadowSide={THREE.FrontSide}
            />
          </mesh>


          {/* модель с фиксированной позицией */}
          <ChairWrapper
            modelPath={modelPath}
            autoRotate={autoRotate}
            onLoad={() => setIsLoading(false)}
            onAutoRotateEnd={onAutoRotateEnd}
            chairRef={chairRef}
            scale={scale}
            initialRotation={modelRotation[1]} // Используем Y rotation из массива
          />

        </Suspense>
        </Canvas>
      </ErrorBoundary>
    </div>
  )
}


