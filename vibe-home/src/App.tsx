import { useState, useEffect } from 'react'
import {
    LayoutDashboard,
    Settings,
    Package,
    Zap,
    ShieldCheck,
    Activity,
    Search,
    Plus,
    Terminal,
    RefreshCw
} from 'lucide-react'
import axios from 'axios'

export default function App() {
    const [status, setStatus] = useState<any>(null)
    const [projects, setProjects] = useState<string[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [statusRes, projectsRes] = await Promise.all([
                    axios.get('/api/status'),
                    axios.get('/api/projects')
                ])
                setStatus(statusRes.data)
                setProjects(projectsRes.data.projects || [])
            } catch (error) {
                console.error('Failed to fetch data:', error)
            } finally {
                setLoading(false)
            }
        }

        fetchData()
        const interval = setInterval(fetchData, 30000) // Refresh every 30s
        return () => clearInterval(interval)
    }, [])

    return (
        <div className="flex h-screen bg-vibe-slate text-slate-100 font-sans">
            {/* Sidebar */}
            <aside className="w-64 border-r border-slate-800 bg-vibe-slate-light p-6 flex flex-col gap-8">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-vibe-blue rounded-lg flex items-center justify-center glow-blue">
                        <Zap className="text-white fill-current" />
                    </div>
                    <h1 className="text-xl font-bold tracking-tight">VIBE <span className="text-vibe-blue">PRO</span></h1>
                </div>

                <nav className="flex flex-col gap-2">
                    <NavItem icon={<LayoutDashboard size={20} />} label="Dashboard" active />
                    <NavItem icon={<Package size={20} />} label="Projects" />
                    <NavItem icon={<Terminal size={20} />} label="TUI Session" />
                    <NavItem icon={<Settings size={20} />} label="Settings" />
                </nav>

                <div className="mt-auto pt-6 border-t border-slate-800">
                    <div className="flex items-center gap-2 text-sm text-slate-400">
                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                        <span>API Server: {status?.status || 'Offline'}</span>
                    </div>
                    <div className="text-xs text-slate-500 mt-1">v{status?.version || '0.0.1-pro'}</div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto p-8">
                <header className="flex justify-between items-center mb-8">
                    <div>
                        <h2 className="text-2xl font-bold">Project Dashboard</h2>
                        <p className="text-slate-400">Manage your AI-powered development environment.</p>
                    </div>
                    <div className="flex gap-4">
                        <button className="flex items-center gap-2 px-4 py-2 border border-slate-700 rounded-md hover:bg-slate-800 transition-colors">
                            <RefreshCw size={16} />
                            <span>Sync</span>
                        </button>
                        <button className="flex items-center gap-2 px-4 py-2 bg-vibe-blue hover:bg-blue-600 rounded-md transition-colors text-white font-medium glow-blue">
                            <Plus size={16} />
                            <span>New Project</span>
                        </button>
                    </div>
                </header>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <StatCard
                        icon={<Activity className="text-vibe-blue" />}
                        label="Active Projects"
                        value={status?.analytics?.activeProjects?.toString() || projects.length.toString()}
                    />
                    <StatCard
                        icon={<Zap className="text-amber-400" />}
                        label="AI Task Throughput"
                        value={`${status?.analytics?.throughput || 0}/mo`}
                    />
                    <StatCard
                        icon={<ShieldCheck className="text-green-400" />}
                        label="System Health"
                        value={`${status?.analytics?.systemHealth || 100}%`}
                    />
                </div>

                {/* Projects Table */}
                <section className="glass rounded-xl p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-semibold">Local Projects</h3>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                            <input
                                type="text"
                                placeholder="Search projects..."
                                className="bg-slate-800 border border-slate-700 rounded-md py-1.5 pl-10 pr-4 text-sm focus:outline-none focus:border-vibe-blue transition-colors w-64"
                            />
                        </div>
                    </div>

                    <div className="space-y-3">
                        {loading ? (
                            <p className="text-slate-500">Loading projects...</p>
                        ) : projects.length === 0 ? (
                            <p className="text-slate-500">No projects found. Use `/scaffold` to create one!</p>
                        ) : (
                            projects.map(p => (
                                <div key={p} className="flex items-center justify-between p-4 bg-slate-800/50 hover:bg-slate-800 rounded-lg border border-slate-700/50 transition-colors group">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 bg-slate-700 rounded flex items-center justify-center">
                                            <Package size={20} className="text-slate-400" />
                                        </div>
                                        <div>
                                            <div className="font-medium">{p}</div>
                                            <div className="text-xs text-slate-500">Last accessed: 2h ago</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="text-xs px-2 py-1 bg-vibe-blue/10 text-vibe-blue rounded border border-vibe-blue/20">Active</span>
                                        <button className="p-2 text-slate-400 hover:text-white transition-colors">
                                            <Settings size={18} />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </section>
            </main>
        </div>
    )
}

function NavItem({ icon, label, active = false }: { icon: any, label: string, active?: boolean }) {
    return (
        <a href="#" className={`flex items-center gap-3 px-4 py-2 rounded-md transition-colors ${active ? 'bg-vibe-blue text-white shadow-lg glow-blue' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'}`}>
            {icon}
            <span className="font-medium">{label}</span>
        </a>
    )
}

function StatCard({ icon, label, value }: { icon: any, label: string, value: string }) {
    return (
        <div className="glass p-6 rounded-xl flex flex-col gap-2">
            <div className="flex justify-between items-start">
                <span className="text-slate-400 text-sm font-medium">{label}</span>
                {icon}
            </div>
            <div className="text-3xl font-bold">{value}</div>
        </div>
    )
}
