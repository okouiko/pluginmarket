import { useState } from 'react'
import { ChevronRight, Filter } from 'lucide-react'
import type { SortOption } from '@/services/filters'

const categories = [
  { id: 'all', label: '全部' },
  { id: 'gameplay', label: '游戏玩法' },
  { id: 'admin', label: '管理工具' },
  { id: 'chat', label: '聊天社交' },
  { id: 'economy', label: '经济系统' },
  { id: 'protection', label: '领地保护' },
  { id: 'world', label: '世界生成' },
  { id: 'teleport', label: '传送系统' },
  { id: 'pvp', label: 'PvP 战斗' },
  { id: 'minigame', label: '小游戏' },
  { id: 'utility', label: '实用工具' },
  { id: 'api', label: 'API/库' },
  { id: 'cosmetic', label: '装饰美化' },
  { id: 'npc', label: 'NPC 系统' },
  { id: 'quest', label: '任务系统' },
  { id: 'skill', label: '技能/职业' },
]

const serverTypes = [
  { id: 'all', label: '全部服务端' },
  { id: 'paper', label: 'Paper' },
  { id: 'spigot', label: 'Spigot' },
  { id: 'bukkit', label: 'Bukkit' },
  { id: 'folia', label: 'Folia' },
  { id: 'velocity', label: 'Velocity' },
  { id: 'bungeecord', label: 'BungeeCord' },
  { id: 'waterfall', label: 'Waterfall' },
  { id: 'fabric', label: 'Fabric' },
  { id: 'forge', label: 'Forge' },
  { id: 'sponge', label: 'Sponge' },
]

const sortOptions: { id: SortOption; label: string }[] = [
  { id: 'popular', label: '最热门' },
  { id: 'newest', label: '最新发布' },
  { id: 'updated', label: '最近更新' },
  { id: 'downloads', label: '下载量' },
  { id: 'rating', label: '评分最高' },
]

const downloadFilters = [
  { id: 'all', label: '不限' },
  { id: '1000', label: '1,000+' },
  { id: '10000', label: '10,000+' },
  { id: '50000', label: '50,000+' },
  { id: '100000', label: '100,000+' },
]

interface Props {
  selectedCategory: string
  selectedServer: string
  selectedDownloads: string
  selectedSort: SortOption
  onCategoryChange: (id: string) => void
  onServerChange: (id: string) => void
  onDownloadsChange: (id: string) => void
  onSortChange: (sort: SortOption) => void
}

export default function FilterPanel({
  selectedCategory,
  selectedServer,
  selectedDownloads,
  selectedSort,
  onCategoryChange,
  onServerChange,
  onDownloadsChange,
  onSortChange,
}: Props) {
  const [serverCollapsed, setServerCollapsed] = useState(true)
  const [downloadsCollapsed, setDownloadsCollapsed] = useState(false)
  const [sortCollapsed, setSortCollapsed] = useState(true)

  return (
    <div className="bg-white dark:bg-dark-card rounded-xl border border-mc-border dark:border-dark-border p-4 sticky top-20 space-y-5 max-h-[calc(100vh-6rem)] overflow-y-auto">
      <h3 className="font-minecraft text-sm font-medium flex items-center gap-1 text-gray-800 dark:text-dark-text">
        <Filter className="w-4 h-4" />
        筛选
      </h3>

      {/* 分类 */}
      <div>
        <h4 className="font-minecraft text-xs text-gray-500 dark:text-dark-text-secondary mb-2 uppercase tracking-wider">分类</h4>
        <div className="space-y-0.5">
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => onCategoryChange(cat.id)}
              className={`w-full text-left px-2.5 py-1.5 rounded-md text-xs transition-colors ${
                selectedCategory === cat.id
                  ? 'bg-mc-green/10 dark:bg-mc-green/20 text-mc-green font-medium'
                  : 'text-gray-600 dark:text-dark-text-secondary hover:bg-gray-50 dark:hover:bg-dark-border/50'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* 服务端 - 可折叠 */}
      <div>
        <button
          onClick={() => setServerCollapsed(!serverCollapsed)}
          className="w-full flex items-center justify-between font-minecraft text-xs text-gray-500 dark:text-dark-text-secondary mb-2 uppercase tracking-wider hover:text-gray-700 dark:hover:text-dark-text transition-colors"
        >
          <span>服务端</span>
          <ChevronRight className={`w-3.5 h-3.5 collapse-arrow ${!serverCollapsed ? 'expanded' : ''}`} />
        </button>
        <div className={`collapsible-content ${!serverCollapsed ? 'expanded' : ''}`}>
          <div>
            <div className="space-y-0.5">
              {serverTypes.map(st => (
                <button
                  key={st.id}
                  onClick={() => onServerChange(st.id)}
                  className={`w-full text-left px-2.5 py-1.5 rounded-md text-xs transition-colors ${
                    selectedServer === st.id
                      ? 'bg-mc-green/10 dark:bg-mc-green/20 text-mc-green font-medium'
                      : 'text-gray-600 dark:text-dark-text-secondary hover:bg-gray-50 dark:hover:bg-dark-border/50'
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 下载量 - 可折叠 */}
      <div>
        <button
          onClick={() => setDownloadsCollapsed(!downloadsCollapsed)}
          className="w-full flex items-center justify-between font-minecraft text-xs text-gray-500 dark:text-dark-text-secondary mb-2 uppercase tracking-wider hover:text-gray-700 dark:hover:text-dark-text transition-colors"
        >
          <span>最低下载量</span>
          <ChevronRight className={`w-3.5 h-3.5 collapse-arrow ${!downloadsCollapsed ? 'expanded' : ''}`} />
        </button>
        <div className={`collapsible-content ${!downloadsCollapsed ? 'expanded' : ''}`}>
          <div>
            <div className="space-y-0.5">
              {downloadFilters.map(df => (
                <button
                  key={df.id}
                  onClick={() => onDownloadsChange(df.id)}
                  className={`w-full text-left px-2.5 py-1.5 rounded-md text-xs transition-colors ${
                    selectedDownloads === df.id
                      ? 'bg-mc-green/10 dark:bg-mc-green/20 text-mc-green font-medium'
                      : 'text-gray-600 dark:text-dark-text-secondary hover:bg-gray-50 dark:hover:bg-dark-border/50'
                  }`}
                >
                  {df.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 排序 - 可折叠 */}
      <div>
        <button
          onClick={() => setSortCollapsed(!sortCollapsed)}
          className="w-full flex items-center justify-between font-minecraft text-xs text-gray-500 dark:text-dark-text-secondary mb-2 uppercase tracking-wider hover:text-gray-700 dark:hover:text-dark-text transition-colors"
        >
          <span>排序方式</span>
          <ChevronRight className={`w-3.5 h-3.5 collapse-arrow ${!sortCollapsed ? 'expanded' : ''}`} />
        </button>
        <div className={`collapsible-content ${!sortCollapsed ? 'expanded' : ''}`}>
          <div>
            <select
              value={selectedSort}
              onChange={(e) => onSortChange(e.target.value as SortOption)}
              className="w-full px-2.5 py-1.5 rounded-md text-xs border border-mc-border dark:border-dark-border bg-white dark:bg-dark-card text-gray-700 dark:text-dark-text focus:outline-none focus:ring-1 focus:ring-mc-green"
            >
              {sortOptions.map(s => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </div>
  )
}
