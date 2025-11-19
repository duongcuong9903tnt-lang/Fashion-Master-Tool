import React from 'react';

interface Suggestion {
  title: string;
  items: string[];
}

const backgroundSuggestions: Suggestion[] = [
  {
    title: 'Danh lam Thắng cảnh Việt Nam',
    items: [
      'Hồ Gươm & Cầu Thê Húc, Hà Nội',
      'Phố cổ Hội An về đêm',
      'Vịnh Hạ Long trên du thuyền',
      'Ruộng bậc thang Sapa',
      'Cố đô Huế, Đại Nội',
      'Bãi biển Mỹ Khê, Đà Nẵng',
      'Nhà thờ Đức Bà, Sài Gòn',
      'Chợ Bến Thành nhộn nhịp',
      'Đồi cát Mũi Né, Phan Thiết',
      'Đảo Phú Quốc, bãi Sao',
    ],
  },
  {
    title: 'Không gian Quán xá Việt Nam',
    items: [
      'Quán cà phê sân vườn Sài Gòn',
      'Quán cà phê phong cách Indochine',
      'Quán cà phê tối giản (minimalist)',
      'Tiệm trà chiều kiểu Anh',
      'Quán phở vỉa hè Hà Nội',
      'Nhà hàng sang trọng trên rooftop',
      'Quán ăn gia đình ấm cúng',
      'Một góc ban công quán cà phê chung cư cũ',
      'Quán bia hơi vỉa hè',
      'Nhà hàng ven sông lãng mạn',
    ],
  },
  {
    title: 'Không gian Nhà ở Việt Nam',
    items: [
      'Phòng khách hiện đại, view thành phố',
      'Phòng ngủ ấm cúng với nội thất gỗ',
      'Căn bếp tối giản với đảo bếp',
      'Góc ban công trồng cây xanh mát',
      'Phòng đọc sách với giá sách lớn',
      'Sân thượng (rooftop) nhà riêng',
      'Ngôi nhà cổ ở Hà Nội',
      'Căn hộ studio sáng sủa',
      'Phòng tắm sang trọng với bồn tắm',
      'Khu vườn nhỏ sau nhà',
    ],
  },
  {
    title: 'Phong cảnh Làng quê & Thiên nhiên',
    items: [
      'Con đường làng quê rợp bóng tre',
      'Cánh đồng lúa chín vàng',
      'Vườn hoa cúc họa mi Hà Nội',
      'Rừng dừa Bến Tre',
      'Đầm sen lúc bình minh',
      'Chợ nổi Cái Răng, Cần Thơ',
      'Đồi chè Mộc Châu',
      'Bên một con suối trong vắt',
      'Vườn quốc gia Cúc Phương',
      'Bên một ngôi nhà sàn Tây Nguyên',
    ],
  },
  {
    title: 'Bối cảnh Đời thường & Đường phố',
    items: [
        'Đường phố Hà Nội mùa thu lá vàng rơi',
        'Một góc phố Sài Gòn tấp nập xe cộ',
        'Trên một chiếc xích lô',
        'Trước cổng một ngôi trường cổ',
        'Bên trong một siêu thị hiện đại',
        'Sân ga tàu hỏa',
        'Chợ hoa ngày Tết',
        'Công viên buổi sáng sớm',
        'Trên một cây cầu đi bộ',
        'Bên một gánh hàng rong',
    ],
  },
];

interface BackgroundSuggestionsProps {
    onSelect: (suggestion: string) => void;
}

const BackgroundSuggestions: React.FC<BackgroundSuggestionsProps> = ({ onSelect }) => {
    return (
        <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Hoặc chọn nhanh bối cảnh</label>
            <div className="max-h-60 overflow-y-auto bg-gray-800/50 p-3 rounded-md border border-gray-700">
                {backgroundSuggestions.map((category) => (
                    <div key={category.title} className="mb-4">
                        <h4 className="font-semibold text-blue-400 text-sm mb-2">{category.title}</h4>
                        <div className="flex flex-wrap gap-2">
                            {category.items.map((item) => (
                                <button
                                    key={item}
                                    onClick={() => onSelect(item)}
                                    className="px-2.5 py-1.5 bg-gray-700 text-gray-300 text-xs rounded-md hover:bg-blue-600 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    {item}
                                </button>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default BackgroundSuggestions;
