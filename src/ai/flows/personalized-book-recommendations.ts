'use server';
/**
 * @fileOverview AI-powered personalized book recommendations flow.
 *
 * - getPersonalizedBookRecommendations - A function that retrieves personalized book recommendations for a reader.
 * - PersonalizedBookRecommendationsInput - The input type for the getPersonalizedBookRecommendations function.
 * - PersonalizedBookRecommendationsOutput - The return type for the getPersonalizedBookRecommendations function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const PersonalizedBookRecommendationsInputSchema = z.object({
  readerId: z.string().describe('The ID of the reader.'),
  borrowingHistory: z.array(z.string()).describe('An array of book titles the reader has borrowed.'),
  preferences: z.string().optional().describe('Optional preferences of the reader.'),
});
export type PersonalizedBookRecommendationsInput = z.infer<typeof PersonalizedBookRecommendationsInputSchema>;

const PersonalizedBookRecommendationsOutputSchema = z.object({
  recommendations: z.array(z.string()).describe('An array of recommended book titles.'),
});
export type PersonalizedBookRecommendationsOutput = z.infer<typeof PersonalizedBookRecommendationsOutputSchema>;

export async function getPersonalizedBookRecommendations(input: PersonalizedBookRecommendationsInput): Promise<PersonalizedBookRecommendationsOutput> {
  return personalizedBookRecommendationsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'personalizedBookRecommendationsPrompt',
  input: {schema: PersonalizedBookRecommendationsInputSchema},
  output: {schema: PersonalizedBookRecommendationsOutputSchema},
  prompt: `You are a librarian providing personalized book recommendations.

  Based on the reader's borrowing history and preferences, recommend books they might enjoy.

  Reader ID: {{{readerId}}}
  Borrowing History: {{#each borrowingHistory}}{{{this}}}, {{/each}}
  Preferences: {{{preferences}}}

  Please provide a list of book recommendations.
  `,config: {
    safetySettings: [
      {
        category: 'HARM_CATEGORY_HATE_SPEECH',
        threshold: 'BLOCK_ONLY_HIGH',
      },
      {
        category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
        threshold: 'BLOCK_NONE',
      },
      {
        category: 'HARM_CATEGORY_HARASSMENT',
        threshold: 'BLOCK_MEDIUM_AND_ABOVE',
      },
      {
        category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
        threshold: 'BLOCK_LOW_AND_ABOVE',
      },
    ],
  },
});

const personalizedBookRecommendationsFlow = ai.defineFlow(
  {
    name: 'personalizedBookRecommendationsFlow',
    inputSchema: PersonalizedBookRecommendationsInputSchema,
    outputSchema: PersonalizedBookRecommendationsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
