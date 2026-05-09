const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');

const prisma = new PrismaClient();

const ENC_PREFIX = 'enc:v1';

function isEncrypted(s) {
  return typeof s === 'string' && s.startsWith(ENC_PREFIX + ':');
}


function getRaw() {
  const raw = String(process.env.CHAT_DATA_ENCRYPTION_KEY || process.env.SESSION_NOTES_ENCRYPTION_KEY || '').trim();
  if (!raw) return null;
  return raw;
}

function deriveHashedKey(raw) {
  return crypto.createHash('sha256').update(raw).digest();
}

function deriveRawKey(raw) {
  try {
    return Buffer.from(raw, 'base64');
  } catch (e) {
    return Buffer.from(raw);
  }
}

function encryptWithKey(keyBuf, plain) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', keyBuf, iv);
  const enc = Buffer.concat([cipher.update(String(plain), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${ENC_PREFIX}:${iv.toString('base64')}:${tag.toString('base64')}:${enc.toString('base64')}`;
}

function decryptWithKey(keyBuf, storedText) {
  const value = String(storedText || '');
  if (!value || !value.startsWith(`${ENC_PREFIX}:`)) return null;
  const parts = value.split(':');
  if (parts.length !== 5) return null;
  try {
    const iv = Buffer.from(parts[2], 'base64');
    const tag = Buffer.from(parts[3], 'base64');
    const encrypted = Buffer.from(parts[4], 'base64');
    const decipher = crypto.createDecipheriv('aes-256-gcm', keyBuf, iv);
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return decrypted.toString('utf8');
  } catch (e) {
    return null;
  }
}

async function backfillChatMessages(keyBuf) {
  let total = 0;
  while (true) {
    const rows = await prisma.$queryRawUnsafe(`select message_id, content from chat_messages where content not like 'enc:v1:%' limit 200`);
    if (!rows || rows.length === 0) break;
    for (const r of rows) {
      const id = r.message_id || r.messageid || r.id;
      const content = r.content || '';
      if (!isEncrypted(content)) {
        const encrypted = encryptWithKey(keyBuf, content);
        await prisma.$executeRawUnsafe(`update chat_messages set content = $1 where message_id = $2`, encrypted, id);
        total += 1;
      }
    }
  }
  return total;
}

async function backfillConversations(keyBuf) {
  let totalConv = 0;
  while (true) {
    const convs = await prisma.$queryRawUnsafe(`select id, messages::text as messages_text from ai_conversations where messages::text not like '%enc:v1:%' limit 100`);
    if (!convs || convs.length === 0) break;
    for (const c of convs) {
      const id = c.id;
      let msgs;
      try {
        msgs = JSON.parse(c.messages_text);
      } catch (e) {
        console.error('failed to parse messages for conversation', id, e.message);
        continue;
      }
      let changed = false;
      for (const m of msgs) {
        if (m && typeof m.content === 'string' && !isEncrypted(m.content)) {
          m.content = encryptWithKey(keyBuf, m.content);
          changed = true;
        }
      }
      if (changed) {
        // cast to jsonb to satisfy the column type
        await prisma.$executeRawUnsafe(`update ai_conversations set messages = $1::jsonb where id = $2`, JSON.stringify(msgs), id);
        totalConv += 1;
      }
    }
  }
  return totalConv;
}

async function repairOldEncryptedChatRows(hashedKey, rawKey) {
  let repaired = 0;
  while (true) {
    const rows = await prisma.$queryRawUnsafe(`select message_id, content from chat_messages where content like 'enc:v1:%' limit 200`);
    if (!rows || rows.length === 0) break;
    for (const r of rows) {
      const id = r.message_id || r.messageid || r.id;
      const stored = r.content || '';
      // try hashed key first
      const ok = decryptWithKey(hashedKey, stored);
      if (ok !== null) continue; // already readable
      const oldPlain = decryptWithKey(rawKey, stored);
      if (oldPlain !== null) {
        // re-encrypt with hashed key
        const newEnc = encryptWithKey(hashedKey, oldPlain);
        await prisma.$executeRawUnsafe(`update chat_messages set content = $1 where message_id = $2`, newEnc, id);
        repaired += 1;
      }
    }
    // continue until no rows left (we query same limit each loop)
    break;
  }
  return repaired;
}

async function repairOldEncryptedConversations(hashedKey, rawKey) {
  let repaired = 0;
  while (true) {
    const convs = await prisma.$queryRawUnsafe(`select id, messages::text as messages_text from ai_conversations where messages::text like '%enc:v1:%' limit 100`);
    if (!convs || convs.length === 0) break;
    for (const c of convs) {
      const id = c.id;
      let msgs;
      try {
        msgs = JSON.parse(c.messages_text);
      } catch (e) {
        continue;
      }
      let changed = false;
      for (const m of msgs) {
        if (m && typeof m.content === 'string' && m.content.startsWith(`${ENC_PREFIX}:`)) {
          const ok = decryptWithKey(hashedKey, m.content);
          if (ok !== null) continue;
          const oldPlain = decryptWithKey(rawKey, m.content);
          if (oldPlain !== null) {
            m.content = encryptWithKey(hashedKey, oldPlain);
            changed = true;
          }
        }
      }
      if (changed) {
        await prisma.$executeRawUnsafe(`update ai_conversations set messages = $1::jsonb where id = $2`, JSON.stringify(msgs), id);
        repaired += 1;
      }
    }
    break;
  }
  return repaired;
}

async function main() {
  const raw = getRaw();
  if (!raw) {
    console.error('CHAT_DATA_ENCRYPTION_KEY or SESSION_NOTES_ENCRYPTION_KEY is not set (base64). Aborting.');
    process.exit(1);
  }
  const hashedKey = deriveHashedKey(raw);
  const rawKey = deriveRawKey(raw);

  console.log('Starting backfill (this will run in batches).');
  try {
    const msgsUpdated = await backfillChatMessages(hashedKey);
    console.log('chat_messages rows encrypted (plaintext->hashedKey):', msgsUpdated);
    const convsUpdated = await backfillConversations(hashedKey);
    console.log('ai_conversations rows updated (plaintext->hashedKey):', convsUpdated);

    const repairedMsgs = await repairOldEncryptedChatRows(hashedKey, rawKey);
    console.log('chat_messages rows repaired (rawKey->hashedKey):', repairedMsgs);
    const repairedConvs = await repairOldEncryptedConversations(hashedKey, rawKey);
    console.log('ai_conversations rows repaired (rawKey->hashedKey):', repairedConvs);

    console.log('Backfill complete.');
  } catch (err) {
    console.error('Backfill failed:', err);
    process.exit(2);
  } finally {
    await prisma.$disconnect();
  }
}

main();
