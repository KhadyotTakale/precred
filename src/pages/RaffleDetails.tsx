import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useUser, SignIn } from "@clerk/clerk-react";
import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";
import QRCodeCard from "@/components/QRCodeCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Ticket, Clock, Gift, Users, Trophy, Share2, Facebook, Twitter, Link as LinkIcon, Minus, Plus, Mail, LogIn, CheckCircle, Loader2, Phone } from "lucide-react";
import { elegantAPI } from "@/lib/elegant-api";
import { adminAPI } from "@/lib/admin-api";
import { format, differenceInDays, differenceInHours, differenceInMinutes, isPast } from "date-fns";
import { toast } from "sonner";
import { z } from "zod";
import { usePageViewTrigger } from "@/contexts/WorkflowContext";

interface RaffleDetail {
  id: number;
  title: string;
  slug: string;
  description: string;
  price?: number;
  item_info?: {
    end_date?: string;
    prize_description?: string;
    prize_value?: number;
    total_tickets?: number;
    tickets_sold?: number;
    rules?: string;
    winner?: string;
  };
  _item_images_of_items?: {
    items?: Array<{
      display_image?: string;
      image_type?: string;
      seq?: number;
    }>;
  };
}

const emailSchema = z.object({
  email: z.string().trim().email({ message: "Please enter a valid email address" }),
  name: z.string().trim().min(2, { message: "Name must be at least 2 characters" }).max(100, { message: "Name must be less than 100 characters" }),
  mobileNumber: z.string().trim().optional()
});

const RaffleDetails = () => {
  const { slug } = useParams<{ slug: string }>();
  const { user, isSignedIn, isLoaded } = useUser();
  const [raffle, setRaffle] = useState<RaffleDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showEntryDialog, setShowEntryDialog] = useState(false);
  const [entryMode, setEntryMode] = useState<'login' | 'email'>('email');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [entrySuccess, setEntrySuccess] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; name?: string; mobileNumber?: string }>({});

  // Trigger workflow on page view
  usePageViewTrigger(slug || '', 'raffle', raffle ? { id: raffle.id, title: raffle.title, slug: raffle.slug } : undefined, !loading && !!raffle, raffle?.id);

  const getRaffleUrl = () => {
    return `${window.location.origin}/raffles/${slug}`;
  };

  useEffect(() => {
    const fetchRaffleDetails = async () => {
      if (!slug) return;
      setLoading(true);
      try {
        const response = await elegantAPI.getItemDetails(slug);
        setRaffle(response.item_info ? response : null);
        
        const images = response._item_images_of_items?.items;
        if (images && images.length > 0) {
          const displayImage = images.find((img: any) => img.image_type === 'Image');
          setSelectedImage(displayImage?.display_image || images[0]?.display_image);
        }
      } catch (error) {
        console.error('Failed to fetch raffle details:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRaffleDetails();
  }, [slug]);

  // Pre-fill user data if signed in
  useEffect(() => {
    if (isSignedIn && user) {
      setEmail(user.primaryEmailAddress?.emailAddress || '');
      setName(user.fullName || '');
    }
  }, [isSignedIn, user]);

  const getTimeRemaining = (endDateStr: string | undefined) => {
    if (!endDateStr) return null;
    const endDate = new Date(endDateStr);
    if (isPast(endDate)) return { text: 'Ended', isEnded: true, days: 0, hours: 0, minutes: 0 };
    
    const days = differenceInDays(endDate, new Date());
    const hours = differenceInHours(endDate, new Date()) % 24;
    const minutes = differenceInMinutes(endDate, new Date()) % 60;
    
    return { 
      text: days > 0 ? `${days}d ${hours}h left` : hours > 0 ? `${hours}h ${minutes}m left` : `${minutes}m left`,
      isEnded: false,
      days,
      hours,
      minutes
    };
  };

  const handleShare = async (platform: 'facebook' | 'twitter' | 'copy') => {
    const url = window.location.href;
    const title = raffle?.title || 'Check out this raffle!';
    
    switch (platform) {
      case 'facebook':
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank');
        break;
      case 'twitter':
        window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`, '_blank');
        break;
      case 'copy':
        await navigator.clipboard.writeText(url);
        toast.success('Link copied to clipboard!');
        break;
    }
  };

  const handleEnterRaffle = () => {
    const isFreeRaffle = ticketPrice === 0;
    
    if (isFreeRaffle) {
      // For free raffles, show dialog to collect info (or submit directly if signed in with all info)
      if (isSignedIn && user) {
        // Pre-fill and submit directly for signed-in users
        handleSubmitEntry();
      } else {
        setShowEntryDialog(true);
      }
    } else {
      // For paid raffles, require sign-in
      if (isSignedIn) {
        handleSubmitEntry();
      } else {
        setShowEntryDialog(true);
      }
    }
  };

  const handleSubmitEntry = async () => {
    setErrors({});
    
    const isFreeRaffle = ticketPrice === 0;
    
    // Determine email and name to use
    const entryEmail = isSignedIn && user ? user.primaryEmailAddress?.emailAddress || '' : email;
    const entryName = isSignedIn && user ? user.fullName || '' : name;
    
    // Validate input
    const validation = emailSchema.safeParse({ email: entryEmail, name: entryName, mobileNumber });
    if (!validation.success) {
      const fieldErrors: { email?: string; name?: string; mobileNumber?: string } = {};
      validation.error.errors.forEach((err) => {
        if (err.path[0] === 'email') fieldErrors.email = err.message;
        if (err.path[0] === 'name') fieldErrors.name = err.message;
        if (err.path[0] === 'mobileNumber') fieldErrors.mobileNumber = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    if (!raffle) return;
    
    setSubmitting(true);
    try {
      if (isFreeRaffle) {
        // Free raffle: use elegant API /raffle/entry endpoint - only 1 entry per email
        await elegantAPI.submitFreeRaffleEntry(
          raffle.id,
          entryEmail,
          entryName,
          mobileNumber || undefined,
          user?.id
        );
        
        // Track raffle entry in Microsoft Clarity
        if (typeof window !== 'undefined' && (window as any).clarity) {
          (window as any).clarity('identify', 'raffle_id', raffle.id.toString());
          (window as any).clarity('identify', 'raffle_entry_email', entryEmail);
        }
        
        setEntrySuccess(true);
        toast.success(`Successfully entered ${raffle.title}!`);
      } else {
        // Paid raffle: require sign-in and use admin API /raffle endpoint
        const clerkUserId = user?.id;
        if (!clerkUserId) {
          toast.error('Please sign in to enter the raffle.');
          setSubmitting(false);
          return;
        }
        
        for (let i = 0; i < quantity; i++) {
          await adminAPI.submitRaffleEntry(raffle.id, clerkUserId);
        }
        
        // Track paid raffle entry in Microsoft Clarity
        if (typeof window !== 'undefined' && (window as any).clarity) {
          (window as any).clarity('identify', 'raffle_id', raffle.id.toString());
          (window as any).clarity('identify', 'raffle_tickets', quantity.toString());
        }
        
        setEntrySuccess(true);
        toast.success(`Successfully entered ${quantity} ticket${quantity > 1 ? 's' : ''} for ${raffle.title}!`);
      }
      
      // Close dialog after delay
      setTimeout(() => {
        setShowEntryDialog(false);
        setEntrySuccess(false);
      }, 2000);
    } catch (error) {
      console.error('Failed to submit raffle entry:', error);
      toast.error('Failed to submit entry. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const images = raffle?._item_images_of_items?.items || [];
  const ticketPrice = raffle?.price || 0;
  const endDate = raffle?.item_info?.end_date;
  const timeRemaining = getTimeRemaining(endDate);
  const isEnded = timeRemaining?.isEnded || false;

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 pt-24">
          <Skeleton className="h-8 w-64 mb-8" />
          <div className="grid lg:grid-cols-2 gap-12">
            <Skeleton className="aspect-square rounded-xl" />
            <div className="space-y-6">
              <Skeleton className="h-12 w-3/4" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-48 w-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!raffle) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 pt-24 text-center">
          <Ticket className="h-24 w-24 mx-auto mb-6 text-muted-foreground" />
          <h1 className="text-3xl font-bold mb-4">Raffle Not Found</h1>
          <p className="text-muted-foreground mb-8">The raffle you're looking for doesn't exist or has been removed.</p>
          <Button asChild>
            <Link to="/raffles">View All Raffles</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{raffle.title} - Raffle | Tampa Bay Minerals & Science Club</title>
        <meta name="description" content={raffle.description || `Enter the ${raffle.title} raffle for a chance to win!`} />
        <link rel="canonical" href={`${window.location.origin}/raffles/${slug}`} />
        
        <meta property="og:title" content={`${raffle.title} - Raffle`} />
        <meta property="og:description" content={raffle.description || `Enter for a chance to win!`} />
        <meta property="og:url" content={`${window.location.origin}/raffles/${slug}`} />
        <meta property="og:type" content="product" />
        {selectedImage && <meta property="og:image" content={selectedImage} />}
        
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={`${raffle.title} - Raffle`} />
        <meta name="twitter:description" content={raffle.description || `Enter for a chance to win!`} />
        {selectedImage && <meta name="twitter:image" content={selectedImage} />}
      </Helmet>
      
      <Navbar />
      
      {/* Breadcrumb */}
      <div className="container mx-auto px-4 mt-24 mb-6">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/">Home</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/raffles">Raffles</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{raffle.title}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      <div className="container mx-auto px-4 pb-16">
        <div className="grid lg:grid-cols-2 gap-12">
          {/* Image Gallery */}
          <div className="space-y-4">
            <div className="relative aspect-square rounded-xl overflow-hidden bg-muted">
              {selectedImage ? (
                <img
                  src={selectedImage}
                  alt={raffle.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-accent/20">
                  <Ticket className="h-32 w-32 text-primary/40" />
                </div>
              )}
              
              {timeRemaining && (
                <div className="absolute top-4 right-4">
                  <Badge 
                    variant={isEnded ? "secondary" : "default"}
                    className={isEnded ? "" : "bg-primary text-primary-foreground"}
                  >
                    <Clock className="h-3 w-3 mr-1" />
                    {timeRemaining.text}
                  </Badge>
                </div>
              )}
            </div>

            {images.length > 1 && (
              <div className="flex gap-3 overflow-x-auto pb-2">
                {images.map((img, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImage(img.display_image || null)}
                    className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all ${
                      selectedImage === img.display_image 
                        ? 'border-primary ring-2 ring-primary/30' 
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <img
                      src={img.display_image}
                      alt={`${raffle.title} - Image ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Details */}
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
                {raffle.title}
              </h1>
              <p className="text-lg text-muted-foreground">
                {raffle.description || 'Enter for a chance to win amazing prizes!'}
              </p>
            </div>

            {/* Countdown Timer */}
            {endDate && !isEnded && (
              <Card className="bg-gradient-to-r from-primary/10 to-accent/10 border-primary/20">
                <CardContent className="py-6">
                  <div className="text-center mb-4">
                    <span className="text-sm font-medium text-muted-foreground">Drawing ends in</span>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-4xl font-bold text-primary">{timeRemaining?.days || 0}</div>
                      <div className="text-sm text-muted-foreground">Days</div>
                    </div>
                    <div>
                      <div className="text-4xl font-bold text-primary">{timeRemaining?.hours || 0}</div>
                      <div className="text-sm text-muted-foreground">Hours</div>
                    </div>
                    <div>
                      <div className="text-4xl font-bold text-primary">{timeRemaining?.minutes || 0}</div>
                      <div className="text-sm text-muted-foreground">Minutes</div>
                    </div>
                  </div>
                  <div className="text-center mt-4 text-sm text-muted-foreground">
                    Drawing: {format(new Date(endDate), 'PPP p')}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Winner Announcement */}
            {isEnded && raffle.item_info?.winner && (
              <Card className="bg-gradient-to-r from-yellow-500/10 to-amber-500/10 border-yellow-500/20">
                <CardContent className="py-6 text-center">
                  <Trophy className="h-12 w-12 mx-auto mb-3 text-yellow-500" />
                  <h3 className="text-xl font-bold text-foreground mb-2">Winner Announced!</h3>
                  <p className="text-lg text-muted-foreground">
                    Congratulations to <span className="font-semibold text-foreground">{raffle.item_info.winner}</span>
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Prize Info */}
            {raffle.item_info?.prize_description && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Gift className="h-5 w-5 text-primary" />
                    Prize
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-foreground font-medium">{raffle.item_info.prize_description}</p>
                  {raffle.item_info.prize_value && (
                    <p className="text-sm text-muted-foreground mt-2">
                      Estimated Value: <span className="font-semibold">${raffle.item_info.prize_value.toFixed(2)}</span>
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Entry Section */}
            {!isEnded && (
              <Card className="border-2 border-primary/20">
                <CardContent className="py-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-medium text-foreground">Ticket Price</span>
                    <span className="text-3xl font-bold text-primary">
                      {ticketPrice > 0 ? `$${ticketPrice.toFixed(2)}` : 'Free'}
                    </span>
                  </div>

                  {/* Quantity Selector - Only show for paid raffles */}
                  {ticketPrice > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Number of Entries</span>
                      <div className="flex items-center gap-3">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => setQuantity(Math.max(1, quantity - 1))}
                          disabled={quantity <= 1}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <Input
                          type="number"
                          value={quantity}
                          onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-20 text-center"
                          min={1}
                        />
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => setQuantity(quantity + 1)}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                  
                  {/* Free raffle notice */}
                  {ticketPrice === 0 && (
                    <p className="text-sm text-muted-foreground text-center">
                      One free entry per email address
                    </p>
                  )}

                  {/* Total */}
                  {ticketPrice > 0 && (
                    <div className="flex items-center justify-between py-3 border-t border-border">
                      <span className="text-lg font-medium text-foreground">Total</span>
                      <span className="text-2xl font-bold text-foreground">
                        ${(ticketPrice * quantity).toFixed(2)}
                      </span>
                    </div>
                  )}

                  <Button 
                    className="w-full" 
                    size="lg"
                    onClick={handleEnterRaffle}
                  >
                    <Ticket className="h-5 w-5 mr-2" />
                    {isSignedIn ? `Enter with ${quantity} Ticket${quantity > 1 ? 's' : ''}` : 'Enter Raffle'}
                  </Button>

                  {isSignedIn && (
                    <p className="text-sm text-center text-muted-foreground">
                      Entering as <span className="font-medium text-foreground">{user?.primaryEmailAddress?.emailAddress}</span>
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4">
              {raffle.item_info?.total_tickets && (
                <Card>
                  <CardContent className="py-4 text-center">
                    <Ticket className="h-6 w-6 mx-auto mb-2 text-primary" />
                    <div className="text-2xl font-bold text-foreground">
                      {raffle.item_info.total_tickets}
                    </div>
                    <div className="text-sm text-muted-foreground">Total Tickets</div>
                  </CardContent>
                </Card>
              )}
              {raffle.item_info?.tickets_sold !== undefined && (
                <Card>
                  <CardContent className="py-4 text-center">
                    <Users className="h-6 w-6 mx-auto mb-2 text-accent" />
                    <div className="text-2xl font-bold text-foreground">
                      {raffle.item_info.tickets_sold}
                    </div>
                    <div className="text-sm text-muted-foreground">Entries</div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Rules */}
            {raffle.item_info?.rules && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Rules & Terms</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {raffle.item_info.rules}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Share */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Share2 className="h-5 w-5" />
                  Share This Raffle
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleShare('facebook')}
                    className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                  >
                    <Facebook className="h-5 w-5" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleShare('twitter')}
                    className="text-sky-500 hover:text-sky-600 hover:bg-sky-50"
                  >
                    <Twitter className="h-5 w-5" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleShare('copy')}
                  >
                    <LinkIcon className="h-5 w-5" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* QR Code Section */}
            <QRCodeCard 
              url={getRaffleUrl()} 
              title="Raffle"
              filename={raffle?.slug || 'raffle'}
              itemType="Raffle"
            />
          </div>
        </div>
      </div>

      {/* Entry Dialog */}
      <Dialog open={showEntryDialog} onOpenChange={setShowEntryDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center">Enter Raffle</DialogTitle>
          </DialogHeader>
          
          {entrySuccess ? (
            <div className="py-8 text-center">
              <CheckCircle className="h-16 w-16 mx-auto mb-4 text-green-500" />
              <h3 className="text-xl font-bold text-foreground mb-2">Entry Submitted!</h3>
              <p className="text-muted-foreground">
                Good luck in the {raffle.title} drawing!
              </p>
            </div>
          ) : (
            <Tabs value={entryMode} onValueChange={(v) => setEntryMode(v as 'login' | 'email')} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="email" className="gap-2">
                  <Mail className="h-4 w-4" />
                  Email
                </TabsTrigger>
                <TabsTrigger value="login" className="gap-2">
                  <LogIn className="h-4 w-4" />
                  Sign In
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="email" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    placeholder="Enter your name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                  {errors.name && (
                    <p className="text-sm text-destructive">{errors.name}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  {errors.email && (
                    <p className="text-sm text-destructive">{errors.email}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mobileNumber">
                    Mobile Number <span className="text-muted-foreground text-xs">(optional)</span>
                  </Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="mobileNumber"
                      type="tel"
                      placeholder="Enter your phone number"
                      value={mobileNumber}
                      onChange={(e) => setMobileNumber(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  {errors.mobileNumber && (
                    <p className="text-sm text-destructive">{errors.mobileNumber}</p>
                  )}
                </div>
                
                <div className="bg-muted/50 rounded-lg p-3 space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Entries:</span>
                    <span className="font-medium">{quantity}</span>
                  </div>
                  {ticketPrice > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Total:</span>
                      <span className="font-bold">${(ticketPrice * quantity).toFixed(2)}</span>
                    </div>
                  )}
                </div>

                <Button 
                  className="w-full" 
                  onClick={handleSubmitEntry}
                  disabled={submitting}
                >
                  {submitting ? 'Submitting...' : 'Enter Raffle'}
                </Button>
                
                <p className="text-xs text-center text-muted-foreground">
                  By entering, you agree to the raffle rules and terms.
                </p>
              </TabsContent>
              
              <TabsContent value="login" className="mt-4">
                <div className="flex justify-center">
                  <SignIn 
                    appearance={{
                      elements: {
                        rootBox: "mx-auto",
                        card: "shadow-none border-0 bg-transparent",
                      }
                    }}
                    redirectUrl={`/raffles/${slug}`}
                  />
                </div>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RaffleDetails;