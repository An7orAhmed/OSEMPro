import type { PlatformId } from '../engine'

export interface PublishedProject {
  id: string
  title: string
  description: string
  platform: PlatformId
  publishedAt: string
  popularity: number
  url: string
}

const publishedProjects: readonly PublishedProject[] = []

export function searchProjects(search: string, platform: PlatformId | 'all'): PublishedProject[] {
  const query = search.trim().toLowerCase()
  return publishedProjects.filter(project => {
    const matchesPlatform = platform === 'all' || project.platform === platform
    const matchesQuery = !query || `${project.title} ${project.description} ${project.platform}`.toLowerCase().includes(query)
    return matchesPlatform && matchesQuery
  })
}

export function recentProjects(projects: readonly PublishedProject[]): PublishedProject[] {
  return [...projects].sort((first, second) => Date.parse(second.publishedAt) - Date.parse(first.publishedAt)).slice(0, 6)
}

export function popularProjects(projects: readonly PublishedProject[]): PublishedProject[] {
  return [...projects].sort((first, second) => second.popularity - first.popularity).slice(0, 6)
}
