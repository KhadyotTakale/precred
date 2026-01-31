import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect, useRef } from "react";
import { Helmet } from "react-helmet-async";
import { elegantAPI } from "@/lib/elegant-api";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { ChevronLeft, Calendar, Clock, Info, AlertTriangle, CheckCircle, XCircle, Share2, Twitter, Facebook, Linkedin, Link2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { usePageViewTrigger } from "@/contexts/WorkflowContext";

// Types matching BlogForm
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

// Block Renderer Component
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

// Table of Contents Component
const TableOfContents = ({ blocks }: { blocks: ContentBlock[] }) => {
  const headings = blocks.filter(b => b.type === 'heading' && b.content);
  
  if (headings.length === 0) return null;

  return (
    <Card className="mb-8">
      <CardContent className="p-6">
        <h2 className="text-lg font-semibold mb-4">Table of Contents</h2>
        <nav className="space-y-2">
          {headings.map((heading, index) => (
            <a
              key={heading.id}
              href={`#heading-${index}`}
              className={cn(
                'block text-muted-foreground hover:text-primary transition-colors',
                heading.headingLevel === 'h1' && 'font-semibold',
                heading.headingLevel === 'h2' && 'pl-2',
                heading.headingLevel === 'h3' && 'pl-4 text-sm',
                heading.headingLevel === 'h4' && 'pl-6 text-sm'
              )}
            >
              {heading.content}
            </a>
          ))}
        </nav>
      </CardContent>
    </Card>
  );
};

const BlogDetails = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [readingProgress, setReadingProgress] = useState(0);
  const articleRef = useRef<HTMLElement>(null);

  const { data: blogData, isLoading } = useQuery({
    queryKey: ["blog-details", slug],
    queryFn: () => elegantAPI.getItemDetails(slug!),
    enabled: !!slug,
  });

  // Trigger workflow on page view
  usePageViewTrigger(slug || '', 'blog', blogData ? { id: blogData.id, title: blogData.title, slug: blogData.slug } : undefined, !isLoading && !!blogData, blogData?.id);

  // Reading progress tracking
  useEffect(() => {
    const handleScroll = () => {
      if (!articleRef.current) return;
      
      const article = articleRef.current;
      const articleTop = article.offsetTop;
      const articleHeight = article.offsetHeight;
      const windowHeight = window.innerHeight;
      const scrollY = window.scrollY;
      
      // Calculate how much of the article has been scrolled
      const scrollStart = articleTop - windowHeight / 2;
      const scrollEnd = articleTop + articleHeight - windowHeight / 2;
      const scrollRange = scrollEnd - scrollStart;
      
      if (scrollY <= scrollStart) {
        setReadingProgress(0);
      } else if (scrollY >= scrollEnd) {
        setReadingProgress(100);
      } else {
        const progress = ((scrollY - scrollStart) / scrollRange) * 100;
        setReadingProgress(Math.min(100, Math.max(0, progress)));
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Initial check
    
    return () => window.removeEventListener('scroll', handleScroll);
  }, [blogData]);

  const handleShare = (platform: string) => {
    const url = window.location.href;
    const title = blogData?.title || '';
    
    const shareUrls: Record<string, string> = {
      twitter: `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
    };

    if (platform === 'copy') {
      navigator.clipboard.writeText(url);
      toast({ title: "Link copied to clipboard!" });
    } else {
      window.open(shareUrls[platform], '_blank', 'width=600,height=400');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8 mt-20">
          <Skeleton className="h-8 w-64 mb-4" />
          <Skeleton className="h-12 w-3/4 mb-8" />
          <Skeleton className="h-96 w-full mb-8" />
          <div className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </div>
      </div>
    );
  }

  if (!blogData) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-20 text-center mt-20">
          <h1 className="text-3xl font-bold mb-4">Blog Post Not Found</h1>
          <p className="text-muted-foreground mb-6">The blog post you're looking for doesn't exist or has been removed.</p>
          <Button onClick={() => navigate("/blog")}>Back to Blog</Button>
        </div>
      </div>
    );
  }

  const blogInfo = blogData.item_info || {};
  const tags = blogData.tags?.split(",").map((t) => t.trim()).filter(Boolean) || [];
  const images = blogData._item_images_of_items?.items?.filter(
    (img) => img.image_type === "Image"
  ) || [];
  
  // Get hero image from blogInfo or item images
  const heroImage = blogInfo.heroImage || images[0]?.display_image;
  const heroPosition = blogInfo.heroImagePosition || 'above';
  const author = blogInfo.author || "Anonymous";
  const authorImage = blogInfo.authorImage;
  const publishDate = blogInfo.publishDate || blogInfo.datePublished || blogData.created_at;
  const readTime = blogInfo.readTime || "5 min read";
  const blocks: ContentBlock[] = blogInfo.blocks || [];
  const showTableOfContents = blogInfo.showTableOfContents;

  // Calculate word count from blocks
  const wordCount = blocks.reduce((count, block) => {
    if (block.content) {
      count += block.content.split(/\s+/).filter(Boolean).length;
    }
    if (block.listItems) {
      count += block.listItems.join(' ').split(/\s+/).filter(Boolean).length;
    }
    return count;
  }, 0);

  // Get category from blogInfo or first tag
  const category = blogInfo.category || tags[0] || 'General';

  // Schema.org structured data
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "headline": blogData.title,
    "alternativeHeadline": blogInfo.subtitle || undefined,
    "description": blogData.description,
    "image": heroImage ? {
      "@type": "ImageObject",
      "url": heroImage.startsWith('http') ? heroImage : `${window.location.origin}${heroImage}`,
      "width": 1200,
      "height": 630
    } : undefined,
    "author": {
      "@type": "Person",
      "name": author,
      "image": authorImage ? (authorImage.startsWith('http') ? authorImage : `${window.location.origin}${authorImage}`) : undefined
    },
    "datePublished": publishDate ? new Date(publishDate).toISOString() : undefined,
    "dateModified": blogInfo.lastModified ? new Date(blogInfo.lastModified).toISOString() : (publishDate ? new Date(publishDate).toISOString() : undefined),
    "publisher": {
      "@type": "Organization",
      "name": "Tampa Bay Minerals & Science Club",
      "logo": {
        "@type": "ImageObject",
        "url": `${window.location.origin}/favicon.png`,
        "width": 512,
        "height": 512
      }
    },
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": `${window.location.origin}/blog/${slug}`
    },
    "url": `${window.location.origin}/blog/${slug}`,
    "keywords": tags.length > 0 ? tags.join(', ') : undefined,
    "articleSection": category,
    "wordCount": wordCount > 0 ? wordCount : undefined,
    "inLanguage": "en-US"
  };

  // Remove undefined values from structured data
  const cleanStructuredData = JSON.parse(JSON.stringify(structuredData));

  // Breadcrumb Schema.org structured data
  const breadcrumbStructuredData = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Home",
        "item": `${window.location.origin}/`
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": "Blog",
        "item": `${window.location.origin}/blog`
      },
      {
        "@type": "ListItem",
        "position": 3,
        "name": blogData.title
      }
    ]
  };

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{blogData.title} | Tampa Bay Minerals & Science Club</title>
        <meta name="description" content={blogData.description || `Read ${blogData.title}`} />
        <link rel="canonical" href={`${window.location.origin}/blog/${slug}`} />
        
        {/* Open Graph */}
        <meta property="og:type" content="article" />
        <meta property="og:title" content={blogData.title} />
        <meta property="og:description" content={blogData.description || `Read ${blogData.title}`} />
        <meta property="og:url" content={`${window.location.origin}/blog/${slug}`} />
        {heroImage && <meta property="og:image" content={heroImage} />}
        <meta property="article:published_time" content={publishDate} />
        <meta property="article:author" content={author} />
        {tags.map((tag, i) => (
          <meta key={i} property="article:tag" content={tag} />
        ))}
        
        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={blogData.title} />
        <meta name="twitter:description" content={blogData.description || `Read ${blogData.title}`} />
        {heroImage && <meta name="twitter:image" content={heroImage} />}
        
        {/* Structured Data - BlogPosting */}
        <script type="application/ld+json">
          {JSON.stringify(cleanStructuredData)}
        </script>
        
        {/* Structured Data - Breadcrumb */}
        <script type="application/ld+json">
          {JSON.stringify(breadcrumbStructuredData)}
        </script>
      </Helmet>
      
      {/* Reading Progress Bar */}
      <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-muted">
        <div 
          className="h-full bg-primary transition-all duration-150 ease-out"
          style={{ width: `${readingProgress}%` }}
        />
      </div>
      
      <Navbar />

      {/* Hero Section with Background Image */}
      {heroImage && heroPosition === 'background' && (
        <div className="relative h-[60vh] mt-20">
          <img
            src={heroImage}
            alt={blogData.title}
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div 
            className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent"
            style={{ opacity: blogInfo.heroOverlayOpacity ?? 0.7 }}
          />
          <div className="absolute bottom-0 left-0 right-0 p-8">
            <div className="container mx-auto max-w-4xl">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 drop-shadow-lg">
                {blogData.title}
              </h1>
            </div>
          </div>
        </div>
      )}

      <div className={cn(
        "container mx-auto px-4 py-8",
        heroPosition !== 'background' && 'mt-20'
      )}>
        {/* Breadcrumb */}
        <Breadcrumb className="mb-6">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink onClick={() => navigate("/")} className="cursor-pointer">
                Home
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink onClick={() => navigate("/blog")} className="cursor-pointer">
                Blogs
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage className="line-clamp-1 max-w-[200px]">{blogData.title}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => navigate("/blog")}
          className="mb-6"
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          Back to Blogs
        </Button>

        {/* Blog Content */}
        <article ref={articleRef} className="max-w-4xl mx-auto">
          {/* Header - Only show if not background hero */}
          {heroPosition !== 'background' && (
            <header className="mb-8">
              <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
                {blogData.title}
              </h1>

              {/* Meta Information */}
              <div className="flex flex-wrap items-center gap-4 mb-6">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={authorImage} alt={author} />
                    <AvatarFallback>{author.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-foreground">{author}</p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>
                        {new Date(publishDate).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </span>
                      <span>•</span>
                      <Clock className="h-4 w-4" />
                      <span>{readTime}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tags */}
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-6">
                  {tags.map((tag, index) => (
                    <Badge key={index} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}

              {/* Share Buttons */}
              <div className="flex items-center gap-2 mb-6">
                <span className="text-sm text-muted-foreground mr-2">Share:</span>
                <Button variant="outline" size="icon" onClick={() => handleShare('twitter')}>
                  <Twitter className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={() => handleShare('facebook')}>
                  <Facebook className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={() => handleShare('linkedin')}>
                  <Linkedin className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={() => handleShare('copy')}>
                  <Link2 className="h-4 w-4" />
                </Button>
              </div>

              <Separator />
            </header>
          )}

          {/* Hero Image - Above content */}
          {heroImage && (heroPosition === 'above' || heroPosition === 'full') && (
            <figure className="mb-8">
              <img
                src={heroImage}
                alt={blogData.title}
                className="w-full h-auto rounded-lg object-cover max-h-[500px]"
              />
            </figure>
          )}

          {/* Table of Contents */}
          {showTableOfContents && <TableOfContents blocks={blocks} />}

          {/* Description */}
          {blogData.description && (
            <p className="text-xl text-muted-foreground leading-relaxed mb-8">
              {blogData.description}
            </p>
          )}

          {/* Content Blocks */}
          <div className="prose prose-lg max-w-none">
            {blocks.length > 0 ? (
              blocks.map((block, index) => (
                <div key={block.id} id={block.type === 'heading' ? `heading-${index}` : undefined}>
                  <BlockRenderer block={block} />
                </div>
              ))
            ) : (
              // Fallback to legacy content if no blocks
              blogInfo.content && (
                <div className="text-lg leading-relaxed text-muted-foreground whitespace-pre-wrap">
                  {blogInfo.content}
                </div>
              )
            )}
          </div>

          {/* Hero Image - Below content */}
          {heroImage && heroPosition === 'below' && (
            <figure className="mt-8">
              <img
                src={heroImage}
                alt={blogData.title}
                className="w-full h-auto rounded-lg object-cover max-h-[500px]"
              />
            </figure>
          )}

          {/* Additional Images Gallery */}
          {images.length > 1 && (
            <Card className="mt-12">
              <CardContent className="p-6">
                <h2 className="text-2xl font-bold mb-6">Gallery</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {images.slice(1).map((image) => (
                    <img
                      key={image.id}
                      src={image.display_image}
                      alt="Blog gallery"
                      className="w-full h-48 object-cover rounded-lg"
                      loading="lazy"
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Share Section at Bottom */}
          <Card className="mt-12">
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={authorImage} alt={author} />
                    <AvatarFallback>{author.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold text-foreground">Written by {author}</p>
                    <p className="text-sm text-muted-foreground">
                      Published on {new Date(publishDate).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Share2 className="h-4 w-4 text-muted-foreground" />
                  <Button variant="outline" size="sm" onClick={() => handleShare('twitter')}>
                    <Twitter className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleShare('facebook')}>
                    <Facebook className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleShare('linkedin')}>
                    <Linkedin className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleShare('copy')}>
                    <Link2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </article>
      </div>
    </div>
  );
};

export default BlogDetails;