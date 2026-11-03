import { useState } from 'react'
import { PresetContent, PresetSelector } from './guide/PresetSelector'
import type { PresetType } from './guide/types'

export default function GuidePage() {
  const [activePreset, setActivePreset] = useState<PresetType>(null)

  return (
    <div className="min-h-[calc(100vh-120px)] bg-gradient-to-b from-mc-bg to-white dark:from-dark-bg dark:to-dark-card">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {activePreset === null ? (
          <PresetSelector onSelect={setActivePreset} />
        ) : (
          <PresetContent preset={activePreset} onBack={() => setActivePreset(null)} />
        )}
      </div>
    </div>
  )
}
