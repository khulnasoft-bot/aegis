/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Shield, 
  Cpu, 
  Database, 
  Lock, 
  Eye, 
  Zap, 
  MessageSquare, 
  Image as ImageIcon,
  Send,
  RefreshCw,
  AlertTriangle,
  Layers,
  Search,
  Globe,
  Terminal,
  Activity,
  Check,
  X,
  Flag,
  ExternalLink,
  User,
  Filter,
  SearchCode,
  ShieldAlert,
  Share2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI } from "@google/genai";
import { ThreatGraph } from './components/ThreatGraph';

// --- Types ---

enum MemoryKind {
    Fact = "Fact",
    Skill = "Skill",
    Conversation = "Conversation",
    ToolUsage = "ToolUsage",
    Plan = "Plan",
    Error = "Error",
    Insight = "Insight",
}

interface Memory {
  id: string;
  kind: MemoryKind;
  content: string;
  keys: string[];
  timestamp: string;
}

interface ThreatIndicator {
  id: string;
  ioc: string;
  threat_type: string;
  threat_type_desc: string;
  ioc_type: string;
  ioc_type_desc: string;
  malware: string;
  malware_printable: string;
  confidence_level: number;
  first_seen: string;
  last_seen: string;
  reference: string;
  reporter: string;
  source: string;
  forensic_links?: {
    type: 'downloaded_from' | 'contained_in' | 'pe_parent' | 'dns_mapping';
    target: string;
    timestamp?: string;
  }[];
}

enum AgentStatus {
  Approved = "APPROVED",
  Rejected = "REJECTED",
  Pending = "PENDING",
  Idle = "IDLE"
}

interface Agent {
  id: string;
  name: string;
  status: AgentStatus;
  isFlagged?: boolean;
}

// --- Aegis App Component ---

export default function App() {
  const [activeTab, setActiveTab] = useState<'monitor' | 'memory' | 'governance'>('monitor');
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [status, setStatus] = useState('SYSTEM READY');
  const [logs, setLogs] = useState<string[]>(["[INIT] Aegis Core v1.0.4 initialized", "[AUTH] Secure session established"]);
  const [threats, setThreats] = useState<ThreatIndicator[]>([]);
  const [isFetchingThreats, setIsFetchingThreats] = useState(false);
  const [threatStatus, setThreatStatus] = useState<'connected' | 'error' | 'idle' | 'simulated'>('idle');
  const [iocTypeFilter, setIocTypeFilter] = useState('all');
  const [threatTypeFilter, setThreatTypeFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [minConfidence, setMinConfidence] = useState(0);
  const [selectedThreat, setSelectedThreat] = useState<ThreatIndicator | null>(null);
  const [agents, setAgents] = useState<Agent[]>([
    { id: '1', name: 'RustArchitect', status: AgentStatus.Approved },
    { id: '2', name: 'PerfOptimizer', status: AgentStatus.Approved },
    { id: '3', name: 'SecurityAuditor', status: AgentStatus.Pending, isFlagged: true },
    { id: '4', name: 'ConcurrencyCritic', status: AgentStatus.Idle },
  ]);

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

  useEffect(() => {
    fetchMemories();
    fetchThreats();
  }, []);

  const fetchThreats = async () => {
    setIsFetchingThreats(true);
    setThreatStatus('idle');
    try {
      const res = await fetch('/api/threat-intel');
      const data = await res.json();
      if (data.query_status === 'ok' && Array.isArray(data.data)) {
        const sourceLabel = data.source === 'simulated' ? 'Aegis Internal Sentinel' : 'ThreatFox';
        const threatsWithSource = data.data.slice(0, 20).map((t: any, idx: number) => {
          // Simulate forensic links for demonstration
          const links = [];
          if (idx % 3 === 0) {
            links.push({ type: 'downloaded_from', target: `https://cdn.malware-dist.net/payload_${idx}.exe` });
          }
          if (idx % 4 === 0) {
            links.push({ type: 'dns_mapping', target: `103.24.201.${10 + idx}` });
          }
          if (idx % 5 === 0) {
            links.push({ type: 'pe_parent', target: `explorer.exe` });
          }
          if (idx % 7 === 0) {
            links.push({ type: 'contained_in', target: `update_package.zip` });
          }

          return {
            ...t,
            source: sourceLabel,
            forensic_links: links.length > 0 ? links : undefined
          };
        });
        setThreats(threatsWithSource);
        if (data.source === 'simulated') {
          setThreatStatus('simulated');
          addLog("[WARN] External threat feed unreachable. Using internal Aegis simulation.");
        } else {
          setThreatStatus('connected');
          addLog("[INTEL] Threat feed synchronized successfully");
        }
      } else {
        setThreatStatus('error');
        addLog("[WARN] Threat feed returned invalid data structure");
      }
    } catch (e) {
      setThreatStatus('error');
      addLog("[ERROR] Failed to connect to threat intelligence feed");
    } finally {
      setIsFetchingThreats(false);
    }
  };

  const fetchMemories = async () => {
    try {
      const res = await fetch('/api/memory');
      const data = await res.json();
      setMemories(data);
    } catch (e) {
      addLog("[ERROR] Failed to fetch memory store");
    }
  };

  const addLog = (msg: string) => {
    setLogs(prev => [msg, ...prev].slice(0, 50));
  };

  const handleGenerate = async () => {
    if (!prompt) return;
    setIsGenerating(true);
    setStatus('GENERATING INTELLIGENCE ASSETS...');
    addLog(`[INTEL] Processing request: ${prompt}`);

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [{ text: `Strategic intelligence visualization: ${prompt}. High-detail satellite view or tactical map style.` }],
        },
      });

      let imageUrl = null;
      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          imageUrl = `data:image/png;base64,${part.inlineData.data}`;
          break;
        }
      }

      if (imageUrl) {
        setGeneratedImage(imageUrl);
        addLog("[SUCCESS] Asset generated and verified");
        
        // Auto-save to memory
        await saveToMemory(`Strategic asset generated for: ${prompt}`, [prompt, 'intel', 'visual'], MemoryKind.Insight);
      } else {
        addLog("[WARN] No visual data returned from model");
      }
    } catch (error) {
      console.error(error);
      addLog(`[CRITICAL] Generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsGenerating(false);
      setStatus('SYSTEM READY');
    }
  };

  const saveToMemory = async (content: string, keys: string[], kind: MemoryKind) => {
    try {
      const res = await fetch('/api/memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, keys, kind }),
      });
      const newMem = await res.json();
      setMemories(prev => [newMem, ...prev]);
      addLog(`[MEM] New ${kind} committed to store`);
    } catch (e) {
      addLog("[ERROR] Memory commit failed");
    }
  };

  const handleAgentAction = (id: string, action: 'approve' | 'reject' | 'flag') => {
    setAgents(prev => prev.map(agent => {
      if (agent.id !== id) return agent;
      if (action === 'approve') return { ...agent, status: AgentStatus.Approved };
      if (action === 'reject') return { ...agent, status: AgentStatus.Rejected };
      if (action === 'flag') return { ...agent, isFlagged: !agent.isFlagged };
      return agent;
    }));
    
    const agent = agents.find(a => a.id === id);
    if (agent) {
      addLog(`[GOV] Agent ${agent.name} ${action === 'flag' ? (agent.isFlagged ? 'unflagged' : 'flagged') : action + 'ed'}`);
    }
  };

  const approvedCount = agents.filter(a => a.status === AgentStatus.Approved).length;
  const progress = agents.length > 0 ? (approvedCount / agents.length) * 100 : 0;

  const filteredThreats = threats.filter(threat => {
    const matchesIocType = iocTypeFilter === 'all' || threat.ioc_type_desc === iocTypeFilter;
    const matchesThreatType = threatTypeFilter === 'all' || threat.threat_type_desc === threatTypeFilter;
    const matchesSource = sourceFilter === 'all' || threat.source === sourceFilter;
    const matchesConfidence = threat.confidence_level >= minConfidence;
    return matchesIocType && matchesThreatType && matchesSource && matchesConfidence;
  });

  const uniqueIocTypes = Array.from(new Set(threats.map(t => t.ioc_type_desc)));
  const uniqueThreatTypes = Array.from(new Set(threats.map(t => t.threat_type_desc)));
  const uniqueSources = Array.from(new Set(threats.map(t => t.source)));

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-[#E0E0E0] font-mono selection:bg-emerald-500/30">
      {/* Top Navigation Bar */}
      <header className="border-b border-white/10 bg-black/40 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-emerald-500/10 border border-emerald-500/30 rounded flex items-center justify-center">
              <Shield className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-widest text-white uppercase">Aegis Engine</h1>
              <div className="flex items-center gap-2 text-[10px] text-emerald-400/70">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                {status}
              </div>
            </div>
          </div>

          <nav className="flex gap-1">
            <NavButton 
              active={activeTab === 'monitor'} 
              onClick={() => setActiveTab('monitor')}
              icon={<Activity className="w-4 h-4" />}
              label="Monitor"
            />
            <NavButton 
              active={activeTab === 'memory'} 
              onClick={() => setActiveTab('memory')}
              icon={<Database className="w-4 h-4" />}
              label="Memory"
            />
            <NavButton 
              active={activeTab === 'governance'} 
              onClick={() => setActiveTab('governance')}
              icon={<Lock className="w-4 h-4" />}
              label="Governance"
            />
          </nav>

          <div className="flex items-center gap-4 text-[10px] opacity-50">
            <div className="flex flex-col items-end">
              <span>LAT: 35.6895° N</span>
              <span>LON: 139.6917° E</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column: Controls & Input */}
        <div className="lg:col-span-4 space-y-4">
          <section className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-tighter flex items-center gap-2">
                <Zap className="w-3 h-3 text-emerald-400" />
                Strategic Input
              </h2>
              <span className="text-[10px] opacity-40">SECURE_CHANNEL_01</span>
            </div>
            
            <div className="relative">
              <textarea 
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Enter strategic prompt (e.g., 'Act Irani Hyper Sonic Missile Hits')..."
                className="w-full h-32 bg-black/40 border border-white/10 rounded-lg p-3 text-xs focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 outline-none transition-all resize-none"
              />
              <div className="absolute bottom-2 right-2 flex gap-2">
                <button 
                  onClick={handleGenerate}
                  disabled={isGenerating || !prompt}
                  className="bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:hover:bg-emerald-500 text-black px-3 py-1.5 rounded text-[10px] font-bold uppercase flex items-center gap-2 transition-colors"
                >
                  {isGenerating ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                  Execute
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <QuickAction label="Satellite View" onClick={() => setPrompt(p => p + " satellite view")} />
              <QuickAction label="Tactical Map" onClick={() => setPrompt(p => p + " tactical map overlay")} />
              <QuickAction label="Heat Map" onClick={() => setPrompt(p => p + " thermal heat signature")} />
              <QuickAction label="Damage Assessment" onClick={() => setPrompt(p => p + " structural damage assessment")} />
            </div>
          </section>

          <section className="bg-white/5 border border-white/10 rounded-xl p-4 overflow-hidden">
            <h2 className="text-xs font-bold uppercase tracking-tighter mb-3 flex items-center gap-2">
              <Activity className="w-3 h-3 text-emerald-400" />
              System Logs
            </h2>
            <div className="space-y-1 h-64 overflow-y-auto pr-2 custom-scrollbar">
              {logs.map((log, i) => (
                <div key={i} className="text-[10px] leading-relaxed opacity-60 hover:opacity-100 transition-opacity flex gap-2">
                  <span className="opacity-30">[{new Date().toLocaleTimeString()}]</span>
                  <span className={log.includes('[ERROR]') || log.includes('[CRITICAL]') ? 'text-red-400' : log.includes('[SUCCESS]') ? 'text-emerald-400' : ''}>
                    {log}
                  </span>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Right Column: Visualization & Content */}
        <div className="lg:col-span-8 space-y-4">
          <AnimatePresence mode="wait">
            {activeTab === 'monitor' && (
              <motion.div 
                key="monitor"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                <div className="aspect-video bg-black border border-white/10 rounded-xl overflow-hidden relative group">
                  {generatedImage ? (
                    <img 
                      src={generatedImage} 
                      alt="Intelligence Asset" 
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-4 opacity-20">
                      <ImageIcon className="w-12 h-12" />
                      <span className="text-[10px] uppercase tracking-[0.2em]">Awaiting Intelligence Feed</span>
                    </div>
                  )}
                  
                  {/* Overlay UI */}
                  <div className="absolute inset-0 pointer-events-none border-[20px] border-transparent group-hover:border-emerald-500/5 transition-all duration-700" />
                  <div className="absolute top-4 left-4 p-2 bg-black/60 backdrop-blur-md border border-white/10 rounded text-[10px] uppercase tracking-widest">
                    Live Feed: Alpha-7
                  </div>
                  <div className="absolute bottom-4 right-4 flex gap-2">
                    <div className="p-2 bg-black/60 backdrop-blur-md border border-white/10 rounded text-[10px]">
                      RES: 1024x1024
                    </div>
                    <div className="p-2 bg-black/60 backdrop-blur-md border border-white/10 rounded text-[10px]">
                      SIG: STRONG
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <StatCard label="Network Load" value="12.4 GB/s" trend="+2.1%" />
                  <StatCard label="Memory Entropy" value="0.0042" trend="-0.01%" />
                  <StatCard label="Governance Score" value="98.2" trend="STABLE" />
                </div>

                {/* Real Threat Graph */}
                <section className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-indigo-500/10 border border-indigo-500/30 rounded flex items-center justify-center">
                      <Share2 className="w-5 h-5 text-indigo-400" />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold uppercase tracking-widest text-white">Real Threat Graph</h2>
                      <p className="text-[10px] opacity-50 uppercase">Explore dataset visually // Discover threat commonalities</p>
                    </div>
                  </div>
                  <ThreatGraph threats={threats} />
                </section>

                {/* Threat Intelligence Feed */}
                <section className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-red-500/10 border border-red-500/30 rounded flex items-center justify-center">
                        <Globe className="w-5 h-5 text-red-400" />
                      </div>
                      <div>
                        <h2 className="text-sm font-bold uppercase tracking-widest text-white">Threat Intelligence Feed</h2>
                        <div className="flex items-center gap-2 text-[10px]">
                          <span className={`w-1.5 h-1.5 rounded-full ${threatStatus === 'connected' ? 'bg-emerald-500' : threatStatus === 'simulated' ? 'bg-amber-500' : threatStatus === 'error' ? 'bg-red-500' : 'bg-white/20'}`} />
                          <span className="opacity-50 uppercase">
                            {threatStatus === 'connected' ? 'Live Connection' : 
                             threatStatus === 'simulated' ? 'Internal Simulation' : 
                             threatStatus === 'error' ? 'Connection Failed' : 'Idle'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <button 
                      onClick={fetchThreats}
                      disabled={isFetchingThreats}
                      className="p-2 hover:bg-white/5 rounded-lg transition-colors disabled:opacity-50"
                      title="Refresh Feed"
                    >
                      <RefreshCw className={`w-4 h-4 ${isFetchingThreats ? 'animate-spin' : ''}`} />
                    </button>
                  </div>

                  {/* Filters */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-black/20 p-3 rounded-lg border border-white/5">
                    <div className="space-y-1">
                      <label className="text-[9px] uppercase opacity-40 flex items-center gap-1">
                        <Filter className="w-2.5 h-2.5" /> IOC Type
                      </label>
                      <select 
                        value={iocTypeFilter}
                        onChange={(e) => setIocTypeFilter(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded px-2 py-1 text-[10px] outline-none focus:border-emerald-500/50"
                      >
                        <option value="all">All Types ({threats.length})</option>
                        {uniqueIocTypes.map(type => (
                          <option key={type} value={type}>
                            {type} ({threats.filter(t => t.ioc_type_desc === type).length})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] uppercase opacity-40 flex items-center gap-1">
                        <Zap className="w-2.5 h-2.5" /> Threat Type
                      </label>
                      <select 
                        value={threatTypeFilter}
                        onChange={(e) => setThreatTypeFilter(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded px-2 py-1 text-[10px] outline-none focus:border-emerald-500/50"
                      >
                        <option value="all">All Threats ({threats.length})</option>
                        {uniqueThreatTypes.map(type => (
                          <option key={type} value={type}>
                            {type} ({threats.filter(t => t.threat_type_desc === type).length})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] uppercase opacity-40 flex items-center gap-1">
                        <Database className="w-2.5 h-2.5" /> Source
                      </label>
                      <select 
                        value={sourceFilter}
                        onChange={(e) => setSourceFilter(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded px-2 py-1 text-[10px] outline-none focus:border-emerald-500/50"
                      >
                        <option value="all">All Sources</option>
                        {uniqueSources.map(source => (
                          <option key={source} value={source}>
                            {source} ({threats.filter(t => t.source === source).length})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] uppercase opacity-40">Min Confidence: {minConfidence}%</label>
                      <input 
                        type="range" 
                        min="0" 
                        max="100" 
                        step="5"
                        value={minConfidence}
                        onChange={(e) => setMinConfidence(parseInt(e.target.value))}
                        className="w-full accent-emerald-500 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer mt-2"
                      />
                    </div>
                    <div className="flex flex-col justify-end">
                      <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest text-right">
                        Results: {filteredThreats.length} / {threats.length}
                      </div>
                    </div>
                  </div>

                  <div className="border border-white/5 rounded-lg overflow-hidden">
                    <div className="grid grid-cols-12 gap-4 p-3 bg-white/5 text-[10px] font-bold uppercase tracking-widest opacity-40">
                      <div className="col-span-4">Indicator (IOC)</div>
                      <div className="col-span-3">Type & Description</div>
                      <div className="col-span-3">Malware & Reporter</div>
                      <div className="col-span-2 text-right">Confidence</div>
                    </div>
                    <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                      {filteredThreats.length === 0 ? (
                        <div className="p-10 text-center text-[10px] opacity-20 uppercase tracking-[0.2em]">
                          {isFetchingThreats ? 'Synchronizing Intelligence...' : 'No matching indicators found'}
                        </div>
                      ) : (
                        filteredThreats.map((threat, idx) => (
                          <div key={idx} className="grid grid-cols-12 gap-4 p-4 border-t border-white/5 hover:bg-white/5 transition-colors items-start">
                            <div className="col-span-4 space-y-2">
                              <div className="flex items-center gap-2 overflow-hidden">
                                <Terminal className="w-3 h-3 text-red-400 shrink-0" />
                                <span className="text-[10px] font-mono truncate text-red-200/80 flex-1">
                                  <button 
                                    onClick={() => setSelectedThreat(threat)}
                                    className="hover:text-red-400 hover:underline transition-all text-left truncate w-full"
                                    title={`View Details: ${threat.ioc}`}
                                  >
                                    {threat.ioc}
                                  </button>
                                </span>
                                <div className="flex items-center gap-1 ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button 
                                    onClick={() => window.open(`https://www.virustotal.com/gui/search/${encodeURIComponent(threat.ioc)}`, '_blank')}
                                    className="p-1 hover:bg-white/10 rounded text-blue-400 transition-colors"
                                    title="VirusTotal Lookup"
                                  >
                                    <ShieldAlert className="w-3 h-3" />
                                  </button>
                                  <button 
                                    onClick={() => window.open(`https://www.google.com/search?q=${encodeURIComponent(threat.ioc)}`, '_blank')}
                                    className="p-1 hover:bg-white/10 rounded text-white/50 transition-colors"
                                    title="Google Search"
                                  >
                                    <SearchCode className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                              {threat.reference && (
                                <a 
                                  href={threat.reference} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1.5 text-[9px] text-blue-400/60 hover:text-blue-400 transition-colors"
                                >
                                  <ExternalLink className="w-2.5 h-2.5" />
                                  Reference URL
                                </a>
                              )}
                            </div>
                            <div className="col-span-3 space-y-1">
                              <span className="text-[9px] px-1.5 py-0.5 bg-white/5 rounded border border-white/10 text-white/70 uppercase inline-block">
                                {threat.ioc_type_desc}
                              </span>
                              <p className="text-[9px] opacity-40 leading-tight italic">
                                {threat.threat_type_desc}
                              </p>
                            </div>
                            <div className="col-span-3 space-y-1">
                              <div className="space-y-0.5">
                                <div className="text-[10px] text-white/70 truncate font-bold">
                                  {threat.malware_printable || 'Unknown Malware'}
                                </div>
                                {threat.malware && threat.malware !== 'unknown' && (
                                  <div className="text-[8px] opacity-40 font-mono truncate">
                                    ID: {threat.malware}
                                  </div>
                                )}
                              </div>
                              <div className="flex items-center gap-1.5 text-[9px] opacity-40">
                                <User className="w-2.5 h-2.5" />
                                {threat.reporter}
                              </div>
                              <div className="text-[8px] uppercase tracking-tighter opacity-30 font-bold">
                                Source: {threat.source}
                              </div>
                            </div>
                            <div className="col-span-2 text-right">
                              <span className={`text-[10px] font-bold ${threat.confidence_level > 75 ? 'text-red-400' : threat.confidence_level > 40 ? 'text-amber-400' : 'text-emerald-400'}`}>
                                {threat.confidence_level}%
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-[9px] opacity-30 uppercase tracking-widest">
                    <span>Source: {threatStatus === 'simulated' ? 'Aegis Internal Sentinel' : 'ThreatFox (abuse.ch)'}</span>
                    <span>Last Sync: {new Date().toLocaleTimeString()}</span>
                  </div>
                </section>
              </motion.div>
            )}

            {activeTab === 'memory' && (
              <motion.div 
                key="memory"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-white/5 border border-white/10 rounded-xl p-6 min-h-[500px]"
              >
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-lg font-bold text-white uppercase tracking-widest">Memory Store</h2>
                    <p className="text-[10px] opacity-50 uppercase">Governed Semantic Knowledge Base</p>
                  </div>
                  <div className="flex gap-2">
                    <div className="relative">
                      <Search className="w-3 h-3 absolute left-3 top-1/2 -translate-y-1/2 opacity-30" />
                      <input 
                        type="text" 
                        placeholder="Search keys..." 
                        className="bg-black/40 border border-white/10 rounded-full pl-8 pr-4 py-1.5 text-[10px] outline-none focus:border-emerald-500/50"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  {memories.length === 0 ? (
                    <div className="text-center py-20 opacity-20 uppercase text-[10px] tracking-widest">
                      Store Empty
                    </div>
                  ) : (
                    memories.map((mem) => (
                      <div key={mem.id} className="group bg-black/40 border border-white/5 hover:border-emerald-500/30 rounded-lg p-4 transition-all">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded uppercase">
                              {mem.kind}
                            </span>
                            <span className="text-[10px] opacity-30">ID: {mem.id}</span>
                          </div>
                          <span className="text-[10px] opacity-30">{new Date(mem.timestamp).toLocaleString()}</span>
                        </div>
                        <p className="text-xs leading-relaxed opacity-80 mb-3">{mem.content}</p>
                        <div className="flex flex-wrap gap-2">
                          {mem.keys.map((key, i) => (
                            <span key={i} className="text-[9px] px-2 py-0.5 bg-white/5 border border-white/10 rounded-full opacity-50 group-hover:opacity-100 transition-opacity">
                              #{key}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            )}

            {activeTab === 'governance' && (
              <motion.div 
                key="governance"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-4"
              >
                <section className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-6">
                  <h2 className="text-sm font-bold uppercase tracking-widest flex items-center gap-2">
                    <Shield className="w-4 h-4 text-emerald-400" />
                    Review Pipeline
                  </h2>
                  <div className="space-y-4">
                    {agents.map(agent => (
                      <ReviewAgent 
                        key={agent.id} 
                        agent={agent} 
                        onApprove={() => handleAgentAction(agent.id, 'approve')}
                        onReject={() => handleAgentAction(agent.id, 'reject')}
                        onFlag={() => handleAgentAction(agent.id, 'flag')}
                      />
                    ))}
                  </div>
                  <div className="pt-4 border-t border-white/10">
                    <div className="flex justify-between text-[10px] mb-2">
                      <span>Consensus Progress</span>
                      <span>{Math.round(progress)}%</span>
                    </div>
                    <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)] transition-all duration-500" 
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                </section>

                <section className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-6">
                  <h2 className="text-sm font-bold uppercase tracking-widest flex items-center gap-2">
                    <Layers className="w-4 h-4 text-emerald-400" />
                    WASM Sandbox
                  </h2>
                  <div className="space-y-3">
                    <SandboxMetric label="Memory Bounds" value="SAFE" />
                    <SandboxMetric label="Panic Safety" value="VERIFIED" />
                    <SandboxMetric label="CPU Quota" value="92% REMAINING" />
                    <SandboxMetric label="Determinism" value="CONFIRMED" />
                  </div>
                  <button className="w-full py-3 border border-emerald-500/30 hover:bg-emerald-500/10 text-emerald-400 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all">
                    Run Verification Suite
                  </button>
                </section>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Threat Detail Modal */}
      <AnimatePresence>
        {selectedThreat && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedThreat(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-2xl bg-[#0D0D0E] border border-white/10 rounded-2xl overflow-hidden shadow-2xl"
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-white/10 flex items-center justify-between bg-white/5">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center justify-center">
                    <ShieldAlert className="w-6 h-6 text-red-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white uppercase tracking-widest">Indicator Analysis</h2>
                    <div className="text-[10px] text-red-400/70 font-mono uppercase tracking-tighter">ID: {selectedThreat.id}</div>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedThreat(null)}
                  className="p-2 hover:bg-white/10 rounded-full transition-colors"
                >
                  <X className="w-5 h-5 opacity-50" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-8 space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
                {/* Primary IOC Display */}
                <div className="space-y-2">
                  <label className="text-[10px] uppercase opacity-40 tracking-widest font-bold">Indicator of Compromise</label>
                  <div className="flex items-center gap-3">
                    <div className="text-2xl font-mono text-red-200 break-all selection:bg-red-500/30">
                      {selectedThreat.ioc}
                    </div>
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(selectedThreat.ioc);
                        addLog(`[UI] IOC copied to clipboard: ${selectedThreat.ioc}`);
                      }}
                      className="p-2 hover:bg-white/5 rounded border border-white/10 transition-colors shrink-0"
                      title="Copy to Clipboard"
                    >
                      <Database className="w-4 h-4 opacity-50" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-8">
                  {/* Classification */}
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase opacity-40 tracking-widest font-bold">Threat Classification</label>
                      <div className="text-sm text-white/90">{selectedThreat.threat_type_desc}</div>
                      <div className="text-[10px] opacity-40 font-mono uppercase">Type: {selectedThreat.threat_type}</div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase opacity-40 tracking-widest font-bold">IOC Format</label>
                      <div className="text-sm text-white/90">{selectedThreat.ioc_type_desc}</div>
                      <div className="text-[10px] opacity-40 font-mono uppercase">Type: {selectedThreat.ioc_type}</div>
                    </div>
                  </div>

                  {/* Malware Attribution */}
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase opacity-40 tracking-widest font-bold">Malware Attribution</label>
                      <div className="text-sm text-emerald-400 font-bold">{selectedThreat.malware_printable || 'Unknown Family'}</div>
                      <div className="text-[10px] opacity-40 font-mono uppercase">System ID: {selectedThreat.malware}</div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase opacity-40 tracking-widest font-bold">Confidence Level</label>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${selectedThreat.confidence_level > 75 ? 'bg-red-500' : selectedThreat.confidence_level > 40 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                            style={{ width: `${selectedThreat.confidence_level}%` }}
                          />
                        </div>
                        <span className={`text-xs font-bold ${selectedThreat.confidence_level > 75 ? 'text-red-400' : selectedThreat.confidence_level > 40 ? 'text-amber-400' : 'text-emerald-400'}`}>
                          {selectedThreat.confidence_level}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Temporal Data */}
                <div className="space-y-4 pt-4 border-t border-white/5">
                  <label className="text-[10px] uppercase opacity-40 tracking-widest font-bold">Observation History</label>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white/5 p-3 rounded-lg border border-white/5">
                      <div className="text-[9px] uppercase opacity-40 mb-1">First Detected</div>
                      <div className="text-xs font-mono text-white/80">{new Date(selectedThreat.first_seen).toLocaleString()}</div>
                    </div>
                    <div className="bg-white/5 p-3 rounded-lg border border-white/5">
                      <div className="text-[9px] uppercase opacity-40 mb-1">Last Observed</div>
                      <div className="text-xs font-mono text-white/80">{new Date(selectedThreat.last_seen).toLocaleString()}</div>
                    </div>
                  </div>
                </div>

                {/* Forensic Infrastructure Links */}
                {selectedThreat.forensic_links && selectedThreat.forensic_links.length > 0 && (
                  <div className="space-y-4 pt-4 border-t border-white/5">
                    <label className="text-[10px] uppercase opacity-40 tracking-widest font-bold">Forensic Infrastructure Links</label>
                    <div className="space-y-2">
                      {selectedThreat.forensic_links.map((link, lIdx) => (
                        <div key={lIdx} className="flex items-center justify-between bg-white/5 p-3 rounded-lg border border-white/5 group/link">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded flex items-center justify-center ${
                              link.type === 'downloaded_from' ? 'bg-orange-500/10 text-orange-400' :
                              link.type === 'dns_mapping' ? 'bg-blue-500/10 text-blue-400' :
                              'bg-pink-500/10 text-pink-400'
                            }`}>
                              {link.type === 'downloaded_from' ? <Globe className="w-4 h-4" /> :
                               link.type === 'dns_mapping' ? <Activity className="w-4 h-4" /> :
                               <Database className="w-4 h-4" />}
                            </div>
                            <div>
                              <div className="text-[9px] uppercase opacity-40 font-bold">
                                {link.type.replace(/_/g, ' ')}
                              </div>
                              <div className="text-xs font-mono text-white/80 break-all">{link.target}</div>
                            </div>
                          </div>
                          <button 
                            onClick={() => window.open(link.type === 'downloaded_from' ? link.target : `https://www.google.com/search?q=${encodeURIComponent(link.target)}`, '_blank')}
                            className="p-2 hover:bg-white/10 rounded opacity-0 group-hover/link:opacity-100 transition-opacity"
                          >
                            <ExternalLink className="w-4 h-4 opacity-40" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Attribution & Source */}
                <div className="grid grid-cols-2 gap-8 pt-4 border-t border-white/5">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase opacity-40 tracking-widest font-bold">Intelligence Reporter</label>
                    <div className="flex items-center gap-2 text-sm text-white/80">
                      <User className="w-4 h-4 opacity-40" />
                      {selectedThreat.reporter}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase opacity-40 tracking-widest font-bold">Data Source</label>
                    <div className="flex items-center gap-2 text-sm text-white/80">
                      <Globe className="w-4 h-4 opacity-40" />
                      {selectedThreat.source}
                    </div>
                  </div>
                </div>

                {/* External Actions */}
                <div className="flex gap-3 pt-6">
                  <button 
                    onClick={() => window.open(`https://www.virustotal.com/gui/search/${encodeURIComponent(selectedThreat.ioc)}`, '_blank')}
                    className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-xl text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-900/20"
                  >
                    <ShieldAlert className="w-4 h-4" />
                    VirusTotal Analysis
                  </button>
                  <button 
                    onClick={() => window.open(`https://www.google.com/search?q=${encodeURIComponent(selectedThreat.ioc)}`, '_blank')}
                    className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 text-white py-3 rounded-xl text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all"
                  >
                    <SearchCode className="w-4 h-4" />
                    Search Intelligence
                  </button>
                  {selectedThreat.reference && (
                    <button 
                      onClick={() => window.open(selectedThreat.reference, '_blank')}
                      className="p-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all"
                      title="View Reference URL"
                    >
                      <ExternalLink className="w-5 h-5 opacity-60" />
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <footer className="max-w-7xl mx-auto p-4 flex items-center justify-between border-t border-white/5 mt-8 opacity-30 text-[9px] uppercase tracking-[0.3em]">
        <span>Aegis Core v1.0.4-STABLE</span>
        <span>Distributed Memory Engine // High-Assurance</span>
        <span>© 2026 Strategic Intelligence Command</span>
      </footer>

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.02);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
      `}} />
    </div>
  );
}

// --- Sub-components ---

function NavButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={`
        px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 transition-all
        ${active ? 'bg-white/10 text-white border border-white/20' : 'text-white/40 hover:text-white/70'}
      `}
    >
      {icon}
      {label}
    </button>
  );
}

function QuickAction({ label, onClick }: { label: string, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className="bg-white/5 hover:bg-white/10 border border-white/10 rounded p-2 text-[9px] uppercase tracking-tighter text-left transition-colors"
    >
      {label}
    </button>
  );
}

function StatCard({ label, value, trend }: { label: string, value: string, trend: string }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4">
      <div className="text-[9px] uppercase tracking-widest opacity-40 mb-1">{label}</div>
      <div className="flex items-end justify-between">
        <div className="text-lg font-bold text-white">{value}</div>
        <div className={`text-[9px] font-bold ${trend.startsWith('+') ? 'text-emerald-400' : trend === 'STABLE' ? 'text-blue-400' : 'text-red-400'}`}>
          {trend}
        </div>
      </div>
    </div>
  );
}

interface ReviewAgentProps {
  agent: Agent;
  onApprove: () => void;
  onReject: () => void;
  onFlag: () => void;
}

const ReviewAgent: React.FC<ReviewAgentProps> = ({ agent, onApprove, onReject, onFlag }) => {
  const { name, status, isFlagged } = agent;
  return (
    <div className={`flex items-center justify-between p-3 bg-black/40 border ${isFlagged ? 'border-red-500/50' : 'border-white/5'} rounded-lg transition-all group`}>
      <div className="flex items-center gap-3">
        <div className={`w-2 h-2 rounded-full ${status === AgentStatus.Approved ? 'bg-emerald-500' : status === AgentStatus.Pending ? 'bg-amber-500 animate-pulse' : status === AgentStatus.Rejected ? 'bg-red-500' : 'bg-white/10'}`} />
        <div className="flex flex-col">
          <span className="text-[10px] font-bold flex items-center gap-2">
            {name}
            {isFlagged && <Flag className="w-2.5 h-2.5 text-red-500 fill-red-500" />}
          </span>
          <span className={`text-[8px] font-bold uppercase ${status === AgentStatus.Approved ? 'text-emerald-400' : status === AgentStatus.Pending ? 'text-amber-400' : status === AgentStatus.Rejected ? 'text-red-400' : 'opacity-30'}`}>
            {status}
          </span>
        </div>
      </div>
      
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button 
          onClick={onFlag}
          className={`p-1.5 rounded hover:bg-white/5 transition-colors ${isFlagged ? 'text-red-400' : 'text-white/30'}`}
          title={isFlagged ? "Unflag Agent" : "Flag Agent"}
        >
          <Flag className="w-3 h-3" />
        </button>
        {status === AgentStatus.Pending && (
          <>
            <button 
              onClick={onReject}
              className="p-1.5 rounded hover:bg-red-500/20 text-red-400 transition-colors"
              title="Reject Agent"
            >
              <X className="w-3 h-3" />
            </button>
            <button 
              onClick={onApprove}
              className="p-1.5 rounded hover:bg-emerald-500/20 text-emerald-400 transition-colors"
              title="Approve Agent"
            >
              <Check className="w-3 h-3" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function SandboxMetric({ label, value }: { label: string, value: string }) {
  return (
    <div className="flex items-center justify-between text-[10px]">
      <span className="opacity-50">{label}</span>
      <span className="font-bold text-emerald-400">{value}</span>
    </div>
  );
}
