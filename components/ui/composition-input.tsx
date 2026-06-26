"use client";

import * as React from "react";
import { useCompositionControlledInput } from "@/hooks/use-composition-controlled-input";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type CompositionInputProps = Omit<
  React.ComponentProps<typeof Input>,
  "value" | "onChange" | "defaultValue"
> & {
  value: string;
  onValueChange: (value: string) => void;
};

/** shadcn Input with IME-safe controlled updates. */
export function CompositionInput({
  value,
  onValueChange,
  ...props
}: CompositionInputProps) {
  const input = useCompositionControlledInput(value, onValueChange);

  return (
    <Input
      {...props}
      value={input.value}
      onChange={input.onChange}
      onCompositionStart={input.onCompositionStart}
      onCompositionEnd={input.onCompositionEnd}
    />
  );
}

type CompositionSearchInputProps = Omit<
  React.ComponentProps<"input">,
  "value" | "onChange" | "defaultValue"
> & {
  value: string;
  onValueChange: (value: string) => void;
};

/** Native search/text input with IME-safe controlled updates. */
export function CompositionSearchInput({
  value,
  onValueChange,
  className,
  type = "search",
  ...props
}: CompositionSearchInputProps) {
  const input = useCompositionControlledInput(value, onValueChange);

  return (
    <input
      {...props}
      type={type}
      className={cn(className)}
      value={input.value}
      onChange={input.onChange}
      onCompositionStart={input.onCompositionStart}
      onCompositionEnd={input.onCompositionEnd}
    />
  );
}
