import { UserActions } from "@/components/users/user-actions";

export default async function UsersPage() {
    
    return (
        <div className="space-y-8">
            <header>
                <h1 className="text-4xl font-bold font-headline text-primary">User Management</h1>
                <p className="text-muted-foreground mt-2">
                    Manage member profiles and their borrowing history.
                </p>
            </header>
            <UserActions />
        </div>
    );
}
