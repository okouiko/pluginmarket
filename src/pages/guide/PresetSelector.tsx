import { ArrowLeft, FileText, Rocket, Bot, Gamepad2 } from 'lucide-react'
import { isTauri } from './env'
import type { PresetType } from './types'
import TranslatePreset from './TranslatePreset'
import SimpleServerPreset from './SimpleServerPreset'
import AgentPreset from './AgentPreset'

// 预设卡片数据
const presets = [
  {
    id: 'translate' as const,
    icon: FileText,
    title: '汉化配置文件',
    description: '上传服务器配置文件，AI 自动翻译注释为中文。并发数遵循翻译模型的并发上限。',
    disabled: false,
  },
  {
    id: 'simple' as const,
    icon: Rocket,
    title: '简单开服',
    description: 'AI 助手引导你从零开始搭建 Minecraft 服务器，自动阅读相关文档。',
    disabled: false,
  },
  {
    id: 'agent' as const,
    icon: Bot,
    title: 'Agent 模式',
    description: 'AI 读取你的服务器本地文件，智能诊断和指导。仅 Tauri 桌面端可用。',
    disabled: !isTauri,
  },
]

// 预设选择界面
export function PresetSelector({ onSelect }: { onSelect: (preset: PresetType) => void }) {
  return (
    <div className="animate-fade-in">
      <div className="text-center mb-12">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100 mb-4 flex items-center justify-center gap-3">
          <Gamepad2 className="w-8 h-8 text-mc-gold" />
          指导开服
        </h1>
        <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
          选择一个预设模式，让 AI 助手帮助你完成 Minecraft 服务器相关任务
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
        {presets.map((preset) => (
          <button
            key={preset.id}
            onClick={() => !preset.disabled && onSelect(preset.id)}
            disabled={preset.disabled}
            className={`
              group relative p-6 rounded-xl border-2 text-left transition-all duration-300
              ${preset.disabled
                ? 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 cursor-not-allowed opacity-60'
                : 'border-mc-border dark:border-dark-border bg-white dark:bg-dark-card hover:border-mc-gold dark:hover:border-mc-gold hover:shadow-lg hover:shadow-mc-gold/10 hover:-translate-y-1 cursor-pointer'
              }
            `}
          >
            <div className="mb-4 text-mc-gold">
              <preset.icon className="w-10 h-10" />
            </div>
            <h3 className={`text-lg font-semibold mb-2 ${preset.disabled ? 'text-gray-400 dark:text-gray-500' : 'text-gray-800 dark:text-gray-100 group-hover:text-mc-gold'}`}>
              {preset.title}
            </h3>
            <p className={`text-sm ${preset.disabled ? 'text-gray-400 dark:text-gray-600' : 'text-gray-600 dark:text-gray-400'}`}>
              {preset.description}
            </p>
            {preset.disabled && (
              <div className="absolute top-3 right-3 px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs text-gray-500 dark:text-gray-400">
                不可用
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}

// 预设内容区域
export function PresetContent({ preset, onBack }: { preset: PresetType; onBack: () => void }) {
  return (
    <div className="animate-fade-in">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-mc-gold dark:hover:text-mc-gold transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        返回预设选择
      </button>

      {preset === 'translate' && <TranslatePreset />}
      {preset === 'simple' && <SimpleServerPreset />}
      {preset === 'agent' && <AgentPreset />}
    </div>
  )
}
