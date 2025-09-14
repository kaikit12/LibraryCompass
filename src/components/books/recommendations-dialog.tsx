"use client";

import { useState, useEffect } from "react";
import type { Reader } from "@/lib/types";
import { getPersonalizedBookRecommendations } from "@/ai/flows/personalized-book-recommendations";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Sparkles, Wand2 } from "lucide-react";
import { Card, CardContent } from "../ui/card";
import { Badge } from "../ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";

interface PersonalizedRecommendationsDialogProps {
    readers: Reader[];
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
}

export function PersonalizedRecommendationsDialog({ readers, isOpen, setIsOpen }: PersonalizedRecommendationsDialogProps) {
    const [selectedReaderId, setSelectedReaderId] = useState<string | null>(null);
    const [preferences, setPreferences] = useState('');
    const [recommendations, setRecommendations] = useState<string[] | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();

    const selectedReader = readers.find(r => r.id === selectedReaderId);

    // Reset state when dialog is opened/closed or readers list changes
    useEffect(() => {
        if (!isOpen) {
            setSelectedReaderId(null);
            setPreferences('');
            setRecommendations(null);
            setIsLoading(false);
        }
    }, [isOpen]);

    const handleGenerate = async () => {
        if (!selectedReader) {
            toast({ variant: 'destructive', title: 'Error', description: 'Please select a reader.'});
            return;
        }

        setIsLoading(true);
        setRecommendations(null);
        try {
            const result = await getPersonalizedBookRecommendations({
                readerId: selectedReader.id,
                borrowingHistory: selectedReader.borrowingHistory || [],
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
    
    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="sm:max-w-[625px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 font-headline text-2xl">
                        <Sparkles className="w-6 h-6 text-accent-foreground" />
                        AI Book Recommendations
                    </DialogTitle>
                    <DialogDescription>
                        Select a reader to get personalized, AI-powered book suggestions based on their borrowing history.
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4">
                     <Label htmlFor="reader-select">Select a Reader</Label>
                    <Select onValueChange={setSelectedReaderId} value={selectedReaderId || ''}>
                        <SelectTrigger id="reader-select">
                            <SelectValue placeholder="Choose a reader..." />
                        </SelectTrigger>
                        <SelectContent>
                            {readers.map((r) => (
                                <SelectItem key={r.id} value={r.id}>
                                    {r.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {selectedReader && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <Card>
                                <CardContent className="pt-6">
                                    <h3 className="font-semibold mb-2">Borrowing History for {selectedReader.name}</h3>
                                    <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                                    {(selectedReader.borrowingHistory && selectedReader.borrowingHistory.length > 0) ? selectedReader.borrowingHistory.map(title => (
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
                            <Card className="min-h-[260px] flex items-center justify-center">
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
                                        <p className="text-center text-muted-foreground">Select a reader and generate recommendations.</p>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );

}
