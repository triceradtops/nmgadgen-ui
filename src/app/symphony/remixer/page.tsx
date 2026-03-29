"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Play, Square, ChevronLeft, Menu, Video, ChevronRight, UploadCloud, X, Terminal, Loader2, ImageIcon, Plus } from "lucide-react";
import { useRef } from "react";
import Link from 'next/link';

interface BatchJob {
    taskId: string;
    productName: string;
    status: 'PROCESSING' | 'SUCCESS' | 'FAILED';
    videoUrl?: string;
    subtitleUrl?: string;
    errorDetails?: string;
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

export default function StockVideoStudio() {
    const [loading, setLoading] = useState(false);
    const [isConfigOpen, setIsConfigOpen] = useState(true);
    const [voices, setVoices] = useState<any[]>([]);

    // Form Inputs
    const [productName, setProductName] = useState("");
    const [productDesc, setProductDesc] = useState("");
    const [sellingPoints, setSellingPoints] = useState("Durable\nAffordable\nPremium");
    const [voiceId, setVoiceId] = useState("");
    const [videoDuration, setVideoDuration] = useState("RECOMMENDED");

    
    const [batchJobs, setBatchJobs] = useState<BatchJob[]>([]);
    const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
    
    // Multi-Asset States
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);
    const [uploadedImages, setUploadedImages] = useState<string[]>([]);
    const [uploadedVideos, setUploadedVideos] = useState<string[]>([]);
    const [terminalLogs, setTerminalLogs] = useState<string[]>([
        "> [TIKTOK_REMIX_ENGINE] Neural Assembly Initialized...",
        `[${new Date().toLocaleTimeString()}] Ready for Multi-Asset Ingestion.`
    ]);
    
    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(event.target.files || []);
        if (files.length === 0) return;

        setUploading(true);
        const images: string[] = [];
        const videos: string[] = [];
        let hasError = false;

        setTerminalLogs(prev => [...prev.slice(-49), `[${new Date().toLocaleTimeString()}] Batch mounting ${files.length} localized assets to secure S3 bucket...`]);

        for (const file of files) {
            const formData = new FormData();
            formData.append("file", file);

            try {
                const res = await fetch("/api/upload", {
                    method: "POST",
                    headers: {
                        "x-access-code": localStorage.getItem("site_access_code") || process.env.NEXT_PUBLIC_ACCESS_CODE || "nmg_super_secret_2026",
                    },
                    body: formData,
                });

                if (res.ok) {
                    const data = await res.json();
                    if (data.url) {
                        if (file.type.startsWith("video/")) {
                            videos.push(data.url);
                        } else {
                            images.push(data.url);
                        }
                    } else {
                        hasError = true;
                    }
                } else {
                    hasError = true;
                }
            } catch (error) {
                hasError = true;
            }
        }

        if (images.length) {
            setUploadedImages(prev => [...prev, ...images]);
            setTerminalLogs(prev => [...prev.slice(-49), `[${new Date().toLocaleTimeString()}] Successfully mapped ${images.length} image vectors.`]);
        }
        if (videos.length) {
            setUploadedVideos(prev => [...prev, ...videos]);
            setTerminalLogs(prev => [...prev.slice(-49), `[${new Date().toLocaleTimeString()}] Successfully mapped ${videos.length} video containers.`]);
        }
        if (hasError) {
            setTerminalLogs(prev => [...prev.slice(-49), `[${new Date().toLocaleTimeString()}] ERROR: Rejected certain files in transmission payload.`]);
        }

        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };
    
    const removeImage = (idx: number) => setUploadedImages(prev => prev.filter((_, i) => i !== idx));
    const removeVideo = (idx: number) => setUploadedVideos(prev => prev.filter((_, i) => i !== idx));


    useEffect(() => {
        const fetchVoices = async () => {
            try {
                const res = await fetch("https://web-production-1f2e2.up.railway.app/api/tiktok/voices");
                if (res.ok) {
                    const data = await res.json();
                    if (data.status === "success" && data.data?.length > 0) {
                        setVoices(data.data.filter((v: any) => v.voice_id !== "None"));
                        setVoiceId(data.data.filter((v: any) => v.voice_id !== "None")[0]?.voice_id);
                    }
                }
            } catch (err) { }
        };
        fetchVoices();
    }, []);

    const playVoiceSample = (vidId: string, url: string) => {
        if (!url) return;
        if (playingVoiceId === vidId) {
            setPlayingVoiceId(null);
            return;
        }
        setPlayingVoiceId(vidId);
        const audio = new Audio(url);
        audio.play();
        audio.onended = () => setPlayingVoiceId(null);
    };

    const updateJobState = (taskId: string, updates: Partial<BatchJob>) => {
        setBatchJobs(prev => prev.map(job => job.taskId === taskId ? { ...job, ...updates } : job));
    };

    const pollResults = async (taskId: string) => {
        const interval = setInterval(async () => {
            try {
                // Video status endpoint uses /status/video/{taskId}
                const res = await fetch(`https://web-production-1f2e2.up.railway.app/api/tiktok/status/video/${taskId}?aigc_video_type=VOICEOVER`);
                if (res.status === 200) {
                    const data = await res.json();
                    const tasks = data.list || [];

                    if (tasks.length > 0) {
                        const t = tasks[0];
                        if (t.status === "SUCCESS") {
                            updateJobState(taskId, {
                                status: 'SUCCESS',
                                videoUrl: t.preview_url || t.video_url,
                                subtitleUrl: t.srt_file_url || t.subtitle_url || t.caption_url || null
                            });
                            setBatchJobs(current => current.map(job => job.taskId === taskId ? { ...job, status: 'SUCCESS' as const } : job));
                            clearInterval(interval);
                        } else if (t.status === "FAILED") {
                            updateJobState(taskId, { status: 'FAILED' });
                            setTerminalLogs(prev => [...prev.slice(-49), `[${new Date().toLocaleTimeString()}] ERROR: Remix Node Critical Failure.`]);
                            clearInterval(interval);
                        }
                    } else if (data.detail && String(data.detail).includes("API Error")) {
                        updateJobState(taskId, { status: 'FAILED' });
                            setTerminalLogs(prev => [...prev.slice(-49), `[${new Date().toLocaleTimeString()}] ERROR: Remix Node Critical Failure.`]);
                        clearInterval(interval);
                    }
                }
            } catch (e) {
                console.error("Polling error", e);
            }
        }, 5000);
    };

    const handleGenerate = async () => {
        if (!productName.trim() || !productDesc.trim() || !voiceId) {
            alert("Empty descriptive properties blocked.");
            return;
        }

        setLoading(true);
        const points = sellingPoints.split('\n').map(l => l.trim()).filter(Boolean).slice(0, 10);

        setTerminalLogs(prev => [...prev.slice(-49), `[${new Date().toLocaleTimeString()}] Dispatching Remix Request to Symphony Pipeline...`]);
        const payload = {
            aigc_video_type: "VOICEOVER",
            product_video_info: {
                video_generation_count: 1,
                target_language: "en",
                voice_id: voiceId,
                video_duration: videoDuration,
                subtitle_enabled: true,
                product_info_list: [{
                    product_name: productName.slice(0, 50),
                    description: productDesc.slice(0, 500),
                    selling_points: points.length ? points : ["Standard product"]
                }],
                input_image_list: uploadedImages.length > 0 ? { image_url_list: uploadedImages } : undefined,
                input_video_list: uploadedVideos.length > 0 ? { video_id_list: uploadedVideos } : undefined
            }
        };

        try {
            const res = await fetch("https://web-production-1f2e2.up.railway.app/api/tiktok/remix/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
            const data = await res.json();

            if (res.ok && data.status === "accepted") {
                const tasks = data.task_data?.list || data.task_data?.task_ids || (data.task_data?.task_id ? [data.task_data.task_id] : []);

                if (tasks.length > 0) {
                    const newJobs = tasks.map((t: any) => ({
                        taskId: t.task_id || t,
                        productName,
                        status: 'PROCESSING',
                        startedAt: Date.now()
                    }));

                    setBatchJobs(prev => [...prev, ...newJobs]);
                    setLoading(false);
                    setProductName(""); // Clear UI buffer partially

                    newJobs.forEach((job: any) => pollResults(job.taskId));
                } else {
                    setBatchJobs(prev => [...prev, {
                        taskId: `fail_api_silence_${Date.now()}`,
                        productName: productName.trim() || 'Unknown Target',
                        status: 'FAILED',
                        errorDetails: "TikTok accepted the request but generated no render tasks internally. Check text constraint limits.",
                        startedAt: Date.now()
                    }]);
                    setLoading(false);
                }
            } else {
                setBatchJobs(prev => [...prev, {
                    taskId: `fail_api_${Date.now()}`,
                    productName: productName.trim() || 'Unknown Target',
                    status: 'FAILED',
                    errorDetails: data.detail ? (typeof data.detail === 'string' ? data.detail : JSON.stringify(data.detail)) : "Immediate API Pipeline Reject",
                    startedAt: Date.now()
                }]);
                setLoading(false);
            }
        } catch (e) {
            setBatchJobs(prev => [...prev, {
                taskId: `fail_net_${Date.now()}`,
                productName: productName.trim() || 'Unknown Target',
                status: 'FAILED',
                errorDetails: "Network failure calling the creative remux coordinator.",
                startedAt: Date.now()
            }]);
            setLoading(false);
        }
    };

    return (
        <div className="h-screen bg-[#0a0a0a] text-gray-300 flex flex-col font-sans overflow-hidden">
            {/* Header */}
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

                    <div className="h-8 w-px bg-gray-800 mx-2 hidden lg:block"></div>

                    <nav className="hidden lg:flex gap-3">
                        <Link href="/symphony">
                            <Button variant="ghost" className="text-gray-400 hover:bg-gray-800 hover:text-white font-mono text-xs uppercase tracking-wider h-9 transition-all shrink-0">Avatars</Button>
                        </Link>
                        <Link href="/symphony/remixer">
                            <Button variant="ghost" className="text-teal-400 bg-teal-500/10 border border-teal-500/30 hover:bg-teal-500/20 hover:text-teal-300 font-mono text-xs uppercase tracking-wider h-9 shrink-0">Remixer</Button>
                        </Link>
                        <Link href="/symphony/image-animation">
                            <Button variant="ghost" className="text-gray-400 hover:bg-gray-800 hover:text-white font-mono text-xs uppercase tracking-wider h-9 transition-all shrink-0">Image to Video</Button>
                        </Link>
                        <Link href="/symphony/text-to-video">
                            <Button variant="ghost" className="text-gray-400 hover:bg-gray-800 hover:text-white font-mono text-xs uppercase tracking-wider h-9 transition-all shrink-0">Text to Video</Button>
                        </Link>
                    </nav>
                </div>
                <div className="flex gap-2">
                    <Link href="/" className="text-gray-400 hover:text-gray-300 text-sm border border-gray-800 bg-gray-900/50 px-3 py-1.5 rounded-md transition-colors font-mono">
                        [ BACK_TO_ADS ]
                    </Link>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
                {/* Configuration Sidebar */}
                <div className={`bg-[#111] border-r border-gray-800 overflow-y-auto scrollbar-thin transition-all duration-300 ease-in-out shrink-0 ${isConfigOpen ? 'w-full md:w-[400px] xl:w-[450px] p-6' : 'w-0 p-0 overflow-hidden border-r-0'}`}>
                    <div className="space-y-6 w-full min-w-[350px]">
                        <Card className="bg-black border-teal-900/30 shadow-sm">
                            <CardHeader className="bg-teal-950/20 text-teal-500 rounded-t-lg pb-4 border-b border-teal-900/30">
                                <CardTitle className="text-lg font-mono uppercase tracking-wider">Stock Generation Specs</CardTitle>
                            </CardHeader>
                            <CardContent className="pt-4 space-y-4">
                                <div className="space-y-4 mb-6">
                                    <Label className="font-bold text-gray-400 font-mono text-xs uppercase">Remix Media Assets (Images/Videos)</Label>
                                    <div 
                                        className={`border-2 border-dashed ${uploading ? 'border-teal-500 bg-teal-900/10' : 'border-gray-800 hover:border-teal-500/50 hover:bg-teal-900/5'} rounded-xl p-4 transition-all flex flex-col justify-center items-center gap-2 cursor-pointer relative group`}
                                        onClick={() => !uploading && fileInputRef.current?.click()}
                                    >
                                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*,video/mp4,video/quicktime" multiple onChange={handleFileUpload} disabled={uploading} />
                                        {uploading ? (
                                            <div className="flex flex-col items-center gap-2 animate-pulse text-teal-500">
                                                <div className="w-5 h-5 border-t-2 border-teal-500 rounded-full animate-spin"></div>
                                                <span className="font-mono text-[10px] uppercase font-bold tracking-widest">Mounting to S3 Bucket...</span>
                                            </div>
                                        ) : (
                                            <>
                                                <UploadCloud className="text-teal-500 group-hover:scale-110 transition-transform" />
                                                <div className="text-center">
                                                    <span className="font-mono text-xs text-teal-400 font-bold tracking-wider">CLICK OR DRAG MEDIA</span>
                                                    <p className="font-mono text-[9px] text-gray-500 uppercase mt-1">Supports MULTIPLE Images & MP4s</p>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                    
                                    {/* Preview Mounted Media */}
                                    {(uploadedImages.length > 0 || uploadedVideos.length > 0) && (
                                        <div className="flex flex-wrap gap-2 mt-2">
                                            {uploadedImages.map((img, i) => (
                                                <div key={`img-${i}`} className="relative group w-12 h-16 bg-black border border-gray-800 rounded overflow-hidden">
                                                    <img src={img} className="object-cover w-full h-full opacity-80" alt="uploaded asset" />
                                                    <button onClick={() => removeImage(i)} className="absolute top-0 right-0 p-0.5 bg-black/80 hover:bg-red-500/80 text-white rounded-bl opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <X size={10} />
                                                    </button>
                                                </div>
                                            ))}
                                            {uploadedVideos.map((vid, i) => (
                                                <div key={`vid-${i}`} className="relative group w-12 h-16 bg-[#0a0a0a] border border-teal-500/30 rounded overflow-hidden flex items-center justify-center">
                                                    <Video size={14} className="text-teal-500 opacity-60" />
                                                    <span className="absolute bottom-1 font-mono text-[8px] text-teal-500 bg-black/80 px-1 rounded">MP4</span>
                                                    <button onClick={() => removeVideo(i)} className="absolute top-0 right-0 p-0.5 bg-black/80 hover:bg-red-500/80 text-white rounded-bl opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <X size={10} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <Label className="font-bold text-gray-400 font-mono text-xs uppercase">Product Name</Label>
                                    <Input
                                        value={productName}
                                        onChange={e => setProductName(e.target.value)}
                                        placeholder="e.g., Hydrating Serum"
                                        style={{ color: "white" }}
                                        className="bg-[#0a0a0a] border-gray-700 text-white font-mono text-sm focus-visible:ring-teal-500"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="font-bold text-gray-400 font-mono text-xs uppercase">Description / Purpose</Label>
                                    <Textarea
                                        value={productDesc}
                                        onChange={e => setProductDesc(e.target.value)}
                                        rows={3}
                                        placeholder="A detailed sentence on what this product does..."
                                        style={{ color: "white" }}
                                        className="bg-[#0a0a0a] border-gray-700 text-white text-sm font-sans focus-visible:ring-teal-500 resize-none"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="font-bold text-gray-400 font-mono text-xs uppercase">Selling Points (Return separated)</Label>
                                    <Textarea
                                        value={sellingPoints}
                                        onChange={e => setSellingPoints(e.target.value)}
                                        rows={4}
                                        style={{ color: "white" }}
                                        className="bg-[#0a0a0a] border-gray-700 text-white text-xs font-mono focus-visible:ring-teal-500 resize-none whitespace-pre"
                                    />
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-black border-teal-900/30 shadow-sm">
                            <CardHeader className="bg-teal-950/20 text-teal-500 rounded-t-lg pb-4 border-b border-teal-900/30 py-3">
                                <CardTitle className="text-sm font-mono uppercase tracking-wider">Audio & Tempo Binding</CardTitle>
                            </CardHeader>
                            <CardContent className="pt-4 space-y-4">
                                <div>
                                    <Label className="text-xs font-mono text-gray-400 uppercase mb-2 block">Voice Synthesis</Label>
                                    <select
                                        value={voiceId}
                                        onChange={e => setVoiceId(e.target.value)}
                                        style={{ color: "white" }}
                                        className="w-full h-10 px-3 rounded-md bg-[#0a0a0a] border border-gray-700 text-sm text-gray-200 outline-none focus:ring-1 focus:ring-teal-500"
                                    >
                                        <option value="" disabled>Select a voice</option>
                                        {voices.map((v, i) => (
                                            <option key={i} value={v.voice_id}>{v.voice_name || v.voice_id} - {v.voice_tags?.find((t: any) => t.tag_type === 'Gender')?.tag_name || 'Unknown'}</option>
                                        ))}
                                    </select>
                                    {voiceId && voices.find(v => v.voice_id === voiceId)?.preview_audio && (
                                        <button
                                            onClick={() => playVoiceSample(voiceId, voices.find(v => v.voice_id === voiceId).preview_audio)}
                                            className="text-[10px] text-teal-500 mt-2 font-mono flex items-center gap-1 hover:text-teal-400 transition-colors"
                                        >
                                            {playingVoiceId === voiceId ? <Square size={10} fill="currentColor" /> : <Play size={10} fill="currentColor" />}
                                            {playingVoiceId === voiceId ? 'STOP PREVIEW' : 'PLAY PREVIEW'}
                                        </button>
                                    )}
                                </div>

                                <div>
                                    <Label className="text-xs font-mono text-gray-400 uppercase mb-2 block">Constraint Duration</Label>
                                    <select
                                        value={videoDuration}
                                        onChange={e => setVideoDuration(e.target.value)}
                                        style={{ color: "white" }}
                                        className="w-full h-10 px-3 rounded-md bg-[#0a0a0a] border border-gray-700 text-sm font-mono text-gray-200 outline-none"
                                    >
                                        <option value="RECOMMENDED">AI Flexible</option>
                                        <option value="15S">Strict 15s</option>
                                        <option value="30S">Strict 30s</option>
                                    </select>
                                </div>

                                <Button
                                    onClick={handleGenerate}
                                    disabled={loading || !productName}
                                    className="w-full bg-teal-600 hover:bg-teal-500 text-white font-mono uppercase tracking-wider text-xs h-10 rounded-md transition-all mt-4 disabled:opacity-50"
                                >
                                    {loading ? 'Synthesizing Request...' : 'Generate Text-to-Video'}
                                    <ChevronRight className="w-4 h-4 ml-2" />
                                </Button>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                {/* Split Workspace Area */}
                <div className="flex-1 flex flex-col xl:flex-row overflow-hidden border-t border-gray-800 xl:border-t-0 bg-black">
                    <div className="flex-1 flex flex-col min-w-0 bg-[#0A0A0A] xl:border-r border-gray-800">
                        <div className="flex-1 overflow-y-auto bg-[#0a0a0a] p-6 scrollbar-thin scrollbar-thumb-gray-800">
                            <div className="max-w-[1800px] mx-auto space-y-6">
                                {batchJobs.length === 0 ? (
                                    <div className="h-[400px] flex flex-col items-center justify-center text-gray-600 gap-4 border-2 border-dashed border-gray-900 rounded-xl">
                                        <Video size={48} className="opacity-20" />
                                        <p className="font-mono text-xs tracking-widest uppercase shadow-sm">Remix Pipeline Idle – Configure Vector Params</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                            {batchJobs.map(job => (
                                <div key={job.taskId} className={`bg-[#0a0a0a] overflow-hidden rounded-xl border flex flex-col group relative transition-colors ${job.status === 'SUCCESS' ? 'border-teal-500/30' : job.status === 'FAILED' ? 'border-red-900/50' : 'border-gray-800'}`}>
                                                <div className="bg-[#111] border-b border-gray-800 px-3 py-2 flex justify-between items-center z-10">
                                                    <div className="flex flex-col overflow-hidden mr-2">
                                                        <span className="text-teal-400 font-bold font-mono text-[10px] truncate flex items-center gap-2" title={job.taskId}>
                                                            ID_{job.taskId.slice(-8).toUpperCase()}
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
                                                            controls 
                                                            autoPlay 
                                                            loop 
                                                            muted
                                                            crossOrigin="anonymous"
                                                            className="w-full h-full object-cover rounded-xl shadow-[0_0_20px_rgba(20,184,166,0.15)] ring-1 ring-teal-500/30"
                                                        >
                                                            <source src={job.videoUrl} type="video/mp4" />
                                                            {job.subtitleUrl && (
                                                                <track
                                                                    kind="captions"
                                                                    src={job.subtitleUrl.endsWith('.srt') ? `/api/captions?url=${encodeURIComponent(job.subtitleUrl)}` : job.subtitleUrl}
                                                                    srcLang="en"
                                                                    label="English"
                                                                    default
                                                                />
                                                            )}
                                                        </video>
                                                    ) : (
                                                        <div className="absolute inset-0 bg-[#0a0a0a] flex flex-col items-center justify-center z-10 p-4 text-center">
                                                            {job.status === 'PROCESSING' && (
                                                                <div className="bg-black/90 p-5 rounded-xl border border-gray-800 flex flex-col items-center shadow-2xl shadow-black relative z-20">
                                                                    <Loader2 className="w-8 h-8 text-teal-400 animate-spin mb-3" />
                                                                    <span className="text-teal-400 font-mono text-[10px] tracking-widest uppercase mb-1">Executing Array...</span>
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
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right Terminal Sidebar */}
                    <div className="w-full md:w-[300px] xl:w-[350px] bg-[#0A0A0A] border-l border-gray-800 flex flex-col shrink-0">
                        <div className="bg-[#111] px-4 py-3 border-b border-gray-800 flex items-center gap-2 shrink-0 text-gray-400">
                            <Terminal size={16} className="text-teal-500" />
                            <span className="text-xs font-mono font-bold tracking-wider uppercase">Symphony Terminal</span>
                        </div>
                        <div className="p-4 overflow-y-auto flex-1 font-mono text-xs leading-relaxed space-y-1">
                            {terminalLogs.map((log, i) => (
                                <div key={i} className={`${log.includes("ERROR") || log.includes("LIMIT") || log.includes("FAILED") ? 'text-red-400' : 'text-teal-400'}`}>
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
