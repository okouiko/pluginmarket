import { Server, Blocks, Hexagon } from 'lucide-react'
import type { PluginBase } from '@/types'
import { serverTypeLabel, serverTypeColor } from '@/services/versions'

interface Props {
  plugin: PluginBase
}

export default function CompatInfo({ plugin }: Props) {
  const { serverTypes = [], gameVersions = [] } = plugin
  if (serverTypes.length === 0 && gameVersions.length === 0) return null

  return (
    <div className="bg-white dark:bg-dark-card rounded-xl border border-mc-border dark:border-dark-border p-4 space-y-3">
      <h3 className="font-minecraft text-sm text-gray-800 dark:text-dark-text flex items-center gap-1.5">
        <Server className="w-4 h-4 text-mc-green" />
        运行环境
      </h3>

      {serverTypes.length > 0 && (
        <div>
          <div className="text-xs text-gray-500 dark:text-dark-text-secondary mb-1.5 flex items-center gap-1">
            <Blocks className="w-3 h-3" /> 支持的服务端/加载器
          </div>
          <div className="flex flex-wrap gap-1.5">
            {serverTypes.map(t => (
              <span
                key={t}
                className={`px-2 py-0.5 text-xs rounded-md ${serverTypeColor(t)}`}
              >
                {serverTypeLabel(t)}
              </span>
            ))}
          </div>
        </div>
      )}

      {gameVersions.length > 0 && (
        <div>
          <div className="text-xs text-gray-500 dark:text-dark-text-secondary mb-1.5 flex items-center gap-1">
            <Hexagon className="w-3 h-3" /> Minecraft 版本
            <span className="text-gray-400">({gameVersions.length})</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {gameVersions.slice(0, 30).map(gv => (
              <span
                key={gv}
                className="px-1.5 py-0.5 text-[11px] rounded bg-gray-100 text-gray-600 dark:bg-dark-border dark:text-dark-text-secondary font-mono"
              >
                {gv}
              </span>
            ))}
            {gameVersions.length > 30 && (
              <span className="text-[11px] text-gray-400 self-center">
                +{gameVersions.length - 30}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
