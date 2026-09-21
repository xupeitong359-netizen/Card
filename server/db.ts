import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';

const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), 'cards.db');

export interface CardRecord {
  id: string;
  name: string;
  category: string;
  desc: string | null;
  imageUrl: string | null;
  mark: string | null;
  markStrike: boolean;
  bgColor: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface CardInput {
  name: string;
  category: string;
  desc?: string | null;
  imageUrl?: string | null;
  mark?: string | null;
  markStrike?: boolean;
  bgColor?: string | null;
}

let dbInstance: DatabaseSync | null = null;

export function getDb(): DatabaseSync {
  if (!dbInstance) {
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    dbInstance = new DatabaseSync(DB_PATH);
    dbInstance.exec(`
      CREATE TABLE IF NOT EXISTS cards (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        desc TEXT,
        imageUrl TEXT,
        mark TEXT,
        markStrike INTEGER NOT NULL DEFAULT 0,
        bgColor TEXT,
        createdAt INTEGER NOT NULL,
        updatedAt INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_cards_created ON cards (createdAt DESC);
      CREATE TABLE IF NOT EXISTS categories (
        id TEXT PRIMARY KEY,
        label TEXT NOT NULL,
        desc TEXT,
        createdAt INTEGER NOT NULL
      );
    `);

    // Ensure bgColor column exists for pre-existing databases
    try {
      dbInstance.exec(`ALTER TABLE cards ADD COLUMN bgColor TEXT;`);
    } catch {
      // Column already exists, ignore
    }
  }
  return dbInstance;
}

export interface CategoryRecord {
  id: string;
  label: string;
  desc: string | null;
  createdAt: number;
}

export function getAllCustomCategories(): CategoryRecord[] {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM categories ORDER BY createdAt ASC');
  const rows = stmt.all() as any[];
  return rows.map((r: any) => ({
    id: r.id,
    label: r.label,
    desc: r.desc || '',
    createdAt: Number(r.createdAt),
  }));
}

export function createCategory(cat: { id: string; label: string; desc?: string | null }): CategoryRecord {
  const db = getDb();
  const now = Date.now();
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO categories (id, label, desc, createdAt)
    VALUES (?, ?, ?, ?)
  `);
  stmt.run(cat.id, cat.label, cat.desc || null, now);
  return {
    id: cat.id,
    label: cat.label,
    desc: cat.desc || null,
    createdAt: now,
  };
}

function rowToCard(row: any): CardRecord {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    desc: row.desc || '',
    imageUrl: row.imageUrl || null,
    mark: row.mark || null,
    markStrike: Boolean(row.markStrike),
    bgColor: row.bgColor || null,
    createdAt: Number(row.createdAt),
    updatedAt: Number(row.updatedAt),
  };
}

export function getCardById(id: string): CardRecord | null {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM cards WHERE id = ?');
  const row = stmt.get(id);
  return row ? rowToCard(row) : null;
}

export function getAllCards(limit = 100): CardRecord[] {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM cards ORDER BY createdAt DESC LIMIT ?');
  const rows = stmt.all(limit);
  return rows.map(rowToCard);
}

export function getCardsByIds(ids: string[]): CardRecord[] {
  if (!ids || ids.length === 0) return [];
  const db = getDb();
  const cleanIds = ids.map(id => id.trim()).filter(Boolean).slice(0, 100);
  if (cleanIds.length === 0) return [];

  const placeholders = cleanIds.map(() => '?').join(',');
  const stmt = db.prepare(`SELECT * FROM cards WHERE id IN (${placeholders})`);
  const rows = stmt.all(...cleanIds);
  
  // Sort according to requested order
  const cardMap = new Map<string, CardRecord>();
  for (const row of rows) {
    const card = rowToCard(row);
    cardMap.set(card.id, card);
  }

  const result: CardRecord[] = [];
  for (const id of cleanIds) {
    const found = cardMap.get(id);
    if (found) {
      result.push(found);
    }
  }
  return result;
}

export function createCard(id: string, input: CardInput): CardRecord {
  const db = getDb();
  const now = Date.now();
  const stmt = db.prepare(`
    INSERT INTO cards (id, name, category, desc, imageUrl, mark, markStrike, bgColor, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    id,
    input.name.trim(),
    input.category,
    input.desc ? input.desc.trim() : null,
    input.imageUrl ? input.imageUrl.trim() : null,
    input.mark ? input.mark.trim() : null,
    input.markStrike ? 1 : 0,
    input.bgColor ? input.bgColor.trim() : null,
    now,
    now
  );

  return {
    id,
    name: input.name.trim(),
    category: input.category,
    desc: input.desc ? input.desc.trim() : '',
    imageUrl: input.imageUrl ? input.imageUrl.trim() : null,
    mark: input.mark ? input.mark.trim() : null,
    markStrike: Boolean(input.markStrike),
    bgColor: input.bgColor ? input.bgColor.trim() : null,
    createdAt: now,
    updatedAt: now,
  };
}

export function updateCard(id: string, input: CardInput): CardRecord | null {
  const db = getDb();
  const existing = getCardById(id);
  if (!existing) return null;

  const now = Date.now();
  const stmt = db.prepare(`
    UPDATE cards
    SET name = ?, category = ?, desc = ?, imageUrl = ?, mark = ?, markStrike = ?, bgColor = ?, updatedAt = ?
    WHERE id = ?
  `);

  stmt.run(
    input.name.trim(),
    input.category,
    input.desc ? input.desc.trim() : null,
    input.imageUrl ? input.imageUrl.trim() : null,
    input.mark ? input.mark.trim() : null,
    input.markStrike ? 1 : 0,
    input.bgColor ? input.bgColor.trim() : null,
    now,
    id
  );

  return {
    ...existing,
    name: input.name.trim(),
    category: input.category,
    desc: input.desc ? input.desc.trim() : '',
    imageUrl: input.imageUrl ? input.imageUrl.trim() : null,
    mark: input.mark ? input.mark.trim() : null,
    markStrike: Boolean(input.markStrike),
    bgColor: input.bgColor ? input.bgColor.trim() : null,
    updatedAt: now,
  };
}
