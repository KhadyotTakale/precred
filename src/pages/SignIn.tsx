import { SignIn } from "@clerk/clerk-react";
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import ClerkSetup from "./ClerkSetup";

const SignInPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isClerkEnabled, setIsClerkEnabled] = useState(false);
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
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: "#e8ebf7" }}>
      <div className="w-full max-w-md">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate('/')}
            className="gap-2 text-slate-600 hover:text-slate-900 hover:bg-white/50 rounded-xl"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Button>
        </div>

        {/* Logo */}
        <div className="flex justify-center mb-6">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-white">
                <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </Link>
        </div>

        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Welcome Back</h1>
          <p className="text-slate-600">Sign in to access your dashboard</p>
        </div>

        <SignIn
          appearance={{
            elements: {
              rootBox: "mx-auto",
              card: "bg-white shadow-lg rounded-3xl border-0",
              headerTitle: "text-slate-900",
              headerSubtitle: "text-slate-600",
              formButtonPrimary: "bg-slate-900 hover:bg-slate-800 rounded-xl",
              formFieldInput: "rounded-xl border-slate-200",
              footerActionLink: "text-slate-900 hover:text-slate-700",
            }
          }}
          forceRedirectUrl={redirectUrl}
          signUpForceRedirectUrl={redirectUrl}
        />
      </div>
    </div>
  );
};

export default SignInPage;
