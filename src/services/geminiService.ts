import { GoogleGenAI, Modality, Type } from "@google/genai";
import type { ImageFile, ExtractionType, ImagePayload } from '../types';

const API_KEY = process.env.API_KEY;
if (!API_KEY) {
    throw new Error("API_KEY environment variable not set.");
}
const ai = new GoogleGenAI({ apiKey: API_KEY });

// === LOGIC TỪ DỰ ÁN 1 (AI Fashion Ad Creator) ===

export const generateCompositeImage = async (image: ImagePayload): Promise<string> => {
  const model = 'gemini-2.5-flash-image';
  const prompt = `From the source image, create a single, new, professional promotional image with a 9:16 aspect ratio, perfect for social media stories.
  This new image MUST feature three artistic variations of the same person from the source photo, composed together in a stylish layout.
  - It is absolutely critical that the face of the person in all three variations is an exact and faithful representation of the face in the source image. Do not alter their facial features, identity, or ethnicity.
  - One variation should be the main focus: positioned centrally, clear and sharp.
  - The other two variations should be secondary: placed in the background on the left and right, perhaps larger and slightly faded or stylized to create depth.
  - Each of the three variations must have a different, flattering pose and expression that showcases the clothing from different angles.
  - Crucially, you must replace the original background with a new, stylish, and complementary background that fits a modern fashion aesthetic. This could be a clean studio backdrop, a soft abstract gradient, or a subtle, out-of-focus lifestyle scene. The background should enhance the subject, not distract from them.
  - The final output must be a single, complete image with the subject variations and the new background integrated seamlessly. Do not add any text, logos, or banners.`;
  
  try {
     const response = await ai.models.generateContent({
      model: model,
      contents: { parts: [{ text: prompt }, { inlineData: { data: image.base64, mimeType: image.mimeType } }] },
      config: { responseModalities: [Modality.IMAGE] },
    });
    if (response.candidates && response.candidates[0].content.parts[0]?.inlineData) {
      return response.candidates[0].content.parts[0].inlineData.data;
    }
    throw new Error("AI did not return a composite image.");
  } catch(error) {
    console.error("Error calling Gemini for composite image generation:", error);
    throw new Error("Failed to generate composite image using Gemini API.");
  }
};

export const generateAdCopy = async (images: ImagePayload[]): Promise<string> => {
  const model = 'gemini-2.5-flash';
  const prompt = `
    Your role is a creative social media marketer for a trendy Vietnamese fashion brand targeting Gen Z.
    Based on the fashion item in the image(s), write a short, catchy, and stylish promotional caption in Vietnamese.
    - The tone should be youthful, confident, and use trendy slang if appropriate ('cực cháy', 'siêu đỉnh', etc.).
    - The caption must start with the characters "+ 1".
    - Describe the item's key features or vibe in an exciting way.
    - Keep it concise, around 20-30 words.
    - The caption must end with '..!!!'
  `;
  const textPart = { text: prompt };
  const imageParts = images.map(image => ({
    inlineData: { data: image.base64, mimeType: image.mimeType },
  }));
  const contents = { parts: [textPart, ...imageParts] };
  try {
    const response = await ai.models.generateContent({ model: model, contents: contents });
    return response.text;
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    throw new Error("Failed to generate content from Gemini API.");
  }
};


// === LOGIC TỪ DỰ ÁN 2 (AI Outfit Extractor) ===

// Lấy prompt chi tiết, không chỉ là tóm tắt
const getPromptForType = (type: ExtractionType): string => {
  switch (type) {
    case 'top':
      return "Nhiệm vụ của bạn là tách trang phục một cách chính xác. Từ hình ảnh được cung cấp, hãy xác định trang phục phía trên (áo sơ mi, áo phông, áo khoác, v.v.).";
    case 'bottom':
      return "Nhiệm vụ của bạn là tách trang phục một cách chính xác. Từ hình ảnh được cung cấp, hãy xác định trang phục phía dưới (quần, váy, quần short, v.v.).";
    case 'full':
    default:
      return "Nhiệm vụ của bạn là tách trang phục một cách chính xác. Từ hình ảnh được cung cấp, hãy xác định toàn bộ trang phục mà người đó đang mặc.";
  }
}


// === LOGIC TỪ DỰ ÁN 3 (Tools ghép người) ===

export const enhanceBackgroundPrompt = async (backgroundPrompt: string): Promise<{ enhanced_background: string }> => {
  try {
    const model = 'gemini-2.5-flash';
    const textPrompt = `Bạn là một giám đốc nghệ thuật chuyên nghiệp cho các buổi chụp hình thời trang cao cấp. Nhận mô tả bối cảnh đơn giản sau đây: "${backgroundPrompt}".
    Nhiệm vụ của bạn là biến nó thành một đoạn văn mô tả chi tiết, sống động và đầy cảm hứng, phù hợp cho một buổi chụp hình thời trang. Hãy tập trung vào các yếu tố sau:
    1.  **Ánh sáng:** Mô tả nguồn sáng (tự nhiên, nhân tạo), hướng, cường độ và màu sắc. Ánh sáng có tạo ra bóng đổ nghệ thuật hay không?
    2.  **Chi tiết vật liệu & kết cấu:** Thêm các chi tiết cụ thể. Ví dụ: thay vì 'tường gạch', hãy viết 'bức tường gạch thô mộc màu đất nung với những mảng rêu xanh điểm xuyết'.
    3.  **Không khí (Atmosphere):** Gợi tả cảm xúc của bối cảnh (ví dụ: lãng mạn, huyền bí, sang trọng, năng động, yên bình).
    4.  **Yếu tố phụ:** Thêm các chi tiết phụ để làm bối cảnh thêm phong phú (ví dụ: sương sớm, những cánh hoa rơi, một chiếc ghế bành cổ điển).
    5.  **Ngôn ngữ:** Sử dụng ngôn từ giàu hình ảnh, khơi gợi cảm xúc.
    
    Hãy trả về kết quả dưới dạng một đối tượng JSON với một khóa duy nhất: 'enhanced_background'.`;

    const response = await ai.models.generateContent({
      model: model,
      contents: textPrompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            enhanced_background: {
              type: Type.STRING,
              description: 'Mô tả bối cảnh chi tiết và sống động hơn.',
            },
          },
        },
      },
    });
    
    let jsonStr = response.text.trim();
    if (jsonStr.startsWith('```json')) {
      jsonStr = jsonStr.substring(7, jsonStr.length - 3).trim();
    }
    const parsed = JSON.parse(jsonStr);
    return parsed;

  } catch (error) {
    console.error("Lỗi biến tấu bối cảnh:", error);
    throw new Error("Không thể biến tấu bối cảnh. Vui lòng thử lại.");
  }
};

export const generateImageVariation = async (
  sourceImage: ImageFile,
  prompts: { outfit: string, background: string },
  aspectRatio: string,
  cameraAngle: string,
): Promise<string> => {
  try {
    const model = 'gemini-2.5-flash-image';

    // Xử lý ảnh gốc (từ P3, App.tsx)
    // Chúng ta phải xử lý ảnh gốc để thêm nền xanh cho đúng logic của P3
    const preprocessedImage = await preprocessImageForAspectRatio(sourceImage, aspectRatio);

    const textPrompt = `
      **Nhiệm vụ: Cấy ghép kỹ thuật số - Chỉ thay đổi trang phục và bối cảnh.**

      **QUY TẮC BẮT BUỘC:**
      1.  **GIỮ NGUYÊN 100% NGƯỜI GỐC:** Giữ lại chính xác người trong ảnh gốc: khuôn mặt, nét mặt, kiểu tóc, màu tóc, màu da, dáng người. KHÔNG ĐƯỢC THAY ĐỔI.
      2.  **XỬ LÝ NỀN XANH (YÊU CẦU TUYỆT ĐỐI):** Hình ảnh đầu vào có một nền màu xanh lá cây sáng (#00FF00) bao quanh. Nhiệm vụ của bạn là phải **XÓA SẠCH** và **THAY THẾ HOÀN TOÀN** 100% vùng màu xanh này bằng bối cảnh được mô tả. Đây là yêu cầu quan trọng nhất. **KHÔNG ĐƯỢC PHÉP** để lại bất kỳ pixel màu xanh nào trong ảnh kết quả. Toàn bộ khung hình phải được lấp đầy.
      3.  **THI CÔNG TRANG PHỤC THEO BẢN VẼ KỸ THUẬT (Mô tả trang phục):** Mô tả trang phục dưới đây là một **bản vẽ kỹ thuật không thể thay đổi**. Nhiệm vụ của bạn là thi công chính xác 100% từng chi tiết. **TUYỆT ĐỐI CẤM** việc diễn giải, sáng tạo, thêm, bớt, hoặc thay đổi bất kỳ chi tiết nào. 
      4.  **THAY ĐỔI:** Chỉ thay đổi trang phục và bối cảnh dựa trên mô tả dưới đây.
      5.  **TỈ LỆ KHUNG HÌNH:** Tạo ra hình ảnh với tỉ lệ khung hình chính xác là ${aspectRatio}.
      6.  **GÓC CHỤP:** Chụp ảnh từ góc ${cameraAngle}.
      7.  **CHẤT LƯỢNG:** Hình ảnh phải siêu thực, chất lượng 4K, chi tiết và sắc nét.

      **Mô tả chi tiết:**
      -   **Trang phục:** ${prompts.outfit}
      -   **Bối cảnh:** ${prompts.background}

      **ĐẦU RA:** Chỉ trả về duy nhất một tệp hình ảnh. Không trả về bất kỳ văn bản nào.
    `;

    const imagePart = {
      inlineData: {
        data: preprocessedImage.base64,
        mimeType: preprocessedImage.mimeType,
      },
    };

    const textPart = { text: textPrompt };

    const response = await ai.models.generateContent({
      model: model,
      contents: { parts: [imagePart, textPart] },
      config: {
        responseModalities: [Modality.IMAGE, Modality.TEXT],
      },
    });

    if (response.candidates && response.candidates[0].content.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData && part.inlineData.mimeType.startsWith('image/')) {
          return part.inlineData.data;
        }
      }
    }
    
    // Handle lỗi (copy từ P3)
    if (response.text) {
        throw new Error(`AI trả về tin nhắn văn bản thay vì ảnh: "${response.text}"`);
    }
    const blockReason = response.candidates?.[0]?.finishReason;
    if (blockReason && blockReason !== 'STOP') {
        throw new Error(`Bị chặn bởi lý do an toàn hoặc lỗi khác: ${blockReason}`);
    }
    throw new Error("Không có ảnh nào được tạo trong phản hồi.");

  } catch (error) {
    console.error("Lỗi tạo biến thể ảnh:", error);
    if (error instanceof Error) {
        throw error;
    }
    throw new Error("Một lỗi không xác định đã xảy ra khi tạo ảnh.");
  }
};

// Hàm xử lý nền xanh (Lấy từ P3 - App.tsx, chuyển vào service)
const preprocessImageForAspectRatio = (imageFile: ImageFile, targetAspectRatio: string): Promise<ImageFile> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = imageFile.previewUrl;
    img.onload = () => {
        const [w, h] = targetAspectRatio.split(':').map(Number);
        const targetRatio = w / h;
        
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error("Không thể tạo canvas context"));

        const imageRatio = img.naturalWidth / img.naturalHeight;
        
        let newWidth, newHeight;
        if (imageRatio > targetRatio) {
          newWidth = img.naturalWidth;
          newHeight = img.naturalWidth / targetRatio;
        } else {
          newWidth = img.naturalHeight * targetRatio;
          newHeight = img.naturalHeight;
        }

        canvas.width = newWidth;
        canvas.height = newHeight;
        
        ctx.fillStyle = '#00FF00'; // Nền xanh lá
        ctx.fillRect(0, 0, newWidth, newHeight);

        const x = (newWidth - img.naturalWidth) / 2;
        const y = (newHeight - img.naturalHeight) / 2;

        ctx.drawImage(img, x, y, img.naturalWidth, img.naturalHeight);

        canvas.toBlob((blob) => {
          if (!blob) return reject(new Error("Không thể tạo blob"));
          const reader = new FileReader();
          reader.onload = (e) => {
            const base64 = (e.target?.result as string).split(',')[1];
            const file = new File([blob], "preprocessed_image.jpeg", { type: 'image/jpeg' });
            resolve({
              file,
              previewUrl: URL.createObjectURL(file),
              base64,
              mimeType: 'image/jpeg',
            });
          };
          reader.readAsDataURL(blob);
        }, 'image/jpeg', 0.95);
    };
    img.onerror = () => reject(new Error("Không thể tải ảnh gốc"));
  });
};


// === HÀM MỚI (Gộp P2 + P3) ===

export const analyzeSpecificOutfitPart = async (
  styleImage: ImageFile,
  extractionType: ExtractionType
): Promise<{ outfit: string }> => {
  try {
    const model = 'gemini-2.5-flash';
    
    // 1. Lấy logic "focus" từ P2
    const focusPrompt = getPromptForType(extractionType);

    // 2. Lấy logic "phân tích chi tiết" từ P3 và tiêm logic P2 vào
    const analysisPrompt = `
      Bạn là một chuyên gia giám định thời trang kỹ thuật số. Nhiệm vụ của bạn là tạo ra một bản 'báo cáo giám định' chi tiết đến từng micromet về trang phục trong ảnh.
      
      **NHIỆM VỤ ƯU TIÊN:** ${focusPrompt} 
      
      Sau khi đã xác định (các) món đồ thuộc nhiệm vụ ưu tiên, hãy thực hiện QUY TRÌNH GIÁM ĐỊNH BẮT BUỘC chỉ trên (các) món đồ đó. Bỏ qua tất cả các món đồ, phụ kiện, tóc, mặt người... không liên quan đến nhiệm vụ ưu tiên.
      
      **TƯ DUY KỸ THUẬT - KHÔNG SÁNG TẠO:**
      * **Bạn là một máy quét 3D, không phải là nhà thiết kế.**
      * **Mỗi từ phải tương ứng với một pixel.**
      
      **QUY TRÌNH GIÁM ĐỊNH BẮT BUỘC (ÁP DỤNG CHO MÓN ĐỒ ƯU TIÊN):**

      1.  **PHÂN LOẠI & LIỆT KÊ:** Xác định và liệt kê (các) món đồ thuộc nhiệm vụ ưu tiên.
      2.  **PHÂN TÍCH MÀU SẮC (CẤP ĐỘ PHÒNG LAB):** * Với mỗi món đồ, xác định **CHÍNH XÁC** mã màu HEX.
      3.  **GIÁM ĐỊNH CHẤT LIỆU & KẾT CẤU (CẢM QUAN VI MÔ):**
          * Mô tả **kết cấu bề mặt**, **độ bóng**, **độ dày** và **cách nó đổ xuống, xếp nếp**.
      4.  **GIẢI PHẪU KIỂU DÁNG & ĐƯỜNG CẮT:**
          * Mô tả chi tiết hình dáng của từng món đồ.
      5.  **SOI KÍNH HIỂN VI: HỌA TIẾT (PATTERNS):**
          * Phân tích như một nhà toán học: kích thước, quy luật lặp lại.
      6.  **GIÁM ĐỊNH PHÁP Y: CHI TIẾT TRANG TRÍ (EMBELLISHMENTS):**
          * **KHÔNG CÓ CHI TIẾT NÀO LÀ QUÁ NHỎ.** Cúc áo, khóa kéo, đường thêu, ren...

      **YÊU CẦU ĐẦU RA:**
      * **TUYỆT ĐỐI KHÔNG** mô tả người mẫu (mặt, tóc, da, dáng), hậu cảnh, hoặc bất cứ thứ gì ngoài (các) món đồ thuộc nhiệm vụ ưu tiên.
      * Toàn bộ bản phân tích phải được gói gọn trong một đối tượng JSON duy nhất với key là 'outfit'.
    `;

    const imagePart = {
      inlineData: {
        data: styleImage.base64,
        mimeType: styleImage.mimeType,
      },
    };
    const textPart = { text: analysisPrompt };

    const response = await ai.models.generateContent({
      model: model,
      contents: { parts: [imagePart, textPart] },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            outfit: {
              type: Type.STRING,
              description: 'Mô tả chi tiết về trang phục được yêu cầu (áo, quần hoặc cả bộ).',
            },
          },
        },
      },
    });

    let jsonStr = response.text.trim();
    if (jsonStr.startsWith('```json')) {
      jsonStr = jsonStr.substring(7, jsonStr.length - 3).trim();
    }
    const parsed = JSON.parse(jsonStr);
    return parsed;

  } catch (error) {
    console.error("Lỗi phân tích phần trang phục cụ thể:", error);
    throw new Error("Không thể phân tích ảnh sản phẩm. Vui lòng thử lại.");
  }
};