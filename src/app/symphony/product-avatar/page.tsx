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
import { Play, Pause, ChevronRight, FileVideo, LayoutGrid, X, Search, Check, ChevronDown, RefreshCw, Menu, ChevronLeft, Terminal, Loader2, Square, CheckCircle2, Video, User, ImageIcon, Presentation, UploadCloud, Plus } from "lucide-react";
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
    const [localImages, setLocalImages] = useState<{ url: string, file: File | null }[]>([]);
    const [localVideos, setLocalVideos] = useState<{ id: string, file: File | null, url: string }[]>([]);

    const fileInputRef = useRef<HTMLInputElement>(null);

    // Avatar state
    const [avatars, setAvatars] = useState<any[]>([]);
    const [voices, setVoices] = useState<any[]>([]);
    const [selectedAvatarId, setSelectedAvatarId] = useState<string | null>(null);
    const [selectedVoiceId, setSelectedVoiceId] = useState<string | null>(null);

    const [batchJobs, setBatchJobs] = useState<BatchJob[]>([]);

    // Filter Sets
    const [searchQuery, setSearchQuery] = useState("");
    const [activeIdentityTab, setActiveIdentityTab] = useState<'real' | 'aigc'>('real');

    const [filterGesture, setFilterGesture] = useState("All");
    const [filterAge, setFilterAge] = useState("All");
    const [filterGender, setFilterGender] = useState("All");
    const [filterScene, setFilterScene] = useState("All");

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
            } catch (err) { }
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
            } catch (e) { }
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

    // Derived Sets exactly like original but mapping gesture/age/gender/background
    const gestures = ["All", ...Array.from(new Set(avatars.flatMap(a => a.tag_groups?.filter((g: any) => g.tag_type?.toLowerCase() === 'gesture').flatMap((g: any) => g.tags) || [])))];
    const ages = ["All", ...Array.from(new Set(avatars.flatMap(a => a.tag_groups?.filter((g: any) => g.tag_type?.toLowerCase() === 'age').flatMap((g: any) => g.tags) || [])))];
    const genders = ["All", ...Array.from(new Set(avatars.flatMap(a => a.tag_groups?.filter((g: any) => g.tag_type?.toLowerCase() === 'gender').flatMap((g: any) => g.tags) || [])))];
    const scenes = ["All", ...Array.from(new Set(avatars.flatMap(a => a.tag_groups?.filter((g: any) => g.tag_type?.toLowerCase() === 'scene' || g.tag_type?.toLowerCase() === 'background').flatMap((g: any) => g.tags) || [])))];

    const isMatch = (a: any) => {
        let match = true;

        // Identity Tab matching
        const aIden = a.tag_groups?.find((g: any) => g.tag_type === 'identity')?.tags?.[0] || 'unknown';
        if (aIden !== activeIdentityTab) match = false;

        // Search
        if (searchQuery && !a.avatar_name?.toLowerCase().includes(searchQuery.toLowerCase()) && !a.avatar_id?.toLowerCase().includes(searchQuery.toLowerCase())) {
            match = false;
        }

        const avatarGestures = a.tag_groups?.find((g: any) => g.tag_type?.toLowerCase() === 'gesture')?.tags || [];
        if (filterGesture !== "All" && !avatarGestures.includes(filterGesture)) match = false;

        const avatarAges = a.tag_groups?.find((g: any) => g.tag_type?.toLowerCase() === 'age')?.tags || [];
        if (filterAge !== "All" && !avatarAges.includes(filterAge)) match = false;

        const avatarGenders = a.tag_groups?.find((g: any) => g.tag_type?.toLowerCase() === 'gender')?.tags || [];
        if (filterGender !== "All" && !avatarGenders.includes(filterGender)) match = false;

        const avatarScenes = a.tag_groups?.find((g: any) => g.tag_type?.toLowerCase() === 'scene' || g.tag_type?.toLowerCase() === 'background')?.tags || [];
        if (filterScene !== "All" && !avatarScenes.includes(filterScene)) match = false;

        return match;
    };

    const filteredAvatars = avatars.filter(isMatch);

    // Group them for display like in original avatars page
    const groupedMap = new Map<string, any[]>();
    filteredAvatars.forEach(a => {
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

                {/* Left Mini-Rail Navigation */}
                <div className="w-16 bg-[#111] border-r border-gray-800 flex flex-col items-center py-4 gap-4 z-20 shrink-0">

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

                {/* Configuration Sidebar EXACTLY like symphony/page.tsx */}
                <div className={`bg-[#111] border-r border-gray-800 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-800 transition-all duration-300 ease-in-out shrink-0 ${isConfigOpen ? 'w-full md:w-[400px] xl:w-[450px] p-6' : 'w-0 p-0 overflow-hidden border-r-0'}`}>
                    <div className="space-y-6 w-full min-w-[350px]">
                        <Card className="bg-black border-teal-900/30 shadow-sm border">
                            <CardHeader className="bg-teal-950/20 text-teal-500 rounded-t-lg pb-4 border-b border-teal-900/30 py-4 flex justify-between flex-row items-center">
                                <CardTitle className="text-lg font-mono uppercase tracking-wider">Product Avatar Setting</CardTitle>
                            </CardHeader>
                            <CardContent className="pt-4 space-y-4">

                                <div className="space-y-2">
                                    <Label className="font-bold text-gray-400 font-mono text-xs uppercase">Product Details</Label>
                                    <Input
                                        value={productName}
                                        onChange={e => setProductName(e.target.value)}
                                        className="bg-[#0a0a0a] border-gray-800 text-white font-mono text-xs focus:ring-teal-500 placeholder-gray-600 outline-none"
                                        placeholder="Product Name"
                                    />
                                    <Textarea
                                        value={description}
                                        onChange={e => setDescription(e.target.value)}
                                        rows={4}
                                        className="bg-[#0a0a0a] border-gray-800 text-white font-mono text-xs focus:ring-teal-500 outline-none resize-none placeholder-gray-600"
                                        placeholder="Detailed description..."
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label className="font-bold text-gray-400 font-mono text-xs uppercase flex justify-between">
                                        <span>Value Propositions (Max 5)</span>
                                        <span className="text-teal-500">{sellingPoints.length}/5</span>
                                    </Label>
                                    <div className="space-y-2">
                                        {sellingPoints.map((pt, idx) => (
                                            <div key={idx} className="flex gap-2">
                                                <div className="bg-[#0a0a0a] border border-gray-800 text-xs font-mono p-2 rounded flex-1 flex justify-between items-center group">
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
                                                className="bg-[#111] border-dashed border-gray-700 text-white font-mono text-xs pr-8 focus:ring-teal-500 placeholder-gray-600 outline-none h-9"
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

                                <div className="space-y-2 pt-4 border-t border-teal-900/10">
                                    <Label className="font-bold text-gray-400 font-mono text-xs uppercase">Audio Settings</Label>
                                    <div className="flex gap-2">
                                        <select
                                            value={selectedVoiceId || ''}
                                            onChange={e => setSelectedVoiceId(e.target.value)}
                                            className="w-full h-8 px-2 rounded-md bg-[#0a0a0a] border border-gray-800 text-gray-300 text-[10px] font-mono outline-none focus:ring-1 focus:ring-teal-500"
                                        >
                                            {voices.map(v => <option key={v.voice_id} value={v.voice_id}>{v.voice_name || v.voice_id}</option>)}
                                        </select>
                                        <select
                                            value={targetLanguage}
                                            onChange={e => setTargetLanguage(e.target.value)}
                                            className="w-20 shrink-0 h-8 px-2 rounded-md bg-[#0a0a0a] border border-gray-800 text-gray-300 text-[10px] font-mono outline-none focus:ring-1 focus:ring-teal-500 uppercase"
                                        >
                                            <option value="en">EN</option>
                                            <option value="es">ES</option>
                                            <option value="fr">FR</option>
                                            <option value="de">DE</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="space-y-2 pt-4 border-t border-teal-900/10">
                                    <div className="flex justify-between items-center">
                                        <Label className="font-bold text-gray-400 font-mono text-xs uppercase">Visual Assets</Label>
                                        <span className="text-[10px] text-gray-500 font-mono bg-transparent">{localImages.length} Img / {localVideos.length} Vid</span>
                                    </div>

                                    <div className="grid grid-cols-4 gap-2">
                                        {localImages.map((img, idx) => (
                                            <div key={idx} className="aspect-square bg-[#0a0a0a] rounded border border-gray-800 relative group overflow-hidden">
                                                <img src={img.url} className="w-full h-full object-cover" />
                                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex justify-center items-center transition-opacity backdrop-blur-[2px]">
                                                    <X size={16} className="text-red-400 cursor-pointer hover:scale-110 transition-transform" onClick={() => removeImage(idx)} />
                                                </div>
                                            </div>
                                        ))}
                                        {localVideos.map((vid, idx) => (
                                            <div key={idx} className="aspect-square bg-[#0a0a0a] rounded border border-gray-800 relative group overflow-hidden">
                                                <video src={vid.url} className="w-full h-full object-cover" />
                                                <div className="absolute inset-0 flex items-center justify-center text-teal-500 font-bold bg-black/30 pointer-events-none drop-shadow-md"><Video size={16} /></div>
                                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex justify-center items-center transition-opacity backdrop-blur-[2px]">
                                                    <X size={16} className="text-red-400 cursor-pointer hover:scale-110 transition-transform pointer-events-auto" onClick={() => removeVideo(idx)} />
                                                </div>
                                            </div>
                                        ))}
                                        {localImages.length + localVideos.length < 30 && (
                                            <div className="aspect-square bg-[#0a0a0a] border border-dashed border-gray-700 rounded hover:bg-[#111] hover:border-teal-500/50 transition-colors flex items-center justify-center cursor-pointer disabled:opacity-50" onClick={() => fileInputRef.current?.click()}>
                                                <UploadCloud size={20} className="text-gray-500" />
                                            </div>
                                        )}
                                        <input type="file" ref={fileInputRef} className="hidden" multiple accept="image/*,video/*" onChange={handleFileUpload} />
                                    </div>
                                    <p className="text-[10px] text-gray-500 font-mono mt-2 leading-tight">Must provide images or short videos of the physical product so that the Avatar can refer to them during generation.</p>
                                </div>
                            </CardContent>
                        </Card>

                        <div className="space-y-2">
                            <Button
                                onClick={handleGenerate}
                                disabled={loading || selectedAvatarId === null || (localImages.length === 0 && localVideos.length === 0)}
                                className="w-full h-12 text-lg font-bold bg-teal-600 hover:bg-teal-500 text-white font-mono uppercase tracking-widest border-0 shadow-lg shadow-teal-500/20 disabled:opacity-50 transition-all"
                            >
                                {loading ? "[ COMPILING PRODUCT... ]" : `[ GENERATE AVATAR PRODUCT ]`}
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Main Dynamic Viewport EXACTLY like symphony/page.tsx */}
                <div className="flex-1 overflow-y-auto bg-[#0a0a0a] p-6 scrollbar-thin scrollbar-thumb-gray-800">
                    <div className="max-w-[1800px] mx-auto space-y-6">

                        {/* Active Jobs Rendering Box */}
                        {batchJobs.length > 0 && (
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
                                    {batchJobs.map((job) => (
                                        <div key={job.taskId} className={`bg-[#0a0a0a] overflow-hidden rounded-xl border flex flex-col group relative transition-colors ${job.status === 'SUCCESS' ? 'border-teal-500/30' : job.status === 'FAILED' ? 'border-red-900/50' : 'border-gray-800'}`}>
                                            <div className="bg-[#111] border-b border-gray-800 px-3 py-2 flex justify-between items-center z-10">
                                                <span className="text-teal-400 font-bold font-mono text-[10px] truncate flex items-center gap-2">
                                                    Task {job.taskId.slice(-4)}
                                                </span>
                                                <div className="font-mono text-[9px] uppercase tracking-widest px-2 py-1 rounded bg-[#0a0a0a] border border-gray-800 flex items-center gap-1.5 shrink-0 shadow-inner">
                                                    {job.status === 'PROCESSING' && <><div className="w-1.5 h-1.5 bg-yellow-500 rounded-full animate-pulse"></div><span className="text-yellow-500">Node</span></>}
                                                    {job.status === 'SUCCESS' && <><div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div><span className="text-green-400">Idle</span></>}
                                                    {job.status === 'FAILED' && <><div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div><span className="text-red-500">Halt</span></>}
                                                </div>
                                            </div>

                                            <div className="relative aspect-[9/16] bg-black flex items-center justify-center overflow-hidden">
                                                {job.status === 'SUCCESS' && job.videoUrl ? (
                                                    <video src={job.videoUrl} controls muted loop crossOrigin="anonymous" className="w-full h-full object-cover rounded-xl shadow-[0_0_20px_rgba(20,184,166,0.15)] ring-1 ring-teal-500/30" />
                                                ) : (
                                                    <div className="absolute inset-0 flex flex-col items-center justify-center z-10 p-4 text-center">
                                                        {job.status === 'PROCESSING' && (
                                                            <div className="bg-[#050505]/95 p-5 rounded-xl border border-gray-800 flex flex-col items-center shadow-2xl backdrop-blur-md">
                                                                <Loader2 className="w-8 h-8 text-teal-400 animate-spin mb-3" />
                                                                <span className="text-teal-400 font-mono text-[9px] tracking-widest uppercase mb-1">Executing...</span>
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

                        <div className="flex flex-col gap-4 mb-4">
                            <div className="flex justify-between items-center">
                                <h2 className="text-gray-200 font-mono uppercase tracking-widest text-sm">Target Avatar</h2>
                                <div className="flex items-center gap-4">
                                    <span className={`text-xs font-mono font-bold text-teal-500`}>{selectedAvatarId ? '1' : '0'}/1 Selected</span>
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
                                    className="h-8 w-48 bg-[#0a0a0a] border-gray-700 text-white text-xs font-mono placeholder:text-gray-600 focus-visible:ring-1 focus-visible:ring-teal-500"
                                />

                                <select value={filterGesture} onChange={e => setFilterGesture(e.target.value)} className="h-8 px-2 rounded-md bg-[#0a0a0a] border border-gray-700 text-gray-400 text-xs font-mono outline-none focus:ring-1 focus:ring-teal-500 capitalize">
                                    {gestures.map(opt => <option key={opt} value={opt}>{opt === 'All' ? 'Gesture' : opt.replace(/_/g, ' ')}</option>)}
                                </select>

                                <select value={filterAge} onChange={e => setFilterAge(e.target.value)} className="h-8 px-2 rounded-md bg-[#0a0a0a] border border-gray-700 text-gray-400 text-xs font-mono outline-none focus:ring-1 focus:ring-teal-500 capitalize">
                                    {ages.map(opt => <option key={opt} value={opt}>{opt === 'All' ? 'Age' : opt.replace(/_/g, ' ')}</option>)}
                                </select>

                                <select value={filterGender} onChange={e => setFilterGender(e.target.value)} className="h-8 px-2 rounded-md bg-[#0a0a0a] border border-gray-700 text-gray-400 text-xs font-mono outline-none focus:ring-1 focus:ring-teal-500 capitalize">
                                    {genders.map(opt => <option key={opt} value={opt}>{opt === 'All' ? 'Gender' : opt.replace(/_/g, ' ')}</option>)}
                                </select>

                                <select value={filterScene} onChange={e => setFilterScene(e.target.value)} className="h-8 px-2 rounded-md bg-[#0a0a0a] border border-gray-700 text-gray-400 text-xs font-mono outline-none focus:ring-1 focus:ring-teal-500 capitalize">
                                    {scenes.map(opt => <option key={opt} value={opt}>{opt === 'All' ? 'Background' : opt.replace(/_/g, ' ')}</option>)}
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
                                    // Pick the primary avatar from the group
                                    const rep = group.representativeAvatar;
                                    const isSelected = selectedAvatarId === rep.avatar_id;

                                    return (
                                        <div
                                            key={rep.avatar_id}
                                            onClick={() => setSelectedAvatarId(rep.avatar_id)}
                                            className={`group relative rounded-xl overflow-hidden cursor-pointer transition-all border-2 ${isSelected ? 'border-teal-500 shadow-[0_0_15px_rgba(20,184,166,0.3)]' : 'border-transparent hover:border-gray-600'}`}
                                        >
                                            <img
                                                src={rep.avatar_thumbnail}
                                                alt={rep.avatar_name}
                                                className="w-full h-auto object-cover aspect-[9/16]"
                                            />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent"></div>

                                            <div className="absolute bottom-0 left-0 right-0 p-3">
                                                <p className="text-white font-mono text-xs font-bold truncate">{rep.avatar_name}</p>

                                                <div className="flex gap-1 mt-1 overflow-x-hidden">
                                                    {rep.tag_groups?.filter((g: any) => g.tag_type !== 'identity').slice(0, 3).map((g: any, idx: number) => (
                                                        <span key={idx} className="bg-black/80 text-gray-400 text-[9px] px-1.5 py-0.5 rounded font-mono uppercase whitespace-nowrap border border-gray-800">
                                                            {g.tags?.[0]}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Select overlay exact copy of symphony/page.tsx overlay style */}
                                            {isSelected && (
                                                <div className="absolute inset-0 bg-teal-500/10 flex items-center justify-center pointer-events-none">
                                                    <div className="bg-teal-500 text-black font-mono font-bold text-[10px] uppercase px-2 py-1 rounded-full shadow-lg">✓ Avatar Selected</div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* Persistent Terminal Layout component from other pages */}
                <div className="fixed bottom-0 right-0 p-4 w-[400px] z-50 pointer-events-none">
                    <div className="bg-black/90 backdrop-blur-md border border-gray-800 rounded-lg shadow-2xl overflow-hidden flex flex-col pointer-events-auto">
                        <div className="bg-[#111] px-3 py-1.5 border-b border-gray-800 flex items-center justify-between cursor-move">
                            <div className="flex items-center gap-2">
                                <Terminal size={12} className="text-gray-500" />
                                <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">Symphony Link Sequence</span>
                            </div>
                            <div className="flex gap-1.5">
                                <div className="w-2.5 h-2.5 rounded-full bg-red-500/20 border border-red-500/50"></div>
                                <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/20 border border-yellow-500/50"></div>
                                <div className="w-2.5 h-2.5 rounded-full bg-green-500/20 border border-green-500/50"></div>
                            </div>
                        </div>
                        <div className="h-[150px] overflow-y-auto p-3 font-mono text-[10px] text-gray-400 flex flex-col gap-1 scrollbar-thin scrollbar-thumb-gray-800">
                            {terminalLogs.map((log, i) => (
                                <div key={i} className={`whitespace-pre-wrap ${log.includes('ERROR') ? 'text-red-400' : log.includes('SUCCESS') ? 'text-green-400' : ''}`}>{log}</div>
                            ))}
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}

