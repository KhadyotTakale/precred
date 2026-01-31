import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { elegantAPI } from '@/lib/elegant-api';
import Navbar from '@/components/Navbar';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar, BookOpen, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';

interface Newsletter {
  id: number;
  title: string;
  slug: string;
  description: string;
  item_info?: {
    coverImageUrl?: string;
    issueMonth?: string;
    issueYear?: string;
    issueDate?: string;
    newsletterTitle?: string;
    selectedBlogs?: Array<{ id: number; title: string }>;
  };
}

export default function Newsletters() {
  const [newsletters, setNewsletters] = useState<Newsletter[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNewsletters = async () => {
      try {
        const response = await elegantAPI.getPublicItems(1, 100, 'Newsletter');
        // Filter to only show published newsletters
        const published = response.items.filter((item: any) => !item.Is_disabled);
        setNewsletters(published);
      } catch (error) {
        console.error('Failed to fetch newsletters:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchNewsletters();
  }, []);

  const getIssueLabel = (newsletter: Newsletter) => {
    const issueMonth = newsletter.item_info?.issueMonth;
    const issueYear = newsletter.item_info?.issueYear;
    if (issueMonth && issueYear) {
      return `${issueMonth} ${issueYear}`;
    }
    return null;
  };

  return (
    <>
      <Helmet>
        <title>Newsletters | Stay Updated</title>
        <meta name="description" content="Browse our collection of newsletters featuring curated articles, announcements, and community updates." />
      </Helmet>

      <Navbar />

      <main className="min-h-screen bg-background pt-20">
        <div className="container mx-auto px-4 py-12">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full mb-4">
              <BookOpen className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-primary">Our Newsletters</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Stay Updated
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Explore our curated newsletters featuring the latest articles, announcements, and community highlights.
            </p>
          </div>

          {/* Newsletter Grid */}
          {loading ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="overflow-hidden">
                  <Skeleton className="h-48 w-full" />
                  <CardContent className="p-6 space-y-3">
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-16 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : newsletters.length === 0 ? (
            <div className="text-center py-16">
              <BookOpen className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
              <h2 className="text-xl font-semibold mb-2">No Newsletters Yet</h2>
              <p className="text-muted-foreground">
                Check back soon for our upcoming newsletters.
              </p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {newsletters.map((newsletter) => {
                const issueLabel = getIssueLabel(newsletter);
                const blogCount = newsletter.item_info.selectedBlogs?.length || 0;

                return (
                  <Link
                    key={newsletter.id}
                    to={`/newsletter/${newsletter.slug}`}
                    className="group"
                  >
                    <Card className="overflow-hidden h-full transition-all duration-300 hover:shadow-lg hover:border-primary/30 group-hover:-translate-y-1">
                      {/* Cover Image */}
                      <div className="relative h-48 bg-gradient-to-br from-primary/20 to-primary/5 overflow-hidden">
                        {newsletter.item_info.coverImageUrl ? (
                          <img
                            src={newsletter.item_info.coverImageUrl}
                            alt={newsletter.title}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <BookOpen className="h-16 w-16 text-primary/30" />
                          </div>
                        )}
                        {/* Issue Badge */}
                        {issueLabel && (
                          <Badge className="absolute top-3 left-3 bg-background/90 text-foreground backdrop-blur-sm">
                            {issueLabel}
                          </Badge>
                        )}
                      </div>

                      <CardContent className="p-6">
                        {/* Title */}
                        <h2 className="text-xl font-semibold mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                          {newsletter.title}
                        </h2>

                        {/* Meta Info */}
                        <div className="flex items-center gap-3 text-sm text-muted-foreground mb-3">
                          {newsletter.item_info.issueDate && (
                            <div className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              <span>{format(new Date(newsletter.item_info.issueDate), 'MMM d, yyyy')}</span>
                            </div>
                          )}
                          {blogCount > 0 && (
                            <Badge variant="secondary" className="text-xs">
                              {blogCount} {blogCount === 1 ? 'article' : 'articles'}
                            </Badge>
                          )}
                        </div>

                        {/* Description */}
                        {newsletter.description && (
                          <p className="text-muted-foreground text-sm line-clamp-3 mb-4">
                            {newsletter.description}
                          </p>
                        )}

                        {/* Read More */}
                        <div className="flex items-center text-primary text-sm font-medium group-hover:gap-2 transition-all">
                          <span>Read Newsletter</span>
                          <ArrowRight className="h-4 w-4 ml-1 transition-transform group-hover:translate-x-1" />
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
