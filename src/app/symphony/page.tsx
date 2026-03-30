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
import { Play, Pause, ChevronRight, FileVideo, LayoutGrid, X, Search, Check, ChevronDown, RefreshCw, Menu, ChevronLeft, Terminal, Loader2, Square, CheckCircle2, Video, User, ImageIcon, Presentation } from "lucide-react";
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
    interface AvatarGroup {
        groupId: string;
        name: string;
        identity: 'real' | 'aigc' | 'unknown';
        representativeAvatar: any;
        looks: any[];
    }
    
    const [avatars, setAvatars] = useState<any[]>([]);
    const [voices, setVoices] = useState<any[]>([]);
    const [selectedAvatarIds, setSelectedAvatarIds] = useState<string[]>([]);
    
    // Grouping & Identity States
    const [activeIdentityTab, setActiveIdentityTab] = useState<'real' | 'aigc'>('real');
    const [activeAvatarGroup, setActiveAvatarGroup] = useState<AvatarGroup | null>(null);
    
    // Gender Mapped Voice States
    const [avatarVoiceMap, setAvatarVoiceMap] = useState<Record<string, string>>({});
    const [script, setScript] = useState("Hey, we finally implemented Symphony before the quarter ended!");
    const [subtitlesEnabled, setSubtitlesEnabled] = useState(true);
    
    // Result Tracking
    type BatchJob = {
        taskId: string;
        avatarId: string;
        voiceId: string;
        status: 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'FAILED';
        videoUrl: string | null;
        subtitleUrl?: string | null;
        errorDetails: string | null;
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
    const [voiceFilterGender, setVoiceFilterGender] = useState("All");
    
    // Custom Interactive Picker States
    const [isVoicePickerOpen, setIsVoicePickerOpen] = useState(false);
    const [activeAvatarPickerId, setActiveAvatarPickerId] = useState<string | null>(null);
    
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
                    if (males.length > 0) setAvatarVoiceMap(prev => Object.keys(prev).length === 0 ? { default: males[0].voice_id } : prev);
                    
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
                                videoUrl: t.preview_url || t.video_url || t.avatar_video_id,
                                subtitleUrl: t.srt_file_url || t.subtitle_url || t.caption_url || null
                            });
                            
                            setBatchJobs(currentJobs => {
                                const activeMap = currentJobs.map(job => job.taskId === taskId ? { ...job, status: 'SUCCESS' as const } : job);
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
                                const activeMap = currentJobs.map(job => job.taskId === taskId ? { ...job, status: 'FAILED' as const } : job);
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
    const selectedMaleAvatars = avatars.filter(a => selectedAvatarIds.includes(a.avatar_id) && a.tag_groups?.some((g: any) => g.tag_type?.toLowerCase() === 'gender' && g.tags?.some((t: string) => t.toLowerCase() === 'male')));
    const selectedFemaleAvatars = avatars.filter(a => selectedAvatarIds.includes(a.avatar_id) && a.tag_groups?.some((g: any) => g.tag_type?.toLowerCase() === 'gender' && g.tags?.some((t: string) => t.toLowerCase() === 'female')));
    const selectedUnknownAvatars = avatars.filter(a => selectedAvatarIds.includes(a.avatar_id) && !a.tag_groups?.some((g: any) => g.tag_type?.toLowerCase() === 'gender' && (g.tags?.some((t: string) => t.toLowerCase() === 'male' || t.toLowerCase() === 'female'))));

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
        
        setLoading(true);
        setBatchJobs([]);
        setTerminalLogs(["[SYSTEM] Batch 1:1 Generation Matrix Initialized..."]);
        setIsConfigOpen(false);

        try {
            const combos: any[] = [];
            const mappedResultsUI: BatchJob[] = [];

            // Directly map 1 element to 1 matched configuration cleanly overriding arbitrary API assumptions
            for (const aId of selectedAvatarIds) {
                let assignedVoice = avatarVoiceMap[aId] || avatarVoiceMap['default'] || voices[0]?.voice_id; // Default fallback global
                
                combos.push({
                    avatar_id: aId,
                    script: script,
                    voice_id: assignedVoice,
                    subtitle_enabled: subtitlesEnabled,
                    subtitle_display: subtitlesEnabled,
                    caption_enabled: subtitlesEnabled,
                    show_captions: subtitlesEnabled
                });
                
                mappedResultsUI.push({
                    taskId: `tmp_${aId}`,
                    avatarId: aId,
                    voiceId: assignedVoice,
                    status: 'PENDING',
                    videoUrl: null,
                    subtitleUrl: null,
                    errorDetails: null,
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
    const industries = ["All", ...Array.from(new Set(safeAvatars.flatMap(a => a.tag_groups?.filter((g: any) => g.tag_type?.toLowerCase() === 'industry').flatMap((g: any) => g.tags?.map((t: string) => t.toLowerCase())) || [])))].filter(Boolean);
    const genders = ["All", ...Array.from(new Set(safeAvatars.flatMap(a => a.tag_groups?.filter((g: any) => g.tag_type?.toLowerCase() === 'gender').flatMap((g: any) => g.tags?.map((t: string) => t.toLowerCase())) || [])))].filter(Boolean);
    const scenes = ["All", ...Array.from(new Set(safeAvatars.flatMap(a => a.tag_groups?.filter((g: any) => g.tag_type?.toLowerCase() === 'scene').flatMap((g: any) => g.tags?.map((t: string) => t.toLowerCase())) || [])))].filter(Boolean);
    const regions = ["All", ...Array.from(new Set(safeAvatars.flatMap(a => a.tag_groups?.filter((g: any) => g.tag_type?.toLowerCase() === 'region').flatMap((g: any) => g.tags?.map((t: string) => t.toLowerCase())) || [])))].filter(Boolean);

    // Dynamic Hierarchy: Identity -> Actor/Name Groups -> Individual Variations
    const filteredAvatarGroups: AvatarGroup[] = (() => {
        const groups = new Map<string, AvatarGroup>();
        
        const identityAvatars = safeAvatars.filter(a => {
            const isAigc = a.tag_groups?.some((g: any) => g.tag_type?.toLowerCase() === 'identity' && g.tags?.some((t: string) => t.toLowerCase() === 'aigc'));
            const isReal = a.tag_groups?.some((g: any) => g.tag_type?.toLowerCase() === 'identity' && g.tags?.some((t: string) => t.toLowerCase() === 'real'));
            
            if (activeIdentityTab === 'aigc') return isAigc || (!isReal && !isAigc); // fallback
            return isReal;
        });
        
        identityAvatars.forEach(a => {
            let groupIdStr = null;
            
            // Prefer the precise Real-Human 'actor_name' tag for explicit logical clusters
            a.tag_groups?.forEach((g: any) => {
                if (g.tag_type?.toLowerCase() === 'actor_name' && g.tags?.[0]) groupIdStr = g.tags[0];
            });
            
            // Fallback for AIGC which rely heavily on base 'avatar_name'
            if (!groupIdStr) groupIdStr = a.avatar_name || a.avatar_id;
            
            // Safe fallback bounds
            const finalGroupId = groupIdStr || 'unknown';
            
            if (!groups.has(finalGroupId)) {
                groups.set(finalGroupId, {
                    groupId: finalGroupId,
                    name: a.avatar_name || finalGroupId,
                    identity: activeIdentityTab,
                    representativeAvatar: a,
                    looks: []
                });
            }
            groups.get(finalGroupId)!.looks.push(a);
        });
        
        return Array.from(groups.values());
    })().filter(group => {
        const a = group.representativeAvatar;
        
        if (searchQuery && !a.avatar_name?.toLowerCase().includes(searchQuery.toLowerCase()) && !a.avatar_id?.includes(searchQuery) && !group.groupId.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        if (filterIndustry !== "All" && !a.tag_groups?.some((g: any) => g.tag_type?.toLowerCase() === 'industry' && g.tags?.some((t: string) => t.toLowerCase() === filterIndustry.toLowerCase()))) return false;
        if (filterGender !== "All" && !a.tag_groups?.some((g: any) => g.tag_type?.toLowerCase() === 'gender' && g.tags?.some((t: string) => t.toLowerCase() === filterGender.toLowerCase()))) return false;
        if (filterScene !== "All" && !a.tag_groups?.some((g: any) => g.tag_type?.toLowerCase() === 'scene' && g.tags?.some((t: string) => t.toLowerCase() === filterScene.toLowerCase()))) return false;
        if (filterRegion !== "All" && !a.tag_groups?.some((g: any) => g.tag_type?.toLowerCase() === 'region' && g.tags?.some((t: string) => t.toLowerCase() === filterRegion.toLowerCase()))) return false;
        
        return true;
    });

    return (
        <div className="h-screen bg-[#0a0a0a] text-gray-300 flex flex-col font-sans overflow-hidden">
            <div className="flex justify-between items-center bg-[#111] border-b border-gray-800 px-6 py-3 shrink-0">
                <div className="flex items-center gap-6">
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

                </div>
                <div className="flex gap-2">
                    <Link href="/" className="text-gray-400 hover:text-gray-300 text-sm border border-gray-800 bg-gray-900/50 px-3 py-1.5 rounded-md transition-colors font-mono">
                        [ BACK_TO_ADS ]
                    </Link>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
                {/* Permanent Tool Switcher Rail */}
                <div className="w-16 bg-[#111] border-r border-gray-800 flex flex-col items-center py-4 gap-4 z-20 shrink-0">
                    <Link href="/symphony" className="p-3 rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/30 shadow-[0_0_15px_rgba(20,184,166,0.1)] group relative transition-all">
                        <User size={20} />
                        <span className="absolute left-14 top-1/2 -translate-y-1/2 bg-black border border-gray-800 text-gray-300 text-[10px] font-mono px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 shadow-xl">
                            Avatars
                        </span>
                    </Link>
                    <Link href="/symphony/remixer" className="p-3 rounded-xl hover:bg-gray-800 text-gray-400 hover:text-white border border-transparent group relative transition-all">
                        <RefreshCw size={20} />
                        <span className="absolute left-14 top-1/2 -translate-y-1/2 bg-black border border-gray-800 text-gray-300 text-[10px] font-mono px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 shadow-xl">
                            Remixer
                        </span>
                    </Link>
                    <Link href="/symphony/image-animation" className="p-3 rounded-xl hover:bg-gray-800 text-gray-400 hover:text-white border border-transparent group relative transition-all">
                        <ImageIcon size={20} />
                        <span className="absolute left-14 top-1/2 -translate-y-1/2 bg-black border border-gray-800 text-gray-300 text-[10px] font-mono px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 shadow-xl">
                            Image to Video
                        </span>
                    </Link>
                    <Link href="/symphony/text-to-video" className="p-3 rounded-xl hover:bg-gray-800 text-gray-400 hover:text-white border border-transparent group relative transition-all">
                        <FileVideo size={20} />
                        <span className="absolute left-14 top-1/2 -translate-y-1/2 bg-black border border-gray-800 text-gray-300 text-[10px] font-mono px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 shadow-xl">
                            Text to Video
                        </span>
                    </Link>
                    <Link href="/symphony/product-avatar" className="p-3 rounded-xl hover:bg-gray-800 text-gray-400 hover:text-white border border-transparent group relative transition-all">
                        <Presentation size={20} />
                        <span className="absolute left-14 top-1/2 -translate-y-1/2 bg-black border border-gray-800 text-gray-300 text-[10px] font-mono px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 shadow-xl">
                            Product Avatar
                        </span>
                    </Link>
                </div>

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
                                
                                {/* Native Subtitle Settings Toggle */}
                                <div 
                                    className="py-1 flex items-center justify-between cursor-pointer group" 
                                    onClick={() => setSubtitlesEnabled(!subtitlesEnabled)}
                                >
                                    <div className="flex flex-col">
                                        <Label className="font-bold text-gray-200 font-mono text-sm cursor-pointer group-hover:text-teal-400 transition-colors">Show captions</Label>
                                        <p className="text-gray-500 font-mono text-[10px] mt-0.5">Display the script&apos;s text on the screen.</p>
                                    </div>
                                    <div className={`w-10 h-6 shrink-0 flex items-center rounded-full p-1 transition-colors duration-200 ${subtitlesEnabled ? 'bg-[#3CD4B5]' : 'bg-gray-800 border border-gray-700'}`}>
                                        <div className={`w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${subtitlesEnabled ? 'translate-x-4 bg-[#111]' : 'translate-x-0 bg-gray-500'}`} />
                                    </div>
                                </div>
                                
                                {/* Dynamic Granular Digital Team Voice Selectors mapped securely per Avatar */}
                                {selectedAvatarIds.length > 0 && (
                                    <div className="space-y-3 pt-4 border-t border-teal-900/10">
                                        <Label className="font-bold text-gray-400 font-mono text-xs uppercase flex items-center justify-between">
                                            Digital Team Audio Routing
                                        </Label>
                                        
                                        {selectedAvatarIds.map(aId => {
                                            const aTag = avatars.find(a => a.avatar_id === aId);
                                            const boundVoiceId = avatarVoiceMap[aId] || voices[0]?.voice_id;
                                            const boundVoice = voices.find(v => v.voice_id === boundVoiceId);
                                            
                                            return (
                                                <div key={aId} className="flex items-center gap-3 bg-[#0a0a0a]/50 border border-gray-800/80 rounded-xl p-2 hover:border-teal-700/50 transition-colors">
                                                    {/* Strict Avatar Thumbnail Context */}
                                                    <div className="w-12 h-16 rounded-md overflow-hidden relative border border-gray-800 shrink-0">
                                                        <img src={aTag?.avatar_thumbnail || ''} className="w-full h-full object-cover" />
                                                    </div>
                                                    
                                                    {/* Voice Trigger Bind */}
                                                    <div 
                                                        className="flex-1 flex flex-col justify-center cursor-pointer group"
                                                        onClick={() => {
                                                            setActiveAvatarPickerId(aId);
                                                            setIsVoicePickerOpen(true);
                                                        }}
                                                    >
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-6 h-6 rounded-full bg-teal-500/10 flex items-center justify-center shrink-0 border border-teal-500/20 group-hover:bg-teal-500/20 transition-colors">
                                                                    <Play size={10} className="text-teal-400 group-hover:scale-110 transition-transform" />
                                                                </div>
                                                                <span className="font-bold text-gray-200 text-sm">{boundVoice?.voice_name || 'Select Audio'}</span>
                                                            </div>
                                                            <span className="text-[10px] text-gray-500 bg-gray-900 px-1.5 py-0.5 rounded border border-gray-800">
                                                                {boundVoice?.voice_tags?.find((t: any) => t.tag_type === 'Nation')?.tag_name || 'Global'}
                                                            </span>
                                                        </div>
                                                        <div className="text-[10px] text-gray-500 mt-1.5 uppercase font-mono tracking-wider flex items-center gap-2 pl-8">
                                                            <span>{boundVoice?.voice_tags?.find((t: any) => t.tag_type === 'Age')?.tag_name}</span>
                                                            <span className="w-1 h-1 rounded-full bg-gray-700" />
                                                            <span>{boundVoice?.voice_tags?.find((t: any) => t.tag_type === 'Gender')?.tag_name}</span>
                                                        </div>
                                                    </div>
                                                    
                                                    <ChevronRight size={16} className="text-gray-600 shrink-0 mr-1" />
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                                
                                {selectedAvatarIds.length === 0 && (
                                    <div className="text-xs text-gray-600 font-mono text-center py-4 italic border-t border-teal-900/10 mt-4">
                                        Select at least one Digital Actor to configure voices.
                                    </div>
                                )}
                                
                                {/* Master Granular Voice Picker Overlay */}
                                {isVoicePickerOpen && (
                                    <div className="absolute inset-x-2 bottom-2 top-2 z-50 bg-[#050505] flex flex-col rounded-xl overflow-hidden ring-1 ring-teal-500/50 shadow-2xl">
                                        <div className="bg-[#111] p-3 border-b border-gray-800 flex flex-col gap-3">
                                            <div className="flex justify-between items-center">
                                                <span className="font-mono text-[10px] text-teal-400 font-bold uppercase tracking-widest bg-teal-500/10 px-2 py-1 rounded">Assign Audio Target</span>
                                                <button onClick={() => { setIsVoicePickerOpen(false); setActiveAvatarPickerId(null); }} className="text-gray-500 hover:text-white p-1 rounded hover:bg-gray-800 transition-colors bg-[#0a0a0a] border border-gray-800"><X size={14}/></button>
                                            </div>
                                            <div className="flex gap-2">
                                                <select value={voiceFilterLanguage} onChange={e => setVoiceFilterLanguage(e.target.value)} className="h-8 flex-1 rounded-md bg-[#0a0a0a] border border-gray-800 text-gray-400 px-2 font-mono text-[10px] focus:ring-1 focus:ring-teal-500 outline-none uppercase tracking-wider">
                                                    {filterableLanguages.map(opt => <option key={opt as string} value={opt as string}>{opt === 'All' ? 'World' : (opt as string).replace(/_/g, ' ')}</option>)}
                                                </select>
                                                <select value={voiceFilterAge} onChange={e => setVoiceFilterAge(e.target.value)} className="h-8 w-24 rounded-md bg-[#0a0a0a] border border-gray-800 text-gray-400 px-2 font-mono text-[10px] focus:ring-1 focus:ring-teal-500 outline-none uppercase tracking-wider">
                                                    {filterableAges.map(opt => <option key={opt as string} value={opt as string}>{opt === 'All' ? 'Age' : (opt as string).replace(/_/g, ' ')}</option>)}
                                                </select>
                                                <select value={voiceFilterGender} onChange={e => setVoiceFilterGender(e.target.value)} className="h-8 w-24 rounded-md bg-[#0a0a0a] border border-gray-800 text-gray-400 px-2 font-mono text-[10px] focus:ring-1 focus:ring-teal-500 outline-none uppercase tracking-wider">
                                                    <option value="All">Gender</option>
                                                    <option value="Male">Male</option>
                                                    <option value="Female">Female</option>
                                                </select>
                                            </div>
                                        </div>
                                        <div className="overflow-y-auto flex-1 p-2 space-y-2 scrollbar-thin scrollbar-thumb-teal-900 border-t border-teal-500/10">
                                            {voices.filter((v: any) => {
                                                if (voiceFilterGender !== "All" && !v.voice_tags?.some((t: any) => t.tag_type === 'Gender' && t.tag_name === voiceFilterGender)) return false;
                                                if (voiceFilterLanguage !== "All" && !v.voice_tags?.some((t: any) => t.tag_type === 'Nation' && t.tag_name === voiceFilterLanguage)) return false;
                                                if (voiceFilterAge !== "All" && !v.voice_tags?.some((t: any) => t.tag_type === 'Age' && t.tag_name === voiceFilterAge)) return false;
                                                return true;
                                            }).map((v: any) => 
                                                renderVoiceCard(v, avatarVoiceMap[activeAvatarPickerId || ''] === v.voice_id || (Object.keys(avatarVoiceMap).length === 0 && voices[0]?.voice_id === v.voice_id), () => {
                                                    if (activeAvatarPickerId) {
                                                        setAvatarVoiceMap(prev => ({...prev, [activeAvatarPickerId]: v.voice_id}));
                                                    }
                                                    setIsVoicePickerOpen(false);
                                                })
                                            )}
                                            {voices.length === 0 && (
                                                <div className="text-center py-10 font-mono text-xs text-gray-600">No voices match these complex filters.</div>
                                            )}
                                        </div>
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
                                                        <video 
                                                            src={job.videoUrl} 
                                                            controls 
                                                            muted 
                                                            loop 
                                                            crossOrigin="anonymous"
                                                            className="w-full h-full object-cover rounded-xl shadow-[0_0_20px_rgba(20,184,166,0.15)] ring-1 ring-teal-500/30"
                                                        >
                                                            <source src={job.videoUrl} type="video/mp4" />
                                                            {job.subtitleUrl && (
                                                                <track 
                                                                    kind="captions" 
                                                                    src={`/api/captions?url=${encodeURIComponent(job.subtitleUrl)}`} 
                                                                    srcLang="en" 
                                                                    label="English" 
                                                                    default 
                                                                />
                                                            )}
                                                        </video>
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
                                <div className="flex flex-col gap-4 mb-4">
                                    <div className="flex justify-between items-center">
                                        <h2 className="text-gray-200 font-mono uppercase tracking-widest text-sm">Voiceover avatar</h2>
                                        <div className="flex items-center gap-4">
                                            <span className={`text-xs font-mono font-bold ${selectedAvatarIds.length >= 5 ? 'text-orange-500' : 'text-teal-500'}`}>{selectedAvatarIds.length}/5 Selected</span>
                                            <span className="text-xs text-gray-500 font-mono px-2 border-l border-gray-800">{filteredAvatarGroups.length} Structural Groups</span>
                                        </div>
                                    </div>
                                    
                                    <div className="flex gap-4 border-b border-gray-800 pb-2">
                                        <button 
                                            onClick={() => setActiveIdentityTab('real')}
                                            className={`font-sans font-semibold text-sm transition-colors relative pb-2 ${activeIdentityTab === 'real' ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
                                        >
                                            Real-human
                                            {activeIdentityTab === 'real' && <div className="absolute bottom-[-2px] inset-x-0 h-[2px] bg-teal-500" />}
                                        </button>
                                        <button 
                                            onClick={() => setActiveIdentityTab('aigc')}
                                            className={`font-sans font-semibold text-sm transition-colors relative pb-2 flex items-center gap-2 ${activeIdentityTab === 'aigc' ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
                                        >
                                            AI-generated
                                            {activeIdentityTab === 'aigc' && <div className="absolute bottom-[-2px] inset-x-0 h-[2px] bg-teal-500" />}
                                        </button>
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
                                ) : filteredAvatarGroups.length === 0 ? (
                                    <div className="text-center py-20 text-gray-600 font-mono text-sm">
                                        &gt; No avatars match the selected structural filters.
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                                        {filteredAvatarGroups.map(group => {
                                            const isSelected = group.looks.some(l => selectedAvatarIds.includes(l.avatar_id));
                                            
                                            return (
                                              <div 
                                                  key={group.groupId}
                                                  onClick={() => {
                                                      if (group.looks.length === 1) {
                                                          const lookId = group.looks[0].avatar_id;
                                                          if (isSelected) {
                                                              setSelectedAvatarIds(prev => prev.filter(id => id !== lookId));
                                                          } else {
                                                              if (selectedAvatarIds.length >= 5) alert("Max 5 avatars safely supported simultaneously.");
                                                              else setSelectedAvatarIds(prev => [...prev, lookId]);
                                                          }
                                                      } else {
                                                          setActiveAvatarGroup(group);
                                                      }
                                                  }}
                                                  className={`group relative rounded-xl overflow-hidden cursor-pointer transition-all border-2 ${isSelected ? 'border-teal-500 shadow-[0_0_15px_rgba(20,184,166,0.3)]' : 'border-transparent hover:border-gray-600'}`}
                                              >
                                                  <img 
                                                      src={group.representativeAvatar.avatar_thumbnail} 
                                                      alt={group.name}
                                                      className="w-full h-auto object-cover aspect-[9/16]"
                                                  />
                                                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent"></div>
                                                  
                                                  <div className="absolute bottom-0 left-0 right-0 p-3">
                                                      <p className="text-white font-mono text-xs font-bold truncate">{group.name}</p>
                                                      
                                                      <div className="flex gap-1 mt-1 overflow-x-hidden">
                                                        {group.representativeAvatar.tag_groups?.filter((g: any) => g.tag_type !== 'identity').map((g: any, idx: number) => (
                                                            <span key={idx} className="bg-black/80 text-gray-400 text-[9px] px-1.5 py-0.5 rounded font-mono uppercase whitespace-nowrap border border-gray-800">
                                                                {g.tags?.[0]}
                                                            </span>
                                                        ))}
                                                      </div>
                                                  </div>
                                                  
                                                  <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur text-white text-[10px] font-mono px-2 py-0.5 rounded-md border border-white/20">
                                                      {group.looks.length} looks
                                                  </div>
                                                  
                                                  {/* Select overlay */}
                                                  {isSelected && (
                                                      <div className="absolute inset-0 bg-teal-500/10 flex items-center justify-center pointer-events-none">
                                                          <div className="bg-teal-500 text-black font-mono font-bold text-[10px] uppercase px-2 py-1 rounded-full shadow-lg">✓ Group Selected</div>
                                                      </div>
                                                  )}
                                              </div>
                                            );
                                        })}
                                    </div>
                                )}
                                
                                {/* Avatar Details Sidepanel Variant Chooser */}
                                {activeAvatarGroup && (
                                    <div className="fixed top-0 right-0 bottom-0 w-[400px] bg-[#111] border-l border-gray-800 shadow-[0_0_50px_rgba(0,0,0,0.8)] z-[60] flex flex-col transform transition-transform animate-in slide-in-from-right duration-300">
                                       <div className="flex justify-between items-center p-5 border-b border-gray-800 shrink-0">
                                            <div>
                                                <h3 className="text-gray-100 text-lg font-sans font-semibold tracking-tight">Avatar details</h3>
                                                <p className="text-gray-500 text-xs font-mono mt-1 flex items-center gap-2">Avatar ID <span className="text-gray-400">{activeAvatarGroup.groupId}</span></p>
                                            </div>
                                            <button onClick={() => setActiveAvatarGroup(null)} className="text-gray-500 hover:text-white p-2 rounded hover:bg-gray-800 transition-colors bg-[#0a0a0a] border border-gray-800 cursor-pointer"><X size={16}/></button>
                                        </div>
                                        
                                        <div className="p-5 flex flex-col gap-4 overflow-y-auto flex-1 scrollbar-thin scrollbar-thumb-gray-800">
                                            <h4 className="text-gray-300 font-sans text-sm font-semibold">{activeAvatarGroup.looks.length} looks</h4>
                                            
                                            <div className="grid grid-cols-2 gap-3">
                                                {activeAvatarGroup.looks.map(look => {
                                                    const isSelected = selectedAvatarIds.includes(look.avatar_id);
                                                    return (
                                                        <div key={look.avatar_id} 
                                                             onClick={() => {
                                                                if (isSelected) {
                                                                    setSelectedAvatarIds(prev => prev.filter(id => id !== look.avatar_id));
                                                                } else {
                                                                    if (selectedAvatarIds.length >= 5) alert("Max 5 avatars safely supported simultaneously for API limits.");
                                                                    else setSelectedAvatarIds(prev => [...prev, look.avatar_id]);
                                                                }
                                                             }}
                                                             className={`relative aspect-[9/16] rounded-xl overflow-hidden cursor-pointer border-2 transition-all group ${isSelected ? 'border-teal-500' : 'border-transparent hover:border-gray-600'}`}>
                                                            <img src={look.avatar_thumbnail} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                                                            
                                                            <div className="absolute top-2 right-2 w-5 h-5 rounded-full shadow-lg z-10 flex items-center justify-center transition-all bg-black/40 border border-gray-400 backdrop-blur-sm">
                                                                {isSelected && <div className="w-3 h-3 rounded-full bg-teal-400 shadow-[0_0_10px_rgba(45,212,191,0.8)]"></div>}
                                                            </div>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                        
                                        <div className="p-5 border-t border-gray-800 bg-[#0a0a0a] shrink-0">
                                            <Button onClick={() => setActiveAvatarGroup(null)} className="w-full bg-[#20B2AA] hover:bg-[#1E9F98] text-white font-sans text-base shadow-lg h-12 rounded-lg font-medium">Continue</Button>
                                        </div>
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
