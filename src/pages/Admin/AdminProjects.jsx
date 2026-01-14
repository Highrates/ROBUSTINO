import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import AdminLayout from '@components/admin/AdminLayout'
import useProjectsStore from '@store/projectsStore'

const AdminProjects = () => {
  const { projects, loading, error, fetchProjects, removeProject, setProjectsOptimistic, rollbackProjects, updateProjectsOrder } = useProjectsStore()
  const [deletingId, setDeletingId] = useState(null)
  const [draggedId, setDraggedId] = useState(null)
  const [dragOverId, setDragOverId] = useState(null)
  const [isReordering, setIsReordering] = useState(false)

  useEffect(() => {
    fetchProjects()
  }, [fetchProjects])

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Вы уверены, что хотите удалить проект "${name}"?`)) {
      return
    }

    setDeletingId(id)
    
    // Оптимистичное обновление
    const previousProjects = projects
    const optimisticProjects = projects.filter(p => p.id !== id)
    setProjectsOptimistic(optimisticProjects)
    
    try {
      await removeProject(id)
      await fetchProjects()
    } catch (error) {
      console.error('Ошибка удаления проекта:', error)
      // Откатываем изменения при ошибке через метод store
      rollbackProjects(previousProjects)
      alert('Ошибка удаления: ' + (error.message || 'Неизвестная ошибка'))
    } finally {
      setDeletingId(null)
    }
  }

  const handleDragStart = (e, projectId) => {
    setDraggedId(projectId)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/html', e.target.outerHTML)
    // Делаем элемент полупрозрачным при перетаскивании
    e.target.style.opacity = '0.5'
  }

  const handleDragEnd = (e) => {
    e.target.style.opacity = '1'
    setDraggedId(null)
    setDragOverId(null)
  }

  const handleDragOver = (e, projectId) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (projectId !== draggedId) {
      setDragOverId(projectId)
    }
  }

  const handleDragLeave = () => {
    setDragOverId(null)
  }

  const handleDrop = async (e, targetProjectId) => {
    e.preventDefault()
    setDragOverId(null)

    if (!draggedId || draggedId === targetProjectId) {
      setDraggedId(null)
      return
    }

    setIsReordering(true)
    const previousProjects = [...projects]

    // Находим индексы перетаскиваемого и целевого элементов
    const draggedIndex = projects.findIndex(p => p.id === draggedId)
    const targetIndex = projects.findIndex(p => p.id === targetProjectId)

    if (draggedIndex === -1 || targetIndex === -1) {
      setIsReordering(false)
      return
    }

    // Создаем новый массив с измененным порядком
    const newProjects = [...projects]
    const [removed] = newProjects.splice(draggedIndex, 1)
    newProjects.splice(targetIndex, 0, removed)

    // Обновляем оптимистично UI
    setProjectsOptimistic(newProjects)

    try {
      // Сохраняем новый порядок на сервере
      await updateProjectsOrder(newProjects)
    } catch (error) {
      console.error('Ошибка обновления порядка проектов:', error)
      // Откатываем изменения при ошибке
      rollbackProjects(previousProjects)
      alert('Ошибка обновления порядка: ' + (error.message || 'Неизвестная ошибка'))
    } finally {
      setDraggedId(null)
      setIsReordering(false)
    }
  }

  return (
    <AdminLayout>
      <div className="admin-projects">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Управление проектами</h1>
            <p className="text-sm text-gray-500 mt-1">Перетащите проекты для изменения порядка отображения</p>
          </div>
          <Link
            to="/admin/projects/new"
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
          >
            + Создать проект
          </Link>
        </div>

        {loading && (
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <p className="text-gray-600">Загрузка проектов...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <p className="text-red-800">Ошибка загрузки: {error}</p>
          </div>
        )}

        {!loading && !error && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            {projects.length === 0 ? (
              <div className="p-6 text-center">
                <p className="text-gray-600 mb-2">Проекты не найдены</p>
                <p className="text-sm text-gray-500">
                  Нажмите "Создать проект" для добавления нового проекта
                </p>
              </div>
            ) : (
              <div className="relative">
                {isReordering && (
                  <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10">
                    <div className="text-center">
                      <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                      <p className="text-sm text-gray-600">Сохранение порядка...</p>
                    </div>
                  </div>
                )}
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                        {/* Иконка перетаскивания */}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Название
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Кресло
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Количество мест
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Изображений
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Действия
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {projects.map((project) => (
                      <tr 
                        key={project.id} 
                        draggable
                        onDragStart={(e) => handleDragStart(e, project.id)}
                        onDragEnd={handleDragEnd}
                        onDragOver={(e) => handleDragOver(e, project.id)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, project.id)}
                        className={`hover:bg-gray-50 transition-colors ${
                          draggedId === project.id ? 'opacity-50' : ''
                        } ${
                          dragOverId === project.id ? 'bg-blue-50 border-t-2 border-b-2 border-blue-400' : ''
                        } ${isReordering ? 'cursor-wait' : 'cursor-move'}`}
                      >
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="flex items-center justify-center text-gray-400 hover:text-gray-600">
                            <svg 
                              className="w-5 h-5" 
                              fill="none" 
                              stroke="currentColor" 
                              viewBox="0 0 24 24"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <path 
                                strokeLinecap="round" 
                                strokeLinejoin="round" 
                                strokeWidth={2} 
                                d="M4 8h16M4 16h16" 
                              />
                            </svg>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900">{project.name}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-500">
                            {project.products?.name || '-'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {project.seats_count || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {project.images?.length || 0}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex justify-end space-x-4">
                            <Link
                              to={`/admin/projects/${project.id}/edit`}
                              className="text-blue-600 hover:text-blue-900"
                              onClick={(e) => isReordering && e.preventDefault()}
                            >
                              Редактировать
                            </Link>
                            <button
                              onClick={() => handleDelete(project.id, project.name)}
                              disabled={deletingId === project.id || isReordering}
                              className={`text-red-600 hover:text-red-900 ${
                                deletingId === project.id || isReordering ? 'opacity-50 cursor-not-allowed' : ''
                              }`}
                            >
                              {deletingId === project.id ? 'Удаление...' : 'Удалить'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  )
}

export default AdminProjects
