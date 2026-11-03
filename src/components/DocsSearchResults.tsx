import { Sparkles, FileText, ChevronRight } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { generateHeadingSlug } from '@/utils/markdown'

export interface SearchResult {
  id: string
  title: string
  path: string[]
  snippet: string
  score: number
}

export interface AISearchResult {
  answer: string
  recommendedDocs: { id: string; title: string; reason: string }[]
}

interface Props {
  showResults: boolean
  query: string
  isAIMode: boolean
  isSearching: boolean
  searchResults: SearchResult[]
  aiResult: AISearchResult | null
  error: string | null
  onSelectResult: (docId: string) => void
  onScrollToHeading?: (headingId: string) => void
}

export function DocsSearchResults({
  showResults,
  query,
  isAIMode,
  isSearching,
  searchResults,
  aiResult,
  error,
  onSelectResult,
  onScrollToHeading,
}: Props) {
  if (!showResults || !(searchResults.length > 0 || aiResult || error)) return null

  return (
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
                  onClick={() => onSelectResult(doc.id)}
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
              onClick={() => onSelectResult(result.id)}
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
  )
}
