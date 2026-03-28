/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @next/next/no-img-element */
/* eslint-disable jsx-a11y/alt-text */
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Menu, ChevronLeft, Terminal, Play, Video } from "lucide-react";
import Link from 'next/link';

export default function SymphonyStudio() {
    const [loading, setLoading] = useState(false);
    const [terminalLogs, setTerminalLogs] = useState<string[]>(["[TIKTOK_SYMPHONY] Neural Engine Initialized..."]);
    const [isConfigOpen, setIsConfigOpen] = useState(true);
    const [accessCode, setAccessCode] = useState("");
    
    // Symphony Data
    const [avatars, setAvatars] = useState<any[]>([]);
    const [voices, setVoices] = useState<any[]>([]);
    const [selectedAvatarIds, setSelectedAvatarIds] = useState<string[]>([]);
    const [selectedVoiceIds, setSelectedVoiceIds] = useState<string[]>([]);
    const [script, setScript] = useState("Hey, we finally implemented Symphony before the quarter ended!");
    
    // Result Tracking
    type BatchJob = {
        taskId: string;
        avatarId: string;
        voiceId: string;
        status: string; // 'PROCESSING', 'SUCCESS', 'FAILED'
        videoUrl: string | null;
        errorDetails: string | null;
    };
    const [batchJobs, setBatchJobs] = useState<BatchJob[]>([]);
    
    // Filters
    const [filterIndustry, setFilterIndustry] = useState("All");
    const [filterGender, setFilterGender] = useState("All");
    const [filterScene, setFilterScene] = useState("All");
    const [filterRegion, setFilterRegion] = useState("All");
    const [searchQuery, setSearchQuery] = useState("");

    const appendLog = (msg: string) => {
        setTerminalLogs(prev => [...prev.slice(-49), `[${new Date().toLocaleTimeString()}] ${msg}`]);
    };

    // Load Avatars on mount
    useEffect(() => {
        const fetchAvatars = async () => {
            appendLog("Fetching global Digital Avatar library from TikTok...");
            try {
                // Point to our fastAPI backend
                const res = await fetch("https://web-production-1f2e2.up.railway.app/api/tiktok/avatars");
                const data = await res.json();
                if (data.status === "success" && data.data) {
                    setAvatars(data.data);
                    appendLog(`Successfully loaded ${data.data.length} avatars into the matrix.`);
                }
            } catch (err) {
                appendLog("ERROR: Failed to connect to TikTok API backend.");
            }
        };

        const fetchVoices = async () => {
            try {
                const res = await fetch("https://web-production-1f2e2.up.railway.app/api/tiktok/voices");
                const data = await res.json();
                if (data.status === "success" && data.data?.length > 0) {
                    setVoices(data.data);
                    setSelectedVoiceIds([data.data[0].voice_id]);
                    appendLog(`Successfully loaded ${data.data.length} synthesis voices.`);
                }
            } catch (err) {}
        };
        fetchAvatars();
        fetchVoices();
    }, []);

    const updateJobState = (taskId: string, updates: Partial<BatchJob>) => {
        setBatchJobs(prev => prev.map(job => job.taskId === taskId ? { ...job, ...updates } : job));
    };

    const pollResults = async (taskId: string) => {
        const interval = setInterval(async () => {
            try {
                // Poll the dedicated Digital Avatar status endpoint
                const res = await fetch(`https://web-production-1f2e2.up.railway.app/api/tiktok/status/avatar/${taskId}`);
                if (res.status === 200) {
                    const data = await res.json();
                    const tasks = data.list || [];
                    
                    if (tasks.length > 0) {
                        const t = tasks[0];
                        
                        if (t.status === "SUCCESS") {
                            appendLog(`[Task ${taskId.slice(-4)}] Render Complete. HD Video Online.`);
                            updateJobState(taskId, {
                                status: 'SUCCESS',
                                videoUrl: t.preview_url || t.video_url || t.avatar_video_id
                            });
                            
                            // Check completeness
                            setBatchJobs(currentJobs => {
                                const activeMap = currentJobs.map(job => job.taskId === taskId ? { ...job, status: 'SUCCESS' } : job);
                                if (activeMap.every(j => j.status !== 'PROCESSING')) setLoading(false);
                                return activeMap;
                            });
                            
                            clearInterval(interval);
                        } else if (t.status === "FAILED") {
                            const errorObj = t.fail_reason || t.error_msg || t.message || t.fail_msg || JSON.stringify(t);
                            appendLog(`[Task ${taskId.slice(-4)}] CRITICAL ERROR: ${errorObj}`);
                            updateJobState(taskId, {
                                status: 'FAILED',
                                errorDetails: String(errorObj)
                            });
                            
                            // Check completeness
                            setBatchJobs(currentJobs => {
                                const activeMap = currentJobs.map(job => job.taskId === taskId ? { ...job, status: 'FAILED' } : job);
                                if (activeMap.every(j => j.status !== 'PROCESSING')) setLoading(false);
                                return activeMap;
                            });
                            
                            clearInterval(interval);
                        }
                    }
                }
            } catch (e) {
                // Keep polling
            }
        }, 5000);
    };

    const handleGenerate = async () => {
        const totalPermutations = selectedAvatarIds.length * selectedVoiceIds.length;
        if (selectedAvatarIds.length === 0 || selectedVoiceIds.length === 0 || totalPermutations > 10) return;
        
        setLoading(true);
        setBatchJobs([]);
        setTerminalLogs(["[SYSTEM] Batch Generation Matrix Initialized..."]);
        setIsConfigOpen(false);

        try {
            const combos: any[] = [];
            for (const aId of selectedAvatarIds) {
                for (const vId of selectedVoiceIds) {
                    combos.push({
                        avatar_id: aId,
                        script: script,
                        voice_id: vId
                    });
                }
            }
            
            appendLog(`Dispatching payload with ${combos.length} permutations...`);
            
            // TikTok strictly limits `material_packages` arrays to exactly 5 elements per API request!
            // To honor our 10 limit while respecting TikTok's rule, we chunk the array.
            const chunks: any[][] = [];
            for (let i = 0; i < combos.length; i += 5) {
                chunks.push(combos.slice(i, i + 5));
            }
            
            let allCreatedTasks: any[] = [];
            let chunkError = null;

            for (const [idx, chunk] of chunks.entries()) {
                appendLog(`Dispatching API chunk ${idx + 1}/${chunks.length} (${chunk.length} items)...`);
                
                const res = await fetch("https://web-production-1f2e2.up.railway.app/api/tiktok/avatar/generate", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ material_packages: chunk }),
                });

                const data = await res.json();
                
                if (data.task_data?.list?.length > 0) {
                    allCreatedTasks = [...allCreatedTasks, ...data.task_data.list];
                } else if (data.task_data?.task_id) {
                    allCreatedTasks.push({ task_id: data.task_data.task_id });
                } else {
                    chunkError = data;
                    break;
                }
            }

            if (allCreatedTasks.length > 0) {
                appendLog(`Worker Cluster Dispatched. Registered ${allCreatedTasks.length} total tasks.`);
                if (chunkError) {
                    appendLog(`WARNING: A partial chunk failed to submit: ${JSON.stringify(chunkError)}`);
                }
                
                const newJobs: BatchJob[] = allCreatedTasks.map((t: any, idx: number) => ({
                    taskId: t.task_id,
                    avatarId: combos[idx]?.avatar_id || "Unknown",
                    voiceId: combos[idx]?.voice_id || "Unknown",
                    status: 'PROCESSING',
                    videoUrl: null,
                    errorDetails: null
                }));
                
                setBatchJobs(newJobs);
                setLoading(false);
                
                newJobs.forEach(job => pollResults(job.taskId));
            } else {
                appendLog(`CRITICAL ERROR: ${JSON.stringify(chunkError || "Unknown error")}`);
                setLoading(false);
            }
        } catch (e) {
            appendLog(`CRITICAL ERROR: Network failure submitting batch.`);
            setLoading(false);
        }
    };

    const safeAvatars = avatars || [];
    const industries = ["All", ...Array.from(new Set(safeAvatars.flatMap(a => a.tag_groups?.find((g: any) => g.tag_type === 'industry')?.tags || [])))];
    const genders = ["All", ...Array.from(new Set(safeAvatars.flatMap(a => a.tag_groups?.find((g: any) => g.tag_type === 'gender')?.tags || [])))];
    const scenes = ["All", ...Array.from(new Set(safeAvatars.flatMap(a => a.tag_groups?.find((g: any) => g.tag_type === 'scene')?.tags || [])))];
    const regions = ["All", ...Array.from(new Set(safeAvatars.flatMap(a => a.tag_groups?.find((g: any) => g.tag_type === 'region')?.tags || [])))];

    const filteredAvatars = safeAvatars.filter(a => {
        if (searchQuery && !a.avatar_name?.toLowerCase().includes(searchQuery.toLowerCase()) && !a.avatar_id?.includes(searchQuery)) return false;
        if (filterIndustry !== "All" && !a.tag_groups?.find((g: any) => g.tag_type === 'industry')?.tags?.includes(filterIndustry)) return false;
        if (filterGender !== "All" && !a.tag_groups?.find((g: any) => g.tag_type === 'gender')?.tags?.includes(filterGender)) return false;
        if (filterScene !== "All" && !a.tag_groups?.find((g: any) => g.tag_type === 'scene')?.tags?.includes(filterScene)) return false;
        if (filterRegion !== "All" && !a.tag_groups?.find((g: any) => g.tag_type === 'region')?.tags?.includes(filterRegion)) return false;
        return true;
    });

    return (
        <div className="h-screen bg-[#0a0a0a] text-gray-300 flex flex-col font-sans overflow-hidden">
            {/* Nav Header */}
            <div className="flex justify-between items-center bg-[#111] border-b border-gray-800 px-6 py-3 shrink-0">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setIsConfigOpen(!isConfigOpen)}
                        className="p-2 bg-[#0a0a0a] hover:bg-gray-800 rounded-md transition-colors text-gray-400 border border-gray-800"
                    >
                        {isConfigOpen ? <ChevronLeft size={20} /> : <Menu size={20} />}
                    </button>
                    <div>
                        <h1 className="text-xl font-black tracking-tight text-teal-400 leading-none">NMG Symphony</h1>
                        <p className="text-gray-500 text-xs mt-1 font-mono uppercase tracking-wider">TikTok Generative API Control</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Link href="/" className="text-gray-400 hover:text-gray-300 text-sm border border-gray-800 bg-gray-900/50 px-3 py-1.5 rounded-md transition-colors font-mono">
                        [ BACK_TO_ADS ]
                    </Link>
                </div>
            </div>

            {/* 3-Column Workspace */}
            <div className="flex-1 flex overflow-hidden">

                {/* COLUMN 1: Config Sidebar */}
                <div className={`bg-[#111] border-r border-gray-800 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-800 transition-all duration-300 ease-in-out shrink-0 ${isConfigOpen ? 'w-full md:w-[400px] xl:w-[450px] p-6' : 'w-0 p-0 overflow-hidden border-r-0'}`}>
                    <div className="space-y-6 w-full min-w-[350px]">
                        <Card className="bg-black border-teal-900/30 shadow-sm">
                            <CardHeader className="bg-teal-950/20 text-teal-500 rounded-t-lg pb-4 border-b border-teal-900/30">
                                <CardTitle className="text-lg font-mono uppercase tracking-wider">Avatar Settings</CardTitle>
                            </CardHeader>
                            <CardContent className="pt-4 space-y-4">
                                <div className="space-y-2">
                                    <Label className="font-bold text-gray-400 font-mono text-xs uppercase">Script Iteration</Label>
                                    <Textarea
                                        value={script}
                                        onChange={e => setScript(e.target.value)}
                                        rows={4}
                                        maxLength={2000}
                                        className="bg-[#0a0a0a] border-teal-900/50 text-white focus:ring-teal-500 font-mono text-xs resize-none"
                                    />
                                    <div className="flex justify-between items-center text-xs text-gray-600 font-mono">
                                        <p>The Avatar will naturally lip-sync this exact text.</p>
                                        <span className={script.length > 1900 ? "text-red-400 font-bold" : ""}>{script.length} / 2000</span>
                                    </div>
                                </div>
                                
                                <div className="space-y-2 pt-2">
                                    <Label className="font-bold text-gray-400 font-mono text-xs uppercase">Voice Models (Multi-Select)</Label>
                                    <div className="h-40 overflow-y-auto bg-[#0a0a0a] border border-teal-900/50 rounded-md p-2 space-y-1 scrollbar-thin scrollbar-thumb-teal-900/50">
                                        {voices.map(v => (
                                            <div 
                                                key={v.voice_id}
                                                onClick={() => {
                                                    if (selectedVoiceIds.includes(v.voice_id)) {
                                                        setSelectedVoiceIds(prev => prev.filter(id => id !== v.voice_id));
                                                    } else {
                                                        setSelectedVoiceIds(prev => [...prev, v.voice_id]);
                                                    }
                                                }}
                                                className={`flex items-center justify-between p-2 rounded cursor-pointer transition-colors ${selectedVoiceIds.includes(v.voice_id) ? 'bg-teal-900/40 border border-teal-500 text-teal-300' : 'bg-transparent border border-transparent hover:bg-gray-900 text-gray-400'}`}
                                            >
                                                <span className="text-xs font-mono truncate">{v.voice_name ? v.voice_name : v.voice_id}</span>
                                                {selectedVoiceIds.includes(v.voice_id) && <div className="w-2 h-2 rounded-full bg-teal-500"></div>}
                                            </div>
                                        ))}
                                    </div>
                                    <p className="text-xs text-teal-500 font-mono text-right">{selectedVoiceIds.length} Voices Selected</p>
                                </div>
                            </CardContent>
                        </Card>

                        <div className="space-y-2">
                            {(() => {
                                const perms = selectedAvatarIds.length * selectedVoiceIds.length;
                                return (
                                    <Button onClick={handleGenerate} disabled={loading || perms === 0 || perms > 10} className="w-full h-12 text-lg font-bold bg-teal-600 hover:bg-teal-500 text-white font-mono uppercase tracking-widest border-0 shadow-lg shadow-teal-500/20 disabled:opacity-50 transition-all">
                                        {loading ? "[ CONFIGURING BATCH... ]" : perms > 10 ? "[ LIMIT_EXCEEDED (MAX 10) ]" : `[ GENERATE_${perms}_VIDEOS ]`}
                                    </Button>
                                );
                            })()}
                        </div>
                    </div>
                </div>

                {/* COLUMN 2: Workspace Center */}
                <div className="flex-1 overflow-y-auto bg-[#0a0a0a] p-6 scrollbar-thin scrollbar-thumb-gray-800">
                    <div className="max-w-6xl mx-auto space-y-6">
                        {loading && (
                            <div className="flex flex-col items-center justify-center p-24 text-center space-y-4">
                                <Video className="w-12 h-12 text-teal-500 animate-pulse" />
                                <p className="text-sm text-teal-400 font-mono uppercase tracking-widest text-shadow">TikTok Server Farm Active</p>
                                <p className="text-gray-500 font-mono tracking-widest text-xs uppercase">&gt; Dispatching Concurrent Node Cluster...</p>
                            </div>
                        )}

                        {!loading && batchJobs.length > 0 && (
                            <div className="space-y-6">
                                <div className="flex justify-between items-center mb-4 border-b border-gray-800 pb-4">
                                    <h2 className="text-teal-400 font-mono uppercase tracking-widest text-sm font-bold flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-teal-500 animate-pulse"></div> Active Matrix Sequence
                                    </h2>
                                    <Button onClick={() => setBatchJobs([])} variant="outline" className="border-teal-500/50 text-teal-400 hover:text-white font-mono text-xs hover:bg-teal-900/40 h-8">
                                        [ RESET_WORKSPACE ]
                                    </Button>
                                </div>
                            
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                                    {batchJobs.map((job) => {
                                        const av = avatars.find(a => a.avatar_id === job.avatarId);
                                        const vc = voices.find(v => v.voice_id === job.voiceId);
                                        const avName = av?.avatar_name || job.avatarId;
                                        const vcName = vc?.voice_name || job.voiceId;
                                        
                                        return (
                                            <div key={job.taskId} className={`bg-[#0a0a0a] overflow-hidden rounded-xl border flex flex-col group relative transition-colors ${job.status === 'SUCCESS' ? 'border-teal-500/50' : job.status === 'FAILED' ? 'border-red-900/50' : 'border-gray-800'}`}>
                                                <div className="bg-[#111] border-b border-gray-800 px-3 py-2 flex justify-between items-center z-10">
                                                    <div className="flex flex-col overflow-hidden mr-2">
                                                        <span className="text-teal-400 font-bold font-mono text-[10px] truncate">{avName}</span>
                                                        <span className="text-gray-500 font-mono text-[9px] uppercase tracking-wider truncate">{vcName}</span>
                                                    </div>
                                                    <div className="font-mono text-[9px] uppercase tracking-widest px-2 py-1 rounded bg-[#0a0a0a] border border-gray-800 flex items-center gap-1.5 shrink-0">
                                                        {job.status === 'PROCESSING' && <><div className="w-1.5 h-1.5 bg-yellow-500 rounded-full animate-pulse"></div><span className="text-yellow-500">Processing</span></>}
                                                        {job.status === 'SUCCESS' && <><div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div><span className="text-green-400">Success</span></>}
                                                        {job.status === 'FAILED' && <><div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div><span className="text-red-500">Failed</span></>}
                                                    </div>
                                                </div>
                                                
                                                <div className="relative aspect-[9/16] bg-black flex items-center justify-center overflow-hidden">
                                                    {job.status === 'SUCCESS' && job.videoUrl ? (
                                                        <video src={job.videoUrl} controls autoPlay className="w-full h-full object-cover shadow-2xl" />
                                                    ) : (
                                                        <>
                                                            {av?.avatar_thumbnail && (
                                                                <img src={av.avatar_thumbnail} className={`w-full h-full object-cover transition-all duration-1000 ${job.status === 'FAILED' ? 'grayscale opacity-20 blur-sm' : 'grayscale opacity-40 blur-[2px]'}`} />
                                                            )}
                                                            <div className="absolute inset-0 flex flex-col items-center justify-center z-10 p-4 text-center">
                                                                {job.status === 'PROCESSING' && (
                                                                    <div className="bg-black/80 p-4 rounded-xl border border-gray-800 flex flex-col items-center">
                                                                        <Video className="w-8 h-8 text-teal-500/50 animate-pulse mb-3" />
                                                                        <span className="text-teal-400 font-mono text-[10px] tracking-widest uppercase">Executing Node Sequence...</span>
                                                                    </div>
                                                                )}
                                                                {job.status === 'FAILED' && (
                                                                    <div className="bg-black/90 p-4 rounded-xl border border-red-900 flex flex-col items-center">
                                                                        <span className="text-red-500 font-bold font-mono text-[10px] uppercase mb-2">CRITICAL REJECTION</span>
                                                                        <span className="text-gray-400 font-mono text-[9px] break-words line-clamp-3 overflow-hidden">{job.errorDetails}</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {!loading && batchJobs.length === 0 && (
                            <>
                                <div className="flex justify-between items-center mb-4">
                                    <h2 className="text-gray-200 font-mono uppercase tracking-widest text-sm">Select Digital Actor</h2>
                                    <div className="flex items-center gap-4">
                                        <span className="text-xs text-teal-500 font-mono">{selectedAvatarIds.length} Actor(s) Selected</span>
                                        <span className="text-xs text-gray-500 font-mono px-2 border-l border-gray-800">{filteredAvatars.length} Models Array</span>
                                    </div>
                                </div>
                                
                                {avatars.length > 0 && (
                                    <div className="flex flex-wrap gap-2 mb-6 p-3 bg-[#111] rounded-lg border border-gray-800">
                                        <Input 
                                            placeholder="🔍 Search ID or Name..." 
                                            value={searchQuery}
                                            onChange={e => setSearchQuery(e.target.value)}
                                            className="h-8 w-48 bg-[#0a0a0a] border-gray-700 text-xs font-mono placeholder:text-gray-600 focus-visible:ring-1 focus-visible:ring-teal-500"
                                        />
                                        
                                        <select value={filterIndustry} onChange={e => setFilterIndustry(e.target.value)} className="h-8 px-2 rounded-md bg-[#0a0a0a] border border-gray-700 text-gray-400 text-xs font-mono outline-none focus:ring-1 focus:ring-teal-500 capitalize">
                                            {industries.map(opt => <option key={opt} value={opt}>{opt === 'All' ? 'Industry' : opt.replace(/_/g, ' ')}</option>)}
                                        </select>
                                        
                                        <select value={filterGender} onChange={e => setFilterGender(e.target.value)} className="h-8 px-2 rounded-md bg-[#0a0a0a] border border-gray-700 text-gray-400 text-xs font-mono outline-none focus:ring-1 focus:ring-teal-500 capitalize">
                                            {genders.map(opt => <option key={opt} value={opt}>{opt === 'All' ? 'Gender' : opt.replace(/_/g, ' ')}</option>)}
                                        </select>
                                        
                                        <select value={filterScene} onChange={e => setFilterScene(e.target.value)} className="h-8 px-2 rounded-md bg-[#0a0a0a] border border-gray-700 text-gray-400 text-xs font-mono outline-none focus:ring-1 focus:ring-teal-500 capitalize">
                                            {scenes.map(opt => <option key={opt} value={opt}>{opt === 'All' ? 'Background' : opt.replace(/_/g, ' ')}</option>)}
                                        </select>
                                        
                                        <select value={filterRegion} onChange={e => setFilterRegion(e.target.value)} className="h-8 px-2 rounded-md bg-[#0a0a0a] border border-gray-700 text-gray-400 text-xs font-mono outline-none focus:ring-1 focus:ring-teal-500 capitalize">
                                            {regions.map(opt => <option key={opt} value={opt}>{opt === 'All' ? 'Region' : opt.replace(/_/g, ' ')}</option>)}
                                        </select>
                                    </div>
                                )}
                                
                                {avatars.length === 0 ? (
                                    <div className="text-center py-20 text-gray-600 font-mono text-sm animate-pulse">
                                        &gt; Loading global avatar database...
                                    </div>
                                ) : filteredAvatars.length === 0 ? (
                                    <div className="text-center py-20 text-gray-600 font-mono text-sm">
                                        &gt; No avatars match the selected filters.
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                                        {filteredAvatars.map(avatar => (
                                            <div 
                                                key={avatar.avatar_id}
                                                onClick={() => {
                                                    if (selectedAvatarIds.includes(avatar.avatar_id)) {
                                                        setSelectedAvatarIds(prev => prev.filter(id => id !== avatar.avatar_id));
                                                    } else {
                                                        setSelectedAvatarIds(prev => [...prev, avatar.avatar_id]);
                                                    }
                                                }}
                                                className={`group relative rounded-xl overflow-hidden cursor-pointer transition-all border-2 ${selectedAvatarIds.includes(avatar.avatar_id) ? 'border-teal-500 shadow-[0_0_15px_rgba(20,184,166,0.5)]' : 'border-transparent hover:border-gray-600'}`}
                                            >
                                                <img 
                                                    src={avatar.avatar_thumbnail} 
                                                    alt={avatar.avatar_name}
                                                    className="w-full h-auto object-cover aspect-[9/16]"
                                                />
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent"></div>
                                                <div className="absolute bottom-0 left-0 right-0 p-3">
                                                    <p className="text-white font-mono text-xs font-bold truncate">{avatar.avatar_name}</p>
                                                    
                                                    <div className="flex gap-1 mt-1 overflow-x-hidden">
                                                      {avatar.tag_groups?.map((group: any, idx: number) => (
                                                          <span key={idx} className="bg-black/80 text-gray-400 text-[9px] px-1.5 py-0.5 rounded font-mono uppercase whitespace-nowrap border border-gray-800">
                                                              {group.tags?.[0]}
                                                          </span>
                                                      ))}
                                                    </div>
                                                </div>
                                                
                                                {/* Select overlay */}
                                                {selectedAvatarIds.includes(avatar.avatar_id) && (
                                                    <div className="absolute inset-0 bg-teal-500/10 flex items-center justify-center pointer-events-none">
                                                        <div className="bg-teal-500 text-black font-mono font-bold text-[10px] uppercase px-2 py-1 rounded-full shadow-lg">✓ Selected</div>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>

                {/* COLUMN 3: Terminal Console (Right) */}
                <div className="w-full md:w-[300px] xl:w-[350px] bg-[#0A0A0A] border-l border-gray-800 flex flex-col shrink-0">
                    <div className="bg-[#111] px-4 py-3 border-b border-gray-800 flex items-center gap-2 shrink-0 text-gray-400">
                        <Terminal size={16} className="text-teal-500" />
                        <span className="text-xs font-mono font-bold tracking-wider uppercase">Symphony Terminal</span>
                    </div>
                    <div className="p-4 overflow-y-auto flex-1 font-mono text-xs leading-relaxed space-y-1">
                        {terminalLogs.map((log, i) => (
                            <div key={i} className={`${log.includes("ERROR") ? 'text-red-400' : 'text-teal-400'}`}>
                                {log}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
