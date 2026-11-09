'use client'

import { useMemo, useState } from 'react'
import { engineCandidates } from '@osempro/simulator/catalog'
import type { PlatformId } from '@osempro/simulator/types'
import { popularProjects, recentProjects, searchProjects } from './projects/catalog'
import type { PublishedProject } from './projects/catalog'

type ProjectGroupProps = {
  title: string
  description: string
  projects: PublishedProject[]
  icon: 'clock' | 'spark'
}

function Symbol({ name, size = 20 }: { name: 'search' | 'arrow' | 'github' | 'clock' | 'spark' | 'cpu', size?: number }) {
  const paths = {
    search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
    arrow: <><path d="M7 17 17 7M8 7h9v9" /></>,
    github: <><path d="M9 19c-4 1-4-2-6-2m12 4v-3.5a3 3 0 0 0-.8-2.3c2.7-.3 5.5-1.3 5.5-6A4.5 4.5 0 0 0 18.5 5 4 4 0 0 0 18.4 2S17 2 15 4a15 15 0 0 0-6 0C7 2 5.6 2 5.6 2A4 4 0 0 0 5.5 5a4.5 4.5 0 0 0-1.2 3.2c0 4.7 2.8 5.7 5.5 6A3 3 0 0 0 9 17.5V21" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    spark: <><path d="m12 2 2.1 7.9L22 12l-7.9 2.1L12 22l-2.1-7.9L2 12l7.9-2.1L12 2Z" /></>,
    cpu: <><rect x="5" y="5" width="14" height="14" rx="2" /><rect x="9" y="9" width="6" height="6" rx="1" /><path d="M9 2v3m6-3v3M9 19v3m6-3v3M2 9h3m-3 6h3m14-6h3m-3 6h3" /></>
  }

  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>
}

function ProjectGroup({ title, description, projects, icon }: ProjectGroupProps) {
  return (
    <section className="project-group" aria-label={title}>
      <div className="section-heading">
        <div className="section-heading-text">
          <span className="section-symbol"><Symbol name={icon} size={18} /></span>
          <h2>{title}</h2>
        </div>
        <span className="section-description">{description}</span>
      </div>
      {projects.length ? (
        <div className="project-grid">
          {projects.map(project => (
            <a className="project-card" key={project.id} href={project.url}>
              <div className="project-card-icon"><Symbol name="cpu" size={22} /></div>
              <span className="project-platform">{project.platform.toUpperCase()}</span>
              <h3>{project.title}</h3>
              <p>{project.description}</p>
              <span className="project-open"><Symbol name="arrow" size={17} /></span>
            </a>
          ))}
        </div>
      ) : (
        <div className="empty-projects">
          <div className="empty-graphic"><Symbol name="cpu" size={25} /></div>
          <span>No projects published yet</span>
        </div>
      )}
    </section>
  )
}

function App({ projects }: { projects: PublishedProject[] }) {
  const [search, setSearch] = useState('')
  const [platform, setPlatform] = useState<PlatformId | 'all'>('all')
  const filteredProjects = useMemo(() => searchProjects(projects, search, platform), [projects, search, platform])
  const recent = useMemo(() => recentProjects(filteredProjects), [filteredProjects])
  const popular = useMemo(() => popularProjects(filteredProjects), [filteredProjects])

  return (
    <div className="site-shell">
      <header className="site-header">
        <div className="container header-inner">
          <a className="brand" href="/" aria-label="OSEMPro home">
            <img src="/logo-full.png" alt="OSEMPro" />
          </a>
          <nav aria-label="Main navigation">
            <a className="nav-link" href="#projects">Projects</a>
            <a className="nav-link" href="#engines">Engines</a>
            <a className="github-link" href="https://github.com/An7orAhmed/OSEMPro" target="_blank" rel="noopener noreferrer">
              <Symbol name="github" size={18} /><span>GitHub</span><Symbol name="arrow" size={15} />
            </a>
          </nav>
        </div>
      </header>

      <main>
        <section className="hero container">
          <div className="hero-art" aria-hidden="true"><span className="art-core" /><span className="art-ring art-ring-one" /><span className="art-ring art-ring-two" /><span className="art-node art-node-one" /><span className="art-node art-node-two" /><span className="art-node art-node-three" /></div>
          <div className="hero-content">
            <div className="eyebrow"><span className="eyebrow-dot" /> OPEN SOURCE EMBEDDED PROJECT</div>
            <h1>Firmware meets<br /><span>virtual hardware.</span></h1>
            <p>Discover embedded projects. Build and simulate in your browser.</p>
            <label className="search-box" htmlFor="project-search">
              <Symbol name="search" size={21} />
              <input id="project-search" type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search projects, boards, or chips" autoComplete="off" />
              <span className="search-hint">Explore</span>
            </label>
            <div className="platform-filters" role="group" aria-label="Filter projects by platform">
              <button className={platform === 'all' ? 'filter-chip active' : 'filter-chip'} type="button" onClick={() => setPlatform('all')}>All platforms</button>
              {engineCandidates.map(candidate => (
                <button className={platform === candidate.id ? 'filter-chip active' : 'filter-chip'} type="button" key={candidate.id} onClick={() => setPlatform(candidate.id)}>{candidate.name}</button>
              ))}
            </div>
          </div>
        </section>

        <div className="container main-content" id="projects">
          <div className="explore-heading">
            <span className="overline">EXPLORE OSEMPRO</span>
            <h2>Projects</h2>
          </div>
          <div className="project-sections">
            <ProjectGroup title="Recently added" description="Latest community projects" projects={recent} icon="clock" />
            <ProjectGroup title="Most popular" description="Top community projects" projects={popular} icon="spark" />
          </div>

          <section className="engines-section" id="engines">
            <div className="section-heading engines-heading">
              <div className="section-heading-text">
                <span className="section-symbol"><Symbol name="cpu" size={18} /></span>
                <h2>Engine research</h2>
              </div>
              <span className="section-description">Open source emulator candidates</span>
            </div>
            <div className="engine-grid">
              {engineCandidates.map(candidate => (
                <a key={candidate.id} href={candidate.source} target="_blank" rel="noopener noreferrer" className="engine-item" aria-label={`${candidate.name}: ${candidate.provider} source`}>
                  <span className="engine-name">{candidate.name}</span>
                  <span className="engine-provider">{candidate.provider}</span>
                  <Symbol name="arrow" size={15} />
                </a>
              ))}
            </div>
          </section>
        </div>
      </main>

      <footer className="site-footer">
        <div className="container footer-inner">
          <span>OSEMPro <span className="footer-divider">/</span> Open Source Embedded Project</span>
          <a href="https://github.com/An7orAhmed/OSEMPro" target="_blank" rel="noopener noreferrer">Source code <Symbol name="arrow" size={14} /></a>
        </div>
      </footer>
    </div>
  )
}

export default App
