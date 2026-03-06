import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { RefreshCw } from "lucide-react";

interface AdResult {
    headline: string;
    body_copy: string;
    media_url: string;
    placement_metadata?: {
        id: string;
        platform: string;
        placement: string;
        aspect_ratio: string;
        format_type: string;
    };
}

interface AdGroupViewProps {
    results: AdResult[];
    onRegenerateSingle: (placementId: string) => void;
}

export function AdGroupView({ results, onRegenerateSingle }: AdGroupViewProps) {
    // Group Results by Aspect Ratio
    const groupedResults = results.reduce((acc, ad) => {
        const ratio = ad.placement_metadata?.aspect_ratio || "Unknown";
        if (!acc[ratio]) {
            acc[ratio] = [];
        }
        acc[ratio].push(ad);
        return acc;
    }, {} as Record<string, AdResult[]>);

    // Map Aspect Ratios to human-friendly layout names
    const getRatioName = (ratio: string) => {
        switch (ratio) {
            case "1:1": return "Square (Feed, Marketplace, Search)";
            case "4:5": return "Vertical Feed";
            case "9:16": return "Full Screen (Stories, Reels)";
            case "1.91:1": return "Horizontal (Messenger, Headers)";
            default: return `Custom (${ratio})`;
        }
    };

    // Layout configuration per aspect ratio
    const getContainerWidth = (ratio: string) => {
        switch (ratio) {
            case "1:1": return "max-w-md";
            case "4:5": return "max-w-sm";
            case "9:16": return "max-w-[300px]";
            case "1.91:1": return "max-w-xl";
            default: return "max-w-md";
        }
    };

    return (
        <div className="space-y-12 animate-in fade-in duration-500">
            {Object.entries(groupedResults).map(([ratio, ads]) => {
                // All ads in a group technically share the same generated image geometry. 
                // We display the media from the first ad in the group to anchor the visuals.
                const anchorVisual = ads[0].media_url;

                return (
                    <div key={ratio} className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden shadow-2xl">
                        {/* Group Header */}
                        <div className="bg-gray-800 px-6 py-4 border-b border-gray-700 flex items-center justify-between">
                            <h2 className="text-xl font-black text-white flex items-center gap-3">
                                <span className="text-indigo-400 font-mono text-sm tracking-widest uppercase bg-indigo-400/10 px-3 py-1 rounded-full">
                                    {ratio}
                                </span>
                                {getRatioName(ratio)}
                            </h2>
                            <span className="text-gray-400 text-sm font-medium">
                                {ads.length} Placement{ads.length !== 1 ? 's' : ''} Generated
                            </span>
                        </div>

                        <div className="p-6 md:p-10 flex flex-col xl:flex-row gap-10 items-start">

                            {/* Left Column: Core Visual Asset */}
                            <div className={`w-full ${getContainerWidth(ratio)} shrink-0 mx-auto xl:mx-0 relative`}>
                                <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-xl blur opacity-25"></div>
                                <div className="relative rounded-xl overflow-hidden border border-gray-700 bg-gray-950 shadow-inner">
                                    <div className="bg-gray-800 text-xs text-center py-2 text-gray-400 font-mono tracking-wide border-b border-gray-700 uppercase">
                                        Rendered Visual
                                    </div>
                                    <img
                                        src={anchorVisual}
                                        alt="Generated Ad Creative"
                                        className="w-full h-auto object-cover max-h-[80vh] transition-transform duration-700 hover:scale-105"
                                        loading="lazy"
                                    />
                                </div>
                            </div>

                            {/* Right Column: Tailored Text Constraints List */}
                            <div className="flex-1 w-full space-y-6">
                                <h3 className="text-gray-400 uppercase tracking-wider text-sm font-bold border-b border-gray-800 pb-2">
                                    Tailored Copy Variations
                                </h3>

                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-1 gap-6">
                                    {ads.map((ad, idx) => (
                                        <Card key={idx} className="bg-gray-800/50 border-gray-700 hover:bg-gray-800/80 transition-colors">
                                            <CardHeader className="pb-3 pt-4 px-5">
                                                <div className="flex justify-between items-start gap-4">
                                                    <div>
                                                        <CardTitle className="text-sm font-bold text-gray-200">
                                                            {ad.placement_metadata?.platform} {ad.placement_metadata?.placement}
                                                        </CardTitle>
                                                        {ad.placement_metadata?.format_type && (
                                                            <span className="text-xs text-gray-500 mt-1 block">
                                                                Format: {ad.placement_metadata.format_type.replace(/_/g, " ")}
                                                            </span>
                                                        )}
                                                    </div>

                                                    {ad.placement_metadata?.id && (
                                                        <button
                                                            onClick={() => onRegenerateSingle(ad.placement_metadata!.id)}
                                                            className="p-1.5 bg-gray-700 hover:bg-indigo-600 border border-gray-600 hover:border-indigo-500 rounded text-gray-300 hover:text-white transition-all flex justify-center shrink-0 items-center shadow-sm"
                                                            title="Re-run text/image generation for this placement only"
                                                        >
                                                            <RefreshCw size={14} />
                                                        </button>
                                                    )}
                                                </div>
                                            </CardHeader>

                                            <CardContent className="px-5 pb-5 space-y-3">
                                                {ad.headline && (
                                                    <div className="space-y-1">
                                                        <span className="text-[10px] uppercase font-bold text-indigo-400 tracking-wider">Headline</span>
                                                        <p className="font-semibold text-gray-100 leading-tight">
                                                            {ad.headline}
                                                        </p>
                                                    </div>
                                                )}
                                                {ad.body_copy && (
                                                    <div className="space-y-1 pt-1 border-t border-gray-700/50">
                                                        <span className="text-[10px] uppercase font-bold text-indigo-400 tracking-wider">Body Copy</span>
                                                        <p className="text-gray-400 text-sm leading-relaxed whitespace-pre-wrap">
                                                            {ad.body_copy}
                                                        </p>
                                                    </div>
                                                )}
                                                {!ad.headline && !ad.body_copy && (
                                                    <div className="text-center py-4 text-gray-600 italic text-sm">
                                                        No custom text generated for this placement.
                                                    </div>
                                                )}
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            </div>

                        </div>
                    </div>
                );
            })}
        </div>
    );
}
