import { useState, useEffect } from 'react'
import { Download, Loader2, FileText } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import type { PluginVersion } from '@/types'
import { getPluginVersions, serverTypeLabel, serverTypeColor, formatSize } from '@/services/versions'
import { formatDownloads } from '@/services/search'

interface Props {
  platform: 'spigot' | 'hangar' | 'modrinth'
  id: string
  subId?: string
}

export default function VersionsList({ platform, id, subId }: Props) {
  const [versions, setVersions] = useState<PluginVersion[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | number | null>(null)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)
    getPluginVersions(platform, id, subId)
      .then(v => { if (active) setVersions(v) })
      .catch(e => { if (active) setError(e.message || '加载失败') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [platform, id, subId])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10 text-gray-500 dark:text-dark-text-secondary">
        <Loader2 className="w-5 h-5 animate-spin mr-2" /> 加载版本历史...
      </div>
    )
  }

  if (error) {
    return <div className="text-center py-10 text-red-500 text-sm">{error}</div>
  }

  if (versions.length === 0) {
    return <div className="text-center py-10 text-gray-400 text-sm">暂无版本数据</div>
  }

  return (
    <div className="space-y-3">
      {versions.map(v => {
        const isExpanded = expandedId === v.id
        const date = new Date(v.releaseDate)
        const dateStr = date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'short', day: 'numeric' })
        const isChannel = v.channel && v.channel.toLowerCase() !== 'release' && v.channel.toLowerCase() !== 'releases'

        return (
          <div
            key={v.id}
            className="border border-mc-border dark:border-dark-border rounded-lg overflow-hidden"
          >
            {/* Header */}
            <button
              onClick={() => setExpandedId(isExpanded ? null : v.id)}
              className="w-full flex items-center justify-between gap-3 p-3 bg-gray-50 dark:bg-dark-bg hover:bg-gray-100 dark:hover:bg-dark-border transition-colors text-left"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="font-minecraft text-sm text-gray-800 dark:text-dark-text truncate">
                  {v.version}
                </span>
                {isChannel && (
                  <span className="px-1.5 py-0.5 text-[10px] rounded bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
                    {v.channel}
                  </span>
                )}
                {v.serverType && (
                  <span className={`px-1.5 py-0.5 text-[10px] rounded ${serverTypeColor(v.serverType)}`}>
                    {serverTypeLabel(v.serverType)}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-dark-text-secondary flex-shrink-0">
                {v.sizeBytes ? <span>{formatSize(v.sizeBytes)}</span> : null}
                <span>{formatDownloads(v.downloads)}</span>
                <span>{dateStr}</span>
                <span className={`transition-transform ${isExpanded ? 'rotate-90' : ''}`}>›</span>
              </div>
            </button>

            {/* Expand body */}
            {isExpanded && (
              <div className="p-3 border-t border-mc-border dark:border-dark-border space-y-3">
                {/* Game versions */}
                {v.gameVersions && v.gameVersions.length > 0 && (
                  <div>
                    <div className="text-xs text-gray-500 dark:text-dark-text-secondary mb-1.5">支持的 MC 版本</div>
                    <div className="flex flex-wrap gap-1">
                      {v.gameVersions.slice(0, 20).map(gv => (
                        <span
                          key={gv}
                          className="px-1.5 py-0.5 text-[11px] rounded bg-gray-100 text-gray-600 dark:bg-dark-border dark:text-dark-text-secondary"
                        >
                          {gv}
                        </span>
                      ))}
                      {v.gameVersions.length > 20 && (
                        <span className="text-[11px] text-gray-400">+{v.gameVersions.length - 20}</span>
                      )}
                    </div>
                  </div>
                )}

                {/* Changelog */}
                {v.changelog && (
                  <div>
                    <div className="text-xs text-gray-500 dark:text-dark-text-secondary mb-1.5 flex items-center gap-1">
                      <FileText className="w-3 h-3" /> 更新日志
                    </div>
                    <div className="markdown-body prose prose-sm max-w-none dark:prose-invert text-xs bg-gray-50 dark:bg-dark-bg p-2.5 rounded">
                      <ReactMarkdown
                        rehypePlugins={[rehypeRaw]}
                        remarkPlugins={[remarkGfm]}
                      >
                        {v.changelog}
                      </ReactMarkdown>
                    </div>
                  </div>
                )}

                {/* Download */}
                {v.downloadUrl && (
                  <a
                    href={v.downloadUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-mc-green text-white text-xs rounded-lg hover:bg-mc-green-dark transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    下载 {v.serverType ? `(${serverTypeLabel(v.serverType)})` : ''}
                    {v.sizeBytes ? ` · ${formatSize(v.sizeBytes)}` : ''}
                  </a>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
