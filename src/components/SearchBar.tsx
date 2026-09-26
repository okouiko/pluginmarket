import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Search, Sparkles, Loader2, AlertCircle, Send, X, Bot, User, BookOpen, ExternalLink } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useAppStore } from '@/store'
import { isAIAvailable, chatCompletionWithTools, ConcurrencyLimitError, type ToolDefinition } from '@/services/ai'
import { searchAll } from '@/services/search'
import type { ChatMessage, PluginBase } from '@/types'

// 插件文档模块 - 使用 Vite 的 import.meta.glob 动态导入（使用相对路径）
const pluginDocs = import.meta.glob('../assets/docs/plugins/*.md', { query: '?raw', import: 'default' })

// 插件文档列表（文件名和标题）
const pluginDocList = [
  { file: '插件推荐.md', title: '插件推荐指南', description: '包含 EssentialsX、LuckPerms、Vault、WorldEdit、WorldGuard、CoreProtect、Dynmap、AuthMe、CMI 等常用插件' },
  { file: '反作弊.md', title: '反作弊插件指南', description: '包含 NoCheatPlus、Vulcan、Grim、Matrix、Spartan 等反作弊插件' },
]

interface Props {
  onSearch?: (query: string, filters?: SearchFilters) => void
  initialQuery?: string
}

// 搜索过滤器
export interface SearchFilters {
  category?: string
  serverType?: string
  version?: string
  platforms?: string[]
}

// Agent 状态
type AgentState = 'idle' | 'thinking' | 'asking' | 'reading' | 'searching' | 'analyzing' | 'done'

// 搜索步骤状态
interface SearchStep {
  type: 'reading' | 'searching' | 'result'
  content: string
  plugins?: PluginBase[]
}

// 对话消息
interface AgentMessage {
  role: 'user' | 'assistant'
  content: string
  steps?: SearchStep[]
}

// 分类映射
const categoryMap: Record<string, string> = {
  'gameplay': '游戏玩法',
  'admin': '管理工具',
  'chat': '聊天社交',
  'economy': '经济系统',
  'protection': '领地保护',
  'world': '世界生成',
  'teleport': '传送系统',
  'pvp': 'PvP 战斗',
  'minigame': '小游戏',
  'utility': '实用工具',
  'api': 'API/库',
  'cosmetic': '装饰美化',
  'npc': 'NPC 系统',
  'quest': '任务系统',
  'skill': '技能/职业',
}

// 服务端类型
const serverTypes = ['paper', 'spigot', 'bukkit', 'folia', 'velocity', 'bungeecord', 'waterfall', 'fabric', 'forge', 'sponge']

// MC 版本
const mcVersions = ['1.21', '1.20', '1.19', '1.18', '1.17', '1.16', '1.15', '1.14', '1.13', '1.12', '1.8']

export default function SearchBar({ onSearch, initialQuery = '' }: Props) {
  const [query, setQuery] = useState(initialQuery)
  const [aiMode, setAiMode] = useState(false)
  const [agentState, setAgentState] = useState<AgentState>('idle')
  const [messages, setMessages] = useState<AgentMessage[]>([])
  const [userInput, setUserInput] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [showApiKeyWarning, setShowApiKeyWarning] = useState(false)
  const [searchResult, setSearchResult] = useState<{ keywords: string[]; filters: SearchFilters } | null>(null)
  // 实时建议
  const [liveSuggestions, setLiveSuggestions] = useState<PluginBase[]>([])
  const [suggestionsLoading, setSuggestionsLoading] = useState(false)
  const { searchHistory, addSearchHistory } = useAppStore()
  const inputRef = useRef<HTMLInputElement>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  const aiAvailable = isAIAvailable('search') || isAIAvailable('decision')

  // 实时建议 debounce
  const debouncedSuggest = useCallback(
    (() => {
      let timer: ReturnType<typeof setTimeout> | null = null
      let active = true
      return (q: string) => {
        if (timer) clearTimeout(timer)
        if (q.trim().length < 2 || aiMode) {
          setLiveSuggestions([])
          return
        }
        setSuggestionsLoading(true)
        timer = setTimeout(async () => {
          try {
            const results = await searchAll(q.trim(), 1, 5)
            if (active) setLiveSuggestions(results.slice(0, 5))
          } catch {
            if (active) setLiveSuggestions([])
          } finally {
            if (active) setSuggestionsLoading(false)
          }
        }, 250)
      }
    })(),
    [aiMode]
  )

  // 组件卸载时取消
  useEffect(() => () => { (debouncedSuggest as any).active = false }, [debouncedSuggest])

  // 滚动到对话底部（仅在对话框内部滚动，不影响页面）
  useEffect(() => {
    if (chatEndRef.current) {
      const container = chatEndRef.current.parentElement
      if (container) {
        container.scrollTop = container.scrollHeight
      }
    }
  }, [messages])

  const handleSearch = (q?: string, filters?: SearchFilters) => {
    const searchQuery = q || query
    if (!searchQuery.trim()) return
    addSearchHistory(searchQuery.trim())
    setShowSuggestions(false)
    
    // 构建 URL 参数
    const params = new URLSearchParams()
    params.set('q', searchQuery.trim())
    if (filters?.category) params.set('category', filters.category)
    if (filters?.serverType) params.set('server', filters.serverType)
    if (filters?.version) params.set('version', filters.version)
    
    if (onSearch) {
      onSearch(searchQuery.trim(), filters)
    } else {
      navigate(`/browse?${params.toString()}`)
    }
  }

  // 重置 Agent 状态
  const resetAgent = () => {
    setAgentState('idle')
    setMessages([])
    setUserInput('')
    setSearchResult(null)
  }

  // 开始 AI 搜索
  const startAISearch = async () => {
    if (!query.trim() || agentState !== 'idle') return

    // 检查 API Key
    if (!aiAvailable) {
      setShowApiKeyWarning(true)
      return
    }

    setShowApiKeyWarning(false)
    setAgentState('thinking')
    setMessages([{ role: 'user', content: query }])

    await runAgent([{ role: 'user', content: query }])
  }

  // 用户回复
  const handleUserReply = async () => {
    if (!userInput.trim() || agentState !== 'asking') return

    const newMessages: AgentMessage[] = [...messages, { role: 'user', content: userInput }]
    setMessages(newMessages)
    setUserInput('')
    setAgentState('thinking')

    await runAgent(newMessages)
  }

  // 加载插件文档内容
  const loadPluginDoc = async (filename: string): Promise<string> => {
    const key = `/src/assets/docs/plugins/${filename}`
    const loader = pluginDocs[key]
    if (loader) {
      const content = await loader() as string
      return content
    }
    return ''
  }

  // 运行 Agent - 支持多次搜索
  const runAgent = async (conversationHistory: AgentMessage[]) => {
    // 构建文档列表信息
    const docListInfo = pluginDocList.map(d => `- ${d.title}: ${d.description}`).join('\n')
    
    // 如果是第一次对话，尝试加载相关文档
    let docContent = ''
    let loadedDocName = ''
    if (conversationHistory.length === 1) {
      const userQuery = conversationHistory[0].content.toLowerCase()
      
      // 根据用户查询匹配相关文档
      for (const doc of pluginDocList) {
        // 检查用户查询是否与文档相关
        if (
          userQuery.includes('权限') && doc.file === '插件推荐.md' ||
          userQuery.includes('经济') && doc.file === '插件推荐.md' ||
          userQuery.includes('传送') && doc.file === '插件推荐.md' ||
          userQuery.includes('保护') && doc.file === '插件推荐.md' ||
          userQuery.includes('管理') && doc.file === '插件推荐.md' ||
          userQuery.includes('基础') && doc.file === '插件推荐.md' ||
          userQuery.includes('作弊') && doc.file === '反作弊.md' ||
          userQuery.includes('反作弊') && doc.file === '反作弊.md' ||
          userQuery.includes('外挂') && doc.file === '反作弊.md' ||
          userQuery.includes('anticheat') && doc.file === '反作弊.md' ||
          userQuery.includes('cheat') && doc.file === '反作弊.md'
        ) {
          try {
            // 显示正在阅读文档
            loadedDocName = doc.title
            setAgentState('reading')
            setMessages(prev => [...prev, {
              role: 'assistant',
              content: `📖 正在阅读 ${doc.title}...`,
              steps: [{ type: 'reading', content: doc.title }]
            }])
            
            const content = await loadPluginDoc(doc.file)
            // 只取前 3000 字符，避免 token 过多
            docContent = content.slice(0, 3000)
            
            // 短暂延迟让用户看到阅读状态
            await new Promise(resolve => setTimeout(resolve, 800))
            break
          } catch (e) {
            console.error('加载文档失败:', e)
          }
        }
      }
    }

    // 定义 Tool Call 工具
    const tools: ToolDefinition[] = [
      {
        type: 'function',
        function: {
          name: 'search_plugins',
          description: '搜索 Minecraft 插件。必须调用此函数来搜索插件，不能只给文字建议。',
          parameters: {
            type: 'object',
            properties: {
              keywords: {
                type: 'array',
                description: '要搜索的插件名或关键词列表（英文），最多3个',
                items: { type: 'string' }
              },
              category: {
                type: 'string',
                description: '插件分类',
                enum: Object.keys(categoryMap)
              },
              serverType: {
                type: 'string',
                description: '服务端类型',
                enum: serverTypes
              },
              version: {
                type: 'string',
                description: 'Minecraft 版本',
                enum: mcVersions
              }
            },
            required: ['keywords']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'ask_user',
          description: '向用户提问以获取更多信息。只有在需求非常不清晰时才使用。',
          parameters: {
            type: 'object',
            properties: {
              question: {
                type: 'string',
                description: '要问用户的问题'
              }
            },
            required: ['question']
          }
        }
      }
    ]

    const systemPrompt = `你是一个 Minecraft 插件搜索助手。你的任务是帮助用户找到合适的插件。

## 重要规则
- 你必须调用 search_plugins 函数来搜索插件
- 不要只给文字建议，必须执行搜索让用户看到实际的插件
- 只有在需求非常不清晰时才调用 ask_user 提问

## 可用的插件文档
${docListInfo}

${docContent ? `## 相关文档内容（参考）
${docContent}

根据以上文档，找到用户需要的插件名称，使用这些插件名作为搜索关键词。` : ''}

## 搜索建议
- 如果从文档中找到了插件名（如 WorldGuard、LuckPerms、EssentialsX 等），直接搜索这些插件名
- 如果用户说"推荐插件"、"给我几个插件"等，根据上下文搜索相关插件
- keywords 必须是英文插件名或英文关键词
- 可以同时搜索多个关键词（最多3个）`

    try {
      setAgentState('thinking')
      
      // 更新消息显示思考状态
      if (loadedDocName) {
        setMessages(prev => {
          const updated = [...prev]
          updated[updated.length - 1] = {
            role: 'assistant',
            content: `📖 已阅读 ${loadedDocName}\n🤔 正在分析您的需求...`,
            steps: [{ type: 'reading', content: loadedDocName }]
          }
          return updated
        })
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: '🤔 正在分析您的需求...' }])
      }
      
      const chatMessages: ChatMessage[] = [
        { role: 'system', content: systemPrompt },
        ...conversationHistory.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      ]

      console.log('[AI Search] Calling with tools...')
      const result = await chatCompletionWithTools('decision', chatMessages, tools)
      console.log('[AI Search] Result:', result)

      // 处理 tool call 结果
      if (result.toolCalls && result.toolCalls.length > 0) {
        const toolCall = result.toolCalls[0]
        console.log('[AI Search] Tool call:', toolCall)
        
        if (toolCall.name === 'ask_user') {
          // AI 需要追问
          const question = toolCall.arguments.question as string
          setAgentState('asking')
          setMessages(prev => {
            const updated = [...prev]
            updated[updated.length - 1] = { role: 'assistant', content: question }
            return updated
          })
        } else if (toolCall.name === 'search_plugins') {
          // AI 准备搜索
          setAgentState('searching')
          
          const keywords = (toolCall.arguments.keywords as string[]) || []
          const filters: SearchFilters = {
            category: toolCall.arguments.category as string | undefined,
            serverType: toolCall.arguments.serverType as string | undefined,
            version: toolCall.arguments.version as string | undefined,
          }
          
          const allPlugins: PluginBase[] = []
          const steps: SearchStep[] = loadedDocName ? [{ type: 'reading', content: loadedDocName }] : []
          
          // 显示搜索过程
          for (const keyword of keywords.slice(0, 3)) {
            steps.push({ type: 'searching', content: keyword })
            
            setMessages(prev => {
              const updated = [...prev]
              const stepTexts = steps.map(s => {
                if (s.type === 'reading') return `📖 已阅读 ${s.content}`
                if (s.type === 'searching') return `🔍 正在搜索 ${s.content}...`
                return ''
              }).filter(Boolean)
              updated[updated.length - 1] = {
                role: 'assistant',
                content: stepTexts.join('\n'),
                steps
              }
              return updated
            })
            
            // 执行搜索
            try {
              const results = await searchAll(keyword, 1, 5)
              allPlugins.push(...results)
              
              // 更新步骤状态
              steps[steps.length - 1] = {
                type: 'searching',
                content: `${keyword} (找到 ${results.length} 个结果)`
              }
            } catch (e) {
              console.error('搜索失败:', e)
            }
            
            // 短暂延迟让用户看到搜索过程
            await new Promise(resolve => setTimeout(resolve, 500))
          }
          
          // 去重并排序
          const uniquePlugins = allPlugins.reduce((acc, plugin) => {
            if (!acc.find(p => p.id === plugin.id)) {
              acc.push(plugin)
            }
            return acc
          }, [] as PluginBase[])
          
          // 按下载量排序，取前 6 个
          const topPlugins = uniquePlugins
            .sort((a, b) => b.downloads - a.downloads)
            .slice(0, 6)
          
          // 显示最终结果
          setAgentState('done')
          steps.push({ type: 'result', content: '推荐结果', plugins: topPlugins })
          
          const stepTexts = steps.map(s => {
            if (s.type === 'reading') return `📖 已阅读 ${s.content}`
            if (s.type === 'searching') return `🔍 已搜索 ${s.content}`
            return ''
          }).filter(Boolean)
          
          setMessages(prev => {
            const updated = [...prev]
            updated[updated.length - 1] = {
              role: 'assistant',
              content: stepTexts.join('\n') + '\n\n🎯 我为您推荐以下插件：',
              steps
            }
            return updated
          })
          
          setSearchResult({
            keywords,
            filters,
          })
        }
      } else if (result.content) {
        // AI 返回了文本内容而不是 tool call，显示它
        setAgentState('asking')
        setMessages(prev => {
          const updated = [...prev]
          updated[updated.length - 1] = { role: 'assistant', content: result.content || '请告诉我您需要什么类型的插件？' }
          return updated
        })
      } else {
        // 没有任何响应
        setAgentState('asking')
        setMessages(prev => {
          const updated = [...prev]
          updated[updated.length - 1] = { role: 'assistant', content: '请告诉我您需要什么类型的插件？' }
          return updated
        })
      }
    } catch (err) {
      console.error('[AI Search] Error:', err)
      if (err instanceof ConcurrencyLimitError) {
        setMessages(prev => [...prev, { role: 'assistant', content: `⚠️ ${err.message}` }])
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: '❌ AI 搜索出错，请检查 API Key 设置' }])
      }
      setAgentState('idle')
    }
  }

  return (
    <div className="relative z-30">
      <div className="flex items-center gap-2">
        <div className="flex-1 relative search-input-wrapper rounded-xl border border-mc-border dark:border-dark-border bg-white dark:bg-dark-card">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              const v = e.target.value
              setQuery(v)
              if (!aiMode) debouncedSuggest(v)
            }}
            onFocus={() => !aiMode && setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                if (aiMode) startAISearch()
                else handleSearch()
              }
            }}
            placeholder={aiMode ? '用自然语言描述你需要的插件...' : '搜索 Minecraft 插件...'}
            className="w-full px-4 py-2.5 pl-10 rounded-xl bg-transparent text-gray-800 dark:text-dark-text placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none text-sm"
            disabled={agentState !== 'idle'}
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-600 transition-colors" />
        </div>

        {/* AI toggle */}
        <button
          onClick={() => {
            if (agentState !== 'idle') {
              resetAgent()
            }
            setAiMode(!aiMode)
            setShowApiKeyWarning(false)
          }}
          className={`px-3 py-2.5 rounded-xl border text-sm flex items-center gap-1.5 transition-all ${
            aiMode
              ? 'bg-mc-green text-white border-mc-green'
              : 'bg-white dark:bg-dark-card border-mc-border dark:border-dark-border text-gray-500 dark:text-dark-text-secondary hover:border-mc-green'
          }`}
          title="AI 智能搜索"
        >
          <Sparkles className="w-4 h-4" />
          <span className="hidden sm:inline">AI</span>
        </button>

        <button
          onClick={() => aiMode ? startAISearch() : handleSearch()}
          disabled={agentState !== 'idle'}
          className="px-4 py-2.5 rounded-xl bg-mc-green text-white text-sm hover:bg-mc-green-dark transition-colors disabled:opacity-50 flex items-center gap-1.5"
        >
          {agentState === 'thinking' || agentState === 'searching' ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Search className="w-4 h-4" />
          )}
          搜索
        </button>
      </div>

      {/* API Key Warning */}
      {showApiKeyWarning && (
        <div className="mt-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg flex items-start gap-2 animate-fade-in">
          <AlertCircle className="w-4 h-4 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-yellow-700 dark:text-yellow-300">
            <p className="font-medium mb-1">需要配置 API Key</p>
            <p>AI 搜索功能需要先在 <a href="#/settings" className="underline font-medium hover:text-yellow-900 dark:hover:text-yellow-100">设置页面</a> 中填写 API Key。</p>
            <p className="mt-1 text-yellow-600 dark:text-yellow-400">
              没有 API Key？前往 <a href="https://open.bigmodel.cn/" target="_blank" rel="noopener" className="underline">智谱开放平台</a> 免费获取。
            </p>
          </div>
        </div>
      )}

      {/* AI Agent 对话界面 */}
      {aiMode && messages.length > 0 && (
        <div className="mt-2 bg-white dark:bg-dark-card border border-mc-border dark:border-dark-border rounded-xl overflow-hidden animate-fade-in">
          {/* 对话头部 */}
          <div className="px-3 py-2 bg-mc-green/5 dark:bg-mc-green/10 border-b border-mc-border dark:border-dark-border flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-dark-text-secondary">
              <Bot className="w-4 h-4 text-mc-green" />
              <span>AI 搜索助手</span>
              {agentState === 'thinking' && <Loader2 className="w-3 h-3 animate-spin text-mc-green" />}
            </div>
            <button
              onClick={resetAgent}
              className="p-1 hover:bg-gray-100 dark:hover:bg-dark-border rounded transition-colors"
              title="关闭"
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>
          </div>
          
          {/* 对话内容 */}
          <div className="max-h-96 overflow-y-auto p-3 space-y-3">
            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'assistant' && (
                  <div className="w-6 h-6 rounded-full bg-mc-green/10 flex items-center justify-center flex-shrink-0">
                    <Bot className="w-3.5 h-3.5 text-mc-green" />
                  </div>
                )}
                <div className={`max-w-[85%] px-3 py-2 rounded-xl text-sm ${
                  msg.role === 'user'
                    ? 'bg-mc-green text-white rounded-br-sm'
                    : 'bg-gray-100 dark:bg-dark-border text-gray-800 dark:text-dark-text rounded-bl-sm'
                }`}>
                  {msg.role === 'assistant' ? (
                    <div className="space-y-2">
                      {/* 显示搜索步骤 */}
                      {msg.steps && msg.steps.length > 0 && (
                        <div className="space-y-1.5">
                          {msg.steps.map((step, stepIdx) => (
                            <div key={stepIdx}>
                              {step.type === 'reading' && (
                                <div className="flex items-center gap-2 text-mc-green">
                                  <BookOpen className="w-3.5 h-3.5" />
                                  <span>正在阅读 {step.content}</span>
                                  {agentState === 'reading' && stepIdx === msg.steps!.length - 1 && (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                  )}
                                </div>
                              )}
                              {step.type === 'searching' && (
                                <div className="flex items-center gap-2 text-blue-500">
                                  <Search className="w-3.5 h-3.5" />
                                  <span>正在搜索 {step.content}</span>
                                  {agentState === 'searching' && stepIdx === msg.steps!.length - 1 && !step.content.includes('找到') && (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                  )}
                                </div>
                              )}
                              {step.type === 'result' && step.plugins && step.plugins.length > 0 && (
                                <div className="mt-2">
                                  <div className="text-gray-700 dark:text-dark-text text-xs font-medium mb-1.5">
                                    🎯 推荐插件：
                                  </div>
                                  <div className="grid grid-cols-2 gap-1.5">
                                    {step.plugins.slice(0, 6).map((plugin, pluginIdx) => (
                                      <Link
                                        key={pluginIdx}
                                        to={`/plugin/${plugin.platform}/${plugin.platformId}`}
                                        className="flex items-center gap-2 p-1.5 bg-white dark:bg-dark-bg rounded-md border border-mc-border dark:border-dark-border hover:border-mc-green transition-colors"
                                      >
                                        {plugin.icon ? (
                                          <img src={plugin.icon} alt={plugin.name} className="w-7 h-7 rounded object-cover flex-shrink-0" />
                                        ) : (
                                          <div className="w-7 h-7 rounded bg-mc-green/10 flex items-center justify-center flex-shrink-0">
                                            <span className="text-mc-green font-bold text-sm">{plugin.name[0]}</span>
                                          </div>
                                        )}
                                        <div className="flex-1 min-w-0">
                                          <div className="text-xs font-medium text-gray-800 dark:text-dark-text truncate">{plugin.name}</div>
                                          <div className="text-[10px] text-gray-400 dark:text-dark-text-secondary">
                                            {plugin.downloads >= 1000 ? `${(plugin.downloads / 1000).toFixed(1)}K` : plugin.downloads} 下载
                                          </div>
                                        </div>
                                      </Link>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                      {/* 显示普通消息内容 */}
                      {!msg.steps && (
                        <div className="chat-markdown prose prose-sm max-w-none dark:prose-invert">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {msg.content || '思考中...'}
                          </ReactMarkdown>
                        </div>
                      )}
                      {/* 如果有步骤但没有结果插件，显示文本内容 */}
                      {msg.steps && !msg.steps.find(s => s.type === 'result') && msg.content && !msg.content.startsWith('📖') && !msg.content.startsWith('🔍') && (
                        <div className="chat-markdown prose prose-sm max-w-none dark:prose-invert mt-2">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {msg.content}
                          </ReactMarkdown>
                        </div>
                      )}
                    </div>
                  ) : (
                    msg.content
                  )}
                </div>
                {msg.role === 'user' && (
                  <div className="w-6 h-6 rounded-full bg-mc-green flex items-center justify-center flex-shrink-0">
                    <User className="w-3.5 h-3.5 text-white" />
                  </div>
                )}
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
          
          {/* 用户输入框（仅在 asking 状态显示） */}
          {agentState === 'asking' && (
            <div className="p-3 border-t border-mc-border dark:border-dark-border">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleUserReply()}
                  placeholder="输入你的回复..."
                  className="flex-1 px-3 py-2 rounded-lg border border-mc-border dark:border-dark-border bg-white dark:bg-dark-bg text-sm text-gray-800 dark:text-dark-text focus:outline-none focus:ring-1 focus:ring-mc-green"
                  autoFocus
                />
                <button
                  onClick={handleUserReply}
                  disabled={!userInput.trim()}
                  className="px-3 py-2 bg-mc-green text-white rounded-lg hover:bg-mc-green-dark transition-colors disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
          
          {/* 搜索中/阅读中状态 */}
          {(agentState === 'searching' || agentState === 'reading' || agentState === 'analyzing') && (
            <div className="p-3 border-t border-mc-border dark:border-dark-border flex items-center justify-center gap-2 text-sm text-gray-500 dark:text-dark-text-secondary">
              <Loader2 className="w-4 h-4 animate-spin text-mc-green" />
              <span>
                {agentState === 'reading' && 'AI 正在阅读文档...'}
                {agentState === 'searching' && 'AI 正在搜索插件...'}
                {agentState === 'analyzing' && 'AI 正在分析结果...'}
              </span>
            </div>
          )}
          
          {/* 完成状态 - 显示查看更多按钮 */}
          {agentState === 'done' && searchResult && (
            <div className="p-3 border-t border-mc-border dark:border-dark-border flex items-center justify-between">
              <span className="text-xs text-gray-500 dark:text-dark-text-secondary">
                搜索完成，共搜索了 {searchResult.keywords.length} 个关键词
              </span>
              <button
                onClick={() => {
                  const searchQuery = searchResult.keywords.join(' ')
                  handleSearch(searchQuery, searchResult.filters)
                }}
                className="text-xs text-mc-green hover:text-mc-green-dark flex items-center gap-1"
              >
                <span>查看更多结果</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Suggestions dropdown */}
      {showSuggestions && !aiMode && (liveSuggestions.length > 0 || suggestionsLoading || searchHistory.length > 0) && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-dark-card border border-mc-border dark:border-dark-border rounded-xl shadow-lg z-50 overflow-hidden dropdown-animate max-h-[360px] overflow-y-auto">
          {/* Loading */}
          {suggestionsLoading && (
            <div className="px-3 py-3 text-center text-xs text-gray-400 flex items-center justify-center gap-2">
              <Loader2 className="w-3 h-3 animate-spin" /> 搜索中...
            </div>
          )}

          {/* Live suggestions (跨平台实时搜索结果) */}
          {!suggestionsLoading && liveSuggestions.length > 0 && (
            <>
              <div className="px-3 py-1.5 text-xs text-mc-green font-medium border-b border-mc-border dark:border-dark-border">
                实时建议
              </div>
              {liveSuggestions.map((p, i) => (
                <button
                  key={`live-${i}`}
                  onClick={() => handleSearch(p.name)}
                  className="w-full px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-dark-border/50 flex items-center gap-2 border-b border-gray-50 dark:border-dark-border/50 last:border-b-0"
                >
                  {p.icon ? (
                    <img src={p.icon} alt="" className="w-6 h-6 rounded object-cover flex-shrink-0" onError={(e) => (e.currentTarget.style.display = 'none')} />
                  ) : (
                    <div className="w-6 h-6 rounded bg-mc-green/10 flex items-center justify-center flex-shrink-0 text-[10px] text-mc-green font-bold">
                      {p.name[0]?.toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-gray-800 dark:text-dark-text truncate font-medium">{p.name}</div>
                    <div className="text-[11px] text-gray-500 dark:text-dark-text-secondary truncate">{p.tag}</div>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-dark-border text-gray-500 dark:text-dark-text-secondary flex-shrink-0">
                    {p.platform === 'spigot' ? 'Spigot' : p.platform === 'hangar' ? 'Hangar' : 'Modrinth'}
                  </span>
                </button>
              ))}
            </>
          )}

          {/* Search history (仅在无实时建议时或有 query 时显示) */}
          {searchHistory.length > 0 && (
            <>
              <div className="px-3 py-1.5 text-xs text-gray-400 border-b border-mc-border dark:border-dark-border">
                搜索历史
              </div>
              {searchHistory.slice(0, 5).map((h, i) => (
                <button
                  key={`hist-${i}`}
                  onClick={() => { setQuery(h); handleSearch(h) }}
                  className="w-full px-3 py-1.5 text-left text-sm text-gray-700 dark:text-dark-text hover:bg-gray-50 dark:hover:bg-dark-border/50 flex items-center gap-2"
                >
                  <Search className="w-3 h-3 text-gray-400 dark:text-gray-600" />
                  {h}
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  )
}
