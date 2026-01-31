import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";
import QRCodeCard from "@/components/QRCodeCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Heart, Target, Users, TrendingUp, Share2, Facebook, Twitter, Link as LinkIcon, Mail, ShoppingCart, CheckCircle } from "lucide-react";
import { elegantAPI } from "@/lib/elegant-api";
import { toast } from "sonner";
import { useCart } from "@/contexts/CartContext";
import { usePageViewTrigger } from "@/contexts/WorkflowContext";

interface DonationDetail {
  id: number;
  title: string;
  slug: string;
  description: string;
  item_info?: {
    goal_amount?: number;
    goal_achieved?: number;
    notes?: string;
    about?: string;
  };
  _item_images_of_items?: {
    items?: Array<{
      display_image?: string;
      image_type?: string;
      seq?: number;
    }>;
  };
}

interface SharableLinks {
  facebook?: string;
  twitter?: string;
  linkedin?: string;
  whatsapp?: string;
  email?: string;
  copylink?: string;
}

const DonationDetails = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { addItem } = useCart();
  const [donation, setDonation] = useState<DonationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [donationAmount, setDonationAmount] = useState<number>(25);
  const [customAmount, setCustomAmount] = useState<string>("");
  const [sharableLinks, setSharableLinks] = useState<SharableLinks>({});
  const [linkCopied, setLinkCopied] = useState(false);

  // Trigger workflow on page view
  usePageViewTrigger(slug || '', 'donation', donation ? { id: donation.id, title: donation.title, slug: donation.slug } : undefined, !loading && !!donation, donation?.id);

  const presetAmounts = [10, 25, 50, 100, 250];

  useEffect(() => {
    const fetchDonationDetails = async () => {
      if (!slug) return;
      setLoading(true);
      try {
        const response = await elegantAPI.getItemDetails(slug);
        setDonation(response);
        
        const images = response._item_images_of_items?.items;
        if (images && images.length > 0) {
          const displayImage = images.find((img: any) => img.image_type === 'Image');
          setSelectedImage(displayImage?.display_image || images[0]?.display_image);
        }

        // Fetch sharable links
        if (response.id) {
          try {
            const pageUrl = `${window.location.origin}/donation/${slug}`;
            const links = await elegantAPI.getSharableLinks(response.id, pageUrl, 0, 0);
            setSharableLinks(links);
          } catch (error) {
            console.error('Failed to fetch sharable links:', error);
          }
        }
      } catch (error) {
        console.error('Failed to fetch donation details:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDonationDetails();
  }, [slug]);

  const getProgressPercentage = () => {
    const goalAmount = donation?.item_info?.goal_amount || 0;
    const goalAchieved = donation?.item_info?.goal_achieved || 0;
    return goalAmount > 0 ? Math.min((goalAchieved / goalAmount) * 100, 100) : 0;
  };

  const handleAmountSelect = (amount: number) => {
    setDonationAmount(amount);
    setCustomAmount("");
  };

  const handleCustomAmountChange = (value: string) => {
    setCustomAmount(value);
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue > 0) {
      setDonationAmount(numValue);
    }
  };

  const handleShare = async (platform: 'facebook' | 'twitter' | 'email' | 'copy') => {
    // Track share in Microsoft Clarity
    if (typeof window !== 'undefined' && (window as any).clarity) {
      (window as any).clarity('set', 'share_platform', platform);
      (window as any).clarity('set', 'share_item_type', 'Donation');
      (window as any).clarity('set', 'share_item_id', donation?.id?.toString() || '');
    }

    switch (platform) {
      case 'facebook':
        if (sharableLinks.facebook) {
          window.open(sharableLinks.facebook, '_blank');
        }
        break;
      case 'twitter':
        if (sharableLinks.twitter) {
          window.open(sharableLinks.twitter, '_blank');
        }
        break;
      case 'email':
        if (sharableLinks.email) {
          window.location.href = `mailto:?subject=${encodeURIComponent(donation?.title || '')}&body=${encodeURIComponent(sharableLinks.email)}`;
        }
        break;
      case 'copy':
        if (sharableLinks.copylink) {
          await navigator.clipboard.writeText(sharableLinks.copylink);
          setLinkCopied(true);
          toast.success('Link copied to clipboard!');
          setTimeout(() => setLinkCopied(false), 2000);
        }
        break;
    }
  };

  const handleDonate = () => {
    if (!donation || donationAmount <= 0) return;

    // Get display image
    const images = donation._item_images_of_items?.items || [];
    const displayImage = images.find((img: any) => img.image_type === 'Image')?.display_image || images[0]?.display_image;

    addItem({
      id: donation.id,
      slug: donation.slug,
      title: `${donation.title} - Donation`,
      description: `Donation of $${donationAmount.toFixed(2)}`,
      price: donationAmount,
      currency: 'USD',
      image: displayImage,
      itemType: 'Donation',
      sku: donation.slug,
    });

    navigate('/cart');
  };

  const images = donation?._item_images_of_items?.items || [];
  const goalAmount = donation?.item_info?.goal_amount || 0;
  const goalAchieved = donation?.item_info?.goal_achieved || 0;
  const progress = getProgressPercentage();
  const isGoalReached = progress >= 100;

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 pt-24">
          <Skeleton className="h-8 w-64 mb-8" />
          <div className="grid lg:grid-cols-3 gap-12">
            <div className="lg:col-span-2">
              <Skeleton className="aspect-video rounded-xl mb-6" />
              <Skeleton className="h-12 w-3/4 mb-4" />
              <Skeleton className="h-24 w-full" />
            </div>
            <div>
              <Skeleton className="h-64 w-full rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!donation) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 pt-24 text-center">
          <Heart className="h-24 w-24 mx-auto mb-6 text-muted-foreground" />
          <h1 className="text-3xl font-bold mb-4">Campaign Not Found</h1>
          <p className="text-muted-foreground mb-8">The campaign you're looking for doesn't exist or has been removed.</p>
          <Button asChild>
            <Link to="/donation">View All Campaigns</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{donation.title} - Donate | Tampa Bay Minerals & Science Club</title>
        <meta name="description" content={donation.description || `Support ${donation.title} and help us reach our goal!`} />
        <link rel="canonical" href={`${window.location.origin}/donation/${slug}`} />
        
        <meta property="og:title" content={`${donation.title} - Support Our Campaign`} />
        <meta property="og:description" content={donation.description || `Help us reach our goal of $${goalAmount.toLocaleString()}!`} />
        <meta property="og:url" content={`${window.location.origin}/donation/${slug}`} />
        <meta property="og:type" content="website" />
        {selectedImage && <meta property="og:image" content={selectedImage} />}
        
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={`${donation.title} - Support Our Campaign`} />
        <meta name="twitter:description" content={donation.description || `Help us reach our goal!`} />
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
                <Link to="/donation">Donate</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{donation.title}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      <div className="container mx-auto px-4 pb-16">
        <div className="grid lg:grid-cols-3 gap-12">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Image */}
            <div className="relative aspect-video rounded-xl overflow-hidden bg-muted">
              {selectedImage ? (
                <img
                  src={selectedImage}
                  alt={donation.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-accent/20">
                  <Heart className="h-32 w-32 text-primary/40" />
                </div>
              )}
              
              {isGoalReached && (
                <div className="absolute top-4 right-4">
                  <Badge className="bg-green-500 text-white">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Goal Reached!
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
                      alt={`${donation.title} - Image ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}

            {/* Title & Description */}
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                {donation.title}
              </h1>
              <p className="text-lg text-muted-foreground leading-relaxed">
                {donation.description || 'Support this campaign and help us reach our goal.'}
              </p>
            </div>

            {/* About Section */}
            {donation.item_info?.about && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-primary" />
                    About This Campaign
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground whitespace-pre-wrap">
                    {donation.item_info.about}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* How Donations Help */}
            {donation.item_info?.notes && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Heart className="h-5 w-5 text-primary" />
                    How Your Donation Helps
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground whitespace-pre-wrap">
                    {donation.item_info.notes}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Share Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Share2 className="h-5 w-5 text-primary" />
                  Share This Campaign
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  Help spread the word and increase our reach!
                </p>
                <div className="flex flex-wrap gap-3">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleShare('facebook')}
                    className="gap-2"
                  >
                    <Facebook className="h-4 w-4" />
                    Facebook
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleShare('twitter')}
                    className="gap-2"
                  >
                    <Twitter className="h-4 w-4" />
                    Twitter
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleShare('email')}
                    className="gap-2"
                  >
                    <Mail className="h-4 w-4" />
                    Email
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleShare('copy')}
                    className="gap-2"
                  >
                    {linkCopied ? <CheckCircle className="h-4 w-4 text-green-500" /> : <LinkIcon className="h-4 w-4" />}
                    {linkCopied ? 'Copied!' : 'Copy Link'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar - Donation Widget */}
          <div className="space-y-6">
            {/* Progress Card */}
            <Card className="sticky top-24">
              <CardContent className="pt-6 space-y-6">
                {/* Progress Section */}
                <div className="space-y-3">
                  <div className="flex justify-between items-end">
                    <div>
                      <span className="text-3xl font-bold text-foreground">
                        ${goalAchieved.toLocaleString()}
                      </span>
                      <span className="text-muted-foreground ml-2">raised</span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {progress.toFixed(0)}%
                    </span>
                  </div>
                  <Progress value={progress} className="h-3" />
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Goal: ${goalAmount.toLocaleString()}</span>
                    <span>${(goalAmount - goalAchieved).toLocaleString()} to go</span>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-4 py-4 border-y border-border">
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-primary mb-1">
                      <TrendingUp className="h-4 w-4" />
                    </div>
                    <div className="text-lg font-semibold">{progress.toFixed(0)}%</div>
                    <div className="text-xs text-muted-foreground">Funded</div>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-primary mb-1">
                      <Users className="h-4 w-4" />
                    </div>
                    <div className="text-lg font-semibold">--</div>
                    <div className="text-xs text-muted-foreground">Donors</div>
                  </div>
                </div>

                {/* Donation Amount Selection */}
                <div className="space-y-4">
                  <Label className="text-base font-semibold">Select Amount</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {presetAmounts.map((amount) => (
                      <Button
                        key={amount}
                        variant={donationAmount === amount && !customAmount ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleAmountSelect(amount)}
                        className="w-full"
                      >
                        ${amount}
                      </Button>
                    ))}
                    <div className="col-span-3">
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                        <Input
                          type="number"
                          placeholder="Custom amount"
                          value={customAmount}
                          onChange={(e) => handleCustomAmountChange(e.target.value)}
                          className="pl-7"
                          min="1"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Donate Button */}
                <Button 
                  className="w-full" 
                  size="lg"
                  onClick={handleDonate}
                  disabled={donationAmount <= 0}
                >
                  <ShoppingCart className="h-5 w-5 mr-2" />
                  Add ${donationAmount.toFixed(2)} to Cart
                </Button>

                <p className="text-xs text-center text-muted-foreground">
                  Secure donation processing. Tax-deductible where applicable.
                </p>
              </CardContent>
            </Card>

            {/* QR Code */}
            {sharableLinks.copylink && (
              <QRCodeCard url={sharableLinks.copylink} title="Scan to Donate" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DonationDetails;
