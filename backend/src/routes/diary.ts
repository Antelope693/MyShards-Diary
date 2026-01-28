import express from 'express';
import { dbRun, dbAll, dbGet } from '../database';
import { optionalAuth, requireAuth } from '../middleware/auth';

const router = express.Router();

const parseDiaryRow = (diary: any) => {
  if (!diary) return diary;
  return {
    ...diary,
    images: diary.images ? JSON.parse(diary.images) : null,
    is_pinned: diary.is_pinned === 1,
    is_locked: diary.is_locked === 1,
    owner: diary.owner_username
      ? {
        username: diary.owner_username,
        display_name: diary.owner_display_name,
      }
      : undefined,
  };
};

const DEFAULT_MAX_UPLOAD = 10 * 1024 * 1024;
const DEFAULT_STORAGE_QUOTA = 200 * 1024 * 1024;

function humanizeBytes(bytes: number) {
  if (bytes >= 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  }
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  if (bytes >= 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${bytes} B`;
}

async function getDiaryById(id: number) {
  return dbGet(
    `
      SELECT d.*, u.username as owner_username, u.display_name as owner_display_name
      FROM diaries d
      JOIN users u ON d.user_id = u.id
      WHERE d.id = ?
      `,
    [id]
  );
}

async function getDiaryEditorsMap(diaryIds: number[]) {
  if (!diaryIds.length) return { approvedMap: new Map(), allMap: new Map() };
  const placeholders = diaryIds.map(() => '?').join(',');
  const rows = await dbAll(
    `
    SELECT de.*, u.username, u.display_name
    FROM diary_editors de
    JOIN users u ON de.user_id = u.id
    WHERE de.diary_id IN (${placeholders})
    `,
    diaryIds
  );

  const approvedMap = new Map<number, any[]>();
  const allMap = new Map<number, any[]>();
  rows.forEach((row) => {
    const simplified = {
      user_id: row.user_id,
      username: row.username,
      display_name: row.display_name,
      status: row.status,
      approved_by: row.approved_by,
      approved_at: row.approved_at,
      created_at: row.created_at,
    };
    if (!allMap.has(row.diary_id)) {
      allMap.set(row.diary_id, []);
    }
    allMap.get(row.diary_id)!.push(simplified);
    if (row.status === 'approved') {
      if (!approvedMap.has(row.diary_id)) {
        approvedMap.set(row.diary_id, []);
      }
      approvedMap.get(row.diary_id)!.push(simplified);
    }
  });
  return { approvedMap, allMap };
}

function attachPermissions(diary: any, viewer?: Express.AuthenticatedUser | null, editors?: any[]) {
  const isOwner = Boolean(viewer && diary.user_id === viewer.id);
  const isMaintainer = viewer?.role === 'maintainer';
  const isAdmin = viewer?.role === 'admin';
  const viewerEditor = viewer
    ? editors?.find((editor) => editor.user_id === viewer.id)
    : undefined;

  const canEdit =
    !!viewer &&
    (isOwner ||
      isMaintainer ||
      (!diary.is_locked &&
        (isAdmin || (viewerEditor && viewerEditor.status === 'approved'))));

  let collaborationStatus: string = 'none';
  if (isOwner) {
    collaborationStatus = 'owner';
  } else if (isMaintainer) {
    collaborationStatus = 'staff';
  } else if (viewerEditor?.status) {
    collaborationStatus = viewerEditor.status;
  } else if (isAdmin && !diary.is_locked) {
    collaborationStatus = 'staff';
  }

  return {
    ...diary,
    permissions: {
      canEdit,
      isOwner,
      isMaintainer,
      isAdmin,
      collaborationStatus,
    },
  };
}

function canViewDiary(diary: any, viewer?: Express.AuthenticatedUser | null) {
  if (!diary.is_locked) {
    return true;
  }
  if (!viewer) {
    return false;
  }
  if (viewer.role === 'maintainer') {
    return true;
  }
  return diary.user_id === viewer.id;
}

router.get('/', optionalAuth, async (req, res) => {
  try {
    const username = (req.query.user as string) || (req.query.username as string);
    const userIdQuery = req.query.user_id ? Number(req.query.user_id) : undefined;
    const collectionIdQuery = req.query.collection_id ? Number(req.query.collection_id) : undefined;
    const maintainerUsername = process.env.MAINTAINER_USERNAME || '羚羊';
    let targetCondition = '';
    const params: any[] = [];

    if (username || userIdQuery) {
      let targetUser;
      if (userIdQuery) {
        targetUser = await dbGet('SELECT id FROM users WHERE id = ?', [userIdQuery]);
      } else if (username) {
        targetUser = await dbGet('SELECT id FROM users WHERE username = ?', [username]);
      }
      if (!targetUser) {
        return res.status(404).json({ error: '作者不存在' });
      }
      targetCondition = `
        LEFT JOIN diary_editors de_filter
          ON de_filter.diary_id = d.id
         AND de_filter.user_id = ?
         AND de_filter.status = 'approved'
        WHERE d.user_id = ? OR de_filter.user_id IS NOT NULL
      `;
      params.push(targetUser.id, targetUser.id);
    } else if (collectionIdQuery) {
      // If filtering by collection, we ignore username logic usually, or usage combines them.
      // For simplicity, if collection_id is present, we filter by it.
      targetCondition = 'WHERE d.collection_id = ?';
      params.push(collectionIdQuery);
    } else {
      targetCondition = 'WHERE u.username = ?';
      params.push(maintainerUsername);
    }

    const diaries = await dbAll(
      `
      SELECT DISTINCT d.*, u.username as owner_username, u.display_name as owner_display_name
      FROM diaries d
      JOIN users u ON d.user_id = u.id
      ${targetCondition}
      ORDER BY d.created_at DESC
      `,
      params
    );

    const visibleDiaries = diaries.filter((item: any) => canViewDiary(item, req.user || null));

    const diaryIds = visibleDiaries.map((d: any) => d.id);
    const { approvedMap, allMap } = await getDiaryEditorsMap(diaryIds);

    const response = visibleDiaries.map((item: any) => {
      const parsed = parseDiaryRow(item);
      const approvedEditors = approvedMap.get(item.id) || [];
      const allEditors = allMap.get(item.id) || [];
      const enriched = attachPermissions(parsed, req.user || null, allEditors);
      const canReview =
        req.user &&
        (req.user.role === 'maintainer' ||
          req.user.role === 'admin' ||
          req.user.id === item.user_id);
      return {
        ...enriched,
        editors: approvedEditors,
        pending_editors: canReview
          ? allEditors.filter((editor: any) => editor.status === 'pending')
          : undefined,
      };
    });

    res.json(response);
  } catch (error) {
    console.error('获取日记列表失败:', error);
    res.status(500).json({ error: '获取日记列表失败' });
  }
});

router.get('/collaborations/mine', requireAuth, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: '需要身份验证' });
    }

    const diaries = await dbAll(
      `
      SELECT d.*, u.username as owner_username, u.display_name as owner_display_name
      FROM diaries d
      JOIN diary_editors de ON de.diary_id = d.id
      JOIN users u ON d.user_id = u.id
      WHERE de.user_id = ? AND de.status = 'approved'
      ORDER BY d.updated_at DESC
      `,
      [req.user.id]
    );

    const visible = diaries.filter((item: any) =>
      canViewDiary(item, req.user)
    );

    const diaryIds = visible.map((d: any) => d.id);
    const { approvedMap, allMap } = await getDiaryEditorsMap(diaryIds);
    const response = visible.map((item: any) => {
      const parsed = parseDiaryRow(item);
      const editors = approvedMap.get(item.id) || [];
      const enriched = attachPermissions(parsed, req.user, allMap.get(item.id) || []);
      return {
        ...enriched,
        editors,
      };
    });
    res.json(response);
  } catch (error) {
    console.error('获取协作日记失败:', error);
    res.status(500).json({ error: '获取协作日记失败' });
  }
});

router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const diary = await getDiaryById(Number(req.params.id));

    if (!diary || !canViewDiary(diary, req.user || null)) {
      return res.status(404).json({ error: '日记不存在' });
    }

    const { approvedMap, allMap } = await getDiaryEditorsMap([diary.id]);
    const parsed = parseDiaryRow(diary);
    const allEditors = allMap.get(diary.id) || [];
    const enriched = attachPermissions(parsed, req.user || null, allEditors);

    res.json({
      ...enriched,
      editors: approvedMap.get(diary.id) || [],
      pending_editors:
        req.user &&
          (req.user.role === 'maintainer' ||
            req.user.role === 'admin' ||
            req.user.id === diary.user_id)
          ? allEditors.filter((editor: any) => editor.status === 'pending')
          : undefined,
    });
  } catch (error) {
    console.error('获取日记失败:', error);
    res.status(500).json({ error: '获取日记失败' });
  }
});

router.post('/', requireAuth, async (req, res) => {
  try {
    const {
      title,
      content,
      cover_image,
      created_at,
      is_pinned,
      is_locked,
      user_id,
      username,
      collection_id
    } = req.body;
    if (!title || !content) {
      return res.status(400).json({ error: '标题和内容不能为空' });
    }

    if (!req.user) {
      return res.status(401).json({ error: '需要身份验证' });
    }

    let ownerId = req.user.id;
    if ((req.user.role === 'maintainer' || req.user.role === 'admin') && (user_id || username)) {
      if (user_id) {
        ownerId = Number(user_id);
      } else if (username) {
        const targetUser = await dbGet('SELECT id FROM users WHERE username = ?', [username]);
        if (!targetUser) {
          return res.status(404).json({ error: '指定的用户不存在' });
        }
        ownerId = targetUser.id;
      }
    }

    const ownerExists = await dbGet('SELECT id FROM users WHERE id = ?', [ownerId]);
    if (!ownerExists) {
      return res.status(404).json({ error: '指定的用户不存在' });
    }

    const timestamp =
      created_at || new Date().toISOString().replace('T', ' ').substring(0, 19);
    const pinned = is_pinned ? 1 : 0;
    const locked = typeof is_locked === 'boolean' ? (is_locked ? 1 : 0) : 0;

    const result = await dbRun(
      'INSERT INTO diaries (user_id, title, content, cover_image, created_at, is_pinned, is_locked, collection_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [ownerId, title, content, cover_image || null, timestamp, pinned, locked, collection_id || null]
    );

    const newDiary = await getDiaryById(result.lastID);

    res.status(201).json(parseDiaryRow(newDiary));
  } catch (error) {
    console.error('创建日记失败:', error);
    res.status(500).json({ error: '创建日记失败' });
  }
});

async function hasEditPermission(user: Express.AuthenticatedUser, diaryId: number) {
  const diary = await dbGet('SELECT user_id, is_locked FROM diaries WHERE id = ?', [diaryId]);
  if (!diary) return false;
  if (user.role === 'maintainer') return true;
  if (diary.is_locked) {
    return diary.user_id === user.id;
  }
  if (user.role === 'admin') return true;
  if (diary.user_id === user.id) return true;
  const editor = await dbGet(
    'SELECT status FROM diary_editors WHERE diary_id = ? AND user_id = ?',
    [diaryId, user.id]
  );
  return editor && editor.status === 'approved';
}

router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { title, content, cover_image, created_at, is_pinned, is_locked, collection_id } = req.body;
    if (!title || !content) {
      return res.status(400).json({ error: '标题和内容不能为空' });
    }

    if (!req.user) {
      return res.status(401).json({ error: '需要身份验证' });
    }

    const diary = await dbGet('SELECT * FROM diaries WHERE id = ?', [req.params.id]);
    if (!diary) {
      return res.status(404).json({ error: '日记不存在' });
    }

    const canEdit = await hasEditPermission(req.user, Number(req.params.id));
    if (!canEdit) {
      return res.status(403).json({ error: '无权编辑该日记' });
    }

    const pinned = is_pinned ? 1 : 0;
    const locked = typeof is_locked === 'boolean' ? (is_locked ? 1 : 0) : 0;

    if (created_at) {
      await dbRun(
        'UPDATE diaries SET title = ?, content = ?, cover_image = ?, created_at = ?, is_pinned = ?, is_locked = ?, collection_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [title, content, cover_image || null, created_at, pinned, locked, collection_id || null, req.params.id]
      );
    } else {
      await dbRun(
        'UPDATE diaries SET title = ?, content = ?, cover_image = ?, is_pinned = ?, is_locked = ?, collection_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [title, content, cover_image || null, pinned, locked, collection_id || null, req.params.id]
      );
    }

    const updatedDiary = await getDiaryById(Number(req.params.id));

    const { approvedMap, allMap } = await getDiaryEditorsMap([Number(req.params.id)]);
    const parsed = parseDiaryRow(updatedDiary);
    const allEditors = allMap.get(Number(req.params.id)) || [];
    const enriched = attachPermissions(parsed, req.user, allEditors);

    res.json({
      ...enriched,
      editors: approvedMap.get(Number(req.params.id)) || [],
    });
  } catch (error) {
    console.error('更新日记失败:', error);
    res.status(500).json({ error: '更新日记失败' });
  }
});

router.delete('/:id', requireAuth, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: '需要身份验证' });
    }

    const diary = await dbGet('SELECT * FROM diaries WHERE id = ?', [req.params.id]);
    if (!diary) {
      return res.status(404).json({ error: '日记不存在' });
    }

    if (
      req.user.role !== 'maintainer' &&
      req.user.role !== 'admin' &&
      diary.user_id !== req.user.id
    ) {
      return res.status(403).json({ error: '无权删除该日记' });
    }

    if (
      diary.is_locked === 1 &&
      req.user.role !== 'maintainer' &&
      diary.user_id !== req.user.id
    ) {
      return res.status(403).json({ error: '该日记已上锁，只有作者或维护者可以操作' });
    }

    const result = await dbRun('DELETE FROM diaries WHERE id = ?', [req.params.id]);
    if (result.changes === 0) {
      return res.status(404).json({ error: '日记不存在' });
    }
    res.json({ message: '删除成功' });
  } catch (error) {
    console.error('删除日记失败:', error);
    res.status(500).json({ error: '删除日记失败' });
  }
});

router.post('/:id/collaborators', requireAuth, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: '需要身份验证' });
    }

    const diary = await dbGet('SELECT * FROM diaries WHERE id = ?', [req.params.id]);
    if (!diary) {
      return res.status(404).json({ error: '日记不存在' });
    }

    if (diary.user_id === req.user.id) {
      return res.status(400).json({ error: '你是作者，无需申请' });
    }

    if (diary.is_locked === 1 && req.user.role !== 'maintainer') {
      return res.status(403).json({ error: '该日记已上锁，暂不接受协作申请' });
    }

    const existing = await dbGet(
      'SELECT * FROM diary_editors WHERE diary_id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );

    if (existing) {
      if (existing.status === 'approved') {
        return res.status(200).json({ message: '你已经是协作者', status: 'approved' });
      }
      if (existing.status === 'pending') {
        return res.status(200).json({ message: '已提交申请，请等待作者审核', status: 'pending' });
      }
      await dbRun(
        'UPDATE diary_editors SET status = ?, approved_by = NULL, approved_at = NULL, created_at = CURRENT_TIMESTAMP WHERE id = ?',
        ['pending', existing.id]
      );
      return res.json({ message: '已重新提交申请', status: 'pending' });
    }

    await dbRun(
      'INSERT INTO diary_editors (diary_id, user_id, status) VALUES (?, ?, ?)',
      [req.params.id, req.user.id, 'pending']
    );

    // Notify Diary Owner
    if (diary.user_id !== req.user.id) { // Should be true if logic holds
      const requesterName = req.user.display_name || req.user.username;
      await dbRun(
        'INSERT INTO notifications (user_id, type, content, link) VALUES (?, ?, ?, ?)',
        [
          diary.user_id,
          'collaborator_request',
          `${requesterName} 申请协作你的日记《${diary.title}》`,
          `/diary/${diary.id}` // Or maybe a management link if exists
        ]
      );
    }

    res.status(201).json({ message: '申请已提交，请等待作者或维护者审核', status: 'pending' });
  } catch (error) {
    console.error('申请协作失败:', error);
    res.status(500).json({ error: '申请协作失败' });
  }
});

router.patch('/:id/collaborators/:editorId', requireAuth, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: '需要身份验证' });
    }

    const { action } = req.body as { action: 'approve' | 'reject' | 'revoke' };
    if (!['approve', 'reject', 'revoke'].includes(action)) {
      return res.status(400).json({ error: '无效操作' });
    }

    const diary = await dbGet('SELECT * FROM diaries WHERE id = ?', [req.params.id]);
    if (!diary) {
      return res.status(404).json({ error: '日记不存在' });
    }

    if (
      req.user.role !== 'maintainer' &&
      req.user.role !== 'admin' &&
      diary.user_id !== req.user.id
    ) {
      return res.status(403).json({ error: '只有作者、管理员或维护者可以处理协作申请' });
    }

    if (
      diary.is_locked === 1 &&
      req.user.role !== 'maintainer' &&
      diary.user_id !== req.user.id
    ) {
      return res.status(403).json({ error: '该日记已上锁，只有作者或维护者可以处理协作申请' });
    }

    const editorRecord = await dbGet(
      'SELECT * FROM diary_editors WHERE diary_id = ? AND user_id = ?',
      [req.params.id, req.params.editorId]
    );

    if (!editorRecord) {
      return res.status(404).json({ error: '协作申请不存在' });
    }

    if (action === 'approve') {
      await dbRun(
        'UPDATE diary_editors SET status = ?, approved_by = ?, approved_at = CURRENT_TIMESTAMP WHERE diary_id = ? AND user_id = ?',
        ['approved', req.user.id, req.params.id, req.params.editorId]
      );
    } else if (action === 'reject') {
      await dbRun(
        'UPDATE diary_editors SET status = ?, approved_by = ?, approved_at = CURRENT_TIMESTAMP WHERE diary_id = ? AND user_id = ?',
        ['rejected', req.user.id, req.params.id, req.params.editorId]
      );
    } else if (action === 'revoke') {
      await dbRun(
        'UPDATE diary_editors SET status = ?, approved_by = ?, approved_at = CURRENT_TIMESTAMP WHERE diary_id = ? AND user_id = ?',
        ['revoked', req.user.id, req.params.id, req.params.editorId]
      );
    }

    let message = '操作成功';
    if (action === 'approve') {
      message = '已通过申请';
    } else if (action === 'reject') {
      message = '已拒绝申请';
    } else if (action === 'revoke') {
      message = '已移除协作者';
    }

    // Notify the target editor about the status change
    // We didn't fetch target editor's name, but we have their ID: req.params.editorId
    // And we have the diary info.
    const targetUserId = req.params.editorId;
    if (targetUserId) {
      let notifContent = '';
      if (action === 'approve') notifContent = `你对日记《${diary.title}》的协作申请已通过`;
      if (action === 'reject') notifContent = `你对日记《${diary.title}》的协作申请被拒绝`;
      if (action === 'revoke') notifContent = `你已被移除日记《${diary.title}》的协作者权限`;

      if (notifContent) {
        await dbRun(
          'INSERT INTO notifications (user_id, type, content, link) VALUES (?, ?, ?, ?)',
          [
            targetUserId,
            `collaborator_${action}`,
            notifContent,
            `/diary/${diary.id}`
          ]
        );
      }
    }
    res.json({ message });
  } catch (error) {
    console.error('更新协作申请失败:', error);
    res.status(500).json({ error: '更新协作申请失败' });
  }
});

export default router;

