import { useState, useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';
import { adminAPI } from '@/lib/admin-api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { ImageUploadDialog } from '@/components/ImageUploadDialog';
import { Separator } from '@/components/ui/separator';
import { SortableMediaItem } from '@/components/SortableMediaItem';
import { Progress } from '@/components/ui/progress';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, rectSortingStrategy } from '@dnd-kit/sortable';
import { Loader2, Target, DollarSign } from 'lucide-react';

interface CampaignItem {
  id: number;
  title: string;
  description: string;
  slug?: string;
  tags?: string;
  SEO_Tags?: string;
  Is_disabled: boolean;
  item_info?: {
    goal_amount?: number;
    goal_achieved?: number;
  };
  _item_images_of_items?: {
    items: Array<{
      id: number;
      display_image: string;
      image_type: 'Image' | 'Video' | 'YouTube';
      seq: number;
    }>;
  };
}

interface CampaignFormProps {
  campaign?: CampaignItem | null;
  onSuccess: () => void;
  itemType?: 'Campaign' | 'Donation';
}

export function CampaignForm({ campaign, onSuccess, itemType = 'Campaign' }: CampaignFormProps) {
  const { user } = useUser();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  // Basic fields
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [seoTags, setSeoTags] = useState('campaign,donation');
  const [isDisabled, setIsDisabled] = useState(false);

  // Campaign specific fields
  const [goalAmount, setGoalAmount] = useState<number>(0);
  const [goalAchieved, setGoalAchieved] = useState<number>(0);

  // Image
  const [imageUrls, setImageUrls] = useState<Array<{ url: string; type: 'Image' | 'Video' | 'YouTube'; id?: number; seq: number }>>([]);

  // Auto-generate slug from title
  useEffect(() => {
    if (!slugManuallyEdited && title) {
      setSlug(generateSlug(title));
    }
  }, [title, slugManuallyEdited]);

  useEffect(() => {
    if (campaign) {
      setTitle(campaign.title);
      setSlug(campaign.slug || '');
      setSlugManuallyEdited(true);
      setDescription(campaign.description);
      setTags(campaign.tags || '');
      setSeoTags(campaign.SEO_Tags || 'campaign,donation');
      setIsDisabled(campaign.Is_disabled);

      // Parse item_info for campaign data
      if (campaign.item_info) {
        const info = campaign.item_info;
        setGoalAmount(info.goal_amount || 0);
        setGoalAchieved(info.goal_achieved || 0);
      }

      // Load existing media items
      if (campaign._item_images_of_items?.items) {
        const mediaItems = campaign._item_images_of_items.items.map((item) => ({
          url: item.display_image,
          type: item.image_type || 'Image',
          id: item.id,
          seq: item.seq || 0,
        }));
        setImageUrls(mediaItems.sort((a, b) => a.seq - b.seq));
      }
    }
  }, [campaign]);

  const generateSlug = (text: string) => {
    return text.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '');
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

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = imageUrls.findIndex((_, idx) => idx === active.id);
      const newIndex = imageUrls.findIndex((_, idx) => idx === over.id);

      const newImageUrls = arrayMove(imageUrls, oldIndex, newIndex).map((item, idx) => ({
        ...item,
        seq: idx + 1
      }));
      
      setImageUrls(newImageUrls);

      if (campaign && user?.id) {
        try {
          for (const [index, mediaItem] of newImageUrls.entries()) {
            if (mediaItem.id) {
              await adminAPI.updateItemImage(mediaItem.id, { seq: index + 1 }, user.id);
            }
          }
          toast({
            title: "Success",
            description: "Media order updated",
          });
        } catch (error) {
          console.error('Failed to update order:', error);
          toast({
            title: "Error",
            description: "Failed to update media order",
            variant: "destructive",
          });
        }
      }
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;

    setSaving(true);
    try {
      // Build campaign item_info object - preserve existing email template settings
      const existingItemInfo = campaign?.item_info || {};
      const campaignInfo: Record<string, any> = {
        ...existingItemInfo, // Preserve email_template_alias, email_template_mappings, etc.
        goal_amount: goalAmount,
        goal_achieved: goalAchieved,
      };

      const itemData = {
        item_type: itemType,
        Is_disabled: isDisabled,
        title,
        description,
        SEO_Tags: seoTags || 'campaign,donation',
        tags,
        slug: slug || generateSlug(title),
        item_info: campaignInfo,
      };

      let savedItemId: number;

      if (campaign) {
        await adminAPI.updateItem(campaign.id, itemData, user.id);
        savedItemId = campaign.id;
      } else {
        const response = await adminAPI.createItem(itemData, user.id);
        savedItemId = (response as any).id;
      }

      // Associate new images
      for (const [index, mediaItem] of imageUrls.entries()) {
        if (!mediaItem.id) {
          await handleImageUploaded(mediaItem.url, savedItemId, index + 1);
        }
      }

      toast({
        title: "Success",
        description: `Campaign ${campaign ? 'updated' : 'created'} successfully`,
      });
      
      onSuccess();
    } catch (error) {
      console.error('Failed to save campaign:', error);
      toast({
        title: "Error",
        description: `Failed to ${campaign ? 'update' : 'create'} campaign`,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // Calculate progress percentage
  const progressPercentage = goalAmount > 0 ? Math.min((goalAchieved / goalAmount) * 100, 100) : 0;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Basic Information</h3>
        
        <div className="space-y-2">
          <Label htmlFor="title">Campaign Name *</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            placeholder="Annual Fundraiser 2024"
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
            placeholder="annual-fundraiser-2024"
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
            rows={4}
            placeholder="Describe the purpose and goals of this campaign..."
          />
        </div>

        <div className="flex items-center space-x-2">
          <Switch
            id="disabled"
            checked={isDisabled}
            onCheckedChange={setIsDisabled}
          />
          <Label htmlFor="disabled">Disable this campaign</Label>
        </div>
      </div>

      <Separator />

      <div className="space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Target className="h-5 w-5" />
          Fundraising Goals
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="goalAmount">Goal Amount ($) *</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="goalAmount"
                type="number"
                min="0"
                step="0.01"
                value={goalAmount}
                onChange={(e) => setGoalAmount(parseFloat(e.target.value) || 0)}
                className="pl-9"
                placeholder="5000"
                required
              />
            </div>
            <p className="text-sm text-muted-foreground">
              The total fundraising goal for this campaign
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="goalAchieved">Amount Raised ($)</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="goalAchieved"
                type="number"
                min="0"
                step="0.01"
                value={goalAchieved}
                onChange={(e) => setGoalAchieved(parseFloat(e.target.value) || 0)}
                className="pl-9"
                placeholder="2500"
              />
            </div>
            <p className="text-sm text-muted-foreground">
              Current amount raised towards the goal
            </p>
          </div>
        </div>

        {/* Progress Preview */}
        <div className="space-y-2 p-4 bg-muted/50 rounded-lg">
          <div className="flex justify-between text-sm">
            <span className="font-medium">Campaign Progress</span>
            <span className="text-muted-foreground">{progressPercentage.toFixed(1)}%</span>
          </div>
          <Progress value={progressPercentage} className="h-3" />
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>${goalAchieved.toLocaleString()} raised</span>
            <span>Goal: ${goalAmount.toLocaleString()}</span>
          </div>
        </div>
      </div>

      <Separator />

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Campaign Media</h3>
        
        <ImageUploadDialog
          onImageUploaded={(url, type) => {
            const newSeq = imageUrls.length + 1;
            setImageUrls([...imageUrls, { url, type: type || 'Image', seq: newSeq }]);
          }}
        />

        {imageUrls.length > 0 && (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={imageUrls.map((_, idx) => idx)}
              strategy={rectSortingStrategy}
            >
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-4">
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
      </div>

      <Separator />

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">SEO & Tags</h3>
        
        <div className="space-y-2">
          <Label htmlFor="tags">Tags</Label>
          <Input
            id="tags"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="fundraiser, charity, community"
          />
          <p className="text-sm text-muted-foreground">
            Comma-separated tags for categorization
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="seoTags">SEO Tags</Label>
          <Input
            id="seoTags"
            value={seoTags}
            onChange={(e) => setSeoTags(e.target.value)}
            placeholder="campaign, donation, fundraiser"
          />
          <p className="text-sm text-muted-foreground">
            Tags for search engine optimization
          </p>
        </div>
      </div>

      <div className="flex justify-end gap-4 pt-4">
        <Button type="submit" disabled={saving}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {campaign ? 'Update Campaign' : 'Create Campaign'}
        </Button>
      </div>
    </form>
  );
}
