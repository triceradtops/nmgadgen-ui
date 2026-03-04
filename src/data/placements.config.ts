export type PlacementSpec = {
    id: string;
    platform: string;
    placement: string;
    aspect_ratio: string;
    format_type: "static_image" | "video_placeholder";
    description: string;
    recommended_size: string;
    text_limits: {
        primary_text: number | null;
        headline: number | null;
        description: number | null;
    };
    safe_zone?: string;
    best_practices: string[];
};

export const META_PLACEMENTS: PlacementSpec[] = [
    {
        id: "meta_feed_1_1",
        platform: "Meta",
        placement: "Feed & Instagram Feed (Square)",
        aspect_ratio: "1:1",
        format_type: "static_image",
        description: "The classic square format for feed ads. Safe bet for maximum compatibility.",
        recommended_size: "1080x1080",
        text_limits: {
            primary_text: 125,
            headline: 40,
            description: 30,
        },
        best_practices: ["Use 1440x1440 for retina displays", "Keep image text under 20% of the area"]
    },
    {
        id: "meta_feed_4_5",
        platform: "Meta",
        placement: "Feed & Instagram Feed (Vertical)",
        aspect_ratio: "4:5",
        format_type: "static_image",
        description: "The 4:5 vertical format spans more screen real-estate on mobile and increases CTR.",
        recommended_size: "1080x1350",
        text_limits: {
            primary_text: 125,
            headline: 40,
            description: 30,
        },
        best_practices: ["Mobile viewing optimization is highest here", "No cropping or letterboxing on feeds"]
    },
    {
        id: "meta_stories",
        platform: "Meta",
        placement: "Stories",
        aspect_ratio: "9:16",
        format_type: "static_image",
        description: "Full-screen vertical format. Static images display for 5 seconds.",
        recommended_size: "1080x1920",
        text_limits: {
            primary_text: null, // Usually text is baked in or native to stories
            headline: null,
            description: null,
        },
        safe_zone: "Center 1080x1420 (Avoid top and bottom 250px)",
        best_practices: ["Avoid top and bottom 250px so UI elements don't overlap", "Front-load message in first 3 seconds"]
    },
    {
        id: "meta_reels",
        platform: "Meta",
        placement: "Reels",
        aspect_ratio: "9:16",
        format_type: "video_placeholder",
        description: "Full-screen vertical video placeholder. UI overlaps significantly at the bottom.",
        recommended_size: "1080x1920",
        text_limits: {
            primary_text: null,
            headline: null,
            description: null,
        },
        safe_zone: "Keep 35% bottom clear, 14% top clear",
        best_practices: ["Keep 35% bottom clear for captions/UI", "Sound-on viewing optimization"]
    },
    {
        id: "meta_messenger",
        platform: "Meta",
        placement: "Messenger",
        aspect_ratio: "1.91:1",
        format_type: "static_image",
        description: "Appears in users' conversation list. Very small display.",
        recommended_size: "1200x628",
        text_limits: {
            primary_text: null,
            headline: 20, // Strict 20 char limit
            description: null, // No description field
        },
        best_practices: ["Bold, simple imagery due to small size", "Bright colors to stand out"]
    },
    {
        id: "meta_marketplace",
        platform: "Meta",
        placement: "Marketplace",
        aspect_ratio: "1:1",
        format_type: "static_image",
        description: "Appears alongside organic listings. High purchase intent context.",
        recommended_size: "1080x1080",
        text_limits: {
            primary_text: 125,
            headline: 40,
            description: 30,
        },
        best_practices: ["Product-focused imagery", "Show pricing when relevant"]
    },
    {
        id: "meta_right_column",
        platform: "Meta",
        placement: "Right Column (Desktop)",
        aspect_ratio: "1:1",
        format_type: "static_image",
        description: "Desktop-exclusive placement on the right side of the feed.",
        recommended_size: "1080x1080",
        text_limits: {
            primary_text: null,
            headline: 40,
            description: null,
        },
        best_practices: ["Headline only", "Design for extreme clarity at small sizes"]
    },
    {
        id: "meta_search_results",
        platform: "Meta",
        placement: "Search Results",
        aspect_ratio: "1:1",
        format_type: "static_image",
        description: "Appears in Facebook search results.",
        recommended_size: "1080x1080",
        text_limits: {
            primary_text: 125,
            headline: 40,
            description: 30,
        },
        best_practices: ["Include relevant keywords in the creative"]
    }
];
