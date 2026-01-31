import { useState, useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';
import { adminAPI, Item } from '@/lib/admin-api';
import { elegantAPI, type ElegantCustomer } from '@/lib/elegant-api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { ImageUploadDialog } from '@/components/ImageUploadDialog';
import { Separator } from '@/components/ui/separator';
import { SortableMediaItem } from '@/components/SortableMediaItem';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, rectSortingStrategy } from '@dnd-kit/sortable';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Plus, Trash2, GripVertical, Eye, FileText, BookOpen, User, Calendar, Check, X, ArrowUp, ArrowDown, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';

interface NewsletterSection {
  id: string;
  title: string;
  content: string;
  pageNumber?: string;
  sectionType: 'article' | 'message' | 'announcement' | 'calendar' | 'custom' | 'blog';
  imageUrl?: string;
  authorName?: string;
  authorTitle?: string;
  authorImageUrl?: string;
  // Blog reference
  blogId?: number;
  blogSlug?: string;
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

interface NewsletterFormProps {
  newsletter?: Item | null;
  onSuccess: () => void;
}

export function NewsletterForm({ newsletter, onSuccess }: NewsletterFormProps) {
  const { user } = useUser();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [customer, setCustomer] = useState<ElegantCustomer | null>(null);

  // Basic fields
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [seoTags, setSeoTags] = useState('');
  const [isDisabled, setIsDisabled] = useState(false);

  // Newsletter specific fields
  const [newsletterTitle, setNewsletterTitle] = useState('THE CORAL GEODE');
  const [issueDate, setIssueDate] = useState('');
  const [issueMonth, setIssueMonth] = useState('');
  const [issueYear, setIssueYear] = useState(new Date().getFullYear().toString());
  const [logoUrl, setLogoUrl] = useState('');
  
  // Cover/Hero section
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [coverHeadline, setCoverHeadline] = useState('');
  const [coverSubheadline, setCoverSubheadline] = useState('');
  const [coverImageCaption, setCoverImageCaption] = useState('');

  // Featured announcement
  const [featuredAnnouncementTitle, setFeaturedAnnouncementTitle] = useState('');
  const [featuredAnnouncementText, setFeaturedAnnouncementText] = useState('');

  // Table of Contents items
  const [tocItems, setTocItems] = useState<Array<{ title: string; pageNumber: string }>>([
    { title: '', pageNumber: '' }
  ]);

  // Sections/Articles
  const [sections, setSections] = useState<NewsletterSection[]>([]);

  // Media items for gallery
  const [imageUrls, setImageUrls] = useState<Array<{ url: string; type: 'Image' | 'Video' | 'YouTube'; id?: number; seq: number }>>([]);

  // Blog selection state
  const [availableBlogs, setAvailableBlogs] = useState<Item[]>([]);
  const [loadingBlogs, setLoadingBlogs] = useState(false);
  const [selectedBlogs, setSelectedBlogs] = useState<SelectedBlog[]>([]);
  const [blogSearchQuery, setBlogSearchQuery] = useState('');

  // Fetch customer data for defaults
  useEffect(() => {
    const fetchCustomer = async () => {
      if (user?.id) {
        try {
          const customerData = await elegantAPI.getCustomer(user.id);
          setCustomer(customerData.customer);
          
          // Set defaults only for new newsletters
          if (!newsletter) {
            const shopName = customerData.customer._shops.name;
            setNewsletterTitle(shopName || 'Newsletter');
          }
        } catch (error) {
          console.error('Failed to fetch customer data:', error);
        }
      }
    };

    fetchCustomer();
  }, [user?.id, newsletter]);

  // Auto-generate slug from title
  useEffect(() => {
    if (!slugManuallyEdited && title) {
      setSlug(generateSlug(title));
    }
  }, [title, slugManuallyEdited]);

  // Load existing newsletter data
  useEffect(() => {
    if (newsletter) {
      setTitle(newsletter.title);
      setSlug(newsletter.slug || '');
      setSlugManuallyEdited(true);
      setDescription(newsletter.description);
      setTags(newsletter.tags || '');
      setSeoTags(newsletter.SEO_Tags || '');
      setIsDisabled(newsletter.Is_disabled);

      if (newsletter.item_info) {
        const info = newsletter.item_info;
        setNewsletterTitle(info.newsletterTitle || 'Newsletter');
        setIssueDate(info.issueDate || '');
        setIssueMonth(info.issueMonth || '');
        setIssueYear(info.issueYear || new Date().getFullYear().toString());
        setLogoUrl(info.logoUrl || '');
        setCoverImageUrl(info.coverImageUrl || '');
        setCoverHeadline(info.coverHeadline || '');
        setCoverSubheadline(info.coverSubheadline || '');
        setCoverImageCaption(info.coverImageCaption || '');
        setFeaturedAnnouncementTitle(info.featuredAnnouncementTitle || '');
        setFeaturedAnnouncementText(info.featuredAnnouncementText || '');
        
        if (info.tocItems && Array.isArray(info.tocItems)) {
          setTocItems(info.tocItems);
        }
        
        if (info.sections && Array.isArray(info.sections)) {
          setSections(info.sections);
        }

        if (info.image && Array.isArray(info.image)) {
          setImageUrls(info.image.map((url: string, index: number) => {
            let type: 'Image' | 'Video' | 'YouTube' = 'Image';
            if (url.includes('youtube.com') || url.includes('youtu.be')) {
              type = 'YouTube';
            } else if (url.match(/\.(mp4|webm|ogg|mov|avi|mkv)$/i)) {
              type = 'Video';
            }
            return { url, type, seq: index };
          }));
        }
        // Load selected blogs
        if (info.selectedBlogs && Array.isArray(info.selectedBlogs)) {
          setSelectedBlogs(info.selectedBlogs);
        }
      }
    }
  }, [newsletter]);

  // Fetch available blogs (published only, from all authors)
  useEffect(() => {
    const fetchBlogs = async () => {
      if (!user?.id) return;
      
      setLoadingBlogs(true);
      try {
        // Fetch all published blogs (no customers_id filter to get all authors)
        const response = await adminAPI.getItems(user.id, 1, 100, 'Blog');
        // Filter to only show published blogs (Is_disabled = false)
        const publishedBlogs = response.items.filter(blog => !blog.Is_disabled);
        setAvailableBlogs(publishedBlogs);
      } catch (error) {
        console.error('Failed to fetch blogs:', error);
      } finally {
        setLoadingBlogs(false);
      }
    };

    fetchBlogs();
  }, [user?.id]);

  const generateSlug = (text: string) => {
    return text.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '');
  };

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // TOC handlers
  const addTocItem = () => {
    setTocItems([...tocItems, { title: '', pageNumber: '' }]);
  };

  const removeTocItem = (index: number) => {
    setTocItems(tocItems.filter((_, i) => i !== index));
  };

  const updateTocItem = (index: number, field: 'title' | 'pageNumber', value: string) => {
    const updated = [...tocItems];
    updated[index][field] = value;
    setTocItems(updated);
  };

  // Section handlers
  const addSection = () => {
    setSections([...sections, {
      id: `section-${Date.now()}`,
      title: '',
      content: '',
      pageNumber: '',
      sectionType: 'article',
    }]);
  };

  const removeSection = (id: string) => {
    setSections(sections.filter(s => s.id !== id));
  };

  const updateSection = (id: string, field: keyof NewsletterSection, value: string) => {
    setSections(sections.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  // Blog selection handlers
  const toggleBlogSelection = (blog: Item) => {
    const isSelected = selectedBlogs.some(b => b.id === blog.id);
    
    if (isSelected) {
      setSelectedBlogs(selectedBlogs.filter(b => b.id !== blog.id));
    } else {
      const authorName = blog.item_info?.author?.name || blog.item_info?.authorName || 'Unknown Author';
      const newBlog: SelectedBlog = {
        id: blog.id,
        title: blog.title,
        slug: blog.slug || '',
        description: blog.description || '',
        authorName,
        authorImage: blog.item_info?.authorImage,
        publishDate: blog.item_info?.publishDate || blog.item_info?.lastModified,
        heroImage: blog.item_info?.heroImage,
        tags: blog.tags,
      };
      setSelectedBlogs([...selectedBlogs, newBlog]);
    }
  };

  const moveBlogUp = (index: number) => {
    if (index === 0) return;
    const newOrder = [...selectedBlogs];
    [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
    setSelectedBlogs(newOrder);
  };

  const moveBlogDown = (index: number) => {
    if (index === selectedBlogs.length - 1) return;
    const newOrder = [...selectedBlogs];
    [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
    setSelectedBlogs(newOrder);
  };

  const removeBlogFromNewsletter = (blogId: number) => {
    setSelectedBlogs(selectedBlogs.filter(b => b.id !== blogId));
  };

  const filteredAvailableBlogs = availableBlogs.filter(blog => {
    if (!blogSearchQuery) return true;
    const searchLower = blogSearchQuery.toLowerCase();
    return (
      blog.title.toLowerCase().includes(searchLower) ||
      blog.description?.toLowerCase().includes(searchLower) ||
      blog.tags?.toLowerCase().includes(searchLower) ||
      blog.item_info?.author?.name?.toLowerCase().includes(searchLower)
    );
  });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = imageUrls.findIndex((item, idx) => idx === active.id);
      const newIndex = imageUrls.findIndex((item, idx) => idx === over.id);

      const newImageUrls = arrayMove(imageUrls, oldIndex, newIndex).map((item, idx) => ({
        ...item,
        seq: idx + 1
      }));
      
      setImageUrls(newImageUrls);
    }
  };

  const handleImageUploaded = async (imageUrl: string, itemId: number, seq: number) => {
    if (!user?.id) return;

    try {
      const mediaItem = imageUrls.find(item => item.url === imageUrl);
      const mediaType = mediaItem?.type || 'Image';

      const response = await adminAPI.createItemImage({
        items_id: itemId,
        display_image: imageUrl,
        seq,
        image_type: mediaType,
        Is_disabled: false,
      }, user.id);

      return response;
    } catch (error) {
      console.error('Failed to associate image:', error);
      throw error;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;

    setSaving(true);
    try {
      // Build newsletter schema
      const newsletterSchema: any = {
        "@context": "https://schema.org",
        "@type": "NewsArticle",
        name: title,
        headline: coverHeadline || title,
        description,
        datePublished: issueDate,
        
        // Newsletter-specific data
        newsletterTitle,
        issueDate,
        issueMonth,
        issueYear,
        logoUrl,
        coverImageUrl,
        coverHeadline,
        coverSubheadline,
        coverImageCaption,
        featuredAnnouncementTitle,
        featuredAnnouncementText,
        tocItems: tocItems.filter(item => item.title.trim()),
        sections,
        selectedBlogs, // Include selected blogs in the newsletter data
      };

      if (imageUrls.length > 0) {
        const imageOnlyUrls = imageUrls
          .filter(item => item.type === 'Image')
          .map(item => item.url);
        
        if (imageOnlyUrls.length > 0) {
          newsletterSchema.image = imageOnlyUrls;
        }
      }

      if (coverImageUrl) {
        newsletterSchema.image = newsletterSchema.image || [];
        if (!newsletterSchema.image.includes(coverImageUrl)) {
          newsletterSchema.image.unshift(coverImageUrl);
        }
      }

      const itemData = {
        item_type: 'Newsletter',
        Is_disabled: isDisabled,
        title,
        description,
        SEO_Tags: seoTags,
        tags,
        slug: slug || generateSlug(title),
        item_info: newsletterSchema,
      };

      let savedItemId: number;

      if (newsletter) {
        await adminAPI.updateItem(newsletter.id, itemData, user.id);
        savedItemId = newsletter.id;
      } else {
        const response = await adminAPI.createItem(itemData, user.id);
        savedItemId = (response as any).id;
      }

      // Associate new images in parallel
      const newImages = imageUrls.filter(
        (mediaItem) => !newsletter?.item_info?.image?.includes(mediaItem.url)
      );
      
      if (newImages.length > 0) {
        await Promise.all(
          newImages.map((mediaItem, index) =>
            handleImageUploaded(mediaItem.url, savedItemId, index + 1)
          )
        );
      }

      toast({
        title: "Success",
        description: `Newsletter ${newsletter ? 'updated' : 'created'} successfully`,
      });
      
      onSuccess();
    } catch (error) {
      console.error('Failed to save newsletter:', error);
      toast({
        title: "Error",
        description: `Failed to ${newsletter ? 'update' : 'create'} newsletter`,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const getSectionTypeLabel = (type: string) => {
    switch (type) {
      case 'message': return "President's Message";
      case 'announcement': return 'Announcement';
      case 'calendar': return 'Calendar';
      case 'article': return 'Article';
      case 'blog': return 'Blog Post';
      default: return 'Custom';
    }
  };

  const getAuthorName = (blog: Item): string => {
    if (blog.item_info?.author?.name) return blog.item_info.author.name;
    if (blog.item_info?.authorName) return blog.item_info.authorName;
    return 'Unknown Author';
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Basic Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Newsletter Issue Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              placeholder="November 2025 Newsletter"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="slug">URL Slug *</Label>
            <Input
              id="slug"
              value={slug}
              onChange={(e) => {
                setSlug(e.target.value);
                setSlugManuallyEdited(true);
              }}
              placeholder="november-2025-newsletter"
              required
            />
            <p className="text-sm text-muted-foreground">
              URL-friendly identifier (auto-generated from title)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Monthly newsletter featuring club news, events, and member stories..."
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="disabled"
              checked={isDisabled}
              onCheckedChange={setIsDisabled}
            />
            <Label htmlFor="disabled">Disable this newsletter (draft mode)</Label>
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Newsletter Header */}
      <Card>
        <CardHeader>
          <CardTitle>Newsletter Header</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="newsletterTitle">Newsletter Title</Label>
            <Input
              id="newsletterTitle"
              value={newsletterTitle}
              onChange={(e) => setNewsletterTitle(e.target.value)}
              placeholder="THE CORAL GEODE"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="issueMonth">Issue Month</Label>
              <Select value={issueMonth} onValueChange={setIssueMonth}>
                <SelectTrigger>
                  <SelectValue placeholder="Select month" />
                </SelectTrigger>
                <SelectContent className="bg-background">
                  {months.map((month) => (
                    <SelectItem key={month} value={month}>{month}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="issueYear">Issue Year</Label>
              <Input
                id="issueYear"
                value={issueYear}
                onChange={(e) => setIssueYear(e.target.value)}
                placeholder="2025"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="issueDate">Publication Date</Label>
            <Input
              id="issueDate"
              type="date"
              value={issueDate}
              onChange={(e) => setIssueDate(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Logo Image</Label>
            <div className="flex items-center gap-4">
              {logoUrl && (
                <img src={logoUrl} alt="Logo" className="h-16 w-16 object-contain rounded border" />
              )}
              <ImageUploadDialog
                onImageUploaded={(url) => setLogoUrl(url)}
                title="Upload Logo"
                description="Upload your newsletter logo"
                buttonText={logoUrl ? "Change Logo" : "Upload Logo"}
              />
              {logoUrl && (
                <Button type="button" variant="outline" size="sm" onClick={() => setLogoUrl('')}>
                  Remove
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Cover Section */}
      <Card>
        <CardHeader>
          <CardTitle>Cover / Hero Section</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Cover Image</Label>
            <div className="flex flex-col gap-4">
              {coverImageUrl && (
                <img 
                  src={coverImageUrl} 
                  alt="Cover" 
                  className="max-h-64 w-full object-cover rounded-lg border" 
                />
              )}
              <div className="flex items-center gap-2">
                <ImageUploadDialog
                  onImageUploaded={(url) => setCoverImageUrl(url)}
                  title="Upload Cover Image"
                  description="Upload the main cover image for your newsletter"
                  buttonText={coverImageUrl ? "Change Cover" : "Upload Cover Image"}
                />
                {coverImageUrl && (
                  <Button type="button" variant="outline" size="sm" onClick={() => setCoverImageUrl('')}>
                    Remove
                  </Button>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="coverHeadline">Cover Headline</Label>
            <Input
              id="coverHeadline"
              value={coverHeadline}
              onChange={(e) => setCoverHeadline(e.target.value)}
              placeholder="Showstoppers!"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="coverSubheadline">Cover Subheadline</Label>
            <Input
              id="coverSubheadline"
              value={coverSubheadline}
              onChange={(e) => setCoverSubheadline(e.target.value)}
              placeholder="And there were lots of them. Page 8"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="coverImageCaption">Image Caption/Credit</Label>
            <Input
              id="coverImageCaption"
              value={coverImageCaption}
              onChange={(e) => setCoverImageCaption(e.target.value)}
              placeholder="Photo by John Doe"
            />
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Table of Contents */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>In This Issue (Table of Contents)</span>
            <Button type="button" variant="outline" size="sm" onClick={addTocItem}>
              <Plus className="h-4 w-4 mr-2" />
              Add Item
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {tocItems.map((item, index) => (
            <div key={index} className="flex items-center gap-3">
              <GripVertical className="h-4 w-4 text-muted-foreground" />
              <Input
                value={item.title}
                onChange={(e) => updateTocItem(index, 'title', e.target.value)}
                placeholder="Section title"
                className="flex-1"
              />
              <Input
                value={item.pageNumber}
                onChange={(e) => updateTocItem(index, 'pageNumber', e.target.value)}
                placeholder="Page #"
                className="w-20"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeTocItem(index)}
                disabled={tocItems.length === 1}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <Separator />

      {/* Featured Announcement */}
      <Card>
        <CardHeader>
          <CardTitle>Featured Announcement</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="featuredAnnouncementTitle">Announcement Title</Label>
            <Input
              id="featuredAnnouncementTitle"
              value={featuredAnnouncementTitle}
              onChange={(e) => setFeaturedAnnouncementTitle(e.target.value)}
              placeholder="Holiday festivities, Dec. 6. See Page 2 for details."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="featuredAnnouncementText">Announcement Details</Label>
            <Textarea
              id="featuredAnnouncementText"
              value={featuredAnnouncementText}
              onChange={(e) => setFeaturedAnnouncementText(e.target.value)}
              rows={3}
              placeholder="Additional details about the announcement..."
            />
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Blog Selection Section */}
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            Newsletter Pages
          </CardTitle>
          <CardDescription>
            Add blog posts as pages to your newsletter. Drag to reorder.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Selected Blogs as Pages */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">
                Pages ({selectedBlogs.length})
              </Label>
            </div>
            
            {selectedBlogs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg bg-muted/30">
                <FileText className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p className="font-medium">No pages added yet</p>
                <p className="text-sm">Browse blogs below and click "Add Page" to include them</p>
              </div>
            ) : (
              <div className="space-y-2">
                {selectedBlogs.map((blog, index) => (
                  <div 
                    key={blog.id} 
                    className="flex items-center gap-3 p-4 bg-card border-2 border-primary/30 rounded-lg shadow-sm"
                  >
                    <div className="flex flex-col gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => moveBlogUp(index)}
                        disabled={index === 0}
                      >
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => moveBlogDown(index)}
                        disabled={index === selectedBlogs.length - 1}
                      >
                        <ArrowDown className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex items-center justify-center h-10 w-10 rounded-full bg-primary/10 text-primary font-bold">
                      {index + 1}
                    </div>
                    {blog.heroImage && (
                      <img 
                        src={blog.heroImage} 
                        alt={blog.title}
                        className="h-16 w-24 object-cover rounded-md"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-sm truncate">{blog.title}</h4>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                        <User className="h-3 w-3" />
                        <span>{blog.authorName}</span>
                        {blog.publishDate && (
                          <>
                            <span>•</span>
                            <Calendar className="h-3 w-3" />
                            <span>{format(new Date(blog.publishDate), 'MMM d, yyyy')}</span>
                          </>
                        )}
                      </div>
                      {blog.tags && (
                        <div className="flex gap-1 mt-1.5 flex-wrap">
                          {blog.tags.split(',').slice(0, 3).map((tag, i) => (
                            <Badge key={i} variant="outline" className="text-[10px] px-1.5 py-0">
                              {tag.trim()}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeBlogFromNewsletter(blog.id)}
                      className="text-destructive border-destructive/30 hover:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Separator />

          {/* Available Blogs */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Browse Blogs</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={blogSearchQuery}
                  onChange={(e) => setBlogSearchQuery(e.target.value)}
                  placeholder="Search by title, author, tag..."
                  className="pl-9 h-9 w-64"
                />
              </div>
            </div>
            
            {loadingBlogs ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading blogs...
              </div>
            ) : filteredAvailableBlogs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground border border-dashed rounded-lg">
                <BookOpen className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p>No published blogs available</p>
                <p className="text-sm">Create and publish blogs to include them in newsletters</p>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {filteredAvailableBlogs.map((blog) => {
                  const isSelected = selectedBlogs.some(b => b.id === blog.id);
                  return (
                    <div
                      key={blog.id}
                      className={`flex flex-col p-4 rounded-lg border transition-all ${
                        isSelected 
                          ? 'bg-primary/5 border-primary/40 opacity-60' 
                          : 'bg-card hover:border-primary/30 hover:shadow-sm'
                      }`}
                    >
                      <div className="flex gap-3">
                        {blog.item_info?.heroImage && (
                          <img 
                            src={blog.item_info.heroImage} 
                            alt={blog.title}
                            className="h-16 w-24 object-cover rounded-md flex-shrink-0"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm line-clamp-2">{blog.title}</h4>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                            <User className="h-3 w-3" />
                            <span>{getAuthorName(blog)}</span>
                          </div>
                          {blog.item_info?.publishDate && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                              <Calendar className="h-3 w-3" />
                              <span>{format(new Date(blog.item_info.publishDate), 'MMM d, yyyy')}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      {blog.description && (
                        <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                          {blog.description}
                        </p>
                      )}
                      <div className="mt-3 pt-3 border-t">
                        {isSelected ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="w-full"
                            disabled
                          >
                            <Check className="h-4 w-4 mr-1" />
                            Added to Newsletter
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            variant="default"
                            size="sm"
                            className="w-full"
                            onClick={() => toggleBlogSelection(blog)}
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            Add Page
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Newsletter Sections/Articles */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Newsletter Sections</span>
            <Button type="button" variant="outline" size="sm" onClick={addSection}>
              <Plus className="h-4 w-4 mr-2" />
              Add Section
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {sections.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground border border-dashed rounded-lg">
              <FileText className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p>No sections added yet</p>
              <p className="text-sm">Click "Add Section" to create newsletter content</p>
            </div>
          ) : (
            sections.map((section, index) => (
              <Card key={section.id} className="border-2">
                <CardHeader className="py-3 px-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                      <Badge variant="secondary">{getSectionTypeLabel(section.sectionType)}</Badge>
                      <span className="font-medium text-sm">{section.title || `Section ${index + 1}`}</span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeSection(section.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 pt-0">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Section Type</Label>
                      <Select 
                        value={section.sectionType} 
                        onValueChange={(v) => updateSection(section.id, 'sectionType', v)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-background">
                          <SelectItem value="message">President's Message</SelectItem>
                          <SelectItem value="article">Article</SelectItem>
                          <SelectItem value="announcement">Announcement</SelectItem>
                          <SelectItem value="calendar">Calendar</SelectItem>
                          <SelectItem value="custom">Custom</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Page Number</Label>
                      <Input
                        value={section.pageNumber || ''}
                        onChange={(e) => updateSection(section.id, 'pageNumber', e.target.value)}
                        placeholder="2"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Section Title</Label>
                    <Input
                      value={section.title}
                      onChange={(e) => updateSection(section.id, 'title', e.target.value)}
                      placeholder="President's Message"
                    />
                  </div>

                  {(section.sectionType === 'message') && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Author Name</Label>
                        <Input
                          value={section.authorName || ''}
                          onChange={(e) => updateSection(section.id, 'authorName', e.target.value)}
                          placeholder="Ellen Sisco"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Author Title</Label>
                        <Input
                          value={section.authorTitle || ''}
                          onChange={(e) => updateSection(section.id, 'authorTitle', e.target.value)}
                          placeholder="President"
                        />
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>Section Image</Label>
                    <div className="flex items-center gap-4">
                      {section.imageUrl && (
                        <img 
                          src={section.imageUrl} 
                          alt="Section" 
                          className="h-20 w-20 object-cover rounded border" 
                        />
                      )}
                      <ImageUploadDialog
                        onImageUploaded={(url) => updateSection(section.id, 'imageUrl', url)}
                        title="Upload Section Image"
                        description="Upload an image for this section"
                        buttonText={section.imageUrl ? "Change" : "Upload"}
                      />
                      {section.imageUrl && (
                        <Button 
                          type="button" 
                          variant="outline" 
                          size="sm" 
                          onClick={() => updateSection(section.id, 'imageUrl', '')}
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Content</Label>
                    <Textarea
                      value={section.content}
                      onChange={(e) => updateSection(section.id, 'content', e.target.value)}
                      rows={6}
                      placeholder="Write your section content here..."
                    />
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </CardContent>
      </Card>

      <Separator />

      {/* Additional Media Gallery */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Additional Images</span>
            <ImageUploadDialog
              onImageUploaded={(url, mediaType) => {
                setImageUrls([...imageUrls, { url, type: mediaType || 'Image', seq: imageUrls.length }]);
              }}
              title="Add Image"
              description="Add additional images to the newsletter"
              buttonText="Add Image"
            />
          </CardTitle>
        </CardHeader>
        <CardContent>
          {imageUrls.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground border border-dashed rounded-lg">
              <p>No additional images added</p>
            </div>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={imageUrls.map((_, i) => i)} strategy={rectSortingStrategy}>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {imageUrls.map((media, index) => (
                    <SortableMediaItem
                      key={index}
                      id={index}
                      mediaItem={media}
                      index={index}
                      onRemove={() => {
                        setImageUrls(imageUrls.filter((_, i) => i !== index));
                      }}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </CardContent>
      </Card>

      <Separator />

      {/* SEO */}
      <Card>
        <CardHeader>
          <CardTitle>SEO & Metadata</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="seoTags">SEO Tags</Label>
            <Input
              id="seoTags"
              value={seoTags}
              onChange={(e) => setSeoTags(e.target.value)}
              placeholder="newsletter, club news, minerals, gems"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tags">Tags</Label>
            <Input
              id="tags"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="november, 2025, monthly"
            />
          </div>
        </CardContent>
      </Card>

      {/* Submit Button */}
      <div className="flex justify-end gap-4 sticky bottom-0 bg-background py-4 border-t">
        <Button type="button" variant="outline" onClick={onSuccess}>
          Cancel
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? 'Saving...' : (newsletter ? 'Update Newsletter' : 'Create Newsletter')}
        </Button>
      </div>
    </form>
  );
}
