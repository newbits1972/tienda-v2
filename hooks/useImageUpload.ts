import { useState } from 'react';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebase/config';

interface UploadResult {
    url: string;
    path: string;
}

export const useImageUpload = () => {
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);

    const uploadImage = async (
        file: File,
        path: string
    ): Promise<UploadResult> => {
        return new Promise((resolve, reject) => {
            // Validations
            if (!file.type.startsWith('image/')) {
                const err = 'El archivo debe ser una imagen';
                setError(err);
                reject(new Error(err));
                return;
            }

            if (file.size > 5 * 1024 * 1024) { // 5MB limit
                const err = 'La imagen no debe pesar más de 5MB';
                setError(err);
                reject(new Error(err));
                return;
            }

            setUploading(true);
            setError(null);
            setProgress(0);

            // Create reference
            // e.g. path = 'products/tenantId/productId/image.jpg'
            const storageRef = ref(storage, path);
            const uploadTask = uploadBytesResumable(storageRef, file);

            uploadTask.on(
                'state_changed',
                (snapshot) => {
                    const prog = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                    setProgress(prog);
                },
                (err) => {
                    setUploading(false);
                    setError(err.message);
                    reject(err);
                },
                async () => {
                    try {
                        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                        setUploading(false);
                        setProgress(100);
                        resolve({
                            url: downloadURL,
                            path: storageRef.fullPath
                        });
                    } catch (err) {
                        setUploading(false);
                        setError('Error al obtener URL de descarga');
                        reject(err);
                    }
                }
            );
        });
    };

    return {
        uploadImage,
        uploading,
        progress,
        error,
        reset: () => {
            setUploading(false);
            setProgress(0);
            setError(null);
        }
    };
};
