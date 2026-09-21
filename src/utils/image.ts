/**
 * Image processing utilities for card creation
 * - Checks MIME type and extension
 * - Rejects SVG formats
 * - Compresses to max dimension 1600px, quality 0.82
 * - Transparent PNG composites white background if converted to JPEG
 */

export interface CompressResult {
  blob: Blob;
  filename: string;
}

export function validateImageFile(file: File): { valid: boolean; error?: string } {
  const name = file.name.toLowerCase();
  const mime = file.type.toLowerCase();

  // Reject SVG explicitly
  if (name.endsWith('.svg') || mime.includes('svg')) {
    return {
      valid: false,
      error: '不支持 SVG 格式，请上传 PNG / JPEG / WebP / GIF 图片',
    };
  }

  // Allowed formats
  const allowedExts = ['.png', '.jpg', '.jpeg', '.webp', '.gif'];
  const hasAllowedExt = allowedExts.some(ext => name.endsWith(ext));
  const hasAllowedMime = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif'].includes(mime);

  if (!hasAllowedExt && !hasAllowedMime) {
    return {
      valid: false,
      error: '仅支持 PNG / JPEG / WebP / GIF 格式的图片',
    };
  }

  return { valid: true };
}

export async function compressImage(file: File): Promise<CompressResult> {
  const validation = validateImageFile(file);
  if (!validation.valid) {
    throw new Error(validation.error || '图片格式不合规');
  }

  // If GIF and under 2MB, preserve animated frames directly
  if ((file.type === 'image/gif' || file.name.toLowerCase().endsWith('.gif')) && file.size <= 2 * 1024 * 1024) {
    return {
      blob: file,
      filename: file.name,
    };
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('读取图片文件失败'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('解析图片内容失败'));
      img.onload = () => {
        try {
          const maxDim = 1600;
          let { width, height } = img;

          if (width > maxDim || height > maxDim) {
            if (width >= height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, width);
          canvas.height = Math.max(1, height);

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('无法创建图像处理上下文'));
            return;
          }

          // Composite on white background for transparency handling in JPEG conversion
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

          // Convert to JPEG with quality 0.82
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('压缩生成图片失败'));
                return;
              }
              const baseName = file.name.replace(/\.[^/.]+$/, '');
              resolve({
                blob,
                filename: `${baseName}.jpg`,
              });
            },
            'image/jpeg',
            0.82
          );
        } catch (err: any) {
          reject(err);
        }
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}
