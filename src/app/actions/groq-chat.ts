'use server';

import Groq from 'groq-sdk';

// Initialize the Groq client. It will automatically pick up the GROQ_API_KEY from the environment variables.
const groq = new Groq();

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
      // Use a more powerful model by default, falling back to the previous one.
      model: input.model || 'llama-3.3-70b-versatile',
    });

    const content = chatCompletion.choices[0]?.message?.content || '';
    return { content };
  } catch (error) {
    console.error('Error calling Groq API:', error);
    throw new Error('Failed to get a response from the AI model.');
  }
}
