import { getDocContentByPath } from '@/data/docs'

// 从统一文档目录读取内容
export async function loadDoc(path: string): Promise<string> {
  return getDocContentByPath(path) ?? `文档 ${path} 未找到`
}
