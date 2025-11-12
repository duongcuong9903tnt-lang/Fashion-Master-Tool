// import React, { useRef, useCallback } from 'react';
// import type { ImageFile } from '../types';

// interface ImageUploaderProps {
//   onFileSelect: (imageFile: ImageFile | null) => void;
//   imageFile: ImageFile | null;
//   title: string;
// }

// const ImageUploader: React.FC<ImageUploaderProps> = ({ onFileSelect, imageFile, title }) => {
//   const inputRef = useRef<HTMLInputElement>(null);

//   const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
//     const file = event.target.files?.[0];
//     if (file) {
//       processFile(file);
//     }
//   };
  
//   const processFile = (file: File) => {
//     if (!file.type.startsWith('image/')) {
//         alert("Please select an image file.");
//         return;
//     }
//     const reader = new FileReader();
//     reader.onload = (e) => {
//       const base64 = (e.target?.result as string).split(',')[1];
//       onFileSelect({
//         file,
//         previewUrl: URL.createObjectURL(file),
//         base64,
//         mimeType: file.type,
//       });
//     };
//     reader.readAsDataURL(file);
//   }

//   const handleRemove = (e: React.MouseEvent) => {
//     e.stopPropagation();
//     onFileSelect(null);
//     if (inputRef.current) {
//       inputRef.current.value = '';
//     }
//   };

//   const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
//     event.preventDefault();
//     event.stopPropagation();
//     if (event.dataTransfer.files && event.dataTransfer.files[0]) {
//       processFile(event.dataTransfer.files[0]);
//     }
//   }, []);

//   const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
//     event.preventDefault();
//     event.stopPropagation();
//   };


//   return (
//     <div 
//       className="w-full"
//       onDrop={handleDrop}
//       onDragOver={handleDragOver}
//     >
//       <input
//         type="file"
//         ref={inputRef}
//         onChange={handleFileChange}
//         className="hidden"
//         accept="image/*"
//       />
//       <div
//         className="w-full h-48 border-2 border-dashed border-gray-600 rounded-lg flex items-center justify-center text-gray-400 cursor-pointer hover:border-blue-500 hover:bg-gray-800/50 transition-colors relative"
//         onClick={() => inputRef.current?.click()}
//       >
//         {imageFile ? (
//           <>
//             <img src={imageFile.previewUrl} alt="Preview" className="h-full w-full object-contain rounded-lg p-2" />
//              <button onClick={handleRemove} className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1.5 hover:bg-red-500 transition-colors">
//                 <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
//                     <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
//                 </svg>
//             </button>
//           </>
//         ) : (
//           <span>{title}</span>
//         )}
//       </div>
//     </div>
//   );
// };

// export default ImageUploader;


import React, { useRef, useCallback } from 'react';
import type { ImageFile } from '../types';
import { fileToImageFile } from '../utils/imageUtils';

// Icon tải lên (thay vì import)
const UploadIcon = () => (
  <svg className="w-10 h-10 mb-3 text-gray-500" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16">
    <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"/>
  </svg>
);

// Icon Xóa
const CloseIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
  </svg>
);

interface ImageUploaderProps {
  onFileSelect: (imageFile: ImageFile | null) => void;
  imageFile: ImageFile | null;
  title: string;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({ onFileSelect, imageFile, title }) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const processFile = async (file: File) => {
    try {
      const imageFileData = await fileToImageFile(file);
      onFileSelect(imageFileData);
    } catch (error) {
      console.error(error);
      alert("Vui lòng chọn một file ảnh.");
    }
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onFileSelect(null);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer.files && event.dataTransfer.files[0]) {
      processFile(event.dataTransfer.files[0]);
    }
  }, []);

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
  };

  return (
    <div 
      className="w-full"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      <input
        type="file"
        ref={inputRef}
        onChange={handleFileChange}
        className="hidden"
        accept="image/*"
      />
      <div
        className="w-full aspect-square border-2 border-dashed border-gray-700 rounded-lg flex items-center justify-center text-gray-500 cursor-pointer hover:border-blue-500 hover:bg-gray-700/50 transition-all duration-300 relative bg-gray-800"
        onClick={() => inputRef.current?.click()}
      >
        {imageFile ? (
          <>
            <img 
              src={imageFile.previewUrl} 
              alt="Preview" 
              // ĐÂY LÀ PHẦN QUAN TRỌNG: object-contain
              // Nó đảm bảo ảnh nằm trọn trong khung, không bị phóng đại hay cắt xén
              className="h-full w-full object-contain rounded-lg p-1" 
            />
            <button onClick={handleRemove} className="absolute top-2 right-2 bg-black/70 text-white rounded-full p-1.5 hover:bg-red-600 transition-colors z-10">
              <CloseIcon />
            </button>
          </>
        ) : (
          <div className="text-center p-4 flex flex-col items-center">
            <UploadIcon />
            <span className="font-semibold text-gray-400 text-sm">{title}</span>
            <span className="text-xs text-gray-500">Nhấp hoặc kéo thả</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default ImageUploader;