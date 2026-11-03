import { Link } from 'react-router-dom'
import type { RefObject } from 'react'
import { Search, Loader2, BookOpen, Send, X, Bot, User, ExternalLink } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { PluginBase, SearchFilters } from '@/types'

export type AgentState = 'idle' | 'thinking' | 'asking' | 'reading' | 'searching' | 'analyzing' | 'done'

export interface SearchStep {
  type: 'reading' | 'searching' | 'result'
  content: string
  plugins?: PluginBase[]
}

export interface AgentMessage {
  role: 'user' | 'assistant'
  content: string
  steps?: SearchStep[]
}

interface Props {
  messages: AgentMessage[]
  agentState: AgentState
  searchResult: { keywords: string[]; filters: SearchFilters } | null
  userInput: string
  onUserInputChange: (value: string) => void
  onUserReply: () => void
  onReset: () => void
  onViewMore: (query: string, filters: SearchFilters) => void
  chatEndRef: RefObject<HTMLDivElement | null>
}

export function SearchAgentPanel({
  messages,
  agentState,
  searchResult,
  userInput,
  onUserInputChange,
  onUserReply,
  onReset,
  onViewMore,
  chatEndRef,
}: Props) {
  if (messages.length === 0) return null

  return (
    <div className="mt-2 bg-white dark:bg-dark-card border border-mc-border dark:border-dark-border rounded-xl overflow-hidden animate-fade-in">
      {/* 对话头部 */}
      <div className="px-3 py-2 bg-mc-green/5 dark:bg-mc-green/10 border-b border-mc-border dark:border-dark-border flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-dark-text-secondary">
          <Bot className="w-4 h-4 text-mc-green" />
          <span>AI 搜索助手</span>
          {agentState === 'thinking' && <Loader2 className="w-3 h-3 animate-spin text-mc-green" />}
        </div>
        <button
          onClick={onReset}
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
              onChange={(e) => onUserInputChange(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onUserReply()}
              placeholder="输入你的回复..."
              className="flex-1 px-3 py-2 rounded-lg border border-mc-border dark:border-dark-border bg-white dark:bg-dark-bg text-sm text-gray-800 dark:text-dark-text focus:outline-none focus:ring-1 focus:ring-mc-green"
              autoFocus
            />
            <button
              onClick={onUserReply}
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
              onViewMore(searchQuery, searchResult.filters)
            }}
            className="text-xs text-mc-green hover:text-mc-green-dark flex items-center gap-1"
          >
            <span>查看更多结果</span>
            <ExternalLink className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  )
}
