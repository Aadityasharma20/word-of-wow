import OpenAI from 'openai';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || '',
});

if (!process.env.OPENAI_API_KEY) {
    console.warn('[OPENAI] WARNING: OPENAI_API_KEY not set. AI scoring will fail.');
}

export { openai };

/**
 * Generate an embedding for text using text-embedding-3-small (1536 dimensions).
 */
export async function getEmbedding(text: string): Promise<number[]> {
    const truncated = text.slice(0, 8000); // Stay within token limits
    const response = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: truncated,
    });
    return response.data[0].embedding;
}

/**
 * Score content using GPT-4o-mini with structured JSON output.
 */
export async function chatCompletion(
    systemPrompt: string,
    userPrompt: string,
): Promise<Record<string, unknown>> {
    const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        response_format: { type: 'json_object' },
        messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 100,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
        throw new Error('Empty response from OpenAI');
    }
    return JSON.parse(content);
}
