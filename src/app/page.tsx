"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RefreshCw } from "lucide-react";
import { META_PLACEMENTS } from "@/data/placements.config";

export default function Home() {
    const [jobId, setJobId] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [uploadingImage, setUploadingImage] = useState(false);
    const [results, setResults] = useState<any[]>([]);

    // Security
    const [accessCode, setAccessCode] = useState("");

    // Core Context State
    const [campaignGoal, setCampaignGoal] = useState("");
    const [campaignVertical, setCampaignVertical] = useState("");
    const [productSummary, setProductSummary] = useState("");
    const [targetAudience, setTargetAudience] = useState("");

    // Arrays
    const [constraints, setConstraints] = useState("");
    const [compliance, setCompliance] = useState("");
    const [imageUrls, setImageUrls] = useState("");

    // Seeds & Copies
    const [seedHeadline, setSeedHeadline] = useState("");
    const [seedBody, setSeedBody] = useState("");
    const [useSeedsAsInspiration, setUseSeedsAsInspiration] = useState(true);
    const [imageText, setImageText] = useState("");

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        const file = e.target.files[0];

        setUploadingImage(true);
        const formData = new FormData();
        formData.append("file", file);

        try {
            const res = await fetch("/api/upload", {
                method: "POST",
                headers: { "x-access-code": accessCode },
                body: formData,
            });
            const data = await res.json();
            if (res.ok && data.url) {
                // Append the URL to the existing comma/newline separated list
                setImageUrls(prev => prev.trim() ? prev + "\n" + data.url : data.url);
            } else {
                alert("Upload failed: " + JSON.stringify(data));
            }
        } catch (error) {
            alert("Error uploading image");
        } finally {
            setUploadingImage(false);
            e.target.value = ""; // Clear input so they can upload the same file again if they want
        }
    };

    // Placements
    const [selectedPlacements, setSelectedPlacements] = useState<string[]>(["meta_feed_1_1"]);

    const handleGenerate = async () => {
        setLoading(true);
        setJobId(null);
        setResults([]);

        const target_placements = selectedPlacements.map(id => {
            const spec = META_PLACEMENTS.find(p => p.id === id);
            return spec ? {
                id: spec.id,
                platform: spec.platform,
                placement: spec.placement,
                aspect_ratio: spec.aspect_ratio,
                format_type: spec.format_type
            } : null;
        }).filter(Boolean);

        const payload = {
            project_context: {
                campaign_goal: campaignGoal,
                campaign_vertical: campaignVertical || undefined,
                product_service_summary: productSummary,
                target_audience: targetAudience,
                user_constraints: constraints.split("\n").filter(c => c.trim() !== ""),
                compliance_guidelines: compliance.split("\n").filter(c => c.trim() !== ""),
                reference_image_urls: imageUrls.split("\n").filter(c => c.trim() !== ""),
                seed_headline: seedHeadline || undefined,
                seed_body_copy: seedBody || undefined,
            },
            config: {
                target_placements: target_placements,
                use_seeds_as_inspiration: useSeedsAsInspiration,
                desired_output_type: "static_image_with_text",
                style_template: "professional_modern",
                image_copy: imageText ? { text: imageText, style_prompt: "bold sans-serif font" } : undefined
            }
        };

        try {
            // We will send this to our local Next.js API Route to securely attach the API Key!
            const res = await fetch("/api/generate", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-access-code": accessCode
                },
                body: JSON.stringify(payload),
            });

            const data = await res.json();
            if (data.job_id) {
                setJobId(data.job_id);
                pollResults(data.job_id);
            } else {
                alert("Failed to start job: " + JSON.stringify(data));
                setLoading(false);
            }
        } catch (e) {
            alert("Error submitting job.");
            setLoading(false);
        }
    };

    const handleRegenerateSingle = async (placementId: string) => {
        if (!placementId) return;
        setLoading(true);
        setJobId(null);
        setResults([]);

        const spec = META_PLACEMENTS.find(p => p.id === placementId);
        const target_placements = spec ? [{
            id: spec.id,
            platform: spec.platform,
            placement: spec.placement,
            aspect_ratio: spec.aspect_ratio,
            format_type: spec.format_type
        }] : [];

        const payload = {
            project_context: {
                campaign_goal: campaignGoal,
                campaign_vertical: campaignVertical || undefined,
                product_service_summary: productSummary,
                target_audience: targetAudience,
                user_constraints: constraints.split("\n").filter(c => c.trim() !== ""),
                compliance_guidelines: compliance.split("\n").filter(c => c.trim() !== ""),
                reference_image_urls: imageUrls.split("\n").filter(c => c.trim() !== ""),
                seed_headline: seedHeadline || undefined,
                seed_body_copy: seedBody || undefined,
            },
            config: {
                target_placements: target_placements,
                use_seeds_as_inspiration: useSeedsAsInspiration,
                desired_output_type: "static_image_with_text",
                style_template: "professional_modern",
                image_copy: imageText ? { text: imageText, style_prompt: "bold sans-serif font" } : undefined
            }
        };

        try {
            const res = await fetch("/api/generate", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-access-code": accessCode
                },
                body: JSON.stringify(payload),
            });

            const data = await res.json();
            if (data.job_id) {
                setJobId(data.job_id);
                pollResults(data.job_id);
            } else {
                alert("Failed to start single job: " + JSON.stringify(data));
                setLoading(false);
            }
        } catch (e) {
            alert("Error submitting single job.");
            setLoading(false);
        }
    };

    const pollResults = async (id: string) => {
        const interval = setInterval(async () => {
            try {
                const res = await fetch(`/api/generate?job_id=${id}`, {
                    headers: { "x-access-code": accessCode }
                });
                if (res.status === 200) {
                    const data = await res.json();
                    setResults(data.ads_generated);
                    setLoading(false);
                    clearInterval(interval);
                } else if (res.status !== 404) {
                    // If it's a 400 or 500
                    const err = await res.json();
                    alert("Job Failed: " + JSON.stringify(err));
                    setLoading(false);
                    clearInterval(interval);
                }
            } catch (e) {
                // Keep polling
            }
        }, 5000);
    };

    return (
        <div className="min-h-screen bg-gray-50 p-8 font-sans">
            <div className="max-w-5xl mx-auto space-y-8">
                <div>
                    <h1 className="text-4xl font-black tracking-tight text-gray-900">NMG Ad Gen</h1>
                    <p className="text-gray-500 mt-2">Omni-Channel Generative Ad Engine</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

                    {/* LEFT COLUMN: Input Form */}
                    <div className="space-y-6">
                        <Card className="border-red-200 shadow-sm">
                            <CardHeader className="bg-red-50 text-red-900 rounded-t-lg pb-4 border-b border-red-100">
                                <CardTitle className="text-lg">Security Clearance</CardTitle>
                            </CardHeader>
                            <CardContent className="pt-4">
                                <div className="space-y-2">
                                    <Label className="font-bold text-gray-700">Team Access Code</Label>
                                    <Input
                                        type="password"
                                        placeholder="Enter the master access code to generate..."
                                        value={accessCode}
                                        onChange={e => setAccessCode(e.target.value)}
                                        className="border-red-200 focus:ring-red-500"
                                    />
                                    <p className="text-xs text-gray-500">Required. Unauthorized generations will be rejected.</p>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader><CardTitle>1. Campaign Context</CardTitle></CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2"><Label>Campaign Goal</Label><Input value={campaignGoal} onChange={e => setCampaignGoal(e.target.value)} /></div>
                                <div className="space-y-2">
                                    <Label>Campaign Vertical</Label>
                                    <select
                                        value={campaignVertical}
                                        onChange={e => setCampaignVertical(e.target.value)}
                                        className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                                    >
                                        <option value="">General / Global Rules</option>
                                        <option value="auto_insurance">Auto Insurance</option>
                                        <option value="weight_loss">Weight Loss</option>
                                    </select>
                                </div>
                                <div className="space-y-2"><Label>Product Summary</Label><Input value={productSummary} onChange={e => setProductSummary(e.target.value)} /></div>
                                <div className="space-y-2"><Label>Target Audience</Label><Input value={targetAudience} onChange={e => setTargetAudience(e.target.value)} /></div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader><CardTitle>2. Advanced Constraints</CardTitle></CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label>General Rules (One per line)</Label>
                                    <Textarea value={constraints} onChange={e => setConstraints(e.target.value)} rows={3} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Compliance Guidelines (Zero Tolerance)</Label>
                                    <Textarea value={compliance} onChange={e => setCompliance(e.target.value)} rows={3} />
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader><CardTitle>3. Assets & Seeds</CardTitle></CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Image-to-Image Seeds (URLs)</Label>
                                    <Textarea value={imageUrls} onChange={e => setImageUrls(e.target.value)} rows={3} placeholder="Paste public image URLs here..." />
                                </div>
                                <div className="space-y-2 p-4 bg-gray-100 rounded-lg border border-dashed border-gray-300">
                                    <Label className="block text-sm font-semibold mb-2 text-gray-700">Upload Local File (Auto-hosted)</Label>
                                    <Input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleImageUpload}
                                        disabled={uploadingImage}
                                        className="bg-white"
                                    />
                                    {uploadingImage && <p className="text-sm font-semibold text-indigo-500 mt-2">Uploading to Cloud Storage...</p>}
                                </div>
                                <div className="space-y-2">
                                    <Label>Exact Image Text Overlay</Label>
                                    <Input value={imageText} onChange={e => setImageText(e.target.value)} />
                                </div>
                                <div className="grid grid-cols-2 gap-4 pt-2">
                                    <div className="space-y-2"><Label>Seed Headline</Label><Input value={seedHeadline} placeholder="Leave blank to generate..." onChange={e => setSeedHeadline(e.target.value)} /></div>
                                    <div className="space-y-2"><Label>Seed Body</Label><Input value={seedBody} placeholder="Leave blank to generate..." onChange={e => setSeedBody(e.target.value)} /></div>
                                </div>
                                <div className="flex items-center space-x-2 pt-2">
                                    <Switch checked={useSeedsAsInspiration} onCheckedChange={setUseSeedsAsInspiration} />
                                    <Label>Use text seeds merely as inspiration (Rewrite)</Label>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader><CardTitle>4. Target Placements</CardTitle></CardHeader>
                            <CardContent className="space-y-4">
                                {META_PLACEMENTS.map(placement => (
                                    <div key={placement.id} className="flex items-start space-x-3 p-2 hover:bg-gray-100 rounded-md transition-colors">
                                        <Checkbox
                                            id={placement.id}
                                            checked={selectedPlacements.includes(placement.id)}
                                            onCheckedChange={(checked) => {
                                                if (checked) {
                                                    setSelectedPlacements([...selectedPlacements, placement.id]);
                                                } else {
                                                    setSelectedPlacements(selectedPlacements.filter(id => id !== placement.id));
                                                }
                                            }}
                                        />
                                        <div className="space-y-1 leading-none">
                                            <Label htmlFor={placement.id} className="font-bold cursor-pointer">
                                                {placement.platform} - {placement.placement} ({placement.aspect_ratio})
                                            </Label>
                                            <p className="text-xs text-gray-500">{placement.description}</p>
                                        </div>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>

                        <Button onClick={handleGenerate} disabled={loading} className="w-full h-12 text-lg font-bold">
                            {loading ? "Generating Payload..." : "Generate Creatives"}
                        </Button>
                    </div>

                    {/* RIGHT COLUMN: Output/Results */}
                    <div className="space-y-6">
                        <Card className="h-full bg-gray-900 border-none text-white">
                            <CardHeader><CardTitle>Live Preview</CardTitle></CardHeader>
                            <CardContent>
                                {loading && (
                                    <div className="flex flex-col items-center justify-center p-12 text-center space-y-4">
                                        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                                        <p className="text-gray-400 font-mono">Job {jobId} Queued...</p>
                                        <p className="text-xs text-indigo-400">Generative AI is crafting your visuals.</p>
                                    </div>
                                )}

                                {!loading && results.length === 0 && (
                                    <div className="text-center text-gray-500 py-12">
                                        Ready to generate. Configure parameters on the left.
                                    </div>
                                )}

                                <div className="space-y-8">
                                    {results.map((ad, idx) => (
                                        <div key={idx} className="bg-gray-800 p-4 rounded-xl border border-gray-700">
                                            <div className="flex justify-between items-center mb-4">
                                                <div className="flex items-center space-x-3">
                                                    <span className="bg-indigo-600 px-3 py-1 rounded text-xs font-bold uppercase tracking-wider shadow-sm">
                                                        {ad.placement_metadata?.platform} {ad.placement_metadata?.placement || ad.placement_metadata?.form}
                                                    </span>
                                                    {ad.placement_metadata?.id && (
                                                        <button
                                                            onClick={() => handleRegenerateSingle(ad.placement_metadata.id)}
                                                            className="p-1.5 bg-gray-700 hover:bg-gray-600 border border-gray-600 rounded text-gray-300 hover:text-white transition-all flex items-center justify-center cursor-pointer shadow-sm"
                                                            title="Re-run generation for this placement only"
                                                        >
                                                            <RefreshCw size={14} />
                                                        </button>
                                                    )}
                                                </div>
                                                <span className="text-gray-400 text-xs font-mono bg-gray-900 px-2 py-1 rounded">{ad.placement_metadata?.aspect_ratio}</span>
                                            </div>

                                            <img src={ad.media_url} className="w-full rounded-lg mb-4 object-cover" />

                                            <div className="space-y-2">
                                                <h3 className="font-bold text-lg leading-tight">{ad.headline}</h3>
                                                <p className="text-gray-300 text-sm leading-relaxed">{ad.body_copy}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                </div>
            </div>
        </div>
    );
}
