import { ReaderActions } from "@/components/readers/reader-actions";

export default async function ReadersPage() {
    
    return (
        <div className="space-y-8">
            <header>
                <h1 className="text-4xl font-bold font-headline text-primary">Reader Management</h1>
                <p className="text-muted-foreground mt-2">
                    Manage member profiles and their borrowing history.
                </p>
            </header>
            <ReaderActions />
        </div>
    );
}
