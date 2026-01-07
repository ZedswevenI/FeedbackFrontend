import * as React from "react";
import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface MultiSelectProps {
  options: { id: number; label: string }[];
  selected: number[];
  onChange: (selected: number[]) => void;
  placeholder?: string;
  className?: string;
}

export function MultiSelect({ options, selected, onChange, placeholder = "Select items...", className }: MultiSelectProps) {
  const [open, setOpen] = React.useState(false);

  const handleSelect = (id: number) => {
    onChange(selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id]);
  };

  const selectedLabels = options.filter((opt) => selected.includes(opt.id)).map((opt) => opt.label);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className={cn("flex min-h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background cursor-pointer", className)}>
          <div className="flex flex-wrap gap-1">
            {selected.length > 0 ? (
              selectedLabels.map((label, idx) => (
                <Badge key={idx} variant="secondary" className="mr-1">
                  {label}
                  <button
                    className="ml-1 rounded-full outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    onKeyDown={(e) => e.key === "Enter" && handleSelect(options.find((o) => o.label === label)!.id)}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleSelect(options.find((o) => o.label === label)!.id);
                    }}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
          </div>
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput placeholder="Search..." />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem key={option.id} onSelect={() => handleSelect(option.id)}>
                  <div className={cn("mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary", selected.includes(option.id) ? "bg-primary text-primary-foreground" : "opacity-50")}>
                    {selected.includes(option.id) && <span className="text-xs">✓</span>}
                  </div>
                  <span>{option.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
