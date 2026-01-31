import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import { elegantAPI } from "@/lib/elegant-api";
import Navbar from "@/components/Navbar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Search, ChevronLeft, ChevronRight, MapPin, Briefcase, Clock } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";

const Jobs = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ["jobs", currentPage],
    queryFn: () => elegantAPI.getPublicItems(currentPage, 100, "Job"),
  });

  const filteredJobs = data?.items?.filter((job) =>
    job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    job.description?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const totalPages = data?.pageTotal || 1;

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Volunteer Opportunities - Tampa Bay Minerals & Science Club</title>
        <meta name="description" content="Join our community and make a difference. Discover meaningful volunteer opportunities in earth sciences education and mineral collecting." />
        <link rel="canonical" href={`${window.location.origin}/jobs`} />
        
        {/* Open Graph */}
        <meta property="og:title" content="Volunteer Opportunities - Tampa Bay Minerals & Science Club" />
        <meta property="og:description" content="Join our community and make a difference. Discover meaningful volunteer opportunities in earth sciences education and mineral collecting." />
        <meta property="og:url" content={`${window.location.origin}/jobs`} />
        <meta property="og:type" content="website" />
        <meta property="og:image" content={`${window.location.origin}/club-logo-new.png`} />
        
        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Volunteer Opportunities - Tampa Bay Minerals & Science Club" />
        <meta name="twitter:description" content="Join our community and make a difference. Discover meaningful volunteer opportunities in earth sciences education and mineral collecting." />
        <meta name="twitter:image" content={`${window.location.origin}/club-logo-new.png`} />
      </Helmet>
      
      <Navbar />
      
      {/* Breadcrumb */}
      <div className="container mx-auto px-4 mt-24 mb-4">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/">Home</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Volunteer Opportunities</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      {/* Hero Section */}
      <section className="relative py-16 px-4 bg-gradient-to-br from-primary/10 via-background to-secondary/10">
        <div className="container mx-auto text-center">
          <h1 className="text-5xl font-bold mb-6 text-foreground">Volunteer Opportunities</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Join our community and make a difference through meaningful volunteer work
          </p>
        </div>
      </section>

      {/* Search Section */}
      <section className="py-8 px-4 border-b border-border">
        <div className="container mx-auto">
          <div className="max-w-2xl mx-auto relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
            <Input
              type="text"
              placeholder="Search volunteer opportunities..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </section>

      {/* Jobs Grid */}
      <section className="py-12 px-4">
        <div className="container mx-auto">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-64 rounded-lg" />
              ))}
            </div>
          ) : filteredJobs.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground text-lg">No volunteer opportunities found</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredJobs.map((job) => {
                  const jobInfo = job.item_info || {};
                  const company = jobInfo.company || "Company Name";
                  const location = jobInfo.location || "Location not specified";
                  const jobType = jobInfo.jobType || "Full-time";
                  const tags = jobInfo.tags || [];

                  return (
                    <Card 
                      key={job.id}
                      className="hover:shadow-xl transition-all duration-300 group cursor-pointer"
                      onClick={() => navigate(`/jobs/${job.slug}`)}
                    >
                      <CardHeader>
                        <div className="flex justify-between items-start mb-2">
                          <CardTitle className="text-2xl group-hover:text-primary transition-colors">
                            {job.title}
                          </CardTitle>
                        </div>
                        <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Briefcase className="h-4 w-4" />
                            <span>{company}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            <span>{location}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            <span>{jobType}</span>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-muted-foreground line-clamp-3 mb-4">
                          {job.description}
                        </p>
                        {tags.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {tags.slice(0, 3).map((tag: string, index: number) => (
                              <Badge key={index} variant="secondary">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center items-center gap-4 mt-12">
                  <Button
                    variant="outline"
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4 mr-2" />
                    Previous
                  </Button>
                  <span className="text-muted-foreground">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </div>
  );
};

export default Jobs;
