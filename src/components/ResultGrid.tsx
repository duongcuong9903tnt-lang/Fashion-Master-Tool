import React from 'react';
import type { ImageFile } from '../types';
import { ArrowDownTrayIcon, CheckIcon, ExclamationTriangleIcon, PhotoIcon } from './icons';

interface ResultGridProps {
  sourceImage: ImageFile | null;
  generatedImages: string[];
  onImageClick: (imageBase64: string, isSource?: boolean) => void;
  onDownloadImage?: (imageBase64: string, index: number) => void;
  onVideoClick: (videoBase64: string) => void;
  isLoading: boolean;
  numVariations: number;
  aspectRatio?: string;
  imageDimensions?: Array<{width: number, height: number}>;
  currentLoadingIndex?: number;
  loadingProgress?: { [key: number]: string };
}

const ResultGrid: React.FC<ResultGridProps> = ({
  sourceImage,
  generatedImages,
  onImageClick,
  onDownloadImage,
  onVideoClick,
  isLoading,
  numVariations,
  aspectRatio = '9:16',
  imageDimensions = [],
  currentLoadingIndex = -1,
  loadingProgress = {}
}) => {
  
  const getAspectRatioStyle = (ratio: string): React.CSSProperties => {
    switch (ratio) {
      case '1:1': return { aspectRatio: '1/1' };
      case '4:5': return { aspectRatio: '4/5' };
      case '16:9': return { aspectRatio: '16/9' };
      case '9:16':
      default: return { aspectRatio: '9/16' };
    }
  };

  const calculateTargetSize = (ratio: string): { width: number; height: number } => {
    switch (ratio) {
      case '9:16':
        return { width: 1080, height: 1920 };
      case '1:1':
        return { width: 1080, height: 1080 };
      case '4:5':
        return { width: 1080, height: 1350 };
      case '16:9':
        return { width: 1920, height: 1080 };
      default:
        const [widthRatio, heightRatio] = ratio.split(':').map(Number);
        const baseSize = 1080;
        const calculatedRatio = widthRatio / heightRatio;
        if (calculatedRatio > 1) {
          return { width: Math.round(baseSize * calculatedRatio), height: baseSize };
        } else {
          return { width: baseSize, height: Math.round(baseSize / calculatedRatio) };
        }
    }
  };

  const targetSize = calculateTargetSize(aspectRatio);

  const isCorrectSize = (index: number): boolean => {
    if (!imageDimensions[index]) return false;
    const dim = imageDimensions[index];
    const tolerance = 50;
    return Math.abs(dim.width - targetSize.width) <= tolerance && 
           Math.abs(dim.height - targetSize.height) <= tolerance;
  };

  const getSizeStatus = (index: number): { isValid: boolean; message: string } => {
    if (!imageDimensions[index]) {
      return { isValid: false, message: 'Chưa có thông tin' };
    }
    
    const dim = imageDimensions[index];
    const isValid = isCorrectSize(index);
    
    if (isValid) {
      return { isValid: true, message: `${dim.width}×${dim.height}px ✓` };
    } else {
      return { 
        isValid: false, 
        message: `${dim.width}×${dim.height}px` 
      };
    }
  };

  const getLoadingStatus = (index: number): string => {
    return loadingProgress[index] || 'Đang chờ...';
  };

  // QUAN TRỌNG: Sửa logic hiển thị loading
  const isCurrentlyLoading = (index: number): boolean => {
    // Hiển thị loading nếu:
    // 1. Đang trong batch loading VÀ ảnh này chưa có kết quả
    // 2. HOẶC có progress message đang active
    const hasProgress = loadingProgress[index] && 
                       !loadingProgress[index].includes('Hoàn thành') && 
                       !loadingProgress[index].includes('Lỗi');
    
    return (isLoading && !generatedImages[index]) || hasProgress;
  };

  const variationPrompts = [
    'chính diện - GIỮ NGUYÊN BIỂU CẢM',
    'góc nghiêng 3/4 - GIỮ NGUYÊN BIỂU CẢM', 
    'toàn thân - GIỮ NGUYÊN BIỂU CẢM',
    'chụp từ góc thấp - GIỮ NGUYÊN BIỂU CẢM',
    'chụp cận mặt - BẢO TOÀN NÉT MẶT',
    'nghiêng nhẹ - GIỮ NGUYÊN ĐẶC ĐIỂM',
    'nửa thân trên - BẢO TOÀN BIỂU CẢM',
    'toàn thân đang bước - GIỮ NGUYÊN NÉT MẶT',
    'chính diện tay chống hông - BẢO TOÀN BIỂU CẢM'
  ];

  return (
    <div className="w-full">
      {/* Progress Summary - LUÔN HIỆN KHI LOADING */}
      {isLoading && (
        <div className="mb-6 p-4 bg-blue-900/20 border border-blue-700 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-blue-400 font-semibold">📊 Tiến độ tạo ảnh</h4>
            <span className="text-blue-300 text-sm">
              {generatedImages.filter(img => img && img.length > 0).length}/{numVariations} hoàn thành
            </span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div 
              className="bg-blue-500 h-2 rounded-full transition-all duration-500"
              style={{ 
                width: `${(generatedImages.filter(img => img && img.length > 0).length / numVariations) * 100}%` 
              }}
            />
          </div>
          {/* Hiển thị trạng thái của 3 ảnh đang xử lý */}
          <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
            {Array.from({ length: 3 }).map((_, i) => {
              const loadingIndex = currentLoadingIndex + i;
              if (loadingIndex < numVariations && loadingIndex >= 0) {
                return (
                  <div key={loadingIndex} className="bg-blue-900/30 p-2 rounded text-blue-300">
                    <div className="font-medium">Ảnh #{loadingIndex + 1}</div>
                    <div className="text-xs">{getLoadingStatus(loadingIndex)}</div>
                  </div>
                );
              }
              return null;
            }).filter(Boolean)}
          </div>
        </div>
      )}

      {/* Grid Images */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Ảnh gốc */}
        {sourceImage && (
          <div className="relative group">
            <div 
              className="bg-gray-700 rounded-lg overflow-hidden shadow-lg border-2 border-blue-500 cursor-pointer hover:border-blue-400 transition-all duration-300"
              style={getAspectRatioStyle(aspectRatio)}
            >
              <img
                src={sourceImage.previewUrl}
                alt="Ảnh người mẫu gốc"
                className="w-full h-full object-cover"
                onClick={() => onImageClick(sourceImage.base64, true)}
              />
              
              {/* Overlay info */}
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-300 flex items-center justify-center">
                <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-white text-sm font-medium bg-black bg-opacity-70 px-3 py-2 rounded">
                  👆 Click để xem & tải
                </div>
              </div>
            </div>
            
            <div className="absolute top-2 left-2 bg-blue-600 text-white px-2 py-1 rounded text-xs font-medium">
              Ảnh gốc
            </div>
            <div className="absolute top-2 right-2 bg-gray-800 text-white px-2 py-1 rounded text-xs">
              {sourceImage.file ? `${Math.round(sourceImage.file.size / 1024)}KB` : 'N/A'}
            </div>
          </div>
        )}

        {/* Ảnh được tạo */}
        {Array.from({ length: numVariations }).map((_, index) => {
          const imageBase64 = generatedImages[index];
          const sizeStatus = getSizeStatus(index);
          const isLoadingImage = isCurrentlyLoading(index);
          const hasError = !isLoadingImage && generatedImages.some(img => img && img.length > 0) && !imageBase64 && generatedImages[index] === '';
          
          return (
            <div key={index} className="relative group">
              <div 
                className={`
                  rounded-lg overflow-hidden shadow-lg border-2 transition-all duration-300
                  ${isLoadingImage 
                    ? 'border-blue-500 animate-pulse bg-gradient-to-br from-blue-900/20 to-purple-900/20' 
                    : imageBase64 
                      ? sizeStatus.isValid 
                        ? 'border-green-500 cursor-pointer hover:border-green-400 hover:shadow-xl' 
                        : 'border-yellow-500 cursor-pointer hover:border-yellow-400 hover:shadow-xl'
                      : hasError
                        ? 'border-red-500 bg-gradient-to-br from-red-900/20 to-orange-900/20'
                        : 'border-gray-600 bg-gradient-to-br from-gray-800 to-gray-700'
                  }
                `}
                style={getAspectRatioStyle(aspectRatio)}
                onClick={() => imageBase64 && onImageClick(imageBase64)}
              >
                {imageBase64 ? (
                  // Ảnh đã tạo xong
                  <>
                    <img
                      src={`data:image/png;base64,${imageBase64}`}
                      alt={`Ảnh ghép ${index + 1}`}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-300 flex items-center justify-center">
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-white text-sm font-medium">
                        👆 Click để xem & tải
                      </div>
                    </div>

                    <div className={`absolute bottom-2 left-2 px-2 py-1 rounded text-xs font-medium ${
                      sizeStatus.isValid ? 'bg-green-600' : 'bg-yellow-600'
                    } text-white`}>
                      {sizeStatus.message}
                    </div>
                  </>
                ) : isLoadingImage ? (
                  // Đang tạo ảnh - HIỂN THỊ LOADING RÕ RÀNG
                  <div className="w-full h-full flex flex-col items-center justify-center p-4">
                    <div className="relative mb-3">
                      <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-blue-500 text-xs font-bold">
                          {index + 1}
                        </span>
                      </div>
                    </div>
                    <div className="text-blue-400 text-sm text-center font-medium mb-1">
                      {loadingProgress[index]?.includes('AI') ? 'AI đang xử lý...' : 'Đang tạo...'}
                    </div>
                    <div className="text-gray-300 text-xs text-center max-w-full px-2">
                      {getLoadingStatus(index)}
                    </div>
                    <div className="text-blue-300 text-xs text-center mt-2 max-w-full truncate px-2">
                      {variationPrompts[index] || `Góc ${index + 1}`}
                    </div>
                  </div>
                ) : hasError ? (
                  // Ảnh bị lỗi
                  <div className="w-full h-full flex flex-col items-center justify-center p-4">
                    <ExclamationTriangleIcon className="w-10 h-10 text-red-400 mb-2" />
                    <div className="text-red-400 text-sm text-center font-medium mb-1">
                      Lỗi tạo ảnh
                    </div>
                    <div className="text-red-300 text-xs text-center">
                      #{index + 1}
                    </div>
                    <div className="text-red-200 text-xs text-center mt-2">
                      {loadingProgress[index] || 'Thử lại sau'}
                    </div>
                  </div>
                ) : (
                  // Chưa bắt đầu tạo
                  <div className="w-full h-full flex flex-col items-center justify-center p-4">
                    <PhotoIcon className="w-8 h-8 text-gray-400 mb-2" />
                    <div className="text-gray-400 text-sm text-center">
                      Chưa bắt đầu
                    </div>
                    <div className="text-gray-500 text-xs text-center mt-1">
                      #{index + 1}
                    </div>
                    <div className="text-gray-600 text-xs text-center mt-2 max-w-full truncate px-2">
                      {variationPrompts[index] || `Góc ${index + 1}`}
                    </div>
                  </div>
                )}
              </div>
              
              {/* Badge số thứ tự */}
              <div className={`absolute top-2 right-2 px-2 py-1 rounded text-xs font-medium ${
                imageBase64 
                  ? sizeStatus.isValid ? 'bg-green-600' : 'bg-yellow-600'
                  : isLoadingImage ? 'bg-blue-600' : hasError ? 'bg-red-600' : 'bg-gray-600'
              } text-white`}>
                #{index + 1}
              </div>

              {/* Indicator chất lượng */}
              {imageBase64 && (
                <div className="absolute top-2 left-2">
                  <div className={`p-1 rounded-full ${
                    sizeStatus.isValid ? 'bg-green-500' : 'bg-yellow-500'
                  }`}>
                    {sizeStatus.isValid ? (
                      <CheckIcon className="w-3 h-3 text-white" />
                    ) : (
                      <ExclamationTriangleIcon className="w-3 h-3 text-white" />
                    )}
                  </div>
                </div>
              )}
              {imageBase64 && (
                <div className="absolute top-10 left-2">
                  <div className="bg-purple-600 text-white px-2 py-1 rounded text-xs font-medium">
                    🎭 Face Match
                  </div>
                </div>
              )}

              {/* Nút download nhanh */}
              {imageBase64 && onDownloadImage && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDownloadImage(imageBase64, index);
                  }}
                  className="absolute bottom-2 right-2 bg-green-600 hover:bg-green-500 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 shadow-lg"
                  title="Tải ảnh xuống"
                >
                  <ArrowDownTrayIcon className="w-4 h-4" />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer Stats */}
      {generatedImages.some(img => img && img.length > 0) && (
        <div className="mt-6 p-4 bg-gray-800 rounded-lg">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-400">
                {generatedImages.filter(img => img && img.length > 0).length}
              </div>
              <div className="text-gray-400">Đã hoàn thành</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-400">
                {imageDimensions.filter(dim => dim && dim.width > 0).length}
              </div>
              <div className="text-gray-400">Đã kiểm tra</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-400">
                {imageDimensions.filter((dim, index) => dim && isCorrectSize(index)).length}
              </div>
              <div className="text-gray-400">Kích thước chuẩn</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-400">
                {numVariations}
              </div>
              <div className="text-gray-400">Tổng số ảnh</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResultGrid;