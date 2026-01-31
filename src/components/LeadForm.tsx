import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import { adminAPI, type Lead, type CreateLeadRequest } from "@/lib/admin-api";
import { useToast } from "@/hooks/use-toast";

interface LeadFormProps {
  lead?: Lead | null;
  clerkUserId: string;
  onSave: () => void;
  onCancel: () => void;
}

interface LeadFormData {
  name: string;
  email: string;
  mobile_number: string;
  property_address: string;
  first_name: string;
  last_name: string;
  status: string;
  notes: string;
}

const statusOptions = [
  { value: "new", label: "New" },
  { value: "unrefined", label: "Unrefined" },
  { value: "contacted", label: "Contacted" },
  { value: "qualified", label: "Qualified" },
  { value: "converted", label: "Converted" },
  { value: "lost", label: "Lost" },
];

export function LeadForm({ lead, clerkUserId, onSave, onCancel }: LeadFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState(lead?.status || "new");

  const { register, handleSubmit, formState: { errors } } = useForm<LeadFormData>({
    defaultValues: {
      name: lead?.name || "",
      email: lead?.email || lead?.lead_payload?.email || "",
      mobile_number: lead?.lead_payload?.mobile_number || "",
      property_address: lead?.lead_payload?.property_address || "",
      first_name: lead?.lead_payload?.first_name || "",
      last_name: lead?.lead_payload?.last_name || "",
      status: lead?.status || "new",
      notes: lead?.lead_payload?.notes || "",
    },
  });

  const onSubmit = async (data: LeadFormData) => {
    setIsSubmitting(true);
    try {
      const leadPayload: CreateLeadRequest = {
        lead_payload: {
          email: data.email,
          mobile_number: data.mobile_number,
          property_address: data.property_address,
          first_name: data.first_name,
          last_name: data.last_name,
          notes: data.notes,
        },
        name: data.name,
        email: data.email,
        status: status,
      };

      if (lead?.id) {
        await adminAPI.updateLead(lead.id, leadPayload, clerkUserId);
        toast({
          title: "Success",
          description: "Lead updated successfully",
        });
      } else {
        await adminAPI.createLead(leadPayload, clerkUserId);
        toast({
          title: "Success",
          description: "Lead created successfully",
        });
      }
      onSave();
    } catch (error) {
      console.error("Error saving lead:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save lead",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onCancel}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-2xl font-bold">
          {lead?.id ? "Edit Lead" : "Create New Lead"}
        </h2>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                {...register("name", { required: "Name is required" })}
                placeholder="John Doe"
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first_name">First Name</Label>
                <Input
                  id="first_name"
                  {...register("first_name")}
                  placeholder="John"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name">Last Name</Label>
                <Input
                  id="last_name"
                  {...register("last_name")}
                  placeholder="Doe"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  {...register("email", { required: "Email is required" })}
                  placeholder="john@example.com"
                />
                {errors.email && (
                  <p className="text-sm text-destructive">{errors.email.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="mobile_number">Mobile Number</Label>
                <Input
                  id="mobile_number"
                  {...register("mobile_number")}
                  placeholder="18137357723"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="property_address">Address</Label>
              <Textarea
                id="property_address"
                {...register("property_address")}
                placeholder="4518 Holloway Creek Dr, Plant City, FL 33567, USA"
                rows={2}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Lead Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                {...register("notes")}
                placeholder="Additional notes about this lead..."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                {lead?.id ? "Update Lead" : "Create Lead"}
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
