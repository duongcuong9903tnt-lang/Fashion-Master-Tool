import React, { useState, useCallback, useMemo, useRef } from 'react';
import * as htmlToImage from 'html-to-image';
import type { ImageFile, ExtractionType, ImagePayload } from './types';
import { base64ToDataUrl } from './utils/imageUtils';

// Import service
import {
  generateCompositeImage,
  generateAdCopy,
  analyzeSpecificOutfitPart,
  generateImageVariation,
  downloadImage,
  validateImageDimensions,
  getImageDimensions,
  resizeImageIfNeeded,
} from './services/geminiService';

// Import components
import ImageUploader from './components/ImageUploader';
import { OutfitPartSelector } from './components/OutfitPartSelector';
import BackgroundSuggestions from './components/BackgroundSuggestions';
import ResultGrid from './components/ResultGrid';
import Spinner from './components/Spinner';
import ImageComposition from './components/ImageComposition';
import { SparklesIcon, ExclamationTriangleIcon, ArrowPathIcon, ArrowDownTrayIcon, PhotoIcon, InformationCircleIcon } from './components/icons';
import ImageModal from './components/ImageModal';

import './index.css';

// --- Helper Components
const InputPanel: React.FC<{ title: string; step: number; children: React.ReactNode }> = ({ title, step, children }) => (
  <div className="bg-gray-800 rounded-lg p-4 space-y-4 shadow-lg">
    <h3 className="text-lg font-semibold text-blue-400 mb-3 border-b border-gray-700 pb-2">
      <span className="bg-blue-600 text-white rounded-full w-6 h-6 inline-flex items-center justify-center text-sm mr-2">{step}</span>
      {title}
    </h3>
    {children}
  </div>
);
const Label: React.FC<{ htmlFor?: string; children: React.ReactNode }> = ({ htmlFor, children }) => (
  <label htmlFor={htmlFor} className="block text-sm font-medium text-gray-300 mb-2">{children}</label>
);
const TextInput: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = (props) => (
  <input {...props} className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
);
const SelectInput: React.FC<React.SelectHTMLAttributes<HTMLSelectElement>> = (props) => (
  <select {...props} className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 h-10" />
);

// --- Component Size Info ---
const SizeInfo: React.FC<{ aspectRatio: string }> = ({ aspectRatio }) => {
  const getSizeInfo = (ratio: string) => {
    switch (ratio) {
      case '9:16':
        return { size: '1080x1920px', description: 'Story/Reels chuẩn' };
      case '1:1':
        return { size: '1080x1080px', description: 'Bài đăng vuông' };
      case '4:5':
        return { size: '1080x1350px', description: 'Bài đăng dọc' };
      case '16:9':
        return { size: '1920x1080px', description: 'Ảnh bìa' };
      default:
        return { size: '1080x1920px', description: 'Story/Reels' };
    }
  };

  const info = getSizeInfo(aspectRatio);

  return (
    <div className="flex items-center gap-2 text-sm text-gray-400 bg-gray-700 p-2 rounded">
      <InformationCircleIcon className="w-4 h-4" />
      <span>{info.size} - {info.description}</span>
    </div>
  );
};

// --- Component App chính ---
const App: React.FC = () => {
  // States (Inputs)
  const [modelImage, setModelImage] = useState<ImageFile | null>(null);
  const [productImage, setProductImage] = useState<ImageFile | null>(null);
  const [extractionType, setExtractionType] = useState<ExtractionType>('full');
  const [aspectRatio, setAspectRatio] = useState('9:16');
  const [numVariations, setNumVariations] = useState(9);
  const [background, setBackground] = useState('');
  const [variationPrompts, setVariationPrompts] = useState([
    'FACE-REPLICA: frontal pose - EXACT face copy from model image', 
    'FACE-REPLICA: 3/4 angle - TRANSFER identical face with slight head turn',
    'FACE-REPLICA: full body - PRESERVE exact facial features in full shot',
    'FACE-REPLICA: low angle - MAINTAIN original face looking slightly up',
    'FACE-REPLICA: close-up headshot - PIXEL-PERFECT face reproduction',
    'FACE-REPLICA: profile view - COPY exact facial profile from reference',
    'FACE-REPLICA: medium shot - REPLICATE face on upper body pose',
    'FACE-REPLICA: walking pose - TRANSPLANT identical face to motion',
    'FACE-REPLICA: hands on hips - DUPLICATE exact face with confident stance'
  ]);

  const compositionRef = useRef<HTMLDivElement>(null);
  const [brandName, setBrandName] = useState('Lamie');
  const [brandNameColor, setBrandNameColor] = useState('#FFFFFF');
  const [brandNameFont, setBrandNameFont] = useState('Playfair Display');
  const [brandNameSize, setBrandNameSize] = useState(48);
  const [adCopy, setAdCopy] = useState<string>('');
  const [bannerHeight, setBannerHeight] = useState(48);
  const [bannerColor, setBannerColor] = useState('#3B82F6');
  
  // State cho phân tích sản phẩm
  const [outfitPrompt, setOutfitPrompt] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // States (Kết quả)
  const [posterImageUrl, setPosterImageUrl] = useState<string | null>(null);
  const [posterBase64, setPosterBase64] = useState<string | null>(null);
  const [generatedModelImages, setGeneratedModelImages] = useState<string[]>([]);
  const [imageDimensions, setImageDimensions] = useState<Array<{width: number, height: number}>>([]);

  // States (UI & Loading)
  const [isLoading, setIsLoading] = useState(false);
  const [isTextLoading, setIsTextLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedImageBase64, setSelectedImageBase64] = useState<string | null>(null);
  const [validationResults, setValidationResults] = useState<Array<{isValid: boolean, actualSize: {width: number, height: number}, expectedSize: {width: number, height: number}}>>([]);
  
  // States mới cho progress tracking
  const [currentLoadingIndex, setCurrentLoadingIndex] = useState(-1);
  const [loadingProgress, setLoadingProgress] = useState<{ [key: number]: string }>({});

  // Hàm phân tích sản phẩm
  const handleAnalyzeProduct = async () => {
    if (!productImage) {
      setError('Vui lòng tải ảnh sản phẩm trước.');
      return;
    }
    setIsAnalyzing(true);
    setError(null);
    try {
      const result = await analyzeSpecificOutfitPart(productImage, extractionType);
      setOutfitPrompt(result.outfit);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Phân tích thất bại. Vui lòng thử lại.");
      setOutfitPrompt('');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Hàm tạo tác phẩm - HOÀN CHỈNH
  // const handleGenerate = async () => {
  //   if (!modelImage || !productImage) {
  //     setError('Vui lòng tải lên cả ảnh Người Mẫu và ảnh Sản Phẩm.');
  //     return;
  //   }

  //   setIsLoading(true);
  //   setLoadingStep('Bắt đầu xử lý...');
  //   setError(null);
  //   setPosterImageUrl(null);
  //   setPosterBase64(null);
  //   setGeneratedModelImages([]);
  //   setImageDimensions([]);
  //   setValidationResults([]);
  //   setAdCopy('');
    
  //   const modelPayload: ImagePayload = { base64: modelImage.base64, mimeType: modelImage.mimeType };
  //   const productPayload: ImagePayload = { base64: productImage.base64, mimeType: productImage.mimeType };
    
  //   try {
  //     // TÁC VỤ 1: TẠO POSTER VỚI MẶT NGƯỜI MẪU VÀ SẢN PHẨM THẬT
  //     const posterPromise = (async () => {
  //       try {
  //         setLoadingStep('Đang tạo poster với mặt người mẫu và sản phẩm thật...');
  //         const compositeBase64 = await generateCompositeImage(modelPayload, productPayload);
  //         setPosterBase64(compositeBase64);
  //         setPosterImageUrl(base64ToDataUrl(compositeBase64, 'image/png'));
  //         setLoadingStep('Đang viết caption...');
  //         setIsTextLoading(true);
  //         const newAdCopy = await generateAdCopy([productPayload]);
  //         setAdCopy(newAdCopy);
  //         setIsTextLoading(false);
  //       } catch (e) {
  //         console.error("Lỗi tạo poster:", e);
  //         setError(prev => (prev ? prev + '\n' : '') + 'Tạo poster thất bại.');
  //       }
  //     })();
      
  //     // TÁC VỤ 2: TẠO ẢNH BIẾN THỂ - VỚI FACE PRESERVATION
  //     const modelGenPromise = (async () => {
  //       try {
  //         setLoadingStep(`Chuẩn bị tạo ${numVariations} ảnh mẫu với Face Preservation...`);
  //         const promptsToRun = variationPrompts.slice(0, numVariations);
          
  //         // KHỞI TẠO MẢNG RỖNG
  //         const results: string[] = Array(numVariations).fill('');
  //         const dimensions: Array<{width: number, height: number}> = Array(numVariations).fill({width: 0, height: 0});
  //         const validations: Array<any> = Array(numVariations).fill(null);
          
  //         // RESET STATE
  //         setCurrentLoadingIndex(-1);
  //         setLoadingProgress({});
  //         setGeneratedModelImages([...results]);

  //         // KHỞI TẠO PROGRESS
  //         const initialProgress: { [key: number]: string } = {};
  //         for (let i = 0; i < numVariations; i++) {
  //           initialProgress[i] = '⏳ Đang chờ...';
  //         }
  //         setLoadingProgress(initialProgress);

  //         // CHIA THÀNH CÁC NHÓM 3 ẢNH
  //         const batchSize = 3;
  //         const batches = [];
  //         for (let i = 0; i < promptsToRun.length; i += batchSize) {
  //           batches.push({
  //             prompts: promptsToRun.slice(i, i + batchSize),
  //             startIndex: i
  //           });
  //         }

  //         // XỬ LÝ TỪNG NHÓM
  //         for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
  //           const { prompts, startIndex } = batches[batchIndex];
            
  //           // CẬP NHẬT TRẠNG THÁI CHO CẢ NHÓM
  //           for (let i = 0; i < prompts.length; i++) {
  //             const globalIndex = startIndex + i;
  //             setLoadingProgress(prev => ({ 
  //               ...prev, 
  //               [globalIndex]: '🔄 Đang chuẩn bị Face Preservation...' 
  //             }));
  //           }
            
  //           setCurrentLoadingIndex(startIndex);
  //           setLoadingStep(`Đang tạo nhóm ${batchIndex + 1}/${batches.length} với Face Preservation...`);

  //           // TẠO PROMISES CHO CẢ NHÓM
  //           const batchPromises = prompts.map((prompt, localIndex) => {
  //             const globalIndex = startIndex + localIndex;
              
  //             return (async () => {
  //               try {
  //                 setLoadingProgress(prev => ({ 
  //                   ...prev, 
  //                   [globalIndex]: '🤖 AI đang sao chép khuôn mặt...' 
  //                 }));

  //                 console.log(`🎨 Tạo ảnh ${globalIndex + 1} với Face Preservation: ${prompt}`);
                  
  //                 // SỬ DỤNG HÀM MỚI - ĐƠN GIẢN HÓA BACKGROUND
  //                 const result = await generateImageVariation(
  //                   modelImage,
  //                   productImage,
  //                   background || 'studio trắng chuyên nghiệp',
  //                   aspectRatio,
  //                   prompt
  //                 );

  //                 // CẬP NHẬT KẾT QUẢ
  //                 results[globalIndex] = result;
                  
  //                 // KIỂM TRA KÍCH THƯỚC
  //                 setLoadingProgress(prev => ({ 
  //                   ...prev, 
  //                   [globalIndex]: '📏 Đang kiểm tra kích thước...' 
  //                 }));

  //                 const dimension = await getImageDimensions(result);
  //                 dimensions[globalIndex] = dimension;

  //                 const validation = await validateImageDimensions(result, aspectRatio);
  //                 validations[globalIndex] = validation;

  //                 setLoadingProgress(prev => ({ 
  //                   ...prev, 
  //                   [globalIndex]: '✅ Hoàn thành Face Preservation!' 
  //                 }));

  //                 console.log(`✅ Hoàn thành ảnh ${globalIndex + 1} với Face Preservation: ${dimension.width}x${dimension.height}`);

  //                 return { success: true, index: globalIndex, result };

  //               } catch (error) {
  //                 console.error(`❌ Lỗi ảnh ${globalIndex + 1} với Face Preservation:`, error);
                  
  //                 results[globalIndex] = '';
  //                 setLoadingProgress(prev => ({ 
  //                   ...prev, 
  //                   [globalIndex]: '❌ Lỗi Face Preservation' 
  //                 }));

  //                 return { success: false, index: globalIndex, error };
  //               }
  //             })();
  //           });

  //           // CHỜ CẢ NHÓM HOÀN THÀNH
  //           setLoadingStep(`Đang chờ nhóm ${batchIndex + 1} hoàn thành Face Preservation...`);
            
  //           const batchResults = await Promise.allSettled(batchPromises);
            
  //           // CẬP NHẬT UI
  //           setGeneratedModelImages([...results]);
  //           setImageDimensions([...dimensions]);
  //           setValidationResults([...validations]);

  //           // THỐNG KÊ NHÓM
  //           const batchSuccess = batchResults.filter(result => 
  //             result.status === 'fulfilled' && result.value.success
  //           ).length;
            
  //           console.log(`📊 Nhóm ${batchIndex + 1} Face Preservation: ${batchSuccess}/${prompts.length} ảnh thành công`);

  //           // NGHỈ GIỮA CÁC NHÓM
  //           if (batchIndex < batches.length - 1) {
  //             const completed = results.filter(img => img && img.length > 0).length;
  //             setLoadingStep(`Chuẩn bị nhóm tiếp theo... (${completed}/${numVariations})`);
  //             await new Promise(resolve => setTimeout(resolve, 4000)); // Tăng thời gian nghỉ
  //           }
  //         }

  //         // THỐNG KÊ CUỐI CÙNG
  //         const successfulImages = results.filter(img => img && img.length > 0).length;
  //         console.log(`🎉 KẾT QUẢ FACE PRESERVATION: ${successfulImages}/${numVariations} ảnh thành công`);
          
  //       } catch (e) {
  //         console.error("💥 Lỗi tổng thể Face Preservation:", e);
  //         setError(`Lỗi hệ thống: ${e instanceof Error ? e.message : String(e)}`);
  //       } finally {
  //         setCurrentLoadingIndex(-1);
  //         setLoadingStep('');
  //       }
  //     })();
      
  //     await Promise.all([posterPromise, modelGenPromise]);
  //   } catch (e) {
  //     console.error("Lỗi tổng thể:", e);
  //     setError(e instanceof Error ? e.message : 'Đã xảy ra lỗi không xác định.');
  //   } finally {
  //     setIsLoading(false);
  //     setLoadingStep('');
  //   }
  // };

  const handleGenerate = async () => {
    if (!modelImage || !productImage) {
      setError('Vui lòng tải lên cả ảnh Người Mẫu và ảnh Sản Phẩm.');
      return;
    }

    setIsLoading(true);
    setLoadingStep('Bắt đầu xử lý...');
    setError(null);
    setPosterImageUrl(null);
    setPosterBase64(null);
    setGeneratedModelImages([]);
    setImageDimensions([]);
    setValidationResults([]);
    setAdCopy('');
    setCurrentLoadingIndex(-1);
    setLoadingProgress({});
    
    try {
      // 🔄 BƯỚC 1: TÁCH SẢN PHẨM TRƯỚC
      setLoadingStep('🔍 Đang phân tích và tách sản phẩm từ ảnh...');
      console.log('🛍️ Bắt đầu tách sản phẩm...');
      
      let extractedProductBase64: string;
      try {
        extractedProductBase64 = await extractProductFromImage(productImage);
        console.log('✅ Đã tách sản phẩm thành công');
      } catch (extractionError) {
        console.error('❌ Lỗi tách sản phẩm, sử dụng ảnh gốc:', extractionError);
        // Fallback: sử dụng ảnh gốc nếu không tách được
        extractedProductBase64 = productImage.base64;
        setError('Không thể tách sản phẩm, sử dụng ảnh gốc (có thể có người mẫu khác)');
      }

      // Tạo payload với sản phẩm đã tách
      const modelPayload: ImagePayload = { 
        base64: modelImage.base64, 
        mimeType: modelImage.mimeType 
      };
      
      const extractedProductPayload: ImagePayload = { 
        base64: extractedProductBase64, 
        mimeType: 'image/png' 
      };

      // 🔄 BƯỚC 2: TẠO POSTER VỚI SẢN PHẨM ĐÃ TÁCH
      setLoadingStep('🖼️ Đang tạo poster với sản phẩm đã tách...');
      console.log('🚀 Bắt đầu tạo poster...');
      
      try {
        const compositeBase64 = await generateCompositeImage(modelPayload, extractedProductPayload);
        setPosterBase64(compositeBase64);
        setPosterImageUrl(base64ToDataUrl(compositeBase64, 'image/png'));
        console.log('✅ Đã tạo poster thành công');
        
        // 🔄 BƯỚC 3: TẠO AD COPY
        setLoadingStep('📝 Đang viết caption cho poster...');
        setIsTextLoading(true);
        
        try {
          const newAdCopy = await generateAdCopy([extractedProductPayload]);
          setAdCopy(newAdCopy);
          console.log('✅ Đã tạo ad copy thành công');
        } catch (adCopyError) {
          console.error('❌ Lỗi tạo ad copy:', adCopyError);
          setError(prev => prev ? prev + '\nTạo caption thất bại' : 'Tạo caption thất bại');
        } finally {
          setIsTextLoading(false);
        }
        
      } catch (posterError) {
        console.error('❌ Lỗi tạo poster:', posterError);
        throw new Error('Tạo poster thất bại: ' + (posterError instanceof Error ? posterError.message : String(posterError)));
      }

      // 🔄 BƯỚC 4: TẠO ẢNH BIẾN THỂ VỚI SẢN PHẨM ĐÃ TÁCH
      if (posterBase64) {
        setLoadingStep('🎨 Bắt đầu tạo ảnh biến thể với sản phẩm đã tách...');
        console.log('🚀 Bắt đầu tạo ảnh biến thể...');
        
        await generateModelVariations(modelImage, extractedProductBase64);
        
        console.log('🎉 Đã hoàn thành tất cả tác vụ');
      }
      
    } catch (e) {
      console.error("💥 Lỗi tổng thể:", e);
      setError(e instanceof Error ? e.message : 'Đã xảy ra lỗi không xác định.');
    } finally {
      setIsLoading(false);
      setLoadingStep('');
    }
  };

  // HÀM TẠO ẢNH BIẾN THỂ RIÊNG
  const generateModelVariations = async (modelImage: ImageFile, extractedProductBase64: string): Promise<void> => {
    try {
      setLoadingStep(`🎨 Chuẩn bị tạo ${numVariations} ảnh mẫu...`);
      const promptsToRun = variationPrompts.slice(0, numVariations);
      
      // KHỞI TẠO MẢNG RỖNG
      const results: string[] = Array(numVariations).fill('');
      const dimensions: Array<{width: number, height: number}> = Array(numVariations).fill({width: 0, height: 0});
      const validations: Array<any> = Array(numVariations).fill(null);
      
      // RESET STATE
      setCurrentLoadingIndex(-1);
      setLoadingProgress({});
      setGeneratedModelImages([...results]);

      // KHỞI TẠO PROGRESS
      const initialProgress: { [key: number]: string } = {};
      for (let i = 0; i < numVariations; i++) {
        initialProgress[i] = '⏳ Đang chờ...';
      }
      setLoadingProgress(initialProgress);

      // CHIA THÀNH CÁC NHÓM 3 ẢNH
      const batchSize = 3;
      const batches = [];
      for (let i = 0; i < promptsToRun.length; i += batchSize) {
        batches.push({
          prompts: promptsToRun.slice(i, i + batchSize),
          startIndex: i
        });
      }

      // XỬ LÝ TỪNG NHÓM
      for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const { prompts, startIndex } = batches[batchIndex];
        
        // CẬP NHẬT TRẠNG THÁI CHO CẢ NHÓM
        for (let i = 0; i < prompts.length; i++) {
          const globalIndex = startIndex + i;
          setLoadingProgress(prev => ({ 
            ...prev, 
            [globalIndex]: '🔄 Đang chuẩn bị...' 
          }));
        }
        
        setCurrentLoadingIndex(startIndex);
        setLoadingStep(`Đang tạo nhóm ảnh ${batchIndex + 1}/${batches.length}...`);

        // TẠO PROMISES CHO CẢ NHÓM
        const batchPromises = prompts.map((prompt, localIndex) => {
          const globalIndex = startIndex + localIndex;
          
          return (async () => {
            try {
              setLoadingProgress(prev => ({ 
                ...prev, 
                [globalIndex]: '🤖 AI đang xử lý...' 
              }));

              console.log(`🎨 Tạo ảnh biến thể ${globalIndex + 1}: ${prompt}`);
              
              // Tạo ảnh tạm thời từ extracted product
              const tempProductImage: ImageFile = {
                file: productImage.file, // Giữ file gốc để reference
                base64: extractedProductBase64,
                previewUrl: productImage.previewUrl,
                mimeType: 'image/png'
              };

              // const result = await generateImageVariation(
              //   modelImage,
              //   tempProductImage,
              //   background || 'studio trắng chuyên nghiệp',
              //   aspectRatio,
              //   prompt
              // );

              const result = await generateImageVariation(
              modelImage,
              {
                file: productImage.file,
                base64: extractedProductBase64,
                previewUrl: productImage.previewUrl,
                mimeType: 'image/png'
              },
              background || 'studio trắng chuyên nghiệp',
              aspectRatio,
              prompt,
              extractedProductBase64  // ← THÊM tham số extracted product
            );

              // CẬP NHẬT KẾT QUẢ
              results[globalIndex] = result;
              
              // KIỂM TRA KÍCH THƯỚC
              setLoadingProgress(prev => ({ 
                ...prev, 
                [globalIndex]: '📏 Đang kiểm tra kích thước...' 
              }));

              const dimension = await getImageDimensions(result);
              dimensions[globalIndex] = dimension;

              const validation = await validateImageDimensions(result, aspectRatio);
              validations[globalIndex] = validation;

              setLoadingProgress(prev => ({ 
                ...prev, 
                [globalIndex]: '✅ Hoàn thành!' 
              }));

              console.log(`✅ Hoàn thành ảnh biến thể ${globalIndex + 1}: ${dimension.width}x${dimension.height}`);

              return { success: true, index: globalIndex, result };

            } catch (error) {
              console.error(`❌ Lỗi ảnh biến thể ${globalIndex + 1}:`, error);
              
              results[globalIndex] = '';
              setLoadingProgress(prev => ({ 
                ...prev, 
                [globalIndex]: '❌ Lỗi tạo ảnh' 
              }));

              return { success: false, index: globalIndex, error };
            }
          })();
        });

        // CHỜ CẢ NHÓM HOÀN THÀNH
        setLoadingStep(`Đang chờ nhóm ${batchIndex + 1} hoàn thành...`);
        
        const batchResults = await Promise.allSettled(batchPromises);
        
        // CẬP NHẬT UI
        setGeneratedModelImages([...results]);
        setImageDimensions([...dimensions]);
        setValidationResults([...validations]);

        // THỐNG KÊ NHÓM
        const batchSuccess = batchResults.filter(result => 
          result.status === 'fulfilled' && result.value.success
        ).length;
        
        console.log(`📊 Nhóm ${batchIndex + 1}: ${batchSuccess}/${prompts.length} ảnh thành công`);

        // NGHỈ GIỮA CÁC NHÓM
        if (batchIndex < batches.length - 1) {
          const completed = results.filter(img => img && img.length > 0).length;
          setLoadingStep(`Chuẩn bị nhóm tiếp theo... (${completed}/${numVariations})`);
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
      }

      // THỐNG KÊ CUỐI CÙNG
      const successfulImages = results.filter(img => img && img.length > 0).length;
      console.log(`🎉 HOÀN THÀNH ẢNH BIẾN THỂ: ${successfulImages}/${numVariations} ảnh thành công`);
      
      if (successfulImages < numVariations) {
        const failedCount = numVariations - successfulImages;
        setError(prev => {
          const newError = `Đã tạo được ${successfulImages}/${numVariations} ảnh biến thể. ${failedCount} ảnh bị lỗi.`;
          return prev ? prev + '\n' + newError : newError;
        });
      }
      
    } catch (e) {
      console.error("💥 Lỗi tạo ảnh biến thể:", e);
      throw new Error(`Lỗi tạo ảnh biến thể: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setCurrentLoadingIndex(-1);
      setLoadingStep('');
    }
  };

  // Hàm Download Poster
  const handleDownloadPoster = async () => {
    if (posterBase64) {
      downloadImage(posterBase64, `${brandName.toLowerCase().replace(/\s/g, '-')}-poster`);
    } else {
      const node = compositionRef.current;
      if (!node) return;
      try {
        const dataUrl = await htmlToImage.toPng(node, { quality: 1.0, pixelRatio: 2 });
        const link = document.createElement('a');
        link.download = `${brandName.toLowerCase().replace(/\s/g, '-')}-poster.png`;
        link.href = dataUrl;
        link.click();
      } catch (err) {
        console.error('Không thể tải poster:', err);
      }
    }
  };

  // Hàm Download Ảnh Riêng
  const handleDownloadSingleImage = (imageBase64: string, index: number) => {
    downloadImage(imageBase64, `${brandName.toLowerCase().replace(/\s/g, '-')}-variation-${index + 1}`);
  };

  // Hàm Download từ Modal
  const handleDownloadFromModal = () => {
    if (selectedImageBase64) {
      downloadImage(selectedImageBase64, `${brandName.toLowerCase().replace(/\s/g, '-')}-image`);
    }
  };

  const resetModelImage = () => {
    console.log('🔄 Xóa ảnh mẫu');
    setModelImage(null);
    // Reset các state liên quan đến ảnh mẫu
    setPosterImageUrl(null);
    setPosterBase64(null);
    setGeneratedModelImages([]);
    setImageDimensions([]);
    setValidationResults([]);
    setAdCopy('');
    setCurrentLoadingIndex(-1);
    setLoadingProgress({});
  };

  const resetProductImage = () => {
    console.log('🔄 Xóa ảnh sản phẩm');
    setProductImage(null);
    // Reset các state liên quan đến ảnh sản phẩm
    setPosterImageUrl(null);
    setPosterBase64(null);
    setGeneratedModelImages([]);
    setImageDimensions([]);
    setValidationResults([]);
    setAdCopy('');
    setOutfitPrompt('');
    setCurrentLoadingIndex(-1);
    setLoadingProgress({});
  };

  // Hàm reset all
  const resetState = () => {
    console.log('🔄 Reset tất cả');
    setModelImage(null);
    setProductImage(null);
    setPosterImageUrl(null);
    setPosterBase64(null);
    setGeneratedModelImages([]);
    setImageDimensions([]);
    setValidationResults([]);
    setAdCopy('');
    setError(null);
    setIsLoading(false);
    setLoadingStep('');
    setSelectedImage(null);
    setSelectedImageBase64(null);
    setOutfitPrompt('');
    setIsAnalyzing(false);
    setCurrentLoadingIndex(-1);
    setLoadingProgress({});
  };

  const handleImageClick = (imageBase64: string, isSource: boolean = false) => {
    let mimeType = 'image/png';
    if (isSource && modelImage) {
      mimeType = modelImage.mimeType;
    }
    setSelectedImageBase64(imageBase64);
    setSelectedImage(`data:${mimeType};base64,${imageBase64}`);
  };

  const hasAllImages = modelImage && productImage;

  // Hàm calculateTargetSize cho component
  const calculateTargetSize = (aspectRatio: string): { width: number; height: number } => {
    switch (aspectRatio) {
      case '9:16':
        return { width: 1080, height: 1920 };
      case '1:1':
        return { width: 1080, height: 1080 };
      case '4:5':
        return { width: 1080, height: 1350 };
      case '16:9':
        return { width: 1920, height: 1080 };
      default:
        const [widthRatio, heightRatio] = aspectRatio.split(':').map(Number);
        const ratio = widthRatio / heightRatio;
        const baseSize = 1080;
        if (ratio > 1) {
          return { width: Math.round(baseSize * ratio), height: baseSize };
        } else {
          return { width: baseSize, height: Math.round(baseSize / ratio) };
        }
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 flex flex-col items-center justify-center p-4 font-sans">
      <div className="w-full max-w-7xl mx-auto flex flex-col lg:flex-row items-start justify-center gap-8 lg:gap-12">
        
        {/* CỘT BÊN TRÁI: INPUT */}
        <div className="w-full max-w-md lg:w-1/3 flex flex-col items-center lg:items-start text-center lg:text-left h-fit lg:sticky lg:top-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-blue-500 p-2 rounded-lg">
              <SparklesIcon className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Fashion Master Tool</h1>
          </div>
          <p className="text-gray-400 mb-6">
            Tải ảnh người mẫu và sản phẩm. AI sẽ tự động tạo poster và ghép người mẫu cho bạn.
          </p>
          
          <div className="w-full flex flex-col gap-4">
            {/* PANEL TẢI ẢNH - LUÔN HIỆN */}
            <InputPanel title="Tải Ảnh" step={1}>
              <div className="grid grid-cols-2 gap-4">
                <ImageUploader 
                  onFileSelect={setModelImage} 
                  imageFile={modelImage} 
                  title="Ảnh Người Mẫu" 
                />
                <ImageUploader 
                  onFileSelect={setProductImage} 
                  imageFile={productImage} 
                  title="Ảnh Sản Phẩm" 
                />
              </div>
              
              {/* NÚT XÓA RIÊNG VÀ RESET ALL - LUÔN HIỆN KHI CÓ ẢNH */}
              {(modelImage || productImage) && (
                <div className="space-y-2 mt-4">
                  <button 
                    onClick={resetState}
                    className="w-full bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-300 flex items-center justify-center gap-2"
                  >
                    <ArrowPathIcon className="w-4 h-4"/>
                    Reset tất cả
                  </button>
                </div>
              )}
            </InputPanel>

            {/* CÁC PANEL KHÁC - CHỈ HIỆN KHI CÓ ĐỦ 2 ẢNH */}
            {hasAllImages && (
              <>
                <InputPanel title="Tùy Chọn Ghép" step={2}>
                  <div>
                    <Label>Chọn phần cần ghép:</Label>
                    <OutfitPartSelector
                      selectedType={extractionType}
                      onTypeChange={setExtractionType}
                      isLoading={isLoading || isAnalyzing}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Mô tả sản phẩm (Prompt):</Label>
                    <button
                      onClick={handleAnalyzeProduct}
                      disabled={isAnalyzing || isLoading}
                      className="w-full py-2 px-4 font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-500 transition-all disabled:bg-gray-500 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {isAnalyzing ? (
                        <>
                          <Spinner /> Đang phân tích...
                        </>
                      ) : 'Phân tích Sản phẩm 🔬'}
                    </button>
                    <textarea 
                      value={outfitPrompt} 
                      onChange={e => setOutfitPrompt(e.target.value)}
                      disabled={isLoading}
                      placeholder="Mô tả chi tiết sản phẩm sẽ hiện ở đây sau khi phân tích..."
                      rows={8}
                      className="w-full mt-2 bg-gray-700 border border-gray-600 rounded-md p-2 text-white resize-y" 
                    />
                  </div>

                  <div>
                    <Label htmlFor="aspectRatio">Tỉ lệ khung hình (cho ảnh ghép):</Label>
                    <SelectInput 
                      id="aspectRatio" 
                      value={aspectRatio} 
                      onChange={e => setAspectRatio(e.target.value)} 
                      disabled={isLoading || isAnalyzing}
                    >
                      <option value="9:16">9:16 (Story/Reels)</option>
                      <option value="1:1">1:1 (Bài đăng vuông)</option>
                      <option value="4:5">4:5 (Bài đăng dọc)</option>
                      <option value="16:9">16:9 (Ảnh bìa)</option>
                    </SelectInput>
                    <SizeInfo aspectRatio={aspectRatio} />
                  </div>
                  
                  <div>
                    <Label>Số lượng ảnh ghép:</Label>
                    <div className="flex flex-wrap gap-x-4 gap-y-2 mt-2">
                        {[3, 6, 9].map(num => (
                            <label key={num} className="flex items-center space-x-2 cursor-pointer text-gray-200">
                                <input 
                                    type="radio" 
                                    name="numVariations" 
                                    value={num} 
                                    checked={numVariations === num} 
                                    onChange={(e) => setNumVariations(Number(e.target.value))} 
                                    disabled={isLoading || isAnalyzing}
                                    className="form-radio h-4 w-4 text-blue-600 bg-gray-700 border-gray-600 focus:ring-blue-500"
                                />
                                <span>{num} ảnh</span>
                            </label>
                        ))}
                    </div>
                  </div>

                  <div>
                    <Label>Bối cảnh (cho ảnh ghép):</Label>
                    <BackgroundSuggestions onSelect={setBackground} />
                    <textarea value={background} onChange={e => setBackground(e.target.value)} disabled={isLoading || isAnalyzing}
                      placeholder="Ví dụ: đứng trong studio tối giản với ánh sáng dịu nhẹ..."
                      rows={3}
                      className="w-full mt-2 bg-gray-700 border border-gray-600 rounded-md p-2 text-white resize-none" />
                  </div>
                </InputPanel>
                
                <InputPanel title="Tùy Chỉnh Poster" step={3}>
                  <div>
                    <Label htmlFor="brandName">Tên thương hiệu:</Label>
                    <TextInput id="brandName" type="text" value={brandName} onChange={(e) => setBrandName(e.target.value)} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="brandNameColor">Màu chữ:</Label>
                      <input id="brandNameColor" type="color" value={brandNameColor} onChange={(e) => setBrandNameColor(e.target.value)} className="w-full h-10 p-1 bg-gray-700 border border-gray-600 rounded-lg cursor-pointer" />
                    </div>
                    <div>
                      <Label htmlFor="brandNameFont">Font chữ:</Label>
                      <SelectInput id="brandNameFont" value={brandNameFont} onChange={(e) => setBrandNameFont(e.target.value)}>
                        <option value="Playfair Display">Playfair Display</option>
                        <option value="Montserrat">Montserrat</option>
                        <option value="Lobster">Lobster</option>
                        <option value="Pacifico">Pacifico</option>
                        <option value="Cinzel">Cinzel</option>
                      </SelectInput>
                    </div>
                  </div>
                </InputPanel>
                
                <button onClick={handleGenerate} disabled={isLoading || isAnalyzing} 
                  className="w-full py-3 px-4 font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-500 transition-all disabled:bg-gray-500 disabled:cursor-not-allowed text-lg flex items-center justify-center gap-2">
                  {isLoading ? (
                    <>
                      {loadingStep ? <Spinner /> : null} {loadingStep || 'Đang xử lý...'}
                    </>
                  ) : 'Tạo Tác Phẩm 🚀'}
                </button>
              </>
            )}

            {error && (
              <div className="bg-red-900/50 border border-red-700 text-red-300 px-4 py-3 rounded-lg relative flex items-center gap-3">
                <ExclamationTriangleIcon className="w-5 h-5" />
                <span className="block sm:inline">{error}</span>
              </div>
            )}
          </div>
        </div>

        {/* CỘT BÊN PHẢI: OUTPUT */}
        <div className="w-full max-w-md lg:w-2/3 lg:max-w-none flex flex-col items-center justify-start gap-8">
          
          <div className="w-full max-w-[400px]">
            <h3 className="text-xl font-semibold text-white mb-4 text-center">Poster</h3>
            <div className="aspect-[9/16] rounded-2xl shadow-xl overflow-hidden bg-gray-800">
              <ImageComposition
                ref={compositionRef}
                mode="single" 
                imageSrcs={[posterImageUrl, posterImageUrl, posterImageUrl]}
                text={adCopy}
                onTextChange={setAdCopy}
                brandName={brandName}
                onBrandNameChange={setBrandName}
                brandNameColor={brandNameColor}
                brandNameFont={brandNameFont}
                brandNameSize={brandNameSize}
                onRegenerateAdCopy={() => { }}
                bannerHeight={bannerHeight}
                bannerColor={bannerColor}
                isLoading={isLoading && !posterImageUrl}
                isTextLoading={isTextLoading}
                loadingMessage={loadingStep}
              />
            </div>
            {posterImageUrl && 
              <div className="flex gap-2 mt-4">
                <button onClick={handleDownloadPoster} className="flex-1 py-2 px-4 font-semibold text-white bg-green-600 rounded-lg hover:bg-green-500 transition-all flex items-center justify-center gap-2">
                  <ArrowDownTrayIcon className="w-5 h-5" /> Tải Poster
                </button>
                {posterBase64 && (
                  <button 
                    onClick={() => downloadImage(posterBase64, `${brandName}-poster-image-only`)}
                    className="py-2 px-4 font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-500 transition-all flex items-center justify-center gap-2"
                    title="Tải hình ảnh không có text"
                  >
                    <PhotoIcon className="w-5 h-5" /> Tải Ảnh
                  </button>
                )}
              </div>
            }
          </div>

          <div className="w-full max-w-3xl">
            <h3 className="text-xl font-semibold text-white mb-4 text-center">Ảnh Ghép Người Mẫu</h3>
            
            {/* Thông tin kích thước */}
            {generatedModelImages.some(img => img && img.length > 0) && (
              <div className="mb-4 p-3 bg-gray-800 rounded-lg">
                <h4 className="text-lg font-semibold text-blue-400 mb-2">Thông tin kích thước:</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                  {validationResults.map((validation, index) => (
                    <div key={index} className={`p-2 rounded ${validation?.isValid ? 'bg-green-900/50' : 'bg-yellow-900/50'}`}>
                      <div className="font-medium">Ảnh #{index + 1}:</div>
                      <div>{validation?.actualSize?.width || 0}x{validation?.actualSize?.height || 0}px</div>
                      <div className={`text-xs ${validation?.isValid ? 'text-green-400' : 'text-yellow-400'}`}>
                        {validation?.isValid ? '✓ Đúng kích thước' : '⚠ Cần kiểm tra'}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-2 text-xs text-gray-400">
                  Tỷ lệ: {aspectRatio} | Kích thước mục tiêu: {calculateTargetSize(aspectRatio).width}x{calculateTargetSize(aspectRatio).height}px
                </div>
              </div>
            )}
            
            <div className="p-4 bg-gray-800 rounded-2xl shadow-xl">
              <ResultGrid
                sourceImage={modelImage}
                generatedImages={generatedModelImages}
                onImageClick={handleImageClick}
                onDownloadImage={handleDownloadSingleImage}
                onVideoClick={() => {}}
                isLoading={isLoading}
                numVariations={numVariations}
                aspectRatio={aspectRatio}
                imageDimensions={imageDimensions}
                currentLoadingIndex={currentLoadingIndex}
                loadingProgress={loadingProgress}
              />
            </div>
          </div>
        </div>
      </div>
      
      {/* MODALS */}
      {selectedImage && (
        <ImageModal 
          imageUrl={selectedImage} 
          onClose={() => {
            setSelectedImage(null);
            setSelectedImageBase64(null);
          }}
          onDownload={handleDownloadFromModal}
          imageInfo={
            selectedImage.includes(modelImage?.base64 || '') 
              ? 'Ảnh người mẫu gốc' 
              : 'Ảnh đã ghép sản phẩm'
          }
        />
      )}
      
      <footer className="text-center text-gray-500 mt-12 text-sm">
        <p>Powered by Dương Cường</p>
      </footer>
    </div>
  );
};

export default App;