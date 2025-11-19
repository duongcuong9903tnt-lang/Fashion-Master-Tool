export interface ImageFile {
  file: File;
  previewUrl: string;
  base64: string;
  mimeType: string;
}

// Thêm kiểu ExtractionType từ Dự án 2
export type ExtractionType = 'top' | 'bottom' | 'full';

// Thêm kiểu ImagePayload cho service của P1
export interface ImagePayload {
  base64: string;
  mimeType: string;
}