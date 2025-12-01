import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import clsx from 'clsx'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowRight,
  Bot,
  ChevronLeft,
  Loader2,
  RefreshCcw,
  Plus,
  X,
} from 'lucide-react'
import { api } from './lib/api'
import type { ChatMessage, MemorySnapshot } from './types'

type IdentityOption = {
  name: string
  identity: string
}

const defaultSenderOptions: IdentityOption[] = []

const DecorativeBackground = () => (
  <>
    <div className="pointer-events-none absolute inset-0 bg-surface-50" />
    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(0,0,0,0.02),_transparent_60%)]" />
    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,_rgba(0,0,0,0.02),_transparent_60%)]" />
    <div className="pointer-events-none absolute top-0 left-0 w-full h-full opacity-[0.02] bg-[url('https://www.transparenttextures.com/patterns/concrete-wall.png')]" />
  </>
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
  const [availableSenders, setAvailableSenders] = useState<IdentityOption[]>(defaultSenderOptions)
  const [isAddingMember, setIsAddingMember] = useState(false)
  const [newMemberName, setNewMemberName] = useState('')
  const [newMemberIdentity, setNewMemberIdentity] = useState('')
  const [selectedMember, setSelectedMember] = useState<IdentityOption | null>(null)
  const [chatDraft, setChatDraft] = useState('')
  const [chatLogs, setChatLogs] = useState<Record<string, ChatMessage[]>>({})
  const [memoryCache, setMemoryCache] = useState<Record<string, MemorySnapshot>>({})
  const [contextCache, setContextCache] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [chatError, setChatError] = useState<string | null>(null)
  const [shouldShowIntro, setShouldShowIntro] = useState(false)

  useEffect(() => {
    if (!selectedFamilyId) {
      setView('landing')
    }
  }, [selectedFamilyId])

  const healthQuery = useQuery({
    queryKey: ['health'],
    queryFn: api.fetchHealth,
    refetchInterval: 30_000,
  })

  const familiesQuery = useQuery({
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

  const memoryQuery = useQuery({
    queryKey: ['memory', selectedFamily?.family_id],
    queryFn: () => api.fetchMemory(selectedFamily!.family_id),
    enabled: Boolean(selectedFamily),
    placeholderData: selectedFamily ? memoryCache[selectedFamily.family_id] : undefined,
  })

  const createFamilyMutation = useMutation({
    mutationFn: async (data: any) => {
      try {
        return await api.createFamily(data)
      } catch {
        // Mock for UI testing
        return {
          family_id: data.family_id || `mock-${Date.now()}`,
          name: data.name,
          description: data.description || '',
          task_price: data.task_price || 0,
          created_at: new Date().toISOString(),
        }
      }
    },
    onSuccess: (family) => {
      setFormError(null)
      setFamilyForm({ name: '', description: '', family_id: '', task_price: '' })
      queryClient.setQueryData(['families'], (old: any) => [...(old || []), family])
      setSelectedFamilyId(family.family_id)
      setShouldShowIntro(true)
      setView('identity')
    },
    onError: () => {
      // Suppress error for testing
    },
  })

  const chatMutation = useMutation({
    mutationFn: async ({
      familyId,
      content,
      sender,
    }: {
      familyId: string
      content: string
      sender: string
    }) => {
      try {
        return await api.chatWithFamily(familyId, { sender, content })
      } catch {
        return {
          family_id: familyId,
          reply: `[Mock] Received: ${content}`,
          memory: {
            stm: ['Mock STM 1', 'Mock STM 2'],
            ltm: ['Mock LTM Summary'],
            profile: ['Mock Profile Trait'],
          },
          context_used: 'Mock Context Data',
        }
      }
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
    onError: () => setChatError(null),
  })

  const activeFamilyId = selectedFamily?.family_id
  const currentChat = activeFamilyId ? chatLogs[activeFamilyId] ?? [] : []
  const currentMemory = useMemo(() => {
    if (!activeFamilyId) return undefined
    return memoryQuery.data ?? memoryCache[activeFamilyId]
  }, [activeFamilyId, memoryCache, memoryQuery.data])
  const currentContext = activeFamilyId ? contextCache[activeFamilyId] : undefined
  const isBackendHealthy = healthQuery.data?.status === 'ok'
  const senderLabel = selectedMember
    ? `${selectedMember.identity} (${selectedMember.name})`
    : ''

  const handleTaskPriceChange = (value: string) => {
    if (value === '' || value === '-') {
      setFamilyForm((prev) => ({ ...prev, task_price: '' }))
      return
    }
    const numericValue = Number(value)
    if (Number.isNaN(numericValue)) {
      return
    }
    setFamilyForm((prev) => ({
      ...prev,
      task_price: numericValue < 0 ? '0' : value,
    }))
  }

  const handleCreateFamily = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!familyForm.name.trim()) {
      setFormError('Please enter a family name')
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
    })
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
        <AnimatePresence mode="wait">
          {view === 'landing' && (
            <motion.div
              key="landing"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20, filter: 'blur(5px)' }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-1 flex-col items-center justify-center px-6 py-12"
            >
              <div className="mb-16 text-center max-w-2xl">
                <div className="mb-8 inline-flex items-center gap-3 border-b border-stone-300 pb-1">
                  <span className="text-[10px] tracking-[0.3em] uppercase text-stone-500 font-medium">Unibase Family Companion</span>
                </div>
                <h1 className="font-display text-6xl font-normal tracking-tight text-stone-900 sm:text-8xl mb-6 italic">
                  Chain Memory <br/>
                  <span className="not-italic text-5xl sm:text-7xl text-stone-800">Warm Companion</span>
                </h1>
                <p className="mt-8 text-lg text-stone-600 font-light leading-relaxed max-w-lg mx-auto tracking-wide">
                  Create an AI companion with independent memory for your family.
                  <br />
                  <span className="text-sm text-stone-400 mt-2 block uppercase tracking-widest">Data on Membase · Rights on Chain</span>
                </p>
              </div>

              <div className="w-full max-w-md bg-white/0 p-8">
                <form className="space-y-8" onSubmit={handleCreateFamily}>
                  <div className="group relative">
                    <input
                      className="w-full border-b border-stone-300 bg-transparent px-0 py-4 text-xl text-stone-800 placeholder:text-stone-300 outline-none transition-all focus:border-stone-800 font-display"
                      placeholder="Name your family..."
                      value={familyForm.name}
                      onChange={(e) => setFamilyForm((prev) => ({ ...prev, name: e.target.value }))}
                    />
                  </div>
                  <div>
                    <textarea
                      className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-stone-800 placeholder:text-stone-400 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/10"
                      rows={2}
                      placeholder="Family summary (optional)"
                      value={familyForm.description}
                      onChange={(e) =>
                        setFamilyForm((prev) => ({ ...prev, description: e.target.value }))
                      }
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-800 placeholder:text-stone-400 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/10"
                      placeholder="ID (optional)"
                      value={familyForm.family_id}
                      onChange={(e) =>
                        setFamilyForm((prev) => ({ ...prev, family_id: e.target.value }))
                      }
                    />
                    <input
                      type="number"
                      min={0}
                      className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-800 placeholder:text-stone-400 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/10"
                      placeholder="Stake (BNB)"
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
                          <span className="text-sm font-medium tracking-[0.2em] uppercase">Create Family</span>
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
                    Select Existing Family
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                    {families.map((family) => (
                      <button
                        key={family.family_id}
                        onClick={() => {
                          setSelectedFamilyId(family.family_id)
                          setShouldShowIntro(false)
                          setView('identity')
                        }}
                        className="group flex flex-col items-start gap-4 p-6 border border-transparent hover:border-stone-200 transition-all duration-500 hover:bg-white"
                      >
                        <div className="text-4xl font-display italic text-stone-300 group-hover:text-stone-800 transition-colors duration-500">
                          {family.name.slice(0, 1)}
                        </div>
                        <div className="text-left w-full">
                          <div className="h-px w-8 bg-stone-300 mb-4 group-hover:w-full transition-all duration-700 ease-out" />
                          <p className="text-lg font-display text-stone-800">
                            {family.name}
                          </p>
                          <p className="text-[10px] text-stone-400 uppercase tracking-wider mt-1">{family.family_id}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="fixed bottom-8 left-0 right-0 flex justify-center gap-12 text-[10px] uppercase tracking-[0.2em] text-stone-400 font-medium">
                <span className="flex items-center gap-2">
                  <div
                    className={clsx(
                      'h-1 w-1 rounded-full',
                      isBackendHealthy ? 'bg-stone-400' : 'bg-red-400',
                    )}
                  />
                  API {isBackendHealthy ? 'Online' : 'Connecting...'}
                </span>
                <span>Membase Powered</span>
                <span>BNB Chain</span>
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
              className="flex flex-1 flex-col items-center justify-center px-6"
            >
              <div className="mb-16 text-center">
                <span className="text-[10px] tracking-[0.3em] uppercase text-stone-400 font-medium block mb-4">Identity Selection</span>
                <h2 className="text-5xl font-display font-normal text-stone-900 italic mb-4">Who are you?</h2>
                <div className="w-12 h-px bg-stone-300 mx-auto" />
              </div>

              <div className="grid w-full max-w-3xl grid-cols-2 gap-8 sm:grid-cols-4">
                {availableSenders.map((option, index) => {
                  const isSelected =
                    selectedMember?.name === option.name &&
                    selectedMember?.identity === option.identity
                  return (
                    <button
                      key={`${option.name}-${option.identity}-${index}`}
                      onClick={() => setSelectedMember(option)}
                      className={`group relative aspect-[3/4] flex flex-col items-center justify-center gap-4 transition-all duration-500
                        ${
                          isSelected
                            ? 'bg-stone-100'
                            : 'bg-transparent hover:bg-stone-50'
                        }`}
                    >
                      <div className={`absolute inset-0 border border-stone-200 transition-all duration-500 ${isSelected ? 'border-stone-800' : 'group-hover:border-stone-400'}`} />

                      <span className={`text-4xl font-display italic transition-colors duration-500 ${isSelected ? 'text-stone-900' : 'text-stone-300 group-hover:text-stone-600'}`}>
                        {option.name.slice(0, 1)}
                      </span>
                      <div className="text-center space-y-1">
                        <p className={`text-base font-display transition-colors duration-500 ${isSelected ? 'text-stone-900' : 'text-stone-500 group-hover:text-stone-700'}`}>
                          {option.name}
                        </p>
                        <p className={`text-xs uppercase tracking-[0.2em] transition-colors duration-500 ${isSelected ? 'text-stone-900' : 'text-stone-400 group-hover:text-stone-600'}`}>
                          {option.identity}
                        </p>
                      </div>
                    </button>
                  )
                })}

                {/* Add New Member Button */}
                {isAddingMember ? (
                  <div className="col-span-2 aspect-[3/2] p-8 border border-stone-200 bg-white flex flex-col justify-center gap-6 animate-in fade-in zoom-in-95 duration-500">
                    <div className="flex justify-between items-center border-b border-stone-100 pb-2">
                      <span className="text-[10px] uppercase tracking-[0.2em] text-stone-400">New Member</span>
                      <button
                        onClick={() => setIsAddingMember(false)}
                        className="text-stone-400 hover:text-stone-800 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex flex-col gap-4">
                      <input
                        type="text"
                        value={newMemberName}
                        onChange={(e) => setNewMemberName(e.target.value)}
                        placeholder="Name..."
                        className="w-full border-b border-stone-200 py-2 text-xl font-display italic text-stone-800 placeholder:text-stone-300 outline-none focus:border-stone-800 transition-colors bg-transparent"
                        autoFocus
                      />
                      <input
                        type="text"
                        value={newMemberIdentity}
                        onChange={(e) => setNewMemberIdentity(e.target.value)}
                        placeholder="Identity..."
                        className="w-full border-b border-stone-200 py-2 text-xl font-display italic text-stone-800 placeholder:text-stone-300 outline-none focus:border-stone-800 transition-colors bg-transparent"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && newMemberName.trim() && newMemberIdentity.trim()) {
                            const newOption: IdentityOption = {
                              name: newMemberName.trim(),
                              identity: newMemberIdentity.trim(),
                            }
                            setAvailableSenders([...availableSenders, newOption])
                            setSelectedMember(newOption)
                            setNewMemberName('')
                            setNewMemberIdentity('')
                            setIsAddingMember(false)
                          }
                        }}
                      />
                      <button
                        onClick={() => {
                          if (newMemberName.trim() && newMemberIdentity.trim()) {
                            const newOption: IdentityOption = {
                              name: newMemberName.trim(),
                              identity: newMemberIdentity.trim(),
                            }
                            setAvailableSenders([...availableSenders, newOption])
                            setSelectedMember(newOption)
                            setNewMemberName('')
                            setNewMemberIdentity('')
                            setIsAddingMember(false)
                          }
                        }}
                        disabled={!newMemberName.trim() || !newMemberIdentity.trim()}
                        className="self-end text-[10px] uppercase tracking-[0.2em] text-stone-900 hover:text-stone-500 disabled:text-stone-300 transition-colors"
                      >
                        Confirm
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setIsAddingMember(true)}
                    className="col-span-2 aspect-[3/2] border border-dashed border-stone-200 text-stone-300 hover:border-stone-400 hover:text-stone-500 hover:bg-stone-50 transition-all duration-500 flex flex-col items-center justify-center gap-4 group"
                  >
                    <Plus className="w-6 h-6 opacity-50 group-hover:opacity-100 transition-opacity" />
                    <span className="text-[10px] uppercase tracking-[0.2em]">Add Member</span>
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
                  <span className="text-xs font-medium tracking-[0.3em] uppercase text-stone-900 group-hover:text-stone-600 transition-colors">Enter Family</span>
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
                      Welcome
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
                      Your Family Companion
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
              <header className="flex items-center justify-between px-8 py-6 bg-surface-50 border-b border-stone-200">
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
                      ID: {selectedFamily?.family_id} · On Chain
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-8">
                  <div className="hidden items-center gap-3 text-xs tracking-widest uppercase text-stone-500 sm:flex">
                    <span className="w-2 h-2 rounded-full bg-stone-300" />
                    <span>Identity: {selectedMember ? senderLabel : 'Unset'}</span>
                    <button
                      onClick={() => setView('identity')}
                      className="text-stone-900 border-b border-stone-300 hover:border-stone-900 transition-colors pb-0.5"
                    >
                      Switch
                    </button>
                  </div>
                  <button
                    onClick={() =>
                      activeFamilyId &&
                      queryClient.invalidateQueries({ queryKey: ['memory', activeFamilyId] })
                    }
                    className="text-stone-400 hover:text-stone-900 transition-colors"
                  >
                    <RefreshCcw size={18} strokeWidth={1.5} />
                  </button>
                </div>
              </header>

              <main className="flex flex-1 overflow-hidden">
                {/* Chat Area */}
                <div className="flex flex-1 flex-col border-r border-stone-200 bg-surface-50">
                  <div className="flex-1 overflow-y-auto p-8">
                    {currentChat.length === 0 ? (
                      <div className="flex h-full flex-col items-center justify-center text-stone-300">
                        <Bot size={32} strokeWidth={1} className="mb-6 opacity-50" />
                        <p className="font-display italic text-2xl text-stone-400">Start conversation with {selectedFamily?.name}</p>
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
                              {msg.role === 'user' ? 'ME' : 'AI'}
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
                          placeholder={`Message as ${senderLabel || 'Guest'}...`}
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
                    <span className="text-[10px] font-medium uppercase tracking-[0.3em] text-stone-400">Memory State</span>
                  </div>

                  <div className="space-y-12">
                    {/* Context */}
                    {currentContext && (
                      <div>
                        <div className="mb-4 flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-stone-500">
                          <span className="w-1.5 h-1.5 rounded-full bg-stone-400" />
                          <span>Active Context</span>
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
                          {key === 'stm' && 'Short-term Memory'}
                          {key === 'ltm' && 'Long-term Memory'}
                          {key === 'profile' && 'Family Profile'}
                        </p>
                        <div className="space-y-4">
                          {currentMemory?.[key]?.length ? (
                            currentMemory[key].map((item, i) => (
                              <div
                                key={i}
                                className="border-b border-stone-100 pb-3 text-sm font-light text-stone-600 leading-relaxed"
                              >
                                {item}
                              </div>
                            ))
                          ) : (
                            <div className="text-[10px] uppercase tracking-widest text-stone-300 italic">
                              Empty
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </main>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

export default App
