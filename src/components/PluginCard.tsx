import { useNavigate } from 'react-router-dom'
import { Star, Download, Heart, MoreVertical, ExternalLink, Folder, FolderPlus } from 'lucide-react'
import type { PluginBase } from '@/types'
import { useAppStore } from '@/store'
import { formatDownloads, getPlatformName } from '@/services/search'
import { PlatformIcon } from '@/components/PlatformIcons'
import { useState, useMemo, useRef, useEffect } from 'react'

interface Props {
  plugin: PluginBase
  /** 搜索关键词（高亮用） */
  highlight?: string
  /** 当前选中的文件夹 id（收藏页上下文用） */
  currentFolderId?: string | undefined
}

const platformColors: Record<string, string> = {
  spigot: 'text-spigot',
  hangar: 'text-hangar',
  modrinth: 'text-modrinth',
}

const platformBgColors: Record<string, string> = {
  spigot: 'bg-spigot/10 dark:bg-spigot/20',
  hangar: 'bg-hangar/10 dark:bg-hangar/20',
  modrinth: 'bg-modrinth/10 dark:bg-modrinth/20',
}

/** 把文本中匹配关键词的部分用 <mark> 包裹 */
function HighlightText({ text, query }: { text: string; query?: string }) {
  const parts = useMemo(() => {
    if (!query || !text.trim()) return [{ text, hit: false }]
    const keys = query.trim().split(/\s+/).filter(Boolean)
    if (keys.length === 0) return [{ text, hit: false }]
    const escaped = keys.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')
    const regex = new RegExp(`(${escaped})`, 'gi')
    const segments = text.split(regex)
    return segments.map(s => ({ text: s, hit: regex.test(s) && keys.some(k => k.toLowerCase() === s.toLowerCase()) }))
  }, [text, query])

  return (
    <>
      {parts.map((p, i) =>
        p.hit ? (
          <mark key={i} className="bg-yellow-200 dark:bg-yellow-700/50 text-gray-900 dark:text-yellow-200 rounded px-0.5">
            {p.text}
          </mark>
        ) : (
          <span key={i}>{p.text}</span>
        )
      )}
    </>
  )
}

export default function PluginCard({ plugin, highlight, currentFolderId }: Props) {
  const store = useAppStore()
  const { isFavorite, addFavorite, removeFavorite, moveFavorite, folders, addFolder } = store
  const [menuOpen, setMenuOpen] = useState(false)
  const [folderPickerOpen, setFolderPickerOpen] = useState(false)
  const [showNewFolderInput, setShowNewFolderInput] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const menuRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const fav = isFavorite(plugin.id)

  // 外部点击关闭
  useEffect(() => {
    if (!menuOpen) return
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false); setFolderPickerOpen(false)
      }
    }
    setTimeout(() => document.addEventListener('mousedown', handler), 0)
    return () => document.removeEventListener('mousedown', handler)
  }, [menuOpen])

  const stars = plugin.rating ? Math.round(plugin.rating) : 0

  const handleToggleFav = (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation()
    if (fav) removeFavorite(plugin.id)
    else addFavorite(plugin, currentFolderId)
  }

  const handleMoveToFolder = (e: React.MouseEvent, folderId: string | undefined) => {
    e.preventDefault(); e.stopPropagation()
    if (!fav) addFavorite(plugin, folderId)
    else moveFavorite(plugin.id, folderId)
    setFolderPickerOpen(false); setMenuOpen(false)
  }

  const handleCreateFolder = (e?: React.MouseEvent | React.KeyboardEvent) => {
    if (e) { e.preventDefault(); e.stopPropagation() }
    const name = newFolderName.trim()
    if (!name) return
    const id = addFolder(name)
    if (!fav) addFavorite(plugin, id)
    else moveFavorite(plugin.id, id)
    setNewFolderName(''); setShowNewFolderInput(false); setFolderPickerOpen(false); setMenuOpen(false)
  }

  return (
    <div
      className="bg-white dark:bg-dark-card rounded-xl border border-mc-border dark:border-dark-border card-hover cursor-pointer group relative overflow-hidden h-[180px] flex flex-col"
      onClick={() => navigate(`/plugin/${plugin.platform}/${plugin.platformId}`)}
    >
      {/* Menu button */}
      <div className="absolute top-2 right-2 z-10" ref={menuRef}>
        <button
          onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); setFolderPickerOpen(false); setShowNewFolderInput(false) }}
          className="p-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 dark:bg-dark-card/80 hover:bg-gray-100 dark:hover:bg-dark-border"
        >
          <MoreVertical className="w-4 h-4 text-gray-500 dark:text-dark-text-secondary" />
        </button>
        {menuOpen && (
          <div className="absolute right-0 top-8 bg-white dark:bg-dark-card border border-mc-border dark:border-dark-border rounded-lg shadow-lg py-1 min-w-[160px] animate-fade-in">
            <div
              role="button" tabIndex={0}
              onClick={handleToggleFav}
              className="w-full px-3 py-1.5 text-left text-xs flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-dark-border text-gray-700 dark:text-dark-text cursor-pointer"
            >
              <Heart className={`w-3 h-3 ${fav ? 'fill-red-500 text-red-500' : ''}`} />
              {fav ? '取消收藏' : '收藏'}
            </div>

            {/* 移动到文件夹 子菜单 */}
            {fav && (
              <>
                <div
                  role="button" tabIndex={0}
                  onClick={(e) => { e.stopPropagation(); setFolderPickerOpen(!folderPickerOpen) }}
                  className="w-full px-3 py-1.5 text-left text-xs flex items-center justify-between gap-2 hover:bg-gray-50 dark:hover:bg-dark-border text-gray-700 dark:text-dark-text cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <Folder className="w-3 h-3 text-mc-green" />
                    移动到文件夹
                  </span>
                  <span className={`text-[10px] transition-transform ${folderPickerOpen ? 'rotate-90' : ''}`}>›</span>
                </div>

                {folderPickerOpen && (
                  <div className="max-h-[180px] overflow-y-auto border-t border-mc-border dark:border-dark-border">
                    {/* 根目录 */}
                    <div
                      role="button" tabIndex={0}
                      onClick={(e) => handleMoveToFolder(e, undefined)}
                      className="w-full px-4 py-1.5 text-left text-[11px] hover:bg-gray-50 dark:hover:bg-dark-border/50 flex items-center gap-2 cursor-pointer"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-gray-300" />
                      未分类
                    </div>
                    {folders.map(f => (
                      <div
                        key={f.id}
                        role="button" tabIndex={0}
                        onClick={(e) => handleMoveToFolder(e, f.id)}
                        className={`w-full px-4 py-1.5 text-left text-[11px] hover:bg-gray-50 dark:hover:bg-dark-border/50 flex items-center gap-2 cursor-pointer ${
                          currentFolderId === f.id ? 'bg-mc-green/10 text-mc-green' : ''
                        }`}
                      >
                        <Folder className="w-3 h-3 text-mc-green flex-shrink-0" />
                        <span className="truncate">{f.name}</span>
                      </div>
                    ))}
                    {/* 新建文件夹 */}
                    {showNewFolderInput ? (
                      <div className="px-2 py-1.5 flex gap-1">
                        <input
                          autoFocus
                          value={newFolderName}
                          onChange={(e) => setNewFolderName(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder(e)}
                          placeholder="新建文件夹"
                          className="flex-1 px-2 py-1 text-[11px] rounded border border-mc-border dark:border-dark-border bg-white dark:bg-dark-bg focus:outline-none focus:ring-1 focus:ring-mc-green"
                        />
                        <div
                          role="button" tabIndex={0}
                          onClick={handleCreateFolder}
                          className="px-2 py-1 bg-mc-green text-white rounded text-[11px] cursor-pointer"
                        >OK</div>
                      </div>
                    ) : (
                      <div
                        role="button" tabIndex={0}
                        onClick={(e) => { e.stopPropagation(); setShowNewFolderInput(true) }}
                        className="w-full px-4 py-1.5 text-left text-[11px] hover:bg-gray-50 dark:hover:bg-dark-border/50 flex items-center gap-2 text-mc-green cursor-pointer"
                      >
                        <FolderPlus className="w-3 h-3" />
                        新建文件夹
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            <div className="border-t border-mc-border dark:border-dark-border my-1" />

            {plugin.sourceUrl && (
              <div
                role="button" tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation()
                  window.open(plugin.sourceUrl, '_blank')
                  setMenuOpen(false)
                }}
                className="w-full px-3 py-1.5 text-left text-xs flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-dark-border text-gray-700 dark:text-dark-text cursor-pointer"
              >
                <ExternalLink className="w-3 h-3" />
                原始页面
              </div>
            )}
          </div>
        )}
      </div>

      <div className="p-4 flex flex-col flex-1 min-h-0">
        {/* Header */}
        <div className="flex items-start gap-3 mb-2 flex-shrink-0">
          {plugin.icon ? (
            <img src={plugin.icon} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" onError={(e) => { e.currentTarget.style.display = 'none' }} />
          ) : (
            <div className="w-10 h-10 rounded-lg bg-mc-green/10 dark:bg-mc-green/20 flex items-center justify-center flex-shrink-0">
              <PlatformIcon platform={plugin.platform} size={20} className={platformColors[plugin.platform]} />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h3 className="font-minecraft text-sm font-medium text-gray-800 dark:text-dark-text truncate">
              <HighlightText text={plugin.name} query={highlight} />
            </h3>
            {plugin.author && (
              <p className="text-xs text-gray-500 dark:text-dark-text-secondary truncate">
                by <HighlightText text={plugin.author} query={highlight} />
              </p>
            )}
          </div>
        </div>

        {/* Description */}
        <p className="text-xs text-gray-600 dark:text-dark-text-secondary line-clamp-2 mb-2 flex-shrink-0 h-8 overflow-hidden">
          {plugin.tag ? <HighlightText text={plugin.tag} query={highlight} /> : '\u00A0'}
        </p>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Stats */}
        <div className="flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-dark-text-secondary">
              <Download className="w-3 h-3" />
              {formatDownloads(plugin.downloads)}
            </div>
          </div>
          <span className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1 ${platformBgColors[plugin.platform]} ${platformColors[plugin.platform]}`}>
            <PlatformIcon platform={plugin.platform} size={12} className={platformColors[plugin.platform]} />
            {getPlatformName(plugin.platform)}
          </span>
        </div>

        {/* Categories / Stars */}
        {plugin.categories && plugin.categories.filter(c => c && c.trim()).length > 0 ? (
          <div className="flex flex-wrap gap-1 mt-2 flex-shrink-0 h-5 overflow-hidden">
            {plugin.categories.filter(c => c && c.trim()).slice(0, 3).map((cat, i) => (
              <span key={`${cat}-${i}`} className="text-[10px] px-1.5 py-0.5 bg-gray-100 dark:bg-dark-border text-gray-500 dark:text-dark-text-secondary rounded">
                {cat}
              </span>
            ))}
          </div>
        ) : stars > 0 ? (
          <div className="flex items-center gap-0.5 mt-2 flex-shrink-0 h-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className={`w-3.5 h-3.5 ${i < stars ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300 dark:text-gray-600'}`} />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  )
}
