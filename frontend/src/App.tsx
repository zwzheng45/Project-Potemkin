import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ComponentPropsWithoutRef, FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import clsx from 'clsx'
import { AnimatePresence, motion } from 'framer-motion'
import ReactMarkdown, { type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import 'katex/dist/katex.min.css'
import {
  ArrowRight,
  Bot,
  ChevronLeft,
  Copy,
  Check,
  ImagePlus,
  Loader2,
  Plus,
  RefreshCcw,
  Trash2,
  UserPen,
  X,
} from 'lucide-react'

import { api } from './lib/api'
import type {
  AuthResponse,
  ChatMessage,
  ChatResponse,
  MemorySnapshot,
  FamilyMember,
  Family,
  HealthStatus,
  AcceptInvitePayload,
  InviteInfo,
  InviteLinkResponse,
  InviteMemberPayload,
  LoginPayload,
  TimelineEvent,
  ProfileResponse,
  SignupPayload,
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
  authSignupTab: string
  authLoginTab: string
  signupButton: string
  loginButton: string
  signupDescription: string
  familyIdAutoHint: string
  stakeUsageHint: string
  loginDescription: string
  inviteSignupTitle: string
  inviteSignupDescription: string
  acceptInviteButton: string
  inviteInvalid: string
  ownerNamePlaceholder: string
  ownerEmailPlaceholder: string
  ownerPasswordPlaceholder: string
  ownerFieldsRequired: string
  loginFieldsRequired: string
  authRequired: string
  identitySelectionLabel: string
  identitySelectionTitle: string
  noMembersTitle: string
  noMembersSubtitle: string
  newMemberTitle: string
  newMemberNamePlaceholder: string
  newMemberIdentityPlaceholder: string
  newMemberEmailPlaceholder: string
  newMemberPasswordPlaceholder: string
  confirmLabel: string
  addMemberButton: string
  ownerOnlyInviteHint: string
  logoutLabel: string
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
  inviteLinkReady: string
  inviteLinkHint: string
  inviteLinkCopy: string
  inviteLinkCopied: string
  dashIdSuffix: string
  idReminderTitle: string
  idReminderDescription: string
  idReminderMemoHint: string
  idReminderCopy: string
  idReminderCopied: string
  idReminderDismiss: string
  chatEmptyState: string
  chatPlaceholder: string
  guestLabel: string
  chatUserBadge: string
  chatAIBadge: string
  memoryHeading: string
  memorySubheading: string
  activeContextLabel: string
  shortTermHeading: string
  longTermHeading: string
  importantEventsHeading: string
  privateHeading: string
  publicHeading: string
  profileHeading: string
  profileEditButton: string
  profileEditTitle: string
  profileNameLabel: string
  profileNameRequired: string
  profileBioLabel: string
  profileBioPlaceholder: string
  profileAvatarLabel: string
  profileAvatarHint: string
  profileAvatarUpload: string
  profileAvatarRemove: string
  userShortTermHeading: string
  memberRoleOwner: string
  memberRoleMember: string
  emptyMemoryLabel: string
  apiConnected: string
  apiConnecting: string
  apiFailed: string
  identityUnsetLabel: string
  conversationTabLabel: string
  fileManagementTabLabel: string
}

type MemoryEntry = string | TimelineEvent

type StreamingState = {
  id: string
  familyId: string
  fullText: string
  cursor: number
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
    authSignupTab: 'Sign up',
    authLoginTab: 'Log in',
    signupButton: 'Create & sign up',
    loginButton: 'Log in',
    signupDescription: 'Create a family and owner account in one step.',
    familyIdAutoHint: 'Family ID is generated automatically right after creation.',
    stakeUsageHint:
      'Set or top up the stake later from the dashboard according to how you plan to use the companion.',
    loginDescription: 'Log in with your family companion account.',
    inviteSignupTitle: 'Join this family',
    inviteSignupDescription: 'You were invited to join {family}. Confirm your details to continue.',
    acceptInviteButton: 'Join family',
    inviteInvalid: 'This invitation link is invalid or has expired.',
    ownerNamePlaceholder: 'Your name...',
    ownerEmailPlaceholder: 'Email...',
    ownerPasswordPlaceholder: 'Password...',
    familyNameRequired: 'Please enter a family name',
    ownerFieldsRequired: 'Name, email, and password are required',
    loginFieldsRequired: 'Email and password are required',
    authRequired: 'Please sign in to chat',
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
    newMemberEmailPlaceholder: 'Email...',
    newMemberPasswordPlaceholder: 'Password...',
    confirmLabel: 'Confirm',
    addMemberButton: 'Add Member',
    ownerOnlyInviteHint: 'Only the owner can invite new members',
    logoutLabel: 'Sign out',
    enterFamilyButton: 'Enter Family',
    introWelcome: 'Welcome',
    introTagline: 'Your Family Companion',
    modalEditTitle: 'Edit Family',
    modalDescriptionLabel: 'Description',
    modalStakeLabel: 'Stake (BNB)',
    modalStakeHint:
      'Use a non-negative amount that matches how you plan to use the companion; saving syncs it to on-chain metadata.',
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
    inviteLinkReady: 'Invite link created',
    inviteLinkHint: 'Share this link so the invitee can sign up and join your family.',
    inviteLinkCopy: 'Copy link',
    inviteLinkCopied: 'Copied!',
    dashIdSuffix: '· On Chain',
  idReminderTitle: 'Save your Family ID',
  idReminderDescription: 'We generated a unique ID for your family. You will need it to recover this account.',
  idReminderMemoHint: 'Add it to your notes or password manager now so you can always find it.',
  idReminderCopy: 'Copy ID',
  idReminderCopied: 'Copied',
  idReminderDismiss: 'I saved it',
    chatEmptyState: 'Start conversation with {family}',
    chatPlaceholder: 'Message as {sender}...',
    guestLabel: 'Guest',
    chatUserBadge: 'ME',
    chatAIBadge: 'AI',
    memoryHeading: 'Memory State',
    memorySubheading: "View and manage the agent's memory and context.",
    activeContextLabel: 'Active Context',
    shortTermHeading: 'Short-term Memory',
    longTermHeading: 'Long-term Memory',
    importantEventsHeading: 'Important Events',
    privateHeading: 'Private (You Only)',
    publicHeading: 'Public (3rd-Party OK)',
    profileHeading: 'Family Profile',
    profileEditButton: 'Edit profile',
    profileEditTitle: 'Personal profile',
    profileNameLabel: 'Display name',
  profileNameRequired: 'Please enter your display name',
  profileBioLabel: 'Bio / tagline',
  profileBioPlaceholder: 'Add a short line about yourself...',
  profileAvatarLabel: 'Avatar',
  profileAvatarHint: 'Square images look best. We automatically apply a soft rounded rectangle mask.',
  profileAvatarUpload: 'Upload image',
  profileAvatarRemove: 'Remove',
    userShortTermHeading: 'Your Recent Memory',
    memberRoleOwner: 'Owner',
    memberRoleMember: 'Member',
    emptyMemoryLabel: 'Empty',
    apiConnected: 'API Connected',
    apiConnecting: 'API Connecting...',
    apiFailed: 'API Failed to Fetch',
    identityUnsetLabel: 'Unset',
    conversationTabLabel: 'Conversation',
    fileManagementTabLabel: 'Memory',
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
    authSignupTab: '注册',
    authLoginTab: '登录',
    signupButton: '创建并注册',
    loginButton: '登录',
    signupDescription: '一步创建家庭与拥有者账号。',
  familyIdAutoHint: '家庭 ID 会在创建完成后自动生成。',
  stakeUsageHint: '质押金额可在进入控制台后根据实际使用方式再设置或补充。',
    loginDescription: '使用家庭成员邮箱登录。',
    inviteSignupTitle: '加入这个家庭',
    inviteSignupDescription: '你被邀请加入 {family}，确认信息后设置密码即可。',
    acceptInviteButton: '加入家庭',
    inviteInvalid: '邀请链接无效或已过期。',
    ownerNamePlaceholder: '你的姓名...',
    ownerEmailPlaceholder: '邮箱...',
    ownerPasswordPlaceholder: '密码...',
    familyNameRequired: '请填写家庭名称',
    ownerFieldsRequired: '姓名、邮箱和密码必填',
    loginFieldsRequired: '邮箱和密码必填',
    authRequired: '请先登录再聊天',
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
    newMemberEmailPlaceholder: '邮箱...',
    newMemberPasswordPlaceholder: '密码...',
    confirmLabel: '确认',
    addMemberButton: '添加成员',
    ownerOnlyInviteHint: '仅家庭拥有者可邀请新成员',
    logoutLabel: '退出登录',
    enterFamilyButton: '进入家庭',
    introWelcome: '欢迎',
    introTagline: '你的家庭伙伴',
    modalEditTitle: '编辑家庭',
    modalDescriptionLabel: '简介',
    modalStakeLabel: '质押金额（BNB）',
  modalStakeHint: '需为非负数，可根据具体使用方式调整，保存后会同步到链上元数据。',
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
    inviteLinkReady: '邀请链接已生成',
    inviteLinkHint: '把链接分享给被邀请人，让 TA 自助注册并加入家庭。',
    inviteLinkCopy: '复制链接',
    inviteLinkCopied: '已复制',
    dashIdSuffix: '· 已上链',
  idReminderTitle: '请保存你的家庭 ID',
  idReminderDescription: '我们已为你的家庭生成唯一 ID，找回账号时需要它。',
  idReminderMemoHint: '现在就把它记到备忘录或密码本里，随时可以查到。',
  idReminderCopy: '复制 ID',
  idReminderCopied: '已复制',
  idReminderDismiss: '我已保存',
    chatEmptyState: '开始与 {family} 对话',
    chatPlaceholder: '以 {sender} 的身份发送消息...',
    guestLabel: '访客',
    chatUserBadge: '我',
    chatAIBadge: '助理',
    memoryHeading: '记忆概览',
    memorySubheading: '查看和管理智能体的记忆与上下文。',
    activeContextLabel: '当前上下文',
    shortTermHeading: '短期记忆',
    longTermHeading: '长期记忆',
    importantEventsHeading: '重要事件',
    privateHeading: '私密记忆',
    publicHeading: '公开记忆',
    profileHeading: '家庭画像',
    profileEditButton: '编辑个人档案',
    profileEditTitle: '个人资料',
    profileNameLabel: '显示名称',
  profileNameRequired: '请填写你的显示名称',
  profileBioLabel: '个性签名',
  profileBioPlaceholder: '写一句介绍自己的话……',
  profileAvatarLabel: '头像',
  profileAvatarHint: '建议上传方形图片，我们会自动套用大弧度圆角效果。',
  profileAvatarUpload: '上传图片',
  profileAvatarRemove: '移除',
    userShortTermHeading: '你的近期记忆',
    memberRoleOwner: '拥有者',
    memberRoleMember: '成员',
    emptyMemoryLabel: '暂无',
    apiConnected: 'API 已连接',
    apiConnecting: 'API 连接中...',
    apiFailed: 'API 连接失败',
    identityUnsetLabel: '未设置',
    conversationTabLabel: '对话',
    fileManagementTabLabel: '记忆',
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
    authSignupTab: "Inscription",
    authLoginTab: "Connexion",
    signupButton: "Créer et s'inscrire",
    loginButton: 'Se connecter',
    signupDescription: 'Créez la famille et le compte propriétaire en une fois.',
  familyIdAutoHint: "L'ID familial est généré automatiquement après la création.",
  stakeUsageHint: 'Vous pourrez définir ou recharger la mise plus tard selon votre usage dans le tableau de bord.',
    loginDescription: 'Connectez-vous avec votre compte du compagnon familial.',
    inviteSignupTitle: 'Rejoindre cette famille',
    inviteSignupDescription: 'Vous êtes invité à rejoindre {family}. Confirmez vos informations pour continuer.',
    acceptInviteButton: 'Rejoindre la famille',
    inviteInvalid: "Lien d'invitation invalide ou expiré.",
    ownerNamePlaceholder: 'Votre nom...',
    ownerEmailPlaceholder: 'Email...',
    ownerPasswordPlaceholder: 'Mot de passe...',
    familyNameRequired: 'Veuillez saisir un nom de famille',
    ownerFieldsRequired: 'Nom, email et mot de passe requis',
    loginFieldsRequired: 'Email et mot de passe sont requis',
    authRequired: 'Veuillez vous connecter pour discuter',
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
    newMemberEmailPlaceholder: 'Email...',
    newMemberPasswordPlaceholder: 'Mot de passe...',
    confirmLabel: 'Confirmer',
    addMemberButton: 'Ajouter un membre',
    ownerOnlyInviteHint: 'Seul le propriétaire peut inviter de nouveaux membres',
    logoutLabel: 'Se déconnecter',
    enterFamilyButton: 'Entrer dans la famille',
    introWelcome: 'Bienvenue',
    introTagline: 'Votre compagnon familial',
    modalEditTitle: 'Modifier la famille',
    modalDescriptionLabel: 'Description',
    modalStakeLabel: 'Mise (BNB)',
    modalStakeHint:
      'Doit être positive ou nulle. Ajustez-la selon votre usage ; elle sera synchronisée on-chain lors de l’enregistrement.',
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
    inviteLinkReady: "Lien d'invitation créé",
    inviteLinkHint: "Partagez ce lien pour permettre l'inscription et l'arrivée dans votre famille.",
    inviteLinkCopy: 'Copier le lien',
    inviteLinkCopied: 'Copié !',
    dashIdSuffix: '· On-chain',
  idReminderTitle: 'Enregistrez votre ID familial',
  idReminderDescription: 'Nous venons de créer un ID unique pour votre famille. Il sera requis pour récupérer le compte.',
  idReminderMemoHint: 'Notez-le dans vos notes ou votre gestionnaire de mots de passe pour le retrouver à tout moment.',
  idReminderCopy: "Copier l'ID",
  idReminderCopied: 'Copié',
  idReminderDismiss: 'Je l’ai enregistré',
    chatEmptyState: 'Commencez à discuter avec {family}',
    chatPlaceholder: 'Message en tant que {sender}...',
    guestLabel: 'Invité',
    chatUserBadge: 'MOI',
    chatAIBadge: 'IA',
    memoryHeading: 'État de la mémoire',
    memorySubheading: "Voir et gérer la mémoire et le contexte de l'agent.",
    activeContextLabel: 'Contexte actif',
    shortTermHeading: 'Mémoire court terme',
    longTermHeading: 'Mémoire long terme',
    importantEventsHeading: 'Événements importants',
    privateHeading: 'Mémoire privée',
    publicHeading: 'Mémoire publique',
    profileHeading: 'Profil familial',
    profileEditButton: 'Modifier le profil',
    profileEditTitle: 'Profil personnel',
    profileNameLabel: 'Nom affiché',
  profileNameRequired: 'Veuillez saisir votre nom affiché',
  profileBioLabel: 'Bio / slogan',
  profileBioPlaceholder: 'Ajoutez une courte description…',
  profileAvatarLabel: 'Avatar',
  profileAvatarHint: "Une image carrée rend mieux. Nous appliquons automatiquement un large arrondi.",
  profileAvatarUpload: 'Téléverser',
  profileAvatarRemove: 'Retirer',
    userShortTermHeading: 'Votre mémoire récente',
    memberRoleOwner: 'Propriétaire',
    memberRoleMember: 'Membre',
    emptyMemoryLabel: 'Vide',
    apiConnected: 'API connectée',
    apiConnecting: 'API en connexion...',
    apiFailed: 'API indisponible',
    identityUnsetLabel: 'Non défini',
    conversationTabLabel: 'Conversation',
    fileManagementTabLabel: 'Mémoire',
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
    authSignupTab: 'Registrieren',
    authLoginTab: 'Anmelden',
    signupButton: 'Erstellen & registrieren',
    loginButton: 'Anmelden',
    signupDescription: 'Familie und Besitzeraccount in einem Schritt.',
  familyIdAutoHint: 'Die Familien-ID wird direkt nach der Erstellung automatisch vergeben.',
  stakeUsageHint: 'Du kannst den Stake später im Dashboard entsprechend deiner Nutzung festlegen oder aufladen.',
    loginDescription: 'Mit deinem Familien-Account anmelden.',
    inviteSignupTitle: 'Dieser Familie beitreten',
    inviteSignupDescription: 'Du wurdest eingeladen, {family} beizutreten. Bestätige deine Daten, um fortzufahren.',
    acceptInviteButton: 'Familie beitreten',
    inviteInvalid: 'Dieser Einladungslink ist ungültig oder abgelaufen.',
    ownerNamePlaceholder: 'Dein Name...',
    ownerEmailPlaceholder: 'E-Mail...',
    ownerPasswordPlaceholder: 'Passwort...',
    familyNameRequired: 'Bitte einen Familiennamen eingeben',
    ownerFieldsRequired: 'Name, E-Mail und Passwort sind erforderlich',
    loginFieldsRequired: 'E-Mail und Passwort sind erforderlich',
    authRequired: 'Bitte melde dich an, um zu chatten',
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
    newMemberEmailPlaceholder: 'E-Mail...',
    newMemberPasswordPlaceholder: 'Passwort...',
    confirmLabel: 'Bestätigen',
    addMemberButton: 'Mitglied hinzufügen',
    ownerOnlyInviteHint: 'Nur der Owner kann neue Mitglieder einladen',
    logoutLabel: 'Abmelden',
    enterFamilyButton: 'Familie betreten',
    introWelcome: 'Willkommen',
    introTagline: 'Ihr Familienbegleiter',
    modalEditTitle: 'Familie bearbeiten',
    modalDescriptionLabel: 'Beschreibung',
    modalStakeLabel: 'Stake (BNB)',
    modalStakeHint:
      'Muss nicht negativ sein. Passe den Betrag an deine Nutzung an; beim Speichern wird er on-chain synchronisiert.',
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
    inviteLinkReady: 'Einladungslink erstellt',
    inviteLinkHint: 'Teile den Link, damit die eingeladene Person sich registrieren und beitreten kann.',
    inviteLinkCopy: 'Link kopieren',
    inviteLinkCopied: 'Kopiert!',
    dashIdSuffix: '· On-chain',
  idReminderTitle: 'Speichere deine Familien-ID',
  idReminderDescription: 'Wir haben eine eindeutige ID generiert. Du brauchst sie, um dieses Konto wiederherzustellen.',
  idReminderMemoHint: 'Notiere sie jetzt in deinen Notizen oder Passwortmanager, damit du sie jederzeit findest.',
  idReminderCopy: 'ID kopieren',
  idReminderCopied: 'Kopiert',
  idReminderDismiss: 'Ich habe sie gespeichert',
    chatEmptyState: 'Beginnen Sie ein Gespräch mit {family}',
    chatPlaceholder: 'Nachricht als {sender}...',
    guestLabel: 'Gast',
    chatUserBadge: 'ICH',
    chatAIBadge: 'KI',
    memoryHeading: 'Speicherstatus',
    memorySubheading: 'Anzeigen und Verwalten des Gedächtnisses und Kontexts des Agenten.',
    activeContextLabel: 'Aktiver Kontext',
    shortTermHeading: 'Kurzzeitgedächtnis',
    longTermHeading: 'Langzeitgedächtnis',
    importantEventsHeading: 'Wichtige Ereignisse',
    privateHeading: 'Private Erinnerungen',
    publicHeading: 'Öffentliche Erinnerungen',
    profileHeading: 'Familienprofil',
    profileEditButton: 'Profil bearbeiten',
    profileEditTitle: 'Persönliches Profil',
    profileNameLabel: 'Anzeigename',
  profileNameRequired: 'Bitte gib deinen Anzeigenamen ein',
  profileBioLabel: 'Bio / Motto',
  profileBioPlaceholder: 'Schreibe einen kurzen Satz über dich…',
  profileAvatarLabel: 'Avatar',
  profileAvatarHint: 'Quadratische Bilder wirken am besten. Wir legen automatisch eine weich abgerundete Form darüber.',
  profileAvatarUpload: 'Bild hochladen',
  profileAvatarRemove: 'Entfernen',
    userShortTermHeading: 'Deine letzten Gespräche',
    memberRoleOwner: 'Owner',
    memberRoleMember: 'Mitglied',
    emptyMemoryLabel: 'Leer',
    apiConnected: 'API verbunden',
    apiConnecting: 'API verbindet...',
    apiFailed: 'API-Verbindung fehlgeschlagen',
    identityUnsetLabel: 'Nicht gesetzt',
    conversationTabLabel: 'Konversation',
    fileManagementTabLabel: 'Speicher',
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
    authSignupTab: '登録',
    authLoginTab: 'ログイン',
    signupButton: '作成して登録',
    loginButton: 'ログイン',
    signupDescription: '家族とオーナーアカウントを一度に作成。',
  familyIdAutoHint: '家族 ID は作成完了後に自動で付与されます。',
  stakeUsageHint: 'ステークはダッシュボードから、実際の利用状況に合わせて後から設定・チャージできます。',
    loginDescription: '家族のアカウントでログイン。',
    inviteSignupTitle: 'この家族に参加',
    inviteSignupDescription: '{family} への招待を受け取りました。情報を確認して続行してください。',
    acceptInviteButton: '家族に参加',
    inviteInvalid: 'この招待リンクは無効か期限切れです。',
    ownerNamePlaceholder: 'あなたの名前...',
    ownerEmailPlaceholder: 'メール...',
    ownerPasswordPlaceholder: 'パスワード...',
    familyNameRequired: '家族名を入力してください',
    ownerFieldsRequired: '名前・メール・パスワードは必須',
    loginFieldsRequired: 'メールとパスワードは必須です',
    authRequired: 'チャットするにはログインしてください',
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
    newMemberEmailPlaceholder: 'メール...',
    newMemberPasswordPlaceholder: 'パスワード...',
    confirmLabel: '確定',
    addMemberButton: 'メンバーを追加',
    ownerOnlyInviteHint: '招待はオーナーのみが行えます',
    logoutLabel: 'ログアウト',
    enterFamilyButton: '家族に入る',
    introWelcome: 'ようこそ',
    introTagline: 'あなたの家族コンパニオン',
    modalEditTitle: '家族を編集',
    modalDescriptionLabel: '概要',
    modalStakeLabel: 'ステーク（BNB）',
  modalStakeHint: '0 以上で、利用状況に合わせて調整できます。保存するとオンチェーン情報と同期されます。',
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
    inviteLinkReady: '招待リンクを作成しました',
    inviteLinkHint: 'リンクを共有して、招待された人が登録・参加できるようにします。',
    inviteLinkCopy: 'リンクをコピー',
    inviteLinkCopied: 'コピーしました',
    dashIdSuffix: '· オンチェーン',
  idReminderTitle: '家族 ID を保存してください',
  idReminderDescription: '家族専用の ID を発行しました。アカウント復旧時に必要になります。',
  idReminderMemoHint: 'すぐにメモ帳やパスワード管理アプリに記録して、いつでも確認できるようにしてください。',
  idReminderCopy: 'ID をコピー',
  idReminderCopied: 'コピー済み',
  idReminderDismiss: '保存しました',
    chatEmptyState: '{family} と会話を始めましょう',
    chatPlaceholder: '{sender} としてメッセージ...',
    guestLabel: 'ゲスト',
    chatUserBadge: '私',
    chatAIBadge: 'AI',
    memoryHeading: 'メモリー状況',
    memorySubheading: 'エージェントの記憶とコンテキストを表示・管理します。',
    activeContextLabel: 'アクティブなコンテキスト',
    shortTermHeading: '短期メモリー',
    longTermHeading: '長期メモリー',
    importantEventsHeading: '重要イベント',
    privateHeading: 'プライベート記憶',
    publicHeading: '公開記憶',
    profileHeading: '家族プロフィール',
    profileEditButton: 'プロフィールを編集',
    profileEditTitle: '個人プロフィール',
    profileNameLabel: '表示名',
  profileNameRequired: '表示名を入力してください',
  profileBioLabel: 'ひとこと / 自己紹介',
  profileBioPlaceholder: '自分について一言を書きましょう…',
  profileAvatarLabel: 'アバター',
  profileAvatarHint: '正方形の画像がおすすめ。大きめの角丸マスクを自動で適用します。',
  profileAvatarUpload: '画像をアップロード',
  profileAvatarRemove: '削除',
    userShortTermHeading: 'あなたの最近の記憶',
    memberRoleOwner: 'オーナー',
    memberRoleMember: 'メンバー',
    emptyMemoryLabel: 'なし',
    apiConnected: 'API 接続済み',
    apiConnecting: 'API 接続中...',
    apiFailed: 'API 接続失敗',
    identityUnsetLabel: '未設定',
    conversationTabLabel: '会話',
    fileManagementTabLabel: 'メモリー',
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

const normalizeMathDelimiters = (content: string): string =>
  content
    // Convert \[ ... \] to $$ ... $$ for display math
    .replace(/\\\[(.+?)\\\]/gs, (_, expr) => `$$${expr}$$`)
    // Convert \( ... \) to $ ... $ for inline math
    .replace(/\\\((.+?)\\\)/gs, (_, expr) => `$${expr}$`)

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

type ProfileOverride = {
  name?: string
  avatar_url?: string | null
  bio?: string | null
}

type ProfileFormState = {
  name: string
  bio: string
  avatarUrl: string
}

type RoundedAvatarProps = {
  src?: string | null
  label: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const RoundedAvatar = ({ src, label, size = 'md', className }: RoundedAvatarProps) => {
  const sizeClass =
    size === 'lg'
      ? 'h-40 w-40'
      : size === 'sm'
        ? 'h-10 w-10'
        : 'h-14 w-14'
  const radiusClass =
    size === 'lg'
      ? 'rounded-[18px]'
      : size === 'sm'
        ? 'rounded-[12px]'
        : 'rounded-[16px]'

  return (
    <div
      className={clsx(
        'overflow-hidden border border-stone-200 bg-stone-100 text-stone-400 flex items-center justify-center font-display text-xl uppercase tracking-wide shadow-sm',
        sizeClass,
        radiusClass,
        className,
      )}
    >
      {src ? (
        <img src={src} alt={label} className="h-full w-full object-cover" />
      ) : (
        <span>{label.slice(0, 1) || '?'}</span>
      )}
    </div>
  )
}

type MarkdownCodeProps = ComponentPropsWithoutRef<'code'> & {
  inline?: boolean
  node?: unknown
}

const markdownComponents: Components = {
  p: ({ node: _node, children, ...props }) => (
    <p className="mb-3 last:mb-0 whitespace-pre-wrap" {...props}>
      {children}
    </p>
  ),
  a: ({ node: _node, href, children, ...props }) => (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      className="text-stone-900 underline underline-offset-2 decoration-stone-300 hover:text-stone-700 break-words"
      {...props}
    >
      {children}
    </a>
  ),
  ul: ({ node: _node, children, ...props }) => (
    <ul className="mb-3 list-disc space-y-1 pl-5 text-left last:mb-0" {...props}>
      {children}
    </ul>
  ),
  ol: ({ node: _node, children, ...props }) => (
    <ol className="mb-3 list-decimal space-y-1 pl-5 text-left last:mb-0" {...props}>
      {children}
    </ol>
  ),
  li: ({ node: _node, children, ...props }) => (
    <li className="leading-relaxed" {...props}>
      {children}
    </li>
  ),
  strong: ({ node: _node, children, ...props }) => (
    <strong className="font-semibold text-stone-900" {...props}>
      {children}
    </strong>
  ),
  em: ({ node: _node, children, ...props }) => (
    <em className="italic text-stone-900" {...props}>
      {children}
    </em>
  ),
  del: ({ node: _node, children, ...props }) => (
    <del className="text-stone-500 line-through decoration-stone-400" {...props}>
      {children}
    </del>
  ),
  u: ({ node: _node, children, ...props }) => (
    <u className="underline underline-offset-2 decoration-stone-400" {...props}>
      {children}
    </u>
  ),
  blockquote: ({ node: _node, children, ...props }) => (
    <blockquote
      className="mb-3 border-l-4 border-stone-200 bg-white/60 px-4 py-2 text-left italic text-stone-700 last:mb-0"
      {...props}
    >
      {children}
    </blockquote>
  ),
  code({ inline, className, children, node: _node, ...props }: MarkdownCodeProps) {
    if (inline) {
      return (
        <code
          className={clsx(
            'rounded-md bg-stone-100 px-1.5 py-0.5 font-mono text-sm text-stone-800',
            className,
          )}
          {...props}
        >
          {children}
        </code>
      )
    }
    const codeText = String(children).replace(/\n$/, '')
    return (
      <pre className="mb-3 overflow-x-auto rounded-2xl bg-stone-900 p-4 text-sm text-stone-100 last:mb-0">
        <code className={clsx('font-mono leading-relaxed', className)} {...props}>
          {codeText}
        </code>
      </pre>
    )
  },
  table: ({ node: _node, children, ...props }) => (
    <div className="mb-3 overflow-x-auto rounded-xl border border-stone-200 bg-white/80 last:mb-0">
      <table className="min-w-full text-left text-sm text-stone-700" {...props}>
        {children}
      </table>
    </div>
  ),
  thead: ({ node: _node, children, ...props }) => (
    <thead className="bg-stone-100 text-stone-900" {...props}>
      {children}
    </thead>
  ),
  tbody: ({ node: _node, children, ...props }) => <tbody {...props}>{children}</tbody>,
  tr: ({ node: _node, children, ...props }) => (
    <tr className="border-b border-stone-100 last:border-none" {...props}>
      {children}
    </tr>
  ),
  th: ({ node: _node, children, ...props }) => (
    <th className="px-3 py-2 text-left font-semibold" {...props}>
      {children}
    </th>
  ),
  td: ({ node: _node, children, ...props }) => (
    <td className="px-3 py-2 align-top" {...props}>
      {children}
    </td>
  ),
  hr: ({ node: _node, ...props }) => <hr className="my-4 border-stone-200" {...props} />,
}

type FamilyIdReminderProps = {
  familyId: string
  copy: Copy
  onClose: () => void
}

const FamilyIdReminder = ({ familyId, copy, onClose }: FamilyIdReminderProps) => {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    if (typeof navigator === 'undefined' || !navigator.clipboard) return
    try {
      await navigator.clipboard.writeText(familyId)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      setCopied(false)
    }
  }

  return (
    <motion.div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-6 py-10 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
    >
      <motion.div
        className="relative w-full max-w-md rounded-3xl border border-stone-200 bg-white p-8 text-stone-900 shadow-2xl"
        initial={{ opacity: 0.6, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: -12 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 text-stone-400 transition-colors hover:text-stone-900"
        >
          <X className="h-4 w-4" />
        </button>
        <p className="text-[10px] uppercase tracking-[0.35em] text-stone-400">{copy.idReminderTitle}</p>
        <p className="mt-4 text-base leading-relaxed text-stone-600">{copy.idReminderDescription}</p>
        <div className="mt-6 flex items-center justify-between gap-4 rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-700">
          <span className="break-all font-mono text-base tracking-widest text-stone-900">
            {familyId}
          </span>
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-2 rounded-xl border border-stone-200 px-3 py-2 text-[11px] uppercase tracking-[0.2em] text-stone-900 transition-colors hover:bg-white"
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            <span>{copied ? copy.idReminderCopied : copy.idReminderCopy}</span>
          </button>
        </div>
        <p className="mt-4 text-xs text-stone-500">{copy.idReminderMemoHint}</p>
        <button
          type="button"
          onClick={onClose}
          className="mt-6 w-full rounded-2xl bg-stone-900 px-4 py-3 text-center text-xs font-semibold uppercase tracking-[0.3em] text-white transition-colors hover:bg-stone-800"
        >
          {copy.idReminderDismiss}
        </button>
      </motion.div>
    </motion.div>
  )
}

type ProfileEditModalProps = {
  copy: Copy
  form: ProfileFormState
  onClose: () => void
  onChange: (field: keyof ProfileFormState, value: string) => void
  onUpload: (file: File) => void
  onRemoveAvatar: () => void
  onSave: () => void
  saving: boolean
  error: string | null
}

const ProfileEditModal = ({
  copy,
  form,
  onClose,
  onChange,
  onUpload,
  onRemoveAvatar,
  onSave,
  saving,
  error,
}: ProfileEditModalProps) => {
  const inputId = 'profile-avatar-upload'

  return (
    <motion.div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 px-4 py-6 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
    >
      <motion.div
        className="relative w-full max-w-3xl rounded-[38px] border border-stone-200 bg-white/95 p-8 text-stone-900 shadow-2xl"
        initial={{ opacity: 0, y: 32, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.98 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-6 top-6 text-stone-400 transition-colors hover:text-stone-900"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="space-y-6">
          <div>
            <p className="text-[10px] uppercase tracking-[0.35em] text-stone-400">{copy.profileEditButton}</p>
            <h3 className="mt-2 text-3xl font-display italic text-stone-900">{copy.profileEditTitle}</h3>
          </div>
          <div className="flex flex-col gap-8 md:flex-row">
            <div className="flex flex-1 flex-col items-center gap-4 md:max-w-[220px]">
              <span className="text-[10px] uppercase tracking-[0.3em] text-stone-400">{copy.profileAvatarLabel}</span>
              <RoundedAvatar src={form.avatarUrl} label={form.name || '?'} size="lg" />
              <div className="flex flex-wrap items-center justify-center gap-3">
                <input
                  id={inputId}
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={(event) => {
                    const file = event.target.files?.[0]
                    if (file) onUpload(file)
                    event.target.value = ''
                  }}
                />
                <label
                  htmlFor={inputId}
                  className="inline-flex items-center gap-2 rounded-2xl border border-stone-200 px-4 py-2 text-xs uppercase tracking-[0.2em] text-stone-900 transition-colors hover:bg-stone-50 cursor-pointer"
                >
                  <ImagePlus className="h-4 w-4" />
                  {copy.profileAvatarUpload}
                </label>
                {form.avatarUrl && (
                  <button
                    type="button"
                    onClick={onRemoveAvatar}
                    className="inline-flex items-center gap-2 rounded-2xl border border-stone-200 px-4 py-2 text-xs uppercase tracking-[0.2em] text-rose-600 transition-colors hover:bg-rose-50"
                  >
                    <Trash2 className="h-4 w-4" />
                    {copy.profileAvatarRemove}
                  </button>
                )}
              </div>
              <p className="text-center text-xs text-stone-400">{copy.profileAvatarHint}</p>
            </div>
            <div className="flex flex-1 flex-col gap-5">
              <label className="space-y-2 text-sm">
                <span className="text-[10px] uppercase tracking-[0.3em] text-stone-400">{copy.profileNameLabel}</span>
                <input
                  className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-800 placeholder:text-stone-400 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/10"
                  value={form.name}
                  onChange={(event) => onChange('name', event.target.value)}
                />
              </label>
              <label className="space-y-2 text-sm">
                <span className="text-[10px] uppercase tracking-[0.3em] text-stone-400">{copy.profileBioLabel}</span>
                <textarea
                  rows={4}
                  className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-800 placeholder:text-stone-400 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/10"
                  placeholder={copy.profileBioPlaceholder}
                  value={form.bio}
                  onChange={(event) => onChange('bio', event.target.value)}
                />
              </label>
            </div>
          </div>
          {error && <p className="text-sm text-rose-500">{error}</p>}
          <div className="flex flex-col gap-3 border-t border-stone-100 pt-5 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-2xl border border-stone-200 px-6 py-3 text-xs uppercase tracking-[0.3em] text-stone-500 transition-colors hover:text-stone-900"
            >
              {copy.cancelButton}
            </button>
            <button
              type="button"
              onClick={onSave}
              disabled={saving}
              className="rounded-2xl bg-stone-900 px-8 py-3 text-xs font-semibold uppercase tracking-[0.3em] text-white transition-colors hover:bg-stone-800 disabled:bg-stone-400"
            >
              {saving ? copy.savingButton : copy.saveButton}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

function App() {
  const queryClient = useQueryClient()
  const [authToken, setAuthToken] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null
    return window.localStorage.getItem('fc-token')
  })
  const [selectedFamilyId, setSelectedFamilyId] = useState<string | null>(null)
  const [view, setView] = useState<'landing' | 'identity' | 'intro' | 'dashboard'>('landing')
  const [introStep, setIntroStep] = useState(0)
  const [authMode, setAuthMode] = useState<'signup' | 'login'>('signup')
  const [signupForm, setSignupForm] = useState({
    family_name: '',
    description: '',
    family_id: '',
    task_price: '',
    user_name: '',
    email: '',
    password: '',
  })
  const [loginForm, setLoginForm] = useState({ email: '', password: '' })
  const [profileOverrides, setProfileOverrides] = useState<Record<string, ProfileOverride>>(() => {
    if (typeof window === 'undefined') return {}
    try {
      const stored = window.localStorage.getItem('fc-profile-overrides')
      return stored ? JSON.parse(stored) : {}
    } catch {
      return {}
    }
  })
  const [isEditingProfile, setIsEditingProfile] = useState(false)
  const [profileForm, setProfileForm] = useState<ProfileFormState>({
    name: '',
    bio: '',
    avatarUrl: '',
  })
  const [profileError, setProfileError] = useState<string | null>(null)
  const [isProfileSaving, setIsProfileSaving] = useState(false)
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([])
  const [isAddingMember, setIsAddingMember] = useState(false)
  const [newMemberName, setNewMemberName] = useState('')
  const [newMemberEmail, setNewMemberEmail] = useState('')
  const [newMemberRole, setNewMemberRole] = useState('member')
  const [latestInvite, setLatestInvite] = useState<InviteLinkResponse | null>(null)
  const [copiedInviteToken, setCopiedInviteToken] = useState<string | null>(null)
  const [inviteToken, setInviteToken] = useState<string | null>(null)
  const [inviteInfo, setInviteInfo] = useState<InviteInfo | null>(null)
  const [inviteFetchError, setInviteFetchError] = useState<string | null>(null)
  const [sessionUser, setSessionUser] = useState<FamilyMember | null>(null)
  const [chatDraft, setChatDraft] = useState('')
  const [chatLogs, setChatLogs] = useState<Record<string, ChatMessage[]>>({})
  const [streamingMessage, setStreamingMessage] = useState<StreamingState | null>(null)
  const [memoryCache, setMemoryCache] = useState<Record<string, MemorySnapshot>>({})
  const [contextCache, setContextCache] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [chatError, setChatError] = useState<string | null>(null)
  const [globalError, setGlobalError] = useState<string | null>(null)
  const [shouldShowIntro, setShouldShowIntro] = useState(false)
  const [dashboardView, setDashboardView] = useState<'chat' | 'memory'>('chat')
  const [language, setLanguage] = useState<SupportedLanguage>(() => getInitialLanguage())
  const [isLandingAtTop, setIsLandingAtTop] = useState(true)
  const chatEndRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem('fc-profile-overrides', JSON.stringify(profileOverrides))
  }, [profileOverrides])

  const upsertProfileOverride = useCallback((userId: string, override: ProfileOverride) => {
    setProfileOverrides((prev) => ({
      ...prev,
      [userId]: {
        ...(prev[userId] ?? {}),
        ...override,
      },
    }))
  }, [])
  const [signupFamilyId, setSignupFamilyId] = useState<string | null>(null)
  const [pendingViewAfterReminder, setPendingViewAfterReminder] = useState<'identity' | 'intro' | null>(null)

  const clearInviteFromUrl = () => {
    if (typeof window === 'undefined') return
    const url = new URL(window.location.href)
    if (url.searchParams.has('invite')) {
      url.searchParams.delete('invite')
      window.history.replaceState({}, '', url.toString())
    }
  }

  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const token = params.get('invite')
    if (token) {
      setInviteToken(token)
      setAuthMode('signup')
      setView('landing')
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem('fc-language', language)
  }, [language])

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (authToken) {
      window.localStorage.setItem('fc-token', authToken)
    } else {
      window.localStorage.removeItem('fc-token')
    }
  }, [authToken])

  const copy = translations[language]
  const memorySections: Array<{
    key: keyof MemorySnapshot
    label: string
  }> = [
    {
      key: 'user_stm',
      label: copy.userShortTermHeading,
    },
    {
      key: 'stm',
      label: copy.shortTermHeading,
    },
    {
      key: 'ltm',
      label: copy.longTermHeading,
    },
    {
      key: 'important_events',
      label: copy.importantEventsHeading,
    },
    {
      key: 'private',
      label: copy.privateHeading,
    },
    {
      key: 'public',
      label: copy.publicHeading,
    },
    {
      key: 'profile',
      label: copy.profileHeading,
    },
  ]

  const applyProfileOverrides = useCallback(
    (member: FamilyMember): FamilyMember => {
      const override = profileOverrides[member.user_id]
      if (!override) return member
      const next: FamilyMember = { ...member }
      if (override.name) {
        next.name = override.name
      }
      if (Object.prototype.hasOwnProperty.call(override, 'avatar_url')) {
        next.avatar_url = override.avatar_url ?? null
      }
      if (Object.prototype.hasOwnProperty.call(override, 'bio')) {
        next.bio = override.bio ?? null
      }
      return next
    },
    [profileOverrides],
  )

  const applyOverridesToList = useCallback(
    (members: FamilyMember[] = []) => members.map((member) => applyProfileOverrides(member)),
    [applyProfileOverrides],
  )

  useEffect(() => {
    if (!selectedFamilyId) {
      setView('landing')
    }
  }, [selectedFamilyId])

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (view !== 'landing') {
      setIsLandingAtTop(true)
      return
    }
    const handleScroll = () => {
      setIsLandingAtTop(window.scrollY <= 10)
    }
    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', handleScroll)
    }
  }, [view])

  const healthQuery = useQuery<HealthStatus>({
    queryKey: ['health'],
    queryFn: api.fetchHealth,
    refetchInterval: 30_000,
  })

  const profileQuery = useQuery<ProfileResponse>({
    queryKey: ['profile', authToken],
    queryFn: () => api.fetchProfile(authToken!),
    enabled: Boolean(authToken),
    retry: false,
  })

  const inviteQuery = useQuery<InviteInfo>({
    queryKey: ['invite', inviteToken],
    queryFn: () => api.fetchInvite(inviteToken!),
    enabled: Boolean(inviteToken),
    retry: false,
  })

  useEffect(() => {
    if (!profileQuery.data) return
    const data = profileQuery.data
    setGlobalError(null)
    setSessionUser(applyProfileOverrides(data.user))
    setSelectedFamilyId(data.family.family_id)
    if (view === 'landing') {
      setView('identity')
    }
  }, [profileQuery.data, view, applyProfileOverrides])

  useEffect(() => {
    const error = profileQuery.error as Error | null
    if (error) {
      setGlobalError(error.message)
      setAuthToken(null)
      setSessionUser(null)
      setSelectedFamilyId(null)
    }
  }, [profileQuery.error])

  useEffect(() => {
    if (!inviteQuery.data) return
    setInviteInfo(inviteQuery.data)
    setInviteFetchError(null)
    setSignupForm((prev) => ({
      ...prev,
      family_name: inviteQuery.data.family_name || inviteQuery.data.family_id,
      user_name: inviteQuery.data.name || prev.user_name,
      email: inviteQuery.data.email || prev.email,
    }))
  }, [inviteQuery.data])

  useEffect(() => {
    const error = inviteQuery.error as Error | null
    if (error) {
      setInviteFetchError(error.message)
      setInviteInfo(null)
    } else if (!inviteQuery.isFetching) {
      setInviteFetchError(null)
    }
  }, [inviteQuery.error, inviteQuery.isFetching])

  useEffect(() => {
    if (!inviteToken) {
      setInviteInfo(null)
      setInviteFetchError(null)
    }
  }, [inviteToken])

  const selectedFamily = useMemo(() => {
    if (profileQuery.data?.family) return profileQuery.data.family
    if (selectedFamilyId) {
      return queryClient.getQueryData<Family>(['family', selectedFamilyId]) ?? null
    }
    return null
  }, [profileQuery.data?.family, selectedFamilyId, queryClient])

  useEffect(() => {
    if (!selectedFamily) {
      setFamilyMembers([])
      return
    }
    setFamilyMembers(applyOverridesToList(selectedFamily.members ?? []))
  }, [selectedFamily, applyOverridesToList])

  useEffect(() => {
    if (!authToken) {
      setChatLogs({})
      setMemoryCache({})
      setContextCache({})
      setSessionUser(null)
      setSelectedFamilyId(null)
      setIsEditingProfile(false)
    }
  }, [authToken])

  const memoryQuery = useQuery<MemorySnapshot>({
    queryKey: ['memory', selectedFamily?.family_id, authToken],
    queryFn: () => api.fetchMemory(selectedFamily!.family_id, authToken!),
    enabled: Boolean(selectedFamily && authToken),
    placeholderData: selectedFamily ? memoryCache[selectedFamily.family_id] : undefined,
  })

  const handleAuthSuccess = (
    resp: AuthResponse,
    showIntro = false,
    deferViewUntilReminder = false,
  ) => {
    setAuthToken(resp.token)
    setSessionUser(applyProfileOverrides(resp.user))
    setSelectedFamilyId(resp.family.family_id)
    setFamilyMembers(applyOverridesToList(resp.family.members ?? []))
    setFormError(null)
    setGlobalError(null)
    setChatLogs({})
    setMemoryCache({})
    setContextCache({})
    setLatestInvite(null)
    setCopiedInviteToken(null)
    setInviteToken(null)
    setInviteInfo(null)
    setInviteFetchError(null)
    clearInviteFromUrl()
    setSignupForm({
      family_name: '',
      description: '',
      family_id: '',
      task_price: '',
      user_name: '',
      email: '',
      password: '',
    })
    setLoginForm({ email: '', password: '' })
    setIsAddingMember(false)
    queryClient.setQueryData(['profile', resp.token], {
      user: resp.user,
      family: resp.family,
    } satisfies ProfileResponse)
    queryClient.setQueryData(['family', resp.family.family_id], resp.family)
    setShouldShowIntro(showIntro)
    const nextView: 'intro' | 'identity' = showIntro ? 'intro' : 'identity'
    if (deferViewUntilReminder) {
      setPendingViewAfterReminder(nextView)
    } else {
      setPendingViewAfterReminder(null)
      setView(nextView)
    }
  }

  const signupMutation = useMutation<AuthResponse, Error, SignupPayload>({
    mutationFn: (payload) => api.signup(payload),
    onSuccess: (resp) => {
      setSignupFamilyId(resp.family.family_id)
      handleAuthSuccess(resp, true, true)
    },
    onError: (error: Error) => {
      setFormError(error.message)
    },
  })

  const acceptInviteMutation = useMutation<AuthResponse, Error, AcceptInvitePayload>({
    mutationFn: (payload) => api.acceptInvite(payload),
    onSuccess: (resp) => handleAuthSuccess(resp, true),
    onError: (error: Error) => setFormError(error.message),
  })

  const loginMutation = useMutation<AuthResponse, Error, LoginPayload>({
    mutationFn: (payload) => api.login(payload),
    onSuccess: (resp) => handleAuthSuccess(resp),
    onError: (error: Error) => setFormError(error.message),
  })

  const chatMutation = useMutation<
    ChatResponse,
    Error,
    { familyId: string; content: string }
  >({
    mutationFn: async ({ familyId, content }) => {
      return api.chatWithFamily(familyId, { content }, authToken!)
    },
    onSuccess: (resp) => {
      setChatError(null)
      const streamingId = crypto.randomUUID()
      setChatLogs((prev) => ({
        ...prev,
        [resp.family_id]: [
          ...(prev[resp.family_id] ?? []),
          {
            id: streamingId,
            role: 'assistant',
            content: '',
            timestamp: new Date().toISOString(),
            isStreaming: true,
          },
        ],
      }))
      setStreamingMessage({
        id: streamingId,
        familyId: resp.family_id,
        fullText: resp.reply,
        cursor: 0,
      })
      setMemoryCache((prev) => ({ ...prev, [resp.family_id]: resp.memory }))
      setContextCache((prev) => ({ ...prev, [resp.family_id]: resp.context_used }))
      queryClient.setQueryData(['memory', resp.family_id], resp.memory)
    },
    onError: (error: Error) => setChatError(error.message),
  })

  useEffect(() => {
    if (!streamingMessage) return
    const chunkSize = Math.max(1, Math.floor(streamingMessage.fullText.length / 120))
    const interval = window.setInterval(() => {
      setStreamingMessage((prev) => {
        if (!prev) return prev
        const nextCursor = Math.min(prev.fullText.length, prev.cursor + chunkSize)
        setChatLogs((logs) => {
          const target = logs[prev.familyId] ?? []
          return {
            ...logs,
            [prev.familyId]: target.map((msg) =>
              msg.id === prev.id
                ? { ...msg, content: prev.fullText.slice(0, nextCursor) }
                : msg,
            ),
          }
        })
        if (nextCursor >= prev.fullText.length) {
          window.clearInterval(interval)
          setChatLogs((logs) => {
            const target = logs[prev.familyId] ?? []
            return {
              ...logs,
              [prev.familyId]: target.map((msg) =>
                msg.id === prev.id ? { ...msg, isStreaming: false } : msg,
              ),
            }
          })
          return null
        }
        return { ...prev, cursor: nextCursor }
      })
    }, 30)
    return () => window.clearInterval(interval)
  }, [streamingMessage?.id])

  const inviteMemberMutation = useMutation<
    InviteLinkResponse,
    Error,
    { familyId: string; payload: InviteMemberPayload }
  >({
    mutationFn: ({ familyId, payload }) => api.inviteMember(familyId, payload, authToken!),
    onSuccess: (invite) => {
      setGlobalError(null)
      setIsAddingMember(false)
      setNewMemberName('')
      setNewMemberEmail('')
      setNewMemberRole('member')
      setLatestInvite(invite)
      setCopiedInviteToken(null)
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
  useEffect(() => {
    if (dashboardView !== 'chat') return
    chatEndRef.current?.scrollIntoView({
      behavior: streamingMessage ? 'smooth' : 'auto',
      block: 'end',
    })
  }, [currentChat, streamingMessage?.cursor, dashboardView])
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
  const senderLabel = sessionUser
    ? `${sessionUser.name} · ${sessionUser.role || copy.identityUnsetLabel}`
    : ''
  const isInviteSignup = Boolean(inviteToken)
  const inviteInvalid =
    Boolean(inviteFetchError) || Boolean(inviteInfo && (inviteInfo.used || inviteInfo.expired))
  const signupPending = isInviteSignup ? acceptInviteMutation.isPending : signupMutation.isPending
  const signupDisabled = isInviteSignup
    ? inviteInvalid ||
      !inviteInfo ||
      !signupForm.user_name.trim() ||
      !signupForm.email.trim() ||
      !signupForm.password.trim() ||
      signupPending
    : signupPending ||
      !signupForm.family_name.trim() ||
      !signupForm.user_name.trim() ||
      !signupForm.email.trim() ||
      !signupForm.password.trim()
  const isOwner =
    selectedFamily && sessionUser
      ? selectedFamily.owner_id === sessionUser.user_id || sessionUser.role === 'owner'
      : false

  const handleSignup = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (isInviteSignup) {
      if (inviteInvalid) {
        setFormError(inviteFetchError || copy.inviteInvalid)
        return
      }
      if (!inviteInfo) {
        setFormError(copy.apiConnecting)
        return
      }
      if (!signupForm.user_name.trim() || !signupForm.email.trim() || !signupForm.password.trim()) {
        setFormError(copy.ownerFieldsRequired)
        return
      }
      acceptInviteMutation.mutate({
        token: inviteToken!,
        name: signupForm.user_name.trim() || inviteInfo?.name || signupForm.email.trim(),
        email: signupForm.email.trim(),
        password: signupForm.password,
      })
      return
    }
    if (!signupForm.family_name.trim()) {
      setFormError(copy.familyNameRequired)
      return
    }
    if (!signupForm.user_name.trim() || !signupForm.email.trim() || !signupForm.password.trim()) {
      setFormError(copy.ownerFieldsRequired)
      return
    }
    const parsedTaskPrice =
      signupForm.task_price === ''
        ? undefined
        : Math.max(0, Number(signupForm.task_price) || 0)
    signupMutation.mutate({
      family_name: signupForm.family_name.trim(),
      description: signupForm.description.trim(),
      family_id: signupForm.family_id.trim() || undefined,
      task_price: parsedTaskPrice,
      language,
      user_name: signupForm.user_name.trim(),
      email: signupForm.email.trim(),
      password: signupForm.password,
    })
  }

  const handleLogin = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!loginForm.email.trim() || !loginForm.password.trim()) {
      setFormError(copy.loginFieldsRequired)
      return
    }
    loginMutation.mutate({
      email: loginForm.email.trim(),
      password: loginForm.password,
    })
  }

  const closeProfileEditor = () => {
    setIsEditingProfile(false)
    setProfileError(null)
  }

  const openProfileEditor = () => {
    if (!sessionUser) return
    setProfileForm({
      name: sessionUser.name ?? '',
      bio: sessionUser.bio ?? '',
      avatarUrl: sessionUser.avatar_url ?? '',
    })
    setProfileError(null)
    setIsEditingProfile(true)
  }

  const handleProfileFormChange = (field: keyof ProfileFormState, value: string) => {
    setProfileForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleAvatarUpload = (file: File) => {
    const reader = new FileReader()
    reader.onload = () => {
      handleProfileFormChange('avatarUrl', typeof reader.result === 'string' ? reader.result : '')
    }
    reader.onerror = () => {
      setProfileError('Failed to load image')
    }
    reader.readAsDataURL(file)
  }

  const handleProfileSave = () => {
    if (!sessionUser) return
    const trimmedName = profileForm.name.trim()
    if (!trimmedName) {
      setProfileError(copy.profileNameRequired)
      return
    }
    setProfileError(null)
    setIsProfileSaving(true)
    const trimmedBio = profileForm.bio.trim()
    const trimmedAvatar = profileForm.avatarUrl.trim()
    const override: ProfileOverride = {
      name: trimmedName,
      bio: trimmedBio ? trimmedBio : null,
      avatar_url: trimmedAvatar ? trimmedAvatar : null,
    }
    upsertProfileOverride(sessionUser.user_id, override)
    const patch: Partial<FamilyMember> = {
      name: override.name,
      bio: override.bio ?? null,
      avatar_url: override.avatar_url ?? null,
    }
    setSessionUser((prev) => (prev ? { ...prev, ...patch } : prev))
    setFamilyMembers((prev) =>
      prev.map((member) => (member.user_id === sessionUser.user_id ? { ...member, ...patch } : member)),
    )
    if (authToken) {
      queryClient.setQueryData<ProfileResponse>(['profile', authToken], (prev) => {
        if (!prev) return prev
        const updatedFamily = {
          ...prev.family,
          members: prev.family.members?.map((member) =>
            member.user_id === sessionUser.user_id ? { ...member, ...patch } : member,
          ) as FamilyMember[],
        }
        const updatedUser =
          prev.user.user_id === sessionUser.user_id ? { ...prev.user, ...patch } : prev.user
        return {
          ...prev,
          user: updatedUser,
          family: updatedFamily,
        }
      })
    }
    setIsProfileSaving(false)
    setIsEditingProfile(false)
  }

  const handleAddMember = () => {
    if (!selectedFamily || !sessionUser || !authToken) return
    const name = newMemberName.trim()
    const email = newMemberEmail.trim()
    if (!name || !email) return
    inviteMemberMutation.mutate({
      familyId: selectedFamily.family_id,
      payload: {
        name,
        email,
        role: newMemberRole || 'member',
      },
    })
  }

  const handleCopyInviteLink = async (invite: InviteLinkResponse) => {
    if (typeof navigator === 'undefined' || !navigator.clipboard) {
      setGlobalError('Clipboard not available in this environment')
      return
    }
    try {
      await navigator.clipboard.writeText(invite.invite_url)
      setCopiedInviteToken(invite.invite_token)
      setTimeout(() => setCopiedInviteToken(null), 1500)
    } catch (error) {
      setGlobalError((error as Error).message || 'Failed to copy invite link')
    }
  }

  const handleSendMessage = () => {
    if (!activeFamilyId || !chatDraft.trim() || !sessionUser || !authToken) {
      setChatError(copy.authRequired)
      return
    }
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
    })
  }

  const handleRefresh = () => {
    if (!activeFamilyId) return
    if (dashboardView === 'chat') {
      setChatLogs((prev) => {
        if (!(prev[activeFamilyId]?.length)) return prev
        return { ...prev, [activeFamilyId]: [] }
      })
      setChatDraft('')
      setChatError(null)
      return
    }
    if (authToken) {
      queryClient.invalidateQueries({ queryKey: ['memory', activeFamilyId, authToken] })
    }
  }

  const handleLogout = () => {
    setAuthToken(null)
    setSessionUser(null)
    setSelectedFamilyId(null)
    setFamilyMembers([])
    setChatLogs({})
    setMemoryCache({})
    setContextCache({})
    setLatestInvite(null)
    setCopiedInviteToken(null)
    setShouldShowIntro(false)
    setView('landing')
    setIsEditingProfile(false)
    setPendingViewAfterReminder(null)
    queryClient.clear()
  }

  const handleFamilyIdReminderClose = () => {
    setSignupFamilyId(null)
    if (pendingViewAfterReminder) {
      setView(pendingViewAfterReminder)
      setPendingViewAfterReminder(null)
    }
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
        <AnimatePresence>
          {signupFamilyId ? (
            <FamilyIdReminder
              key="family-id-reminder"
              familyId={signupFamilyId}
              copy={copy}
              onClose={handleFamilyIdReminderClose}
            />
          ) : null}
        </AnimatePresence>
        <AnimatePresence>
          {isEditingProfile && sessionUser ? (
            <ProfileEditModal
              copy={copy}
              form={profileForm}
              onClose={closeProfileEditor}
              onChange={handleProfileFormChange}
              onUpload={handleAvatarUpload}
              onRemoveAvatar={() => handleProfileFormChange('avatarUrl', '')}
              onSave={handleProfileSave}
              saving={isProfileSaving}
              error={profileError}
            />
          ) : null}
        </AnimatePresence>
        {view !== 'dashboard' && (view !== 'landing' || isLandingAtTop) && (
          <div className="fixed right-6 top-2 sm:top-3 md:top-4 lg:top-5 z-30">
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
                  <div className="mb-6 flex items-center justify-center gap-4">
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode('signup')
                        setFormError(null)
                      }}
                      className={clsx(
                        'text-xs uppercase tracking-[0.25em] transition-colors',
                        authMode === 'signup'
                          ? 'text-stone-900 font-semibold'
                          : 'text-stone-400 hover:text-stone-700',
                      )}
                    >
                      {copy.authSignupTab}
                    </button>
                    <span className="h-px w-8 bg-stone-200" />
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode('login')
                        setFormError(null)
                      }}
                      className={clsx(
                        'text-xs uppercase tracking-[0.25em] transition-colors',
                        authMode === 'login'
                          ? 'text-stone-900 font-semibold'
                          : 'text-stone-400 hover:text-stone-700',
                      )}
                    >
                      {copy.authLoginTab}
                    </button>
                  </div>

                  {authMode === 'signup' ? (
                    <form className="space-y-6" onSubmit={handleSignup}>
                      <p className="text-[10px] uppercase tracking-[0.25em] text-stone-400">
                        {isInviteSignup
                          ? interpolate(copy.inviteSignupDescription, {
                              family:
                                inviteInfo?.family_name ?? inviteInfo?.family_id ?? copy.brandTagline,
                            })
                          : copy.signupDescription}
                      </p>
                      {isInviteSignup ? (
                        <div className="rounded-2xl border border-stone-200 bg-white/70 px-4 py-3">
                          <div className="flex items-center justify-between gap-4">
                            <div>
                              <p className="text-[10px] uppercase tracking-[0.2em] text-stone-400">
                                {copy.inviteSignupTitle}
                              </p>
                              <p className="text-xl font-display text-stone-900">
                                {inviteInfo?.family_name ?? inviteInfo?.family_id ?? '-'}
                              </p>
                            </div>
                            <p className="text-xs text-stone-500 break-all">
                              {inviteInfo?.email || copy.ownerEmailPlaceholder}
                            </p>
                          </div>
                          {inviteInvalid ? (
                            <p className="mt-3 text-sm text-rose-500">
                              {inviteFetchError || copy.inviteInvalid}
                            </p>
                          ) : null}
                        </div>
                      ) : (
                        <>
                          <div className="group relative">
                            <input
                              className="w-full border-b border-stone-300 bg-transparent px-0 py-4 text-xl text-stone-800 placeholder:text-stone-300 outline-none transition-all focus:border-stone-800 font-display"
                              placeholder={copy.familyNamePlaceholder}
                              value={signupForm.family_name}
                              onChange={(e) =>
                                setSignupForm((prev) => ({ ...prev, family_name: e.target.value }))
                              }
                            />
                          </div>
                          <div>
                            <textarea
                              className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-stone-800 placeholder:text-stone-400 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/10"
                              rows={2}
                              placeholder={copy.familyDescriptionPlaceholder}
                              value={signupForm.description}
                              onChange={(e) =>
                                setSignupForm((prev) => ({ ...prev, description: e.target.value }))
                              }
                            />
                          </div>
                          <div className="rounded-2xl border border-dashed border-stone-200 bg-white/70 px-4 py-3 text-xs leading-relaxed text-stone-500">
                            <p className="text-stone-700 font-medium">{copy.familyIdAutoHint}</p>
                            <p className="mt-2">{copy.stakeUsageHint}</p>
                          </div>
                        </>
                      )}
                      <div className="grid grid-cols-1 gap-3">
                        <input
                          className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-800 placeholder:text-stone-400 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/10"
                          placeholder={copy.ownerNamePlaceholder}
                          value={signupForm.user_name}
                          onChange={(e) =>
                            setSignupForm((prev) => ({ ...prev, user_name: e.target.value }))
                          }
                        />
                        <input
                          type="email"
                          className={clsx(
                            'w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-800 placeholder:text-stone-400 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/10',
                            isInviteSignup && inviteInfo?.email ? 'bg-stone-100 text-stone-500' : '',
                          )}
                          placeholder={copy.ownerEmailPlaceholder}
                          value={signupForm.email}
                          readOnly={Boolean(isInviteSignup && inviteInfo?.email)}
                          onChange={(e) =>
                            setSignupForm((prev) => ({ ...prev, email: e.target.value }))
                          }
                        />
                        <input
                          type="password"
                          className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-800 placeholder:text-stone-400 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/10"
                          placeholder={copy.ownerPasswordPlaceholder}
                          value={signupForm.password}
                          onChange={(e) =>
                            setSignupForm((prev) => ({ ...prev, password: e.target.value }))
                          }
                        />
                      </div>
                      {formError ? <p className="text-sm text-rose-500">{formError}</p> : null}
                      <button
                        type="submit"
                        disabled={signupDisabled}
                        className="group relative w-full overflow-hidden bg-stone-900 px-8 py-4 text-white transition-all hover:bg-stone-800 disabled:bg-stone-300"
                      >
                        <div className="relative z-10 flex items-center justify-center gap-3">
                          {signupPending ? (
                            <Loader2 className="animate-spin" size={18} />
                          ) : (
                            <>
                              <span className="text-sm font-medium tracking-[0.2em] uppercase">
                                {isInviteSignup ? copy.acceptInviteButton : copy.signupButton}
                              </span>
                              <ArrowRight size={16} className="transition-transform duration-500 group-hover:translate-x-2" />
                            </>
                          )}
                        </div>
                      </button>
                    </form>
                  ) : (
                    <form className="space-y-6" onSubmit={handleLogin}>
                      <p className="text-[10px] uppercase tracking-[0.25em] text-stone-400">
                        {copy.loginDescription}
                      </p>
                      <div className="flex flex-col gap-3">
                        <input
                          type="email"
                          className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-800 placeholder:text-stone-400 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/10"
                          placeholder={copy.ownerEmailPlaceholder}
                          value={loginForm.email}
                          onChange={(e) =>
                            setLoginForm((prev) => ({ ...prev, email: e.target.value }))
                          }
                        />
                        <input
                          type="password"
                          className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-800 placeholder:text-stone-400 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/10"
                          placeholder={copy.ownerPasswordPlaceholder}
                          value={loginForm.password}
                          onChange={(e) =>
                            setLoginForm((prev) => ({ ...prev, password: e.target.value }))
                          }
                        />
                      </div>
                      {formError ? <p className="text-sm text-rose-500">{formError}</p> : null}
                      <button
                        type="submit"
                        disabled={loginMutation.isPending}
                        className="group relative w-full overflow-hidden bg-stone-900 px-8 py-4 text-white transition-all hover:bg-stone-800 disabled:bg-stone-300"
                      >
                        <div className="relative z-10 flex items-center justify-center gap-3">
                          {loginMutation.isPending ? (
                            <Loader2 className="animate-spin" size={18} />
                          ) : (
                            <>
                              <span className="text-sm font-medium tracking-[0.2em] uppercase">{copy.loginButton}</span>
                              <ArrowRight size={16} className="transition-transform duration-500 group-hover:translate-x-2" />
                            </>
                          )}
                        </div>
                      </button>
                    </form>
                  )}
                </div>
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
                onClick={handleLogout}
                className="absolute left-6 top-6 flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-stone-400 transition-colors hover:text-stone-900"
              >
                <ChevronLeft className="h-4 w-4" />
                <span>{copy.logoutLabel}</span>
              </button>
              <div className="mb-16 text-center">
                <span className="text-[10px] tracking-[0.3em] uppercase text-stone-400 font-medium block mb-4">{copy.identitySelectionLabel}</span>
                <h2 className="text-5xl font-display font-normal text-stone-900 italic mb-4">{copy.identitySelectionTitle}</h2>
                <div className="w-12 h-px bg-stone-300 mx-auto" />
              </div>
              {sessionUser && (
                <motion.button
                  type="button"
                  onClick={openProfileEditor}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.96 }}
                  className="mb-10 inline-flex items-center gap-2 rounded-full border border-stone-200 px-4 py-2 text-[10px] uppercase tracking-[0.3em] text-stone-600 transition hover:border-stone-400"
                >
                  <UserPen className="h-4 w-4" />
                  {copy.profileEditButton}
                </motion.button>
              )}

              <div className="grid w-full max-w-3xl grid-cols-2 gap-8 sm:grid-cols-4">
                {familyMembers.length > 0 ? (
                  familyMembers.map((member) => {
                    const isSelected = sessionUser?.user_id === member.user_id
                    return (
                      <div
                        key={`${member.user_id}-${member.email}`}
                        className={clsx(
                          'group relative aspect-[3/4] flex flex-col items-center justify-center gap-4 transition-all duration-500',
                          isSelected ? 'bg-stone-100' : 'bg-transparent hover:bg-stone-50',
                        )}
                      >
                        <div
                          className={clsx(
                            'absolute inset-0 border border-stone-200 transition-all duration-500',
                            isSelected ? 'border-stone-800' : 'group-hover:border-stone-400',
                          )}
                        />
                        <RoundedAvatar
                          src={member.avatar_url ?? undefined}
                          label={member.name}
                          className={clsx(
                            'transition-all duration-500',
                            isSelected ? 'border-stone-900' : 'group-hover:border-stone-400',
                          )}
                        />
                        <div className="text-center space-y-2 px-4">
                          <p
                            className={clsx(
                              'text-base font-display transition-colors duration-500',
                              isSelected ? 'text-stone-900' : 'text-stone-500 group-hover:text-stone-700',
                            )}
                          >
                            {member.name}
                          </p>
                          <p className="text-xs uppercase tracking-[0.2em] text-stone-400">
                            {member.role === 'owner' ? copy.memberRoleOwner : copy.memberRoleMember}
                          </p>
                          {member.bio ? (
                            <p className="text-[11px] leading-relaxed text-stone-500 line-clamp-2">{member.bio}</p>
                          ) : (
                            <p className="text-[11px] leading-relaxed text-stone-500 break-all">{member.email}</p>
                          )}
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

                {isOwner ? (
                  isAddingMember ? (
                    <div className="col-span-2 aspect-[3/2] border border-stone-200 bg-white p-8 flex flex-col justify-center gap-6 animate-in fade-in zoom-in-95 duration-500">
                      <div className="flex items-center justify-between border-b border-stone-100 pb-2">
                        <span className="text-[10px] uppercase tracking-[0.2em] text-stone-400">{copy.newMemberTitle}</span>
                        <button
                          type="button"
                          onClick={() => {
                            setIsAddingMember(false)
                            setNewMemberName('')
                            setNewMemberEmail('')
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
                          type="email"
                          value={newMemberEmail}
                          onChange={(event) => setNewMemberEmail(event.target.value)}
                          placeholder={copy.newMemberEmailPlaceholder}
                          className="w-full border-b border-stone-200 py-2 text-xl font-display italic text-stone-800 placeholder:text-stone-300 outline-none focus:border-stone-800 transition-colors bg-transparent"
                        />
                        <select
                          value={newMemberRole}
                          onChange={(event) => setNewMemberRole(event.target.value)}
                          className="w-full rounded-xl border border-stone-200 px-3 py-2 text-sm text-stone-700 outline-none bg-white"
                        >
                          <option value="member">{copy.memberRoleMember}</option>
                          <option value="owner">{copy.memberRoleOwner}</option>
                        </select>
                        <button
                          type="button"
                          onClick={handleAddMember}
                          disabled={
                            !newMemberName.trim() ||
                            !newMemberEmail.trim() ||
                            inviteMemberMutation.isPending
                          }
                          className="self-end text-[10px] uppercase tracking-[0.2em] text-stone-900 hover:text-stone-500 disabled:text-stone-300 transition-colors"
                        >
                          {inviteMemberMutation.isPending ? copy.savingButton : copy.confirmLabel}
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
                  )
                ) : familyMembers.length > 0 ? (
                  <div className="col-span-2 sm:col-span-4 text-center text-xs uppercase tracking-[0.2em] text-stone-400">
                    {copy.ownerOnlyInviteHint}
                  </div>
                ) : null}
              </div>

              {latestInvite && (
                <div className="mt-10 w-full max-w-3xl rounded-3xl border border-stone-200 bg-white/70 p-6 shadow-sm">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.2em] text-stone-400">
                        {copy.inviteLinkReady}
                      </p>
                      <p className="text-sm text-stone-600">{copy.inviteLinkHint}</p>
                    </div>
                    <span className="text-[10px] uppercase tracking-[0.2em] text-stone-500">
                      {latestInvite.email}
                    </span>
                  </div>
                  <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
                    <input
                      readOnly
                      value={latestInvite.invite_url}
                      className="flex-1 rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-700"
                    />
                    <button
                      type="button"
                      onClick={() => handleCopyInviteLink(latestInvite)}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl border border-stone-200 px-4 py-3 text-sm uppercase tracking-[0.2em] text-stone-900 transition-colors hover:bg-stone-50"
                    >
                      {copiedInviteToken === latestInvite.invite_token ? (
                        <>
                          <Check size={16} />
                          <span>{copy.inviteLinkCopied}</span>
                        </>
                      ) : (
                        <>
                          <Copy size={16} />
                          <span>{copy.inviteLinkCopy}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              <div className="mt-16 flex justify-center">
                <motion.button
                  onClick={() => setView(shouldShowIntro ? 'intro' : 'dashboard')}
                  disabled={!sessionUser}
                  whileHover={sessionUser ? { scale: 1.04, y: -2 } : undefined}
                  whileTap={sessionUser ? { scale: 0.98 } : undefined}
                  className={`group relative flex items-center gap-4 px-12 py-4 transition-all duration-500
                    ${!sessionUser 
                      ? 'opacity-0 pointer-events-none' 
                      : 'opacity-100'
                    }`}
                >
                  <span className="text-xs font-medium tracking-[0.3em] uppercase text-stone-900 group-hover:text-stone-600 transition-colors">{copy.enterFamilyButton}</span>
                  <ArrowRight className="w-4 h-4 text-stone-900 group-hover:translate-x-2 transition-transform duration-500" />
                  <div className="absolute bottom-0 left-0 w-full h-px bg-stone-900 scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left" />
                </motion.button>
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
          )}
          {view === 'dashboard' && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="flex h-screen flex-col bg-surface-50"
            >
              <header className="border-b border-stone-200 bg-surface-50 px-6 py-6 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex flex-1 flex-wrap items-center gap-4 sm:gap-6">
                    <button
                      onClick={() => setView('identity')}
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

                    {sessionUser && (
                      <motion.button
                        type="button"
                        onClick={openProfileEditor}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.97 }}
                        className="flex items-center gap-3 rounded-[28px] border border-stone-200 bg-white/70 px-4 py-2 text-left shadow-sm transition hover:border-stone-400"
                      >
                        <RoundedAvatar
                          src={sessionUser.avatar_url ?? undefined}
                          label={sessionUser.name}
                          size="sm"
                        />
                        <div className="flex flex-col max-w-[8rem] sm:max-w-[12rem]">
                          <span className="text-sm font-medium text-stone-900 line-clamp-1">{sessionUser.name}</span>
                          <span className="text-xs text-stone-400 line-clamp-1">
                            {sessionUser.bio || copy.profileEditButton}
                          </span>
                        </div>
                        <UserPen className="h-4 w-4 text-stone-300" />
                      </motion.button>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center justify-end gap-3 sm:gap-4">
                    <LanguageSelector
                      language={language}
                      label={copy.languageSelectorLabel}
                      onChange={setLanguage}
                    />
                    <div className="hidden items-center gap-3 text-xs tracking-widest uppercase text-stone-500 sm:flex">
                      <span className="w-2 h-2 rounded-full bg-stone-300" />
                      <span>
                        {copy.identityLabelPrefix} {sessionUser ? senderLabel : copy.identityUnsetLabel}
                      </span>
                      <button
                        onClick={() => setView('identity')}
                        className="text-stone-900 border-b border-stone-300 hover:border-stone-900 transition-colors pb-0.5"
                      >
                        {copy.switchLabel}
                      </button>
                    </div>
                    <button
                      onClick={handleRefresh}
                      className="text-stone-400 hover:text-stone-900 transition-colors"
                      title={copy.refreshTooltip}
                    >
                      <RefreshCcw size={18} strokeWidth={1.5} />
                    </button>
                    <button
                      onClick={handleLogout}
                      className="text-[10px] uppercase tracking-[0.25em] text-stone-400 hover:text-stone-900 transition-colors"
                    >
                      {copy.logoutLabel}
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-8">
                  <button
                    onClick={() => setDashboardView('chat')}
                    className={`text-xs uppercase tracking-[0.2em] transition-colors ${
                      dashboardView === 'chat'
                        ? 'text-stone-900 font-medium'
                        : 'text-stone-400 hover:text-stone-600'
                    }`}
                  >
                    {copy.conversationTabLabel}
                  </button>
                  <button
                    onClick={() => setDashboardView('memory')}
                    className={`text-xs uppercase tracking-[0.2em] transition-colors ${
                      dashboardView === 'memory'
                        ? 'text-stone-900 font-medium'
                        : 'text-stone-400 hover:text-stone-600'
                    }`}
                  >
                    {copy.fileManagementTabLabel}
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
                                <RoundedAvatar
                                  src={msg.role === 'user' ? sessionUser?.avatar_url ?? undefined : undefined}
                                  label={
                                    msg.role === 'user'
                                      ? sessionUser?.name || copy.chatUserBadge
                                      : copy.chatAIBadge
                                  }
                                  size="sm"
                                  className={clsx(
                                    'shrink-0',
                                    msg.role === 'user'
                                      ? 'border-stone-900 bg-white text-stone-900'
                                      : 'border-stone-200 bg-white text-stone-400',
                                  )}
                                />
                                <div
                                  className={clsx(
                                    'max-w-[80%] text-base leading-relaxed font-light tracking-wide break-words',
                                    msg.role === 'user'
                                      ? 'text-stone-900 text-right'
                                      : 'text-stone-600 text-left',
                                  )}
                                >
                                  <ReactMarkdown
                                    remarkPlugins={[remarkMath, remarkGfm]}
                                    rehypePlugins={[rehypeKatex]}
                                    components={markdownComponents}
                                  >
                                    {normalizeMathDelimiters(msg.content)}
                                  </ReactMarkdown>
                                </div>
                              </div>
                            ))}
                            <div ref={chatEndRef} />
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
                                chatMutation.isPending ||
                                !chatDraft.trim() ||
                                !sessionUser ||
                                !authToken
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
                  </>
                ) : (
                  <div className="flex-1 overflow-y-auto p-12 bg-surface-50">
                    <div className="max-w-5xl mx-auto space-y-12">
                      <div className="border-b border-stone-200 pb-8">
                        <h3 className="text-3xl font-display italic text-stone-900 mb-2">{copy.memoryHeading}</h3>
                        <p className="text-stone-500 font-light">{copy.memorySubheading}</p>
                      </div>

                      {/* Context */}
                      {currentContext && (
                        <div className="rounded-3xl border border-stone-100 bg-gradient-to-r from-stone-50 to-white px-8 py-8 shadow-sm">
                          <div className="mb-4 flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-stone-500">
                            <span className="h-2 w-2 rounded-full bg-stone-400" />
                            <span>{copy.activeContextLabel}</span>
                          </div>
                          <p className="text-lg leading-relaxed text-stone-700 font-light italic">
                            “{currentContext}”
                          </p>
                        </div>
                      )}

                      {/* Snapshots Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {memorySections.map((section) => {
                          const rawEntries = currentMemory?.[section.key]
                          const entries: MemoryEntry[] = Array.isArray(rawEntries)
                            ? (rawEntries as MemoryEntry[])
                            : []
                          return (
                            <div
                              key={section.key}
                              className="rounded-3xl border border-stone-200 bg-white/50 px-8 py-8 shadow-sm"
                            >
                              <div className="flex items-center gap-3 mb-6 border-b border-stone-100 pb-4">
                                <p className="text-xs uppercase tracking-[0.3em] text-stone-500">
                                  {section.label}
                                </p>
                              </div>
                              <div className="space-y-4">
                                {entries.length ? (
                                  entries.map((item: MemoryEntry, index: number) => {
                                    const contentText =
                                      typeof item === 'string'
                                        ? item
                                        : item.date
                                          ? `${item.date} · ${item.content}`
                                          : item.content
                                    return (
                                      <div
                                        key={`${section.key}-${index}`}
                                        className="rounded-xl border border-stone-100 bg-white px-6 py-5 shadow-sm"
                                      >
                                        <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-stone-300 mb-3">
                                          <span className="font-medium text-stone-400">#{index + 1}</span>
                                          <span className="h-px w-6 bg-stone-100" />
                                          <span>{section.label}</span>
                                        </div>
                                      <p className="text-sm leading-relaxed text-stone-700 whitespace-pre-wrap font-mono text-xs">
                                        {contentText}
                                      </p>
                                    </div>
                                    )
                                  })
                                ) : (
                                  <div className="rounded-xl border border-dashed border-stone-200 bg-stone-50/50 px-6 py-8 text-center text-xs uppercase tracking-[0.3em] text-stone-300">
                                    {copy.emptyMemoryLabel}
                                  </div>
                                )}
                              </div>
                            </div>
                          )
                        })}
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
