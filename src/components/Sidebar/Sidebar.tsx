import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Pencil, Check, EyeOff, Eye, Trash2, KeyRound, User, GripVertical, X, Menu
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import type { table_links_group, table_links } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import styles from './Sidebar.module.css'

// ─── Extended types ───────────────────────────────────────────
interface GroupExt extends table_links_group {
  visible: boolean
  sort_order: number
}

interface LinkExt extends table_links {
  visible: boolean
  sort_order: number
  username: string | null
  password: string | null
}

// ─── Modal ───────────────────────────────────────────────────
interface ModalProps {
  title: string
  onClose: () => void
  children: React.ReactNode
}

function Modal({ title, onClose, children }: ModalProps) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <span className={styles.modalTitle}>{title}</span>
          <button className={styles.modalClose} onClick={onClose}><X size={16} /></button>
        </div>
        {children}
      </div>
    </div>
  )
}

// ─── Group Edit Modal ─────────────────────────────────────────
interface GroupModalProps {
  group: GroupExt | null   // null = new group
  onSave: (data: Partial<GroupExt>) => Promise<void>
  onDelete?: () => Promise<void>
  onClose: () => void
}

function GroupModal({ group, onSave, onDelete, onClose }: GroupModalProps) {
  const { t } = useTranslation()
  const [name, setName] = useState(group?.group_name ?? '')
  const [category, setCategory] = useState(group?.category ?? '')
  const [description, setDescription] = useState(group?.group_description ?? '')
  const [visible, setVisible] = useState(group?.visible ?? true)
  const [loading, setLoading] = useState(false)

  async function handleSave() {
    if (!name.trim()) return
    setLoading(true)
    await onSave({ group_name: name.trim(), category: category.trim(), group_description: description.trim(), visible })
    setLoading(false)
  }

  return (
    <Modal title={group ? t('sidebar.editCategoryTitle') : t('sidebar.newCategoryTitle')} onClose={onClose}>
      <div className={styles.modalBody}>
        <label className={styles.label}>{t('sidebar.categoryName')}</label>
        <input className={styles.input} value={name} onChange={e => setName(e.target.value)} autoFocus />

        <label className={styles.label}>{t('sidebar.categoryType')}</label>
        <input className={styles.input} value={category} onChange={e => setCategory(e.target.value)} placeholder={t('sidebar.categoryTypePlaceholder')} />

        <label className={styles.label}>{t('sidebar.description')}</label>
        <input className={styles.input} value={description} onChange={e => setDescription(e.target.value)} />

        <label className={styles.checkRow}>
          <input type="checkbox" checked={visible} onChange={e => setVisible(e.target.checked)} />
          <span>{t('sidebar.showCategory')}</span>
        </label>

        <div className={styles.modalActions}>
          {onDelete && (
            <button className={styles.deleteBtn} onClick={async () => { setLoading(true); await onDelete(); setLoading(false) }}>
              <Trash2 size={13} /> {t('sidebar.deleteCategory')}
            </button>
          )}
          <div style={{ flex: 1 }} />
          <button className={styles.cancelBtn} onClick={onClose}>{t('common.cancel')}</button>
          <button className={styles.saveBtn} onClick={handleSave} disabled={loading || !name.trim()}>
            {loading ? '...' : t('common.save')}
          </button>
        </div>
      </div>
    </Modal>
  )
}

// ─── Link Edit Modal ──────────────────────────────────────────
interface LinkModalProps {
  link: LinkExt | null   // null = new link
  groupId: number
  onSave: (data: Partial<LinkExt>) => Promise<void>
  onDelete?: () => Promise<void>
  onClose: () => void
}

function LinkModal({ link, groupId, onSave, onDelete, onClose }: LinkModalProps) {
  const { t } = useTranslation()
  const [name, setName] = useState(link?.link_name ?? '')
  const [url, setUrl] = useState(link?.link ?? '')
  const [username, setUsername] = useState(link?.username ?? '')
  const [password, setPassword] = useState(link?.password ?? '')
  const [visible, setVisible] = useState(link?.visible ?? true)
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSave() {
    if (!name.trim() || !url.trim()) return
    setLoading(true)
    await onSave({
      link_name: name.trim(),
      link: url.trim(),
      username: username.trim() || null,
      password: password.trim() || null,
      visible,
      group_link_id: groupId,
    })
    setLoading(false)
  }

  return (
    <Modal title={link ? t('sidebar.editLinkTitle') : t('sidebar.newLinkTitle')} onClose={onClose}>
      <div className={styles.modalBody}>
        <label className={styles.label}>{t('sidebar.displayName')}</label>
        <input className={styles.input} value={name} onChange={e => setName(e.target.value)} autoFocus />

        <label className={styles.label}>{t('sidebar.url')}</label>
        <input className={styles.input} value={url} onChange={e => setUrl(e.target.value)} placeholder="https://..." dir="ltr" />

        <label className={styles.label}>{t('sidebar.username')}</label>
        <input className={styles.input} value={username} onChange={e => setUsername(e.target.value)} />

        <label className={styles.label}>{t('sidebar.password')}</label>
        <div className={styles.passwordRow}>
          <input
            className={styles.input}
            type={showPass ? 'text' : 'password'}
            value={password}
            onChange={e => setPassword(e.target.value)}
            style={{ flex: 1 }}
          />
          <button className={styles.eyeBtn} onClick={() => setShowPass(x => !x)} type="button">
            {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        </div>

        <label className={styles.checkRow}>
          <input type="checkbox" checked={visible} onChange={e => setVisible(e.target.checked)} />
          <span>{t('sidebar.showLink')}</span>
        </label>

        <div className={styles.modalActions}>
          {onDelete && (
            <button className={styles.deleteBtn} onClick={async () => { setLoading(true); await onDelete(); setLoading(false) }}>
              <Trash2 size={13} /> {t('sidebar.deleteLink')}
            </button>
          )}
          <div style={{ flex: 1 }} />
          <button className={styles.cancelBtn} onClick={onClose}>{t('common.cancel')}</button>
          <button className={styles.saveBtn} onClick={handleSave} disabled={loading || !name.trim() || !url.trim()}>
            {loading ? '...' : t('common.save')}
          </button>
        </div>
      </div>
    </Modal>
  )
}

// ─── Main Sidebar ─────────────────────────────────────────────
export function Sidebar() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [groups, setGroups] = useState<GroupExt[]>([])
  const [links, setLinks] = useState<LinkExt[]>([])
  const [loading, setLoading] = useState(true)
  const [editMode, setEditMode] = useState(false)
  const [collapsed, setCollapsed] = useState(false)

  // modals
  const [groupModal, setGroupModal] = useState<{ group: GroupExt | null } | null>(null)
  const [linkModal, setLinkModal] = useState<{ link: LinkExt | null; groupId: number } | null>(null)

  // drag
  const dragGroupId = useRef<number | null>(null)
  const [dragOverGroupId, setDragOverGroupId] = useState<number | null>(null)

  // ── fetch ──
  useEffect(() => { if (user) fetchAll() }, [user])

  async function fetchAll() {
    setLoading(true)
    const [groupsRes, linksRes] = await Promise.all([
      supabase.from('table_links_group').select('*').eq('user_id', user!.id).order('sort_order').order('created_at'),
      supabase.from('table_links').select('*').eq('user_id', user!.id).order('sort_order').order('created_at'),
    ])
    setGroups(groupsRes.data ?? [])
    setLinks(linksRes.data ?? [])
    setLoading(false)
  }

  // ── toggle group visibility ──
  async function toggleGroupVisible(g: GroupExt) {
    const newVal = !g.visible
    await supabase.from('table_links_group').update({ visible: newVal }).eq('id', g.id)
    setGroups(prev => prev.map(x => x.id === g.id ? { ...x, visible: newVal } : x))
  }

  // ── toggle link visibility ──
  async function toggleLinkVisible(l: LinkExt) {
    const newVal = !l.visible
    await supabase.from('table_links').update({ visible: newVal }).eq('id', l.id)
    setLinks(prev => prev.map(x => x.id === l.id ? { ...x, visible: newVal } : x))
  }

  // ── save group ──
  async function saveGroup(data: Partial<GroupExt>, id?: number) {
    if (id) {
      await supabase.from('table_links_group').update(data).eq('id', id)
      setGroups(prev => prev.map(g => g.id === id ? { ...g, ...data } : g))
    } else {
      const maxOrder = groups.length ? Math.max(...groups.map(g => g.sort_order ?? 0)) + 1 : 0
      const { data: newGroup } = await supabase
        .from('table_links_group')
        .insert([{ ...data, sort_order: maxOrder, user_id: user?.id ?? null }])
        .select().single()
      if (newGroup) setGroups(prev => [...prev, newGroup])
    }
    setGroupModal(null)
  }

  // ── delete group ──
  async function deleteGroup(id: number) {
    await supabase.from('table_links').delete().eq('group_link_id', id)
    await supabase.from('table_links_group').delete().eq('id', id)
    setGroups(prev => prev.filter(g => g.id !== id))
    setLinks(prev => prev.filter(l => l.group_link_id !== id))
    setGroupModal(null)
  }

  // ── save link ──
  async function saveLink(data: Partial<LinkExt>, id?: number) {
    if (id) {
      await supabase.from('table_links').update(data).eq('id', id)
      setLinks(prev => prev.map(l => l.id === id ? { ...l, ...data } : l))
    } else {
      const groupLinks = links.filter(l => l.group_link_id === data.group_link_id)
      const maxOrder = groupLinks.length ? Math.max(...groupLinks.map(l => l.sort_order ?? 0)) + 1 : 0
      const { data: newLink } = await supabase
        .from('table_links')
        .insert([{ ...data, sort_order: maxOrder, user_id: user?.id ?? null }])
        .select().single()
      if (newLink) setLinks(prev => [...prev, newLink])
    }
    setLinkModal(null)
  }

  // ── delete link ──
  async function deleteLink(id: number) {
    await supabase.from('table_links').delete().eq('id', id)
    setLinks(prev => prev.filter(l => l.id !== id))
    setLinkModal(null)
  }

  // ── drag groups ──
  async function handleGroupDrop(overId: number) {
    if (dragGroupId.current === null || dragGroupId.current === overId) {
      setDragOverGroupId(null); return
    }
    const from = groups.findIndex(g => g.id === dragGroupId.current)
    const to   = groups.findIndex(g => g.id === overId)
    const reordered = [...groups]
    const [moved] = reordered.splice(from, 1)
    reordered.splice(to, 0, moved)
    const updated = reordered.map((g, i) => ({ ...g, sort_order: i }))
    setGroups(updated)
    await Promise.all(updated.map(g => supabase.from('table_links_group').update({ sort_order: g.sort_order }).eq('id', g.id)))
    dragGroupId.current = null
    setDragOverGroupId(null)
  }

  // ── copy to clipboard ──
  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text)
  }

  const visibleGroups = editMode ? groups : groups.filter(g => g.visible !== false)

  return (
    <nav className={`${styles.sidebar} ${collapsed ? styles.collapsed : ''}`}>
      {/* Header */}
      <div className={styles.sidebarHeader}>
        <button
          className={styles.hamburger}
          onClick={() => setCollapsed(x => !x)}
          title={collapsed ? t('sidebar.expand') : t('sidebar.collapse')}
        >
          <Menu size={16} />
        </button>

        {!collapsed && (
          <>
            <span className={styles.sidebarTitle}>{t('sidebar.title')}</span>
            <button
              className={`${styles.editToggle} ${editMode ? styles.editActive : ''}`}
              onClick={() => setEditMode(x => !x)}
              title={editMode ? t('sidebar.finishEdit') : t('sidebar.editMode')}
            >
              {editMode ? <><Check size={13} /> {t('sidebar.finishEdit')}</> : <><Pencil size={13} /> {t('sidebar.editMode')}</>}
            </button>
          </>
        )}
      </div>

      {!collapsed && loading && <div className={styles.loading}>{t('common.loading')}</div>}

      {/* Collapsed — only favicons */}
      {collapsed && (
        <div className={styles.collapsedLinks}>
          {links.filter(l => l.visible !== false).map(link => {
            try {
              return (
                <a
                  key={link.id}
                  href={link.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.collapsedLink}
                  title={link.link_name}
                >
                  <img
                    src={`https://icons.duckduckgo.com/ip3/${new URL(link.link).hostname}.ico`}
                    alt={link.link_name}
                    className={styles.favicon}
                    onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                  />
                </a>
              )
            } catch { return null }
          })}
        </div>
      )}

      {/* Groups — full mode only */}
      {!collapsed && (
        <>
          <div className={styles.groupsList}>
        {visibleGroups.map(group => {
          const groupLinks = links.filter(l => l.group_link_id === group.id)
          const visibleLinks = editMode ? groupLinks : groupLinks.filter(l => l.visible !== false)

          return (
            <div
              key={group.id}
              className={`${styles.group} ${dragOverGroupId === group.id ? styles.dragOver : ''} ${group.visible === false ? styles.hiddenGroup : ''}`}
              draggable={editMode}
              onDragStart={() => { dragGroupId.current = group.id }}
              onDragOver={e => { e.preventDefault(); setDragOverGroupId(group.id) }}
              onDrop={() => handleGroupDrop(group.id)}
              onDragEnd={() => setDragOverGroupId(null)}
            >
              {/* Group header */}
              <div className={styles.groupHeader}>
                {editMode && <span className={styles.dragHandle}><GripVertical size={14} /></span>}
                <span className={styles.groupName}>{group.group_name}</span>
                {group.visible === false && <span className={styles.hiddenBadge}>{t('common.hidden')}</span>}

                <div className={styles.groupActions}>
                  {editMode && (
                    <>
                      <button
                        className={styles.iconBtn}
                        onClick={() => toggleGroupVisible(group)}
                        title={group.visible === false ? t('common.show') : t('common.hide')}
                      >
                        {group.visible === false ? <Eye size={13} /> : <EyeOff size={13} />}
                      </button>
                      <button
                        className={styles.iconBtn}
                        onClick={() => setGroupModal({ group })}
                        title={t('sidebar.editCategoryBtn')}
                      >
                        <Pencil size={13} />
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Links */}
              <div className={styles.linksList}>
                {visibleLinks.map(link => (
                  <div
                    key={link.id}
                    className={`${styles.linkItem} ${link.visible === false ? styles.hiddenLink : ''}`}
                  >
                    {editMode ? (
                      // Edit mode — show controls
                      <div className={styles.linkEditRow}>
                        <span className={styles.linkName}>{link.link_name}</span>
                        {link.visible === false && <span className={styles.hiddenBadge}>{t('common.hidden')}</span>}
                        <div className={styles.linkActions}>
                          {link.username && (
                            <button
                              className={styles.iconBtn}
                              onClick={() => copyToClipboard(link.username!)}
                              title={t('sidebar.copyUsername', { name: link.username })}
                            ><User size={13} /></button>
                          )}
                          {link.password && (
                            <button
                              className={styles.iconBtn}
                              onClick={() => copyToClipboard(link.password!)}
                              title={t('sidebar.copyPassword')}
                            ><KeyRound size={13} /></button>
                          )}
                          <button
                            className={styles.iconBtn}
                            onClick={() => toggleLinkVisible(link)}
                            title={link.visible === false ? t('common.show') : t('common.hide')}
                          >
                            {link.visible === false ? <Eye size={13} /> : <EyeOff size={13} />}
                          </button>
                          <button
                            className={styles.iconBtn}
                            onClick={() => setLinkModal({ link, groupId: group.id })}
                            title={t('sidebar.editLinkBtn')}
                          ><Pencil size={13} /></button>
                        </div>
                      </div>
                    ) : (
                      // Normal mode — clickable link
                      <div className={styles.linkNormalRow}>
                        <a
                          href={link.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={styles.linkAnchor}
                        >
                          <img
                            src={`https://icons.duckduckgo.com/ip3/${new URL(link.link).hostname}.ico`}
                            alt=""
                            className={styles.favicon}
                            onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                          />
                          {link.link_name}
                        </a>
                        {(link.username || link.password) && (
                          <div className={styles.credsBtns}>
                            {link.username && (
                              <button
                                className={styles.credBtn}
                                onClick={() => copyToClipboard(link.username!)}
                                title={t('sidebar.copyUsername', { name: link.username })}
                              ><User size={12} /></button>
                            )}
                            {link.password && (
                              <button
                                className={styles.credBtn}
                                onClick={() => copyToClipboard(link.password!)}
                                title={t('sidebar.copyPassword')}
                              ><KeyRound size={12} /></button>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}

                {/* Add link button */}
                {editMode && (
                  <button
                    className={styles.addLinkBtn}
                    onClick={() => setLinkModal({ link: null, groupId: group.id })}
                  >
                    {t('sidebar.addLink')}
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Add group button */}
      {editMode && (
        <button className={styles.addGroupBtn} onClick={() => setGroupModal({ group: null })}>
          {t('sidebar.addCategory')}
        </button>
      )}
        </>
      )}

      {/* Modals */}
      {groupModal && (
        <GroupModal
          group={groupModal.group}
          onClose={() => setGroupModal(null)}
          onSave={data => saveGroup(data, groupModal.group?.id)}
          onDelete={groupModal.group ? () => deleteGroup(groupModal.group!.id) : undefined}
        />
      )}

      {linkModal && (
        <LinkModal
          link={linkModal.link}
          groupId={linkModal.groupId}
          onClose={() => setLinkModal(null)}
          onSave={data => saveLink(data, linkModal.link?.id)}
          onDelete={linkModal.link ? () => deleteLink(linkModal.link!.id) : undefined}
        />
      )}
    </nav>
  )
}
