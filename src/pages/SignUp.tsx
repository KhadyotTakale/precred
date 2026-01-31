import { SignUp } from "@clerk/clerk-react";
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import ClerkSetup from "./ClerkSetup";
import clubLogo from "@/assets/club-logo-new.png";

const SignUpPage = () => {
  const [isClerkEnabled, setIsClerkEnabled] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectUrl = searchParams.get('redirect') || '/admin';

  useEffect(() => {
    const key = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
    const isValid = key && key.startsWith('pk_') && !key.includes('your_key_here');
    setIsClerkEnabled(!!isValid);
  }, []);

  if (!isClerkEnabled) {
    return <ClerkSetup />;
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
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
        <div className="flex justify-center mb-6">
          <img 
            src={clubLogo} 
            alt="Tampa Bay Mineral and Science Club" 
            className="h-24 w-auto object-contain"
          />
        </div>
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">Join Our Community</h1>
          <p className="text-muted-foreground">Create an account to get started</p>
        </div>
        <SignUp 
          appearance={{
            elements: {
              rootBox: "mx-auto",
              card: "bg-card shadow-xl",
            }
          }}
          forceRedirectUrl={redirectUrl}
          signInForceRedirectUrl={redirectUrl}
        />
      </div>
    </div>
  );
};

export default SignUpPage;