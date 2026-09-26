import { apiFetch } from './api-base'
import type { PluginBase, ModrinthSearchResult, ModrinthSearchHit, ModrinthProject } from '@/types'

function hitToPluginBase(h: ModrinthSearchHit): PluginBase {
  return {
    id: `modrinth-${h.project_id}`,
    platformId: h.project_id,
    platform: 'modrinth',
    name: h.title,
    tag: h.description,
    author: h.author,
    icon: h.icon_url,
    downloads: h.downloads,
    categories: h.categories || [],
    version: h.versions?.[h.versions.length - 1],
    lastUpdate: new Date(h.date_modified).getTime(),
    sourceUrl: `https://modrinth.com/plugin/${h.slug}`,
    images: h.gallery,
  }
}

function projectToPluginBase(p: ModrinthProject): PluginBase {
  return {
    id: `modrinth-${p.id}`,
    platformId: p.id,
    platform: 'modrinth',
    name: p.title,
    tag: p.description,
    description: p.body,
    author: '',
    icon: p.icon_url,
    downloads: p.downloads,
    categories: p.categories || [],
    lastUpdate: new Date(p.updated).getTime(),
    sourceUrl: `https://modrinth.com/plugin/${p.slug}`,
    images: p.gallery?.map(g => g.url),
  }
}

// 注意：Modrinth 的 facets 参数在沙箱代理环境下会被中间层拦截返回 500，
// 且大多数搜索结果本身就是 server-side 项目，因此这里直接搜索不做 facets 过滤。
export async function searchModrinth(query: string, page = 0, size = 10): Promise<PluginBase[]> {
  const url = `/search?query=${encodeURIComponent(query)}&limit=${size}&offset=${page * size}&index=relevance`
  const result = await apiFetch<ModrinthSearchResult>('modrinth', url)
  return result.hits.map(hitToPluginBase)
}

export async function getModrinthProject(idOrSlug: string): Promise<PluginBase> {
  const p = await apiFetch<ModrinthProject>('modrinth', `/project/${idOrSlug}`)
  return projectToPluginBase(p)
}

export async function getModrinthProjectDescription(idOrSlug: string): Promise<string> {
  const p = await apiFetch<ModrinthProject>('modrinth', `/project/${idOrSlug}`)
  return p.body || ''
}

export async function getModrinthPopular(page = 0, size = 10): Promise<PluginBase[]> {
  const result = await apiFetch<ModrinthSearchResult>(
    'modrinth',
    `/search?limit=${size}&offset=${page * size}&index=downloads`
  )
  return result.hits.map(hitToPluginBase)
}

export async function getModrinthTeamMembers(teamId: string): Promise<{ user: { username: string; id: string } }[]> {
  return apiFetch<{ user: { username: string; id: string } }[]>('modrinth', `/team/${teamId}/members`)
}

export async function getModrinthUserProjects(userId: string): Promise<PluginBase[]> {
  const projects = await apiFetch<ModrinthProject[]>('modrinth', `/user/${userId}/projects`)
  return projects.map(projectToPluginBase)
}

export async function getModrinthCategories(): Promise<{ name: string; icon: string; project_type: string }[]> {
  return apiFetch<{ name: string; icon: string; project_type: string }[]>('modrinth', '/tag/category')
}
