"use server";
/**
 * @fileOverview AI flow to generate a book description.
 *
 * - generateBookDescription - A function that generates a book description based on its title and author.
 * - GenerateBookDescriptionInput - The input type for the generateBookDescription function.
 * - GenerateBookDescriptionOutput - The return type for the generateBookDescription function.
 */

import { ai } from "@/ai/genkit";
import { z } from "genkit";

const GenerateBookDescriptionInputSchema = z.object({
  title: z.string().describe("The title of the book."),
  author: z.string().describe("The author of the book."),
});
export type GenerateBookDescriptionInput = z.infer<typeof GenerateBookDescriptionInputSchema>;

const GenerateBookDescriptionOutputSchema = z.object({
  description: z
    .string()
    .describe(
      "A compelling and concise summary of the book, suitable for a library catalog. It should be 2-4 sentences long."
    ),
});
export type GenerateBookDescriptionOutput = z.infer<typeof GenerateBookDescriptionOutputSchema>;


export async function generateBookDescription(
  input: GenerateBookDescriptionInput
): Promise<GenerateBookDescriptionOutput> {
    return generateBookDescriptionFlow(input);
}


const prompt = ai.definePrompt({
    name: 'generateBookDescriptionPrompt',
    input: {schema: GenerateBookDescriptionInputSchema},
    output: {schema: GenerateBookDescriptionOutputSchema},
    prompt: `You are a helpful library assistant. Based on the book title and author, generate a brief, engaging summary (2-4 sentences) for a library catalog.

Book Title: {{{title}}}
Author: {{{author}}}

Generate the description.`,
});


const generateBookDescriptionFlow = ai.defineFlow(
    {
        name: 'generateBookDescriptionFlow',
        inputSchema: GenerateBookDescriptionInputSchema,
        outputSchema: GenerateBookDescriptionOutputSchema,
    },
    async (input) => {
        const { output } = await prompt(input);
        return output!;
    }
);
