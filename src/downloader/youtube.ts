import getVideoId from 'get-video-id';
import { requestUrl } from 'obsidian';
import { Ok, type Result } from 'ts-results-es';
import type { ErrCtx } from '../utils/result';
import type { DownloadedContent } from './content';

export async function download_youtube(url: string): Promise<Result<DownloadedContent, ErrCtx>> {
    console.warn('downloading video', url);
    const { id } = getVideoId(url);

    const info = await getVideoInfo(id!);
    console.warn(info);

    return Ok({ recipeName: info.title, recipeContent: info.description, recipe: null });
}

async function getVideoInfo(videoId: string) {
    const res = await requestUrl({
        url: 'https://www.youtube.com/youtubei/v1/player?prettyPrint=false',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-YouTube-Client-Name': '1',
            'X-YouTube-Client-Version': '2.20240101',
        },
        body: JSON.stringify({
            videoId,
            context: {
                client: {
                    clientName: 'WEB',
                    clientVersion: '2.20240101',
                },
            },
        }),
    });

    const data = res.json;
    console.info(data);
    return {
        title: data.videoDetails.title,
        description: data.videoDetails.shortDescription,
        author: data.videoDetails.author,
        lengthSeconds: data.videoDetails.lengthSeconds,
    };
}
