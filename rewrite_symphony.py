import re

with open("src/app/symphony/page.tsx", "r") as f:
    content = f.read()

# Replace State
content = content.replace(
    'const [selectedAvatarId, setSelectedAvatarId] = useState<string | null>(null);\n    const [selectedVoiceId, setSelectedVoiceId] = useState<string>("");\n    const [script, setScript] = useState("Hey, we finally implemented Symphony before the quarter ended!");\n    \n    // Result\n    const [jobId, setJobId] = useState<string | null>(null);\n    const [finalVideoUrl, setFinalVideoUrl] = useState<string | null>(null);',
    '''const [selectedAvatarIds, setSelectedAvatarIds] = useState<string[]>([]);
    const [selectedVoiceIds, setSelectedVoiceIds] = useState<string[]>([]);
    const [script, setScript] = useState("Hey, we finally implemented Symphony before the quarter ended!");
    
    // Result Tracking
    type BatchJob = {
        taskId: string;
        avatarId: string;
        voiceId: string;
        status: string;
        videoUrl: string | null;
        errorDetails: string | null;
    };
    const [batchJobs, setBatchJobs] = useState<BatchJob[]>([]);'''
)

# Modify default voice selection array logic
content = content.replace(
    'setSelectedVoiceId(data.data[0].voice_id);',
    'setSelectedVoiceIds([data.data[0].voice_id]);'
)

# Replace handleGenerate
content = re.sub(
    r'    const handleGenerate = async \(\) => {.*?    };',
    '''    const handleGenerate = async () => {
        const totalPermutations = selectedAvatarIds.length * selectedVoiceIds.length;
        if (selectedAvatarIds.length === 0 || selectedVoiceIds.length === 0 || totalPermutations > 10) return;
        
        setLoading(true);
        setBatchJobs([]);
        setTerminalLogs(["[SYSTEM] Batch Generation Matrix Initialized..."]);
        setIsConfigOpen(false);

        try {
            const combos = [];
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
            
            const payload = {
                material_packages: combos
            };

            const res = await fetch("https://web-production-1f2e2.up.railway.app/api/tiktok/avatar/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            const data = await res.json();
            
            let createdTasks = [];
            if (data.task_data?.list?.length > 0) {
                createdTasks = data.task_data.list;
            } else if (data.task_data?.task_id) {
                createdTasks = [{ task_id: data.task_data.task_id }];
            }

            if (createdTasks.length > 0) {
                appendLog(`Worker Cluster Dispatched. Registered ${createdTasks.length} tasks.`);
                
                const newJobs = createdTasks.map((t: any, idx: number) => ({
                    taskId: t.task_id,
                    avatarId: combos[idx]?.avatar_id || "Unknown",
                    voiceId: combos[idx]?.voice_id || "Unknown",
                    status: 'PROCESSING',
                    videoUrl: null,
                    errorDetails: null
                }));
                
                setBatchJobs(newJobs);
                
                // Keep loading visible only until we receive jobs layout
                setLoading(false);
                
                newJobs.forEach((job: any) => pollResults(job.taskId));
            } else {
                appendLog(`CRITICAL ERROR: ${JSON.stringify(data)}`);
                setLoading(false);
            }
        } catch (e) {
            appendLog(`CRITICAL ERROR: Network failure submitting batch.`);
            setLoading(false);
        }
    };''',
    content,
    flags=re.DOTALL
)

# Replace pollResults
content = re.sub(
    r'    const pollResults = async \(id: string\) => {.*?    };',
    '''    const updateJobState = (taskId: string, updates: Partial<BatchJob>) => {
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
                            clearInterval(interval);
                        } else if (t.status === "FAILED") {
                            const errorObj = t.fail_reason || t.error_msg || t.message || t.fail_msg || JSON.stringify(t);
                            appendLog(`[Task ${taskId.slice(-4)}] CRITICAL ERROR: ${errorObj}`);
                            updateJobState(taskId, {
                                status: 'FAILED',
                                errorDetails: String(errorObj)
                            });
                            clearInterval(interval);
                        }
                    }
                }
            } catch (e) {}
        }, 5000);
    };''',
    content,
    flags=re.DOTALL
)

# Voice Model Dropdown replacement & Generate Button logic
new_voice_ui = '''                                <div className="space-y-2 pt-2">
                                    <Label className="font-bold text-gray-400 font-mono text-xs uppercase">Voice Models (Multi-Select)</Label>
                                    <div className="h-40 overflow-y-auto bg-[#0a0a0a] border border-teal-900/50 rounded-md p-2 space-y-1 scrollbar-thin scrollbar-thumb-teal-900/50">
                                        {voices.map(v => (
                                            <div 
                                                key={v.voice_id}
                                                onClick={() => {
                                                    if (selectedVoiceIds.includes(v.voice_id)) {
                                                        if (selectedVoiceIds.length > 1) {
                                                            setSelectedVoiceIds(prev => prev.filter(id => id !== v.voice_id));
                                                        }
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
                        </div>'''

content = re.sub(
    r'                                <div className="space-y-2 pt-2">.*?\[ GENERATE_VIDEO \]"}.*?</Button>\n                    </div>',
    new_voice_ui + '\n                    </div>',
    content,
    flags=re.DOTALL
)

# Replace Column 2 Logic (Grid Matrix)
content = re.sub(
    r'                        {loading && \(.*?                        {!loading && !finalVideoUrl && \(',
    '''                        {loading && (
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
                                    <Button onClick={() => setBatchJobs([])} variant="outline" className="border-teal-500/50 text-teal-400 hover:text-white font-mono text-xs hover:bg-teal-900 h-8">
                                        [ RESET_WORKSPACE ]
                                    </Button>
                                </div>
                            
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                    {batchJobs.map((job) => {
                                        const av = avatars.find(a => a.avatar_id === job.avatarId);
                                        const vc = voices.find(v => v.voice_id === job.voiceId);
                                        const avName = av?.avatar_name || job.avatarId;
                                        const vcName = vc?.voice_name || job.voiceId;
                                        
                                        return (
                                            <div key={job.taskId} className={`bg-[#0a0a0a] overflow-hidden rounded-xl border flex flex-col group relative transition-colors ${job.status === 'SUCCESS' ? 'border-teal-500/50' : job.status === 'FAILED' ? 'border-red-900' : 'border-gray-800'}`}>
                                                <div className="bg-[#111] border-b border-gray-800 px-3 py-2 flex justify-between items-center z-10">
                                                    <div className="flex flex-col">
                                                        <span className="text-teal-400 font-bold font-mono text-[10px] truncate w-32">{avName}</span>
                                                        <span className="text-gray-500 font-mono text-[9px] uppercase tracking-wider truncate w-32">{vcName}</span>
                                                    </div>
                                                    <div className="font-mono text-[9px] uppercase tracking-widest px-2 py-1 rounded bg-[#0a0a0a] border border-gray-800 flex items-center gap-2">
                                                        {job.status === 'PROCESSING' && <><div className="w-1.5 h-1.5 bg-yellow-500 rounded-full animate-pulse"></div><span className="text-yellow-500">Processing</span></>}
                                                        {job.status === 'SUCCESS' && <><div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div><span className="text-green-400">Success</span></>}
                                                        {job.status === 'FAILED' && <><div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div><span className="text-red-500">Failed</span></>}
                                                    </div>
                                                </div>
                                                
                                                <div className="relative aspect-[9/16] bg-black flex items-center justify-center overflow-hidden">
                                                    {job.status === 'SUCCESS' && job.videoUrl ? (
                                                        <video src={job.videoUrl} controls className="w-full h-full object-cover shadow-2xl" />
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

                        {!loading && batchJobs.length === 0 && (''',
    content,
    flags=re.DOTALL
)

# Fix Avatar grid select border to use array includes
content = content.replace(
    'onClick={() => setSelectedAvatarId(avatar.avatar_id)}',
    '''onClick={() => {
                                                    if (selectedAvatarIds.includes(avatar.avatar_id)) {
                                                        setSelectedAvatarIds(prev => prev.filter(id => id !== avatar.avatar_id));
                                                    } else {
                                                        setSelectedAvatarIds(prev => [...prev, avatar.avatar_id]);
                                                    }
                                                }}'''
)
content = content.replace(
    "className={`group relative rounded-xl overflow-hidden cursor-pointer transition-all border-2 ${selectedAvatarId === avatar.avatar_id ? 'border-teal-500 shadow-[0_0_15px_rgba(20,184,166,0.5)]' : 'border-transparent hover:border-gray-600'}`}",
    "className={`group relative rounded-xl overflow-hidden cursor-pointer transition-all border-2 ${selectedAvatarIds.includes(avatar.avatar_id) ? 'border-teal-500 shadow-[0_0_15px_rgba(20,184,166,0.5)]' : 'border-transparent hover:border-gray-600'}`}"
)

# Update models online count safely to only show avatars length
content = content.replace(
    '<span className="text-xs text-teal-500 font-mono">{filteredAvatars.length} Models Online</span>',
    '''<div className="flex items-center gap-4">
                                        <span className="text-xs text-teal-500 font-mono">{selectedAvatarIds.length} Actor(s) Selected</span>
                                        <span className="text-xs text-gray-500 font-mono px-2 border-l border-gray-800">{filteredAvatars.length} Models Array</span>
                                    </div>'''
)

with open("src/app/symphony/page.tsx", "w") as f:
    f.write(content)

