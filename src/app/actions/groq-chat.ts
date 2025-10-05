'use server';

import Groq from 'groq-sdk';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

interface GroqChatInput {
  prompt: string;
  model?: string;
}

interface GroqChatOutput {
  content: string;
}

export async function groqChat(input: GroqChatInput): Promise<GroqChatOutput> {
  if (!process.env.GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY is not set in the environment variables.');
  }

  try {
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
  } catch (error) {
    console.error('Error calling Groq API:', error);
    throw new Error('Failed to get a response from the AI model.');
  }
}
