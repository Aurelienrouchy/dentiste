import { Integration } from '@/lib/types/integration';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface SynchronizationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedIntegration: Integration | null;
  onSync: () => Promise<void>;
  syncInProgress: boolean;
  syncResult: { success: boolean; message: string } | null;
}

export function SynchronizationDialog({
  open,
  onOpenChange,
  selectedIntegration,
  onSync,
  syncInProgress,
  syncResult
}: SynchronizationDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white m:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Synchroniser avec {selectedIntegration?.name}</DialogTitle>
          <DialogDescription>
            Vous êtes sur le point de synchroniser vos données avec {selectedIntegration?.name}.
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          {syncResult && (
            <Alert variant={syncResult.success ? "default" : "destructive"}>
              <AlertDescription>{syncResult.message}</AlertDescription>
            </Alert>
          )}
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fermer
          </Button>
          <Button 
            onClick={onSync} 
            disabled={syncInProgress}
          >
            {syncInProgress ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Synchronisation...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Synchroniser maintenant
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 