import {genkit} from 'genkit';

// Genkit initialization without plugins.
// We will use custom flows to interact with AI services like Groq.
export const ai = genkit({
  // No default model or plugins configured here.
  // Flows will define their own logic for calling AI models.
});
