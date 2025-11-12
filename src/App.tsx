import React, { useState, useCallback, useMemo, useRef } from 'react';
import * as htmlToImage from 'html-to-image';
import type { ImageFile, ExtractionType, ImagePayload } from './types';
import { base64ToDataUrl } from './utils/imageUtils';

// Import service (đã xóa hàm video)
import {
  generateCompositeImage,
  generateAdCopy,
  analyzeSpecificOutfitPart,
  generateImageVariation,
} from './services/geminiService';

// Import components
import ImageUploader from './components/ImageUploader';
import { OutfitPartSelector } from './components/OutfitPartSelector';
import BackgroundSuggestions from './components/BackgroundSuggestions';
import ResultGrid from './components/ResultGrid';
import Spinner from './components/Spinner';
import ImageComposition from './components/ImageComposition';
import { SparklesIcon, ExclamationTriangleIcon, ArrowPathIcon, ArrowDownTrayIcon } from './components/icons';
import ImageModal from './components/ImageModal';
// ĐÃ XÓA VideoPromptModal

import './index.css';

// --- Helper Components (Giữ nguyên) ---
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
    'chính diện, cười mỉm, nhìn thẳng ống kính', 
    'góc nghiêng 3/4, thần thái tự tin', 
    'toàn thân, tạo dáng thời trang',
    'chụp từ góc thấp hướng lên, biểu cảm quyền lực',
    'chụp cận mặt (headshot), biểu cảm chuyên nghiệp',
    'nghiêng nhẹ, nhìn qua vai, biểu cảm bí ẩn',
    'nửa thân trên (medium shot), tay đút túi quần',
    'toàn thân, đang bước đi',
    'chính diện, tay chống hông'
  ]);
  const compositionRef = useRef<HTMLDivElement>(null);
  const [brandName, setBrandName] = useState('Lamie');
  const [brandNameColor, setBrandNameColor] = useState('#FFFFFF');
  const [brandNameFont, setBrandNameFont] = useState('Playfair Display');
  const [brandNameSize, setBrandNameSize] = useState(48);
  const [adCopy, setAdCopy] = useState<string>('');
  const [bannerHeight, setBannerHeight] = useState(48);
  const [bannerColor, setBannerColor] = useState('#3B82F6');
  
  // *** THÊM STATE MỚI CHO PHÂN TÍCH SẢN PHẨM ***
  const [outfitPrompt, setOutfitPrompt] = useState<string>(''); // Chứa mô tả sản phẩm
  const [isAnalyzing, setIsAnalyzing] = useState(false); // State loading cho nút phân tích

  // States (Kết quả)
  const [posterImageUrl, setPosterImageUrl] = useState<string | null>(null);
  const [generatedModelImages, setGeneratedModelImages] = useState<string[]>([]);
  // ĐÃ XÓA generatedVideoUrl

  // States (UI)
  const [isLoading, setIsLoading] = useState(false); // Loading cho nút "Tạo Tác Phẩm"
  const [isTextLoading, setIsTextLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  // ĐÃ XÓA isVideoLoading, imageForVideo

  // *** HÀM MỚI: XỬ LÝ NÚT PHÂN TÍCH SẢN PHẨM ***
  const handleAnalyzeProduct = async () => {
    if (!productImage) {
      setError('Vui lòng tải ảnh sản phẩm trước.');
      return;
    }
    setIsAnalyzing(true);
    setError(null);
    try {
      // Chỉ gọi hàm phân tích
      const result = await analyzeSpecificOutfitPart(productImage, extractionType);
      setOutfitPrompt(result.outfit); // Lưu kết quả vào state
    } catch (err) {
      setError(err instanceof Error ? err.message : "Phân tích thất bại. Vui lòng thử lại.");
      setOutfitPrompt(''); // Xóa mô tả cũ nếu lỗi
    } finally {
      setIsAnalyzing(false);
    }
  };

  // *** HÀM CẬP NHẬT: XỬ LÝ NÚT TẠO TÁC PHẨM ***
  const handleGenerate = async () => {
    if (!modelImage || !productImage) {
      setError('Vui lòng tải lên cả ảnh Người Mẫu và ảnh Sản Phẩm.');
      return;
    }
    // *** THÊM KIỂM TRA MỚI ***
    if (!outfitPrompt) {
      setError('Vui lòng nhấn "Phân tích Sản phẩm" trước khi tạo ảnh.');
      return;
    }

    setIsLoading(true); // Dùng state loading chính
    setLoadingStep('Bắt đầu xử lý...');
    setError(null);
    setPosterImageUrl(null);
    setGeneratedModelImages([]);
    setAdCopy('');
    const productPayload: ImagePayload = { base64: productImage.base64, mimeType: productImage.mimeType };
    
    try {
      // TÁC VỤ 1: TẠO POSTER (Không đổi)
      const posterPromise = (async () => {
        try {
          setLoadingStep('Đang tạo poster (P1)...');
          const compositeBase64 = await generateCompositeImage(productPayload);
          setPosterImageUrl(base64ToDataUrl(compositeBase64, 'image/png'));
          setLoadingStep('Đang viết caption (P1)...');
          setIsTextLoading(true);
          const newAdCopy = await generateAdCopy([productPayload]);
          setAdCopy(newAdCopy);
          setIsTextLoading(false);
        } catch (e) {
          console.error("Lỗi tạo poster (P1):", e);
          setError(prev => (prev ? prev + '\n' : '') + 'Tạo poster thất bại.');
        }
      })();
      
      // TÁC VỤ 2: GHÉP NGƯỜI MẪU (Đã cập nhật)
      const modelGenPromise = (async () => {
        try {
          // *** KHÔNG CẦN PHÂN TÍCH LẠI Ở ĐÂY ***
          // setLoadingStep(`Đang phân tích ${extractionType} (P2+P3)...`);
          // const outfitAnalysis = await analyzeSpecificOutfitPart(productImage, extractionType);
          // const outfitPrompt = outfitAnalysis.outfit;
          
          setLoadingStep(`Đang tạo ${numVariations} ảnh mẫu (P3)...`);
          const promptsToRun = variationPrompts.slice(0, numVariations);
          
          const generationPromises = promptsToRun.map((anglePrompt, index) => {
            setLoadingStep(`Đang tạo ảnh ${index + 1}/${numVariations}...`);
            return generateImageVariation(
              modelImage,
              { outfit: outfitPrompt, background: background || 'studio tối giản với ánh sáng dịu nhẹ' }, // Sử dụng outfitPrompt từ state
              aspectRatio,
              anglePrompt
            );
          });
          const results = await Promise.all(generationPromises);
          setGeneratedModelImages(results);
        } catch (e) {
          console.error("Lỗi ghép người mẫu (P2+P3):", e);
          setError(prev => (prev ? prev + '\n' : '') + `Ghép người mẫu thất bại: ${e instanceof Error ? e.message : String(e)}`);
        }
      })();
      await Promise.all([posterPromise, modelGenPromise]);
    } catch (e) {
      console.error("Lỗi tổng thể:", e);
      setError(e instanceof Error ? e.message : 'Đã xảy ra lỗi không xác định.');
    } finally {
      setIsLoading(false);
      setLoadingStep('');
    }
  };

  // Hàm Download Poster (Giữ nguyên)
  const handleDownloadPoster = async () => {
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
  };

  // Hàm Reset (Cập nhật)
  const resetState = () => {
    setModelImage(null);
    setProductImage(null);
    setPosterImageUrl(null);
    setGeneratedModelImages([]);
    setAdCopy('');
    setError(null);
    setIsLoading(false);
    setLoadingStep('');
    setSelectedImage(null);
    
    // *** THÊM RESET STATE MỚI ***
    setOutfitPrompt('');
    setIsAnalyzing(false);
    // ĐÃ XÓA state video
  };

  // Hàm Click Ảnh (Giữ nguyên)
  const handleImageClick = (imageBase64: string, isSource: boolean = false) => {
    let mimeType = 'image/png';
    if (isSource && modelImage) {
      mimeType = modelImage.mimeType;
    }
    setSelectedImage(`data:${mimeType};base64,${imageBase64}`);
  };

  // ĐÃ XÓA handleOpenVideoModal và handleSubmitVideoPrompt

  const hasAllImages = modelImage && productImage;

  // === RENDER ===
  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 flex flex-col items-center justify-center p-4 font-sans">
      <div className="w-full max-w-7xl mx-auto flex flex-col lg:flex-row items-start justify-center gap-8 lg:gap-12">
        
        {/* === CỘT BÊN TRÁI: INPUT === */}
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
            {!hasAllImages ? (
              <InputPanel title="Tải Ảnh" step={1}>
                <div className="grid grid-cols-2 gap-4">
                  <ImageUploader onFileSelect={setModelImage} imageFile={modelImage} title="Ảnh Người Mẫu" />
                  <ImageUploader onFileSelect={setProductImage} imageFile={productImage} title="Ảnh Sản Phẩm" />
                </div>
                <p className="text-sm text-gray-400 text-center">Vui lòng tải lên cả 2 ảnh để tiếp tục.</p>
              </InputPanel>
            ) : (
              <>
                <div className="bg-gray-800 rounded-lg p-4 space-y-4 shadow-lg">
                  <h3 className="text-lg font-semibold text-white mb-3">Hành Động</h3>
                  <button 
                    onClick={resetState}
                    className="w-full bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-4 rounded-lg transition-colors duration-300 flex items-center justify-center gap-2"
                  >
                    <ArrowPathIcon className="w-5 h-5"/>
                    Tải ảnh khác
                  </button>
                </div>
                
                <InputPanel title="Tùy Chọn Ghép (P2+P3)" step={2}>
                  <div>
                    <Label>Chọn phần cần ghép:</Label>
                    <OutfitPartSelector
                      selectedType={extractionType}
                      onTypeChange={setExtractionType}
                      isLoading={isLoading || isAnalyzing} // Khóa khi đang phân tích
                    />
                  </div>
                  
                  {/* *** THÊM NÚT PHÂN TÍCH VÀ TEXTAREA *** */}
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
                      onChange={e => setOutfitPrompt(e.target.value)} // Cho phép chỉnh sửa
                      disabled={isLoading}
                      placeholder="Mô tả chi tiết sản phẩm sẽ hiện ở đây sau khi phân tích..."
                      rows={8}
                      className="w-full mt-2 bg-gray-700 border border-gray-600 rounded-md p-2 text-white resize-y" 
                    />
                  </div>
                  {/* *** KẾT THÚC THAY ĐỔI *** */}

                  <div>
                    <Label htmlFor="aspectRatio">Tỉ lệ khung hình (cho ảnh ghép):</Label>
                    <SelectInput id="aspectRatio" value={aspectRatio} onChange={e => setAspectRatio(e.target.value)} disabled={isLoading || isAnalyzing}>
                      <option value="9:16">9:16 (Story/Reels)</option>
                      <option value="1:1">1:1 (Bài đăng vuông)</option>
                      <option value="4:5">4:5 (Bài đăng dọc)</option>
                      <option value="16:9">16:9 (Ảnh bìa)</option>
                    </SelectInput>
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
                
                <InputPanel title="Tùy Chỉnh Poster (P1)" step={3}>
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

        {/* === CỘT BÊN PHẢI: OUTPUT === */}
        <div className="w-full max-w-md lg:w-2/3 lg:max-w-none flex flex-col items-center justify-start gap-8">
          
          <div className="w-full max-w-[400px]">
            <h3 className="text-xl font-semibold text-white mb-4 text-center">Kết quả 1: Poster Quảng Cáo (P1)</h3>
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
                onRegenerateAdCopy={() => { /* Tạm vô hiệu hóa */ }}
                bannerHeight={bannerHeight}
                bannerColor={bannerColor}
                isLoading={isLoading && !posterImageUrl}
                isTextLoading={isTextLoading}
                loadingMessage={loadingStep}
              />
            </div>
            {posterImageUrl && 
              <button onClick={handleDownloadPoster} className="w-full mt-4 py-2 px-4 font-semibold text-white bg-green-600 rounded-lg hover:bg-green-500 transition-all flex items-center justify-center gap-2">
                <ArrowDownTrayIcon className="w-5 h-5" /> Tải Poster
              </button>}
          </div>

          <div className="w-full max-w-3xl">
            <h3 className="text-xl font-semibold text-white mb-4 text-center">Kết quả 2: Ảnh Ghép Người Mẫu (P2+P3)</h3>
            <div className="p-4 bg-gray-800 rounded-2xl shadow-xl">
              <ResultGrid
                sourceImage={modelImage}
                generatedImages={generatedModelImages}
                onImageClick={handleImageClick}
                onVideoClick={() => {}} // Đã xóa, nhưng để trống cho an toàn
                isLoading={isLoading && generatedModelImages.length === 0 && hasAllImages}
                numVariations={numVariations}
              />
            </div>
          </div>

          {/* ĐÃ XÓA KẾT QUẢ 3 (VIDEO) */}

        </div>
      </div>
      
      {/* === MODALS (Nằm ngoài 2 cột) === */}
      {selectedImage && <ImageModal imageUrl={selectedImage} onClose={() => setSelectedImage(null)} />}
      
      {/* ĐÃ XÓA VideoPromptModal */}

      <footer className="text-center text-gray-500 mt-12 text-sm">
        <p>Powered by Gemini AI</p>
      </footer>
    </div>
  );
};

export default App;