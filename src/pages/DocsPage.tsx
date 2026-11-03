import { useState, useMemo, useCallback, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import rehypeSanitize from 'rehype-sanitize'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { useAppStore } from '@/store'
import { ChevronRight, ChevronDown, Book, FileText, FolderOpen, Folder, Bot } from 'lucide-react'
import { DocsSearch } from '@/components/DocsSearch'
import { AskAIPanel } from '@/components/AskAIPanel'
import { docsTree, type DocItem } from '@/data/docs'

// 递归查找文档内容
function findDocContent(tree: DocItem[], id: string): string | null {
  for (const item of tree) {
    if (item.id === id && item.content) {
      return item.content
    }
    if (item.children) {
      const found = findDocContent(item.children, id)
      if (found) return found
    }
  }
  return null
}

// 递归查找文档标题
function findDocTitle(tree: DocItem[], id: string): string | null {
  for (const item of tree) {
    if (item.id === id) {
      return item.title
    }
    if (item.children) {
      const found = findDocTitle(item.children, id)
      if (found) return found
    }
  }
  return null
}

// 获取所有文档（用于搜索）
function getAllDocsFlat(tree: DocItem[], path: string[] = []): { id: string; title: string; content: string; path: string[] }[] {
  const result: { id: string; title: string; content: string; path: string[] }[] = []
  
  for (const item of tree) {
    const currentPath = [...path, item.title.replace(/^(📚|📁)\s*/, '')]
    
    if (item.content) {
      result.push({
        id: item.id,
        title: item.title,
        content: item.content,
        path: currentPath.slice(0, -1) // 不包含自身标题
      })
    }
    
    if (item.children) {
      result.push(...getAllDocsFlat(item.children, currentPath))
    }
  }
  
  return result
}

// 获取第一个有内容的文档 ID
function getFirstDocId(tree: DocItem[]): string | null {
  for (const item of tree) {
    if (item.content) return item.id
    if (item.children) {
      const found = getFirstDocId(item.children)
      if (found) return found
    }
  }
  return null
}

// 生成标题的 slug（用于锚点 id）
function generateHeadingSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\u4e00-\u9fa5\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
}

// 侧边栏树节点组件
interface TreeNodeProps {
  item: DocItem
  selectedId: string
  onSelect: (id: string) => void
  expandedIds: Set<string>
  onToggle: (id: string) => void
  level?: number
}

function TreeNode({ item, selectedId, onSelect, expandedIds, onToggle, level = 0 }: TreeNodeProps) {
  const hasChildren = item.children && item.children.length > 0
  const isExpanded = expandedIds.has(item.id)
  const isSelected = selectedId === item.id
  const hasContent = !!item.content

  const handleClick = () => {
    if (hasChildren) {
      onToggle(item.id)
    }
    if (hasContent) {
      onSelect(item.id)
    }
  }

  return (
    <div>
      <div
        onClick={handleClick}
        className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg cursor-pointer transition-all duration-200 ${
          isSelected
            ? 'bg-mc-green/20 text-mc-green'
            : 'text-gray-700 dark:text-dark-text-secondary hover:bg-gray-100 dark:hover:bg-dark-border/50'
        }`}
        style={{ paddingLeft: `${level * 12 + 8}px` }}
      >
        {hasChildren ? (
          isExpanded ? (
            <ChevronDown className="w-4 h-4 flex-shrink-0" />
          ) : (
            <ChevronRight className="w-4 h-4 flex-shrink-0" />
          )
        ) : (
          <FileText className="w-4 h-4 flex-shrink-0 text-gray-400" />
        )}
        {hasChildren && !hasContent ? (
          isExpanded ? (
            <FolderOpen className="w-4 h-4 flex-shrink-0 text-yellow-500" />
          ) : (
            <Folder className="w-4 h-4 flex-shrink-0 text-yellow-500" />
          )
        ) : null}
        <span className="text-sm truncate">{item.title}</span>
      </div>
      {hasChildren && (
        <div
          className={`overflow-hidden transition-all duration-300 ease-in-out ${
            isExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
          }`}
        >
          {item.children!.map((child) => (
            <TreeNode
              key={child.id}
              item={child}
              selectedId={selectedId}
              onSelect={onSelect}
              expandedIds={expandedIds}
              onToggle={onToggle}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default function DocsPage() {
  const darkMode = useAppStore((state) => state.darkMode)
  const [selectedId, setSelectedId] = useState<string>(() => getFirstDocId(docsTree) || '')
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => {
    // 默认展开第一级
    return new Set(docsTree.map((item) => item.id))
  })
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [isAIPanelOpen, setIsAIPanelOpen] = useState(false)
  
  const mainContentRef = useRef<HTMLElement>(null)

  const content = useMemo(() => findDocContent(docsTree, selectedId), [selectedId])
  const docTitle = useMemo(() => findDocTitle(docsTree, selectedId) || '文档', [selectedId])
  
  // 获取所有文档的回调函数
  const getAllDocs = useCallback(() => getAllDocsFlat(docsTree), [])
  
  // 处理搜索结果选择
  const handleSelectDoc = useCallback((docId: string) => {
    setSelectedId(docId)
    // 展开包含该文档的父级
    const expandParents = (tree: DocItem[], targetId: string, parents: string[] = []): string[] | null => {
      for (const item of tree) {
        if (item.id === targetId) {
          return parents
        }
        if (item.children) {
          const found = expandParents(item.children, targetId, [...parents, item.id])
          if (found) return found
        }
      }
      return null
    }
    const parentsToExpand = expandParents(docsTree, docId)
    if (parentsToExpand) {
      setExpandedIds(prev => {
        const next = new Set(prev)
        parentsToExpand.forEach(id => next.add(id))
        return next
      })
    }
  }, [])

  // 处理标题跳转
  const handleScrollToHeading = useCallback((headingId: string) => {
    if (mainContentRef.current) {
      const element = mainContentRef.current.querySelector(`#${CSS.escape(headingId)}`)
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }
  }, [])

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
    h1({ children }: { children?: React.ReactNode }) {
      const text = String(children)
      const id = generateHeadingSlug(text)
      return <h1 id={id}>{children}</h1>
    },
    h2({ children }: { children?: React.ReactNode }) {
      const text = String(children)
      const id = generateHeadingSlug(text)
      return <h2 id={id}>{children}</h2>
    },
    h3({ children }: { children?: React.ReactNode }) {
      const text = String(children)
      const id = generateHeadingSlug(text)
      return <h3 id={id}>{children}</h3>
    },
    h4({ children }: { children?: React.ReactNode }) {
      const text = String(children)
      const id = generateHeadingSlug(text)
      return <h4 id={id}>{children}</h4>
    },
  }), [darkMode])

  const handleToggle = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem-3rem)]">
      {/* 搜索栏 */}
      <div className="flex-shrink-0 border-b border-mc-border dark:border-dark-border bg-white dark:bg-dark-card px-4 py-3">
        <DocsSearch
          onSelectDoc={handleSelectDoc}
          getAllDocs={getAllDocs}
          onScrollToHeading={handleScrollToHeading}
        />
      </div>
      
      <div className="flex flex-1 overflow-hidden">
        {/* 侧边栏 */}
        <aside
          className={`${
            sidebarOpen ? 'w-64' : 'w-0'
          } flex-shrink-0 border-r border-mc-border dark:border-dark-border bg-white dark:bg-dark-card overflow-hidden transition-all duration-300`}
        >
          <div className="w-64 h-full flex flex-col">
            <div className="p-3 border-b border-mc-border dark:border-dark-border flex items-center gap-2">
              <Book className="w-5 h-5 text-mc-green" />
              <span className="font-medium text-gray-800 dark:text-dark-text">开服手册</span>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {docsTree.map((item) => (
                <TreeNode
                  key={item.id}
                  item={item}
                  selectedId={selectedId}
                  onSelect={handleSelectDoc}
                  expandedIds={expandedIds}
                  onToggle={handleToggle}
                />
              ))}
            </div>
          </div>
        </aside>

        {/* 切换侧边栏按钮 */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 p-1 bg-white dark:bg-dark-card border border-mc-border dark:border-dark-border rounded-r-lg shadow-sm hover:bg-gray-50 dark:hover:bg-dark-border/50 transition-colors"
          style={{ left: sidebarOpen ? '256px' : '0', marginTop: '24px' }}
        >
          {sidebarOpen ? (
            <ChevronRight className="w-4 h-4 text-gray-500 rotate-180" />
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-500" />
          )}
        </button>

        {/* 内容区域 */}
        <main 
          ref={mainContentRef}
          className="overflow-y-auto bg-gray-50 dark:bg-dark-bg relative transition-all duration-300 ease-in-out"
          style={{ width: isAIPanelOpen ? '60%' : '100%' }}
        >
          {/* 询问 AI 按钮 */}
          {content && !isAIPanelOpen && (
            <button
              onClick={() => setIsAIPanelOpen(true)}
              className="fixed right-6 bottom-6 z-20 flex items-center gap-2 px-4 py-2.5
                       bg-emerald-600 hover:bg-emerald-500 text-white rounded-full shadow-lg
                       hover:shadow-xl transition-all duration-200 hover:scale-105"
            >
              <Bot className="w-5 h-5" />
              <span className="font-medium">询问 AI</span>
            </button>
          )}
          
          <div className="max-w-4xl mx-auto p-6">
            {content ? (
              <article
                key={selectedId}
                className="docs-content markdown-body prose prose-sm dark:prose-invert max-w-none prose-headings:text-gray-800 dark:prose-headings:text-dark-text prose-p:text-gray-600 dark:prose-p:text-dark-text-secondary prose-a:text-mc-green prose-code:before:content-none prose-code:after:content-none prose-img:rounded-lg prose-table:text-sm prose-th:bg-gray-100 dark:prose-th:bg-dark-border prose-th:px-3 prose-th:py-2 prose-td:px-3 prose-td:py-2 prose-td:border-t prose-td:border-gray-200 dark:prose-td:border-dark-border animate-fade-in"
              >
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeRaw, rehypeSanitize]}
                  components={markdownComponents}
                >
                  {content}
                </ReactMarkdown>
              </article>
            ) : (
              <div className="text-center text-gray-500 dark:text-dark-text-secondary py-20 animate-fade-in">
                <Book className="w-16 h-16 mx-auto mb-4 opacity-30" />
                <p>请从左侧目录选择文档</p>
              </div>
            )}
          </div>
        </main>

        {/* AI 询问面板 */}
        <div
          className="overflow-hidden transition-all duration-300 ease-in-out flex-shrink-0"
          style={{ width: isAIPanelOpen ? '40%' : '0', minWidth: isAIPanelOpen ? '320px' : '0' }}
        >
          <AskAIPanel
            isOpen={isAIPanelOpen}
            onClose={() => setIsAIPanelOpen(false)}
            docTitle={docTitle}
            docContent={content || ''}
            onScrollToHeading={handleScrollToHeading}
          />
        </div>
      </div>
    </div>
  )
}
