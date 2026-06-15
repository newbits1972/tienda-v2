'use client';

import { useEffect, useCallback } from 'react';

type KeyHandler = () => void;

interface KeyboardShortcuts {
    [key: string]: KeyHandler;
}

export function useKeyboardShortcuts(shortcuts: KeyboardShortcuts) {
    const handleKeyPress = useCallback(
        (event: KeyboardEvent) => {
            // Don't trigger shortcuts when typing in inputs
            if (
                event.target instanceof HTMLInputElement ||
                event.target instanceof HTMLTextAreaElement
            ) {
                // Allow ESC even in inputs
                if (event.key !== 'Escape') {
                    return;
                }
            }

            const key = event.key;

            if (shortcuts[key]) {
                event.preventDefault();
                shortcuts[key]();
            }
        },
        [shortcuts]
    );

    useEffect(() => {
        window.addEventListener('keydown', handleKeyPress);
        return () => {
            window.removeEventListener('keydown', handleKeyPress);
        };
    }, [handleKeyPress]);
}
