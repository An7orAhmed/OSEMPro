'use client'

import Image from 'next/image'
import { useMemo, useState } from 'react'
import { engineCandidates } from '@osempro/simulator/catalog'
import { renvoTargets } from '@osempro/simulator/renvo-targets'
import { picSimTargets } from '@osempro/simulator/picsim-targets'
import { plannedTargets } from '@osempro/simulator/planned-targets'
import { stm32f4Targets } from '@osempro/simulator/stm32f4-targets'
import type { PlatformId } from '@osempro/simulator/types'
import { popularProjects, recentProjects, searchProjects } from './projects/catalog'
import type { PublishedProject } from './projects/catalog'

type IconName = 'search' | 'arrow' | 'github' | 'clock' | 'star' | 'cpu' | 'chevron'

function Icon({ name, size = 19 }: { name: IconName, size?: number }) {
  const paths = {
    search: <><circle cx="10.8" cy="10.8" r="6.6" /><path d="m16 16 5 5" /></>,
    arrow: <><path d="M7 17 17 7M8 7h9v9" /></>,
    github: <><path d="M9 19c-4 1-4-2-6-2m12 4v-3.5a3 3 0 0 0-.8-2.3c2.7-.3 5.5-1.3 5.5-6A4.5 4.5 0 0 0 18.5 5 4 4 0 0 0 18.4 2S17 2 15 4a15 15 0 0 0-6 0C7 2 5.6 2 5.6 2A4 4 0 0 0 5.5 5a4.5 4.5 0 0 0-1.2 3.2c0 4.7 2.8 5.7 5.5 6A3 3 0 0 0 9 17.5V21" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    star: <><path d="m12 2 2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5L12 2Z" /></>,
    cpu: <><rect x="5" y="5" width="14" height="14" rx="2" /><path d="M9 9h6v6H9zM9 2v3m6-3v3M9 19v3m6-3v3M2 9h3m-3 6h3m14-6h3m-3 6h3" /></>,
    chevron: <path d="m9 18 6-6-6-6" />
  }

  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[name]}
    </svg>
  )
}

function ProjectSection({ title, id, icon, projects }: {
  title: string
  id: string
  icon: IconName
  projects: PublishedProject[]
}) {
  return (
    <section id={id} className="collection-section" aria-labelledby={`${id}-title`}>
      <div className="collection-heading">
        <div className="collection-heading-title">
          <Icon name={icon} size={17} />
          <h2 id={`${id}-title`}>{title}</h2>
        </div>
        <span className="collection-count">{projects.length ? `${projects.length} projects` : 'No projects yet'}</span>
      </div>
      {projects.length ? (
        <div className="project-grid">
          {projects.map(project => (
            <a href={project.url} key={project.id} className="project-card">
              <div className="project-card-top">
                <span className="project-chip">{project.platform.toUpperCase()}</span>
                <Icon name="arrow" size={16} />
              </div>
              <h3>{project.title}</h3>
              <p>{project.description}</p>
            </a>
          ))}
        </div>
      ) : (
        <div className="empty-collection">
          <Icon name="cpu" size={19} />
          <span>Published projects will appear here.</span>
        </div>
      )}
    </section>
  )
}

export default function App({ projects }: { projects: PublishedProject[] }) {
  const [query, setQuery] = useState('')
  const [platform, setPlatform] = useState<PlatformId | 'all'>('all')
  const [searchActive, setSearchActive] = useState(false)
  const matchingProjects = useMemo(() => searchProjects(projects, query, platform), [projects, query, platform])
  const recent = useMemo(() => recentProjects(matchingProjects), [matchingProjects])
  const popular = useMemo(() => popularProjects(matchingProjects), [matchingProjects])
  const matchingEngines = useMemo(() => {
    const term = query.trim().toLowerCase()
    if (!term) return []
    return engineCandidates.filter(engine => {
      const renvo = (renvoTargets as Partial<Record<PlatformId, readonly string[]>>)[engine.id] ?? []
      const picsim = (picSimTargets as Partial<Record<PlatformId, readonly string[]>>)[engine.id] ?? []
      const pending = plannedTargets[engine.id]?.map(profile => profile.id) ?? []
      const f4 = engine.id === 'stm32' ? stm32f4Targets.map(profile => profile.id) : []
      return [engine.name, engine.provider, engine.architecture, ...renvo, ...picsim, ...pending, ...f4]
        .join(' ')
        .toLowerCase()
        .includes(term)
    }).slice(0, 4)
  }, [query])
  const hasQuery = Boolean(query.trim())

  function exploreProjects() {
    setSearchActive(false)
    document.getElementById('projects')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div className="site-shell">
      <section className="landing" aria-label="OSEMPro home">
        <header className="site-header">
          <a className="header-brand" href="/" aria-label="OSEMPro home">
            <Image src="/logo-sq.png" width={30} height={30} alt="" />
            <span>OSEMPro</span>
          </a>
          <a className="header-github" href="https://github.com/An7orAhmed/OSEMPro" target="_blank" rel="noopener noreferrer" aria-label="OSEMPro source on GitHub">
            <Icon name="github" size={20} />
          </a>
        </header>

        <main className="landing-main">
          <div className="hero-content">
            <div className="hero-symbol">
              <Image src="/logo-sq.png" width={112} height={112} alt="OSEMPro icon" priority />
            </div>
            <h1 className="hero-title">OSEM<span>Pro</span></h1>
            <p className="hero-tagline">Open Source Embedded Project</p>

            <div className="search-area">
              <form className="search-glow" role="search" onSubmit={event => { event.preventDefault(); exploreProjects() }}>
                <div className="search-field">
                  <input
                    value={query}
                    onChange={event => { setQuery(event.target.value); setSearchActive(true) }}
                    onFocus={() => setSearchActive(true)}
                    onKeyDown={event => {
                      if (event.key === 'Escape') {
                        setSearchActive(false)
                        event.currentTarget.blur()
                      }
                    }}
                    type="search"
                    name="projects"
                    aria-label="Search OSEMPro projects"
                    placeholder="Search projects, boards, chips..."
                    autoComplete="off"
                  />
                  <button type="submit" aria-label="Explore search results">
                    <Icon name="search" size={21} />
                  </button>
                </div>
              </form>

              {searchActive && hasQuery && (
                <div className="search-results" role="region" aria-label="Search suggestions">
                  {matchingProjects.length > 0 && (
                    <>
                      <div className="results-label">Projects</div>
                      {matchingProjects.slice(0, 4).map(project => (
                        <a href={project.url} key={project.id} className="result-item">
                          <Icon name="cpu" size={17} />
                          <span>{project.title}</span>
                          <span className="result-meta">{project.platform.toUpperCase()}</span>
                        </a>
                      ))}
                    </>
                  )}
                  {matchingEngines.length > 0 && (
                    <>
                      <div className="results-label">Engine sources</div>
                      {matchingEngines.map(engine => (
                        <a href={engine.source} target="_blank" rel="noopener noreferrer" key={engine.id} className="result-item">
                          <Icon name="cpu" size={17} />
                          <span>{engine.name}</span>
                          <span className="result-meta">{engine.provider}</span>
                        </a>
                      ))}
                    </>
                  )}
                  {matchingProjects.length === 0 && matchingEngines.length === 0 && (
                    <p className="no-results">No matching projects or engines.</p>
                  )}
                </div>
              )}
            </div>

            <button className="browse-button" type="button" onClick={exploreProjects}>
              Explore projects <Icon name="arrow" size={14} />
            </button>
          </div>
        </main>

        <nav className="landing-footer" aria-label="Explore OSEMPro">
          <a href="#recent">Recently added</a>
          <a href="#popular">Most popular</a>
          <a href="#engines">Engines</a>
          <a href="https://github.com/An7orAhmed/OSEMPro" target="_blank" rel="noopener noreferrer">GitHub</a>
        </nav>
      </section>

      <div className="browse-area" id="projects">
        <div className="browse-container">
          <div className="browse-topline">
            <span>EXPLORE</span>
            <div className="platform-filters" role="group" aria-label="Filter projects by platform">
              <button type="button" onClick={() => setPlatform('all')} className={platform === 'all' ? 'filter-chip active' : 'filter-chip'} aria-pressed={platform === 'all'}>All</button>
              {engineCandidates.map(engine => (
                <button type="button" key={engine.id} onClick={() => setPlatform(engine.id)} className={platform === engine.id ? 'filter-chip active' : 'filter-chip'} aria-pressed={platform === engine.id}>{engine.name}</button>
              ))}
            </div>
          </div>

          <ProjectSection title="Recently added" id="recent" icon="clock" projects={recent} />
          <ProjectSection title="Most popular" id="popular" icon="star" projects={popular} />

          <section className="collection-section engine-section" id="engines" aria-labelledby="engines-title">
            <div className="collection-heading">
              <div className="collection-heading-title">
                <Icon name="cpu" size={17} />
                <h2 id="engines-title">Engine sources</h2>
              </div>
              <span className="collection-count">Open source options</span>
            </div>
            <div className="engine-grid">
              {engineCandidates.map(engine => (
                <a href={engine.source} key={engine.id} target="_blank" rel="noopener noreferrer" className="engine-card">
                  <span className="engine-title">{engine.name}</span>
                  <span className="engine-provider">{engine.provider}</span>
                  <Icon name="arrow" size={15} />
                </a>
              ))}
            </div>
          </section>
        </div>
      </div>

      <footer className="site-footer">
        <span>OSEMPro</span>
        <span>Open Source Embedded Project</span>
      </footer>
    </div>
  )
}
