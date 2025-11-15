'use client';

import React, { useState } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AlertCircle, GripVertical, Trash2, Settings, Eye, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { v4 as uuidv4 } from 'uuid';
import { useMOVValidation } from '@/hooks/useMOVValidation';
import {
  MOVChecklistConfig,
  MOVItem,
  MOVCheckboxItem,
  MOVGroupItem,
  MOVCurrencyInputItem,
  MOVNumberInputItem,
  MOVTextInputItem,
  MOVDateInputItem,
  MOVAssessmentItem,
  MOVRadioGroupItem,
  MOVDropdownItem,
  isMOVCheckboxItem,
  isMOVGroupItem,
  isMOVCurrencyInputItem,
  isMOVNumberInputItem,
  isMOVTextInputItem,
  isMOVDateInputItem,
  isMOVAssessmentItem,
  isMOVRadioGroupItem,
  isMOVDropdownItem,
} from '@/types/mov-checklist';
import { CheckboxItemConfig } from './mov-items/CheckboxItem';
import { GroupItemConfig } from './mov-items/GroupItem';
import { CurrencyInputItemConfig } from './mov-items/CurrencyInputItem';
import { NumberInputItemConfig } from './mov-items/NumberInputItem';
import { TextInputItemConfig } from './mov-items/TextInputItem';
import { DateInputItemConfig } from './mov-items/DateInputItem';
import { AssessmentItemConfig } from './mov-items/AssessmentItem';
import { RadioGroupItemConfig } from './mov-items/RadioGroupItem';
import { DropdownItemConfig } from './mov-items/DropdownItem';

/**
 * MOV Checklist Builder Component
 *
 * Visual builder for creating MOV (Means of Verification) checklists with 9 item types.
 * Aligned with Indicator Builder Specification v1.4.
 *
 * Features:
 * - Left sidebar: Item palette with 9 MOV item type buttons
 * - Main canvas: Drag-drop area for building checklist
 * - Right panel: Item configuration form (appears when item selected)
 * - Drag-and-drop reordering with @hello-pangea/dnd
 *
 * MOV Item Types (9):
 * 1. checkbox - Simple yes/no verification
 * 2. group - Logical grouping with OR logic support
 * 3. currency_input - PHP monetary values with threshold validation
 * 4. number_input - Numeric values with min/max/threshold
 * 5. text_input - Free text fields
 * 6. date_input - Date fields with grace period handling
 * 7. assessment - YES/NO radio for validator judgment
 * 8. radio_group - Single selection from options
 * 9. dropdown - Dropdown selection
 */

// ============================================================================
// Types & Interfaces
// ============================================================================

interface MOVChecklistBuilderProps {
  /** Initial checklist configuration */
  value?: MOVChecklistConfig;

  /** Callback when checklist changes */
  onChange?: (config: MOVChecklistConfig) => void;

  /** Whether the builder is readonly */
  readonly?: boolean;

  /** Custom class name */
  className?: string;
}

// ============================================================================
// MOV Item Type Configuration
// ============================================================================

export interface MOVItemTypeConfig {
  type: string;
  label: string;
  icon: string;
  emoji: string;
  description: string;
  defaultItem: () => Partial<MOVItem>;
}

export const MOV_ITEM_TYPES: Record<string, MOVItemTypeConfig> = {
  checkbox: {
    type: 'checkbox',
    label: 'Checkbox',
    icon: 'CheckSquare',
    emoji: '☑',
    description: 'Simple yes/no verification',
    defaultItem: () => ({
      type: 'checkbox',
      label: 'New Checkbox',
      required: true,
      default_value: false,
    }),
  },
  group: {
    type: 'group',
    label: 'Group',
    icon: 'Folder',
    emoji: '📁',
    description: 'Logical grouping with OR logic support',
    defaultItem: () => ({
      type: 'group',
      label: 'New Group',
      required: true,
      logic_operator: 'AND',
      children: [],
    }),
  },
  currency_input: {
    type: 'currency_input',
    label: 'Currency Input',
    icon: 'DollarSign',
    emoji: '₱',
    description: 'PHP monetary values with threshold validation',
    defaultItem: () => ({
      type: 'currency_input',
      label: 'New Currency Input',
      required: true,
      currency_code: 'PHP',
    }),
  },
  number_input: {
    type: 'number_input',
    label: 'Number Input',
    icon: 'Hash',
    emoji: '#️⃣',
    description: 'Numeric values with min/max/threshold',
    defaultItem: () => ({
      type: 'number_input',
      label: 'New Number Input',
      required: true,
    }),
  },
  text_input: {
    type: 'text_input',
    label: 'Text Input',
    icon: 'Type',
    emoji: '📝',
    description: 'Free text fields',
    defaultItem: () => ({
      type: 'text_input',
      label: 'New Text Input',
      required: true,
    }),
  },
  date_input: {
    type: 'date_input',
    label: 'Date Input',
    icon: 'Calendar',
    emoji: '📅',
    description: 'Date fields with grace period handling',
    defaultItem: () => ({
      type: 'date_input',
      label: 'New Date Input',
      required: true,
      considered_status_enabled: true,
    }),
  },
  assessment: {
    type: 'assessment',
    label: 'Assessment',
    icon: 'CheckCheck',
    emoji: '✓✗',
    description: 'YES/NO radio for validator judgment',
    defaultItem: () => ({
      type: 'assessment',
      label: 'New Assessment',
      required: true,
      assessment_type: 'YES_NO',
    }),
  },
  radio_group: {
    type: 'radio_group',
    label: 'Radio Group',
    icon: 'CircleDot',
    emoji: '🔘',
    description: 'Single selection from options',
    defaultItem: () => ({
      type: 'radio_group',
      label: 'New Radio Group',
      required: true,
      options: [
        { label: 'Option 1', value: 'option1' },
        { label: 'Option 2', value: 'option2' },
      ],
    }),
  },
  dropdown: {
    type: 'dropdown',
    label: 'Dropdown',
    icon: 'ChevronDown',
    emoji: '▼',
    description: 'Dropdown selection',
    defaultItem: () => ({
      type: 'dropdown',
      label: 'New Dropdown',
      required: true,
      allow_multiple: false,
      searchable: false,
      options: [
        { label: 'Option 1', value: 'option1' },
        { label: 'Option 2', value: 'option2' },
      ],
    }),
  },
};

// ============================================================================
// Main Component
// ============================================================================

export default function MOVChecklistBuilder({
  value,
  onChange,
  readonly = false,
  className,
}: MOVChecklistBuilderProps) {
  // State
  const [config, setConfig] = useState<MOVChecklistConfig>(
    value || {
      items: [],
      validation_mode: 'strict',
    }
  );
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [isPaletteOpen, setIsPaletteOpen] = useState(true);

  // Validation
  const validation = useMOVValidation(config);

  // Get selected item
  const selectedItem = config.items.find((item) => item.id === selectedItemId);

  // Get errors for selected item
  const selectedItemErrors = selectedItem
    ? validation.errorsByItem.get(selectedItem.id) || []
    : [];

  // Handlers
  const handleConfigChange = (newConfig: MOVChecklistConfig) => {
    setConfig(newConfig);
    onChange?.(newConfig);
  };

  const handleAddItem = (itemType: string) => {
    const typeConfig = MOV_ITEM_TYPES[itemType];
    if (!typeConfig) return;

    const newItem: MOVItem = {
      id: uuidv4(),
      ...typeConfig.defaultItem(),
    } as MOVItem;

    const newConfig: MOVChecklistConfig = {
      ...config,
      items: [...config.items, newItem],
    };

    handleConfigChange(newConfig);
    setSelectedItemId(newItem.id);
  };

  const handleRemoveItem = (itemId: string) => {
    const newConfig: MOVChecklistConfig = {
      ...config,
      items: config.items.filter((item) => item.id !== itemId),
    };

    handleConfigChange(newConfig);

    if (selectedItemId === itemId) {
      setSelectedItemId(null);
    }
  };

  const handleUpdateItem = (itemId: string, updates: Partial<MOVItem>) => {
    const newConfig: MOVChecklistConfig = {
      ...config,
      items: config.items.map((item) =>
        item.id === itemId ? { ...item, ...updates } : item
      ),
    };

    handleConfigChange(newConfig);
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination || readonly) return;

    const items = Array.from(config.items);
    const [removed] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, removed);

    handleConfigChange({
      ...config,
      items,
    });
  };

  const handleClearAll = () => {
    if (readonly) return;

    if (window.confirm('Are you sure you want to remove all MOV items? This action cannot be undone.')) {
      handleConfigChange({
        ...config,
        items: [],
      });
      setSelectedItemId(null);
    }
  };

  return (
    <div className={cn('flex h-full gap-4', className)}>
      {/* Left Sidebar: Item Palette */}
      {!readonly && (
        <div
          className={cn(
            'flex-shrink-0 transition-all duration-300',
            isPaletteOpen ? 'w-64' : 'w-12'
          )}
        >
          <Card className="h-full dark:bg-gray-800 dark:border-gray-700">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className={cn('text-sm dark:text-gray-100', !isPaletteOpen && 'hidden')}>
                  MOV Item Types
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsPaletteOpen(!isPaletteOpen)}
                  className="h-8 w-8 p-0 dark:text-gray-200 dark:hover:bg-gray-700"
                >
                  {isPaletteOpen ? <X className="h-4 w-4" /> : <Settings className="h-4 w-4" />}
                </Button>
              </div>
            </CardHeader>
            {isPaletteOpen && (
              <CardContent className="space-y-2">
                <p className="text-xs text-muted-foreground dark:text-gray-400 mb-4">
                  Click to add item type to checklist
                </p>
                <div className="space-y-1">
                  {Object.values(MOV_ITEM_TYPES).map((itemType) => (
                    <Button
                      key={itemType.type}
                      variant="outline"
                      size="sm"
                      onClick={() => handleAddItem(itemType.type)}
                      className="w-full justify-start text-left h-auto py-2 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
                      title={itemType.description}
                    >
                      <span className="text-lg mr-2">{itemType.emoji}</span>
                      <span className="text-xs font-normal">{itemType.label}</span>
                    </Button>
                  ))}
                </div>
                <Separator className="my-4 dark:bg-gray-700" />
                <div className="text-xs text-muted-foreground dark:text-gray-400">
                  <p className="font-medium mb-1">9 Item Types:</p>
                  <p className="text-[10px] leading-tight">
                    Checkbox, Group, Currency, Number, Text, Date, Assessment, Radio, Dropdown
                  </p>
                </div>
              </CardContent>
            )}
          </Card>
        </div>
      )}

      {/* Main Canvas: Drag-drop area */}
      <div className="flex-1 min-w-0">
        <Card className="h-full flex flex-col dark:bg-gray-800 dark:border-gray-700">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2 dark:text-gray-100">
                  MOV Checklist
                  {!validation.isValid && (
                    <Badge variant="destructive" className="text-[10px] py-0">
                      {validation.errors.length} error{validation.errors.length !== 1 ? 's' : ''}
                    </Badge>
                  )}
                  {validation.warnings.length > 0 && (
                    <Badge variant="outline" className="text-[10px] py-0 bg-yellow-500/10 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 border-yellow-300 dark:border-yellow-600">
                      {validation.warnings.length} warning{validation.warnings.length !== 1 ? 's' : ''}
                    </Badge>
                  )}
                </CardTitle>
                <p className="text-xs text-muted-foreground dark:text-gray-400 mt-1">
                  {config.items.length} item{config.items.length !== 1 ? 's' : ''}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={config.validation_mode === 'strict' ? 'default' : 'secondary'}>
                  {config.validation_mode}
                </Badge>
                {!readonly && config.items.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearAll}
                    className="text-destructive hover:text-destructive dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-gray-700"
                  >
                    Clear All
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex-1 overflow-auto">
            {config.items.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-8">
                <AlertCircle className="h-12 w-12 text-muted-foreground dark:text-gray-400 mb-4" />
                <p className="text-sm text-muted-foreground dark:text-gray-300 mb-2">No MOV items yet</p>
                <p className="text-xs text-muted-foreground dark:text-gray-400 max-w-sm">
                  {readonly
                    ? 'This indicator has no MOV checklist configured.'
                    : 'Click on item types from the left palette to start building your checklist.'}
                </p>
              </div>
            ) : (
              <DragDropContext onDragEnd={handleDragEnd}>
                <Droppable droppableId="mov-items">
                  {(provided, snapshot) => (
                    <div
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                      className={cn(
                        'space-y-2',
                        snapshot.isDraggingOver && 'bg-accent/20 rounded-md p-2'
                      )}
                    >
                      {config.items.map((item, index) => (
                        <Draggable
                          key={item.id}
                          draggableId={item.id}
                          index={index}
                          isDragDisabled={readonly}
                        >
                          {(provided, snapshot) => {
                            const itemErrors = validation.errorsByItem.get(item.id) || [];
                            const hasErrors = itemErrors.some((e) => e.severity === 'error');
                            const hasWarnings = itemErrors.some((e) => e.severity === 'warning');

                            return (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                className={cn(
                                  'flex items-start gap-2 p-3 rounded-md border bg-card dark:bg-gray-700 dark:border-gray-600',
                                  snapshot.isDragging && 'shadow-lg ring-2 ring-primary',
                                  selectedItemId === item.id && 'ring-2 ring-primary',
                                  hasErrors && 'border-destructive dark:border-red-500 bg-destructive/5 dark:bg-red-950/20',
                                  hasWarnings && !hasErrors && 'border-yellow-500 dark:border-yellow-600 bg-yellow-500/5 dark:bg-yellow-950/20',
                                  'hover:border-primary/50 dark:hover:border-[#fbbf24]/50 transition-all cursor-pointer'
                                )}
                                onClick={() => setSelectedItemId(item.id)}
                              >
                              {/* Drag Handle */}
                              {!readonly && (
                                <div
                                  {...provided.dragHandleProps}
                                  className="mt-0.5 cursor-grab active:cursor-grabbing"
                                >
                                  <GripVertical className="h-5 w-5 text-muted-foreground dark:text-gray-400" />
                                </div>
                              )}

                              {/* Item Content */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-base">
                                    {MOV_ITEM_TYPES[item.type]?.emoji || '📋'}
                                  </span>
                                  <span className="text-sm font-medium dark:text-gray-100">{item.label || 'Untitled'}</span>
                                  <Badge variant="outline" className="text-[10px] py-0">
                                    {MOV_ITEM_TYPES[item.type]?.label || item.type}
                                  </Badge>
                                  {item.required && (
                                    <Badge variant="destructive" className="text-[10px] py-0">
                                      Required
                                    </Badge>
                                  )}
                                  {hasErrors && (
                                    <Badge variant="destructive" className="text-[10px] py-0">
                                      {itemErrors.filter((e) => e.severity === 'error').length} error{itemErrors.filter((e) => e.severity === 'error').length !== 1 ? 's' : ''}
                                    </Badge>
                                  )}
                                  {hasWarnings && !hasErrors && (
                                    <Badge variant="outline" className="text-[10px] py-0 bg-yellow-500/10 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 border-yellow-300 dark:border-yellow-600">
                                      {itemErrors.filter((e) => e.severity === 'warning').length} warning{itemErrors.filter((e) => e.severity === 'warning').length !== 1 ? 's' : ''}
                                    </Badge>
                                  )}
                                </div>
                                {item.help_text && (
                                  <p className="text-xs text-muted-foreground dark:text-gray-400 line-clamp-1">
                                    {item.help_text}
                                  </p>
                                )}
                                {itemErrors.length > 0 && (
                                  <div className="mt-1 space-y-0.5">
                                    {itemErrors.slice(0, 2).map((error, idx) => (
                                      <p
                                        key={idx}
                                        className={cn(
                                          'text-[10px] line-clamp-1',
                                          error.severity === 'error' ? 'text-destructive dark:text-red-400' : 'text-yellow-700 dark:text-yellow-400'
                                        )}
                                      >
                                        {error.message}
                                      </p>
                                    ))}
                                  </div>
                                )}
                              </div>

                              {/* Delete Button */}
                              {!readonly && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRemoveItem(item.id);
                                  }}
                                  className="h-8 w-8 p-0 text-destructive hover:text-destructive dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-gray-600"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          );
                          }}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Right Panel: Item Configuration */}
      {selectedItem && !readonly && (
        <div className="flex-shrink-0 w-80">
          <Card className="h-full dark:bg-gray-800 dark:border-gray-700">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm dark:text-gray-100">Configure Item</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedItemId(null)}
                  className="h-8 w-8 p-0 dark:text-gray-200 dark:hover:bg-gray-700"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-lg">{MOV_ITEM_TYPES[selectedItem.type]?.emoji}</span>
                <Badge variant="outline" className="text-xs dark:border-gray-600 dark:text-gray-200">
                  {MOV_ITEM_TYPES[selectedItem.type]?.label}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 overflow-y-auto max-h-[calc(100vh-200px)]">
              {/* Validation Errors for Selected Item */}
              {selectedItemErrors.length > 0 && (
                <Card className="border-destructive dark:border-red-500 bg-destructive/5 dark:bg-red-950/20">
                  <CardContent className="p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-destructive dark:text-red-400" />
                      <span className="text-xs font-medium dark:text-gray-100">Validation Issues</span>
                    </div>
                    {selectedItemErrors.map((error, idx) => (
                      <div key={idx} className="text-xs">
                        <span className={cn(
                          'font-medium',
                          error.severity === 'error' ? 'text-destructive dark:text-red-400' : 'text-yellow-700 dark:text-yellow-400'
                        )}>
                          {error.severity === 'error' ? '❌' : '⚠️'} {error.field}:
                        </span>{' '}
                        <span className="text-muted-foreground dark:text-gray-400">{error.message}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Render appropriate config component based on item type */}
              {isMOVCheckboxItem(selectedItem) && (
                <CheckboxItemConfig
                  item={selectedItem}
                  onChange={(updates) => handleUpdateItem(selectedItem.id, updates)}
                />
              )}
              {isMOVGroupItem(selectedItem) && (
                <GroupItemConfig
                  item={selectedItem}
                  onChange={(updates) => handleUpdateItem(selectedItem.id, updates)}
                />
              )}
              {isMOVCurrencyInputItem(selectedItem) && (
                <CurrencyInputItemConfig
                  item={selectedItem}
                  onChange={(updates) => handleUpdateItem(selectedItem.id, updates)}
                />
              )}
              {isMOVNumberInputItem(selectedItem) && (
                <NumberInputItemConfig
                  item={selectedItem}
                  onChange={(updates) => handleUpdateItem(selectedItem.id, updates)}
                />
              )}
              {isMOVTextInputItem(selectedItem) && (
                <TextInputItemConfig
                  item={selectedItem}
                  onChange={(updates) => handleUpdateItem(selectedItem.id, updates)}
                />
              )}
              {isMOVDateInputItem(selectedItem) && (
                <DateInputItemConfig
                  item={selectedItem}
                  onChange={(updates) => handleUpdateItem(selectedItem.id, updates)}
                />
              )}
              {isMOVAssessmentItem(selectedItem) && (
                <AssessmentItemConfig
                  item={selectedItem}
                  onChange={(updates) => handleUpdateItem(selectedItem.id, updates)}
                />
              )}
              {isMOVRadioGroupItem(selectedItem) && (
                <RadioGroupItemConfig
                  item={selectedItem}
                  onChange={(updates) => handleUpdateItem(selectedItem.id, updates)}
                />
              )}
              {isMOVDropdownItem(selectedItem) && (
                <DropdownItemConfig
                  item={selectedItem}
                  onChange={(updates) => handleUpdateItem(selectedItem.id, updates)}
                />
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
