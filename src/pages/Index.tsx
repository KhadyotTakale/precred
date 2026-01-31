import { useUser } from "@clerk/clerk-react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, Shield, Zap, BarChart3 } from "lucide-react";

const Index = () => {
  const { user } = useUser();

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#e8ebf7" }}>
      <Helmet>
        <title>Precred | AI-Powered Decision Intelligence for NBFCs</title>
        <meta name="description" content="Instantly know which loan applications are worth reviewing. AI-powered decision previews that reduce junk cases and speed up underwriting." />
      </Helmet>

      <Navbar />

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-slate-900 leading-tight mb-6">
            Decide Which Loan Applications Are Worth Reviewing
          </h1>
          <p className="text-xl text-slate-600 mb-10 max-w-2xl mx-auto">
            AI-powered decision previews that reduce junk cases and speed up underwriting
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/admin">
              <Button size="lg" className="bg-slate-900 hover:bg-slate-800 text-white px-8 py-6 text-lg rounded-2xl">
                View Decision Previews
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link to="/applications">
              <Button size="lg" variant="outline" className="bg-white border-slate-200 text-slate-700 hover:bg-slate-50 px-8 py-6 text-lg rounded-2xl shadow-sm">
                View Applications
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Feature Cards */}
      <section className="py-16 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-3 gap-6">
            <Card className="border-0 shadow-sm bg-white rounded-3xl overflow-hidden">
              <CardContent className="p-8 text-center" style={{ backgroundColor: "#c5cdea" }}>
                <div className="w-14 h-14 bg-white/80 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-sm">
                  <Zap className="h-7 w-7 text-slate-700" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Instant Previews</h3>
                <p className="text-slate-600 text-sm">Get AI-powered risk assessment before underwriting review</p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm bg-white rounded-3xl overflow-hidden">
              <CardContent className="p-8 text-center" style={{ backgroundColor: "#c5cdea" }}>
                <div className="w-14 h-14 bg-white/80 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-sm">
                  <BarChart3 className="h-7 w-7 text-slate-700" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Reduce Junk Cases</h3>
                <p className="text-slate-600 text-sm">Filter out low-probability applications automatically</p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm bg-white rounded-3xl overflow-hidden">
              <CardContent className="p-8 text-center" style={{ backgroundColor: "#c5cdea" }}>
                <div className="w-14 h-14 bg-white/80 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-sm">
                  <Shield className="h-7 w-7 text-slate-700" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Speed Up Decisions</h3>
                <p className="text-slate-600 text-sm">Cut underwriting time by 70% with smart prioritization</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <Card className="border-0 shadow-sm rounded-3xl overflow-hidden" style={{ backgroundColor: "#c5cdea" }}>
            <CardContent className="p-10">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
                <div>
                  <div className="text-4xl font-bold text-slate-900 mb-2">68%</div>
                  <p className="text-slate-600 text-sm">Pre-qualified by AI</p>
                </div>
                <div>
                  <div className="text-4xl font-bold text-slate-900 mb-2">2.4h</div>
                  <p className="text-slate-600 text-sm">Avg Time Saved</p>
                </div>
                <div>
                  <div className="text-4xl font-bold text-slate-900 mb-2">89</div>
                  <p className="text-slate-600 text-sm">Junk Cases Filtered</p>
                </div>
                <div>
                  <div className="text-4xl font-bold text-slate-900 mb-2">34%</div>
                  <p className="text-slate-600 text-sm">Conversion Rate</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 px-6">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-slate-500">
            © {new Date().getFullYear()} Precred. All rights reserved.
          </p>
          <div className="flex items-center gap-6 text-sm text-slate-500">
            <span>Consent-based data usage</span>
            <span>•</span>
            <span>Masked PII</span>
            <span>•</span>
            <span>Audit-ready logs</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
