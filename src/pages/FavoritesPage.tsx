import { useState, useMemo } from 'react'
import { Heart, Folder, FolderPlus, FolderOpen, Trash2, Edit3, Check, X } from 'lucide-react'
import { useAppStore } from '@/store'
import PluginCard from '@/components/PluginCard'
import type { FavoriteFolder } from '@/types'

export default function FavoritesPage() {
  const { favorites, folders, addFolder, renameFolder, deleteFolder, removeFavorite } = useAppStore()

  // 当前选中的 folderId：undefined = 未分类，null = 全部
  const [currentFolderId, setCurrentFolderId] = useState<string | undefined | null>(null)
  const [showNewFolderInput, setShowNewFolderInput] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null)
  const [editingFolderName, setEditingFolderName] = useState('')

  // 按 folderId 分组
  const groups = useMemo(() => {
    const map = new Map<string | undefined, typeof favorites>()
    for (const f of favorites) {
      const key = f.folderId
      const list = map.get(key) ?? []
      list.push(f)
      map.set(key, list)
    }
    return map
  }, [favorites])

  const ungroupedFavs = groups.get(undefined) ?? []
  const totalInFolder = (id: string) => groups.get(id)?.length ?? 0

  // 当前显示的收藏
  const displayedFavs = useMemo(() => {
    if (currentFolderId === null) return favorites
    return favorites.filter(f => f.folderId === currentFolderId)
  }, [favorites, currentFolderId])

  const handleCreateFolder = () => {
    const name = newFolderName.trim()
    if (!name) return
    addFolder(name)
    setNewFolderName('')
    setShowNewFolderInput(false)
  }

  const handleDeleteFolder = (id: string) => {
    if (!confirm('删除该文件夹？其中的收藏将移到"未分类"')) return
    deleteFolder(id)
    if (currentFolderId === id) setCurrentFolderId(null)
  }

  const handleStartRename = (f: FavoriteFolder) => {
    setEditingFolderId(f.id)
    setEditingFolderName(f.name)
  }

  const handleConfirmRename = () => {
    if (editingFolderId && editingFolderName.trim()) {
      renameFolder(editingFolderId, editingFolderName.trim())
    }
    setEditingFolderId(null)
    setEditingFolderName('')
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="flex items-center gap-2 mb-6">
        <Heart className="w-5 h-5 text-red-500 fill-red-500" />
        <h1 className="font-minecraft text-xl text-gray-800 dark:text-dark-text">我的收藏</h1>
        <span className="text-sm text-gray-400 dark:text-dark-text-secondary">({favorites.length} 个插件 · {folders.length} 个文件夹)</span>
      </div>

      {/* 空状态：收藏和文件夹都为空 */}
      {favorites.length === 0 && folders.length === 0 ? (
        <div className="text-center py-20 text-gray-400 dark:text-dark-text-secondary">
          <Heart className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
          <p>还没有收藏任何插件</p>
          <p className="text-sm mt-1">浏览插件时点击 ❤️ 即可收藏</p>
        </div>
      ) : (
        <div className="flex gap-6">
          {/* 左侧文件夹栏 */}
          <aside className="w-60 flex-shrink-0">
            <div className="bg-white dark:bg-dark-card rounded-xl border border-mc-border dark:border-dark-border p-3 space-y-1 sticky top-4">
              {/* 全部 */}
              <FolderItem
                active={currentFolderId === null}
                onClick={() => setCurrentFolderId(null)}
                icon={<FolderOpen className="w-3.5 h-3.5 text-gray-500" />}
                label="全部收藏"
                count={favorites.length}
              />

              {/* 未分类 */}
              <FolderItem
                active={currentFolderId === undefined}
                onClick={() => setCurrentFolderId(undefined)}
                icon={<span className="w-3 h-3 rounded-full bg-gray-400" />}
                label="未分类"
                count={ungroupedFavs.length}
              />

              {/* 分隔线 */}
              {folders.length > 0 && (
                <div className="border-t border-mc-border dark:border-dark-border my-2" />
              )}

              {/* 文件夹列表 */}
              {folders.map(f => {
                const count = totalInFolder(f.id)
                const isEditing = editingFolderId === f.id
                const isActive = currentFolderId === f.id
                return (
                  <div key={f.id} className="group relative">
                    {isEditing ? (
                      <div className="flex items-center gap-1 px-2 py-1.5">
                        <Folder className="w-3.5 h-3.5 text-mc-green flex-shrink-0" />
                        <input
                          autoFocus
                          value={editingFolderName}
                          onChange={(e) => setEditingFolderName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleConfirmRename()
                            if (e.key === 'Escape') { setEditingFolderId(null); setEditingFolderName('') }
                          }}
                          className="flex-1 min-w-0 px-1.5 py-0.5 text-xs rounded border border-mc-border focus:outline-none focus:ring-1 focus:ring-mc-green"
                        />
                        <button onClick={handleConfirmRename} className="p-0.5 text-mc-green"><Check className="w-3 h-3" /></button>
                        <button onClick={() => { setEditingFolderId(null); setEditingFolderName('') }} className="p-0.5 text-gray-400"><X className="w-3 h-3" /></button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setCurrentFolderId(f.id)}
                        className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left text-xs transition-colors group ${
                          isActive
                            ? 'bg-mc-green/10 dark:bg-mc-green/20 text-mc-green font-medium'
                            : 'text-gray-700 dark:text-dark-text hover:bg-gray-50 dark:hover:bg-dark-border/50'
                        }`}
                      >
                        <Folder className="w-3.5 h-3.5 text-mc-green flex-shrink-0" />
                        <span className="flex-1 min-w-0 truncate">{f.name}</span>
                        <span className="text-[10px] text-gray-400 flex-shrink-0">{count}</span>
                        <div className="hidden group-hover:flex items-center gap-0.5">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleStartRename(f) }}
                            className="p-0.5 hover:bg-gray-200 dark:hover:bg-dark-border rounded"
                            title="重命名"
                          >
                            <Edit3 className="w-3 h-3 text-gray-400" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDeleteFolder(f.id) }}
                            className="p-0.5 hover:bg-red-100 dark:hover:bg-red-900/30 rounded"
                            title="删除文件夹"
                          >
                            <Trash2 className="w-3 h-3 text-red-400" />
                          </button>
                        </div>
                      </button>
                    )}
                  </div>
                )
              })}

              {/* 新建文件夹 */}
              <div className="border-t border-mc-border dark:border-dark-border my-2" />
              {showNewFolderInput ? (
                <div className="flex items-center gap-1 px-2 py-1.5">
                  <FolderPlus className="w-3.5 h-3.5 text-mc-green flex-shrink-0" />
                  <input
                    autoFocus
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleCreateFolder()
                      if (e.key === 'Escape') { setShowNewFolderInput(false); setNewFolderName('') }
                    }}
                    placeholder="文件夹名称"
                    className="flex-1 min-w-0 px-1.5 py-0.5 text-xs rounded border border-mc-border focus:outline-none focus:ring-1 focus:ring-mc-green"
                  />
                  <button onClick={handleCreateFolder} className="p-0.5 text-mc-green"><Check className="w-3 h-3" /></button>
                  <button onClick={() => { setShowNewFolderInput(false); setNewFolderName('') }} className="p-0.5 text-gray-400"><X className="w-3 h-3" /></button>
                </div>
              ) : (
                <button
                  onClick={() => setShowNewFolderInput(true)}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-mc-green hover:bg-mc-green/10 transition-colors"
                >
                  <FolderPlus className="w-3.5 h-3.5" />
                  新建文件夹
                </button>
              )}
            </div>
          </aside>

          {/* 右侧收藏网格 */}
          <main className="flex-1 min-w-0">
            {displayedFavs.length === 0 ? (
              <div className="text-center py-16 text-gray-400 dark:text-dark-text-secondary">
                <Folder className="w-10 h-10 mx-auto mb-3 opacity-50" />
                <p>这里还没有收藏</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {displayedFavs.map(f => (
                  <PluginCard
                    key={f.plugin.id}
                    plugin={f.plugin}
                    currentFolderId={currentFolderId === null ? undefined : currentFolderId}
                  />
                ))}
              </div>
            )}
          </main>
        </div>
      )}
    </div>
  )
}

function FolderItem({
  active, onClick, icon, label, count,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
  count: number
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left text-xs transition-colors ${
        active
          ? 'bg-mc-green/10 dark:bg-mc-green/20 text-mc-green font-medium'
          : 'text-gray-700 dark:text-dark-text hover:bg-gray-50 dark:hover:bg-dark-border/50'
      }`}
    >
      {icon}
      <span className="flex-1 min-w-0 truncate">{label}</span>
      <span className="text-[10px] text-gray-400 flex-shrink-0">{count}</span>
    </button>
  )
}
