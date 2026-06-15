'use client';

import React, { useState } from 'react';
import { Scale, Delete } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Product } from '@/lib/types';
import { formatCurrency, calculateWeighablePrice } from '@/lib/utils';

interface WeighableModalProps {
    product: Product | null;
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (weight: number) => void;
}

export function WeighableModal({ product, isOpen, onClose, onConfirm }: WeighableModalProps) {
    const [weight, setWeight] = useState('');

    React.useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isOpen) return;

            // Handle numbers
            if (/^[0-9]$/.test(e.key)) {
                e.preventDefault();
                setWeight(prev => prev + e.key);
            }
            // Handle backspace
            else if (e.key === 'Backspace') {
                e.preventDefault();
                setWeight(prev => prev.slice(0, -1));
            }
            // Handle enter
            else if (e.key === 'Enter') {
                e.preventDefault();
                const weightInGrams = parseFloat(weight);
                if (weightInGrams > 0) {
                    onConfirm(weightInGrams);
                    setWeight('');
                    onClose();
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, weight, onConfirm, onClose]);

    const handleNumberClick = (num: string) => {
        setWeight(prev => prev + num);
    };

    const handleDelete = () => {
        setWeight(prev => prev.slice(0, -1));
    };

    const handleClear = () => {
        setWeight('');
    };

    const handleConfirm = () => {
        const weightInGrams = parseFloat(weight);
        if (weightInGrams > 0) {
            onConfirm(weightInGrams);
            setWeight('');
            onClose();
        }
    };

    const handleCancel = () => {
        setWeight('');
        onClose();
    };

    if (!product) return null;

    const weightInGrams = parseFloat(weight) || 0;
    const calculatedPrice = calculateWeighablePrice(product.precio_venta, weightInGrams);

    return (
        <Dialog open={isOpen} onOpenChange={handleCancel}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Scale className="w-5 h-5 text-gold" />
                        Ingresar Peso
                    </DialogTitle>
                    <DialogDescription>
                        {product.nombre} - {formatCurrency(product.precio_venta)}/kg
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    {/* Display */}
                    <div className="bg-accent rounded-lg p-6 text-center">
                        <div className="text-4xl font-bold font-mono mb-2">
                            {weight || '0'} <span className="text-2xl text-muted-foreground">g</span>
                        </div>
                        <div className="text-sm text-muted-foreground mb-2">
                            {(weightInGrams / 1000).toFixed(3)} kg
                        </div>
                        <div className="text-2xl font-semibold text-gold">
                            {formatCurrency(calculatedPrice)}
                        </div>
                    </div>

                    {/* Numeric Keypad */}
                    <div className="grid grid-cols-3 gap-2">
                        {['7', '8', '9', '4', '5', '6', '1', '2', '3'].map((num) => (
                            <Button
                                key={num}
                                variant="outline"
                                size="lg"
                                onClick={() => handleNumberClick(num)}
                                className="text-xl h-14"
                            >
                                {num}
                            </Button>
                        ))}
                        <Button
                            variant="outline"
                            size="lg"
                            onClick={handleClear}
                            className="text-lg h-14"
                        >
                            C
                        </Button>
                        <Button
                            variant="outline"
                            size="lg"
                            onClick={() => handleNumberClick('0')}
                            className="text-xl h-14"
                        >
                            0
                        </Button>
                        <Button
                            variant="outline"
                            size="lg"
                            onClick={handleDelete}
                            className="h-14"
                        >
                            <Delete className="w-5 h-5" />
                        </Button>
                    </div>
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                    <Button variant="outline" onClick={handleCancel}>
                        Cancelar (ESC)
                    </Button>
                    <Button
                        variant="gold"
                        onClick={handleConfirm}
                        disabled={weightInGrams <= 0}
                    >
                        Confirmar (ENTER)
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
