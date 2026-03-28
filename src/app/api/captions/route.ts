import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const srtUrl = searchParams.get('url');

    if (!srtUrl) {
        return new NextResponse('Missing SRT URL payload', { status: 400 });
    }

    try {
        const response = await fetch(srtUrl);
        if (!response.ok) {
            throw new Error(`Failed to map remote subtitle payload: ${response.statusText}`);
        }

        const srtText = await response.text();
        
        // Convert the raw SRT to valid stringified WebVTT
        // WEBVTT requires dot instead of comma for milliseconds: 00:00:00,000 -> 00:00:00.000
        let vttText = 'WEBVTT\n\n' + srtText.replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, '$1.$2');

        return new NextResponse(vttText, {
            status: 200,
            headers: {
                'Content-Type': 'text/vtt; charset=utf-8',
                'Access-Control-Allow-Origin': '*',
                'Cache-Control': 'public, max-age=86400'
            }
        });
    } catch (error: any) {
        return new NextResponse(`Error natively translating captions: ${error.message}`, { status: 500 });
    }
}
