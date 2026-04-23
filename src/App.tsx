/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Network, 
  Building2, 
  Folder,
  FileText, 
  Code, 
  ChevronRight, 
  LayoutDashboard,
  Save,
  Plus,
  Trash2,
  Globe,
  Database,
  ExternalLink,
  Search,
  CheckCircle2,
  AlertCircle,
  User
} from 'lucide-react';
import { cn } from './lib/utils';
import { searchKnowledgeGraph, KGEntity } from './lib/kgService';
import { validateGraph, ValidationResult, getSchemaType, SchemaType } from './lib/schemaService';

// --- Types ---
interface Project {
  id: string;
  name: string;
  profile: Profile;
  nodes: Node[];
  updatedAt: number;
}

interface Profile {
  name: string;
  url: string;
  type: string;
  logo: string;
  sameAs: string[];
  kgmid?: string;
  id: string; // @id
  telephone?: string;
  address?: {
    streetAddress: string;
    addressLocality: string;
    addressRegion: string;
    postalCode: string;
    addressCountry: string;
  };
  image?: string;
  extraData?: Record<string, any>;
}

interface Node {
  id: string; // internal id
  type: string;
  name: string;
  url: string;
  data: Record<string, any>;
  linkedToProfile: boolean;
}

export default function App() {
  const [step, setStep] = useState<'projects' | 'profile' | 'graph' | 'preview'>('projects');
  const [projects, setProjects] = useState<Project[]>(() => {
    const saved = localStorage.getItem('graphscale_projects');
    return saved ? JSON.parse(saved) : [];
  });
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);

  const [profile, setProfile] = useState<Profile>({
    name: '',
    url: '',
    type: 'Organization',
    logo: '',
    sameAs: [],
    id: 'https://example.com/#organization',
    address: {
      streetAddress: '',
      addressLocality: '',
      addressRegion: '',
      postalCode: '',
      addressCountry: 'NO'
    },
    extraData: {}
  });
  const [nodes, setNodes] = useState<Node[]>([]);
  const [kgResults, setKgResults] = useState<KGEntity[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [validationResults, setValidationResults] = useState<ValidationResult[]>([]);

  // --- Project Functions ---
  const saveProjectsToStorage = (updatedProjects: Project[]) => {
    localStorage.setItem('graphscale_projects', JSON.stringify(updatedProjects));
    setProjects(updatedProjects);
  };

  const createNewProject = (name: string = 'Nytt Prosjekt') => {
    const newProject: Project = {
      id: Math.random().toString(36).substr(2, 9),
      name,
      profile: {
        name: '',
        url: '',
        type: 'Organization',
        logo: '',
        sameAs: [],
        id: 'https://example.com/#organization',
        address: { streetAddress: '', addressLocality: '', addressRegion: '', postalCode: '', addressCountry: 'NO' },
        extraData: {}
      },
      nodes: [],
      updatedAt: Date.now()
    };
    const updated = [...projects, newProject];
    saveProjectsToStorage(updated);
    loadProject(newProject.id, updated);
  };

  const saveCurrentProject = () => {
    if (!currentProjectId) return;
    const updated = projects.map(p => {
      if (p.id === currentProjectId) {
        return {
          ...p,
          profile,
          nodes,
          updatedAt: Date.now()
        };
      }
      return p;
    });
    saveProjectsToStorage(updated);
  };

  const loadProject = (id: string, list: Project[] = projects) => {
    const project = list.find(p => p.id === id);
    if (project) {
      setCurrentProjectId(project.id);
      setProfile(project.profile);
      setNodes(project.nodes);
      setStep('profile');
    }
  };

  const deleteProject = (id: string) => {
    const updated = projects.filter(p => p.id !== id);
    saveProjectsToStorage(updated);
    if (currentProjectId === id) {
      setCurrentProjectId(null);
    }
  };

  // Auto-save effect
  useEffect(() => {
    if (currentProjectId) {
      const timer = setTimeout(() => {
        saveCurrentProject();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [profile, nodes, currentProjectId]);

  // --- Validation ---
  useEffect(() => {
    const jsonStr = generateJsonLd();
    try {
      const graph = JSON.parse(jsonStr)['@graph'];
      const results = validateGraph(graph);
      setValidationResults(results);
    } catch (e) {
      console.error('Validation error:', e);
    }
  }, [profile, nodes]);

  // --- Step 1 functions ---
  const handleProfileSearch = async (query: string) => {
    if (!query) return;
    setIsSearching(true);
    const results = await searchKnowledgeGraph(query);
    setKgResults(results);
    setIsSearching(false);
  };

  const selectKgEntity = (entity: KGEntity) => {
    setProfile(prev => ({
      ...prev,
      name: entity.name,
      kgmid: entity.id,
      sameAs: [...new Set([...prev.sameAs, `https://kgsearch.googleapis.com/v1/entities/m/${entity.id}`])]
    }));
    setKgResults([]);
  };

  // --- Step 2 functions ---
  const addNode = (type: string) => {
    const newNode: Node = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      name: `Ny ${type}`,
      url: `${profile.url}/new-${type.toLowerCase()}`,
      data: {},
      linkedToProfile: true
    };
    setNodes(prev => [...prev, newNode]);
  };

  const removeNode = (id: string) => {
    setNodes(prev => prev.filter(n => n.id !== id));
  };

  // --- Output generation ---
  const generateJsonLd = () => {
    const graph: any[] = [
      {
        "@type": profile.type,
        "@id": profile.id,
        "name": profile.name,
        "url": profile.url,
        "logo": profile.logo,
        "image": profile.image || profile.logo,
        "telephone": profile.telephone,
        "sameAs": [...profile.sameAs],
        ...(profile.extraData || {})
      }
    ];

    if (profile.address?.streetAddress) {
      graph[0].address = {
        "@type": "PostalAddress",
        ...profile.address
      };
    }

    if (profile.kgmid) {
      graph[0].sameAs.push(`https://kgsearch.googleapis.com/v1/entities/m/${profile.kgmid}`);
    }

    nodes.forEach(node => {
      const nodeObj: any = {
        "@type": node.type,
        "@id": `${node.url}/#${node.type.toLowerCase()}`,
        "name": node.name,
        "url": node.url,
        ...node.data
      };

      if (node.linkedToProfile) {
        nodeObj.publisher = { "@id": profile.id };
        nodeObj.author = nodeObj.author || { "@id": profile.id }; // Default author to org if not set
        nodeObj.about = { "@id": profile.id };
        nodeObj.provider = nodeObj.provider || { "@id": profile.id };
      }

      if (node.type === 'FAQPage' && node.data.questions) {
        nodeObj.mainEntity = node.data.questions.map((q: any) => ({
          "@type": "Question",
          "name": q.name,
          "acceptedAnswer": q.acceptedAnswer
        }));
        delete nodeObj.questions;
      }

      graph.push(nodeObj);
    });

    return JSON.stringify({
      "@context": "https://schema.org",
      "@graph": graph
    }, null, 2);
  };

  return (
    <div className="flex flex-col h-screen w-full bg-[#F1F5F9] font-sans overflow-hidden text-slate-900 selection:bg-blue-100 selection:text-blue-900">
      {/* Header */}
      <header className="h-14 bg-white border-b border-slate-200 px-6 flex items-center justify-between shadow-sm z-10 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">G</div>
          <h1 className="text-lg font-semibold tracking-tight">GraphBuilder <span className="text-slate-400 font-normal">/ SEO Schema Engine</span></h1>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 text-xs font-medium bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-full border border-emerald-100">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
            Google KG API Connected
          </div>
          <button className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-blue-700 transition-colors shadow-sm">
            <Save size={14} />
            Save Project
          </button>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden">
        {/* Sidebar Nav */}
        <aside className="w-64 bg-slate-50 border-r border-slate-200 flex flex-col p-4 shrink-0">
          <div className="mb-6">
            <p className="text-[10px] uppercase font-bold text-slate-400 mb-3 tracking-widest">Project Configuration</p>
            <nav className="space-y-1">
              <SidebarLink 
                active={step === 'projects'} 
                onClick={() => setStep('projects')}
                icon={<Folder size={16} />}
                label="Hjem / Prosjekter"
              />
              <SidebarLink 
                active={step === 'profile'} 
                onClick={() => setStep('profile')}
                icon={<Building2 size={16} />}
                label="Global Profile"
              />
              <SidebarLink 
                active={step === 'graph'} 
                onClick={() => setStep('graph')}
                icon={<LayoutDashboard size={16} />}
                label="Content Strategy"
              />
              <SidebarLink 
                active={step === 'preview'} 
                onClick={() => setStep('preview')}
                icon={<Code size={16} />}
                label="JSON-LD Output"
                badge={validationResults.length > 0 ? validationResults.length : undefined}
                badgeType={validationResults.some(r => r.type === 'error') ? 'error' : 'warning'}
              />
            </nav>
          </div>

          <div className="flex-1 overflow-hidden flex flex-col">
            <div className="flex justify-between items-center mb-3">
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Active Entities</p>
              <button 
                onClick={() => setStep('graph')}
                className="text-blue-600 text-[10px] font-bold hover:underline"
              >
                + ADD
              </button>
            </div>
            <div className="space-y-1 overflow-y-auto pr-1 custom-scrollbar">
              <div className={cn(
                "px-3 py-2 text-xs border-l-2 font-medium transition-colors cursor-pointer",
                step === 'profile' ? "border-blue-600 bg-blue-50 text-blue-800" : "border-slate-200 text-slate-500 hover:text-slate-800"
              )} onClick={() => setStep('profile')}>
                {profile.name || 'Primary Org'} ({profile.type})
              </div>
              {nodes.map(node => (
                <div 
                  key={node.id} 
                  className={cn(
                    "px-3 py-2 text-xs border-l-2 font-medium transition-colors cursor-pointer truncate",
                    step === 'graph' ? "border-blue-600 bg-blue-50 text-blue-800" : "border-slate-200 text-slate-500 hover:text-slate-800"
                  )}
                  onClick={() => setStep('graph')}
                >
                  {node.name} ({node.type})
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 p-4 bg-slate-900 rounded-xl text-white">
            <p className="text-[10px] font-bold text-slate-400 mb-1">GRAPH SUMMARY</p>
            <p className="text-xs text-slate-300">{nodes.length + 1} Entities in Graph</p>
            <button 
              onClick={() => {
                navigator.clipboard.writeText(generateJsonLd());
                alert('Copied to clipboard!');
              }}
              className="mt-3 w-full py-2 bg-blue-600 rounded-md text-xs font-bold hover:bg-blue-700 transition-colors"
            >
              COPY @GRAPH
            </button>
          </div>
        </aside>

        {/* Editor Area */}
        <section className="flex-1 flex overflow-hidden bg-white">
          <AnimatePresence mode="wait">
            {step === 'projects' && (
              <motion.div
                key="projects"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="flex-1 p-12 overflow-y-auto"
              >
                <div className="max-w-4xl mx-auto">
                  <div className="flex items-center justify-between mb-8">
                    <div>
                      <h2 className="text-3xl font-black text-slate-800 tracking-tight">Dine Prosjekter</h2>
                      <p className="text-slate-500 font-medium mt-1">Administrer Schema-grafer for ulike kunder og nettsider.</p>
                    </div>
                    <button 
                      onClick={() => {
                        const name = prompt('Navn på nytt prosjekt/kunde:', 'Ny Kunde');
                        if (name) createNewProject(name);
                      }}
                      className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
                    >
                      <Plus size={20} /> NYTT PROSJEKT
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {projects.map((p) => (
                      <div 
                        key={p.id} 
                        className={cn(
                          "group p-6 rounded-2xl border-2 transition-all cursor-pointer relative",
                          currentProjectId === p.id ? "border-blue-500 bg-blue-50/30 shadow-md" : "border-slate-100 hover:border-slate-200 hover:bg-slate-50"
                        )}
                        onClick={() => loadProject(p.id)}
                      >
                        <div className="mb-4">
                          <div className={cn(
                            "w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-colors",
                            currentProjectId === p.id ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-400 group-hover:bg-slate-200 group-hover:text-slate-500"
                          )}>
                            <Building2 size={24} />
                          </div>
                          <h3 className="text-lg font-bold text-slate-800 line-clamp-1">{p.name}</h3>
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
                            {p.profile.type} • {p.nodes.length} Noder
                          </p>
                        </div>
                        
                        <div className="flex items-center justify-between mt-6">
                          <span className="text-[10px] font-bold text-slate-400">
                             SIST ENDRET: {new Date(p.updatedAt).toLocaleDateString('no-NO')}
                          </span>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm('Er du sikker på at du vil slette dette prosjektet?')) {
                                deleteProject(p.id);
                              }
                            }}
                            className="p-2 text-slate-300 hover:text-rose-500 transition-colors rounded-lg hover:bg-rose-50"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>

                        {currentProjectId === p.id && (
                          <div className="absolute top-4 right-4 bg-blue-500 text-white text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest">
                            Aktiv
                          </div>
                        )}
                      </div>
                    ))}
                    
                    {projects.length === 0 && (
                      <div className="col-span-full py-20 text-center border-4 border-dashed border-slate-100 rounded-3xl">
                        <Folder size={48} className="mx-auto text-slate-200 mb-4" />
                        <h4 className="text-xl font-bold text-slate-400">Ingen prosjekter lagret ennå</h4>
                        <p className="text-slate-300 text-sm mt-2">Start med å opprette ditt første prosjekt over.</p>
                      </div>
                    )}
                  </div>

                  <div className="mt-16 p-8 bg-slate-50 rounded-3xl border border-slate-200">
                    <h4 className="text-sm font-bold text-slate-800 mb-4 uppercase tracking-widest">Import / Backup</h4>
                    <div className="flex gap-4">
                       <button 
                         onClick={() => {
                           const input = document.createElement('input');
                           input.type = 'file';
                           input.accept = '.json';
                           input.onchange = (e) => {
                             const file = (e.target as any).files[0];
                             const reader = new FileReader();
                             reader.onload = (event) => {
                               try {
                                 const imported = JSON.parse(event.target?.result as string);
                                 if (confirm('Vil du importere disse prosjektene? Dette vil overskrive eksisterende liste.')) {
                                   saveProjectsToStorage(imported);
                                 }
                               } catch (err) {
                                 alert('Ugyldig filformat');
                               }
                             };
                             reader.readAsText(file);
                           };
                           input.click();
                         }}
                         className="flex-1 py-4 bg-white border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-100 transition-all flex items-center justify-center gap-2"
                       >
                         <Database size={18} /> LAST OPP JSON BACKUP
                       </button>
                       <button 
                         onClick={() => {
                           const blob = new Blob([JSON.stringify(projects, null, 2)], { type: 'application/json' });
                           const url = URL.createObjectURL(blob);
                           const a = document.createElement('a');
                           a.href = url;
                           a.download = `graphscale_backup_${new Date().toISOString().split('T')[0]}.json`;
                           a.click();
                         }}
                         className="flex-1 py-4 bg-white border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-100 transition-all flex items-center justify-center gap-2"
                       >
                         <Save size={18} /> LAST NED JSON BACKUP
                       </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {step === 'profile' && (
              <motion.div
                key="profile"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex-1 flex overflow-hidden lg:flex-row flex-col"
              >
                <div className="lg:w-1/2 p-8 border-r border-slate-100 overflow-y-auto">
                  <div className="mb-8">
                    <h2 className="text-2xl font-bold text-slate-800 mb-1">Global Organization</h2>
                    <p className="text-sm text-slate-500">Define the foundational @id entity for your knowledge graph.</p>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Entity Search (Google KG)</label>
                      <div className="relative">
                        <input 
                          type="text" 
                          value={profile.name}
                          onChange={(e) => {
                            setProfile({...profile, name: e.target.value});
                            handleProfileSearch(e.target.value);
                          }}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                          placeholder="Search business name..."
                        />
                        <div className="absolute right-3 top-3.5 text-slate-400 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
                          {isSearching ? <Search size={12} className="animate-spin" /> : <Search size={12} />}
                          API
                        </div>
                      </div>
                      
                      {kgResults.length > 0 && (
                        <div className="mt-2 bg-slate-900 text-white p-2 rounded-lg shadow-xl max-h-48 overflow-y-auto z-20 relative">
                          {kgResults.map(res => (
                            <button 
                              key={res.id}
                              onClick={() => selectKgEntity(res)}
                              className="w-full text-left p-2 hover:bg-slate-800 rounded text-xs transition-colors flex justify-between items-center group"
                            >
                              <span>{res.name} <span className="opacity-40 italic">({res.description})</span></span>
                              <ExternalLink size={10} className="opacity-40 group-hover:opacity-100" />
                            </button>
                          ))}
                        </div>
                      )}

                      {profile.kgmid && (
                        <div className="mt-2 p-3 bg-blue-50 border border-blue-100 rounded-lg flex items-center justify-between">
                          <span className="text-[10px] text-blue-700 font-mono">kgmid: /m/{profile.kgmid}</span>
                          <span className="text-[10px] bg-blue-600 text-white px-2 py-0.5 rounded font-bold uppercase tracking-wider">Linked</span>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Organization Type</label>
                        <select 
                          value={profile.type}
                          onChange={(e) => setProfile({...profile, type: e.target.value})}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option>Organization</option>
                          <option>LocalBusiness</option>
                          <option>Dentist</option>
                          <option>Restaurant</option>
                          <option>MedicalBusiness</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Canonical URL</label>
                        <input 
                          type="url" 
                          value={profile.url}
                          onChange={(e) => setProfile({...profile, url: e.target.value})}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="https://example.no"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Logo & Branding</label>
                      <div className="grid grid-cols-2 gap-4">
                        <input 
                          type="url" 
                          value={profile.logo}
                          onChange={(e) => setProfile({...profile, logo: e.target.value})}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Logo URL"
                        />
                        <input 
                          type="url" 
                          value={profile.image}
                          onChange={(e) => setProfile({...profile, image: e.target.value})}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Main Image URL"
                        />
                      </div>
                    </div>

                    {['LocalBusiness', 'Dentist', 'Restaurant', 'MedicalBusiness'].includes(profile.type) && (
                      <div className="space-y-4 pt-4 border-t border-slate-100">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Lokal Bedriftsinformasjon</p>
                        <div>
                          <label className="block text-xs font-bold text-slate-400 mb-2">Telefon</label>
                          <input 
                            type="tel"
                            value={profile.telephone || ''}
                            onChange={(e) => setProfile({...profile, telephone: e.target.value})}
                            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="+47 123 45 678"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="block text-xs font-bold text-slate-400">Adresse</label>
                          <input 
                            type="text"
                            value={profile.address?.streetAddress || ''}
                            onChange={(e) => setProfile({...profile, address: { ...profile.address!, streetAddress: e.target.value}})}
                            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Gateadresse 1"
                          />
                          <div className="grid grid-cols-2 gap-2">
                            <input 
                              type="text"
                              value={profile.address?.postalCode || ''}
                              onChange={(e) => setProfile({...profile, address: { ...profile.address!, postalCode: e.target.value}})}
                              className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="Postnr"
                            />
                            <input 
                              type="text"
                              value={profile.address?.addressLocality || ''}
                              onChange={(e) => setProfile({...profile, address: { ...profile.address!, addressLocality: e.target.value}})}
                              className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="By"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="pt-6 border-t border-slate-100 space-y-4">
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tilleggsfelter (Dynamic)</p>
                        <PropertySelector 
                          type={profile.type} 
                          existingKeys={[...Object.keys(profile.extraData || {}), 'name', 'url', 'logo', 'telephone', 'address', 'image']}
                          onSelect={(propId) => {
                            setProfile({
                              ...profile,
                              extraData: { ...(profile.extraData || {}), [propId]: '' }
                            });
                          }}
                        />
                      </div>
                      <div className="space-y-3">
                        {Object.entries(profile.extraData || {}).map(([key, value]) => (
                          <div key={key} className="group/field relative">
                            <label className="text-[10px] font-bold text-slate-500 mb-1 flex items-center justify-between">
                              <span>{key.charAt(0).toUpperCase() + key.slice(1)}</span>
                              <button 
                                onClick={() => {
                                  const newData = { ...(profile.extraData || {}) };
                                  delete newData[key];
                                  setProfile({ ...profile, extraData: newData });
                                }}
                                className="opacity-0 group-hover/field:opacity-100 text-slate-300 hover:text-red-500 transition-opacity"
                              >
                                ×
                              </button>
                            </label>
                            <input 
                              type={key.toLowerCase().includes('date') ? 'date' : 'text'}
                              value={value as string}
                              onChange={(e) => {
                                setProfile({
                                  ...profile,
                                  extraData: { ...(profile.extraData || {}), [key]: e.target.value }
                                });
                              }}
                              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:ring-1 focus:ring-blue-500"
                              placeholder={`${key}...`}
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">GRAPH IDENTITY (@ID)</p>
                      <code className="text-xs font-mono text-blue-600 break-all">
                        {profile.url ? `${profile.url}/#organization` : 'Define URL to generate ID'}
                      </code>
                    </div>
                  </div>
                </div>
                <div className="lg:w-1/2 bg-slate-50 p-8 flex flex-col items-center justify-center text-center">
                  <div className="w-20 h-20 bg-blue-600/10 text-blue-600 rounded-2xl flex items-center justify-center mb-6">
                    <Building2 size={40} />
                  </div>
                  <h3 className="text-xl font-bold text-slate-800 mb-2">Entity Core</h3>
                  <p className="text-sm text-slate-500 max-w-xs">The Global Profile is the central node that connects all other pages in your graph.</p>
                  <button 
                    onClick={() => setStep('graph')}
                    className="mt-8 flex items-center gap-2 text-blue-600 font-bold text-sm hover:underline"
                  >
                    Manage Graph Strategy <ChevronRight size={16} />
                  </button>
                </div>
              </motion.div>
            )}

            {step === 'graph' && (
              <motion.div
                key="graph"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="flex-1 p-8 overflow-y-auto bg-slate-50"
              >
                <div className="max-w-4xl mx-auto space-y-8">
                  <header className="flex items-center justify-between">
                    <div>
                      <h2 className="text-2xl font-bold text-slate-800 mb-1">Content Strategy</h2>
                      <p className="text-sm text-slate-500">Add entities and link them to your global organization.</p>
                    </div>
                    <div className="flex gap-2">
                      <AddEntityButton onClick={() => addNode('Article')} icon={<FileText size={14} />} label="Article" />
                      <AddEntityButton onClick={() => addNode('Service')} icon={<Globe size={14} />} label="Service" />
                      <AddEntityButton onClick={() => addNode('FAQPage')} icon={<AlertCircle size={14} />} label="FAQ" />
                      <AddEntityButton onClick={() => addNode('Person')} icon={<User size={14} />} label="Person" />
                    </div>
                  </header>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {nodes.map(node => (
                      <div key={node.id} className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm group relative">
                        <button 
                          onClick={() => removeNode(node.id)}
                          className="absolute top-4 right-4 p-2 text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 size={14} />
                        </button>
                        <div className="flex items-center gap-2 mb-4">
                          <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center">
                            {node.type === 'Article' ? <FileText size={16} /> : node.type === 'Service' ? <Globe size={16} /> : node.type === 'Person' ? <User size={16} /> : <AlertCircle size={16} />}
                          </div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{node.type}</span>
                        </div>
                        <div className="space-y-4">
                          <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Entity Name</label>
                            <input 
                              type="text" 
                              value={node.name}
                              onChange={(e) => {
                                const newNodes = [...nodes];
                                const idx = newNodes.findIndex(n => n.id === node.id);
                                newNodes[idx].name = e.target.value;
                                setNodes(newNodes);
                              }}
                              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-1 focus:ring-blue-500"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Target URL</label>
                            <input 
                              type="url" 
                              value={node.url}
                              onChange={(e) => {
                                const newNodes = [...nodes];
                                const idx = newNodes.findIndex(n => n.id === node.id);
                                newNodes[idx].url = e.target.value;
                                setNodes(newNodes);
                              }}
                              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono outline-none focus:ring-1 focus:ring-blue-500"
                            />
                          </div>
                          <div className="flex items-center gap-2 pt-2">
                             <input 
                              type="checkbox" 
                              id={`link-${node.id}`}
                              checked={node.linkedToProfile}
                              onChange={(e) => {
                                const newNodes = [...nodes];
                                const idx = newNodes.findIndex(n => n.id === node.id);
                                newNodes[idx].linkedToProfile = e.target.checked;
                                setNodes(newNodes);
                              }}
                              className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                            />
                            <label htmlFor={`link-${node.id}`} className="text-xs font-medium text-slate-600 cursor-pointer">
                              Link to @organization ID
                            </label>
                          </div>
                        </div>

                        {/* Property Editor */}
                        <div className="mt-6 pt-6 border-t border-slate-100 space-y-4">
                          <div className="flex items-center justify-between">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Egenskaper & Data</p>
                            <PropertySelector 
                              type={node.type} 
                              existingKeys={Object.keys(node.data)}
                              onSelect={(propId) => {
                                const newNodes = [...nodes];
                                const nodeIdx = newNodes.findIndex(n => n.id === node.id);
                                newNodes[nodeIdx].data = { ...newNodes[nodeIdx].data, [propId]: '' };
                                setNodes(newNodes);
                              }}
                            />
                          </div>
                          
                          <div className="space-y-3">
                            {Object.entries(node.data).map(([key, value]) => {
                              if (key === 'questions') return null;
                              return (
                                <div key={key} className="group/field relative">
                                  <label className="text-[10px] font-bold text-slate-500 mb-1 flex items-center justify-between">
                                    <span>{key.charAt(0).toUpperCase() + key.slice(1)}</span>
                                    <button 
                                      onClick={() => {
                                        const newNodes = [...nodes];
                                        const idx = newNodes.findIndex(n => n.id === node.id);
                                        const newData = { ...newNodes[idx].data };
                                        delete newData[key];
                                        newNodes[idx].data = newData;
                                        setNodes(newNodes);
                                      }}
                                      className="opacity-0 group-hover/field:opacity-100 text-slate-300 hover:text-red-500 transition-opacity"
                                    >
                                      ×
                                    </button>
                                  </label>
                                  <input 
                                    type={key.toLowerCase().includes('date') ? 'date' : 'text'}
                                    value={value as string}
                                    onChange={(e) => {
                                      const newNodes = [...nodes];
                                      const idx = newNodes.findIndex(n => n.id === node.id);
                                      newNodes[idx].data = { ...newNodes[idx].data, [key]: e.target.value };
                                      setNodes(newNodes);
                                    }}
                                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:ring-1 focus:ring-blue-500"
                                    placeholder={`${key}...`}
                                  />
                                </div>
                              );
                            })}

                            {Object.keys(node.data).filter(k => k !== 'questions').length === 0 && (
                              <p className="text-[10px] text-slate-400 italic">Ingen ekstra felt lagt til ennå. Bruk knappen over for å legge til Schema-egenskaper.</p>
                            )}
                          </div>

                          {node.type === 'FAQPage' && (
                            <div className="space-y-3">
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Spørsmål & Svar (FAQ)</p>
                              {(node.data.questions || []).map((q: any, qIdx: number) => (
                                <div key={qIdx} className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2 relative group/item">
                                  <button 
                                    onClick={() => {
                                      const newNodes = [...nodes];
                                      const nIdx = newNodes.findIndex(n => n.id === node.id);
                                      const qs = [...(newNodes[nIdx].data.questions || [])];
                                      qs.splice(qIdx, 1);
                                      newNodes[nIdx].data.questions = qs;
                                      setNodes(newNodes);
                                    }}
                                    className="absolute top-2 right-2 text-slate-300 hover:text-red-500 opacity-0 group-hover/item:opacity-100 transition-opacity"
                                  >
                                    ×
                                  </button>
                                  <input 
                                    type="text"
                                    value={q.name}
                                    onChange={(e) => {
                                      const newNodes = [...nodes];
                                      const nIdx = newNodes.findIndex(n => n.id === node.id);
                                      const qs = [...(newNodes[nIdx].data.questions || [])];
                                      qs[qIdx].name = e.target.value;
                                      newNodes[nIdx].data.questions = qs;
                                      setNodes(newNodes);
                                    }}
                                    className="w-full bg-transparent border-b border-slate-200 focus:border-blue-500 text-[11px] font-bold outline-none"
                                    placeholder="Spørsmål..."
                                  />
                                  <textarea 
                                    value={q.acceptedAnswer?.text || ''}
                                    onChange={(e) => {
                                      const newNodes = [...nodes];
                                      const nIdx = newNodes.findIndex(n => n.id === node.id);
                                      const qs = [...(newNodes[nIdx].data.questions || [])];
                                      qs[qIdx].acceptedAnswer = { "@type": "Answer", "text": e.target.value };
                                      newNodes[nIdx].data.questions = qs;
                                      setNodes(newNodes);
                                    }}
                                    className="w-full bg-transparent text-[10px] text-slate-600 outline-none min-h-[40px]"
                                    placeholder="Svar..."
                                  />
                                </div>
                              ))}
                              <button 
                                onClick={() => {
                                  const newNodes = [...nodes];
                                  const nIdx = newNodes.findIndex(n => n.id === node.id);
                                  const qs = [...(newNodes[nIdx].data.questions || []), { name: '', acceptedAnswer: { "@type": "Answer", text: "" } }];
                                  newNodes[nIdx].data.questions = qs;
                                  setNodes(newNodes);
                                }}
                                className="w-full py-2 border-2 border-dashed border-slate-200 rounded-lg text-[10px] font-bold text-slate-400 hover:border-blue-200 hover:text-blue-500 transition-all"
                              >
                                + LEGG TIL SPØRSMÅL
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    
                    {nodes.length === 0 && (
                      <div className="col-span-full py-16 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-2xl bg-white/50">
                        <Network size={40} className="text-slate-200 mb-4" />
                        <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">No active nodes in strategy</p>
                        <p className="text-slate-300 text-[10px] mt-1">Add your first page using the buttons above</p>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {step === 'preview' && (
              <motion.div
                key="preview"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="flex-1 flex overflow-hidden"
              >
                {/* Visual Report */}
                <div className="w-1/2 p-8 overflow-y-auto custom-scrollbar border-r border-slate-200">
                  <header className="mb-8">
                    <h2 className="text-2xl font-bold text-slate-800 mb-1">Graph Validation</h2>
                    <p className="text-sm text-slate-500">Automated check based on Search Central specifications.</p>
                  </header>

                  <div className="space-y-6">
                    {validationResults.length === 0 ? (
                      <div className="p-6 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center gap-4">
                        <div className="w-12 h-12 bg-emerald-500 text-white rounded-full flex items-center justify-center shrink-0">
                          <CheckCircle2 size={24} />
                        </div>
                        <div>
                          <h4 className="font-bold text-emerald-900">Success: Passing</h4>
                          <p className="text-emerald-700 text-xs">All required fields for rich results are present in your current graph.</p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {validationResults.map((res, i) => (
                           <div 
                              key={i} 
                              className={cn(
                                "p-4 rounded-xl border flex gap-4 items-start transition-all",
                                res.type === 'error' ? "bg-rose-50 border-rose-100" : "bg-amber-50 border-amber-100"
                              )}
                            >
                              <div className={cn(
                                "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 shadow-sm",
                                res.type === 'error' ? "bg-rose-500 text-white" : "bg-amber-500 text-white"
                              )}>
                                <AlertCircle size={14} />
                              </div>
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className={cn(
                                    "text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded",
                                    res.type === 'error' ? "bg-rose-200 text-rose-800" : "bg-amber-200 text-amber-800"
                                  )}>
                                    {res.type === 'error' ? 'Critical' : 'Warning'}
                                  </span>
                                  <span className="text-[10px] font-bold text-slate-400 uppercase">{res.entityType} › {res.field}</span>
                                </div>
                                <p className="text-xs font-semibold text-slate-800">{res.message}</p>
                                {res.docUrl && (
                                  <a href={res.docUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-600 hover:underline pt-2">
                                    DOCS <ExternalLink size={10} />
                                  </a>
                                )}
                              </div>
                            </div>
                        ))}
                      </div>
                    )}

                    <div className="p-6 bg-slate-900 border border-slate-800 rounded-xl text-white">
                       <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4 text-center">Interconnection logic</p>
                       <div className="flex items-center justify-center gap-6 py-4">
                          <div className="flex flex-col items-center">
                            <div className="w-10 h-10 rounded-full border border-blue-500 flex items-center justify-center text-blue-500 font-black text-[10px]">ORG</div>
                            <span className="text-[8px] mt-2 opacity-40">#organization</span>
                          </div>
                          <div className="h-px w-12 bg-slate-700 relative">
                            <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[6px] text-slate-600 uppercase">about</span>
                          </div>
                          <div className="flex flex-col items-center opacity-50">
                            <div className="w-10 h-10 rounded-full border border-slate-500 flex items-center justify-center text-slate-500 font-black text-[10px]">WEB</div>
                            <span className="text-[8px] mt-2 opacity-40">#webpage</span>
                          </div>
                       </div>
                    </div>
                  </div>
                </div>

                {/* Raw Output */}
                <div className="w-1/2 bg-slate-900 flex flex-col p-0 overflow-hidden relative">
                  <div className="h-12 border-b border-white/10 flex items-center justify-between px-6 bg-slate-800/50 shrink-0">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">JSON-LD Schema Preview</span>
                    <div className="flex gap-4">
                      <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest">Valid structure</span>
                      <button 
                        onClick={() => {
                          navigator.clipboard.writeText(generateJsonLd());
                          alert('Kopiert!');
                        }}
                        className="text-[10px] text-blue-400 underline cursor-pointer font-bold uppercase tracking-widest"
                      >
                        Copy Raw
                      </button>
                    </div>
                  </div>
                  <div className="flex-1 p-6 font-mono text-[11px] leading-relaxed overflow-y-auto custom-scrollbar-dark list-none">
                     <pre className="text-blue-300">
                        {generateJsonLd()}
                     </pre>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      </main>

      {/* Footer Status Bar */}
      <footer className="h-8 bg-slate-50 border-t border-slate-200 px-6 flex items-center justify-between text-[10px] font-bold text-slate-400 shrink-0">
        <div className="flex gap-6">
          <span className="flex items-center gap-2">
            VOCABULARY: <span className="text-slate-600">SCHEMA.ORG v15.0</span>
          </span>
          <span className="flex items-center gap-2">
            API STATUS: <span className="text-emerald-500 flex items-center gap-1"><span className="w-1 h-1 bg-emerald-500 rounded-full"></span> NOMINAL</span>
          </span>
        </div>
        <div className="flex gap-6 uppercase tracking-widest">
          <span className="text-blue-600 cursor-pointer">Help Documentation</span>
          <span>Project: SEO_CORE_04K</span>
        </div>
      </footer>
    </div>
  );
}

// --- Sub-components ---

function PropertySelector({ type, onSelect, existingKeys }: { type: string, onSelect: (id: string) => void, existingKeys: string[] }) {
  const [props, setProps] = useState<any[]>([]);
  
  useEffect(() => {
    let isMounted = true;
    getSchemaType(type).then(st => {
      if (st && isMounted) setProps(st.properties);
    });
    return () => { isMounted = false; };
  }, [type]);

  const availableProps = props.filter(p => !existingKeys.includes(p.id));

  if (availableProps.length === 0) return null;

  return (
    <div className="relative group/add inline-block">
      <select 
        className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded hover:bg-blue-100 transition-colors cursor-pointer outline-none appearance-none pr-8"
        value=""
        onChange={(e) => {
          const propId = e.target.value;
          if (propId) onSelect(propId);
          e.target.value = "";
        }}
      >
        <option value="" disabled>+ LEGG TIL FELT</option>
        {availableProps.map(p => (
          <option key={p.id} value={p.id}>{p.label}</option>
        ))}
      </select>
      <div className="absolute right-1.5 top-1.5 pointer-events-none text-blue-600">
        <Plus size={10} />
      </div>
    </div>
  );
}

function SidebarLink({ active, onClick, icon, label, badge, badgeType }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string, badge?: number, badgeType?: 'error' | 'warning' }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-all group relative",
        active ? "bg-white border border-slate-200 shadow-sm text-blue-600" : "text-slate-600 hover:bg-slate-100"
      )}
    >
      <span className={cn(active ? "text-blue-600" : "text-slate-400 group-hover:text-slate-600")}>
        {icon}
      </span>
      {label}
      {badge !== undefined && (
        <span className={cn(
          "absolute right-2 top-2.5 w-4 h-4 flex items-center justify-center rounded-full text-[8px] text-white font-black",
          badgeType === 'error' ? "bg-rose-500 animate-pulse" : "bg-amber-500"
        )}>
          {badge}
        </span>
      )}
    </button>
  );
}

function AddEntityButton({ onClick, icon, label }: { onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button 
      onClick={onClick}
      className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-slate-100 transition-colors shadow-sm"
    >
      <Plus size={14} className="text-blue-600" />
      {label}
    </button>
  );
}

