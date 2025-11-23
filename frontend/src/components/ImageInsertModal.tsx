import { useState, useRef } from 'react';
import { X, Image as ImageIcon } from 'lucide-react';
import { uploadApi } from '../api/client';

interface ImageInsertModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsert: (markup: string) => void;
}

export default function ImageInsertModal({ isOpen, onClose, onInsert }: ImageInsertModalProps) {
  const [uploading, setUploading] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [width, setWidth] = useState(100);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const response = await uploadApi.uploadImage(file);
      setImageUrl(response.data.url);
    } catch (error: any) {
      console.error('上传失败:', error);
      alert(error.response?.data?.error || '上传图片失败，请重试');
    } finally {
      setUploading(false);
    }
  };

  const handleInsert = () => {
    if (!imageUrl) {
      alert('请先上传图片');
      return;
    }
    // 格式：[img:url:width%]
    const markup = `[img:${imageUrl}:${width}%]`;
    onInsert(markup);
    handleClose();
  };

  const handleClose = () => {
    setImageUrl('');
    setWidth(100);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-xl sm:rounded-2xl shadow-2xl w-full max-w-2xl p-4 sm:p-6 my-4">
        <div className="flex justify-between items-center mb-4 sm:mb-6">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800">插入图片</h2>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        <div className="space-y-4 sm:space-y-6">
          {/* 上传图片 */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              选择图片
            </label>
            {imageUrl ? (
              <div className="relative">
                <img
                  src={imageUrl}
                  alt="预览"
                  className="w-full max-w-md h-48 sm:h-64 object-contain rounded-lg border-2 border-gray-200 mx-auto"
                />
                <button
                  onClick={() => setImageUrl('')}
                  className="absolute top-2 right-2 p-1.5 sm:p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                >
                  <X className="w-3 h-3 sm:w-4 sm:h-4" />
                </button>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-40 sm:h-48 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center cursor-pointer hover:border-purple-500 transition-colors bg-gray-50"
              >
                <div className="text-center">
                  <ImageIcon className="w-8 h-8 sm:w-12 sm:h-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm sm:text-base text-gray-600">点击上传图片</p>
                </div>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          {/* 设置宽度 */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              图片宽度：{width}%
            </label>
            <input
              type="range"
              min="10"
              max="100"
              step="10"
              value={width}
              onChange={(e) => setWidth(Number(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>10%</span>
              <span>25%</span>
              <span>50%</span>
              <span>75%</span>
              <span>100%</span>
            </div>
            {imageUrl && (
              <div className="mt-4 p-3 sm:p-4 bg-gray-50 rounded-lg">
                <p className="text-xs sm:text-sm text-gray-600 mb-2">预览效果：</p>
                <div className="border-2 border-gray-200 rounded p-2 sm:p-4" style={{ width: '100%' }}>
                  <img
                    src={imageUrl}
                    alt="预览"
                    style={{ width: `${width}%`, height: 'auto' }}
                    className="rounded"
                  />
                </div>
              </div>
            )}
          </div>

          {/* 操作按钮 */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <button
              onClick={handleInsert}
              disabled={!imageUrl || uploading}
              className="flex-1 px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg sm:rounded-xl hover:shadow-lg transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
            >
              {uploading ? '上传中...' : '插入图片'}
            </button>
            <button
              onClick={handleClose}
              className="px-4 sm:px-6 py-2.5 sm:py-3 bg-gray-200 text-gray-700 rounded-lg sm:rounded-xl hover:bg-gray-300 transition-colors font-semibold text-sm sm:text-base"
            >
              取消
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

