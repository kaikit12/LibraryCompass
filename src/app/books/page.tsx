import { BookActions } from "@/components/books/book-actions";
import { initialBooks, initialReaders } from "@/lib/data";

export default function BooksPage() {
    return (
        <div className="space-y-8">
            <header>
                <h1 className="text-4xl font-bold font-headline text-primary">Book Management</h1>
                <p className="text-muted-foreground mt-2">
                    Add, edit, and track all the books in your library.
                </p>
            </header>
            <BookActions initialBooks={initialBooks} initialReaders={initialReaders} />
        </div>
    );
}
