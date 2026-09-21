import { Router } from 'express';
import type { Request as ExRequest, Response as ExResponse } from 'express';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { Readable } from 'node:stream';
import { createCard, getCardById, getCardsByIds, updateCard, getAllCards, getAllCustomCategories, createCategory } from './db.js';

export const router = Router();

const UPLOADS_DIR = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Memory rate limiter: max 20 uploads per IP per minute (60s)
const uploadRateLimits = new Map<string, number[]>();

function checkUploadRateLimit(ip: string): boolean {
  const now = Date.now();
  const windowStart = now - 60 * 1000;
  const timestamps = uploadRateLimits.get(ip) || [];
  const recent = timestamps.filter(t => t > windowStart);
  if (recent.length >= 20) {
    uploadRateLimits.set(ip, recent);
    return false;
  }
  recent.push(now);
  uploadRateLimits.set(ip, recent);
  return true;
}

// Clean up stale rate limit entries periodically
setInterval(() => {
  const now = Date.now();
  const windowStart = now - 60 * 1000;
  for (const [ip, timestamps] of uploadRateLimits.entries()) {
    const recent = timestamps.filter(t => t > windowStart);
    if (recent.length === 0) {
      uploadRateLimits.delete(ip);
    } else {
      uploadRateLimits.set(ip, recent);
    }
  }
}, 5 * 60 * 1000).unref();

const VALID_CATEGORIES = new Set([
  'babel',
  'politics',
  'culture',
  'game',
  'creative',
  'media',
  'fansland',
]);

const ALLOWED_MIMES: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

/**
 * Inspect magic bytes to confirm image format and disallow disguised files / SVGs
 */
function detectImageType(buffer: Buffer, declaredMime: string, filename: string): { valid: boolean; ext?: string; error?: string } {
  const lowerName = filename.toLowerCase();
  const lowerMime = declaredMime.toLowerCase();

  // Explicit SVG check
  if (
    lowerMime.includes('svg') ||
    lowerName.endsWith('.svg') ||
    buffer.subarray(0, 1024).toString('utf8').toLowerCase().includes('<svg') ||
    buffer.subarray(0, 50).toString('utf8').toLowerCase().includes('<?xml')
  ) {
    return { valid: false, error: '不支持 SVG 格式，请上传 PNG / JPEG / WebP / GIF 图片' };
  }

  // PNG
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return { valid: true, ext: 'png' };
  }

  // JPEG
  if (
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  ) {
    return { valid: true, ext: 'jpg' };
  }

  // GIF
  if (
    buffer.length >= 4 &&
    buffer[0] === 0x47 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x38
  ) {
    return { valid: true, ext: 'gif' };
  }

  // WebP (RIFF....WEBP)
  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return { valid: true, ext: 'webp' };
  }

  // Fallback check against declared MIME if valid
  if (ALLOWED_MIMES[lowerMime]) {
    return { valid: true, ext: ALLOWED_MIMES[lowerMime] };
  }

  return { valid: false, error: '不支持的图片格式，仅支持 PNG / JPEG / WebP / GIF' };
}

// 1. POST /api/uploads
router.post('/uploads', async (req: ExRequest, res: ExResponse) => {
  const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
  if (!checkUploadRateLimit(clientIp)) {
    res.status(429).json({ error: '上传过于频繁，每分钟最多上传 20 次，请稍后再试' });
    return;
  }

  try {
    const contentType = req.headers['content-type'] || '';
    if (!contentType.includes('multipart/form-data')) {
      res.status(400).json({ error: '请求必须是 multipart/form-data 格式' });
      return;
    }

    const webReq = new Request('http://localhost' + req.url, {
      method: req.method,
      headers: req.headers as Record<string, string>,
      body: Readable.toWeb(req) as any,
      duplex: 'half',
    } as any);

    const formData = await webReq.formData();
    const fileEntry = formData.get('file') || formData.get('image');

    if (!fileEntry || typeof fileEntry === 'string') {
      res.status(400).json({ error: '未找到上传的图片文件' });
      return;
    }

    const file = fileEntry as File;

    // Check size limit: 2MB (2 * 1024 * 1024 bytes)
    const MAX_SIZE = 2 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      res.status(400).json({ error: '图片大小不能超过 2MB' });
      return;
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (buffer.length === 0) {
      res.status(400).json({ error: '上传的图片内容为空' });
      return;
    }

    const check = detectImageType(buffer, file.type || '', file.name || '');
    if (!check.valid || !check.ext) {
      res.status(400).json({ error: check.error || '不支持的图片格式' });
      return;
    }

    // Server-generated random 32-character hex name
    const randomHex = crypto.randomBytes(16).toString('hex');
    const filename = `${randomHex}.${check.ext}`;
    const targetPath = path.join(UPLOADS_DIR, filename);

    fs.writeFileSync(targetPath, buffer);

    res.json({ url: `/uploads/${filename}` });
  } catch (err: any) {
    console.error('Upload error:', err);
    res.status(500).json({ error: '上传处理失败，请稍后重试' });
  }
});

function validateCardData(body: any): { valid: boolean; error?: string; cleanData?: any } {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: '请求体必须是 JSON 对象' };
  }

  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (!name) {
    return { valid: false, error: '卡片名称为必填项' };
  }
  if (name.length > 24) {
    return { valid: false, error: '卡片名称不能超过 24 个字' };
  }

  const category = typeof body.category === 'string' ? body.category.trim() : '';
  if (!category) {
    return { valid: false, error: '请选择或填写有效的分区' };
  }
  if (category.length > 32) {
    return { valid: false, error: '分区名称不能超过 32 个字' };
  }

  const desc = typeof body.desc === 'string' ? body.desc.trim() : '';
  if (desc.length > 60) {
    return { valid: false, error: '一句话说明不能超过 60 个字' };
  }

  const mark = typeof body.mark === 'string' ? body.mark.trim() : '';
  if (mark.length > 10) {
    return { valid: false, error: '文字标记不能超过 10 个字' };
  }

  const markStrike = Boolean(body.markStrike);

  let imageUrl = typeof body.imageUrl === 'string' ? body.imageUrl.trim() : '';
  if (imageUrl) {
    if (
      !imageUrl.startsWith('/uploads/') &&
      !imageUrl.startsWith('https://') &&
      !imageUrl.startsWith('http://') &&
      imageUrl !== '/Tm.png' &&
      imageUrl !== '/logo.png'
    ) {
      return { valid: false, error: '图片链接仅允许站内 /uploads/... 或 https:// 链接' };
    }
  }

  let bgColor: string | null = null;
  if (typeof body.bgColor === 'string') {
    const trimmed = body.bgColor.trim();
    if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(trimmed) || /^(rgb|hsl)a?\(.+\)$/.test(trimmed)) {
      bgColor = trimmed;
    }
  }

  // Validation rule: mark and imageUrl must have at least one
  if (!mark && !imageUrl) {
    return { valid: false, error: '配图与文字标记至少要有一个' };
  }

  return {
    valid: true,
    cleanData: {
      name,
      category,
      desc: desc || '',
      mark: mark || null,
      markStrike,
      imageUrl: imageUrl || null,
      bgColor,
    },
  };
}

// 2. POST /api/cards
router.post('/cards', (req: ExRequest, res: ExResponse) => {
  const result = validateCardData(req.body);
  if (!result.valid || !result.cleanData) {
    res.status(400).json({ error: result.error });
    return;
  }

  // Generate random 16-hex character ID
  const id = crypto.randomBytes(8).toString('hex');
  const card = createCard(id, result.cleanData);

  res.json({ card });
});

// 3. PUT /api/cards/:id
router.put('/cards/:id', (req: ExRequest, res: ExResponse) => {
  const { id } = req.params;
  if (!id) {
    res.status(400).json({ error: '缺少卡片 ID' });
    return;
  }

  const existing = getCardById(id);
  if (!existing) {
    res.status(404).json({ error: '卡片不存在' });
    return;
  }

  const result = validateCardData(req.body);
  if (!result.valid || !result.cleanData) {
    res.status(400).json({ error: result.error });
    return;
  }

  const updated = updateCard(id, result.cleanData);
  if (!updated) {
    res.status(500).json({ error: '保存卡片失败' });
    return;
  }

  res.json({ card: updated });
});

// 4. GET /api/cards/:id
router.get('/cards/:id', (req: ExRequest, res: ExResponse) => {
  const { id } = req.params;
  if (!id) {
    res.status(400).json({ error: '缺少卡片 ID' });
    return;
  }

  const card = getCardById(id);
  if (!card) {
    res.status(404).json({ error: '卡片不存在' });
    return;
  }

  res.json({ card });
});

// 5. GET /api/cards?ids=a,b,c
router.get('/cards', (req: ExRequest, res: ExResponse) => {
  const idsParam = req.query.ids;
  if (idsParam && typeof idsParam === 'string') {
    const ids = idsParam.split(',').map(s => s.trim()).filter(Boolean);
    if (ids.length === 0) {
      res.json({ cards: [] });
      return;
    }
    const cards = getCardsByIds(ids);
    res.json({ cards });
    return;
  }

  // If no ids specified, return all recent cards
  const cards = getAllCards(100);
  res.json({ cards });
});

// 6. GET /api/categories
router.get('/categories', (req: ExRequest, res: ExResponse) => {
  try {
    const custom = getAllCustomCategories();
    const defaults = [
      { id: 'babel', label: '语言', desc: '方言、外语、流行语梗' },
      { id: 'politics', label: '公共立场', desc: '社会态度、价值观念' },
      { id: 'culture', label: '地区与文化', desc: '籍贯、生活习惯与地域文化' },
      { id: 'game', label: '游戏圈', desc: '游戏阵营、厨力与玩家梗' },
      { id: 'creative', label: '创作与学术', desc: '专业领域、创作偏好与学派' },
      { id: 'media', label: '娱乐与阅读', desc: '追剧、听歌、动漫与书籍' },
      { id: 'fansland', label: '粉丝大陆身份', desc: '虚拟国家城邦、称号与角色' },
    ];
    const map = new Map<string, any>();
    for (const d of defaults) {
      map.set(d.id, { ...d, isCustom: false });
    }
    for (const c of custom) {
      map.set(c.id, { ...c, isCustom: true });
    }
    res.json({ categories: Array.from(map.values()) });
  } catch (err: any) {
    console.error('Error fetching categories:', err);
    res.status(500).json({ error: '获取分类失败' });
  }
});

// 7. POST /api/categories
router.post('/categories', (req: ExRequest, res: ExResponse) => {
  try {
    const label = typeof req.body.label === 'string' ? req.body.label.trim() : '';
    if (!label) {
      res.status(400).json({ error: '分区名称不能为空' });
      return;
    }
    if (label.length > 20) {
      res.status(400).json({ error: '分区名称不能超过 20 个字' });
      return;
    }
    const desc = typeof req.body.desc === 'string' ? req.body.desc.trim() : '';
    let id = typeof req.body.id === 'string' ? req.body.id.trim() : '';
    if (!id) {
      id = 'cat_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6);
    }
    const created = createCategory({ id, label, desc });
    res.json({ category: { ...created, isCustom: true } });
  } catch (err: any) {
    console.error('Error creating category:', err);
    res.status(500).json({ error: '创建分类失败' });
  }
});
