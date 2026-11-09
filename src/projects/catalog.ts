import type { PlatformId } from '@osempro/simulator/types'

export interface PublishedProject {
  id: string
  title: string
  description: string
  platform: PlatformId
  publishedAt: string
  popularity: number
  url: string
}

export function searchProjects(projects: readonly PublishedProject[], search: string, platform: PlatformId | 'all'): PublishedProject[] {
  const query = search.trim().toLowerCase()
  return projects.filter(project => {
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
