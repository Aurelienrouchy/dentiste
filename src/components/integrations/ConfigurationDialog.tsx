import { Integration, IntegrationConfig } from '@/lib/types/integration';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface ConfigurationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedIntegration: Integration | null;
  config: IntegrationConfig;
  onConfigChange: (config: IntegrationConfig) => void;
  onSave: () => Promise<void>;
  loading: boolean;
}

export function ConfigurationDialog({
  open,
  onOpenChange,
  selectedIntegration,
  config,
  onConfigChange,
  onSave,
  loading
}: ConfigurationDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white m:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Configurer {selectedIntegration?.name}</DialogTitle>
          <DialogDescription>
            Entrez les paramètres de connexion pour {selectedIntegration?.name}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="apiKey">Clé API</Label>
            <Input
              id="apiKey"
              placeholder="Entrez votre clé API"
              value={config.apiKey || ''}
              onChange={(e) => onConfigChange({...config, apiKey: e.target.value})}
            />
            <p className="text-xs text-muted-foreground">
              La clé API est fournie par {selectedIntegration?.name}
            </p>
          </div>
          
          {selectedIntegration?.id === 'zapier' && (
            <div className="space-y-2">
              <Label htmlFor="refreshToken">Token de rafraîchissement</Label>
              <Input
                id="refreshToken"
                placeholder="Token de rafraîchissement"
                value={config.refreshToken || ''}
                onChange={(e) => onConfigChange({...config, refreshToken: e.target.value})}
              />
            </div>
          )}
          
          <Separator className="my-4" />
          
          <div className="space-y-4">
            <h4 className="text-sm font-medium">Options de synchronisation</h4>
            
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="syncPatients"
                className="h-4 w-4 rounded border-gray-300 focus:ring-primary"
                checked={!!config.syncPatients}
                onChange={(e) => onConfigChange({...config, syncPatients: e.target.checked})}
              />
              <Label htmlFor="syncPatients">Synchroniser les patients</Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="syncAppointments"
                className="h-4 w-4 rounded border-gray-300 focus:ring-primary"
                checked={!!config.syncAppointments}
                onChange={(e) => onConfigChange({...config, syncAppointments: e.target.checked})}
              />
              <Label htmlFor="syncAppointments">Synchroniser les rendez-vous</Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="syncTreatments"
                className="h-4 w-4 rounded border-gray-300 focus:ring-primary"
                checked={!!config.syncTreatments}
                onChange={(e) => onConfigChange({...config, syncTreatments: e.target.checked})}
              />
              <Label htmlFor="syncTreatments">Synchroniser les traitements</Label>
            </div>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button 
            onClick={onSave} 
            disabled={loading || !config.apiKey}
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Enregistrement...
              </>
            ) : 'Enregistrer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 