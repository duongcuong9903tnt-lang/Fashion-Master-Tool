import type { ImageFile } from '../types';

// Từ P2 (ai-outfit-extractor/utils/imageUtils.ts)
export const fileToImageFile = (file: File): Promise<ImageFile> => {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
        reject(new Error("File is not an image."));
        return;
    }
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      const mimeType = result.substring(result.indexOf(':') + 1, result.indexOf(';'));
      resolve({
        file,
        previewUrl: URL.createObjectURL(file),
        base64,
        mimeType,
      });
    };
    reader.onerror = (error) => reject(error);
  });
};

// Từ P1 (ai-fashion-ad-creator/services/geminiService.ts)
export const base64ToDataUrl = (base64: string, mimeType: string): string => {
  return `data:${mimeType};base64,${base64}`;
};