import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { Search, Sparkles, X, Loader2, FileText, ChevronRight } from 'lucide-react'
import { chatCompletionWithTools, isAIAvailable, type ToolDefinition } from '@/services/ai'
import ReactMarkdown from 'react-markdown'
import { DOC_INDEX_TEXT, resolveDocEntry } from '@/data/docs'

// 生成标题的 slug（与 DocsPage 中保持一致）
function generateHeadingSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\u4e00-\u9fa5\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
}

// 清理 Markdown 标记符号，只保留纯文本
function stripMarkdown(text: string): string {
  return text
    // 移除代码块
    .replace(/```[\s\S]*?```/g, '')
    // 移除行内代码
    .replace(/`([^`]+)`/g, '$1')
    // 移除图片 ![alt](url)
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
    // 移除链接 [text](url)，保留 text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // 移除标题标记 #
    .replace(/^#{1,6}\s+/gm, '')
    // 移除粗体 **text** 或 __text__
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    // 移除斜体 *text* 或 _text_
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    // 移除删除线 ~~text~~
    .replace(/~~([^~]+)~~/g, '$1')
    // 移除引用标记 >
    .replace(/^>\s*/gm, '')
    // 移除无序列表标记 - 或 *
    .replace(/^[\s]*[-*+]\s+/gm, '')
    // 移除有序列表标记 1.
    .replace(/^[\s]*\d+\.\s+/gm, '')
    // 移除表格分隔符行 |---|---|
    .replace(/^\|[-:\s|]+\|$/gm, '')
    // 移除表格单元格的 | 符号，保留内容
    .replace(/\|/g, ' ')
    // 移除 HTML 标签
    .replace(/<[^>]+>/g, '')
    // 移除多余空白
    .replace(/\s+/g, ' ')
    .trim()
}

// search_docs 工具定义
const SEARCH_DOCS_TOOL: ToolDefinition = {
  type: 'function',
  function: {
    name: 'search_docs',
    description: '根据用户问题搜索相关文档',
    parameters: {
      type: 'object',
      properties: {
        results: {
          type: 'array',
          description: '相关文档列表，按相关度排序，最多5个',
          items: {
            type: 'object',
            properties: {
              doc_path: { type: 'string', description: '文档路径，如 core/paper.md' },
              relevance: { type: 'string', description: '相关原因简述' }
            }
          }
        },
        summary: {
          type: 'string',
          description: '对用户问题的简短回答（1-2句话）'
        }
      },
      required: ['results', 'summary']
    }
  }
}

// 搜索结果接口
interface SearchResult {
  id: string
  title: string
  path: string[]
  snippet: string
  score: number
}

// AI 搜索结果接口
interface AISearchResult {
  answer: string
  recommendedDocs: { id: string; title: string; reason: string }[]
}

interface DocsSearchProps {
  onSelectDoc: (docId: string) => void
  getAllDocs: () => { id: string; title: string; content: string; path: string[] }[]
  onScrollToHeading?: (headingId: string) => void
}

// 防抖 hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

export function DocsSearch({ onSelectDoc, getAllDocs, onScrollToHeading }: DocsSearchProps) {
  const [query, setQuery] = useState('')
  const [isAIMode, setIsAIMode] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [aiResult, setAIResult] = useState<AISearchResult | null>(null)
  const [showResults, setShowResults] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const searchRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  
  const debouncedQuery = useDebounce(query, 300)

  // 检查 AI 是否已配置（使用 'search' 角色）
  const isAIConfigured = useMemo(() => {
    return isAIAvailable('search')
  }, [])

  // 普通搜索逻辑
  const performNormalSearch = useCallback((searchQuery: string) => {
    if (!searchQuery.trim()) {
      setSearchResults([])
      return
    }

    const allDocs = getAllDocs()
    const queryLower = searchQuery.toLowerCase()
    const results: SearchResult[] = []

    for (const doc of allDocs) {
      const titleMatch = doc.title.toLowerCase().includes(queryLower)
      const contentLower = doc.content.toLowerCase()
      const contentMatch = contentLower.includes(queryLower)

      if (titleMatch || contentMatch) {
        let snippet = ''
        let score = 0

        if (titleMatch) {
          score += 10
        }

        if (contentMatch) {
          const index = contentLower.indexOf(queryLower)
          const start = Math.max(0, index - 50)
          const end = Math.min(doc.content.length, index + queryLower.length + 100)
          const rawSnippet = doc.content.slice(start, end).replace(/\n/g, ' ')
          snippet = (start > 0 ? '...' : '') +
                   stripMarkdown(rawSnippet) +
                   (end < doc.content.length ? '...' : '')
          score += 5
          
          // 计算匹配次数
          const matches = (contentLower.match(new RegExp(queryLower, 'g')) || []).length
          score += matches
        }

        results.push({
          id: doc.id,
          title: doc.title,
          path: doc.path,
          snippet,
          score
        })
      }
    }

    // 按分数排序
    results.sort((a, b) => b.score - a.score)
    setSearchResults(results.slice(0, 10))
  }, [getAllDocs])

  // AI 搜索逻辑（使用 tool_call）
  const performAISearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim() || !isAIConfigured) return

    setIsSearching(true)
    setError(null)
    setAIResult(null)

    try {
      // 使用统一的文档索引，而不是完整文档列表
      const prompt = `你是一个 Minecraft 服务器文档助手。用户正在搜索相关文档。

${DOC_INDEX_TEXT}

用户问题：${searchQuery}

请调用 search_docs 工具，返回最相关的文档（最多5个）和简短回答。`

      const result = await chatCompletionWithTools(
        'search',
        [{ role: 'user', content: prompt }],
        [SEARCH_DOCS_TOOL],
        { toolChoice: { type: 'function', function: { name: 'search_docs' } } }
      )

      // 解析 tool_call 结果
      if (result.toolCalls && result.toolCalls.length > 0) {
        const toolResult = result.toolCalls[0].arguments as {
          results?: { doc_path: string; relevance: string }[]
          summary?: string
        }
        
        // 通过统一目录解析文档路径
        const recommendedDocs = (toolResult.results || []).map(rec => {
          const entry = resolveDocEntry(rec.doc_path)
          if (!entry) return null
          return {
            id: entry.id,
            title: entry.title,
            reason: rec.relevance
          }
        }).filter((doc): doc is { id: string; title: string; reason: string } => !!doc)

        setAIResult({
          answer: toolResult.summary || '请查看推荐的文档',
          recommendedDocs
        })
      } else {
        setError('AI 未返回有效结果')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'AI 搜索失败')
    } finally {
      setIsSearching(false)
    }
  }, [isAIConfigured])

  // 监听防抖后的查询变化（普通搜索）
  useEffect(() => {
    if (!isAIMode && debouncedQuery) {
      performNormalSearch(debouncedQuery)
      setShowResults(true)
    } else if (!debouncedQuery) {
      setSearchResults([])
      setShowResults(false)
    }
  }, [debouncedQuery, isAIMode, performNormalSearch])

  // 处理键盘事件
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && isAIMode && query.trim()) {
      performAISearch(query)
      setShowResults(true)
    }
    if (e.key === 'Escape') {
      setShowResults(false)
      inputRef.current?.blur()
    }
  }

  // 点击外部关闭结果
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowResults(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // 选择搜索结果
  const handleSelectResult = (docId: string) => {
    onSelectDoc(docId)
    setShowResults(false)
    setQuery('')
  }

  // 清空搜索
  const handleClear = () => {
    setQuery('')
    setSearchResults([])
    setAIResult(null)
    setShowResults(false)
    setError(null)
  }

  return (
    <div ref={searchRef} className="relative w-full max-w-2xl mx-auto mb-6">
      {/* 搜索框 */}
      <div className="flex items-center gap-2 bg-white dark:bg-gray-800/50 rounded-lg border border-gray-300 dark:border-gray-700 focus-within:border-blue-500 transition-colors">
        <div className="flex items-center pl-3">
          {isSearching ? (
            <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
          ) : (
            <Search className="w-5 h-5 text-gray-400" />
          )}
        </div>
        
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => query && setShowResults(true)}
          placeholder={isAIMode ? "输入问题后按回车进行 AI 搜索..." : "搜索文档..."}
          className="flex-1 bg-transparent py-3 text-gray-900 dark:text-white placeholder-gray-500 outline-none"
        />

        {query && (
          <button
            onClick={handleClear}
            className="p-2 text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {/* AI 模式切换按钮 */}
        <button
          onClick={() => {
            setIsAIMode(!isAIMode)
            setSearchResults([])
            setAIResult(null)
            setError(null)
          }}
          className={`flex items-center gap-1.5 px-3 py-1.5 mr-2 rounded-md text-sm font-medium transition-all ${
            isAIMode
              ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
          }`}
          title={isAIConfigured ? '切换 AI 搜索' : 'AI 未配置，请先在设置中配置'}
        >
          <Sparkles className="w-4 h-4" />
          <span>AI</span>
        </button>
      </div>

      {/* AI 未配置提示 */}
      {isAIMode && !isAIConfigured && (
        <div className="absolute top-full left-0 right-0 mt-2 p-3 bg-yellow-100 dark:bg-yellow-900/50 border border-yellow-400 dark:border-yellow-700 rounded-lg text-yellow-800 dark:text-yellow-200 text-sm">
          ⚠️ AI 功能需要先配置。请前往设置页面配置 AI 服务。
        </div>
      )}

      {/* 搜索结果 */}
      {showResults && (searchResults.length > 0 || aiResult || error) && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl overflow-hidden z-50 max-h-[60vh] overflow-y-auto dropdown-animate">
          {/* 错误提示 */}
          {error && (
            <div className="p-4 text-red-600 dark:text-red-400 text-sm">
              ❌ {error}
            </div>
          )}

          {/* AI 搜索结果 */}
          {aiResult && (
            <div className="p-4">
              <div className="mb-4 p-3 bg-gradient-to-r from-purple-100 to-blue-100 dark:from-purple-900/30 dark:to-blue-900/30 rounded-lg border border-purple-300 dark:border-purple-700/50">
                <div className="flex items-center gap-2 mb-2 text-purple-600 dark:text-purple-300 text-sm font-medium">
                  <Sparkles className="w-4 h-4" />
                  AI 回答
                </div>
                <div className="text-gray-800 dark:text-gray-200 prose prose-sm dark:prose-invert max-w-none">
                  <ReactMarkdown
                    components={{
                      h1: ({ children }) => {
                        const text = String(children)
                        return (
                          <h1
                            onClick={() => onScrollToHeading?.(generateHeadingSlug(text))}
                            className="cursor-pointer text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline transition-colors flex items-center gap-1"
                          >
                            <span className="text-xs">🔗</span>
                            {children}
                          </h1>
                        )
                      },
                      h2: ({ children }) => {
                        const text = String(children)
                        return (
                          <h2
                            onClick={() => onScrollToHeading?.(generateHeadingSlug(text))}
                            className="cursor-pointer text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline transition-colors flex items-center gap-1"
                          >
                            <span className="text-xs">🔗</span>
                            {children}
                          </h2>
                        )
                      },
                      h3: ({ children }) => {
                        const text = String(children)
                        return (
                          <h3
                            onClick={() => onScrollToHeading?.(generateHeadingSlug(text))}
                            className="cursor-pointer text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline transition-colors flex items-center gap-1"
                          >
                            <span className="text-xs">🔗</span>
                            {children}
                          </h3>
                        )
                      },
                    }}
                  >
                    {aiResult.answer}
                  </ReactMarkdown>
                </div>
              </div>

              {aiResult.recommendedDocs.length > 0 && (
                <div>
                  <div className="text-gray-500 dark:text-gray-400 text-sm mb-2">推荐文档：</div>
                  {aiResult.recommendedDocs.map((doc, index) => (
                    <button
                      key={index}
                      onClick={() => handleSelectResult(doc.id)}
                      className="w-full text-left p-3 hover:bg-gray-100 dark:hover:bg-gray-700/50 rounded-lg transition-colors mb-1"
                    >
                      <div className="flex items-center gap-2 text-gray-900 dark:text-white font-medium">
                        <FileText className="w-4 h-4 text-blue-500 dark:text-blue-400" />
                        {doc.title}
                      </div>
                      <div className="text-gray-500 dark:text-gray-400 text-sm mt-1 pl-6">
                        {doc.reason}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 普通搜索结果 */}
          {!isAIMode && searchResults.length > 0 && (
            <div className="py-2">
              {searchResults.map((result) => (
                <button
                  key={result.id}
                  onClick={() => handleSelectResult(result.id)}
                  className="w-full text-left px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors search-result-item"
                >
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-500 dark:text-blue-400 flex-shrink-0" />
                    <span className="text-gray-900 dark:text-white font-medium">{result.title}</span>
                  </div>
                  {result.path.length > 0 && (
                    <div className="flex items-center gap-1 text-gray-400 dark:text-gray-500 text-xs mt-1 pl-6">
                      {result.path.map((p, i) => (
                        <span key={i} className="flex items-center gap-1">
                          {i > 0 && <ChevronRight className="w-3 h-3" />}
                          {p}
                        </span>
                      ))}
                    </div>
                  )}
                  {result.snippet && (
                    <div className="text-gray-500 dark:text-gray-400 text-sm mt-1 pl-6 line-clamp-2">
                      {result.snippet}
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* 无结果提示 */}
          {!isAIMode && searchResults.length === 0 && query && !isSearching && (
            <div className="p-4 text-gray-500 dark:text-gray-400 text-center">
              未找到匹配的文档
            </div>
          )}
        </div>
      )}
    </div>
  )
}
