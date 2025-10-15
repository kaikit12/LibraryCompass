
"use client";

import { useState, useEffect } from "react";
import type { Reader } from "@/lib/types";
import { groqChat } from "@/app/actions/groq-chat";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Sparkles, Wand2 } from "lucide-react";
import { Card, CardContent } from "../ui/card";
import { Badge } from "../ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { useAuth } from "@/context/auth-context";

interface PersonalizedRecommendationsDialogProps {
    readers: Reader[];
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
}

export function PersonalizedRecommendationsDialog({ readers, isOpen, setIsOpen }: PersonalizedRecommendationsDialogProps) {
    const { user: currentUser } = useAuth();
    const [selectedReaderId, setSelectedReaderId] = useState<string | null>(null);
    const [preferences, setPreferences] = useState('');
    const [recommendations, setRecommendations] = useState<string[] | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();

    // If current user is a reader, they can only get recommendations for themselves.
    const readerList = currentUser?.role === 'reader' 
        ? readers.filter(r => r.id === currentUser.id) 
        : readers;

    const selectedReader = readers.find(r => r.id === selectedReaderId);

    useEffect(() => {
        if (isOpen && currentUser?.role === 'reader') {
            setSelectedReaderId(currentUser.id);
        }
    }, [isOpen, currentUser]);

    // Reset state when dialog is opened/closed or readers list changes
    useEffect(() => {
        if (!isOpen) {
            if (currentUser?.role !== 'reader') {
                setSelectedReaderId(null);
            }
            setPreferences('');
            setRecommendations(null);
            setIsLoading(false);
        }
    }, [isOpen, currentUser]);

    const handleGenerate = async () => {
        if (!selectedReader) {
            toast({ variant: 'destructive', title: 'Lỗi', description: 'Vui lòng chọn bạn đọc.'});
            return;
        }

        setIsLoading(true);
        setRecommendations(null);
        try {
            const history = selectedReader.borrowingHistory || [];
            const prompt = `Dựa trên lịch sử đọc: ${history.join(', ')} và sở thích: "${preferences}", gợi ý 5 cuốn sách mới. Chỉ cung cấp danh sách đầu mục sách dạng gạch đầu dòng. Nếu lịch sử trống, gợi ý 5 cuốn phổ biến từ nhiều thể loại.`;
            const result = await groqChat({ prompt });
            
            const recoList = result.content.split('\n').map(item => item.replace(/^-|^\*|\s/g, '').trim()).filter(Boolean);
            setRecommendations(recoList);

        } catch (error) {
            console.error(error);
            toast({
                variant: 'destructive',
                title: 'Lỗi',
                description: 'Tạo gợi ý thất bại. Vui lòng thử lại.',
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
                        Gợi ý sách bằng AI
                    </DialogTitle>
                    <DialogDescription>
                        Chọn bạn đọc để nhận gợi ý sách cá nhân hóa dựa trên lịch sử mượn.
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4">
                     <Label htmlFor="reader-select">Chọn bạn đọc</Label>
                    <Select onValueChange={setSelectedReaderId} value={selectedReaderId || ''} disabled={currentUser?.role === 'reader'}>
                        <SelectTrigger id="reader-select">
                            <SelectValue placeholder="Chọn bạn đọc..." />
                        </SelectTrigger>
                        <SelectContent>
                            {readerList.map((r) => (
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
                                    <h3 className="font-semibold mb-2">Lịch sử mượn của {selectedReader.name}</h3>
                                    <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                                    {(selectedReader.borrowingHistory && selectedReader.borrowingHistory.length > 0) ? selectedReader.borrowingHistory.map(title => (
                                        <Badge key={title} variant="secondary">{title}</Badge>
                                    )) : <p className="text-sm text-muted-foreground">Chưa có lịch sử mượn.</p>}
                                    </div>
                                </CardContent>
                            </Card>
                             <div className="space-y-2">
                                <Label htmlFor="preferences">Sở thích (không bắt buộc)</Label>
                                <Textarea 
                                    id="preferences" 
                                    placeholder="VD: thích trinh thám nhịp nhanh, tiểu thuyết lịch sử, hoặc sách về vũ trụ..."
                                    value={preferences}
                                    onChange={(e) => setPreferences(e.target.value)}
                                />
                            </div>
                            <Button onClick={handleGenerate} disabled={isLoading || !selectedReaderId} className="w-full">
                                {isLoading ? (
                                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Vui lòng chờ...</>
                                ) : (
                                    <><Wand2 className="mr-2 h-4 w-4" /> Tạo gợi ý</>
                                )}
                            </Button>
                        </div>

                        <div className="space-y-4">
                            <h3 className="font-semibold text-center md:text-left">Gợi ý</h3>
                            <Card className="min-h-[260px] flex items-center justify-center">
                                <CardContent className="pt-6 w-full">
                                    {isLoading ? (
                                        <div className="text-center text-muted-foreground">
                                            <Loader2 className="mx-auto h-8 w-8 animate-spin" />
                                            <p className="mt-2">Đang tạo gợi ý cá nhân hóa...</p>
                                        </div>
                                    ) : recommendations ? (
                                        <ul className="space-y-2 list-disc list-inside">
                                            {recommendations.map((rec, i) => (
                                                <li key={i}>{rec}</li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <p className="text-center text-muted-foreground">Chọn bạn đọc và tạo gợi ý.</p>
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
