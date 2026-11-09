import App from '@/App'
import { getPublishedProjects } from '@/server/projects'

export default async function HomePage() {
  const projects = await getPublishedProjects()
  return <App projects={projects} />
}
