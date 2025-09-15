'use server';
import { config } from 'dotenv';
config();

import '@/ai/flows/personalized-book-recommendations.ts';
import '@/ai/flows/generate-book-description.ts';
