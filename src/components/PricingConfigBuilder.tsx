import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { DollarSign, Calculator, Plus, Trash2, ChevronDown, ChevronRight, Package } from 'lucide-react';
import { PricingConfig, PriceItem, PartialPayment, generatePriceItemId, migratePricingConfig } from '@/lib/pricing-utils';
import { FormField } from '@/components/FormFieldBuilder';

interface PricingConfigBuilderProps {
  pricingConfig: PricingConfig;
  onPricingConfigChange: (config: PricingConfig) => void;
  formFields: FormField[];
}

export function PricingConfigBuilder({
  pricingConfig: rawConfig,
  onPricingConfigChange,
  formFields
}: PricingConfigBuilderProps) {
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});
  
  // Ensure config is migrated to new format
  const pricingConfig = migratePricingConfig(rawConfig);

  const updateConfig = (updates: Partial<PricingConfig>) => {
    onPricingConfigChange({ ...pricingConfig, ...updates });
  };

  const addPriceItem = () => {
    const newItem: PriceItem = {
      id: generatePriceItemId(),
      label: 'New Price Item',
      type: 'fixed',
      fixedPrice: 0,
    };
    updateConfig({ items: [...(pricingConfig.items || []), newItem] });
    setExpandedItems(prev => ({ ...prev, [newItem.id]: true }));
  };

  const updatePriceItem = (itemId: string, updates: Partial<PriceItem>) => {
    const items = (pricingConfig.items || []).map(item =>
      item.id === itemId ? { ...item, ...updates } : item
    );
    updateConfig({ items });
  };

  const removePriceItem = (itemId: string) => {
    const items = (pricingConfig.items || []).filter(item => item.id !== itemId);
    updateConfig({ items });
  };

  const toggleItemExpanded = (itemId: string) => {
    setExpandedItems(prev => ({ ...prev, [itemId]: !prev[itemId] }));
  };

  const selectableFields = formFields.filter(f => 
    ['select', 'number', 'radio', 'checkbox'].includes(f.type)
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Pricing Configuration</CardTitle>
          </div>
          <Switch
            checked={pricingConfig.enabled}
            onCheckedChange={(checked) => updateConfig({ enabled: checked })}
          />
        </div>
        <CardDescription>
          Configure submission fees and dynamic pricing based on form fields.
        </CardDescription>
      </CardHeader>
      
      {pricingConfig.enabled && (
        <CardContent className="space-y-4">
          {/* Base Price */}
          <div className="space-y-2">
            <Label htmlFor="basePrice">Base Price ($)</Label>
            <Input
              id="basePrice"
              type="number"
              min="0"
              step="0.01"
              value={pricingConfig.basePrice}
              onChange={(e) => updateConfig({ basePrice: parseFloat(e.target.value) || 0 })}
              placeholder="0.00"
              className="max-w-[200px]"
            />
            <p className="text-xs text-muted-foreground">
              Default submission fee applied to all applications
            </p>
          </div>

          {/* Price Items List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-muted-foreground" />
                <Label className="text-sm font-medium">Additional Price Items</Label>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addPriceItem}
                className="h-8"
              >
                <Plus className="h-3 w-3 mr-1" />
                Add Item
              </Button>
            </div>

            {(pricingConfig.items || []).length === 0 ? (
              <div className="text-center py-6 border border-dashed rounded-lg bg-muted/30">
                <Package className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">No additional price items</p>
                <p className="text-xs text-muted-foreground">Click "Add Item" to create add-ons or variable pricing</p>
              </div>
            ) : (
              <div className="space-y-2">
                {(pricingConfig.items || []).map((item, index) => (
                  <Collapsible
                    key={item.id}
                    open={expandedItems[item.id]}
                    onOpenChange={() => toggleItemExpanded(item.id)}
                  >
                    <div className="border rounded-lg bg-card">
                      <CollapsibleTrigger asChild>
                        <div className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/50">
                          <div className="flex items-center gap-2">
                            {expandedItems[item.id] ? (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            )}
                            <span className="font-medium text-sm">{item.label || `Item ${index + 1}`}</span>
                            <span className="text-xs text-muted-foreground px-2 py-0.5 bg-muted rounded">
                              {item.type === 'fixed' ? 'Fixed' : item.type === 'field_price' ? 'Field Price' : 'Quantity'}
                            </span>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              removePriceItem(item.id);
                            }}
                            className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </CollapsibleTrigger>
                      
                      <CollapsibleContent>
                        <div className="p-3 pt-0 space-y-3 border-t">
                          {/* Item Label */}
                          <div className="space-y-1">
                            <Label className="text-xs">Item Label</Label>
                            <Input
                              value={item.label}
                              onChange={(e) => updatePriceItem(item.id, { label: e.target.value })}
                              placeholder="e.g., Extra Table, Premium Booth"
                              className="h-8"
                            />
                          </div>

                          {/* Item Type */}
                          <div className="space-y-1">
                            <Label className="text-xs">Pricing Type</Label>
                            <Select
                              value={item.type}
                              onValueChange={(value: 'fixed' | 'field_price' | 'field_quantity') => 
                                updatePriceItem(item.id, { 
                                  type: value,
                                  fieldId: undefined,
                                  priceMapping: undefined,
                                })
                              }
                            >
                              <SelectTrigger className="h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="fixed">Fixed Price</SelectItem>
                                <SelectItem value="field_price">Price from Field (dropdown options)</SelectItem>
                                <SelectItem value="field_quantity">Quantity × Fixed Price</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Fixed Price Input */}
                          {(item.type === 'fixed' || item.type === 'field_quantity') && (
                            <div className="space-y-1">
                              <Label className="text-xs">
                                {item.type === 'fixed' ? 'Price' : 'Unit Price'}
                              </Label>
                              <div className="relative max-w-[150px]">
                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={item.fixedPrice || ''}
                                  onChange={(e) => updatePriceItem(item.id, { 
                                    fixedPrice: parseFloat(e.target.value) || 0 
                                  })}
                                  placeholder="0.00"
                                  className="h-8 pl-6"
                                />
                              </div>
                            </div>
                          )}

                          {/* Field Selection for field_price or field_quantity */}
                          {(item.type === 'field_price' || item.type === 'field_quantity') && (
                            <div className="space-y-1">
                              <Label className="text-xs">
                                {item.type === 'field_price' ? 'Price Field' : 'Quantity Field'}
                              </Label>
                              <Select
                                value={item.fieldId || 'none'}
                                onValueChange={(value) => updatePriceItem(item.id, { 
                                  fieldId: value === 'none' ? undefined : value,
                                  priceMapping: value === 'none' ? undefined : item.priceMapping,
                                })}
                              >
                                <SelectTrigger className="h-8">
                                  <SelectValue placeholder="Select a field..." />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">Select a field</SelectItem>
                                  {selectableFields.map(field => (
                                    <SelectItem key={field.id} value={field.id}>
                                      {field.label || field.name} ({field.type})
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          )}

                          {/* Price Mapping for Select/Radio Fields */}
                          {item.type === 'field_price' && item.fieldId && 
                           ['select', 'radio'].includes(formFields.find(f => f.id === item.fieldId)?.type || '') && (
                            <div className="space-y-2 p-3 bg-muted/50 rounded-lg">
                              <div className="flex items-center gap-2">
                                <Calculator className="h-3 w-3 text-muted-foreground" />
                                <Label className="text-xs font-medium">Option Prices</Label>
                              </div>
                              <div className="space-y-1.5">
                                {formFields.find(f => f.id === item.fieldId)?.options?.map((option) => (
                                  <div key={option} className="flex items-center gap-2">
                                    <span className="text-xs min-w-[120px] truncate">{option}</span>
                                    <div className="relative flex-1 max-w-[100px]">
                                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">$</span>
                                      <Input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        className="pl-5 h-7 text-xs"
                                        value={item.priceMapping?.[option] ?? ''}
                                        onChange={(e) => updatePriceItem(item.id, {
                                          priceMapping: {
                                            ...item.priceMapping,
                                            [option]: parseFloat(e.target.value) || 0
                                          }
                                        })}
                                        placeholder="0.00"
                                      />
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Quantity Multiplier for fixed and field_price types */}
                          {(item.type === 'fixed' || item.type === 'field_price') && (
                            <div className="space-y-2 pt-2 border-t">
                              <div className="flex items-center gap-2">
                                <Switch
                                  id={`multiply-${item.id}`}
                                  checked={item.isMultiplied ?? false}
                                  onCheckedChange={(checked) => updatePriceItem(item.id, { 
                                    isMultiplied: checked,
                                    quantityFieldId: checked ? item.quantityFieldId : undefined,
                                  })}
                                />
                                <Label htmlFor={`multiply-${item.id}`} className="text-xs">
                                  Multiply by quantity field
                                </Label>
                              </div>
                              
                              {item.isMultiplied && (
                                <Select
                                  value={item.quantityFieldId || 'none'}
                                  onValueChange={(value) => updatePriceItem(item.id, { 
                                    quantityFieldId: value === 'none' ? undefined : value 
                                  })}
                                >
                                  <SelectTrigger className="h-8">
                                    <SelectValue placeholder="Select quantity field..." />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="none">Select a field</SelectItem>
                                    {formFields
                                      .filter(f => f.type === 'number')
                                      .map(field => (
                                        <SelectItem key={field.id} value={field.id}>
                                          {field.label || field.name}
                                        </SelectItem>
                                      ))}
                                  </SelectContent>
                                </Select>
                              )}
                            </div>
                          )}
                        </div>
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
                ))}
              </div>
            )}
          </div>

          {/* Partial Payment / Deposit Configuration */}
          <div className="space-y-3 pt-2 border-t">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calculator className="h-4 w-4 text-muted-foreground" />
                <Label className="text-sm font-medium">Partial Payment / Deposit</Label>
              </div>
              <Switch
                checked={pricingConfig.partialPayment?.enabled ?? false}
                onCheckedChange={(checked) => updateConfig({ 
                  partialPayment: { 
                    ...pricingConfig.partialPayment,
                    enabled: checked,
                    type: pricingConfig.partialPayment?.type || 'percentage',
                    value: pricingConfig.partialPayment?.value || 50,
                  } 
                })}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Charge only a portion of the total amount upfront
            </p>

            {pricingConfig.partialPayment?.enabled && (
              <div className="p-3 bg-muted/50 rounded-lg space-y-3">
                <div className="flex gap-3">
                  <div className="flex-1 space-y-1">
                    <Label className="text-xs">Type</Label>
                    <Select
                      value={pricingConfig.partialPayment.type}
                      onValueChange={(value: 'fixed' | 'percentage' | 'user_selected') => updateConfig({
                        partialPayment: { 
                          ...pricingConfig.partialPayment!, 
                          type: value,
                          userSelectedType: value === 'user_selected' 
                            ? (pricingConfig.partialPayment?.userSelectedType || 'percentage') 
                            : undefined
                        }
                      })}
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percentage">Percentage (%)</SelectItem>
                        <SelectItem value="fixed">Fixed Amount ($)</SelectItem>
                        <SelectItem value="user_selected">User Selected (Optional)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {pricingConfig.partialPayment.type !== 'user_selected' && (
                    <div className="flex-1 space-y-1">
                      <Label className="text-xs">
                        {pricingConfig.partialPayment.type === 'percentage' ? 'Percentage' : 'Amount'}
                      </Label>
                      <div className="relative">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                          {pricingConfig.partialPayment.type === 'percentage' ? '%' : '$'}
                        </span>
                        <Input
                          type="number"
                          min="0"
                          max={pricingConfig.partialPayment.type === 'percentage' ? 100 : undefined}
                          step={pricingConfig.partialPayment.type === 'percentage' ? 1 : 0.01}
                          value={pricingConfig.partialPayment.value || ''}
                          onChange={(e) => updateConfig({
                            partialPayment: { 
                              ...pricingConfig.partialPayment!, 
                              value: parseFloat(e.target.value) || 0 
                            }
                          })}
                          placeholder={pricingConfig.partialPayment.type === 'percentage' ? '50' : '100.00'}
                          className="h-8 pl-6"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* User Selected Options */}
                {pricingConfig.partialPayment.type === 'user_selected' && (
                  <div className="flex gap-3 pt-2 border-t">
                    <div className="flex-1 space-y-1">
                      <Label className="text-xs">Deposit Type</Label>
                      <Select
                        value={pricingConfig.partialPayment.userSelectedType || 'percentage'}
                        onValueChange={(value: 'fixed' | 'percentage') => updateConfig({
                          partialPayment: { 
                            ...pricingConfig.partialPayment!, 
                            userSelectedType: value
                          }
                        })}
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="percentage">Percentage (%)</SelectItem>
                          <SelectItem value="fixed">Fixed Amount ($)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex-1 space-y-1">
                      <Label className="text-xs">
                        {pricingConfig.partialPayment.userSelectedType === 'fixed' ? 'Amount' : 'Percentage'}
                      </Label>
                      <div className="relative">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                          {pricingConfig.partialPayment.userSelectedType === 'fixed' ? '$' : '%'}
                        </span>
                        <Input
                          type="number"
                          min="0"
                          max={pricingConfig.partialPayment.userSelectedType === 'fixed' ? undefined : 100}
                          step={pricingConfig.partialPayment.userSelectedType === 'fixed' ? 0.01 : 1}
                          value={pricingConfig.partialPayment.value || ''}
                          onChange={(e) => updateConfig({
                            partialPayment: { 
                              ...pricingConfig.partialPayment!, 
                              value: parseFloat(e.target.value) || 0 
                            }
                          })}
                          placeholder={pricingConfig.partialPayment.userSelectedType === 'fixed' ? '100.00' : '50'}
                          className="h-8 pl-6"
                        />
                      </div>
                    </div>
                  </div>
                )}

                <p className="text-xs text-muted-foreground">
                  {pricingConfig.partialPayment.type === 'user_selected'
                    ? `User can choose to pay only ${
                        pricingConfig.partialPayment.userSelectedType === 'fixed'
                          ? `$${(pricingConfig.partialPayment.value || 0).toFixed(2)}`
                          : `${pricingConfig.partialPayment.value || 0}%`
                      } as a deposit by checking a checkbox at checkout.`
                    : pricingConfig.partialPayment.type === 'percentage' 
                      ? `${pricingConfig.partialPayment.value || 0}% of the total will be charged at checkout. The remaining balance can be collected later.`
                      : `$${(pricingConfig.partialPayment.value || 0).toFixed(2)} will be charged at checkout. The remaining balance can be collected later.`
                  }
                </p>
              </div>
            )}
          </div>

          {/* Pricing Summary */}
          <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
            <Label className="text-xs font-medium text-primary">Pricing Summary</Label>
            <div className="text-sm text-muted-foreground mt-1 space-y-1">
              <p>
                Base Price: <span className="font-medium text-foreground">${pricingConfig.basePrice.toFixed(2)}</span>
              </p>
              {(pricingConfig.items || []).map((item) => {
                const field = formFields.find(f => f.id === item.fieldId);
                const qtyField = formFields.find(f => f.id === item.quantityFieldId);
                return (
                  <p key={item.id} className="text-xs">
                    + {item.label}:{' '}
                    {item.type === 'fixed' && <>${item.fixedPrice?.toFixed(2) || '0.00'}</>}
                    {item.type === 'field_price' && field && <>Variable (from "{field.label}")</>}
                    {item.type === 'field_quantity' && field && <>${item.fixedPrice?.toFixed(2) || '0.00'} × "{field.label}"</>}
                    {item.isMultiplied && qtyField && <> × "{qtyField.label}"</>}
                  </p>
                );
              })}
              {pricingConfig.partialPayment?.enabled && (
                <p className="text-xs pt-1 border-t mt-2">
                  <span className="text-amber-600 dark:text-amber-400">⚡ Partial Payment:</span>{' '}
                  {pricingConfig.partialPayment.type === 'user_selected'
                    ? `Optional - ${pricingConfig.partialPayment.userSelectedType === 'fixed' 
                        ? `$${pricingConfig.partialPayment.value.toFixed(2)}` 
                        : `${pricingConfig.partialPayment.value}%`} deposit if user opts in`
                    : pricingConfig.partialPayment.type === 'percentage' 
                      ? `${pricingConfig.partialPayment.value}% due at checkout`
                      : `$${pricingConfig.partialPayment.value.toFixed(2)} due at checkout`
                  }
                </p>
              )}
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
