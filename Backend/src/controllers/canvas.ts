import { Request, Response } from 'express';
import { AuthRequest } from '../types/express';
import prisma from '../prisma/client';
import { systemPrompt } from '../prompts/system';

const agentBaseUrl = process.env.AGENT_BASE_URL;


const agentEndpoints = [
    {
        key: 1,
        url: '/process1',
        description: 'h'
    }
]

export class chatController {
    static async processState(req: AuthRequest, res: Response): Promise<Response> {
        try {
            const requestBody = req.body;

            if (!requestBody || typeof requestBody !== 'object') {
                return res.status(400).json({ error: 'Invalid JSON body provided' });
            }

            if (!agentBaseUrl) {
                return res.status(500).json({ error: 'Agent Base URL not configured' });
            }

            let body = {
                prompt: systemPrompt + requestBody,
            }

            const response = await fetch(agentEndpoints[0].url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(body),
            });

            if (!response.ok) {
                return res.status(response.status).json({ error: `Agent error: ${response.statusText}` });
            }

            const responseData = await response.json();
            return res.status(200).json(responseData);
        } catch (error) {
            console.error('Error processing state:', error);
            return res.status(500).json({ error: 'Internal server error' });
        }
    }
}