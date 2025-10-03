import * as React from "react";

import { cn } from "@/lib/utils";

interface FormattedTextProps {
  text?: string | null;
  as?: React.ElementType;
  className?: string;
  placeholder?: string;
}

export const FormattedText: React.FC<FormattedTextProps> = ({
  text,
  as: Component = "span",
  className,
  placeholder = "",
}) => {
  const content = text && text.length > 0 ? text : placeholder;

  return (
    <Component className={cn("whitespace-pre-wrap break-words", className)}>
      {content}
    </Component>
  );
};
