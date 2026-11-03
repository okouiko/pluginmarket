// 检测 Tauri 环境
export const isTauri = '__TAURI__' in window || '__TAURI_INTERNALS__' in window
