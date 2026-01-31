import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Key } from "lucide-react";
import { useNavigate } from "react-router-dom";

const ClerkSetup = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="mb-6">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/')}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Button>
        </div>
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Key className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-2xl">Clerk Setup Required</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-center text-muted-foreground">
              Authentication is not configured. Please set up Clerk to enable sign-in functionality.
            </p>
            <div className="rounded-lg bg-muted p-4 text-sm">
              <p className="font-medium mb-2">To get started:</p>
              <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                <li>Create a Clerk account at clerk.com</li>
                <li>Create a new application</li>
                <li>Copy your publishable key</li>
                <li>Add it to your environment variables as VITE_CLERK_PUBLISHABLE_KEY</li>
              </ol>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ClerkSetup;
