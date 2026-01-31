import { useState } from "react";
import { useUser } from "@clerk/clerk-react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { adminAPI } from "@/lib/admin-api";
import { elegantAPI } from "@/lib/elegant-api";
import { toast } from "sonner";
import { Loader2, Mail, Sparkles } from "lucide-react";

const interestOptions = [
  { id: "events", label: "Club Events & Shows" },
  { id: "classes", label: "Educational Classes" },
  { id: "field-trips", label: "Field Trips" },
  { id: "raffles", label: "Raffles & Giveaways" },
  { id: "rock-id", label: "Rock Identification" },
  { id: "lapidary", label: "Lapidary & Jewelry Making" },
];

const formSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100, "Name must be less than 100 characters"),
  email: z.string().trim().email("Invalid email address").max(255, "Email must be less than 255 characters"),
  interests: z.array(z.string()).min(1, "Please select at least one interest"),
});

type FormData = z.infer<typeof formSchema>;

interface NewsletterSubscriptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialEmail?: string;
}

export function NewsletterSubscriptionDialog({
  open,
  onOpenChange,
  initialEmail = "",
}: NewsletterSubscriptionDialogProps) {
  const { user } = useUser();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: user?.fullName || "",
      email: initialEmail || user?.primaryEmailAddress?.emailAddress || "",
      interests: [],
    },
  });

  // Update form when initialEmail changes
  if (initialEmail && form.getValues("email") !== initialEmail && !form.formState.isDirty) {
    form.setValue("email", initialEmail);
  }

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    try {
      // Build the lead payload with interests
      const leadPayload = {
        email: data.email,
        interests: data.interests.join(', '),
        source: 'newsletter-subscription',
      };

      if (user?.id) {
        // Signed-in user: use admin API
        let campaignId: number | null = null;
        
        try {
          const campaignsResponse = await adminAPI.getItems(user.id, 1, 100, 'Campaign');
          const newsletterCampaign = campaignsResponse.items?.find(
            (item) => item.slug === 'newsletter-subscribers'
          );
          
          if (newsletterCampaign) {
            campaignId = newsletterCampaign.id;
          }
        } catch (error) {
          console.warn('Could not fetch campaign:', error);
        }

        const leadResponse = await adminAPI.createLead({
          name: data.name,
          email: data.email,
          status: 'new',
          lead_payload: leadPayload,
        }, user.id);

        if (campaignId && leadResponse?.id) {
          try {
            await adminAPI.assignLeadToCampaign(campaignId, leadResponse.id, user.id);
          } catch (assignError) {
            console.warn('Could not assign to campaign:', assignError);
          }
        }
      } else {
        // Anonymous user: use public CRM API
        await elegantAPI.createPublicLead({
          name: data.name,
          email: data.email,
          payload: leadPayload,
        });
      }

      toast.success("Welcome to our newsletter!", {
        description: "You've been successfully subscribed. Check your inbox for updates!",
      });

      form.reset();
      onOpenChange(false);
    } catch (error) {
      console.error('Newsletter subscription error:', error);
      toast.error("Subscription failed", {
        description: "Please try again or contact us directly.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 rounded-full bg-primary/10">
              <Mail className="h-5 w-5 text-primary" />
            </div>
            <Sparkles className="h-4 w-4 text-accent" />
          </div>
          <DialogTitle className="text-xl">Join Our Newsletter</DialogTitle>
          <DialogDescription>
            Stay updated with club events, classes, and exclusive member content.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Your Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter your name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email Address</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="your@email.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="interests"
              render={() => (
                <FormItem>
                  <FormLabel>What interests you?</FormLabel>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {interestOptions.map((option) => (
                      <FormField
                        key={option.id}
                        control={form.control}
                        name="interests"
                        render={({ field }) => (
                          <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value?.includes(option.id)}
                                onCheckedChange={(checked) => {
                                  const newValue = checked
                                    ? [...field.value, option.id]
                                    : field.value?.filter((v) => v !== option.id);
                                  field.onChange(newValue);
                                }}
                              />
                            </FormControl>
                            <Label className="text-sm font-normal cursor-pointer">
                              {option.label}
                            </Label>
                          </FormItem>
                        )}
                      />
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="flex-1">
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Subscribing...
                  </>
                ) : (
                  "Subscribe"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
