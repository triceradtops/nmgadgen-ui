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
import { Play, Square, ChevronLeft, Menu, Video, ChevronRight, UploadCloud, X, Terminal, Loader2, ImageIcon, Plus, User, FileVideo, RefreshCw, Presentation, Search, ShieldCheck } from "lucide-react";
import Link from 'next/link';

interface BatchJob {
    taskId: string;
    status: 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'FAILED';
    videoUrl: string | null;
    subtitleUrl?: string | null;
    errorDetails: string | null;
    startedAt: number;
}

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

export default function ProductAvatarStudio() {
    const [loading, setLoading] = useState(false);
    const [terminalLogs, setTerminalLogs] = useState<string[]>(["[TIKTOK_SYMPHONY] Neural Engine Initialized..."]);
    const [isConfigOpen, setIsConfigOpen] = useState(true);
    
    // Form States
    const [productName, setProductName] = useState("Ecotarnin");
    const [description, setDescription] = useState("High concentration vitamin C serum that brightens and evens skin tone while providing intense hydration and anti-aging benefits.");
    const [sellingPoints, setSellingPoints] = useState(["Dermatologist tested", "Vegan & Cruelty-free", "Visible results in 7 days"]);
    const [duration, setDuration] = useState("RECOMMENDED");
    const [targetLanguage, setTargetLanguage] = useState("en");
    
    // Media Upload Arrays
    const [localImages, setLocalImages] = useState<{url: string, file: File | null}[]>([]);
    const [localVideos, setLocalVideos] = useState<{id: string, file: File | null, url: string}[]>([]);
    
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Avatar state
    const [avatars, setAvatars] = useState<any[]>([]);
    const [voices, setVoices] = useState<any[]>([]);
    const [selectedAvatarId, setSelectedAvatarId] = useState<string | null>(null);
    const [selectedVoiceId, setSelectedVoiceId] = useState<string | null>(null);

    const [batchJobs, setBatchJobs] = useState<BatchJob[]>([]);

    // Avatar filters
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [activeIdentityTab, setActiveIdentityTab] = useState<'real' | 'aigc'>('real');
    
    const appendLog = (msg: string) => {
        setTerminalLogs(prev => [...prev.slice(-49), `[${new Date().toLocaleTimeString()}] ${msg}`]);
    };

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
                    setSelectedVoiceId(data.data[0].voice_id);
                    appendLog(`Successfully loaded ${data.data.length} synthesis voices.`);
                }
            } catch (err) {}
        };
        fetchAvatars();
        fetchVoices();
    }, []);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.length) return;
        const newFiles = Array.from(e.target.files);
        
        newFiles.forEach(file => {
            const url = URL.createObjectURL(file);
            if (file.type.startsWith('image/')) {
                setLocalImages(prev => [...prev, { url, file }]);
                appendLog(`[MEDIA] Ingested image asset: ${file.name}`);
            } else if (file.type.startsWith('video/')) {
                const mockVideoId = `v_local_${Math.random().toString(36).substring(7)}`;
                setLocalVideos(prev => [...prev, { id: mockVideoId, file, url }]);
                appendLog(`[MEDIA] Cached local video asset: ${file.name} -> ${mockVideoId}`);
            }
        });
    };

    const removeImage = (idx: number) => setLocalImages(prev => prev.filter((_, i) => i !== idx));
    const removeVideo = (idx: number) => setLocalVideos(prev => prev.filter((_, i) => i !== idx));
    const removePoint = (idx: number) => setSellingPoints(prev => prev.filter((_, i) => i !== idx));
    const addPoint = (val: string) => {
        if (sellingPoints.length < 5 && val.trim()) {
            setSellingPoints(prev => [...prev, val.trim()]);
        }
    };

    const pollResults = async (taskId: string) => {
        const interval = setInterval(async () => {
            try {
                const res = await fetch(`https://web-production-1f2e2.up.railway.app/api/tiktok/status/video/${taskId}?aigc_video_type=AVATAR_PRODUCT`);
                if (res.status === 200) {
                    const data = await res.json();
                    const tasks = data.list || [];
                    
                    if (tasks.length > 0) {
                        const t = tasks[0];
                        
                        if (t.status === "SUCCESS") {
                            appendLog(`[Task ${taskId.slice(-4)}] Render Complete. Product Avatar Video Online.`);
                            setBatchJobs(prev => prev.map(job => job.taskId === taskId ? { 
                                ...job, 
                                status: 'SUCCESS',
                                videoUrl: t.preview_url || t.video_url || t.avatar_video_id,
                                subtitleUrl: t.srt_file_url || t.subtitle_url
                            } : job));
                            setLoading(false);
                            clearInterval(interval);
                        } else if (t.status === "FAILED") {
                            const errorObj = t.fail_reason || t.error_msg || JSON.stringify(t);
                            appendLog(`[Task ${taskId.slice(-4)}] CRITICAL ERROR: ${errorObj}`);
                            setBatchJobs(prev => prev.map(job => job.taskId === taskId ? { 
                                ...job, 
                                status: 'FAILED',
                                errorDetails: String(errorObj)
                            } : job));
                            setLoading(false);
                            clearInterval(interval);
                        }
                    }
                }
            } catch (e) {}
        }, 5000);
    };

    const handleGenerate = async () => {
        if (!selectedAvatarId) {
            alert("Please select a Digital Avatar from the grid.");
            return;
        }

        setLoading(true);
        appendLog(`Initiating Product Avatar task compilation...`);
        
        try {
            const payload = {
                aigc_video_type: "AVATAR_PRODUCT",
                avatar_info: {
                    avatar_id: selectedAvatarId
                },
                product_video_info: {
                    video_generation_count: 1,
                    target_language: targetLanguage,
                    voice_id: selectedVoiceId || undefined,
                    video_duration: duration,
                    subtitle_enabled: true,
                    product_info_list: [{
                        product_name: productName,
                        description: description,
                        selling_points: sellingPoints
                    }],
                    input_image_list: {
                        image_url_list: localImages.map(img => img.url.startsWith('blob:') ? "https://storage.googleapis.com/nmg-mocks/demo.jpg" : img.url)
                    },
                    input_video_list: {
                        video_id_list: localVideos.map(v => v.id.startsWith('v_local') ? "v12345demo" : v.id)
                    }
                }
            };

            appendLog(`Dispatching payload to backend: ${JSON.stringify(payload)}`);
            
            const res = await fetch("https://web-production-1f2e2.up.railway.app/api/tiktok/remix/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            
            if (res.ok) {
                const data = await res.json();
                if (data.status === "accepted" && data.task_data?.task_ids) {
                    const taskIds = data.task_data.task_ids;
                    if (taskIds.length === 0) {
                        appendLog(`Payload accepted but no task_ids returned. (Missing or invalid product media?).`);
                        setLoading(false);
                    } else {
                        taskIds.forEach((tId: string) => {
                            setBatchJobs(prev => [...prev, {
                                taskId: tId,
                                status: 'PROCESSING',
                                videoUrl: null,
                                errorDetails: null,
                                startedAt: Date.now()
                            }]);
                            pollResults(tId);
                        });
                        appendLog(`Dispatched ${taskIds.length} AVATAR_PRODUCT generation tasks to cluster.`);
                    }
                } else {
                    appendLog(`API Error Structure: ${JSON.stringify(data)}`);
                    setLoading(false);
                }
            } else {
                appendLog(`Submission failed: HTTP ${res.status}`);
                setLoading(false);
            }
        } catch (error) {
            appendLog(`CRITICAL EXCEPTION: ${error}`);
            setLoading(false);
        }
    };

    // Calculate dynamic tags from avatars
    const allUniqueTags = new Set<string>();
    avatars.forEach(a => {
        a.tag_groups?.forEach((g: any) => {
            if (g.tag_type !== 'identity') {
                g.tags?.forEach((t: string) => allUniqueTags.add(`${g.tag_type}:${t}`));
            }
        });
    });
    const dynamicTagsArray = Array.from(allUniqueTags).sort();

    const handleTagToggle = (tag: string) => {
        setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
    };

    const isMatch = (a: any) => {
        let match = true;
        
        // Identity Tab matching
        const aIden = a.tag_groups?.find((g: any) => g.tag_type === 'identity')?.tags?.[0] || 'unknown';
        if (aIden !== activeIdentityTab) match = false;
        
        // Search
        if (searchQuery && !a.avatar_name?.toLowerCase().includes(searchQuery.toLowerCase()) && !a.avatar_id?.toLowerCase().includes(searchQuery.toLowerCase())) {
            match = false;
        }

        // Tag matching (ALL selected tags must be present in avatar tags)
        if (selectedTags.length > 0) {
            const avatarTagSet = new Set<string>();
            a.tag_groups?.forEach((g: any) => g.tags?.forEach((t: string) => avatarTagSet.add(`${g.tag_type}:${t}`)));
            for (const reqTag of selectedTags) {
                if (!avatarTagSet.has(reqTag)) match = false;
            }
        }
        
        return match;
    };

    const filteredAvatars = avatars.filter(isMatch);
    
    // Group them for display like in original avatars page
    const groupedMap = new Map<string, any[]>();
    filteredAvatars.forEach(a => {
        // use base name without trailing _1 or _2 to group
        const baseName = a.avatar_name?.replace(/_\d+$/, '') || a.avatar_id;
        if (!groupedMap.has(baseName)) groupedMap.set(baseName, []);
        groupedMap.get(baseName)!.push(a);
    });
    
    const filteredAvatarGroups = Array.from(groupedMap.entries()).map(([baseName, looks]) => {
        return {
            groupId: looks[0]?.avatar_id || baseName,
            name: baseName,
            looks: looks,
            representativeAvatar: looks[0]
        };
    });

    return (
        <div className="flex h-screen bg-[#050505] text-gray-200 overflow-hidden font-sans">
            <div className="flex w-full h-full relative">
                
                {/* Left Mini-Rail Navigation */}
                <div className="w-16 bg-[#030303] border-r border-[#1a1a1a] flex flex-col items-center py-6 gap-6 shrink-0 z-50">
                    <div className="w-10 h-10 rounded-xl bg-teal-500/10 flex items-center justify-center border border-teal-500/20 shadow-[0_0_15px_rgba(20,184,166,0.15)] mb-4 cursor-pointer" onClick={() => setIsConfigOpen(!isConfigOpen)}>
                        <Menu className="text-teal-400" size={20} />
                    </div>
                    
                    <Link href="/symphony" className="p-3 rounded-xl hover:bg-gray-800 text-gray-400 hover:text-white border border-transparent group relative transition-all">
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
                    <Link href="/symphony/product-avatar" className="p-3 rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/30 shadow-[0_0_15px_rgba(20,184,166,0.1)] group relative transition-all">
                        <Presentation size={20} />
                        <span className="absolute left-14 top-1/2 -translate-y-1/2 bg-black border border-gray-800 text-gray-300 text-[10px] font-mono px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 shadow-xl">
                            Product Avatar
                        </span>
                    </Link>
                </div>

                {/* Configuration Sidebar */}
                <div className={`bg-[#0a0a0a] border-r border-gray-800 overflow-y-auto scrollbar-thin transition-all duration-300 ease-in-out shrink-0 ${isConfigOpen ? 'w-full md:w-[400px] xl:w-[450px] p-6' : 'w-0 p-0 overflow-hidden border-r-0'}`}>
                    <div className="space-y-6 w-full min-w-[350px]">
                        <Card className="bg-black border-teal-900/30 shadow-sm relative overflow-hidden">
                            <CardHeader className="bg-teal-950/20 text-teal-500 rounded-t-lg pb-4 border-b border-teal-900/30 py-4 flex justify-between flex-row items-center border-l-4 border-l-teal-500 relative">
                                <CardTitle className="text-lg font-mono uppercase tracking-wider pl-4">Product Avatar Setting</CardTitle>
                                {selectedAvatarId && <span className="text-[10px] bg-teal-500/20 text-teal-400 px-2 py-1 rounded font-mono mr-4">AVATAR LATCHED</span>}
                            </CardHeader>
                            <CardContent className="pt-6 space-y-6 relative z-10">
                                
                                <div className="space-y-4">
                                    <Label className="font-bold text-gray-400 font-mono text-xs uppercase">1. Product Details</Label>
                                    <Input 
                                        value={productName} 
                                        onChange={e => setProductName(e.target.value)} 
                                        className="bg-[#0a0a0a] border-gray-800 font-mono text-xs focus:ring-teal-500 placeholder-gray-600 outline-none"
                                        placeholder="Product Name"
                                    />
                                    <Textarea 
                                        value={description} 
                                        onChange={e => setDescription(e.target.value)} 
                                        className="bg-[#0a0a0a] border-gray-800 font-mono text-xs focus:ring-teal-500 outline-none resize-none h-24 placeholder-gray-600"
                                        placeholder="Detailed description..."
                                    />
                                </div>
                                
                                <div className="space-y-4">
                                    <Label className="font-bold text-gray-400 font-mono text-xs uppercase flex justify-between">
                                        <span>2. Value Propositions (Max 5)</span>
                                        <span className="text-teal-500">{sellingPoints.length}/5</span>
                                    </Label>
                                    <div className="space-y-2">
                                        {sellingPoints.map((pt, idx) => (
                                            <div key={idx} className="flex gap-2">
                                                <div className="bg-[#0a0a0a] border border-gray-800 text-xs font-mono p-2.5 rounded-lg flex-1 flex justify-between items-center group">
                                                    <span className="text-gray-300">{pt}</span>
                                                    <X size={14} className="text-gray-600 hover:text-red-400 cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => removePoint(idx)} />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    {sellingPoints.length < 5 && (
                                        <div className="flex gap-2 relative">
                                            <Input 
                                                placeholder="Add selling point and press Enter..." 
                                                className="bg-[#111] border-dashed border-gray-700 font-mono text-xs pr-8 focus:ring-teal-500 placeholder-gray-600 outline-none h-10"
                                                onKeyDown={e => {
                                                    if (e.key === 'Enter') {
                                                        addPoint(e.currentTarget.value);
                                                        e.currentTarget.value = '';
                                                    }
                                                }}
                                            />
                                            <Plus size={16} className="text-gray-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-4 pt-6 border-t border-teal-900/10">
                                    <Label className="font-bold text-gray-400 font-mono text-xs uppercase">3. Audio Settings</Label>
                                    <div className="flex gap-3">
                                        <select 
                                            value={selectedVoiceId || ''} 
                                            onChange={e => setSelectedVoiceId(e.target.value)}
                                            className="w-full h-10 px-3 rounded-lg bg-[#0a0a0a] border border-gray-800 text-gray-300 text-xs font-mono outline-none focus:ring-1 focus:ring-teal-500"
                                        >
                                            {voices.map(v => <option key={v.voice_id} value={v.voice_id}>{v.voice_name || v.voice_id}</option>)}
                                        </select>
                                        <select 
                                            value={targetLanguage} 
                                            onChange={e => setTargetLanguage(e.target.value)}
                                            className="w-24 shrink-0 h-10 px-2 rounded-lg bg-[#0a0a0a] border border-gray-800 text-gray-300 text-xs font-mono outline-none focus:ring-1 focus:ring-teal-500 uppercase"
                                        >
                                            <option value="en">EN</option>
                                            <option value="es">ES</option>
                                            <option value="fr">FR</option>
                                            <option value="de">DE</option>
                                        </select>
                                    </div>
                                </div>
                                
                                <div className="space-y-4 pt-6 border-t border-teal-900/10">
                                    <div className="flex justify-between items-center">
                                        <Label className="font-bold text-gray-400 font-mono text-xs uppercase">4. Visual Assets</Label>
                                        <span className="text-[10px] text-gray-500 font-mono bg-[#111] px-2 py-1 rounded-md border border-gray-800">{localImages.length} Img / {localVideos.length} Vid</span>
                                    </div>
                                    
                                    <div className="grid grid-cols-4 gap-3">
                                        {localImages.map((img, idx) => (
                                            <div key={idx} className="aspect-square bg-[#0a0a0a] rounded-lg border border-gray-800 relative group overflow-hidden shadow-inner">
                                                <img src={img.url} className="w-full h-full object-cover" />
                                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex justify-center items-center transition-opacity backdrop-blur-[2px]">
                                                    <X size={16} className="text-red-400 cursor-pointer hover:scale-125 transition-transform" onClick={() => removeImage(idx)} />
                                                </div>
                                            </div>
                                        ))}
                                        {localVideos.map((vid, idx) => (
                                            <div key={idx} className="aspect-square bg-[#0a0a0a] rounded-lg border border-gray-800 relative group overflow-hidden shadow-inner">
                                                <video src={vid.url} className="w-full h-full object-cover" />
                                                <div className="absolute inset-0 flex items-center justify-center text-teal-500 font-bold bg-black/30 pointer-events-none drop-shadow-md"><Video size={16}/></div>
                                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex justify-center items-center transition-opacity backdrop-blur-[2px]">
                                                    <X size={16} className="text-red-400 cursor-pointer hover:scale-125 transition-transform pointer-events-auto" onClick={() => removeVideo(idx)} />
                                                </div>
                                            </div>
                                        ))}
                                        {localImages.length + localVideos.length < 30 && (
                                            <div className="aspect-square bg-[#0a0a0a] border border-dashed border-gray-700/60 rounded-lg hover:bg-[#111] hover:border-teal-500/50 transition-colors flex items-center justify-center cursor-pointer disabled:opacity-50" onClick={() => fileInputRef.current?.click()}>
                                                <UploadCloud size={20} className="text-gray-500" />
                                            </div>
                                        )}
                                        <input type="file" ref={fileInputRef} className="hidden" multiple accept="image/*,video/*" onChange={handleFileUpload} />
                                    </div>
                                    <p className="text-[10px] text-gray-500 font-mono mt-2 leading-relaxed bg-[#111] p-3 rounded-lg border border-gray-800">Must provide images or short videos of the physical product so that the Avatar can refer to them during generation.</p>
                                </div>

                                <Button 
                                    onClick={handleGenerate} 
                                    disabled={loading || selectedAvatarId === null || (localImages.length === 0 && localVideos.length === 0)} 
                                    className="w-full mt-6 h-14 text-lg font-bold bg-teal-600 hover:bg-teal-500 text-white font-mono uppercase tracking-widest border border-teal-400 shadow-[0_0_20px_rgba(20,184,166,0.2)] disabled:opacity-50 disabled:border-transparent transition-all rounded-xl"
                                >
                                    {loading ? "[ COMPILING PRODUCT... ]" : `[ GENERATE AVATAR PRODUCT ]`}
                                </Button>
                                {(localImages.length === 0 && localVideos.length === 0) && <p className="text-[10px] font-mono text-center text-red-500 animate-pulse pt-2">Missing visual assets!</p>}
                            </CardContent>
                        </Card>
                    </div>
                </div>

                {/* Main Dynamic Viewport */}
                <div className="flex-1 overflow-x-hidden overflow-y-auto bg-black p-6 scrollbar-thin scrollbar-thumb-gray-800 flex flex-col min-h-0 relative">
                    
                    {/* Active Jobs Rendering Box */}
                    {batchJobs.length > 0 && (
                        <div className="mb-6 space-y-4 shrink-0 border border-gray-800 bg-[#0a0a0a] p-4 rounded-xl relative overflow-hidden group">
                            <div className="absolute top-0 left-0 w-1 h-full bg-teal-500 shadow-[0_0_10px_rgba(20,184,166,0.5)]"></div>
                            <div className="flex justify-between items-center mb-2 border-b border-gray-800 pb-3 z-10 relative">
                                <h2 className="text-teal-400 font-mono uppercase tracking-widest text-sm font-bold flex items-center gap-2 pl-2">
                                    <div className="w-2 h-2 rounded-full bg-teal-500 animate-pulse"></div> Render Outputs
                                </h2>
                                <Button onClick={() => setBatchJobs([])} variant="outline" className="border-teal-500/50 text-teal-400 hover:text-white font-mono text-xs hover:bg-teal-900/40 h-8">
                                    [ CLEAR_QUEUE ]
                                </Button>
                            </div>
                        
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5 z-10 relative">
                                {batchJobs.map((job) => (
                                    <div key={job.taskId} className={`bg-black overflow-hidden rounded-xl border-2 flex flex-col relative transition-colors ${job.status === 'SUCCESS' ? 'border-teal-500/50 shadow-[0_0_15px_rgba(20,184,166,0.2)]' : job.status === 'FAILED' ? 'border-red-900/80 shadow-[0_0_15px_rgba(220,38,38,0.1)]' : 'border-gray-800'}`}>
                                        <div className="bg-[#111] border-b border-gray-800 px-3 py-2.5 flex justify-between items-center z-10">
                                            <span className="text-teal-400 font-bold font-mono text-[10px] truncate flex items-center gap-2">
                                                Task {job.taskId.slice(-4)}
                                            </span>
                                            <div className="font-mono text-[9px] uppercase tracking-widest px-2 py-1 rounded bg-black border border-gray-800 flex items-center gap-1.5 shrink-0 shadow-inner">
                                                {job.status === 'PROCESSING' && <><div className="w-1.5 h-1.5 bg-yellow-500 rounded-full animate-pulse"></div><span className="text-yellow-500">Node</span></>}
                                                {job.status === 'SUCCESS' && <><div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div><span className="text-green-400">Idle</span></>}
                                                {job.status === 'FAILED' && <><div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div><span className="text-red-500">Halt</span></>}
                                            </div>
                                        </div>
                                        
                                        <div className="relative aspect-[9/16] bg-black flex items-center justify-center overflow-hidden">
                                            {job.status === 'SUCCESS' && job.videoUrl ? (
                                                <video src={job.videoUrl} controls muted loop crossOrigin="anonymous" className="w-full h-full object-cover shadow-[0_0_20px_rgba(20,184,166,0.15)] ring-1 ring-teal-500/30" />
                                            ) : (
                                                <div className="absolute inset-0 flex flex-col items-center justify-center z-10 p-4 text-center">
                                                    {job.status === 'PROCESSING' && (
                                                        <div className="bg-[#050505]/95 p-5 rounded-xl border border-gray-800 flex flex-col items-center shadow-2xl backdrop-blur-md">
                                                            <Loader2 className="w-8 h-8 text-teal-400 animate-spin mb-3" />
                                                            <span className="text-teal-400 font-mono text-[9px] tracking-widest uppercase mb-1">Generating Avatar Remixer...</span>
                                                            <RenderTimer startedAt={job.startedAt} />
                                                        </div>
                                                    )}
                                                    {job.status === 'FAILED' && (
                                                        <div className="bg-[#050505]/95 p-4 rounded-xl border-l-4 border-l-red-500 border border-gray-800 flex flex-col items-center backdrop-blur-md">
                                                            <span className="text-red-500 font-bold font-mono text-[10px] uppercase mb-2">CRITICAL REJECTION</span>
                                                            <span className="text-gray-400 font-mono text-[9px] break-words line-clamp-3 overflow-hidden">{job.errorDetails}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Digital Avatar Grid Picker */}
                    <div className="flex-1 flex flex-col min-h-0 bg-[#0a0a0a] rounded-xl border border-gray-800 overflow-hidden shadow-2xl relative">
                        <div className="p-5 border-b border-gray-800 bg-[#111] shrink-0 sticky top-0 z-20 shadow-md">
                            <div className="flex justify-between items-center mb-5">
                                <div>
                                    <h2 className="text-gray-100 font-sans font-bold text-xl flex items-center gap-3 tracking-tight">
                                        <User className="text-teal-500" size={24} /> Select Target Avatar
                                        {selectedAvatarId && <ShieldCheck className="text-green-500 ml-1" size={20} />}
                                    </h2>
                                    <p className="text-xs text-gray-400 font-mono mt-1.5 ml-1">This digital twin will physically hold or present your dummy product assets on camera.</p>
                                </div>
                                <div className="flex gap-5 border-b border-gray-800 self-end">
                                    <button 
                                        onClick={() => setActiveIdentityTab('real')}
                                        className={`font-sans font-semibold text-sm transition-colors relative pb-3 flex items-center gap-2 ${activeIdentityTab === 'real' ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
                                    >
                                        Real-human
                                        {activeIdentityTab === 'real' && <div className="absolute bottom-[-2px] inset-x-0 h-[2px] bg-teal-500 shadow-[0_0_10px_rgba(20,184,166,0.8)]" />}
                                    </button>
                                    <button 
                                        onClick={() => setActiveIdentityTab('aigc')}
                                        className={`font-sans font-semibold text-sm transition-colors relative pb-3 flex items-center gap-2 ${activeIdentityTab === 'aigc' ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
                                    >
                                        AI-generated
                                        {activeIdentityTab === 'aigc' && <div className="absolute bottom-[-2px] inset-x-0 h-[2px] bg-teal-500 shadow-[0_0_10px_rgba(20,184,166,0.8)]" />}
                                    </button>
                                </div>
                            </div>
                            
                            {/* Dynamic Tag Filter Strip */}
                            <div className="flex gap-3 items-center flex-wrap pt-2">
                                <Search size={16} className="text-gray-500" />
                                <Input 
                                    placeholder="Search specific ID or Name..." 
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    className="h-10 w-56 bg-black border-gray-800 text-xs font-mono placeholder:text-gray-600 focus-visible:ring-1 focus-visible:ring-teal-500 rounded-lg"
                                />
                                <div className="w-[1px] h-6 bg-gray-800 mx-2"></div>
                                <select 
                                    className="h-10 px-3 rounded-lg bg-black border border-gray-800 text-teal-400 text-xs font-mono outline-none focus:ring-1 focus:ring-teal-500 capitalize max-w-[280px]"
                                    onChange={e => {
                                        if (e.target.value && e.target.value !== "NONE") handleTagToggle(e.target.value);
                                        e.target.value = "NONE";
                                    }}
                                    value="NONE"
                                >
                                    <option value="NONE">+ Filter by Special Tag Attribute...</option>
                                    {dynamicTagsArray.map(t => <option key={t} value={t}>{t.replace(/:/g, ' - ').replace(/_/g, ' ')}</option>)}
                                </select>
                                
                                <div className="flex flex-wrap gap-2 ml-2">
                                    {selectedTags.map(tag => (
                                        <div key={tag} className="flex items-center gap-1.5 bg-teal-500/10 text-teal-400 border border-teal-500/30 px-2.5 py-1.5 rounded-lg text-xs font-mono capitalize tracking-wide shadow-sm">
                                            {tag.replace(/:/g, ' : ').replace(/_/g, ' ')}
                                            <X size={14} className="cursor-pointer hover:text-white" onClick={() => handleTagToggle(tag)} />
                                        </div>
                                    ))}
                                    {selectedTags.length > 0 && <span className="text-[10px] text-gray-500 font-mono ml-2 cursor-pointer hover:underline self-center hover:text-gray-300" onClick={() => setSelectedTags([])}>Clear All</span>}
                                </div>
                            </div>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-gray-800">
                            {avatars.length === 0 ? (
                                <div className="text-center flex flex-col items-center justify-center py-20 text-teal-600/50 font-mono text-sm">
                                    <Loader2 className="w-10 h-10 animate-spin mb-4 text-teal-500/50" />
                                    <span>&gt; Mapping neural avatar lattice...</span>
                                </div>
                            ) : filteredAvatarGroups.length === 0 ? (
                                <div className="text-center py-20 text-gray-600 font-mono text-sm border-2 border-dashed border-gray-800 rounded-xl m-10">
                                    &gt; Query returned no avatars matching these semantic filters.
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                                    {filteredAvatarGroups.map(group => {
                                        // Pick the primary avatar from the group
                                        const rep = group.representativeAvatar;
                                        const isSelected = selectedAvatarId === rep.avatar_id;
                                        
                                        return (
                                            <div 
                                                key={rep.avatar_id}
                                                onClick={() => setSelectedAvatarId(rep.avatar_id)}
                                                className={`group relative rounded-xl overflow-hidden cursor-pointer transition-all border-2 bg-black shadow-lg hover:shadow-xl ${isSelected ? 'border-teal-500 shadow-[0_0_25px_rgba(20,184,166,0.3)] scale-[1.02]' : 'border-gray-800 hover:border-gray-600 hover:scale-[1.01]'}`}
                                            >
                                                <img 
                                                    src={rep.avatar_thumbnail} 
                                                    alt={rep.avatar_name}
                                                    className="w-full h-auto object-cover aspect-[9/16]"
                                                />
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/20 to-transparent pointer-events-none transition-opacity"></div>
                                                
                                                <div className="absolute bottom-0 left-0 right-0 p-4 pointer-events-none">
                                                    <p className="text-gray-100 font-mono text-sm font-bold truncate tracking-tight">{rep.avatar_name}</p>
                                                    <p className="text-gray-500 text-[9px] font-mono tracking-widest mt-0.5 mb-2">{rep.avatar_id}</p>
                                                    
                                                    <div className="flex flex-wrap gap-1 mt-1">
                                                    {rep.tag_groups?.filter((g: any) => g.tag_type !== 'identity').slice(0, 3).map((g: any, idx: number) => (
                                                        <span key={idx} className={`text-[9px] px-1.5 py-0.5 rounded font-mono uppercase whitespace-nowrap border ${isSelected ? 'bg-teal-500/20 text-teal-300 border-teal-500/30' : 'bg-[#111] text-gray-400 border-gray-700'}`}>
                                                            {g.tags?.[0]?.substring(0, 15)}
                                                        </span>
                                                    ))}
                                                    {rep.tag_groups?.length > 4 && <span className="bg-[#111] border-gray-700 text-gray-500 text-[9px] px-1 py-0.5 rounded border">+{rep.tag_groups.length - 4}</span>}
                                                    </div>
                                                </div>
                                                
                                                {/* Select overlay */}
                                                {isSelected && (
                                                    <div className="absolute inset-x-0 inset-y-0 bg-teal-500/10 flex justify-center items-start pointer-events-none">
                                                        <div className="bg-teal-500 text-black font-mono font-bold text-xs uppercase px-4 py-1.5 rounded-b-xl shadow-lg h-fit flex items-center gap-1.5 mt-0"><CheckCircle2 size={12}/> Target Assigned</div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Persistent Terminal Layout component from other pages */}
                <div className="fixed bottom-0 right-4 p-4 w-[400px] z-50 pointer-events-none">
                    <div className="bg-black/95 backdrop-blur-md border border-gray-800 rounded-xl shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col pointer-events-auto">
                        <div className="bg-[#111] px-4 py-2 border-b border-gray-800 flex items-center justify-between cursor-move">
                            <div className="flex items-center gap-2">
                                <Terminal size={14} className="text-teal-500/70" />
                                <span className="text-[10px] font-mono text-gray-400 uppercase tracking-widest">Symphony Link Sequence</span>
                            </div>
                            <div className="flex gap-2">
                                <div className="w-2.5 h-2.5 rounded-full bg-red-500/20 border border-red-500/50"></div>
                                <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/20 border border-yellow-500/50"></div>
                                <div className="w-2.5 h-2.5 rounded-full bg-green-500/20 border border-green-500/50"></div>
                            </div>
                        </div>
                        <div className="h-[180px] overflow-y-auto p-4 font-mono text-[10px] text-gray-500 flex flex-col gap-1.5 scrollbar-thin scrollbar-thumb-gray-800">
                            {terminalLogs.map((log, i) => (
                                <div key={i} className={`whitespace-pre-wrap leading-relaxed ${log.includes('ERROR') || log.includes('EXCEPTION') ? 'text-red-400' : log.includes('SUCCESS') || log.includes('accepted') ? 'text-teal-400' : ''}`}>
                                    {log}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
