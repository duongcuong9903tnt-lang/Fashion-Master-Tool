import React, { forwardRef } from 'react';
import { SparklesIcon, ArrowPathIcon } from './icons';

interface ImageCompositionProps {
  mode: 'single' | 'manual';
  imageSrcs: (string | null)[];
  text: string;
  onTextChange: (newText: string) => void;
  brandName: string;
  onBrandNameChange: (newName: string) => void;
  brandNameColor: string;
  brandNameFont: string;
  brandNameSize: number;
  onRegenerateAdCopy: () => void;
  bannerHeight: number;
  bannerColor: string;
  isLoading: boolean;
  isTextLoading: boolean;
  loadingMessage?: string;
}

const LoadingSpinner: React.FC<{ message?: string }> = ({ message }) => (
    <div data-id="loading-spinner" className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 bg-opacity-70 z-50 backdrop-blur-sm">
        <svg className="animate-spin h-10 w-10 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        {message && <p className="mt-4 text-white font-semibold">{message}</p>}
    </div>
);

const Placeholder: React.FC = () => (
  <div className="w-full h-full bg-gray-800 rounded-2xl flex items-center justify-center text-center p-4">
    <div className="text-gray-500">
        <svg className="mx-auto h-20 w-20" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
        <p className="mt-2 text-lg font-semibold">Quảng cáo của bạn sẽ hiện ở đây</p>
        <p className="text-sm">Tải ảnh lên để bắt đầu</p>
    </div>
  </div>
);

const ContentEditable: React.FC<{ value: string; onChange: (value: string) => void; className?: string }> = ({ value, onChange, className }) => {
  return (
    <span
      contentEditable
      suppressContentEditableWarning
      onBlur={(e) => onChange(e.currentTarget.textContent || '')}
      className={`${className} focus:outline-none focus:ring-2 focus:ring-pink-400 focus:bg-pink-900/50 rounded-sm px-1`}
      dangerouslySetInnerHTML={{ __html: value }}
    />
  );
};


const ImageComposition = forwardRef<HTMLDivElement, ImageCompositionProps>(({ 
  mode, imageSrcs, text, onTextChange, brandName, onBrandNameChange, onRegenerateAdCopy, bannerHeight, bannerColor, isLoading, isTextLoading, loadingMessage,
  brandNameColor, brandNameFont, brandNameSize
}, ref) => {
  if (imageSrcs.every(src => !src)) {
    return <Placeholder />;
  }
  
  const bannerStyle = {
    height: `${bannerHeight}%`,
    '--banner-color': bannerColor,
  } as React.CSSProperties;

  const centerImageStyle = {
      maskImage: 'linear-gradient(to bottom, black 55%, transparent 95%)'
  };
  
  const isSingleModeView = mode === 'single' && imageSrcs[2];

  return (
    <div ref={ref} className="relative w-full h-full bg-gray-900 overflow-hidden rounded-2xl shadow-2xl shadow-blue-500/10">
      {isLoading && <LoadingSpinner message={loadingMessage} />}
      
      {isSingleModeView ? (
        <img
            src={imageSrcs[2]!}
            alt="AI Generated Ad"
            className="absolute inset-0 w-full h-full object-cover"
        />
      ) : (
        <>
            {/* Background Image 1 (Left) */}
            {imageSrcs[0] && <img
                src={imageSrcs[0]}
                alt="Background composition 1"
                className="absolute top-0 left-[-15%] w-[80%] h-[60%] object-cover opacity-50"
                style={{ maskImage: 'linear-gradient(to bottom, black 50%, transparent 100%)'}}
            />}

            {/* Background Image 2 (Right) */}
            {imageSrcs[1] && <img
                src={imageSrcs[1]}
                alt="Background composition 2"
                className="absolute top-0 right-[-15%] w-[80%] h-[60%] object-cover opacity-60 z-10"
                style={{ 
                    filter: 'drop-shadow(-5px 0px 10px rgba(59, 130, 246, 0.6))',
                    maskImage: 'linear-gradient(to bottom, black 50%, transparent 100%)'
                }}
            />}

            {/* Centerpiece Image */}
            {imageSrcs[2] && <img
                src={imageSrcs[2]}
                alt="Main product"
                className="absolute top-[28%] left-1/2 -translate-x-1/2 w-[65%] h-[50%] object-contain z-20"
                style={centerImageStyle}
            />}
        </>
      )}


      {/* Banner */}
      <div 
        data-id="banner-overlay"
        className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-[var(--banner-color)] to-transparent z-30"
        style={bannerStyle}
        >
        <div className="w-full h-full p-6 flex flex-col justify-end items-center text-center">
          
           <div
                className="min-h-12 mb-4 drop-shadow-lg flex items-center justify-center"
                style={{
                    color: brandNameColor,
                    fontFamily: brandNameFont,
                    fontSize: `${brandNameSize}px`,
                    fontWeight: 700,
                    lineHeight: 1.2
                }}
            >
                <ContentEditable
                    value={brandName}
                    onChange={onBrandNameChange}
                />
            </div>

          {/* Generated Text */}
          <div className="text-white font-semibold text-lg leading-snug max-w-full">
            {isLoading && !text ? (
                <span className="flex items-center justify-center gap-2">
                    <SparklesIcon className="w-5 h-5 animate-pulse" /> Generating caption...
                </span>
            ) : (
              <div className="relative group">
                <ContentEditable 
                  value={text || "+ 1 chiếc nỉ tằm thỏ dài tay có thiết kế lạ mà cá tính, khiến các tín đồ có gu bị dính ngay từ cái nhìn đầu tiên ..!!!"}
                  onChange={onTextChange}
                />
                {!isLoading && text && (
                  <button 
                    data-id="regenerate-button"
                    onClick={onRegenerateAdCopy} 
                    className="absolute -right-8 top-1/2 -translate-y-1/2 p-1 rounded-full bg-white/10 text-white hover:bg-white/20 transition-all disabled:opacity-50" 
                    disabled={isTextLoading}
                  >
                    {isTextLoading ? (
                        <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                    ) : (
                        <ArrowPathIcon className="w-4 h-4" />
                    )}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

export default ImageComposition;