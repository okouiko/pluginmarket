import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { Loader2, Search, Send } from 'lucide-react'
import { chatCompletionWithTools, chatCompletionStream, ConcurrencyLimitError, type ToolDefinition } from '@/services/ai'
import { DOC_INDEX_TEXT } from '@/data/docs'
import { useAppStore } from '@/store'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { loadDoc } from './loadDocs'

// 系统提示
const SYSTEM_PROMPT = `你是一个 Minecraft 开服助手。你的任务是帮助用户从零开始搭建 Minecraft 服务器。

你可以使用 read_docs 工具来阅读开服手册中的文档，获取最新的配置指南和教程。

${DOC_INDEX_TEXT}

工作流程：
1. 了解用户需求（服务器类型、人数、系统等）
2. 根据需求阅读相关文档
3. 基于文档内容给出详细的步骤指导
4. 回答用户的后续问题

注意：
- 始终基于文档内容回答，不要编造信息
- 给出的步骤要具体、可操作
- 如果用户的问题涉及多个方面，分步骤阅读相关文档
- 使用中文回答`

// Tool 定义
const TOOLS: ToolDefinition[] = [
  {
    type: 'function',
    function: {
      name: 'read_docs',
      description: '阅读开服手册中的文档以获取相关信息',
      parameters: {
        type: 'object',
        properties: {
          doc_paths: {
            type: 'array',
            items: { type: 'string' },
            description: '要阅读的文档路径列表'
          }
        },
        required: ['doc_paths']
      }
    }
  }
]

// 聊天消息类型
interface ChatMessageItem {
  id: string
  role: 'user' | 'assistant'
  content: string
  readingDocs?: string[] // AI 正在阅读的文档
  isStreaming?: boolean
}

// 简单开服预设
export default function SimpleServerPreset() {
  const [messages, setMessages] = useState<ChatMessageItem[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const darkMode = useAppStore(s => s.darkMode)

  // 自定义代码块渲染组件
  const markdownComponents = useMemo(() => ({
    code({ inline, className, children, ...props }: { inline?: boolean; className?: string; children?: React.ReactNode }) {
      const match = /language-(\w+)/.exec(className || '')
      const codeString = String(children).replace(/\n$/, '')
      
      if (!inline && match) {
        return (
          <SyntaxHighlighter
            style={darkMode ? oneDark : oneLight}
            language={match[1]}
            PreTag="div"
            customStyle={{
              margin: '1em 0',
              borderRadius: '8px',
              fontSize: '0.875em',
            }}
            {...props}
          >
            {codeString}
          </SyntaxHighlighter>
        )
      }
      
      return (
        <code className={className} {...props}>
          {children}
        </code>
      )
    },
  }), [darkMode])

  // 滚动到底部
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  // 初始化欢迎消息
  useEffect(() => {
    setMessages([{
      id: 'welcome',
      role: 'assistant',
      content: '你好！我是开服助手，我会帮你从零开始搭建 Minecraft 服务器。请告诉我你的需求，比如：想开什么类型的服（插件服/模组服/混合服）？大概多少人？在什么系统上运行？'
    }])
  }, [])

  // 自动调整输入框高度
  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = Math.min(textarea.scrollHeight, 150) + 'px'
    }
  }, [])

  // 处理发送消息
  const handleSend = useCallback(async () => {
    if (!input.trim() || isLoading) return

    const userMessage: ChatMessageItem = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim()
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    // 重置输入框高度
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }

    // 构建对话历史
    const chatHistory = [...messages, userMessage].map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content
    }))

    try {
      // 第一步：调用带 tools 的 AI
      const response = await chatCompletionWithTools(
        'decision',
        [
          { role: 'system', content: SYSTEM_PROMPT },
          ...chatHistory
        ],
        TOOLS
      )

      if (response.toolCalls && response.toolCalls.length > 0) {
        // AI 请求阅读文档
        const toolCall = response.toolCalls[0]
        if (toolCall.name === 'read_docs') {
          const docPaths = toolCall.arguments.doc_paths as string[]
          
          // 添加 AI 消息，显示正在阅读文档
          const aiMessageId = Date.now().toString() + '-ai'
          setMessages(prev => [...prev, {
            id: aiMessageId,
            role: 'assistant',
            content: '',
            readingDocs: docPaths,
            isStreaming: true
          }])

          // 加载文档内容
          const docContents = await Promise.all(
            docPaths.map(async (path) => {
              const content = await loadDoc(path)
              return `=== ${path} ===\n${content}`
            })
          )

          // 构建包含文档内容的消息（将文档内容作为系统消息的一部分）
          const systemWithDocs = `${SYSTEM_PROMPT}\n\n--- 以下是你阅读的文档内容 ---\n\n${docContents.join('\n\n')}`
          const messagesWithDocs = [
            { role: 'system' as const, content: systemWithDocs },
            ...chatHistory
          ]

          // 流式输出最终回答
          let fullContent = ''
          for await (const chunk of chatCompletionStream('decision', messagesWithDocs as { role: 'user' | 'assistant' | 'system'; content: string }[])) {
            fullContent += chunk
            setMessages(prev => prev.map(m =>
              m.id === aiMessageId
                ? { ...m, content: fullContent }
                : m
            ))
          }

          // 完成流式输出
          setMessages(prev => prev.map(m =>
            m.id === aiMessageId
              ? { ...m, isStreaming: false, readingDocs: undefined }
              : m
          ))
        }
      } else {
        // AI 直接回答，使用流式输出
        const aiMessageId = Date.now().toString() + '-ai'
        setMessages(prev => [...prev, {
          id: aiMessageId,
          role: 'assistant',
          content: '',
          isStreaming: true
        }])

        let fullContent = ''
        for await (const chunk of chatCompletionStream('decision', [
          { role: 'system', content: SYSTEM_PROMPT },
          ...chatHistory
        ])) {
          fullContent += chunk
          setMessages(prev => prev.map(m =>
            m.id === aiMessageId
              ? { ...m, content: fullContent }
              : m
          ))
        }

        // 完成流式输出
        setMessages(prev => prev.map(m =>
          m.id === aiMessageId
            ? { ...m, isStreaming: false }
            : m
        ))
      }
    } catch (error) {
      console.error('AI 调用失败:', error)
      const errorMessage = error instanceof ConcurrencyLimitError
        ? error.message
        : `出错了：${error instanceof Error ? error.message : '未知错误'}`
      setMessages(prev => [...prev, {
        id: Date.now().toString() + '-error',
        role: 'assistant',
        content: errorMessage
      }])
    } finally {
      setIsLoading(false)
    }
  }, [input, isLoading, messages])

  // 处理键盘事件
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }, [handleSend])

  return (
    <div className="flex flex-col h-[calc(100vh-200px)] bg-white dark:bg-dark-card rounded-2xl shadow-lg overflow-hidden">
      {/* 聊天消息区域 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                message.role === 'user'
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-100'
              }`}
            >
              {/* 文档阅读状态 */}
              {message.readingDocs && message.readingDocs.length > 0 && (
                <div className="mb-3 space-y-1">
                  {message.readingDocs.map((doc, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span><Search className="w-4 h-4 inline mr-1" />AI 正在阅读《{doc.split('/').pop()?.replace('.md', '')}》文档...</span>
                    </div>
                  ))}
                </div>
              )}
              
              {/* 消息内容 */}
              {message.role === 'assistant' ? (
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                    {message.content || (message.isStreaming ? '...' : '')}
                  </ReactMarkdown>
                </div>
              ) : (
                <p className="whitespace-pre-wrap">{message.content}</p>
              )}
              
              {/* 流式输出指示器 */}
              {message.isStreaming && message.content && (
                <span className="inline-block w-2 h-4 bg-current animate-pulse ml-1" />
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* 输入区域 */}
      <div className="border-t border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-end gap-3">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => {
              setInput(e.target.value)
              adjustTextareaHeight()
            }}
            onKeyDown={handleKeyDown}
            placeholder="输入你的问题... (Enter 发送, Shift+Enter 换行)"
            className="flex-1 resize-none rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-3 text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-mc-gold focus:border-transparent"
            rows={1}
            disabled={isLoading}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="flex-shrink-0 w-12 h-12 rounded-xl bg-mc-gold hover:bg-mc-gold-dark disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed text-white flex items-center justify-center transition-colors"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
