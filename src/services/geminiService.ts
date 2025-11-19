import { GoogleGenAI, Modality, Type } from "@google/genai";
import type { ImageFile, ExtractionType, ImagePayload } from '../types';

const API_KEY = process.env.API_KEY;
if (!API_KEY) {
    throw new Error("API_KEY environment variable not set.");
}
const ai = new GoogleGenAI({ apiKey: API_KEY });

// === GENERATE COMPOSITE IMAGE - ĐÃ SỬA ĐỂ NHẬN EXTRACTED PRODUCT ===
export const generateCompositeImage = async (
  modelImage: ImagePayload, 
  productImage: ImagePayload,
  extractedProduct?: string // THÊM THAM SỐ MỚI
): Promise<string> => {
  const model = 'gemini-2.5-flash-image';
  
  // XÁC ĐỊNH CÓ DÙNG EXTRACTED PRODUCT HAY KHÔNG
  const usingExtractedProduct = !!extractedProduct;
  const finalProductImage = usingExtractedProduct ? extractedProduct : productImage.base64;

  const prompt = `
**TASK: TẠO POSTER THỜI TRANG CHÂN THỰC - BẢO TOÀN 100% TÍNH XÁC THỰC**

**Nguồn 1: ẢNH NGƯỜI MẪU** - Chứa khuôn mặt người thật
**Nguồn 2: ${usingExtractedProduct ? 'ẢNH SẢN PHẨM ĐÃ TÁCH' : 'ẢNH SẢN PHẨM GỐC'}** - ${usingExtractedProduct ? 'Sản phẩm đã được tách sạch (không có người)' : 'Chứa sản phẩm thời trang THẬT'}

**YÊU CẦU KHẮT KHE VỀ ĐỘ CHÂN THỰC:**

1. **BẢO TOÀN KHUÔN MẶT 100%:**
   - Giữ nguyên 100% đặc điểm khuôn mặt từ ảnh model
   - Giữ nguyên màu da, hình dạng mắt, mũi, miệng
   - Giữ nguyên kiểu tóc, màu tóc
   - Giữ nguyên biểu cảm tự nhiên

2. **SỬ DỤNG SẢN PHẨM THẬT 100%:**
   - Dùng CHÍNH XÁC sản phẩm từ ${usingExtractedProduct ? 'ảnh sản phẩm đã tách' : 'ảnh product'}
   - Giữ nguyên màu sắc, chất liệu, texture
   - Giữ nguyên form dáng, kiểu may
   - Giữ nguyên tất cả chi tiết: nút, khóa, đường may

3. **TÍNH CHÂN THỰC CAO:**
   - Ánh sáng tự nhiên, bóng đổ thực tế
   - Kết cấu da thật, tóc thật
   - Sản phẩm vừa vặn tự nhiên
   - Ảnh trông như chụp thật, không phải AI

4. **${usingExtractedProduct ? 'SỬ DỤNG SẢN PHẨM ĐÃ TÁCH SẠCH' : 'TÁCH VÀ SỬ DỤNG SẢN PHẨM TỪ ẢNH GỐC'}:**
   - ${usingExtractedProduct ? 'Sản phẩm đã được tách sẵn - không có người mẫu khác' : 'Loại bỏ mọi người mẫu khác từ ảnh sản phẩm'}
   - Chỉ sử dụng sản phẩm thời trang
   - Đảm bảo không có khuôn mặt nào khác ngoài model chính

5. **KỸ THUẬT:**
   - Layout 9:16 chuyên nghiệp
   - Background phù hợp
   - KHÔNG chữ, KHÔNG logo
   - Tỷ lệ chính xác 9:16

**ĐẦU RA:** Poster thời trang chân thực, người mẫu và sản phẩm giống 100% ảnh gốc.
`;

  try {
    const imageParts = [
      { text: prompt },
      { text: "👤 MODEL IMAGE (for face extraction):" },
      { inlineData: { data: modelImage.base64, mimeType: modelImage.mimeType } },
      { text: `🛍️ ${usingExtractedProduct ? 'EXTRACTED PRODUCT' : 'PRODUCT IMAGE'} (use ACTUAL product):` },
      { inlineData: { data: finalProductImage, mimeType: usingExtractedProduct ? 'image/png' : productImage.mimeType } }
    ];

    console.log(`🖼️ Generating composite image with ${usingExtractedProduct ? 'EXTRACTED product' : 'original product'}`);

    const response = await ai.models.generateContent({
      model: model,
      contents: { 
        parts: imageParts
      },
      config: { responseModalities: [Modality.IMAGE] },
    });

    if (response.candidates && response.candidates[0].content.parts[0]?.inlineData) {
      console.log('✅ Composite image generated successfully');
      return response.candidates[0].content.parts[0].inlineData.data;
    }
    throw new Error("AI did not return a composite image.");
  } catch(error) {
    console.error("❌ Error generating composite image:", error);
    throw new Error(`Failed to generate composite image: ${error.message}`);
  }
};

// === GENERATE IMAGE VARIATION - ĐÃ SỬA ĐỂ DÙNG EXTRACTED PRODUCT ===
export const generateImageVariation = async (
  modelImage: ImageFile,
  productImage: ImageFile,
  background: string,
  aspectRatio: string,
  cameraAngle: string,
  extractedProduct?: string // THÊM THAM SỐ MỚI
): Promise<string> => {
  try {
    const model = 'gemini-2.5-flash-image';
    const targetSize = calculateTargetSize(aspectRatio);

    console.log('🔍 Starting product extraction and image generation process...');

    // 🔄 BƯỚC 1: TÁCH SẢN PHẨM (NẾU CHƯA CÓ)
    let extractedProductBase64: string;
    if (extractedProduct) {
      console.log('🛍️ Using provided extracted product');
      extractedProductBase64 = extractedProduct;
    } else {
      try {
        console.log('🛍️ Extracting product from original image...');
        extractedProductBase64 = await extractProductFromImage(productImage);
      } catch (extractionError) {
        console.error('❌ Product extraction failed, using original image:', extractionError);
        extractedProductBase64 = productImage.base64;
      }
    }

    // 🔄 BƯỚC 2: TẠO ẢNH VỚI SẢN PHẨM ĐÃ TÁCH
    const textPrompt = `
**🎯 FASHION INTEGRATION - MODEL WITH ${extractedProduct ? 'EXTRACTED' : 'ORIGINAL'} PRODUCT**

**TASK: PLACE OUR MODEL INTO THE FASHION PRODUCT**

**IMAGE COMPONENTS:**
1. **MODEL IMAGE:** Source for face and body
2. **${extractedProduct ? 'EXTRACTED PRODUCT' : 'PRODUCT IMAGE'}:** ${extractedProduct ? 'Pure fashion item (already isolated)' : 'Fashion item to extract and use'}
3. **BACKGROUND:** ${background}
4. **CAMERA ANGLE:** ${cameraAngle}

**INTEGRATION PROCESS:**
1. **USE EXACT FACE** from model image - preserve 100% facial features
2. **${extractedProduct ? 'APPLY EXTRACTED PRODUCT' : 'EXTRACT AND APPLY PRODUCT'}** naturally onto the model
3. **MAINTAIN** natural body proportions and pose
4. **ENSURE** realistic product fit and drape
5. **CREATE** professional fashion photography result

**FACE PRESERVATION:**
- Keep 100% identical facial features from model
- Maintain natural, fresh expression
- Bright eyes with subtle smile
- Confident and approachable vibe

**PRODUCT INTEGRATION:**
- ${extractedProduct ? 'Use the extracted product exactly as provided' : 'Extract and use only the fashion item from product image'}
- Ensure natural fit on model's body
- Maintain product color, texture, and design
- Realistic fabric movement and drape
- ${extractedProduct ? 'Product is already clean - no people to remove' : 'Remove any other people from product image'}

**OUTPUT REQUIREMENTS:**
- Size: ${targetSize.width}x${targetSize.height}px
- Professional fashion photography quality
- Natural lighting and composition
- Model wearing the product naturally

**FINAL CHECK:**
The result should show our model naturally wearing the fashion product, with perfect face preservation and realistic product integration.
`;

    const modelImagePart = {
      inlineData: {
        data: modelImage.base64,
        mimeType: modelImage.mimeType,
      },
    };

    const productPart = {
      inlineData: {
        data: extractedProductBase64,
        mimeType: extractedProduct ? 'image/png' : productImage.mimeType,
      },
    };

    const textPart = { text: textPrompt };

    const response = await ai.models.generateContent({
      model: model,
      contents: { 
        parts: [
          textPart,
          { text: "👤 MODEL IMAGE - USE THIS EXACT FACE AND BODY:" },
          modelImagePart,
          { text: `🛍️ ${extractedProduct ? 'EXTRACTED PRODUCT' : 'PRODUCT IMAGE'} - ${extractedProduct ? 'APPLY THIS FASHION ITEM' : 'EXTRACT AND USE THIS FASHION ITEM'}:` },
          productPart,
          { text: `🎯 INTEGRATION: Place model into the product with ${cameraAngle} angle and ${background} background` }
        ] 
      },
      config: {
        responseModalities: [Modality.IMAGE],
      },
    });

    if (response.candidates && response.candidates[0].content.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData && part.inlineData.mimeType.startsWith('image/')) {
          const resultBase64 = part.inlineData.data;
          
          const dimensions = await getImageDimensions(resultBase64);
          const isCorrectSize = dimensions.width === targetSize.width && dimensions.height === targetSize.height;
          
          if (!isCorrectSize) {
            console.error(`❌ Wrong dimensions: ${dimensions.width}x${dimensions.height}`);
          } else {
            console.log(`✅ Correct dimensions: ${dimensions.width}x${dimensions.height}`);
          }
          
          console.log(`🎉 Image generated successfully with ${extractedProduct ? 'extracted product' : 'original product'}`);
          return resultBase64;
        }
      }
    }
    
    throw new Error("No image generated");

  } catch (error) {
    console.error("💥 Image generation error:", error);
    throw error;
  }
};

// === EXTRACT PRODUCT FROM IMAGE - GIỮ NGUYÊN ===
export const extractProductFromImage = async (productImage: ImageFile): Promise<string> => {
  try {
    const model = 'gemini-2.5-flash-image';
    
    const textPrompt = `
**🎯 PRODUCT EXTRACTION - ISOLATE FASHION ITEM**

**TASK: EXTRACT ONLY THE FASHION PRODUCT FROM THE IMAGE**

**CRITICAL INSTRUCTIONS:**
1. **REMOVE ALL HUMAN ELEMENTS** - completely erase any faces, bodies, or people
2. **EXTRACT ONLY THE CLOTHING ITEM** - focus solely on the fashion product
3. **PRESERVE PRODUCT DETAILS** - maintain exact color, texture, design, and form
4. **CREATE CLEAN PRODUCT ISOLATION** - remove background and human elements

**STEP-BY-STEP EXTRACTION:**
1. **IDENTIFY** the main fashion item (clothing, accessory, etc.)
2. **SEGMENT** the product from human elements and background
3. **REMOVE** all facial features, body parts, and people
4. **ISOLATE** the pure product with transparent/white background
5. **PRESERVE** exact product specifications

**PRODUCT PRESERVATION - MUST KEEP:**
- ✅ Exact color and color patterns
- ✅ Fabric texture and material appearance
- ✅ Design details (prints, embroidery, patterns)
- ✅ Product form and cut
- ✅ All hardware (buttons, zippers, buckles)
- ✅ Size proportions and fit characteristics

**ELEMENTS TO REMOVE - MUST DELETE:**
- 🚫 All human faces and facial features
- 🚫 Body parts (arms, legs, torso)
- 🚫 Hair and skin elements
- 🚫 Background environments
- 🚫 Other models or people

**OUTPUT REQUIREMENTS:**
- Clean product isolation on transparent/white background
- No remnants of human elements
- Perfect preservation of product details
- Ready for integration with new model

**FINAL CHECK:**
The output should show ONLY the fashion item, completely separate from any human elements, ready to be worn by a different model.
`;

    const productImagePart = {
      inlineData: {
        data: productImage.base64,
        mimeType: productImage.mimeType,
      },
    };

    const textPart = { text: textPrompt };

    console.log('🔍 Analyzing and extracting product from image...');

    const response = await ai.models.generateContent({
      model: model,
      contents: { 
        parts: [
          textPart,
          { text: "🛍️ PRODUCT IMAGE - EXTRACT ONLY THE FASHION ITEM (REMOVE ALL PEOPLE):" },
          productImagePart
        ] 
      },
      config: {
        responseModalities: [Modality.IMAGE],
      },
    });

    if (response.candidates && response.candidates[0].content.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData && part.inlineData.mimeType.startsWith('image/')) {
          const extractedProductBase64 = part.inlineData.data;
          console.log('✅ Product extracted successfully');
          return extractedProductBase64;
        }
      }
    }

    throw new Error("Could not extract product from image");

  } catch (error) {
    console.error("💥 Product extraction error:", error);
    throw new Error(`Product extraction failed: ${error instanceof Error ? error.message : String(error)}`);
  }
};

// === GENERATE PRODUCT VARIANTS - HÀM MỚI ===
export const generateProductVariants = async (
  extractedProduct: string,
  style: string = 'modern fashion'
): Promise<string[]> => {
  try {
    const model = 'gemini-2.5-flash-image';
    
    const prompt = `
**TASK: CREATE PRODUCT VARIATIONS USING EXTRACTED PRODUCT**

**SOURCE: EXTRACTED PRODUCT IMAGE** - Clean, isolated fashion item

**REQUIREMENTS:**
1. USE ONLY the extracted product as reference
2. CREATE 3 different variations showing the product in different:
   - Contexts/backgrounds
   - Lighting conditions  
   - Styling approaches
3. Each variation should be professional 1:1 product shot
4. Maintain product details and features accurately
5. No human models - focus on product presentation

**STYLE:** ${style}

**OUTPUT:** 3 distinct product variation images
`;

    const productPart = {
      inlineData: {
        data: extractedProduct,
        mimeType: 'image/png',
      },
    };

    console.log('🎨 Generating product variants from extracted product...');

    const response = await ai.models.generateContent({
      model: model,
      contents: { 
        parts: [
          { text: prompt },
          { text: "🛍️ EXTRACTED PRODUCT - CREATE VARIATIONS FROM THIS ITEM:" },
          productPart
        ] 
      },
      config: {
        responseModalities: [Modality.IMAGE],
      },
    });

    const generatedImages: string[] = [];
    
    if (response.candidates && response.candidates[0].content.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData && part.inlineData.mimeType.startsWith('image/')) {
          generatedImages.push(part.inlineData.data);
        }
      }
    }

    console.log(`✅ Generated ${generatedImages.length} product variants`);
    return generatedImages.slice(0, 3); // Return max 3 images
  } catch (error) {
    console.error('❌ Error generating product variants:', error);
    throw new Error(`Failed to generate product variants: ${error.message}`);
  }
};

// === CÁC HÀM PHỤ TRỢ GIỮ NGUYÊN ===

// === GENERATE AD COPY ===
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

// === ENHANCE BACKGROUND PROMPT ===
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

// === ANALYZE SPECIFIC OUTFIT PART ===
const getPromptForType = (type: ExtractionType): string => {
  switch (type) {
    case 'top':
      return "PHÂN TÍCH CHI TIẾT 100% - TRANG PHỤC PHÍA TRÊN (ÁO)";
    case 'bottom':
      return "PHÂN TÍCH CHI TIẾT 100% - TRANG PHỤC PHÍA DƯỚI (QUẦN/VÁY)";
    case 'full':
    default:
      return "PHÂN TÍCH CHI TIẾT 100% - TOÀN BỘ TRANG PHỤC";
  }
}

export const analyzeSpecificOutfitPart = async (
  styleImage: ImageFile,
  extractionType: ExtractionType
): Promise<{ outfit: string }> => {
  try {
    const model = 'gemini-2.5-flash';
    
    const focusPrompt = getPromptForType(extractionType);

    const analysisPrompt = `
      BẠN LÀ MỘT HỆ THỐNG PHÂN TÍCH THỜI TRANG CHUYÊN SÂU - PHÂN TÍCH CHI TIẾT 100% VỚI ĐỘ CHÍNH XÁC TUYỆT ĐỐI

      **NHIỆM VỤ CHÍNH:** ${focusPrompt}

      **QUY TRÌNH PHÂN TÍCH BẮT BUỘC - PHẢI TUÂN THỦ TỪNG BƯỚC:**

      1. **XÁC ĐỊNH & PHÂN LOẠI CHÍNH XÁC:**
         - Xác định chính xác từng món đồ thuộc phạm vi phân tích
         - Phân loại rõ ràng: loại trang phục (áo thun, sơ mi, quần jeans, váy...)
         - Kiểu dáng cơ bản (dáng ôm, rộng, suông...)

      2. **PHÂN TÍCH MÀU SẮC - CẤP ĐỘ PHÒNG LAB:**
         - Xác định CHÍNH XÁC mã màu HEX cho từng phần của trang phục
         - Phân biệt rõ: màu chủ đạo, màu phụ, màu chi tiết
         - Mô tả độ bão hòa, độ sáng/tối

      3. **GIÁM ĐỊNH CHẤT LIỆU - CẢM QUAN KỸ THUẬT:**
         - Chất liệu chính (cotton, linen, silk, denim, polyester, v.v.)
         - Độ dày/mỏng, độ co giãn, độ cứng/mềm
         - Kết cấu bề mặt (trơn, nhám, bóng, mờ, có vân)
         - Cách tạo form (ôm body hay rộng rãi)

      4. **PHÂN TÍCH KIỂU DÁNG & ĐƯỜNG CẮT:**
         - Chiều dài chính xác (áo: crop-top, regular, dài; quần: short, regular, long)
         - Kiểu cổ (cổ tròn, cổ tim, cổ V, cổ vuông...)
         - Tay (không tay, ngắn, dài, loại tay)
         - Đường may, đường cắt đặc biệt

      5. **SOI CHI TIẾT HỌA TIẾT:**
         - Họa tiết: trơn, kẻ sọc, caro, hoa, hình in...
         - Kích thước họa tiết, mật độ lặp lại
         - Vị trí họa tiết trên trang phục

      6. **LIỆT KÊ CHI TIẾT TRANG TRÍ:**
         - Cúc: số lượng, màu sắc, chất liệu, kiểu dáng
         - Khóa kéo: loại, màu, vị trí
         - Túi: số lượng, kiểu dáng, vị trí
         - Đường viền, đường thêu, ren, đính đá...
         - Các chi tiết đặc biệt khác

      7. **TRẠNG THÁI & ĐẶC ĐIỂM:**
         - Độ mới/cũ (nếu có thể nhận biết)
         - Form dáng khi mặc
         - Đặc điểm nổi bật nhất

      **YÊU CẦU ĐẦU RA:**
      - Mô tả PHẢI chi tiết, kỹ thuật, khách quan
      - KHÔNG suy diễn, không sáng tạo thêm
      - CHỈ tập trung vào trang phục được yêu cầu
      - Bỏ qua người mẫu, hậu cảnh, phụ kiện không liên quan

      Kết quả trả về dưới dạng JSON với key 'outfit' chứa toàn bộ mô tả chi tiết.
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
              description: 'Mô tả chi tiết 100% về trang phục được yêu cầu.',
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

// === CÁC HÀM TIỆN ÍCH GIỮ NGUYÊN ===

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

export const getImageDimensions = (base64Image: string): Promise<{ width: number; height: number }> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = `data:image/png;base64,${base64Image}`;
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => reject(new Error("Không thể đọc kích thước ảnh"));
  });
};

export const downloadImage = (base64Data: string, filename: string = 'fashion-image') => {
  const link = document.createElement('a');
  link.download = `${filename}-${Date.now()}.png`;
  link.href = `data:image/png;base64,${base64Data}`;
  link.click();
};