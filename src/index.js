// Barrel export — permite tanto:
//   import { Button, formatCPF } from '@posturare/shared'
// quanto import direto por subcaminho:
//   import { Button } from '@posturare/shared/src/ui/button'

export { cn } from './lib/utils';

export { Button, buttonVariants } from './ui/button';
export { Input } from './ui/input';
export { Label } from './ui/label';
export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent } from './ui/card';
export { Checkbox } from './ui/checkbox';
export { Progress } from './ui/progress';
export { useToast, toast } from './ui/use-toast';
export { Toaster } from './ui/toaster';
export {
  Toast,
  ToastAction,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from './ui/toast';

export { default as AnamneseManualWizard } from './components/AnamneseManualWizard';

export {
  removeMask,
  formatCPF,
  formatPhone,
  formatCEP,
  validateCPF,
  validateEmail,
  normalizarTelefone,
  formatarTelefoneExibicao,
  formatWhatsApp,
} from './utils/maskUtils';

export { fetchAddressByCEP } from './utils/viaCepService';

export {
  getAnamneseStatus,
  getPendenciasRevisao,
  contarPendenciasAbertas,
  LABEL_CAMPO_SENSIVEL,
  ENUM_LABELS,
  labelEnum,
} from './utils/anamneseUtils';
