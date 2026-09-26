import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { BarChart3, Download, Package, Users, Loader2, ChevronRight } from 'lucide-react'
import { getCategoryStats, type CategoryStat } from '@/services/stats'
import { PlatformIcon } from '@/components/PlatformIcons'

function formatBig(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M+`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K+`
  return String(n)
}

export default function StatsDashboard() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [data, setData] = useState<Awaited<ReturnType<typeof getCategoryStats>> | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    let active = true
    setLoading(true)
    getCategoryStats()
      .then(d => { if (active) setData(d) })
      .catch(() => { if (active) setError(true) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  if (loading) {
    return (
      <div className="bg-white dark:bg-dark-card rounded-xl border border-mc-border dark:border-dark-border p-5 animate-pulse">
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-dark-text-secondary mb-4">
          <BarChart3 className="w-4 h-4" /> 加载分类统计...
        </div>
        <div className="grid grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 bg-gray-100 dark:bg-dark-border rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  if (error || !data) return null

  const topCats = data.categories.slice(0, 6)
  const maxDownloads = topCats[0]?.totalDownloads ?? 1

  return (
    <div className="bg-gradient-to-br from-mc-green/5 to-transparent dark:from-mc-green/10 dark:to-transparent rounded-xl border border-mc-border dark:border-dark-border p-5 space-y-5">
      <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-dark-text font-medium">
        <BarChart3 className="w-4 h-4 text-mc-green" />
        三大平台热门分类统计
      </div>

      {/* 顶部大数字 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard icon={<Package className="w-4 h-4" />} label="热门插件样本" value={data.totalPlugins} />
        <StatCard icon={<Download className="w-4 h-4" />} label="累计下载量" value={formatBig(data.totalDownloads)} />
        <StatCard icon={<Users className="w-4 h-4" />} label="独立作者" value={data.totalAuthors} />
        <StatCard
          icon={<BarChart3 className="w-4 h-4" />}
          label="覆盖分类"
          value={data.categories.length}
          sub={`Spigot ${data.platforms.spigot} · Hangar ${data.platforms.hangar} · Modrinth ${data.platforms.modrinth}`}
        />
      </div>

      {/* 分类横向条形图 */}
      <div className="space-y-2.5">
        {topCats.map((c) => (
          <CategoryBar key={c.name} stat={c} maxDownloads={maxDownloads} />
        ))}
      </div>
    </div>
  )
}

function StatCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-white/80 dark:bg-dark-card/80 border border-mc-border dark:border-dark-border rounded-lg p-3">
      <div className="flex items-center gap-1.5 text-[11px] text-gray-500 dark:text-dark-text-secondary mb-1">
        <span className="text-mc-green">{icon}</span>
        {label}
      </div>
      <div className="text-lg font-minecraft text-gray-800 dark:text-dark-text leading-tight">{value}</div>
      {sub && <div className="text-[10px] text-gray-400 mt-0.5 truncate">{sub}</div>}
    </div>
  )
}

function CategoryBar({ stat, maxDownloads }: { stat: CategoryStat; maxDownloads: number }) {
  const pct = Math.round((stat.totalDownloads / maxDownloads) * 100)
  const navigate = useNavigate()

  return (
    <div
      className="relative group cursor-pointer"
      onClick={() => {
        if (stat.topPlugin) {
          navigate(`/plugin/${stat.topPlugin.platform}/${stat.topPlugin.platformId}`)
        }
      }}
    >
      <div className="flex items-center gap-2 text-[11px] mb-1">
        <span className="font-medium text-gray-700 dark:text-dark-text min-w-[50px] truncate">{stat.label}</span>
        <span className="text-gray-400">{formatBig(stat.totalDownloads)} 下载 · {stat.totalPlugins} 个插件</span>
        <span className="flex-1" />
        <div className="flex items-center gap-1 opacity-70">
          {stat.platforms.spigot ? <span className="w-3 h-3"><PlatformIcon platform="spigot" size={12} /></span> : null}
          {stat.platforms.hangar ? <span className="w-3 h-3"><PlatformIcon platform="hangar" size={12} /></span> : null}
          {stat.platforms.modrinth ? <span className="w-3 h-3"><PlatformIcon platform="modrinth" size={12} /></span> : null}
        </div>
        <ChevronRight className="w-3 h-3 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
      <div className="h-2 bg-gray-100 dark:bg-dark-border rounded-full overflow-hidden">
        <div
          className={`h-full ${stat.color} opacity-80 rounded-full transition-all duration-500`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
