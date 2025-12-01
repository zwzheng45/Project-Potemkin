import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import clsx from 'clsx'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowRight,
  Bot,
  ChevronLeft,
  Info,
  Loader2,
  Plus,
  RefreshCcw,
  Settings,
  Trash2,
  X,
} from 'lucide-react'

import { api } from './lib/api'
import type {
  ChatMessage,
  ChatResponse,
  MemorySnapshot,
  FamilyMember,
  CreateFamilyPayload,
  UpdateFamilyPayload,
  Family,
  HealthStatus,
} from './types'

type Copy = {
  languageName: string
  languageSelectorLabel: string
  backButtonLabel: string
  brandTagline: string
  heroTitleLine1: string
  heroTitleLine2: string
  heroSubtitle: string
  heroSubtitleAccent: string
  familyNamePlaceholder: string
  familyDescriptionPlaceholder: string
  familyIdPlaceholder: string
  familyStakePlaceholder: string
  familyNameRequired: string
  createFamilyButton: string
  selectExistingFamily: string
  footerMembase: string
  footerChain: string
  identitySelectionLabel: string
  identitySelectionTitle: string
  noMembersTitle: string
  noMembersSubtitle: string
  newMemberTitle: string
  newMemberNamePlaceholder: string
  newMemberIdentityPlaceholder: string
  confirmLabel: string
  addMemberButton: string
  enterFamilyButton: string
  introWelcome: string
  introTagline: string
  modalEditTitle: string
  modalDescriptionLabel: string
  modalStakeLabel: string
  modalStakeHint: string
  cancelButton: string
  saveButton: string
  savingButton: string
  identityLabelPrefix: string
  switchLabel: string
  editLabel: string
  removeLabel: string
  refreshTooltip: string
  editTooltip: string
  deleteTooltip: string
  deleteConfirmation: string
  dashIdSuffix: string
  chatEmptyState: string
  chatPlaceholder: string
  guestLabel: string
  chatUserBadge: string
  chatAIBadge: string
  memoryHeading: string
  activeContextLabel: string
  shortTermHeading: string
  longTermHeading: string
  profileHeading: string
  emptyMemoryLabel: string
  apiConnected: string
  apiConnecting: string
  apiFailed: string
  identityUnsetLabel: string
  conversationTabLabel: string
  fileManagementTabLabel: string
}

const translations = {
  en: {
    languageName: 'English',
    languageSelectorLabel: 'Language',
    backButtonLabel: 'Back',
    brandTagline: 'Unibase Family Companion',
    heroTitleLine1: 'Chain Memory',
    heroTitleLine2: 'Warm Companion',
    heroSubtitle: 'Create an AI companion with independent memory for your family.',
    heroSubtitleAccent: 'Data on Membase · Rights on Chain',
    familyNamePlaceholder: 'Name your family...',
    familyDescriptionPlaceholder: 'Family summary (optional)',
    familyIdPlaceholder: 'ID (optional)',
    familyStakePlaceholder: 'Stake (BNB)',
    familyNameRequired: 'Please enter a family name',
    createFamilyButton: 'Create Family',
    selectExistingFamily: 'Select Existing Family',
    footerMembase: 'Membase Powered',
    footerChain: 'BNB Chain',
    identitySelectionLabel: 'Identity Selection',
    identitySelectionTitle: 'Who are you?',
    noMembersTitle: 'No members yet',
    noMembersSubtitle: 'Add the first family identity to continue.',
    newMemberTitle: 'New Member',
    newMemberNamePlaceholder: 'Name...',
    newMemberIdentityPlaceholder: 'Identity...',
    confirmLabel: 'Confirm',
    addMemberButton: 'Add Member',
    enterFamilyButton: 'Enter Family',
    introWelcome: 'Welcome',
    introTagline: 'Your Family Companion',
    modalEditTitle: 'Edit Family',
    modalDescriptionLabel: 'Description',
    modalStakeLabel: 'Stake (BNB)',
    modalStakeHint: 'Non-negative, synced with on-chain metadata when saved.',
    cancelButton: 'Cancel',
    saveButton: 'Save',
    savingButton: 'Saving...',
    identityLabelPrefix: 'Identity:',
    switchLabel: 'Switch',
    editLabel: 'Edit',
    removeLabel: 'Remove',
    refreshTooltip: 'Refresh memory',
    editTooltip: 'Edit family details',
    deleteTooltip: 'Delete family',
    deleteConfirmation: 'Delete this family? This cannot be undone.',
    dashIdSuffix: '· On Chain',
    chatEmptyState: 'Start conversation with {family}',
    chatPlaceholder: 'Message as {sender}...',
    guestLabel: 'Guest',
    chatUserBadge: 'ME',
    chatAIBadge: 'AI',
    memoryHeading: 'Memory State',
    activeContextLabel: 'Active Context',
    shortTermHeading: 'Short-term Memory',
    longTermHeading: 'Long-term Memory',
    profileHeading: 'Family Profile',
    emptyMemoryLabel: 'Empty',
    apiConnected: 'API Connected',
    apiConnecting: 'API Connecting...',
    apiFailed: 'API Failed to Fetch',
    identityUnsetLabel: 'Unset',
    conversationTabLabel: 'Conversation',
    fileManagementTabLabel: 'File Management',
  },
  zh: {
    languageName: '中文',
    languageSelectorLabel: '语言',
    backButtonLabel: '返回',
    brandTagline: 'Unibase 家庭陪伴者',
    heroTitleLine1: '链上记忆',
    heroTitleLine2: '温暖陪伴',
    heroSubtitle: '为你的家庭打造拥有独立记忆的 AI 伙伴。',
    heroSubtitleAccent: '数据存于 Membase · 权益上链',
    familyNamePlaceholder: '为家庭命名...',
    familyDescriptionPlaceholder: '家庭简介（可选）',
    familyIdPlaceholder: '自定义 ID（可选）',
    familyStakePlaceholder: '质押金额（BNB）',
    familyNameRequired: '请填写家庭名称',
    createFamilyButton: '创建家庭',
    selectExistingFamily: '选择已有家庭',
    footerMembase: 'Membase 驱动',
    footerChain: 'BNB 链',
    identitySelectionLabel: '身份选择',
    identitySelectionTitle: '你是谁？',
    noMembersTitle: '暂无成员',
    noMembersSubtitle: '添加第一个家庭身份以继续。',
    newMemberTitle: '新增成员',
    newMemberNamePlaceholder: '姓名...',
    newMemberIdentityPlaceholder: '身份...',
    confirmLabel: '确认',
    addMemberButton: '添加成员',
    enterFamilyButton: '进入家庭',
    introWelcome: '欢迎',
    introTagline: '你的家庭伙伴',
    modalEditTitle: '编辑家庭',
    modalDescriptionLabel: '简介',
    modalStakeLabel: '质押金额（BNB）',
    modalStakeHint: '需为非负数，保存时会同步到链上元数据。',
    cancelButton: '取消',
    saveButton: '保存',
    savingButton: '保存中...',
    identityLabelPrefix: '身份：',
    switchLabel: '切换',
    editLabel: '编辑',
    removeLabel: '删除',
    refreshTooltip: '刷新记忆',
    editTooltip: '编辑家庭详情',
    deleteTooltip: '删除家庭',
    deleteConfirmation: '确定删除该家庭？此操作无法撤销。',
    dashIdSuffix: '· 已上链',
    chatEmptyState: '开始与 {family} 对话',
    chatPlaceholder: '以 {sender} 的身份发送消息...',
    guestLabel: '访客',
    chatUserBadge: '我',
    chatAIBadge: '助理',
    memoryHeading: '记忆概览',
    activeContextLabel: '当前上下文',
    shortTermHeading: '短期记忆',
    longTermHeading: '长期记忆',
    profileHeading: '家庭画像',
    emptyMemoryLabel: '暂无',
    apiConnected: 'API 已连接',
    apiConnecting: 'API 连接中...',
    apiFailed: 'API 连接失败',
    identityUnsetLabel: '未设置',
    conversationTabLabel: '对话',
    fileManagementTabLabel: '文件管理',
  },
  fr: {
    languageName: 'Français',
    languageSelectorLabel: 'Langue',
    backButtonLabel: 'Retour',
    brandTagline: 'Compagnon Familial Unibase',
    heroTitleLine1: 'Mémoire sur chaîne',
    heroTitleLine2: 'Compagnon chaleureux',
    heroSubtitle: "Créez un compagnon IA doté d'une mémoire indépendante pour votre famille.",
    heroSubtitleAccent: 'Données sur Membase · Droits on-chain',
    familyNamePlaceholder: 'Nommez votre famille...',
    familyDescriptionPlaceholder: 'Résumé de la famille (optionnel)',
    familyIdPlaceholder: 'ID (optionnel)',
    familyStakePlaceholder: 'Mise (BNB)',
    familyNameRequired: 'Veuillez saisir un nom de famille',
    createFamilyButton: 'Créer la famille',
    selectExistingFamily: 'Sélectionner une famille existante',
    footerMembase: 'Propulsé par Membase',
    footerChain: 'BNB Chain',
    identitySelectionLabel: "Sélection d'identité",
    identitySelectionTitle: 'Qui êtes-vous ?',
    noMembersTitle: 'Aucun membre',
    noMembersSubtitle: 'Ajoutez le premier membre pour continuer.',
    newMemberTitle: 'Nouveau membre',
    newMemberNamePlaceholder: 'Nom...',
    newMemberIdentityPlaceholder: 'Identité...',
    confirmLabel: 'Confirmer',
    addMemberButton: 'Ajouter un membre',
    enterFamilyButton: 'Entrer dans la famille',
    introWelcome: 'Bienvenue',
    introTagline: 'Votre compagnon familial',
    modalEditTitle: 'Modifier la famille',
    modalDescriptionLabel: 'Description',
    modalStakeLabel: 'Mise (BNB)',
    modalStakeHint: 'Doit être positive ou nulle, synchronisée on-chain lors de l’enregistrement.',
    cancelButton: 'Annuler',
    saveButton: 'Enregistrer',
    savingButton: 'Enregistrement...',
    identityLabelPrefix: 'Identité :',
    switchLabel: 'Changer',
    editLabel: 'Modifier',
    removeLabel: 'Supprimer',
    refreshTooltip: 'Actualiser la mémoire',
    editTooltip: 'Modifier les détails de la famille',
    deleteTooltip: 'Supprimer la famille',
    deleteConfirmation: 'Supprimer cette famille ? Cette action est irréversible.',
    dashIdSuffix: '· On-chain',
    chatEmptyState: 'Commencez à discuter avec {family}',
    chatPlaceholder: 'Message en tant que {sender}...',
    guestLabel: 'Invité',
    chatUserBadge: 'MOI',
    chatAIBadge: 'IA',
    memoryHeading: 'État de la mémoire',
    activeContextLabel: 'Contexte actif',
    shortTermHeading: 'Mémoire court terme',
    longTermHeading: 'Mémoire long terme',
    profileHeading: 'Profil familial',
    emptyMemoryLabel: 'Vide',
    apiConnected: 'API connectée',
    apiConnecting: 'API en connexion...',
    apiFailed: 'API indisponible',
    identityUnsetLabel: 'Non défini',
    conversationTabLabel: 'Conversation',
    fileManagementTabLabel: 'Gestion des fichiers',
  },
  de: {
    languageName: 'Deutsch',
    languageSelectorLabel: 'Sprache',
    backButtonLabel: 'Zurück',
    brandTagline: 'Unibase Familienbegleiter',
    heroTitleLine1: 'Kettengedächtnis',
    heroTitleLine2: 'Warmer Begleiter',
    heroSubtitle: 'Erschaffen Sie einen KI-Begleiter mit eigenem Gedächtnis für Ihre Familie.',
    heroSubtitleAccent: 'Daten auf Membase · Rechte on-chain',
    familyNamePlaceholder: 'Benennen Sie Ihre Familie...',
    familyDescriptionPlaceholder: 'Familienzusammenfassung (optional)',
    familyIdPlaceholder: 'ID (optional)',
    familyStakePlaceholder: 'Stake (BNB)',
    familyNameRequired: 'Bitte einen Familiennamen eingeben',
    createFamilyButton: 'Familie erstellen',
    selectExistingFamily: 'Bestehende Familie wählen',
    footerMembase: 'Angetrieben von Membase',
    footerChain: 'BNB Chain',
    identitySelectionLabel: 'Identitätsauswahl',
    identitySelectionTitle: 'Wer sind Sie?',
    noMembersTitle: 'Noch keine Mitglieder',
    noMembersSubtitle: 'Fügen Sie die erste Familienidentität hinzu, um fortzufahren.',
    newMemberTitle: 'Neues Mitglied',
    newMemberNamePlaceholder: 'Name...',
    newMemberIdentityPlaceholder: 'Identität...',
    confirmLabel: 'Bestätigen',
    addMemberButton: 'Mitglied hinzufügen',
    enterFamilyButton: 'Familie betreten',
    introWelcome: 'Willkommen',
    introTagline: 'Ihr Familienbegleiter',
    modalEditTitle: 'Familie bearbeiten',
    modalDescriptionLabel: 'Beschreibung',
    modalStakeLabel: 'Stake (BNB)',
    modalStakeHint: 'Darf nicht negativ sein und wird beim Speichern on-chain synchronisiert.',
    cancelButton: 'Abbrechen',
    saveButton: 'Speichern',
    savingButton: 'Speichern...',
    identityLabelPrefix: 'Identität:',
    switchLabel: 'Wechseln',
    editLabel: 'Bearbeiten',
    removeLabel: 'Entfernen',
    refreshTooltip: 'Speicher aktualisieren',
    editTooltip: 'Familiendaten bearbeiten',
    deleteTooltip: 'Familie löschen',
    deleteConfirmation: 'Diese Familie löschen? Dies kann nicht rückgängig gemacht werden.',
    dashIdSuffix: '· On-chain',
    chatEmptyState: 'Beginnen Sie ein Gespräch mit {family}',
    chatPlaceholder: 'Nachricht als {sender}...',
    guestLabel: 'Gast',
    chatUserBadge: 'ICH',
    chatAIBadge: 'KI',
    memoryHeading: 'Speicherstatus',
    activeContextLabel: 'Aktiver Kontext',
    shortTermHeading: 'Kurzzeitgedächtnis',
    longTermHeading: 'Langzeitgedächtnis',
    profileHeading: 'Familienprofil',
    emptyMemoryLabel: 'Leer',
    apiConnected: 'API verbunden',
    apiConnecting: 'API verbindet...',
    apiFailed: 'API-Verbindung fehlgeschlagen',
    identityUnsetLabel: 'Nicht gesetzt',
    conversationTabLabel: 'Konversation',
    fileManagementTabLabel: 'Dateiverwaltung',
  },
  ja: {
    languageName: '日本語',
    languageSelectorLabel: '言語',
    backButtonLabel: '戻る',
    brandTagline: 'Unibase ファミリーコンパニオン',
    heroTitleLine1: 'チェーンメモリー',
    heroTitleLine2: 'あたたかな相棒',
    heroSubtitle: '家族のために独立した記憶を持つ AI パートナーを作りましょう。',
    heroSubtitleAccent: 'データは Membase · 権利はオンチェーン',
    familyNamePlaceholder: '家族の名前を入力...',
    familyDescriptionPlaceholder: '家族の概要（任意）',
    familyIdPlaceholder: 'ID（任意）',
    familyStakePlaceholder: 'ステーク（BNB）',
    familyNameRequired: '家族名を入力してください',
    createFamilyButton: '家族を作成',
    selectExistingFamily: '既存の家族を選択',
    footerMembase: 'Membase 提供',
    footerChain: 'BNB チェーン',
    identitySelectionLabel: 'アイデンティティ選択',
    identitySelectionTitle: 'あなたは誰ですか？',
    noMembersTitle: 'メンバーがいません',
    noMembersSubtitle: '続行するには最初の家族メンバーを追加してください。',
    newMemberTitle: '新しいメンバー',
    newMemberNamePlaceholder: '名前...',
    newMemberIdentityPlaceholder: '役割...',
    confirmLabel: '確定',
    addMemberButton: 'メンバーを追加',
    enterFamilyButton: '家族に入る',
    introWelcome: 'ようこそ',
    introTagline: 'あなたの家族コンパニオン',
    modalEditTitle: '家族を編集',
    modalDescriptionLabel: '概要',
    modalStakeLabel: 'ステーク（BNB）',
    modalStakeHint: '0 以上の数値で、保存時にオンチェーン情報と同期します。',
    cancelButton: 'キャンセル',
    saveButton: '保存',
    savingButton: '保存中...',
    identityLabelPrefix: 'アイデンティティ：',
    switchLabel: '切り替え',
    editLabel: '編集',
    removeLabel: '削除',
    refreshTooltip: 'メモリーを更新',
    editTooltip: '家族詳細を編集',
    deleteTooltip: '家族を削除',
    deleteConfirmation: 'この家族を削除しますか？元に戻せません。',
    dashIdSuffix: '· オンチェーン',
    chatEmptyState: '{family} と会話を始めましょう',
    chatPlaceholder: '{sender} としてメッセージ...',
    guestLabel: 'ゲスト',
    chatUserBadge: '私',
    chatAIBadge: 'AI',
    memoryHeading: 'メモリー状況',
    activeContextLabel: 'アクティブなコンテキスト',
    shortTermHeading: '短期メモリー',
    longTermHeading: '長期メモリー',
    profileHeading: '家族プロフィール',
    emptyMemoryLabel: 'なし',
    apiConnected: 'API 接続済み',
    apiConnecting: 'API 接続中...',
    apiFailed: 'API 接続失敗',
    identityUnsetLabel: '未設定',
    conversationTabLabel: '会話',
    fileManagementTabLabel: 'ファイル管理',
  },
} as const satisfies Record<string, Copy>

type SupportedLanguage = keyof typeof translations

const languageOptions: Array<{ code: SupportedLanguage; label: string }> = [
  { code: 'en', label: translations.en.languageName },
  { code: 'zh', label: translations.zh.languageName },
  { code: 'fr', label: translations.fr.languageName },
  { code: 'de', label: translations.de.languageName },
  { code: 'ja', label: translations.ja.languageName },
]

const interpolate = (template: string, vars: Record<string, string>) =>
  template.replace(/\{(\w+)\}/g, (_match, key) => vars[key] ?? '')

const isSupportedLanguage = (value: string): value is SupportedLanguage =>
  value in translations

const getInitialLanguage = (): SupportedLanguage => {
  if (typeof window === 'undefined') {
    return 'en'
  }
  const stored = window.localStorage.getItem('fc-language')
  return stored && isSupportedLanguage(stored) ? stored : 'en'
}

const DecorativeBackground = () => (
  <>
    <div className="pointer-events-none absolute inset-0 bg-surface-50" />
    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(0,0,0,0.02),_transparent_60%)]" />
    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,_rgba(0,0,0,0.02),_transparent_60%)]" />
    <div className="pointer-events-none absolute top-0 left-0 w-full h-full opacity-[0.02] bg-[url('https://www.transparenttextures.com/patterns/concrete-wall.png')]" />
  </>
)

type LanguageSelectorProps = {
  language: SupportedLanguage
  label: string
  onChange: (language: SupportedLanguage) => void
  className?: string
}

const LanguageSelector = ({ language, label, onChange, className }: LanguageSelectorProps) => (
  <div
    className={clsx(
      'flex items-center gap-2 rounded-full border border-stone-200 bg-white/80 px-4 py-2 text-[10px] uppercase tracking-[0.3em] text-stone-500 shadow-sm backdrop-blur',
      className,
    )}
  >
    <span>{label}</span>
    <select
      value={language}
      onChange={(event) => onChange(event.target.value as SupportedLanguage)}
      className="bg-transparent text-[10px] uppercase tracking-[0.3em] text-stone-900 outline-none"
    >
      {languageOptions.map((option) => (
        <option key={option.code} value={option.code} className="text-stone-800">
          {option.label}
        </option>
      ))}
    </select>
  </div>
)

function App() {
  const queryClient = useQueryClient()
  const [selectedFamilyId, setSelectedFamilyId] = useState<string | null>(null)
  const [view, setView] = useState<'landing' | 'identity' | 'intro' | 'dashboard'>('landing')
  const [introStep, setIntroStep] = useState(0)
  const [familyForm, setFamilyForm] = useState({
    name: '',
    description: '',
    family_id: '',
    task_price: '',
  })
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([])
  const [isAddingMember, setIsAddingMember] = useState(false)
  const [newMemberName, setNewMemberName] = useState('')
  const [newMemberIdentity, setNewMemberIdentity] = useState('')
  const [selectedMember, setSelectedMember] = useState<FamilyMember | null>(null)
  const [chatDraft, setChatDraft] = useState('')
  const [chatLogs, setChatLogs] = useState<Record<string, ChatMessage[]>>({})
  const [memoryCache, setMemoryCache] = useState<Record<string, MemorySnapshot>>({})
  const [contextCache, setContextCache] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [chatError, setChatError] = useState<string | null>(null)
  const [globalError, setGlobalError] = useState<string | null>(null)
  const [shouldShowIntro, setShouldShowIntro] = useState(false)
  const [isEditingFamily, setIsEditingFamily] = useState(false)
  const [familyEditForm, setFamilyEditForm] = useState({
    description: '',
    task_price: '',
  })
  const [dashboardView, setDashboardView] = useState<'chat' | 'files'>('chat')
  const [language, setLanguage] = useState<SupportedLanguage>(() => getInitialLanguage())

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem('fc-language', language)
  }, [language])

  const copy = translations[language]

  useEffect(() => {
    if (!selectedFamilyId) {
      setView('landing')
    }
  }, [selectedFamilyId])

  const healthQuery = useQuery<HealthStatus>({
    queryKey: ['health'],
    queryFn: api.fetchHealth,
    refetchInterval: 30_000,
  })

  const familiesQuery = useQuery<Family[]>({
    queryKey: ['families'],
    queryFn: api.fetchFamilies,
  })

  const families = familiesQuery.data ?? []
  const selectedFamily = useMemo(() => {
    if (!familiesQuery.data || familiesQuery.data.length === 0) return null
    if (selectedFamilyId) {
      return (
        familiesQuery.data.find((family) => family.family_id === selectedFamilyId) ??
        familiesQuery.data[0]
      )
    }
    return null
  }, [familiesQuery.data, selectedFamilyId])

  useEffect(() => {
    if (!selectedFamily) {
      setFamilyMembers([])
      setSelectedMember(null)
      setFamilyEditForm({ description: '', task_price: '' })
      return
    }
    setFamilyMembers(selectedFamily.members ?? [])
    setFamilyEditForm({
      description: selectedFamily.description ?? '',
      task_price: selectedFamily.task_price?.toString() ?? '',
    })
    setSelectedMember((current) => {
      if (!current) return selectedFamily.members?.[0] ?? null
      const stillExists = selectedFamily.members?.find(
        (member) =>
          member.name === current.name && member.identity === current.identity,
      )
      return stillExists ?? selectedFamily.members?.[0] ?? null
    })
  }, [selectedFamily])

  const memoryQuery = useQuery<MemorySnapshot>({
    queryKey: ['memory', selectedFamily?.family_id],
    queryFn: () => api.fetchMemory(selectedFamily!.family_id),
    enabled: Boolean(selectedFamily),
    placeholderData: selectedFamily ? memoryCache[selectedFamily.family_id] : undefined,
  })

  const createFamilyMutation = useMutation<Family, Error, CreateFamilyPayload>({
    mutationFn: (payload) => api.createFamily(payload),
    onSuccess: (family) => {
      setFormError(null)
      setFamilyForm({ name: '', description: '', family_id: '', task_price: '' })
      queryClient.setQueryData(['families'], (old: any) => [...(old || []), family])
      setSelectedFamilyId(family.family_id)
      setShouldShowIntro(true)
      setView('identity')
    },
    onError: (error: Error) => {
      setFormError(error.message)
    },
  })

  const chatMutation = useMutation<
    ChatResponse,
    Error,
    { familyId: string; content: string; sender: string }
  >({
    mutationFn: async ({ familyId, content, sender }) => {
      return api.chatWithFamily(familyId, { sender, content })
    },
    onSuccess: (resp) => {
      setChatError(null)
      setChatLogs((prev) => ({
        ...prev,
        [resp.family_id]: [
          ...(prev[resp.family_id] ?? []),
          {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: resp.reply,
            timestamp: new Date().toISOString(),
          },
        ],
      }))
      setMemoryCache((prev) => ({ ...prev, [resp.family_id]: resp.memory }))
      setContextCache((prev) => ({ ...prev, [resp.family_id]: resp.context_used }))
      queryClient.setQueryData(['memory', resp.family_id], resp.memory)
    },
    onError: (error: Error) => setChatError(error.message),
  })

  const updateFamilyMutation = useMutation<
    Family,
    Error,
    { familyId: string; payload: UpdateFamilyPayload }
  >({
    mutationFn: ({ familyId, payload }) => api.updateFamily(familyId, payload),
    onSuccess: (updatedFamily) => {
      setGlobalError(null)
      queryClient.setQueryData(['families'], (old: Family[] | undefined) => {
        if (!old) return [updatedFamily]
        return old.map((fam) =>
          fam.family_id === updatedFamily.family_id ? updatedFamily : fam,
        )
      })
      if (selectedFamilyId === updatedFamily.family_id) {
        setFamilyMembers(updatedFamily.members ?? [])
        setFamilyEditForm({
          description: updatedFamily.description ?? '',
          task_price: updatedFamily.task_price?.toString() ?? '',
        })
        setSelectedMember((current) => {
          if (!current) return updatedFamily.members?.[0] ?? null
          const stillExists = updatedFamily.members?.find(
            (member) =>
              member.name === current.name && member.identity === current.identity,
          )
          return stillExists ?? updatedFamily.members?.[0] ?? null
        })
      }
    },
    onError: (error: Error) => setGlobalError(error.message),
  })

  const deleteFamilyMutation = useMutation<void, Error, string>({
    mutationFn: (familyId) => api.deleteFamily(familyId),
    onSuccess: (_data, familyId) => {
      setGlobalError(null)
      queryClient.setQueryData(['families'], (old: Family[] | undefined) =>
        old?.filter((fam) => fam.family_id !== familyId) ?? [],
      )
      if (selectedFamilyId === familyId) {
        setSelectedFamilyId(null)
        setView('landing')
      }
    },
    onError: (error: Error) => setGlobalError(error.message),
  })

  const activeFamilyId = selectedFamily?.family_id
  const currentChat = activeFamilyId ? chatLogs[activeFamilyId] ?? [] : []
  const currentMemory = useMemo(() => {
    if (!activeFamilyId) return undefined
    return memoryQuery.data ?? memoryCache[activeFamilyId]
  }, [activeFamilyId, memoryCache, memoryQuery.data])
  const currentContext = activeFamilyId ? contextCache[activeFamilyId] : undefined
  const healthError = (healthQuery.error as Error | null) ?? null
  const apiStatusIndicator = useMemo(() => {
    if (healthQuery.data?.status === 'ok') {
      return {
        dotClass: 'bg-emerald-400',
        label: copy.apiConnected,
      }
    }
    if (healthError?.message?.toLowerCase().includes('failed to fetch')) {
      return {
        dotClass: 'bg-red-400',
        label: copy.apiFailed,
      }
    }
    return {
      dotClass: 'bg-emerald-300',
      label: copy.apiConnecting,
    }
  }, [healthQuery.data?.status, healthError, copy])
  const senderLabel = selectedMember
    ? `${selectedMember.identity} (${selectedMember.name})`
    : ''

  const normalizeStakeInput = (value: string) => {
    if (value === '' || value === '-') return value
    const numericValue = Number(value)
    if (Number.isNaN(numericValue)) return ''
    return numericValue < 0 ? '0' : value
  }

  const handleTaskPriceChange = (value: string) => {
    setFamilyForm((prev) => ({ ...prev, task_price: normalizeStakeInput(value) }))
  }

  const handleEditStakeChange = (value: string) => {
    setFamilyEditForm((prev) => ({ ...prev, task_price: normalizeStakeInput(value) }))
  }

  const handleCreateFamily = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!familyForm.name.trim()) {
      setFormError(copy.familyNameRequired)
      return
    }
    const parsedTaskPrice =
      familyForm.task_price === ''
        ? undefined
        : Math.max(0, Number(familyForm.task_price) || 0)
    createFamilyMutation.mutate({
      name: familyForm.name.trim(),
      description: familyForm.description.trim() || undefined,
      family_id: familyForm.family_id.trim() || undefined,
      task_price: parsedTaskPrice,
      members: [],
    })
  }

  const handleSaveFamilyDetails = () => {
    if (!selectedFamily) return
    const payload: UpdateFamilyPayload = {}
    if (familyEditForm.description.trim() !== selectedFamily.description?.trim()) {
      payload.description = familyEditForm.description.trim()
    }
    const parsedStake = familyEditForm.task_price.trim()
    if (parsedStake !== '') {
      const numericStake = Math.max(0, Number(parsedStake) || 0)
      if ((selectedFamily.task_price ?? null) !== numericStake) {
        payload.task_price = numericStake
      }
    }
    if (!Object.keys(payload).length) {
      setIsEditingFamily(false)
      return
    }
    updateFamilyMutation.mutate({
      familyId: selectedFamily.family_id,
      payload,
    })
    setIsEditingFamily(false)
  }

  const persistMembers = (members: FamilyMember[]) => {
    if (!selectedFamily) return
    updateFamilyMutation.mutate({
      familyId: selectedFamily.family_id,
      payload: { members },
    })
  }

  const handleAddMember = () => {
    if (!selectedFamily) return
    const name = newMemberName.trim()
    const identity = newMemberIdentity.trim()
    if (!name || !identity) return
    const updatedMembers = [...familyMembers, { name, identity }]
    setFamilyMembers(updatedMembers)
    setSelectedMember({ name, identity })
    setNewMemberName('')
    setNewMemberIdentity('')
    setIsAddingMember(false)
    persistMembers(updatedMembers)
  }

  const handleRemoveMember = (member: FamilyMember) => {
    if (!selectedFamily) return
    const updatedMembers = familyMembers.filter(
      (item) => item.name !== member.name || item.identity !== member.identity,
    )
    setFamilyMembers(updatedMembers)
    persistMembers(updatedMembers)
    if (
      selectedMember &&
      selectedMember.name === member.name &&
      selectedMember.identity === member.identity
    ) {
      setSelectedMember(updatedMembers[0] ?? null)
    }
  }

  const handleDeleteFamily = () => {
    if (!selectedFamily) return
    const confirmed = window.confirm(copy.deleteConfirmation)
    if (!confirmed) return
    deleteFamilyMutation.mutate(selectedFamily.family_id)
  }

  const handleSendMessage = () => {
    if (!activeFamilyId || !chatDraft.trim() || !selectedMember) return
    const content = chatDraft.trim()
    setChatDraft('')
    const pendingMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
      timestamp: new Date().toISOString(),
    }
    setChatLogs((prev) => ({
      ...prev,
      [activeFamilyId]: [...(prev[activeFamilyId] ?? []), pendingMessage],
    }))
    chatMutation.mutate({
      familyId: activeFamilyId,
      content,
      sender: `${selectedMember.identity} (${selectedMember.name})`,
    })
  }

  useEffect(() => {
    if (view === 'intro') {
      setShouldShowIntro(false)
      setIntroStep(0)
      // Sequence:
      // 0s: Start (Step 0: "Welcome")
      // 2.5s: Fade out Welcome, Fade in Assistant (Step 1)
      // 5s: End, go to dashboard

      const timer1 = setTimeout(() => setIntroStep(1), 2500)
      const timer2 = setTimeout(() => setView('dashboard'), 5000)

      return () => {
        clearTimeout(timer1)
        clearTimeout(timer2)
      }
    }
  }, [view])

  return (
    <div className="relative min-h-screen overflow-hidden bg-surface-50 text-stone-800 selection:bg-stone-200">
      <DecorativeBackground />
      <div className="relative z-10 flex min-h-screen flex-col">
        {view !== 'dashboard' && (
          <div className="fixed right-6 top-6 z-30">
            <LanguageSelector
              language={language}
              label={copy.languageSelectorLabel}
              onChange={setLanguage}
            />
          </div>
        )}
        {globalError && (
          <div className="mx-auto mt-6 w-[90%] max-w-2xl rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600 shadow-sm">
            {globalError}
          </div>
        )}
        <AnimatePresence>
          {isEditingFamily && selectedFamily && (
            <motion.div
              key="edit-family"
              className="fixed inset-0 z-20 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsEditingFamily(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                transition={{ duration: 0.2 }}
                onClick={(event) => event.stopPropagation()}
                className="w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl"
              >
                <div className="mb-6">
                  <p className="text-[10px] uppercase tracking-[0.3em] text-stone-400">{copy.modalEditTitle}</p>
                  <h3 className="mt-2 text-2xl font-display text-stone-900">{selectedFamily.name}</h3>
                </div>
                <div className="space-y-6">
                  <div>
                    <label className="text-[10px] uppercase tracking-[0.3em] text-stone-400">{copy.modalDescriptionLabel}</label>
                    <textarea
                      className="mt-2 w-full rounded-2xl border border-stone-200 bg-surface-50 px-4 py-3 text-sm text-stone-800 placeholder:text-stone-400 outline-none transition focus:border-stone-900"
                      rows={3}
                      placeholder={copy.familyDescriptionPlaceholder}
                      value={familyEditForm.description}
                      onChange={(event) =>
                        setFamilyEditForm((prev) => ({ ...prev, description: event.target.value }))
                      }
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase tracking-[0.3em] text-stone-400">{copy.modalStakeLabel}</label>
                    <input
                      type="number"
                      min={0}
                      className="mt-2 w-full rounded-2xl border border-stone-200 bg-surface-50 px-4 py-3 text-sm text-stone-800 placeholder:text-stone-400 outline-none transition focus:border-stone-900"
                      value={familyEditForm.task_price}
                      onChange={(event) => handleEditStakeChange(event.target.value)}
                    />
                    <p className="mt-2 flex items-center gap-2 text-xs text-stone-400">
                      <Info className="h-3.5 w-3.5" />
                      <span>{copy.modalStakeHint}</span>
                    </p>
                  </div>
                </div>
                <div className="mt-8 flex items-center justify-end gap-4 text-xs tracking-[0.2em] uppercase">
                  <button
                    type="button"
                    onClick={() => setIsEditingFamily(false)}
                    className="text-stone-400 hover:text-stone-900"
                  >
                    {copy.cancelButton}
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveFamilyDetails}
                    disabled={updateFamilyMutation.isPending}
                    className="rounded-full bg-stone-900 px-6 py-2 text-white hover:bg-stone-800 disabled:bg-stone-200"
                  >
                    {updateFamilyMutation.isPending ? copy.savingButton : copy.saveButton}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
        <AnimatePresence mode="wait">
          {view === 'landing' && (
            <motion.div
              key="landing"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20, filter: 'blur(5px)' }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="flex w-full flex-1 flex-col items-center px-6 py-12"
            >
              <div className="flex w-full max-w-4xl flex-1 flex-col items-center">
                <div className="mb-16 max-w-2xl text-center">
                  <div className="mb-8 inline-flex items-center gap-3 border-b border-stone-300 pb-1">
                    <span className="text-[10px] font-medium uppercase tracking-[0.3em] text-stone-500">
                      {copy.brandTagline}
                    </span>
                  </div>
                  <h1 className="font-display text-6xl font-normal tracking-tight text-stone-900 sm:text-8xl mb-6 italic">
                    {copy.heroTitleLine1} <br />
                    <span className="not-italic text-5xl sm:text-7xl text-stone-800">{copy.heroTitleLine2}</span>
                  </h1>
                  <p className="mt-8 mx-auto max-w-lg text-lg font-light leading-relaxed tracking-wide text-stone-600">
                    {copy.heroSubtitle}
                    <br />
                    <span className="mt-2 block text-sm uppercase tracking-widest text-stone-400">
                      {copy.heroSubtitleAccent}
                    </span>
                  </p>
                </div>

                <div className="w-full max-w-md bg-white/0 p-8">
                  <form className="space-y-8" onSubmit={handleCreateFamily}>
                    <div className="group relative">
                      <input
                        className="w-full border-b border-stone-300 bg-transparent px-0 py-4 text-xl text-stone-800 placeholder:text-stone-300 outline-none transition-all focus:border-stone-800 font-display"
                        placeholder={copy.familyNamePlaceholder}
                        value={familyForm.name}
                        onChange={(e) => setFamilyForm((prev) => ({ ...prev, name: e.target.value }))}
                      />
                    </div>
                    <div>
                      <textarea
                        className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-stone-800 placeholder:text-stone-400 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/10"
                        rows={2}
                        placeholder={copy.familyDescriptionPlaceholder}
                        value={familyForm.description}
                        onChange={(e) =>
                          setFamilyForm((prev) => ({ ...prev, description: e.target.value }))
                        }
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-800 placeholder:text-stone-400 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/10"
                        placeholder={copy.familyIdPlaceholder}
                        value={familyForm.family_id}
                        onChange={(e) =>
                          setFamilyForm((prev) => ({ ...prev, family_id: e.target.value }))
                        }
                      />
                      <input
                        type="number"
                        min={0}
                        className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-800 placeholder:text-stone-400 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/10"
                        placeholder={copy.familyStakePlaceholder}
                        value={familyForm.task_price}
                        onChange={(e) => handleTaskPriceChange(e.target.value)}
                      />
                    </div>
                    {formError ? <p className="text-sm text-rose-500">{formError}</p> : null}
                    <button
                      type="submit"
                      disabled={createFamilyMutation.isPending || !familyForm.name}
                      className="group relative w-full overflow-hidden bg-stone-900 px-8 py-4 text-white transition-all hover:bg-stone-800 disabled:bg-stone-300"
                    >
                      <div className="relative z-10 flex items-center justify-center gap-3">
                        {createFamilyMutation.isPending ? (
                          <Loader2 className="animate-spin" size={18} />
                        ) : (
                          <>
                            <span className="text-sm font-medium tracking-[0.2em] uppercase">{copy.createFamilyButton}</span>
                            <ArrowRight size={16} className="transition-transform duration-500 group-hover:translate-x-2" />
                          </>
                        )}
                      </div>
                    </button>
                  </form>
                </div>

                {families.length > 0 && (
                  <div className="mt-16 w-full max-w-4xl border-t border-stone-200 pt-12">
                    <p className="mb-8 text-center text-[10px] uppercase tracking-[0.3em] text-stone-400">
                      {copy.selectExistingFamily}
                    </p>
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3">
                      {families.map((family) => (
                        <button
                          key={family.family_id}
                          onClick={() => {
                            setSelectedFamilyId(family.family_id)
                            setShouldShowIntro(false)
                            setView('identity')
                          }}
                          className="group flex flex-col items-start gap-4 border border-transparent p-6 transition-all duration-500 hover:border-stone-200 hover:bg-white"
                        >
                          <div className="text-4xl font-display italic text-stone-300 transition-colors duration-500 group-hover:text-stone-800">
                            {family.name.slice(0, 1)}
                          </div>
                          <div className="w-full text-left">
                            <div className="mb-4 h-px w-8 bg-stone-300 transition-all duration-700 ease-out group-hover:w-full" />
                            <p className="text-lg font-display text-stone-800">{family.name}</p>
                            <p className="mt-1 text-[10px] uppercase tracking-wider text-stone-400">{family.family_id}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-auto flex w-full justify-center pb-8">
                <div className="flex items-center gap-12 text-[10px] font-medium uppercase tracking-[0.2em] text-stone-400">
                  <span className="flex items-center gap-2">
                    <div
                      className={clsx(
                        'h-1 w-1 rounded-full',
                        apiStatusIndicator.dotClass,
                      )}
                    />
                    {apiStatusIndicator.label}
                  </span>
                  <span>{copy.footerMembase}</span>
                  <span>{copy.footerChain}</span>
                </div>
              </div>
            </motion.div>
          )}

          {view === 'identity' && (
            <motion.div
              key="identity"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20, filter: 'blur(5px)' }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="relative flex w-full flex-1 flex-col items-center justify-center px-6"
            >
              <button
                type="button"
                onClick={() => {
                  setSelectedFamilyId(null)
                  setSelectedMember(null)
                  setView('landing')
                }}
                className="absolute left-6 top-6 flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-stone-400 transition-colors hover:text-stone-900"
              >
                <ChevronLeft className="h-4 w-4" />
                <span>{copy.backButtonLabel}</span>
              </button>
              <div className="mb-16 text-center">
                <span className="text-[10px] tracking-[0.3em] uppercase text-stone-400 font-medium block mb-4">{copy.identitySelectionLabel}</span>
                <h2 className="text-5xl font-display font-normal text-stone-900 italic mb-4">{copy.identitySelectionTitle}</h2>
                <div className="w-12 h-px bg-stone-300 mx-auto" />
              </div>

              <div className="grid w-full max-w-3xl grid-cols-2 gap-8 sm:grid-cols-4">
                {familyMembers.length > 0 ? (
                  familyMembers.map((member, index) => {
                    const isSelected =
                      selectedMember?.name === member.name &&
                      selectedMember?.identity === member.identity
                    return (
                      <div
                        key={`${member.name}-${member.identity}-${index}`}
                        role="button"
                        tabIndex={0}
                        onClick={() => setSelectedMember(member)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') setSelectedMember(member)
                        }}
                        className={clsx(
                          'group relative aspect-[3/4] flex flex-col items-center justify-center gap-4 transition-all duration-500 cursor-pointer',
                          isSelected ? 'bg-stone-100' : 'bg-transparent hover:bg-stone-50',
                        )}
                      >
                        <div
                          className={clsx(
                            'absolute inset-0 border border-stone-200 transition-all duration-500',
                            isSelected ? 'border-stone-800' : 'group-hover:border-stone-400',
                          )}
                        />
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation()
                            handleRemoveMember(member)
                          }}
                          className="absolute right-4 top-4 text-stone-300 hover:text-stone-900 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                        <span
                          className={clsx(
                            'text-4xl font-display italic transition-colors duration-500',
                            isSelected ? 'text-stone-900' : 'text-stone-300 group-hover:text-stone-600',
                          )}
                        >
                          {member.name.slice(0, 1) || '?'}
                        </span>
                        <div className="text-center space-y-1">
                          <p
                            className={clsx(
                              'text-base font-display transition-colors duration-500',
                              isSelected ? 'text-stone-900' : 'text-stone-500 group-hover:text-stone-700',
                            )}
                          >
                            {member.name}
                          </p>
                          <p
                            className={clsx(
                              'text-xs uppercase tracking-[0.2em] transition-colors duration-500',
                              isSelected ? 'text-stone-900' : 'text-stone-400 group-hover:text-stone-600',
                            )}
                          >
                            {member.identity}
                          </p>
                        </div>
                      </div>
                    )
                  })
                ) : (
                  <div className="col-span-2 sm:col-span-4 rounded-3xl border border-dashed border-stone-200 bg-white/30 p-8 text-center text-stone-400">
                    <p className="text-[10px] uppercase tracking-[0.3em]">{copy.noMembersTitle}</p>
                    <p className="mt-3 text-sm font-light text-stone-500">
                      {copy.noMembersSubtitle}
                    </p>
                  </div>
                )}

                {isAddingMember ? (
                  <div className="col-span-2 aspect-[3/2] border border-stone-200 bg-white p-8 flex flex-col justify-center gap-6 animate-in fade-in zoom-in-95 duration-500">
                    <div className="flex items-center justify-between border-b border-stone-100 pb-2">
                      <span className="text-[10px] uppercase tracking-[0.2em] text-stone-400">{copy.newMemberTitle}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setIsAddingMember(false)
                          setNewMemberName('')
                          setNewMemberIdentity('')
                        }}
                        className="text-stone-400 hover:text-stone-800 transition-colors"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="flex flex-col gap-4">
                      <input
                        type="text"
                        value={newMemberName}
                        onChange={(event) => setNewMemberName(event.target.value)}
                        placeholder={copy.newMemberNamePlaceholder}
                        className="w-full border-b border-stone-200 py-2 text-xl font-display italic text-stone-800 placeholder:text-stone-300 outline-none focus:border-stone-800 transition-colors bg-transparent"
                        autoFocus
                      />
                      <input
                        type="text"
                        value={newMemberIdentity}
                        onChange={(event) => setNewMemberIdentity(event.target.value)}
                        placeholder={copy.newMemberIdentityPlaceholder}
                        className="w-full border-b border-stone-200 py-2 text-xl font-display italic text-stone-800 placeholder:text-stone-300 outline-none focus:border-stone-800 transition-colors bg-transparent"
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') handleAddMember()
                        }}
                      />
                      <button
                        type="button"
                        onClick={handleAddMember}
                        disabled={!newMemberName.trim() || !newMemberIdentity.trim()}
                        className="self-end text-[10px] uppercase tracking-[0.2em] text-stone-900 hover:text-stone-500 disabled:text-stone-300 transition-colors"
                      >
                        {copy.confirmLabel}
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsAddingMember(true)}
                    className="col-span-2 aspect-[3/2] border border-dashed border-stone-200 text-stone-300 hover:border-stone-400 hover:text-stone-500 hover:bg-stone-50 transition-all duration-500 flex flex-col items-center justify-center gap-4 group"
                  >
                    <Plus className="h-6 w-6 opacity-50 group-hover:opacity-100 transition-opacity" />
                    <span className="text-[10px] uppercase tracking-[0.2em]">{copy.addMemberButton}</span>
                  </button>
                )}
              </div>

              <div className="mt-16 flex justify-center">
                <button
                  onClick={() => setView(shouldShowIntro ? 'intro' : 'dashboard')}
                  disabled={!selectedMember}
                  className={`group relative flex items-center gap-4 px-12 py-4 transition-all duration-500
                    ${!selectedMember 
                      ? 'opacity-0 pointer-events-none' 
                      : 'opacity-100'
                    }`}
                >
                  <span className="text-xs font-medium tracking-[0.3em] uppercase text-stone-900 group-hover:text-stone-600 transition-colors">{copy.enterFamilyButton}</span>
                  <ArrowRight className="w-4 h-4 text-stone-900 group-hover:translate-x-2 transition-transform duration-500" />
                  <div className="absolute bottom-0 left-0 w-full h-px bg-stone-900 scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left" />
                </button>
              </div>
            </motion.div>
          )}

          {view === 'intro' && (
            <motion.div
              key="intro"
              className="flex h-screen flex-col items-center justify-center bg-surface-50 text-stone-900 relative overflow-hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.2, ease: "easeInOut" }}
            >
              <AnimatePresence mode="wait">
                {introStep === 0 && (
                  <motion.div
                    key="step0"
                    initial={{ opacity: 0, y: 20, filter: 'blur(10px)' }}
                    animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                    exit={{ opacity: 0, y: -20, filter: 'blur(10px)' }}
                    transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
                    className="text-center z-10 px-4"
                  >
                    <h1 className="text-6xl font-display font-normal tracking-tight md:text-8xl text-stone-900 italic">
                      {copy.introWelcome}
                    </h1>
                  </motion.div>
                )}
                {introStep === 1 && (
                  <motion.div
                    key="step1"
                    initial={{ opacity: 0, scale: 0.95, filter: 'blur(10px)' }}
                    animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                    exit={{ opacity: 0, scale: 1.05, filter: 'blur(10px)' }}
                    transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
                    className="text-center z-10 px-4"
                  >
                    <h2 className="text-xl font-sans font-light tracking-[0.4em] uppercase md:text-2xl text-stone-600">
                      {copy.introTagline}
                    </h2>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}          {view === 'dashboard' && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="flex h-screen flex-col bg-surface-50"
            >
              <header className="relative flex items-center justify-between px-8 py-6 bg-surface-50 border-b border-stone-200">
                <div className="flex items-center gap-6">
                  <button
                    onClick={() => setView('landing')}
                    className="text-stone-400 hover:text-stone-900 transition-colors"
                  >
                    <ChevronLeft size={20} strokeWidth={1.5} />
                  </button>
                  <div>
                    <h2 className="text-2xl font-display italic text-stone-900">
                      {selectedFamily?.name}
                    </h2>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-stone-400 mt-1">
                      ID: {selectedFamily?.family_id} {copy.dashIdSuffix}
                    </p>
                  </div>
                </div>

                {/* View Toggle */}
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex gap-8">
                  <button
                    onClick={() => setDashboardView('chat')}
                    className={`text-xs uppercase tracking-[0.2em] transition-colors ${
                      dashboardView === 'chat' ? 'text-stone-900 font-medium' : 'text-stone-400 hover:text-stone-600'
                    }`}
                  >
                    {copy.conversationTabLabel}
                  </button>
                  <button
                    onClick={() => setDashboardView('files')}
                    className={`text-xs uppercase tracking-[0.2em] transition-colors ${
                      dashboardView === 'files' ? 'text-stone-900 font-medium' : 'text-stone-400 hover:text-stone-600'
                    }`}
                  >
                    {copy.fileManagementTabLabel}
                  </button>
                </div>

                <div className="flex items-center gap-4">
                  <LanguageSelector
                    language={language}
                    label={copy.languageSelectorLabel}
                    onChange={setLanguage}
                  />
                  <div className="hidden items-center gap-3 text-xs tracking-widest uppercase text-stone-500 sm:flex">
                    <span className="w-2 h-2 rounded-full bg-stone-300" />
                    <span>
                      {copy.identityLabelPrefix} {selectedMember ? senderLabel : copy.identityUnsetLabel}
                    </span>
                    <button
                      onClick={() => setView('identity')}
                      className="text-stone-900 border-b border-stone-300 hover:border-stone-900 transition-colors pb-0.5"
                    >
                      {copy.switchLabel}
                    </button>
                  </div>
                  <button
                    onClick={() =>
                      activeFamilyId &&
                      queryClient.invalidateQueries({ queryKey: ['memory', activeFamilyId] })
                    }
                    className="text-stone-400 hover:text-stone-900 transition-colors"
                    title={copy.refreshTooltip}
                  >
                    <RefreshCcw size={18} strokeWidth={1.5} />
                  </button>
                </div>
              </header>

              <main className="flex flex-1 overflow-hidden">
                {dashboardView === 'chat' ? (
                  <>
                    {/* Chat Area */}
                    <div className="flex flex-1 flex-col border-r border-stone-200 bg-surface-50">
                      <div className="flex-1 overflow-y-auto p-8">
                        {currentChat.length === 0 ? (
                          <div className="flex h-full flex-col items-center justify-center text-stone-300">
                            <Bot size={32} strokeWidth={1} className="mb-6 opacity-50" />
                            <p className="font-display italic text-2xl text-stone-400">
                              {interpolate(copy.chatEmptyState, {
                                family: selectedFamily?.name ?? copy.brandTagline,
                              })}
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-12 max-w-3xl mx-auto">
                            {currentChat.map((msg) => (
                              <div
                                key={msg.id}
                                className={clsx(
                                  'flex gap-6',
                                  msg.role === 'user' ? 'flex-row-reverse' : 'flex-row',
                                )}
                              >
                                <div
                                  className={clsx(
                                    'flex h-8 w-8 shrink-0 items-center justify-center text-xs font-medium tracking-widest uppercase',
                                    msg.role === 'user'
                                      ? 'text-stone-900 border border-stone-900'
                                      : 'text-stone-400 border border-stone-300',
                                  )}
                                >
                                  {msg.role === 'user' ? copy.chatUserBadge : copy.chatAIBadge}
                                </div>
                                <div
                                  className={clsx(
                                    'max-w-[80%] text-base leading-relaxed font-light tracking-wide',
                                    msg.role === 'user'
                                      ? 'text-stone-900 text-right'
                                      : 'text-stone-600',
                                  )}
                                >
                                  {msg.content}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="border-t border-stone-200 bg-surface-50 p-8">
                        <div className="mx-auto max-w-3xl space-y-4">
                          <div className="relative group">
                            <input
                              className="w-full border-b border-stone-300 bg-transparent px-0 py-4 pr-12 text-lg text-stone-800 placeholder:text-stone-300 outline-none transition-all focus:border-stone-800 font-display italic"
                              placeholder={interpolate(copy.chatPlaceholder, {
                                sender: senderLabel || copy.guestLabel,
                              })}
                              value={chatDraft}
                              onChange={(e) => setChatDraft(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                  e.preventDefault()
                                  handleSendMessage()
                                }
                              }}
                            />
                            <button
                              onClick={handleSendMessage}
                              disabled={
                                chatMutation.isPending || !chatDraft.trim() || !selectedMember
                              }
                              className="absolute right-0 top-4 text-stone-900 hover:text-stone-600 disabled:text-stone-300 transition-colors"
                            >
                              {chatMutation.isPending ? (
                                <Loader2 className="animate-spin" size={20} />
                              ) : (
                                <ArrowRight size={20} strokeWidth={1.5} />
                              )}
                            </button>
                          </div>
                          {chatError && <p className="text-xs text-rose-500 font-light tracking-wide">{chatError}</p>}
                        </div>
                      </div>
                    </div>

                    {/* Memory Sidebar */}
                    <div className="w-96 overflow-y-auto border-l border-stone-200 bg-surface-50 p-8">
                      <div className="mb-8 flex items-center gap-3 border-b border-stone-200 pb-4">
                        <span className="text-[10px] font-medium uppercase tracking-[0.3em] text-stone-400">{copy.memoryHeading}</span>
                      </div>

                      <div className="space-y-12">
                        {/* Context */}
                        {currentContext && (
                          <div>
                            <div className="mb-4 flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-stone-500">
                              <span className="w-1.5 h-1.5 rounded-full bg-stone-400" />
                              <span>{copy.activeContextLabel}</span>
                            </div>
                            <p className="text-sm leading-relaxed text-stone-600 font-light italic border-l-2 border-stone-200 pl-4">
                              "{currentContext}"
                            </p>
                          </div>
                        )}

                        {/* Snapshots */}
                        {(['stm', 'ltm', 'profile'] as const).map((key) => (
                          <div key={key}>
                            <p className="mb-4 text-[10px] uppercase tracking-[0.2em] text-stone-400">
                              {key === 'stm' && copy.shortTermHeading}
                              {key === 'ltm' && copy.longTermHeading}
                              {key === 'profile' && copy.profileHeading}
                            </p>
                            <div className="space-y-4">
                              {currentMemory?.[key]?.length ? (
                                currentMemory[key].map((item: string, i: number) => (
                                  <div
                                    key={i}
                                    className="border-b border-stone-100 pb-3 text-sm font-light text-stone-600 leading-relaxed"
                                  >
                                    {item}
                                  </div>
                                ))
                              ) : (
                                <div className="text-[10px] uppercase tracking-widest text-stone-300 italic">
                                  {copy.emptyMemoryLabel}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 overflow-y-auto p-12 bg-surface-50">
                    <div className="max-w-3xl mx-auto space-y-12">
                      <div className="border-b border-stone-200 pb-8">
                        <h3 className="text-3xl font-display italic text-stone-900 mb-2">Family Settings</h3>
                        <p className="text-stone-500 font-light">Manage your family profile and data.</p>
                      </div>

                      {/* Family Details */}
                      <div className="space-y-8">
                         <div className="grid grid-cols-2 gap-8">
                            <div>
                                <label className="block text-[10px] uppercase tracking-widest text-stone-400 mb-2">Family Name</label>
                                <p className="text-xl font-display text-stone-800">{selectedFamily?.name}</p>
                            </div>
                            <div>
                                <label className="block text-[10px] uppercase tracking-widest text-stone-400 mb-2">Family ID</label>
                                <p className="text-xl font-display text-stone-800">{selectedFamily?.family_id}</p>
                            </div>
                         </div>
                         <div>
                            <label className="block text-[10px] uppercase tracking-widest text-stone-400 mb-2">Description</label>
                            <p className="text-stone-600 font-light leading-relaxed">{selectedFamily?.description || 'No description provided.'}</p>
                         </div>
                         
                         <div className="flex gap-4 pt-4">
                            <button
                                onClick={() => setIsEditingFamily(true)}
                                className="flex items-center gap-2 px-6 py-3 border border-stone-200 text-stone-600 hover:border-stone-900 hover:text-stone-900 transition-colors uppercase tracking-widest text-xs"
                            >
                                <Settings size={16} /> Edit Details
                            </button>
                         </div>
                      </div>

                      {/* Danger Zone */}
                      <div className="pt-12 border-t border-stone-200">
                        <h4 className="text-rose-500 uppercase tracking-widest text-xs mb-6">Danger Zone</h4>
                        <div className="bg-rose-50/50 border border-rose-100 p-8 flex items-center justify-between">
                            <div>
                                <h5 className="text-stone-900 font-medium mb-1">Delete Family</h5>
                                <p className="text-stone-500 text-sm font-light">Permanently remove this family and all associated data.</p>
                            </div>
                            <button
                                onClick={handleDeleteFamily}
                                disabled={deleteFamilyMutation.isPending}
                                className="flex items-center gap-2 px-6 py-3 bg-white border border-rose-200 text-rose-500 hover:bg-rose-50 hover:border-rose-300 transition-colors uppercase tracking-widest text-xs"
                            >
                                {deleteFamilyMutation.isPending ? <Loader2 className="animate-spin" size={16} /> : <Trash2 size={16} />}
                                Delete Family
                            </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </main>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

export default App
