import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import { elegantAPI } from "@/lib/elegant-api";
import Navbar from "@/components/Navbar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, ChevronLeft, ChevronRight, Calendar, User, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { createItemListSchema, createCollectionPageSchema, createBreadcrumbSchema, cleanSchema } from "@/lib/schema-utils";

const Blogs = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ["blogs", currentPage],
    queryFn: () => elegantAPI.getPublicItems(currentPage, 100, "Blog"),
  });

  const filteredBlogs = data?.items?.filter((blog) =>
    blog.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    blog.description?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const totalPages = data?.pageTotal || 1;

  // Helper to get hero image from blog info
  const getHeroImage = (blogInfo: any, itemImages: any[]) => {
    if (blogInfo?.heroImage) return blogInfo.heroImage;
    const featuredImage = itemImages?.find((img) => img.image_type === "Image");
    return featuredImage?.display_image || null;
  };

  // Helper to get excerpt from blocks
  const getExcerpt = (blogInfo: any, description: string) => {
    if (description) return description;
    const blocks = blogInfo?.blocks || [];
    const paragraphBlock = blocks.find((b: any) => b.type === 'paragraph' && b.content);
    if (paragraphBlock) {
      return paragraphBlock.content.substring(0, 160) + (paragraphBlock.content.length > 160 ? '...' : '');
    }
    return "Read more to discover the full story...";
  };

  // Schema.org structured data for listing page
  const itemListSchema = useMemo(() => {
    if (!filteredBlogs.length) return null;
    return createItemListSchema({
      name: "Blog Posts",
      description: "Discover insights, tips, and stories from the mineral and gem community.",
      url: `${window.location.origin}/blog`,
      items: filteredBlogs.map((blog) => {
        const blogInfo = blog.item_info || {};
        const itemImages = (blog as any)._item_images_of_items?.items || [];
        const heroImage = getHeroImage(blogInfo, itemImages);
        return {
          name: blog.title,
          url: `${window.location.origin}/blog/${blog.slug}`,
          image: heroImage ? (heroImage.startsWith('http') ? heroImage : `${window.location.origin}${heroImage}`) : undefined,
          description: blog.description?.substring(0, 160),
        };
      }),
    });
  }, [filteredBlogs]);

  const collectionPageSchema = useMemo(() => createCollectionPageSchema({
    name: "Blog Posts - Tampa Bay Minerals & Science Club",
    description: "Discover insights, tips, and stories from the mineral and gem community.",
    url: `${window.location.origin}/blog`,
    image: `${window.location.origin}/club-logo-new.png`,
  }), []);

  const breadcrumbSchema = useMemo(() => createBreadcrumbSchema([
    { name: "Home", url: `${window.location.origin}/` },
    { name: "Blog", url: `${window.location.origin}/blog` },
  ]), []);

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Blog - Tampa Bay Minerals & Science Club</title>
        <meta name="description" content="Discover insights, tips, and stories from the mineral and gem community." />
        <link rel="canonical" href={`${window.location.origin}/blog`} />
        
        {/* Open Graph */}
        <meta property="og:title" content="Blog - Tampa Bay Minerals & Science Club" />
        <meta property="og:description" content="Discover insights, tips, and stories from the mineral and gem community." />
        <meta property="og:url" content={`${window.location.origin}/blog`} />
        <meta property="og:type" content="website" />
        <meta property="og:image" content={`${window.location.origin}/club-logo-new.png`} />
        
        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Blog - Tampa Bay Minerals & Science Club" />
        <meta name="twitter:description" content="Discover insights, tips, and stories from the mineral and gem community." />
        <meta name="twitter:image" content={`${window.location.origin}/club-logo-new.png`} />
        
        {/* Structured Data - CollectionPage */}
        <script type="application/ld+json">
          {JSON.stringify(cleanSchema(collectionPageSchema))}
        </script>
        
        {/* Structured Data - BreadcrumbList */}
        <script type="application/ld+json">
          {JSON.stringify(breadcrumbSchema)}
        </script>
        
        {/* Structured Data - ItemList */}
        {itemListSchema && (
          <script type="application/ld+json">
            {JSON.stringify(cleanSchema(itemListSchema))}
          </script>
        )}
      </Helmet>
      
      <Navbar />
      
      {/* Hero Section */}
      <section className="relative py-16 mt-20 px-4 bg-gradient-to-br from-primary/10 via-background to-secondary/10">
        <div className="container mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 text-foreground">Our Blog</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Discover insights, tips, and stories from the mineral and gem community
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
              placeholder="Search blog posts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </section>

      {/* Blogs Grid */}
      <section className="py-12 px-4">
        <div className="container mx-auto">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="overflow-hidden">
                  <Skeleton className="h-48 w-full" />
                  <CardHeader>
                    <Skeleton className="h-4 w-24 mb-2" />
                    <Skeleton className="h-6 w-3/4" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-4 w-full mb-2" />
                    <Skeleton className="h-4 w-2/3" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredBlogs.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground text-lg">No blog posts found</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {filteredBlogs.map((blog) => {
                  const blogInfo = blog.item_info || {};
                  const authorName = blogInfo.author || "Anonymous";
                  const authorImage = blogInfo.authorImage;
                  const publishDate = blogInfo.publishDate || blogInfo.datePublished || blog.created_at;
                  const readTime = blogInfo.readTime || "5 min read";
                  const itemImages = (blog as any)._item_images_of_items?.items || [];
                  const heroImage = getHeroImage(blogInfo, itemImages);
                  const excerpt = getExcerpt(blogInfo, blog.description);

                  return (
                    <Card 
                      key={blog.id}
                      className="hover:shadow-xl transition-all duration-300 group cursor-pointer overflow-hidden flex flex-col"
                      onClick={() => navigate(`/blog/${blog.slug}`)}
                    >
                      {/* Featured Image */}
                      <div className="aspect-video overflow-hidden bg-muted">
                        {heroImage ? (
                          <img
                            src={heroImage}
                            alt={blog.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-secondary/20">
                            <span className="text-4xl font-bold text-primary/30">
                              {blog.title.charAt(0)}
                            </span>
                          </div>
                        )}
                      </div>

                      <CardHeader className="pb-2">
                        {/* Author & Meta */}
                        <div className="flex items-center gap-3 mb-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={authorImage} alt={authorName} />
                            <AvatarFallback className="text-xs">
                              {authorName.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col text-sm">
                            <span className="font-medium text-foreground">{authorName}</span>
                            <div className="flex items-center gap-2 text-muted-foreground text-xs">
                              <span>{new Date(publishDate).toLocaleDateString('en-US', { 
                                month: 'short', 
                                day: 'numeric',
                                year: 'numeric'
                              })}</span>
                              <span>•</span>
                              <span>{readTime}</span>
                            </div>
                          </div>
                        </div>

                        <CardTitle className="text-xl group-hover:text-primary transition-colors line-clamp-2">
                          {blog.title}
                        </CardTitle>
                      </CardHeader>

                      <CardContent className="flex-1 flex flex-col">
                        <p className="text-muted-foreground mb-4 line-clamp-3 flex-1">
                          {excerpt}
                        </p>
                        
                        {/* Tags */}
                        {blog.tags && (
                          <div className="flex flex-wrap gap-2 mt-auto">
                            {blog.tags.split(',').slice(0, 3).map((tag, index) => (
                              <Badge key={index} variant="secondary" className="text-xs">
                                {tag.trim()}
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
                    onClick={() => {
                      setCurrentPage(p => Math.max(1, p - 1));
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4 mr-2" />
                    Previous
                  </Button>
                  
                  <span className="text-sm text-muted-foreground">
                    Page {currentPage} of {totalPages}
                  </span>
                  
                  <Button
                    variant="outline"
                    onClick={() => {
                      setCurrentPage(p => Math.min(totalPages, p + 1));
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
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

export default Blogs;