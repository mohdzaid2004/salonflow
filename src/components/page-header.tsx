import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';

type PageHeaderProps = {
  title: string;
  actionButtonText?: string;
  onActionButtonClick?: () => void;
};

export function PageHeader({
  title,
  actionButtonText,
  onActionButtonClick,
}: PageHeaderProps) {
  return (
    <div className="flex items-center">
      <h1 className="font-headline text-3xl md:text-4xl">{title}</h1>
      {actionButtonText && onActionButtonClick && (
        <div className="ml-auto flex items-center gap-2">
          <Button onClick={onActionButtonClick}>
            <PlusCircle className="mr-2 h-4 w-4" />
            {actionButtonText}
          </Button>
        </div>
      )}
    </div>
  );
}
