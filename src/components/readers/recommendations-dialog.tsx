"use client";

import { useState } from "react";
import type { Reader } from "@/lib/types";
import { getPersonalizedBookRecommendations } from "@/ai/flows/personalized-book-recommendations";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Sparkles, Wand2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";

interface RecommendationsDialogProps {
    reader: Reader;
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
}

export function RecommendationsDialog({ reader, isOpen, setIsOpen }: RecommendationsDialogProps) {
    const [preferences, setPreferences] = useState('');
    const [recommendations, setRecommendations] = useState<string[] | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();

    const handleGenerate = async () => {
        setIsLoading(true);
        setRecommendations(null);
        try {
            const result = await getPersonalizedBookRecommendations({
                readerId: reader.id,
                borrowingHistory: reader.borrowingHistory,
                preferences: preferences,
            });
            setRecommendations(result.recommendations);
        } catch (error) {
            console.error(error);
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Failed to generate recommendations. Please try again.',
            });
        }
        setIsLoading(false);
    };

    const handleOpenChange = (open: boolean) => {
        setIsOpen(open);
        if(!open) {
            setRecommendations(null);
            setPreferences('');
        }
    }
    
    return (
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
            <DialogContent className="sm:max-w-[625px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 font-headline text-2xl">
                        <Sparkles className="w-6 h-6 text-accent-foreground" />
                        Book Recommendations for {reader.name}
                    </DialogTitle>
                    <DialogDescription>
                        AI-powered suggestions based on borrowing history and preferences.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
                    <div className="space-y-4">
                        <Card>
                            <CardContent className="pt-6">
                                <h3 className="font-semibold mb-2">Borrowing History</h3>
                                <div className="flex flex-wrap gap-2">
                                {reader.borrowingHistory.length > 0 ? reader.borrowingHistory.map(title => (
                                    <Badge key={title} variant="secondary">{title}</Badge>
                                )) : <p className="text-sm text-muted-foreground">No borrowing history.</p>}
                                </div>
                            </CardContent>
                        </Card>
                         <div className="space-y-2">
                            <Label htmlFor="preferences">Reader's Preferences (Optional)</Label>
                            <Textarea 
                                id="preferences" 
                                placeholder="e.g., enjoys fast-paced thrillers, historical fiction, or books about space exploration..."
                                value={preferences}
                                onChange={(e) => setPreferences(e.target.value)}
                            />
                        </div>
                        <Button onClick={handleGenerate} disabled={isLoading} className="w-full">
                            {isLoading ? (
                                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Please wait...</>
                            ) : (
                                <><Wand2 className="mr-2 h-4 w-4" /> Generate</>
                            )}
                        </Button>
                    </div>

                    <div className="space-y-4">
                        <h3 className="font-semibold text-center md:text-left">Recommendations</h3>
                        <Card className="min-h-[200px] flex items-center justify-center">
                            <CardContent className="pt-6 w-full">
                                {isLoading ? (
                                    <div className="text-center text-muted-foreground">
                                        <Loader2 className="mx-auto h-8 w-8 animate-spin" />
                                        <p className="mt-2">Generating personalized ideas...</p>
                                    </div>
                                ) : recommendations ? (
                                    <ul className="space-y-2 list-disc list-inside">
                                        {recommendations.map((rec, i) => (
                                            <li key={i}>{rec}</li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="text-center text-muted-foreground">Recommendations will appear here.</p>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
