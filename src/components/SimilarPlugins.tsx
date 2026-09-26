import { useState, useEffect } from 'react'
import { ArrowRight, Loader2, Shuffle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import type { PluginBase } from '@/types'
import { findSimilarPlugins } from '@/services/similar'
import { PlatformIcon } from '@/components/PlatformIcons'
import { formatDownloads, getPlatformName, getPlatformColor } from '@/services/search'

interface Props {
  plugin: PluginBase
}

export default function SimilarPlugins({ plugin }: Props) {
  const [similar, setSimilar] = useState<PluginBase[]>([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    let active = true
    setLoading(true)
    findSimilarPlugins(plugin, 3)
      .then(r => { if (active) setSimilar(r) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [plugin.id])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6 text-gray-500 dark:text-dark-text-secondary text-sm">
        <Loader2 className="w-4 h-4 animate-spin mr-2" />
        正在寻找相似插件...
      </div>
    )
  }

  if (similar.length === 0) return null

  return (
    <div className="bg-white dark:bg-dark-card rounded-xl border border-mc-border dark:border-dark-border p-4">
      <h3 className="font-minecraft text-sm text-gray-800 dark:text-dark-text flex items-center gap-1.5 mb-3">
        <Shuffle className="w-4 h-4 text-mc-green" />
        相似插件 / 替代品
      </h3>
      <div className="space-y-2">
        {similar.map(s => (
          <button
            key={s.id}
            onClick={() => {
              const ownerSlug = s.platformId.includes('/') ? s.platformId : undefined
              if (s.platform === 'hangar' && ownerSlug) {
                const [owner, slug] = ownerSlug.split('/')
                navigate(`/plugin/hangar/${owner}/${slug}`)
              } else {
                navigate(`/plugin/${s.platform}/${s.platformId}`)
              }
            }}
            className="w-full text-left flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-50 dark:hover:bg-dark-border/50 transition-colors group"
          >
            {s.icon ? (
              <img src={s.icon} alt="" className="w-9 h-9 rounded-md object-cover flex-shrink-0" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
            ) : (
              <div className={`w-9 h-9 rounded-md flex items-center justify-center flex-shrink-0 bg-mc-green/10 dark:bg-mc-green/20 ${getPlatformColor(s.platform)}`}>
                <PlatformIcon platform={s.platform} size={16} />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-medium text-sm text-gray-800 dark:text-dark-text truncate">{s.name}</span>
                <span className={`text-[10px] px-1 rounded ${getPlatformColor(s.platform)} opacity-60`}>
                  {getPlatformName(s.platform)}
                </span>
              </div>
              <div className="text-[11px] text-gray-500 dark:text-dark-text-secondary truncate">
                {s.tag}
              </div>
              <div className="text-[10px] text-gray-400">
                ↓ {formatDownloads(s.downloads)}
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-mc-green transition-colors flex-shrink-0" />
          </button>
        ))}
      </div>
    </div>
  )
}
