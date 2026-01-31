import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { elegantAPI, ItemDetailsResponse } from '@/lib/elegant-api';
import Navbar from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Calendar, User, BookOpen, Info, AlertTriangle, CheckCircle, XCircle, Share2, Mail, Facebook, Twitter, Linkedin, Printer, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { usePageViewTrigger } from '@/contexts/WorkflowContext';

// Types matching BlogForm/BlogDetails
type BlockType = 'heading' | 'paragraph' | 'image' | 'quote' | 'list' | 'code' | 'divider' | 'callout' | 'video';
type HeadingLevel = 'h1' | 'h2' | 'h3' | 'h4';
type TextAlignment = 'left' | 'center' | 'right';
type ImagePosition = 'above' | 'below' | 'left' | 'right' | 'full' | 'background';

interface ContentBlock {
  id: string;
  type: BlockType;
  content: string;
  headingLevel?: HeadingLevel;
  alignment?: TextAlignment;
  imageUrl?: string;
  imageAlt?: string;
  imageCaption?: string;
  imagePosition?: ImagePosition;
  imageWidth?: 'small' | 'medium' | 'large' | 'full';
  listStyle?: 'bullet' | 'numbered' | 'checklist';
  listItems?: string[];
  codeLanguage?: string;
  calloutType?: 'info' | 'warning' | 'success' | 'error';
  videoUrl?: string;
  videoType?: 'youtube' | 'vimeo' | 'upload';
}

interface SelectedBlog {
  id: number;
  title: string;
  slug: string;
  description: string;
  authorName?: string;
  authorImage?: string;
  publishDate?: string;
  heroImage?: string;
  tags?: string;
}

// Block Renderer Component - matching BlogDetails
const BlockRenderer = ({ block }: { block: ContentBlock }) => {
  const alignmentClasses = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
  };

  const imageWidthClasses = {
    small: 'max-w-sm',
    medium: 'max-w-lg',
    large: 'max-w-2xl',
    full: 'w-full',
  };

  const calloutStyles = {
    info: { bg: 'bg-blue-50 dark:bg-blue-950', border: 'border-blue-200 dark:border-blue-800', icon: Info, iconColor: 'text-blue-500' },
    warning: { bg: 'bg-amber-50 dark:bg-amber-950', border: 'border-amber-200 dark:border-amber-800', icon: AlertTriangle, iconColor: 'text-amber-500' },
    success: { bg: 'bg-green-50 dark:bg-green-950', border: 'border-green-200 dark:border-green-800', icon: CheckCircle, iconColor: 'text-green-500' },
    error: { bg: 'bg-red-50 dark:bg-red-950', border: 'border-red-200 dark:border-red-800', icon: XCircle, iconColor: 'text-red-500' },
  };

  switch (block.type) {
    case 'heading': {
      const HeadingTag = block.headingLevel || 'h2';
      const headingSizes = {
        h1: 'text-4xl md:text-5xl font-bold',
        h2: 'text-3xl md:text-4xl font-bold',
        h3: 'text-2xl md:text-3xl font-semibold',
        h4: 'text-xl md:text-2xl font-semibold',
      };
      return (
        <HeadingTag 
          className={cn(
            headingSizes[HeadingTag],
            alignmentClasses[block.alignment || 'left'],
            'text-foreground mb-4'
          )}
        >
          {block.content}
        </HeadingTag>
      );
    }

    case 'paragraph':
      return (
        <p 
          className={cn(
            'text-lg leading-relaxed text-muted-foreground mb-6',
            alignmentClasses[block.alignment || 'left']
          )}
        >
          {block.content}
        </p>
      );

    case 'image': {
      const position = block.imagePosition || 'full';
      const width = block.imageWidth || 'full';
      
      if (position === 'left' || position === 'right') {
        return (
          <div className={cn(
            'mb-6 flex gap-6',
            position === 'right' && 'flex-row-reverse',
            'flex-col md:flex-row'
          )}>
            <figure className={cn('md:w-1/2', imageWidthClasses[width])}>
              <img
                src={block.imageUrl}
                alt={block.imageAlt || ''}
                className="w-full h-auto rounded-lg object-cover"
                loading="lazy"
              />
              {block.imageCaption && (
                <figcaption className="mt-2 text-sm text-muted-foreground text-center italic">
                  {block.imageCaption}
                </figcaption>
              )}
            </figure>
            {block.content && (
              <div className="md:w-1/2">
                <p className="text-lg leading-relaxed text-muted-foreground">
                  {block.content}
                </p>
              </div>
            )}
          </div>
        );
      }
      
      return (
        <figure className={cn('mb-6 mx-auto', imageWidthClasses[width])}>
          <img
            src={block.imageUrl}
            alt={block.imageAlt || ''}
            className="w-full h-auto rounded-lg object-cover"
            loading="lazy"
          />
          {block.imageCaption && (
            <figcaption className="mt-2 text-sm text-muted-foreground text-center italic">
              {block.imageCaption}
            </figcaption>
          )}
        </figure>
      );
    }

    case 'quote':
      return (
        <blockquote className="border-l-4 border-primary pl-6 py-2 mb-6 italic">
          <p className="text-xl text-foreground mb-2">"{block.content}"</p>
          {block.imageCaption && (
            <cite className="text-muted-foreground not-italic">— {block.imageCaption}</cite>
          )}
        </blockquote>
      );

    case 'list': {
      const items = block.listItems || block.content.split('\n').filter(Boolean);
      const ListTag = block.listStyle === 'numbered' ? 'ol' : 'ul';
      return (
        <ListTag className={cn(
          'mb-6 pl-6 space-y-2',
          block.listStyle === 'numbered' ? 'list-decimal' : 'list-disc'
        )}>
          {items.map((item, i) => (
            <li key={i} className="text-lg text-muted-foreground">
              {block.listStyle === 'checklist' ? (
                <span className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-primary" />
                  {item}
                </span>
              ) : item}
            </li>
          ))}
        </ListTag>
      );
    }

    case 'code':
      return (
        <div className="mb-6">
          {block.codeLanguage && (
            <div className="bg-muted px-4 py-2 text-sm font-mono text-muted-foreground rounded-t-lg border border-b-0 border-border">
              {block.codeLanguage}
            </div>
          )}
          <pre className={cn(
            "bg-muted p-4 overflow-x-auto font-mono text-sm",
            block.codeLanguage ? 'rounded-b-lg' : 'rounded-lg',
            'border border-border'
          )}>
            <code>{block.content}</code>
          </pre>
        </div>
      );

    case 'callout': {
      const style = calloutStyles[block.calloutType || 'info'];
      const IconComponent = style.icon;
      return (
        <div className={cn(
          'mb-6 p-4 rounded-lg border flex gap-3',
          style.bg,
          style.border
        )}>
          <IconComponent className={cn('h-5 w-5 mt-0.5 flex-shrink-0', style.iconColor)} />
          <p className="text-foreground">{block.content}</p>
        </div>
      );
    }

    case 'video': {
      const getEmbedUrl = (url: string, type?: string) => {
        if (type === 'youtube' || url.includes('youtube.com') || url.includes('youtu.be')) {
          const videoId = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/)?.[1];
          return videoId ? `https://www.youtube.com/embed/${videoId}` : url;
        }
        if (type === 'vimeo' || url.includes('vimeo.com')) {
          const videoId = url.match(/vimeo\.com\/(\d+)/)?.[1];
          return videoId ? `https://player.vimeo.com/video/${videoId}` : url;
        }
        return url;
      };

      return (
        <div className="mb-6 aspect-video rounded-lg overflow-hidden">
          <iframe
            src={getEmbedUrl(block.videoUrl || '', block.videoType)}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title="Video content"
          />
        </div>
      );
    }

    case 'divider':
      return <Separator className="my-8" />;

    default:
      return null;
  }
};

// Table of Contents Component - supports both blog articles and custom TOC items
const TableOfContents = ({ 
  blogs, 
  tocItems,
  variant = 'inline'
}: { 
  blogs: { title: string; id: number }[];
  tocItems?: { title: string; pageNumber?: string }[];
  variant?: 'inline' | 'sidebar';
}) => {
  const hasBlogToc = blogs.length > 0;
  const hasCustomToc = tocItems && tocItems.filter(item => item.title.trim()).length > 0;
  
  if (!hasBlogToc && !hasCustomToc) return null;

  const isSidebar = variant === 'sidebar';

  return (
    <Card className={cn(
      "border-primary/20",
      isSidebar ? "sticky top-24" : "mb-8"
    )}>
      <CardContent className={cn("p-4", isSidebar ? "p-4" : "p-6")}>
        <h2 className={cn(
          "font-semibold mb-4 flex items-center gap-2",
          isSidebar ? "text-sm" : "text-lg"
        )}>
          <BookOpen className={cn("text-primary", isSidebar ? "h-4 w-4" : "h-5 w-5")} />
          In This Issue
        </h2>
        <nav className="space-y-1">
          {/* Custom TOC items from newsletter config */}
          {hasCustomToc && tocItems!.filter(item => item.title.trim()).map((item, index) => (
            <div
              key={`toc-${index}`}
              className={cn(
                "flex items-center justify-between text-muted-foreground hover:text-primary transition-colors pl-2 py-1 rounded-md hover:bg-muted/50",
                isSidebar ? "text-sm" : ""
              )}
            >
              <span className="flex items-center gap-2">
                <ChevronRight className="h-3 w-3 flex-shrink-0" />
                <span className={isSidebar ? "line-clamp-2" : ""}>{item.title}</span>
              </span>
              {item.pageNumber && !isSidebar && (
                <span className="text-sm text-muted-foreground/70">p. {item.pageNumber}</span>
              )}
            </div>
          ))}
          
          {/* Blog article links */}
          {hasBlogToc && blogs.map((blog, index) => (
            <a
              key={blog.id}
              href={`#article-${blog.id}`}
              className={cn(
                "flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors pl-2 py-1 rounded-md hover:bg-muted/50",
                isSidebar ? "text-sm" : ""
              )}
            >
              <ChevronRight className="h-3 w-3 flex-shrink-0" />
              <span className={isSidebar ? "line-clamp-2" : ""}>
                {index + 1}. {blog.title}
              </span>
            </a>
          ))}
        </nav>
      </CardContent>
    </Card>
  );
};

// Social Share Component
const SocialShare = ({ newsletter, url }: { newsletter: ItemDetailsResponse; url: string }) => {
  const shareUrl = encodeURIComponent(url);
  const shareTitle = encodeURIComponent(newsletter.title);
  const shareDescription = encodeURIComponent(newsletter.description || '');

  const handlePrint = () => {
    window.print();
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Link copied to clipboard!');
    } catch {
      toast.error('Failed to copy link');
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Share2 className="h-4 w-4" />
          Share
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={handleCopyLink}>
          <Share2 className="h-4 w-4 mr-2" />
          Copy Link
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a
            href={`mailto:?subject=${shareTitle}&body=${shareDescription}%0A%0A${shareUrl}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Mail className="h-4 w-4 mr-2" />
            Email
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a
            href={`https://www.facebook.com/sharer/sharer.php?u=${shareUrl}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Facebook className="h-4 w-4 mr-2" />
            Facebook
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a
            href={`https://twitter.com/intent/tweet?url=${shareUrl}&text=${shareTitle}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Twitter className="h-4 w-4 mr-2" />
            Twitter
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a
            href={`https://www.linkedin.com/shareArticle?mini=true&url=${shareUrl}&title=${shareTitle}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Linkedin className="h-4 w-4 mr-2" />
            LinkedIn
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handlePrint}>
          <Printer className="h-4 w-4 mr-2" />
          Print
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default function NewsletterDetails() {
  const { slug } = useParams<{ slug: string }>();
  const [newsletter, setNewsletter] = useState<ItemDetailsResponse | null>(null);
  const [blogs, setBlogs] = useState<Map<number, ItemDetailsResponse>>(new Map());
  const [loading, setLoading] = useState(true);

  // Trigger workflow on page view
  usePageViewTrigger(slug || '', 'newsletter', newsletter ? { id: newsletter.id, title: newsletter.title, slug: newsletter.slug } : undefined, !loading && !!newsletter, newsletter?.id);

  useEffect(() => {
    const fetchNewsletter = async () => {
      if (!slug) return;
      setLoading(true);
      try {
        // Fetch newsletter details
        const newsletterData = await elegantAPI.getItemDetails(slug);
        if (newsletterData && !newsletterData.Is_disabled) {
          setNewsletter(newsletterData);
          
          // Fetch full blog content for each selected blog
          const selectedBlogs: SelectedBlog[] = newsletterData.item_info?.selectedBlogs || [];
          if (selectedBlogs.length > 0) {
            const blogPromises = selectedBlogs.map(sb => 
              elegantAPI.getItemDetailsById(sb.id).catch(() => null)
            );
            const blogResults = await Promise.all(blogPromises);
            const blogMap = new Map<number, ItemDetailsResponse>();
            blogResults.forEach((blog) => {
              if (blog) {
                blogMap.set(blog.id, blog);
              }
            });
            setBlogs(blogMap);
          }
        }
      } catch (error) {
        console.error('Failed to fetch newsletter:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchNewsletter();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container max-w-4xl mx-auto px-4 py-8">
          <Skeleton className="h-12 w-3/4 mb-4" />
          <Skeleton className="h-64 w-full mb-8" />
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-5/6" />
        </div>
      </div>
    );
  }

  if (!newsletter) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container max-w-4xl mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold mb-4">Newsletter not found</h1>
          <Button asChild><Link to="/newsletter"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Newsletters</Link></Button>
        </div>
      </div>
    );
  }

  const info = newsletter.item_info || {};
  const selectedBlogs: SelectedBlog[] = info.selectedBlogs || [];
  const tocItems = info.tocItems || [];
  const currentUrl = typeof window !== 'undefined' ? window.location.href : '';
  const coverImage = info.coverImageUrl || newsletter.item_info?.image?.[0] || '';

  // Build Schema.org structured data
  const schemaData = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: info.newsletterTitle || newsletter.title,
    description: newsletter.description,
    datePublished: info.issueDate || new Date(newsletter.created_at).toISOString(),
    image: coverImage ? [coverImage] : undefined,
    publisher: {
      "@type": "Organization",
      name: info.newsletterTitle || "Newsletter",
      logo: info.logoUrl ? {
        "@type": "ImageObject",
        url: info.logoUrl
      } : undefined
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{info.newsletterTitle || newsletter.title} | {info.issueMonth} {info.issueYear}</title>
        <meta name="description" content={newsletter.description} />
        <meta property="og:title" content={info.newsletterTitle || newsletter.title} />
        <meta property="og:description" content={newsletter.description} />
        <meta property="og:type" content="article" />
        {coverImage && <meta property="og:image" content={coverImage} />}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={info.newsletterTitle || newsletter.title} />
        <meta name="twitter:description" content={newsletter.description} />
        {coverImage && <meta name="twitter:image" content={coverImage} />}
        <script type="application/ld+json">
          {JSON.stringify(schemaData)}
        </script>
      </Helmet>
      <Navbar />
      
      <main className="container max-w-4xl lg:max-w-6xl mx-auto px-4 py-8 pt-24">
        {/* Breadcrumb and Share */}
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" asChild>
            <Link to="/newsletter"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Newsletters</Link>
          </Button>
          <SocialShare newsletter={newsletter} url={currentUrl} />
        </div>

        {/* Header */}
        <header className="text-center mb-12">
          {info.logoUrl && (
            <img 
              src={info.logoUrl} 
              alt={info.newsletterTitle || 'Newsletter Logo'} 
              className="h-20 mx-auto mb-6 object-contain" 
            />
          )}
          <div className="space-y-2">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
              {info.newsletterTitle || newsletter.title}
            </h1>
            {(info.issueMonth || info.issueYear) && (
              <div className="flex items-center justify-center gap-2 text-lg text-muted-foreground">
                <Calendar className="h-5 w-5" />
                <span>{info.issueMonth} {info.issueYear}</span>
              </div>
            )}
            {info.issueDate && (
              <p className="text-sm text-muted-foreground">
                Published: {format(new Date(info.issueDate), 'MMMM d, yyyy')}
              </p>
            )}
          </div>
          {newsletter.description && (
            <p className="text-lg text-muted-foreground mt-4 max-w-2xl mx-auto">
              {newsletter.description}
            </p>
          )}
        </header>

        {/* Cover Image */}
        {info.coverImageUrl && (
          <div className="mb-12">
            <img src={info.coverImageUrl} alt={info.coverHeadline || 'Cover'} className="w-full rounded-lg" />
            {info.coverHeadline && <h2 className="text-2xl font-bold mt-4 text-center">{info.coverHeadline}</h2>}
            {info.coverSubheadline && <p className="text-muted-foreground text-center">{info.coverSubheadline}</p>}
          </div>
        )}

        {/* Featured Announcement */}
        {info.featuredAnnouncementTitle && (
          <div className="bg-primary/10 p-6 rounded-lg mb-12 text-center">
            <h3 className="text-xl font-bold">{info.featuredAnnouncementTitle}</h3>
            {info.featuredAnnouncementText && <p className="mt-2">{info.featuredAnnouncementText}</p>}
          </div>
        )}

        {/* Table of Contents - inline for mobile */}
        <div className="lg:hidden">
          <TableOfContents 
            blogs={selectedBlogs.map(b => ({ title: b.title, id: b.id }))} 
            tocItems={tocItems}
            variant="inline"
          />
        </div>

        <Separator className="my-8" />

        {/* Two-column layout: Main content + Sticky Sidebar TOC on desktop */}
        <div className="lg:flex lg:gap-8">
          {/* Main Content */}
          <div className="flex-1 min-w-0">
            {/* Blog Posts - Full Content Rendering */}
            {selectedBlogs.length > 0 && (
              <section className="space-y-16">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  <BookOpen className="h-6 w-6" /> Featured Articles
                </h2>
                {selectedBlogs.map((selectedBlog) => {
                  const fullBlog = blogs.get(selectedBlog.id);
                  const blogInfo = fullBlog?.item_info || {};
                  const blocks: ContentBlock[] = blogInfo.blocks || [];
                  const authorName = blogInfo.authorName || selectedBlog.authorName;
                  const authorImage = blogInfo.authorImage || selectedBlog.authorImage;
                  const publishDate = blogInfo.publishDate || selectedBlog.publishDate;
                  const heroImage = blogInfo.heroImage || selectedBlog.heroImage;
                  const tags = fullBlog?.tags || selectedBlog.tags;
                  
                  return (
                    <article key={selectedBlog.id} id={`article-${selectedBlog.id}`} className="scroll-mt-24">
                      {/* Article Hero */}
                      {heroImage && (
                        <img 
                          src={heroImage} 
                          alt={selectedBlog.title} 
                          className="w-full h-64 md:h-80 object-cover rounded-lg mb-6" 
                        />
                      )}
                      
                      {/* Article Header */}
                      <div className="mb-8">
                        <h3 className="text-3xl md:text-4xl font-bold mb-4">{fullBlog?.title || selectedBlog.title}</h3>
                        
                        {/* Author & Date */}
                        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-4">
                          {authorName && (
                            <div className="flex items-center gap-2">
                              {authorImage && (
                                <img src={authorImage} alt={authorName} className="h-8 w-8 rounded-full object-cover" />
                              )}
                              <span className="flex items-center gap-1"><User className="h-4 w-4" /> {authorName}</span>
                            </div>
                          )}
                          {publishDate && (
                            <span className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" /> {format(new Date(publishDate), 'MMMM d, yyyy')}
                            </span>
                          )}
                        </div>
                        
                        {/* Tags */}
                        {tags && (
                          <div className="flex flex-wrap gap-2">
                            {tags.split(',').map((tag: string, i: number) => (
                              <Badge key={i} variant="secondary">{tag.trim()}</Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      
                      {/* Article Content - Render all blocks */}
                      <div className="prose prose-lg max-w-none">
                        {blocks.length > 0 ? (
                          blocks.map((block) => <BlockRenderer key={block.id} block={block} />)
                        ) : (
                          <p className="text-lg text-muted-foreground">{fullBlog?.description || selectedBlog.description}</p>
                        )}
                      </div>
                      
                      {/* Read More Link */}
                      <div className="mt-6 pt-6 border-t">
                        <Link 
                          to={`/blog/${selectedBlog.slug}`} 
                          className="text-primary hover:underline font-medium inline-flex items-center gap-1"
                        >
                          Read full article on blog →
                        </Link>
                      </div>
                      
                      <Separator className="mt-12" />
                    </article>
                  );
                })}
              </section>
            )}

            {/* Custom Sections from newsletter item_info */}
            {info.sections?.length > 0 && (
              <section className="mt-12 space-y-8">
                {info.sections.map((section: any) => (
                  <div key={section.id} className="border-b pb-8">
                    <Badge className="mb-2">{section.sectionType}</Badge>
                    <h3 className="text-2xl font-bold mb-2">{section.title}</h3>
                    {section.authorName && <p className="text-sm text-muted-foreground mb-4">By {section.authorName}</p>}
                    {section.imageUrl && <img src={section.imageUrl} alt={section.title} className="w-full rounded-lg mb-4" />}
                    <p className="whitespace-pre-wrap">{section.content}</p>
                  </div>
                ))}
              </section>
            )}
          </div>

          {/* Sticky Sidebar TOC - desktop only */}
          <aside className="hidden lg:block w-72 flex-shrink-0">
            <TableOfContents 
              blogs={selectedBlogs.map(b => ({ title: b.title, id: b.id }))} 
              tocItems={tocItems}
              variant="sidebar"
            />
          </aside>
        </div>
      </main>
    </div>
  );
}
