import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { Search, Sparkles, X, Loader2 } from 'lucide-react'
import { chatCompletionWithTools, isAIAvailable, type ToolDefinition } from '@/services/ai'
import { DOC_INDEX_TEXT, resolveDocEntry } from '@/data/docs'
import { DocsSearchResults, type AISearchResult, type SearchResult } from '@/components/DocsSearchResults'

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
    // 移除表格分隔符行 |---|---|（字符类改用 alternation，避免被 Tailwind 误识别为任意属性）
    .replace(/^\|(?:\s|:|-|\|)*\|$/gm, '')
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
      <DocsSearchResults
        showResults={showResults}
        query={query}
        isAIMode={isAIMode}
        isSearching={isSearching}
        searchResults={searchResults}
        aiResult={aiResult}
        error={error}
        onSelectResult={handleSelectResult}
        onScrollToHeading={onScrollToHeading}
      />
    </div>
  )
}
