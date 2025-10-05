'use server';
/**
 * @fileOverview A custom Genkit flow to interact with the Groq API.
 *
 * - groqChat - A function that sends a chat completion request to Groq.
 * - GroqChatInput - The input type for the groqChat function.
 * - GroqChatOutput - The return type for the groqChat function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import Groq from 'groq-sdk';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const GroqChatInputSchema = z.object({
  prompt: z.string().describe('The user prompt for the chat model.'),
  model: z.string().optional().default('llama3-8b-8192').describe('The Groq model to use.'),
});
export type GroqChatInput = z.infer<typeof GroqChatInputSchema>;

const GroqChatOutputSchema = z.object({
  content: z.string().describe('The response from the Groq model.'),
});
export type GroqChatOutput = z.infer<typeof GroqChatOutputSchema>;


export async function groqChat(input: GroqChatInput): Promise<GroqChatOutput> {
  return groqChatFlow(input);
}


const groqChatFlow = ai.defineFlow(
  {
    name: 'groqChatFlow',
    inputSchema: GroqChatInputSchema,
    outputSchema: GroqChatOutputSchema,
  },
  async (input) => {
    if (!process.env.GROQ_API_KEY) {
      throw new Error('GROQ_API_KEY is not set in the environment variables.');
    }
    
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: 'user',
          content: input.prompt,
        },
      ],
      model: input.model || 'llama3-8b-8192',
    });
    
    const content = chatCompletion.choices[0]?.message?.content || '';

    return { content };
  }
);
