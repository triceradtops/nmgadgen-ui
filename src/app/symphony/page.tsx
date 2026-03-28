/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @next/next/no-img-element */
/* eslint-disable jsx-a11y/alt-text */
"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Menu, ChevronLeft, Terminal, Play, Video, Loader2, Square, ChevronDown, CheckCircle2, X } from "lucide-react";
import Link from 'next/link';

const RenderTimer = ({ startedAt }: { startedAt: number }) => {
    const [elapsed, setElapsed] = useState(() => Math.floor((Date.now() - startedAt) / 1000));
    useEffect(() => {
        const int = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt) / 1000)), 1000);
        return () => clearInterval(int);
    }, [startedAt]);
    
    const mins = Math.floor(elapsed / 60);
    const secs = elapsed % 60;
    return <span className="text-teal-500 font-mono text-[10px] tabular-nums mt-2 border border-teal-900/50 bg-teal-900/20 px-2 py-0.5 rounded">T+{mins}:{secs.toString().padStart(2, '0')}</span>;
};

export default function SymphonyStudio() {
    const [loading, setLoading] = useState(false);
    const [terminalLogs, setTerminalLogs] = useState<string[]>(["[TIKTOK_SYMPHONY] Neural Engine Initialized..."]);
    const [isConfigOpen, setIsConfigOpen] = useState(true);
    
    // Symphony Data
    const [avatars, setAvatars] = useState<any[]>([]);
    const [voices, setVoices] = useState<any[]>([]);
    const [selectedAvatarIds, setSelectedAvatarIds] = useState<string[]>([]);
    
    // Gender Mapped Voice States
    const [selectedMaleVoiceId, setSelectedMaleVoiceId] = useState<string | null>(null);
    const [selectedFemaleVoiceId, setSelectedFemaleVoiceId] = useState<string | null>(null);
    const [script, setScript] = useState("Hey, we finally implemented Symphony before the quarter ended!");
    
    // Result Tracking
    type BatchJob = {
        taskId: string;
        avatarId: string;
        voiceId: string;
        status: string; // 'PROCESSING', 'SUCCESS', 'FAILED'
        videoUrl: string | null;
        errorDetails: string | null;
        isGenderUnknown?: boolean;
        startedAt: number;
    };
    const [batchJobs, setBatchJobs] = useState<BatchJob[]>([]);
    
    // Filters
    const [filterIndustry, setFilterIndustry] = useState("All");
    const [filterGender, setFilterGender] = useState("All");
    const [filterScene, setFilterScene] = useState("All");
    const [filterRegion, setFilterRegion] = useState("All");
    const [searchQuery, setSearchQuery] = useState("");
    
    // Voice Filters
    const [voiceFilterLanguage, setVoiceFilterLanguage] = useState("All");
    const [voiceFilterAge, setVoiceFilterAge] = useState("All");
    
    // Custom Interactive Picker States
    const [isMalePickerOpen, setIsMalePickerOpen] = useState(false);
    const [isFemalePickerOpen, setIsFemalePickerOpen] = useState(false);
    
    // Audio Player Context
    const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    const handlePlayVoice = (url: string, id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (playingVoiceId === id) {
            audioRef.current?.pause();
            setPlayingVoiceId(null);
        } else {
            if (audioRef.current) audioRef.current.pause();
            audioRef.current = new Audio(url);
            audioRef.current.play();
            setPlayingVoiceId(id);
            audioRef.current.onended = () => setPlayingVoiceId(null);
        }
    };
    
    const renderVoiceCard = (v: any, isSelected: boolean, onSelect: () => void) => {
        const nation = v.voice_tags?.find((t: any) => t.tag_type === 'Nation')?.tag_name;
        const age = v.voice_tags?.find((t: any) => t.tag_type === 'Age')?.tag_name;
        const gender = v.voice_tags?.find((t: any) => t.tag_type === 'Gender')?.tag_name;
        const accent = v.voice_tags?.find((t: any) => t.tag_type === 'Accent')?.tag_name;

        return (
            <div 
                key={v.voice_id}
                onClick={onSelect}
                className={`p-3 rounded-lg border cursor-pointer hover:bg-[#111] transition-all flex items-center gap-3 ${isSelected ? 'border-teal-500 bg-teal-900/10 shadow-[0_0_15px_rgba(20,184,166,0.1)]' : 'border-gray-800 bg-[#0a0a0a]'}`}
            >
                <button 
                    onClick={(e) => handlePlayVoice(v.preview_url, v.voice_id, e)}
                    className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border transition-colors ${playingVoiceId === v.voice_id ? 'bg-teal-500 text-black border-teal-500 shadow-[0_0_10px_rgba(20,184,166,0.5)]' : 'bg-[#111] text-gray-400 border-gray-700 hover:text-white hover:border-gray-500'}`}
                >
                    {playingVoiceId === v.voice_id ? <Square fill="currentColor" size={14}/> : <Play fill="currentColor" size={14} className="ml-0.5" />}
                </button>
                <div className="flex-1 overflow-hidden pointer-events-none">
                    <div className="flex justify-between items-center mb-1">
                        <span className="font-bold text-gray-200 text-sm truncate flex items-center gap-2">
                            {v.voice_name || v.voice_id}
                            {isSelected && <CheckCircle2 size={12} className="text-teal-500" />}
                        </span>
                        {nation && <span className="text-[10px] font-mono text-gray-400 bg-gray-900 border border-gray-700 px-1.5 py-0.5 rounded ml-2 shrink-0">{nation}</span>}
                    </div>
                    <div className="text-[10px] text-gray-500 font-mono truncate">
                        {accent} • {gender} • {age}
                    </div>
                </div>
            </div>
        );
    };

    const appendLog = (msg: string) => {
        setTerminalLogs(prev => [...prev.slice(-49), `[${new Date().toLocaleTimeString()}] ${msg}`]);
    };

    // Load API Resources on mount
    useEffect(() => {
        const fetchAvatars = async () => {
            appendLog("Fetching global Digital Avatar library from TikTok...");
            try {
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
                    
                    // Pre-sort and default male/female voice setups implicitly on load
                    const males = data.data.filter((v: any) => v.voice_tags?.some((t: any) => t.tag_type === 'Gender' && t.tag_name === 'Male'));
                    const females = data.data.filter((v: any) => v.voice_tags?.some((t: any) => t.tag_type === 'Gender' && t.tag_name === 'Female'));
                    
                    if (males.length > 0) setSelectedMaleVoiceId(males[0].voice_id);
                    if (females.length > 0) setSelectedFemaleVoiceId(females[0].voice_id);
                    
                    // Failsafe configuration for un-tagged databases
                    if (!males.length && data.data.length > 0) setSelectedMaleVoiceId(data.data[0].voice_id);
                    
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
                            
                            setBatchJobs(currentJobs => {
                                const activeMap = currentJobs.map(job => job.taskId === taskId ? { ...job, status: 'FAILED' } : job);
                                if (activeMap.every(j => j.status !== 'PROCESSING')) setLoading(false);
                                return activeMap;
                            });
                            
                            clearInterval(interval);
                        }
                    }
                }
            } catch (e) {}
        }, 5000);
    };

    // Derived Selection Arrays based on live tag evaluation
    const selectedMaleAvatars = avatars.filter(a => selectedAvatarIds.includes(a.avatar_id) && a.tag_groups?.some((g: any) => g.tag_type === 'gender' && g.tags?.includes('Male')));
    const selectedFemaleAvatars = avatars.filter(a => selectedAvatarIds.includes(a.avatar_id) && a.tag_groups?.some((g: any) => g.tag_type === 'gender' && g.tags?.includes('Female')));
    const selectedUnknownAvatars = avatars.filter(a => selectedAvatarIds.includes(a.avatar_id) && !a.tag_groups?.some((g: any) => g.tag_type === 'gender' && (g.tags?.includes('Male') || g.tags?.includes('Female'))));

    const needsMaleVoice = selectedMaleAvatars.length > 0 || selectedUnknownAvatars.length > 0;
    const needsFemaleVoice = selectedFemaleAvatars.length > 0;
    
    const filterableLanguages = ["All", ...Array.from(new Set(voices.map(v => v.voice_tags?.find((t: any) => t.tag_type === 'Nation')?.tag_name).filter(Boolean)))];
    const filterableAges = ["All", ...Array.from(new Set(voices.map(v => v.voice_tags?.find((t: any) => t.tag_type === 'Age')?.tag_name).filter(Boolean)))];
    
    const formatVoiceOption = (v: any) => {
        const nation = v.voice_tags?.find((t: any) => t.tag_type === 'Nation')?.tag_name;
        const age = v.voice_tags?.find((t: any) => t.tag_type === 'Age')?.tag_name;
        const chunks = [];
        if (nation) chunks.push(nation);
        if (age) chunks.push(age.replace(/_/g, ' '));
        return `${v.voice_name || v.voice_id}${chunks.length > 0 ? ` - ${chunks.join(" · ")}` : ""}`;
    };
    
    // Extracted global list subsets mapped directly to tags dynamically + explicit user filtering
    const maleVoices = voices.filter((v: any) => {
        if (!v.voice_tags?.some((t: any) => t.tag_type === 'Gender' && t.tag_name === 'Male')) return false;
        if (voiceFilterLanguage !== "All" && !v.voice_tags?.some((t: any) => t.tag_type === 'Nation' && t.tag_name === voiceFilterLanguage)) return false;
        if (voiceFilterAge !== "All" && !v.voice_tags?.some((t: any) => t.tag_type === 'Age' && t.tag_name === voiceFilterAge)) return false;
        return true;
    });
    
    const femaleVoices = voices.filter((v: any) => {
        if (!v.voice_tags?.some((t: any) => t.tag_type === 'Gender' && t.tag_name === 'Female')) return false;
        if (voiceFilterLanguage !== "All" && !v.voice_tags?.some((t: any) => t.tag_type === 'Nation' && t.tag_name === voiceFilterLanguage)) return false;
        if (voiceFilterAge !== "All" && !v.voice_tags?.some((t: any) => t.tag_type === 'Age' && t.tag_name === voiceFilterAge)) return false;
        return true;
    });
    
    const fallbackMaleVoices = maleVoices.length > 0 ? maleVoices : voices;

    const handleGenerate = async () => {
        if (selectedAvatarIds.length === 0 || selectedAvatarIds.length > 5) return;
        if (needsMaleVoice && !selectedMaleVoiceId) return;
        if (needsFemaleVoice && !selectedFemaleVoiceId) return;
        
        setLoading(true);
        setBatchJobs([]);
        setTerminalLogs(["[SYSTEM] Batch 1:1 Generation Matrix Initialized..."]);
        setIsConfigOpen(false);

        try {
            const combos: any[] = [];
            const mappedResultsUI: BatchJob[] = [];

            // Directly map 1 element to 1 matched configuration avoiding N-permutation explosion
            for (const aId of selectedAvatarIds) {
                const isMale = selectedMaleAvatars.some(a => a.avatar_id === aId);
                const isFemale = selectedFemaleAvatars.some(a => a.avatar_id === aId);
                const isUnknown = selectedUnknownAvatars.some(a => a.avatar_id === aId);
                
                let assignedVoice = "";
                if (isFemale && selectedFemaleVoiceId) {
                    assignedVoice = selectedFemaleVoiceId;
                } else if (selectedMaleVoiceId) {
                    assignedVoice = selectedMaleVoiceId; // Force fallback to default male voice globally
                }
                
                combos.push({
                    avatar_id: aId,
                    script: script,
                    voice_id: assignedVoice
                });
                
                mappedResultsUI.push({
                    taskId: `tmp_${aId}`,
                    avatarId: aId,
                    voiceId: assignedVoice,
                    status: 'PENDING',
                    videoUrl: null,
                    errorDetails: null,
                    isGenderUnknown: isUnknown,
                    startedAt: Date.now()
                });
            }
            
            appendLog(`Dispatching payload strictly bounded strictly to 5 length limit (${combos.length} assets)...`);
            
            // Single blast batch dispatch honoring strict 5-element max
            const res = await fetch("https://web-production-1f2e2.up.railway.app/api/tiktok/avatar/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ material_packages: combos }),
            });

            const data = await res.json();
            
            let allCreatedTasks: any[] = [];
            if (data.task_data?.list?.length > 0) {
                allCreatedTasks = data.task_data.list;
            } else if (data.task_data?.task_id) {
                allCreatedTasks = [{ task_id: data.task_data.task_id }];
            }

            if (allCreatedTasks.length > 0) {
                appendLog(`Worker Cluster Dispatched. Registered ${allCreatedTasks.length} total tasks.`);
                
                const newJobs: BatchJob[] = allCreatedTasks.map((t: any, idx: number) => ({
                    taskId: t.task_id,
                    avatarId: combos[idx]?.avatar_id || "Unknown",
                    voiceId: combos[idx]?.voice_id || "Unknown",
                    status: 'PROCESSING',
                    videoUrl: null,
                    errorDetails: null,
                    isGenderUnknown: mappedResultsUI[idx]?.isGenderUnknown || false,
                    startedAt: Date.now()
                }));
                
                setBatchJobs(newJobs);
                setLoading(false);
                
                newJobs.forEach(job => pollResults(job.taskId));
            } else {
                appendLog(`CRITICAL ERROR: ${JSON.stringify(data)}`);
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

            <div className="flex-1 flex overflow-hidden">
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
                                
                                {/* Dynamic Voice Selectors mapped strictly directly against selected Avatars Matrix logic */}
                                {needsMaleVoice && (
                                    <div className="space-y-2 pt-2 border-t border-teal-900/10">
                                        <Label className="font-bold text-gray-400 font-mono text-xs uppercase flex items-center justify-between">
                                            Male Voice Model 
                                            {selectedUnknownAvatars.length > 0 && <span className="text-orange-400 text-[9px] lowercase bg-orange-400/10 px-1.5 py-0.5 rounded ml-2 border border-orange-500/20">fallback mapping</span>}
                                        </Label>
                                        
                                        {!isMalePickerOpen ? (
                                            <div 
                                                className="border border-teal-900/50 bg-[#0a0a0a] rounded-lg p-2 flex items-center justify-between cursor-pointer hover:border-teal-700 transition-colors"
                                                onClick={() => setIsMalePickerOpen(true)}
                                            >
                                                <div className="flex-1 flex flex-col gap-0 opacity-100">
                                                    {selectedMaleVoiceId && voices.find(v => v.voice_id === selectedMaleVoiceId) ? (
                                                        renderVoiceCard(voices.find(v => v.voice_id === selectedMaleVoiceId), true, () => setIsMalePickerOpen(true))
                                                    ) : (
                                                        <span className="text-gray-500 font-mono text-xs pl-2 py-2">Select a voice...</span>
                                                    )}
                                                </div>
                                                <ChevronDown size={16} className="text-teal-500 mx-2 shrink-0" />
                                            </div>
                                        ) : (
                                            <div className="border border-teal-500/30 bg-[#050505] rounded-xl overflow-hidden flex flex-col shadow-2xl ring-1 ring-teal-500/20">
                                                <div className="bg-[#111] p-3 border-b border-gray-800 flex flex-col gap-3">
                                                    <div className="flex justify-between items-center">
                                                        <span className="font-mono text-xs text-teal-400 font-bold uppercase tracking-wider">Select Audio Model</span>
                                                        <button onClick={() => setIsMalePickerOpen(false)} className="text-gray-500 hover:text-white p-1 rounded hover:bg-gray-800 transition-colors"><X size={14}/></button>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <select value={voiceFilterLanguage} onChange={e => setVoiceFilterLanguage(e.target.value)} className="h-8 w-1/2 rounded-md bg-[#0a0a0a] border border-gray-800 text-gray-400 px-2 font-mono text-xs focus:ring-1 focus:ring-teal-500">
                                                            {filterableLanguages.map(opt => <option key={opt as string} value={opt as string}>{opt === 'All' ? 'World (No Filter)' : opt}</option>)}
                                                        </select>
                                                        <select value={voiceFilterAge} onChange={e => setVoiceFilterAge(e.target.value)} className="h-8 w-1/2 rounded-md bg-[#0a0a0a] border border-gray-800 text-gray-400 px-2 font-mono text-xs focus:ring-1 focus:ring-teal-500 capitalize">
                                                            {filterableAges.map(opt => <option key={opt as string} value={opt as string}>{opt === 'All' ? 'Age (No Filter)' : (opt as string).replace(/_/g, ' ')}</option>)}
                                                        </select>
                                                    </div>
                                                </div>
                                                <div className="max-h-80 overflow-y-auto p-2 space-y-2 scrollbar-thin scrollbar-thumb-gray-800">
                                                    {fallbackMaleVoices.length > 0 ? fallbackMaleVoices.map((v: any) => 
                                                        renderVoiceCard(v, selectedMaleVoiceId === v.voice_id, () => {
                                                            setSelectedMaleVoiceId(v.voice_id);
                                                            setIsMalePickerOpen(false);
                                                        })
                                                    ) : (
                                                        <div className="text-center py-8 text-gray-600 font-mono text-xs">No generic voices match parameters.</div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                                
                                {needsFemaleVoice && (
                                    <div className="space-y-2 pt-2 border-t border-teal-900/10">
                                        <Label className="font-bold text-gray-400 font-mono text-xs uppercase">Female Voice Model</Label>
                                        
                                        {!isFemalePickerOpen ? (
                                            <div 
                                                className="border border-pink-900/50 bg-[#0a0a0a] rounded-lg p-2 flex items-center justify-between cursor-pointer hover:border-pink-700 transition-colors"
                                                onClick={() => setIsFemalePickerOpen(true)}
                                            >
                                                <div className="flex-1 flex flex-col gap-0 opacity-100">
                                                    {selectedFemaleVoiceId && voices.find(v => v.voice_id === selectedFemaleVoiceId) ? (
                                                        renderVoiceCard(voices.find(v => v.voice_id === selectedFemaleVoiceId), true, () => setIsFemalePickerOpen(true))
                                                    ) : (
                                                        <span className="text-gray-500 font-mono text-xs pl-2 py-2">Select a voice...</span>
                                                    )}
                                                </div>
                                                <ChevronDown size={16} className="text-pink-500 mx-2 shrink-0" />
                                            </div>
                                        ) : (
                                            <div className="border border-pink-500/30 bg-[#050505] rounded-xl overflow-hidden flex flex-col shadow-2xl ring-1 ring-pink-500/20">
                                                <div className="bg-[#111] p-3 border-b border-gray-800 flex flex-col gap-3">
                                                    <div className="flex justify-between items-center">
                                                        <span className="font-mono text-xs text-pink-400 font-bold uppercase tracking-wider">Select Audio Model</span>
                                                        <button onClick={() => setIsFemalePickerOpen(false)} className="text-gray-500 hover:text-white p-1 rounded hover:bg-gray-800 transition-colors"><X size={14}/></button>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <select value={voiceFilterLanguage} onChange={e => setVoiceFilterLanguage(e.target.value)} className="h-8 w-1/2 rounded-md bg-[#0a0a0a] border border-gray-800 text-gray-400 px-2 font-mono text-xs focus:ring-1 focus:ring-pink-500">
                                                            {filterableLanguages.map(opt => <option key={opt as string} value={opt as string}>{opt === 'All' ? 'World (No Filter)' : opt}</option>)}
                                                        </select>
                                                        <select value={voiceFilterAge} onChange={e => setVoiceFilterAge(e.target.value)} className="h-8 w-1/2 rounded-md bg-[#0a0a0a] border border-gray-800 text-gray-400 px-2 font-mono text-xs focus:ring-1 focus:ring-pink-500 capitalize">
                                                            {filterableAges.map(opt => <option key={opt as string} value={opt as string}>{opt === 'All' ? 'Age (No Filter)' : (opt as string).replace(/_/g, ' ')}</option>)}
                                                        </select>
                                                    </div>
                                                </div>
                                                <div className="max-h-80 overflow-y-auto p-2 space-y-2 scrollbar-thin scrollbar-thumb-gray-800">
                                                    {femaleVoices.length > 0 ? femaleVoices.map((v: any) => 
                                                        renderVoiceCard(v, selectedFemaleVoiceId === v.voice_id, () => {
                                                            setSelectedFemaleVoiceId(v.voice_id);
                                                            setIsFemalePickerOpen(false);
                                                        })
                                                    ) : (
                                                        <div className="text-center py-8 text-gray-600 font-mono text-xs">No generic voices match parameters.</div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                                
                                {!needsMaleVoice && !needsFemaleVoice && (
                                    <div className="text-xs text-gray-600 font-mono text-center py-4 italic border-t border-teal-900/10">
                                        Select at least one Digital Actor to configure voices.
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        <div className="space-y-2">
                            <Button 
                                onClick={handleGenerate} 
                                disabled={loading || selectedAvatarIds.length === 0} 
                                className="w-full h-12 text-lg font-bold bg-teal-600 hover:bg-teal-500 text-white font-mono uppercase tracking-widest border-0 shadow-lg shadow-teal-500/20 disabled:opacity-50 transition-all"
                            >
                                {loading ? "[ GENERATING MATRIX... ]" : `[ GENERATE_${selectedAvatarIds.length}_VIDEOS ]`}
                            </Button>
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto bg-[#0a0a0a] p-6 scrollbar-thin scrollbar-thumb-gray-800">
                    <div className="max-w-[1800px] mx-auto space-y-6">
                        {loading && (
                            <div className="flex flex-col items-center justify-center p-24 text-center space-y-4 shadow-xl">
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
                            
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                                    {batchJobs.map((job) => {
                                        const av = avatars.find(a => a.avatar_id === job.avatarId);
                                        const vc = voices.find(v => v.voice_id === job.voiceId);
                                        const avName = av?.avatar_name || job.avatarId;
                                        const vcName = vc?.voice_name || job.voiceId;
                                        
                                        return (
                                            <div key={job.taskId} className={`bg-[#0a0a0a] overflow-hidden rounded-xl border flex flex-col group relative transition-colors ${job.status === 'SUCCESS' ? 'border-teal-500/30' : job.status === 'FAILED' ? 'border-red-900/50' : 'border-gray-800'}`}>
                                                <div className="bg-[#111] border-b border-gray-800 px-3 py-2 flex justify-between items-center z-10">
                                                    <div className="flex flex-col overflow-hidden mr-2">
                                                        <span className="text-teal-400 font-bold font-mono text-[10px] truncate flex items-center gap-2">
                                                            {avName}
                                                        </span>
                                                        <span className="text-gray-500 font-mono text-[9px] uppercase tracking-wider truncate flex items-center gap-1.5 mt-0.5">
                                                            {vcName}
                                                            {job.isGenderUnknown && <span className="text-orange-900 bg-orange-500 font-bold px-1 rounded text-[7px]">SYSTEM MAPPED</span>}
                                                        </span>
                                                    </div>
                                                    <div className="font-mono text-[9px] uppercase tracking-widest px-2 py-1 rounded bg-[#0a0a0a] border border-gray-800 flex items-center gap-1.5 shrink-0">
                                                        {job.status === 'PROCESSING' && <><div className="w-1.5 h-1.5 bg-yellow-500 rounded-full animate-pulse"></div><span className="text-yellow-500">Node</span></>}
                                                        {job.status === 'SUCCESS' && <><div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div><span className="text-green-400">Idle</span></>}
                                                        {job.status === 'FAILED' && <><div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div><span className="text-red-500">Halt</span></>}
                                                    </div>
                                                </div>
                                                
                                                <div className="relative aspect-[9/16] bg-black flex items-center justify-center overflow-hidden">
                                                    {job.status === 'SUCCESS' && job.videoUrl ? (
                                                        <video src={job.videoUrl} controls preload="metadata" className="w-full h-full object-cover shadow-2xl" />
                                                    ) : (
                                                        <>
                                                            {av?.avatar_thumbnail && (
                                                                <img src={av.avatar_thumbnail} className={`w-full h-full object-cover transition-all duration-1000 ${job.status === 'FAILED' ? 'grayscale opacity-20 blur-sm' : 'grayscale opacity-40 blur-[2px]'}`} />
                                                            )}
                                                            <div className="absolute inset-0 flex flex-col items-center justify-center z-10 p-4 text-center">
                                                                {job.status === 'PROCESSING' && (
                                                                    <div className="bg-black/90 p-5 rounded-xl border border-gray-800 flex flex-col items-center shadow-2xl shadow-black">
                                                                        <Loader2 className="w-8 h-8 text-teal-400 animate-spin mb-3" />
                                                                        <span className="text-teal-400 font-mono text-[10px] tracking-widest uppercase mb-1">Executing Matrix...</span>
                                                                        <RenderTimer startedAt={job.startedAt} />
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
                                        <span className={`text-xs font-mono font-bold ${selectedAvatarIds.length >= 5 ? 'text-orange-500' : 'text-teal-500'}`}>{selectedAvatarIds.length}/5 Selected</span>
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
                                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                                        {filteredAvatars.map(avatar => (
                                            <div 
                                                key={avatar.avatar_id}
                                                onClick={() => {
                                                    if (selectedAvatarIds.includes(avatar.avatar_id)) {
                                                        setSelectedAvatarIds(prev => prev.filter(id => id !== avatar.avatar_id));
                                                    } else {
                                                        if (selectedAvatarIds.length >= 5) {
                                                            alert("You can only select up to 5 Digital Actors safely simultaneously for a direct mapped TikTok request.");
                                                        } else {
                                                            setSelectedAvatarIds(prev => [...prev, avatar.avatar_id]);
                                                        }
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

                <div className="w-full md:w-[300px] xl:w-[350px] bg-[#0A0A0A] border-l border-gray-800 flex flex-col shrink-0">
                    <div className="bg-[#111] px-4 py-3 border-b border-gray-800 flex items-center gap-2 shrink-0 text-gray-400">
                        <Terminal size={16} className="text-teal-500" />
                        <span className="text-xs font-mono font-bold tracking-wider uppercase">Symphony Terminal</span>
                    </div>
                    <div className="p-4 overflow-y-auto flex-1 font-mono text-xs leading-relaxed space-y-1">
                        {terminalLogs.map((log, i) => (
                            <div key={i} className={`${log.includes("ERROR") || log.includes("LIMIT") ? 'text-red-400' : 'text-teal-400'}`}>
                                {log}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
