import { useState, useCallback, useRef } from 'react'
import { Upload, Download, FileText, Check, X, Loader2, AlertTriangle } from 'lucide-react'
import { chatCompletion } from '@/services/ai'
import { useAppStore } from '@/store'
import type { FileItem } from './types'

// 格式化文件大小
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  if (bytes < 1024 * 1024 * 1024 * 1024) return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB'
  return (bytes / (1024 * 1024 * 1024 * 1024)).toFixed(1) + ' TB'
}

// 汉化配置文件预设
export default function TranslatePreset() {
  const [files, setFiles] = useState<FileItem[]>([])
  const [isTranslating, setIsTranslating] = useState(false)
  const [overallProgress, setOverallProgress] = useState(0)
  const [selectedFileIndex, setSelectedFileIndex] = useState<number | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const getModelForRole = useAppStore(s => s.getModelForRole)

  // 处理文件选择
  const handleFiles = useCallback(async (fileList: FileList) => {
    const newFiles: FileItem[] = []
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i]
      const content = await file.text()
      newFiles.push({
        file,
        name: file.name,
        size: file.size,
        status: 'waiting',
        progress: 0,
        originalContent: content,
        translatedContent: '',
      })
    }
    setFiles(prev => [...prev, ...newFiles])
  }, [])

  // 拖拽处理
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files)
    }
  }, [handleFiles])

  // 移除文件
  const removeFile = useCallback((index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
    if (selectedFileIndex === index) {
      setSelectedFileIndex(null)
    } else if (selectedFileIndex !== null && selectedFileIndex > index) {
      setSelectedFileIndex(selectedFileIndex - 1)
    }
  }, [selectedFileIndex])

  // 并发翻译实现
  const translateWithConcurrency = useCallback(async (
    chunks: string[],
    fileIndex: number,
    maxConcurrency: number,
  ): Promise<string[]> => {
    const results: string[] = new Array(chunks.length).fill('')
    let completed = 0

    const semaphore = {
      count: 0,
      queue: [] as (() => void)[],
      async acquire() {
        if (this.count < maxConcurrency) {
          this.count++
          return
        }
        await new Promise<void>(resolve => this.queue.push(resolve))
        this.count++
      },
      release() {
        this.count--
        const next = this.queue.shift()
        if (next) next()
      }
    }

    const translateChunk = async (chunk: string): Promise<string> => {
      if (!chunk.trim()) return chunk
      
      // 检查翻译模型是否已配置（在开始翻译前检查，避免无意义的重试）
      const translateModel = getModelForRole('translate')
      if (!translateModel) {
        throw new Error('未配置翻译模型，请在设置中为"翻译"角色分配一个模型')
      }
      if (!translateModel.apiKey) {
        throw new Error(`翻译模型 ${translateModel.name} 未设置 API Key，请在设置中配置`)
      }
      
      try {
        const content = await chatCompletion('translate', [
          {
            role: 'system',
            content: '你是一个专业的 Minecraft 服务器配置文件翻译助手。将配置文件中的英文注释翻译为中文，保持配置项的键值不变，只翻译注释和描述部分。保持原始格式不变，包括缩进和空行。'
          },
          {
            role: 'user',
            content: `将以下 Minecraft 服务器配置文件内容中的英文注释翻译为中文：\n\n${chunk}`
          }
        ], { temperature: 0.3 })
        return content
      } catch (error) {
        console.error('翻译块失败:', error)
        return chunk // API 调用失败时返回原文，不中断整个翻译任务
      }
    }

    await Promise.all(chunks.map(async (chunk, index) => {
      await semaphore.acquire()
      try {
        results[index] = await translateChunk(chunk)
        completed++
        const progress = Math.round((completed / chunks.length) * 100)
        setFiles(prev => prev.map((f, i) => 
          i === fileIndex ? { ...f, progress } : f
        ))
      } finally {
        semaphore.release()
      }
    }))

    return results
  }, [getModelForRole])

  // 将内容分割成块
  const splitIntoChunks = useCallback((content: string, linesPerChunk: number = 15): string[] => {
    const lines = content.split('\n')
    const chunks: string[] = []
    for (let i = 0; i < lines.length; i += linesPerChunk) {
      chunks.push(lines.slice(i, i + linesPerChunk).join('\n'))
    }
    return chunks
  }, [])

  // 开始翻译
  const startTranslation = useCallback(async () => {
    if (files.length === 0 || isTranslating) return

    // 并发数取自翻译模型配置，避免 UI 与限流器的实际上限不一致
    const translateModel = getModelForRole('translate')
    if (!translateModel?.apiKey) {
      setFiles(prev => prev.map(f => f.status === 'completed' ? f : { ...f, status: 'failed', error: '未配置翻译模型或 API Key' }))
      return
    }
    const maxConcurrency = Math.max(1, translateModel.maxConcurrency)

    setIsTranslating(true)
    setOverallProgress(0)

    let completedFiles = 0
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      if (file.status === 'completed') {
        completedFiles++
        continue
      }

      setFiles(prev => prev.map((f, idx) => 
        idx === i ? { ...f, status: 'translating', progress: 0 } : f
      ))

      try {
        const chunks = splitIntoChunks(file.originalContent)
        const translatedChunks = await translateWithConcurrency(chunks, i, maxConcurrency)
        const translatedContent = translatedChunks.join('\n')

        setFiles(prev => prev.map((f, idx) => 
          idx === i ? { ...f, status: 'completed', progress: 100, translatedContent } : f
        ))
        completedFiles++
      } catch (error) {
        setFiles(prev => prev.map((f, idx) => 
          idx === i ? { ...f, status: 'failed', error: String(error) } : f
        ))
      }

      setOverallProgress(Math.round((completedFiles / files.length) * 100))
    }

    setIsTranslating(false)
  }, [files, isTranslating, splitIntoChunks, translateWithConcurrency, getModelForRole])

  // 下载单个文件
  const downloadFile = useCallback((fileItem: FileItem) => {
    const blob = new Blob([fileItem.translatedContent], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = fileItem.name.replace(/(\.[^.]+)$/, '_zh$1')
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [])

  // 下载全部
  const downloadAll = useCallback(() => {
    files.filter(f => f.status === 'completed').forEach(downloadFile)
  }, [files, downloadFile])

  const completedCount = files.filter(f => f.status === 'completed').length

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2 flex items-center justify-center gap-2">
          <FileText className="w-6 h-6 text-mc-gold" />
          汉化配置文件
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          上传 Minecraft 服务器配置文件，AI 自动将英文注释翻译为中文
        </p>
      </div>

      {/* 文件上传区域 */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`
          relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-300
          ${isDragging
            ? 'border-mc-gold bg-mc-gold/10 dark:bg-mc-gold/5'
            : 'border-gray-300 dark:border-gray-600 hover:border-mc-gold dark:hover:border-mc-gold hover:bg-gray-50 dark:hover:bg-gray-800/50'
          }
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".properties,.yml,.yaml,.json,.toml,.conf,.cfg,.txt"
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
          className="hidden"
        />
        <Upload className={`w-12 h-12 mx-auto mb-4 ${isDragging ? 'text-mc-gold' : 'text-gray-400'}`} />
        <p className="text-gray-600 dark:text-gray-400 mb-2">
          拖拽文件到此处，或点击选择文件
        </p>
        <p className="text-sm text-gray-400 dark:text-gray-500">
          支持 .properties, .yml, .yaml, .json, .toml, .conf, .cfg, .txt
        </p>
      </div>

      {/* 文件列表 */}
      {files.length > 0 && (
        <div className="bg-white dark:bg-dark-card rounded-xl border border-mc-border dark:border-dark-border overflow-hidden">
          <div className="p-4 border-b border-mc-border dark:border-dark-border flex items-center justify-between">
            <span className="font-medium text-gray-800 dark:text-gray-100">
              文件列表 ({files.length} 个文件)
            </span>
            <div className="flex items-center gap-3">
              {completedCount > 0 && (
                <button
                  onClick={downloadAll}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors"
                >
                  <Download className="w-4 h-4" />
                  下载全部 ({completedCount})
                </button>
              )}
              <button
                onClick={startTranslation}
                disabled={isTranslating || files.every(f => f.status === 'completed')}
                className={`
                  flex items-center gap-2 px-4 py-1.5 text-sm rounded-lg transition-colors
                  ${isTranslating || files.every(f => f.status === 'completed')
                    ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                    : 'bg-mc-gold hover:bg-mc-gold-dark text-white'
                  }
                `}
              >
                {isTranslating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    翻译中... {overallProgress}%
                  </>
                ) : (
                  '开始翻译'
                )}
              </button>
            </div>
          </div>

          {/* 总进度条 */}
          {isTranslating && (
            <div className="px-4 py-2 bg-gray-50 dark:bg-gray-800/50">
              <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-mc-gold transition-all duration-300 ease-out"
                  style={{ width: `${overallProgress}%` }}
                />
              </div>
            </div>
          )}

          <div className="divide-y divide-mc-border dark:divide-dark-border">
            {files.map((file, index) => (
              <div
                key={index}
                onClick={() => file.status === 'completed' && setSelectedFileIndex(index)}
                className={`
                  flex items-center gap-4 p-4 transition-colors
                  ${file.status === 'completed' ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50' : ''}
                  ${selectedFileIndex === index ? 'bg-mc-gold/10 dark:bg-mc-gold/5' : ''}
                `}
              >
                <FileText className="w-5 h-5 text-gray-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-800 dark:text-gray-100 truncate">
                      {file.name}
                    </span>
                    <span className="text-xs text-gray-400">
                      {formatFileSize(file.size)}
                    </span>
                  </div>
                  {file.status === 'translating' && (
                    <div className="mt-2 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-mc-gold transition-all duration-300"
                        style={{ width: `${file.progress}%` }}
                      />
                    </div>
                  )}
                  {file.status === 'failed' && file.error && (
                    <p className="text-xs text-red-500 mt-1 truncate">{file.error}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {file.status === 'waiting' && (
                    <span className="text-xs text-gray-400 px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded">
                      等待中
                    </span>
                  )}
                  {file.status === 'translating' && (
                    <Loader2 className="w-5 h-5 text-mc-gold animate-spin" />
                  )}
                  {file.status === 'completed' && (
                    <>
                      <Check className="w-5 h-5 text-green-500" />
                      <button
                        onClick={(e) => { e.stopPropagation(); downloadFile(file) }}
                        className="p-1.5 text-gray-400 hover:text-mc-gold transition-colors"
                        title="下载"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </>
                  )}
                  {file.status === 'failed' && (
                    <X className="w-5 h-5 text-red-500" />
                  )}
                  {!isTranslating && (
                    <button
                      onClick={(e) => { e.stopPropagation(); removeFile(index) }}
                      className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                      title="移除"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 翻译结果预览 */}
      {selectedFileIndex !== null && files[selectedFileIndex]?.status === 'completed' && (
        <div className="bg-white dark:bg-dark-card rounded-xl border border-mc-border dark:border-dark-border overflow-hidden">
          <div className="p-4 border-b border-mc-border dark:border-dark-border flex items-center justify-between">
            <span className="font-medium text-gray-800 dark:text-gray-100">
              翻译结果预览: {files[selectedFileIndex].name}
            </span>
            <button
              onClick={() => setSelectedFileIndex(null)}
              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="p-4 max-h-96 overflow-auto">
            <pre className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-mono">
              {files[selectedFileIndex].translatedContent}
            </pre>
          </div>
        </div>
      )}

      {/* 免责声明 */}
      {files.some(f => f.status === 'completed') && (
        <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
          <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-amber-700 dark:text-amber-300">
            AI 翻译由于模型能力的不同，不保证翻译质量。建议翻译后人工校验。
          </p>
        </div>
      )}
    </div>
  )
}
