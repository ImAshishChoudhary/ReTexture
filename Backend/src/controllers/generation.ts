import { Response } from 'express';
import { AuthRequest } from '../types/express';
import * as fs from 'fs';
import * as path from 'path';
import FormData from 'form-data';

const agentBaseUrl = process.env.AGENT_BASE_URL || 'http://localhost:8000';

export class generationController {
    /**
     * Remove background - proxies to Agent's /remove-bg endpoint
     * Agent uses rembg library to remove background
     * 
     * Input: file (multipart/form-data)
     * Output: { success: true, url: "data:image/png;base64,..." }
     */
    static async removeBackground(req: AuthRequest, res: Response): Promise<Response> {
        console.log('='.repeat(60));
        console.log('[BACKEND DEBUG] removeBackground endpoint called');
        console.log('[BACKEND DEBUG] Timestamp:', new Date().toISOString());
        console.log('='.repeat(60));
        
        try {
            const file = req.file;

            if (!file) {
                console.log('[BACKEND DEBUG] ERROR: No file provided in request');
                return res.status(400).json({ error: 'No image file provided' });
            }

            console.log('[BACKEND DEBUG] File received:');
            console.log('[BACKEND DEBUG] - Original name:', file.originalname);
            console.log('[BACKEND DEBUG] - File path:', file.path);
            console.log('[BACKEND DEBUG] - Mimetype:', file.mimetype);
            console.log('[BACKEND DEBUG] - Size:', file.size, 'bytes');
            
            // Create FormData to upload file to Agent
            console.log('[BACKEND DEBUG] Creating FormData for Agent...');
            const formData = new FormData();
            formData.append('file', fs.createReadStream(file.path), {
                filename: file.originalname,
                contentType: file.mimetype || 'image/png'
            });

            const agentUrl = `${agentBaseUrl}/remove-bg`;
            console.log('[BACKEND DEBUG] Calling Agent at:', agentUrl);
            console.log('[BACKEND DEBUG] Sending POST request...');
            
            const startTime = Date.now();
            const response = await fetch(agentUrl, {
                method: 'POST',
                body: formData.getBuffer(),
                headers: formData.getHeaders()
            });
            const elapsed = Date.now() - startTime;

            console.log('[BACKEND DEBUG] Agent response received in', elapsed, 'ms');
            console.log('[BACKEND DEBUG] - Status:', response.status);
            console.log('[BACKEND DEBUG] - StatusText:', response.statusText);
            console.log('[BACKEND DEBUG] - OK:', response.ok);

            if (!response.ok) {
                const errorText = await response.text();
                console.log('[BACKEND DEBUG] ERROR: Agent call failed');
                console.log('[BACKEND DEBUG] - Error response:', errorText);
                return res.status(response.status).json({ 
                    error: `Background removal failed: ${errorText}` 
                });
            }

            console.log('[BACKEND DEBUG] Parsing Agent JSON response...');
            const result = await response.json() as { 
                success: boolean; 
                image_data: string; 
                format: string 
            };
            
            console.log('[BACKEND DEBUG] Agent response parsed:');
            console.log('[BACKEND DEBUG] - success:', result.success);
            console.log('[BACKEND DEBUG] - has image_data:', !!result.image_data);
            console.log('[BACKEND DEBUG] - image_data length:', result.image_data?.length || 0);
            console.log('[BACKEND DEBUG] - format:', result.format);
            
            const dataUrl = `data:image/png;base64,${result.image_data}`;
            
            console.log('='.repeat(60));
            console.log('[BACKEND DEBUG] removeBackground SUCCESS!');
            console.log('[BACKEND DEBUG] Returning data URL of length:', dataUrl.length);
            console.log('='.repeat(60));
            
            return res.status(200).json({
                success: true,
                filename: 'processed.png',
                path: dataUrl,
                url: dataUrl,
            });

        } catch (error) {
            console.log('='.repeat(60));
            console.log('[BACKEND DEBUG] ERROR in removeBackground:');
            console.log('[BACKEND DEBUG] - Error:', error);
            console.log('='.repeat(60));
            console.error('[RemoveBackground] Error:', error);
            return res.status(500).json({ error: 'Internal server error' });
        }
    }

    /**
     * Generate image variations
     * Flow: Upload file → Remove background → Generate variations via Gemini AI
     * 
     * Input: file + userprompt (optional theme description)
     * Output: { success: true, variations: ["data:image/png;base64,...", ...] }
     */
    static async generateVariation(req: AuthRequest, res: Response): Promise<Response> {
        try {
            const file = req.file;
            const userprompt = req.body?.userprompt || 'product photography';

            if (!file) {
                return res.status(400).json({ error: 'No image file provided' });
            }

            console.log('[Generation] Starting variation generation for:', file.originalname);
            console.log('[Generation] User prompt:', userprompt);

            // Step 1: Remove background using Agent
            console.log('[Generation] Step 1: Removing background...');

            const formData = new FormData();
            formData.append('file', fs.createReadStream(file.path), {
                filename: file.originalname,
                contentType: file.mimetype || 'image/png'
            });

            const removeBgResponse = await fetch(`${agentBaseUrl}/remove-bg`, {
                method: 'POST',
                body: formData.getBuffer(),
                headers: formData.getHeaders()
            });

            if (!removeBgResponse.ok) {
                const errorText = await removeBgResponse.text();
                console.error('[Generation] Background removal failed:', errorText);
                return res.status(removeBgResponse.status).json({ 
                    error: `Background removal failed: ${errorText}` 
                });
            }

            const bgResult = await removeBgResponse.json() as { 
                success: boolean; 
                image_data: string; 
                format: string 
            };
            console.log('[Generation] Background removed successfully');

            // Step 2: Generate variations using Agent's Gemini AI
            console.log('[Generation] Step 2: Generating variations...');
            
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 180000); // 3 min timeout
            
            let variationsResponse;
            try {
                variationsResponse = await fetch(`${agentBaseUrl}/generate/variations`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        image_data: bgResult.image_data,
                        concept: userprompt
                    }),
                    signal: controller.signal,
                });
                
                clearTimeout(timeoutId);
            } catch (fetchError: any) {
                clearTimeout(timeoutId);
                if (fetchError.name === 'AbortError') {
                    return res.status(504).json({ 
                        error: 'Variation generation timed out' 
                    });
                }
                throw fetchError;
            }

            if (!variationsResponse.ok) {
                const errorText = await variationsResponse.text();
                console.error('[Generation] Variation generation failed:', errorText);
                return res.status(variationsResponse.status).json({ 
                    error: `Variation generation failed: ${errorText}` 
                });
            }

            const result = await variationsResponse.json() as { 
                success: boolean;
                variations: string[];
            };
            
            console.log('[BACKEND] Generated', result.variations?.length || 0, 'variations');
            console.log('[BACKEND] Return payload successfully constructed');
            console.log('='.repeat(60));

            const processedDataUrl = `data:image/png;base64,${bgResult.image_data}`;
            
            return res.status(200).json({
                success: true,
                original: {
                    filename: file.originalname,
                    processed: processedDataUrl,
                },
                variations: result.variations?.map(v => `data:image/png;base64,${v}`) || [],
            });

        } catch (error) {
            console.error('[Generation] Error:', error);
            return res.status(500).json({ error: 'Internal server error during generation' });
        }
    }

    /**
     * Upload image and return path
     */
    static async uploadImage(req: AuthRequest, res: Response): Promise<Response> {
        try {
            const file = req.file;

            if (!file) {
                return res.status(400).json({ error: 'No image file provided' });
            }

            const backendBaseUrl = process.env.BACKEND_BASE_URL || 'http://localhost:3002';

            return res.status(200).json({
                success: true,
                path: file.path,
                filename: file.filename,
                url: `${backendBaseUrl}/uploads/original/${file.filename}`,
            });

        } catch (error) {
            console.error('[Upload] Error:', error);
            return res.status(500).json({ error: 'Internal server error' });
        }
    }

    /**
     * Remove background using file path
     */
    static async removeBackgroundByPath(req: AuthRequest, res: Response): Promise<Response> {
        try {
            const { filePath } = req.body;

            if (!filePath) {
                return res.status(400).json({ error: 'No file path provided' });
            }

            const normalizedPath = path.normalize(filePath);
            
            if (!fs.existsSync(normalizedPath)) {
                return res.status(404).json({ error: 'File not found' });
            }

            const formData = new FormData();
            formData.append('file', fs.createReadStream(normalizedPath));

            const response = await fetch(`${agentBaseUrl}/remove-bg`, {
                method: 'POST',
                body: formData.getBuffer(),
                headers: formData.getHeaders()
            });

            if (!response.ok) {
                const errorText = await response.text();
                return res.status(response.status).json({ 
                    error: `Background removal failed: ${errorText}` 
                });
            }

            const result = await response.json() as { 
                success: boolean; 
                image_data: string; 
                format: string 
            };
            
            const dataUrl = `data:image/png;base64,${result.image_data}`;
            
            return res.status(200).json({
                success: true,
                filename: 'processed.png',
                path: dataUrl,
                url: dataUrl,
            });

        } catch (error) {
            console.error('[RemoveBackgroundByPath] Error:', error);
            return res.status(500).json({ error: 'Internal server error' });
        }
    }

    /**
     * Stream variations using Server-Sent Events (SSE)
     * Proxies the stream from the Agent to the Frontend
     */
    static async streamVariations(req: AuthRequest, res: Response): Promise<void> {
        console.log('='.repeat(60));
        console.log('[BACKEND SSE] streamVariations called');
        console.log('='.repeat(60));

        try {
            const { image_data, concept } = req.body;

            if (!image_data) {
                res.status(400).json({ error: 'No image data provided' });
                return;
            }

            // Set headers for SSE
            res.setHeader('Content-Type', 'text/event-stream');
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Connection', 'keep-alive');
            res.setHeader('X-Accel-Buffering', 'no'); // Disable buffering for Nginx if present

            console.log('[BACKEND SSE] Proxying request to Agent...');
            console.log('[BACKEND SSE] Payload concept:', concept || 'product photography');
            console.log('[BACKEND SSE] Payload image_data length:', image_data?.length);
            
            const response = await fetch(`${agentBaseUrl}/generate/variations/stream`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ image_data, concept: concept || 'product photography' })
            });

            console.log('[BACKEND SSE] Agent response status:', response.status);
            console.log('[BACKEND SSE] Agent response ok:', response.ok);

            if (!response.ok) {
                console.error('[BACKEND SSE] Agent responded with error:', response.status);
                res.write(`data: ${JSON.stringify({ type: 'error', message: `Agent Error: ${response.status}` })}\n\n`);
                res.end();
                return;
            }

            // Pipe the stream from Agent to Frontend
            if (!response.body) {
                console.error('[BACKEND SSE] Agent response body is null');
                res.end();
                return;
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                res.write(chunk);
            }

            console.log('[BACKEND SSE] Stream proxy complete');
            res.end();

        } catch (error: any) {
            console.error('[BACKEND SSE] Error:', error);
            if (!res.headersSent) {
                res.status(500).json({ error: 'Internal server error while streaming' });
            } else {
                res.write(`data: ${JSON.stringify({ type: 'error', message: error.message })}\n\n`);
                res.end();
            }
        }
    }
}
