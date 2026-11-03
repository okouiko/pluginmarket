import { useState, useEffect, useCallback, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Loader2, TrendingUp, Sparkles, ChevronDown, Filter, RefreshCw, Languages, AlertCircle } from 'lucide-react'
import SearchBar from '@/components/SearchBar'
import PlatformToggle from '@/components/PlatformToggle'
import PluginCard from '@/components/PluginCard'
import FilterPanel from '@/components/FilterPanel'
import { useAppStore } from '@/store'
import { searchAll, getPlatformName } from '@/services/search'
import { applyPluginFilters, type SortOption } from '@/services/filters'
import { getSpigetPopularResources } from '@/services/spiget'
import { getHangarPopular } from '@/services/hangar'
import { getModrinthPopular } from '@/services/modrinth'
import { isAIAvailable, translatePluginInfos, type PluginTranslation } from '@/services/ai'
import type { PluginBase, Platform, SearchFilters } from '@/types'

export default function MainPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const query = searchParams.get('q') || ''
  const enabledPlatforms = useAppStore(s => s.enabledPlatforms)
  
  // 搜索模式：false = 首页热门，true = 搜索结果
  const [isSearchMode, setIsSearchMode] = useState(!!query)
  const [plugins, setPlugins] = useState<PluginBase[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  
  // 筛选状态
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || 'all')
  const [selectedServer, setSelectedServer] = useState(searchParams.get('server') || 'all')
  const [selectedVersion, setSelectedVersion] = useState(searchParams.get('version') || '')
  const [selectedSort, setSelectedSort] = useState<SortOption>('popular')
  const [selectedDownloads, setSelectedDownloads] = useState('all')
  const [failedPlatforms, setFailedPlatforms] = useState<Platform[]>([])
  const [sidebarOpen, setSidebarOpen] = useState(false)
  
  // AI 翻译（translationsRef 作为缓存，避免重复调用 AI）
  const [translations, setTranslations] = useState<Map<string, PluginTranslation>>(new Map())
  const translationsRef = useRef<Map<string, PluginTranslation>>(new Map())
  const [translating, setTranslating] = useState(false)
  const [translateEnabled, setTranslateEnabled] = useState(false)
  
  // 随机刷新
  const [randomPage, setRandomPage] = useState(1)
  const [refreshing, setRefreshing] = useState(false)

  // 已加载的搜索词与热门参数指纹，避免重复请求（含 StrictMode 的重复 effect）
  const loadedQueryRef = useRef<string | null>(null)
  const popularKeyRef = useRef<string | null>(null)

  // 记录平台失败，避免静默吞错
  const markPlatformError = useCallback((platform: Platform, error: unknown) => {
    console.warn(`加载 ${getPlatformName(platform)} 失败`, error)
    setFailedPlatforms(prev => prev.includes(platform) ? prev : [...prev, platform])
  }, [])

  // 加载热门插件
  const loadPopular = useCallback(async () => {
    setLoading(true)
    setFailedPlatforms([])
    try {
      const results: PluginBase[] = []
      const promises: Promise<void>[] = []
      const p = randomPage

      if (enabledPlatforms.includes('spigot')) {
        promises.push(
          getSpigetPopularResources(p, 10)
            .then(r => { results.push(...r) })
            .catch(error => markPlatformError('spigot', error)),
        )
      }
      if (enabledPlatforms.includes('hangar')) {
        promises.push(
          getHangarPopular(p - 1, 10)
            .then(r => { results.push(...r) })
            .catch(error => markPlatformError('hangar', error)),
        )
      }
      if (enabledPlatforms.includes('modrinth')) {
        promises.push(
          getModrinthPopular(p - 1, 10)
            .then(r => { results.push(...r) })
            .catch(error => markPlatformError('modrinth', error)),
        )
      }

      await Promise.all(promises)
      results.sort((a, b) => b.downloads - a.downloads)
      setPlugins(results)
      
      if (translateEnabled && isAIAvailable('translate')) {
        translatePlugins(results)
      }
    } catch (err) {
      console.error('加载热门插件失败:', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [enabledPlatforms, randomPage, translateEnabled, markPlatformError])

  // 搜索插件
  async function doSearch(q: string, p = 1) {
    setLoading(true)
    setFailedPlatforms([])
    try {
      const results = await searchAll(q, p, 12, { onError: markPlatformError })
      if (p === 1) setPlugins(results)
      else setPlugins(prev => [...prev, ...results])
      setPage(p)
    } catch (err) {
      console.error('搜索失败:', err)
    } finally {
      setLoading(false)
    }
  }

  // 处理搜索
  const handleSearch = (q: string, filters?: SearchFilters) => {
    if (!q.trim()) {
      setSearchParams({})
      setIsSearchMode(false)
      return
    }

    const category = filters?.category ?? selectedCategory
    const server = filters?.serverType ?? selectedServer
    const version = filters?.version ?? selectedVersion

    setSelectedCategory(category)
    setSelectedServer(server)
    setSelectedVersion(version)

    const params = new URLSearchParams({ q })
    if (category !== 'all') params.set('category', category)
    if (server !== 'all') params.set('server', server)
    if (version) params.set('version', version)

    setSearchParams(params)
    setIsSearchMode(true)
    setPlugins([])
    // 记录本次搜索词，避免 query effect 重复发起同一请求
    loadedQueryRef.current = q
    doSearch(q, 1)
  }

  // 随机刷新
  function handleRandomRefresh() {
    setRefreshing(true)
    setRandomPage(Math.floor(Math.random() * 10) + 1)
  }

  // 翻译插件（只请求尚未翻译的条目）
  async function translatePlugins(pluginsToTranslate: PluginBase[]) {
    if (!isAIAvailable('translate') || translating) return
    setTranslating(true)
    try {
      const pending = pluginsToTranslate.filter(p => !translationsRef.current.has(p.id))
      if (pending.length === 0) return

      const pluginInfos = pending.map(p => ({ id: p.id, name: p.name, tag: p.tag }))
      const newTranslations = await translatePluginInfos(pluginInfos)
      newTranslations.forEach((v, k) => translationsRef.current.set(k, v))
      setTranslations(new Map(translationsRef.current))
    } catch (err) {
      console.error('翻译失败:', err)
    } finally {
      setTranslating(false)
    }
  }

  function toggleTranslate() {
    if (!translateEnabled) {
      setTranslateEnabled(true)
      if (plugins.length > 0 && isAIAvailable('translate')) {
        translatePlugins(plugins)
      }
    } else {
      setTranslateEnabled(false)
    }
  }

  function getDisplayInfo(plugin: PluginBase) {
    if (translateEnabled && translations.has(plugin.id)) {
      const t = translations.get(plugin.id)!
      return { displayName: `${plugin.name} — ${t.translatedName}`, displayTag: t.translatedTag }
    }
    return { displayName: plugin.name, displayTag: plugin.tag }
  }

  // 过滤与排序插件
  const minDownloads = selectedDownloads === 'all' ? undefined : parseInt(selectedDownloads, 10)
  const filteredPlugins = applyPluginFilters(plugins, {
    category: selectedCategory,
    serverType: selectedServer,
    version: selectedVersion,
    sortBy: selectedSort,
    minDownloads,
  })

  // 同步 URL 中的筛选参数（SearchBar AI 搜索会写入 category/server/version）
  useEffect(() => {
    setSelectedCategory(searchParams.get('category') || 'all')
    setSelectedServer(searchParams.get('server') || 'all')
    setSelectedVersion(searchParams.get('version') || '')
  }, [searchParams])

  // 搜索词 / 平台开关 / 换一批统一在一个 effect 内处理，参数指纹去重
  useEffect(() => {
    if (query) {
      setIsSearchMode(true)
      popularKeyRef.current = null
      if (loadedQueryRef.current !== query) {
        loadedQueryRef.current = query
        doSearch(query)
      }
      return
    }

    loadedQueryRef.current = null
    setIsSearchMode(false)
    const key = `${enabledPlatforms.join(',')}|${randomPage}`
    if (popularKeyRef.current !== key) {
      popularKeyRef.current = key
      loadPopular()
    }
  }, [query, enabledPlatforms, randomPage])

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Hero 区域 - 搜索模式时收起，使用 grid 实现平滑高度动画 */}
      <div
        className={`grid transition-all duration-700 ease-[cubic-bezier(0.4,0,0.2,1)] ${
          isSearchMode ? 'grid-rows-[0fr] opacity-0' : 'grid-rows-[1fr] opacity-100'
        }`}
      >
        <div className="overflow-hidden">
          <div className={`text-center pb-8 transition-transform duration-700 ease-[cubic-bezier(0.4,0,0.2,1)] ${
            isSearchMode ? '-translate-y-4' : 'translate-y-0'
          }`}>
            <h1 className="font-minecraft text-3xl md:text-4xl text-gray-800 dark:text-dark-text mb-3">
              MC 插件市场
            </h1>
            <p className="text-gray-500 dark:text-dark-text-secondary text-sm">
              聚合 Spigot · Hangar · Modrinth 三大平台，一站搜索 Minecraft 插件
            </p>
          </div>
        </div>
      </div>

      {/* 搜索框区域 - 平滑位置和宽度过渡 */}
      <div
        className={`transition-all duration-700 ease-[cubic-bezier(0.4,0,0.2,1)] relative z-20 ${
          isSearchMode
            ? 'max-w-full mb-6 transform-gpu'
            : 'max-w-2xl mx-auto mb-4 transform-gpu'
        }`}
        style={{
          transitionProperty: 'max-width, margin, margin-bottom, transform',
        }}
      >
        <SearchBar onSearch={handleSearch} initialQuery={query} />
      </div>

      {/* 平台切换 - 平滑过渡 */}
      <div
        className={`transition-all duration-700 ease-[cubic-bezier(0.4,0,0.2,1)] ${
          isSearchMode ? 'mb-4' : 'flex justify-center mb-8'
        }`}
      >
        <PlatformToggle />
      </div>

      {/* 移动端筛选按钮 */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="md:hidden flex items-center gap-2 mb-4 px-4 py-2 bg-white dark:bg-dark-card border border-mc-border dark:border-dark-border rounded-lg text-sm text-gray-700 dark:text-dark-text"
      >
        <Filter className="w-4 h-4" />
        筛选条件
        <ChevronDown className={`w-4 h-4 transition-transform ${sidebarOpen ? 'rotate-180' : ''}`} />
      </button>

      <div className="flex gap-6">
        {/* 侧边栏 - 平滑滑入 */}
        <aside
          className={`${sidebarOpen ? 'block' : 'hidden'} md:block w-full md:w-56 flex-shrink-0 transition-all duration-500 ${
            isSearchMode ? 'opacity-100 translate-x-0' : 'md:opacity-0 md:-translate-x-4 md:pointer-events-none md:absolute'
          }`}
          style={{ transitionDelay: isSearchMode ? '200ms' : '0ms' }}
        >
          <FilterPanel
            selectedCategory={selectedCategory}
            selectedServer={selectedServer}
            selectedDownloads={selectedDownloads}
            selectedSort={selectedSort}
            onCategoryChange={setSelectedCategory}
            onServerChange={setSelectedServer}
            onDownloadsChange={setSelectedDownloads}
            onSortChange={setSelectedSort}
          />
        </aside>

        {/* 主内容区域 */}
        <div
          className={`flex-1 min-w-0 transition-all duration-500 ease-out ${
            isSearchMode ? '' : 'md:w-full'
          }`}
        >
          {/* 标题栏 */}
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-mc-green" />
              <h2 className="font-minecraft text-lg text-gray-800 dark:text-dark-text">
                {isSearchMode ? `搜索 "${query}" 的结果` : '热门插件'}
              </h2>
              <span className="text-xs text-gray-400 dark:text-dark-text-secondary">
                {filteredPlugins.length} 个结果
              </span>
            </div>
            
            {/* 操作按钮 */}
            <div className="flex items-center gap-2">
              {isAIAvailable('translate') ? (
                <button
                  onClick={toggleTranslate}
                  disabled={translating}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-colors btn-press ${
                    translateEnabled
                      ? 'bg-mc-green text-white'
                      : 'bg-white dark:bg-dark-card border border-mc-border dark:border-dark-border text-gray-600 dark:text-dark-text-secondary hover:bg-gray-50 dark:hover:bg-dark-border'
                  }`}
                >
                  {translating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Languages className="w-3.5 h-3.5" />}
                  AI 翻译
                </button>
              ) : (
                <button
                  disabled
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-gray-100 dark:bg-dark-border text-gray-400 dark:text-dark-text-secondary cursor-not-allowed"
                  title="需要配置 API Key"
                >
                  <AlertCircle className="w-3.5 h-3.5" />
                  AI 翻译
                </button>
              )}
              
              {!isSearchMode && (
                <button
                  onClick={handleRandomRefresh}
                  disabled={refreshing || loading}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-white dark:bg-dark-card border border-mc-border dark:border-dark-border text-gray-600 dark:text-dark-text-secondary hover:bg-gray-50 dark:hover:bg-dark-border transition-colors disabled:opacity-50 btn-press"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                  换一批
                </button>
              )}
            </div>
          </div>

          {/* 平台加载失败提示 */}
          {failedPlatforms.length > 0 && (
            <div className="mb-4 flex items-start gap-2 p-3 rounded-lg border border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20 text-xs text-yellow-700 dark:text-yellow-300">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>
                以下平台加载失败：{failedPlatforms.map(getPlatformName).join('、')}。其余平台结果仍可正常查看。
              </span>
            </div>
          )}

          {/* 插件列表 */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-mc-green loading-pulse" />
              <span className="ml-3 text-gray-500 dark:text-dark-text-secondary">
                {isSearchMode ? '搜索中...' : '加载中...'}
              </span>
            </div>
          ) : filteredPlugins.length === 0 ? (
            <div className="text-center py-20 text-gray-400 dark:text-dark-text-secondary">
              <Sparkles className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>{isSearchMode ? '未找到相关插件，试试其他关键词' : '暂无插件数据'}</p>
              <p className="text-xs mt-1">{isSearchMode ? '' : '请检查平台开关或网络连接'}</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredPlugins.map((plugin, index) => {
                  const { displayName, displayTag } = getDisplayInfo(plugin)
                  return (
                    <div
                      key={plugin.id}
                      className="stagger-item"
                      style={{ animationDelay: `${Math.min(index * 50, 400)}ms` }}
                    >
                      <PluginCard
                        plugin={{
                          ...plugin,
                          name: displayName,
                          tag: displayTag,
                        }}
                        favoritePlugin={plugin}
                      />
                    </div>
                  )
                })}
              </div>

              {/* 加载更多按钮 - 仅搜索模式 */}
              {isSearchMode && plugins.length >= page * 12 && (
                <div className="text-center mt-6">
                  <button
                    onClick={() => doSearch(query, page + 1)}
                    disabled={loading}
                    className="px-6 py-2 bg-white dark:bg-dark-card border border-mc-border dark:border-dark-border rounded-lg text-sm text-gray-700 dark:text-dark-text hover:bg-gray-50 dark:hover:bg-dark-border transition-colors disabled:opacity-50 btn-press"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin inline mr-1" /> : null}
                    加载更多
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
