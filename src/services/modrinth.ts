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

export async function searchModrinth(query: string, page = 0, size = 10): Promise<PluginBase[]> {
  const facets = JSON.stringify([['project_type:plugin'], ['server_side:required', 'server_side:optional']])
  const result = await apiFetch<ModrinthSearchResult>(
    'modrinth',
    `/search?query=${encodeURIComponent(query)}&limit=${size}&offset=${page * size}&index=relevance&facets=${encodeURIComponent(facets)}`
  )
  return result.hits.map(hitToPluginBase)
}

export async function getModrinthProject(idOrSlug: string): Promise<PluginBase> {
  const p = await apiFetch<ModrinthProject>('modrinth', `/project/${idOrSlug}`)
  const plugin = projectToPluginBase(p)

  // 详情接口不直接返回作者名，通过团队接口补全
  if (p.team) {
    try {
      const members = await getModrinthTeamMembers(p.team)
      const owner = members.find(member => member.user?.username)?.user
      if (owner) {
        plugin.author = owner.username
        plugin.authorId = owner.id
      }
    } catch {
      // 团队信息不可用时保留空作者，不阻塞详情展示
    }
  }

  return plugin
}

export async function getModrinthPopular(page = 0, size = 10): Promise<PluginBase[]> {
  const facets = JSON.stringify([['project_type:plugin']])
  const result = await apiFetch<ModrinthSearchResult>(
    'modrinth',
    `/search?limit=${size}&offset=${page * size}&index=downloads&facets=${encodeURIComponent(facets)}`
  )
  return result.hits.map(hitToPluginBase)
}

async function getModrinthTeamMembers(teamId: string): Promise<{ user: { username: string; id: string } }[]> {
  return apiFetch<{ user: { username: string; id: string } }[]>('modrinth', `/team/${teamId}/members`)
}

export async function getModrinthUserProjects(userId: string): Promise<PluginBase[]> {
  const projects = await apiFetch<ModrinthProject[]>('modrinth', `/user/${userId}/projects`)
  return projects.map(projectToPluginBase)
}
