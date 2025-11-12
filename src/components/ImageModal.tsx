import React from 'react';

interface ImageModalProps {
  imageUrl: string;
  onClose: () => void;
}

const ImageModal: React.FC<ImageModalProps> = ({ imageUrl, onClose }) => {
  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `generated-image-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Thêm animation fade-in
  const modalAnimation = {
    animation: 'fadeIn 0.2s ease-out',
  };

  const backdropAnimation = {
    animation: 'fadeIn 0.2s ease-out',
  };

  // CSS cho animation (bạn có thể thêm vào index.css nếu muốn, nhưng để đây cho tiện)
  const styles = `
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
  `;

  return (
    <div 
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-50"
      style={backdropAnimation}
      onClick={onClose}
    >
      <style>{styles}</style>
      <div 
        className="relative bg-gray-800 p-4 rounded-lg max-w-[90vw] max-h-[90vh] shadow-2xl shadow-blue-500/20"
        style={modalAnimation}
        onClick={(e) => e.stopPropagation()} // Ngăn việc bấm vào ảnh cũng tắt modal
      >
        <img 
          src={imageUrl} 
          alt="Enlarged view" 
          className="object-contain w-full h-full max-w-full max-h-[calc(90vh-100px)]"
        />

        {/* Nút Đóng (Close) */}
        <button
          onClick={onClose}
          className="absolute -top-4 -right-4 bg-gray-700 text-white rounded-full p-2 hover:bg-red-600 transition-colors focus:outline-none focus:ring-2 focus:ring-white z-10"
          aria-label="Close image viewer"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Nút Tải xuống */}
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex gap-4 bg-black/50 p-2 rounded-lg">
            <button
              onClick={handleDownload}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400"
              aria-label="Download image"
            >
               <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              <span>Tải xuống</span>
            </button>
        </div>
      </div>
    </div>
  );
};

export default ImageModal;