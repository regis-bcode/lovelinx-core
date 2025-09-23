import React from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle } from "lucide-react";
import { TAP } from "@/types/tap";

interface TAPSuccessDialogProps {
  isOpen: boolean;
  onClose: () => void;
  tapData: TAP;
  onComplete: () => void;
}

export function TAPSuccessDialog({ isOpen, onClose, tapData, onComplete }: TAPSuccessDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader className="text-center">
          <div className="mx-auto mb-4">
            <CheckCircle className="h-16 w-16 text-green-500" />
          </div>
          <DialogTitle className="text-2xl text-green-700 dark:text-green-400">
            TAP Criada com Sucesso!
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="bg-green-50 dark:bg-green-950/30 p-4 rounded-lg border border-green-200 dark:border-green-800">
            <h3 className="font-semibold text-green-800 dark:text-green-200 mb-2">
              {tapData.nome_projeto}
            </h3>
            <div className="text-sm text-green-700 dark:text-green-300 space-y-1">
              <p><strong>Cliente:</strong> {tapData.cod_cliente}</p>
              <p><strong>GPP:</strong> {tapData.gpp}</p>
              <p><strong>Produto:</strong> {tapData.produto}</p>
              <p><strong>Status:</strong> {tapData.status}</p>
            </div>
          </div>
          
          <div className="text-center text-sm text-muted-foreground">
            A TAP foi salva com sucesso no banco de dados e está disponível no sistema.
          </div>
        </div>

        <DialogFooter className="sm:justify-center">
          <Button onClick={onComplete} className="bg-green-600 hover:bg-green-700">
            Continuar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}