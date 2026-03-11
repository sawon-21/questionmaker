/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI } from "@google/genai";
import { Toaster, toast } from 'react-hot-toast';
import Joyride from 'react-joyride';
import { 
  PlusSquare, 
  Library, 
  FileText, 
  Settings, 
  Save, 
  FolderOpen, 
  Trash2, 
  Edit3, 
  Printer, 
  SlidersHorizontal, 
  Palette, 
  Key, 
  CloudCog, 
  Info,
  Sparkles,
  Plus,
  AlertTriangle
} from 'lucide-react';

// Types
interface Question {
  q: string;
  a: string;
  b: string;
  c: string;
  d: string;
}

interface SavedPaper {
  id: string;
  name: string;
  formData: {
    className: string;
    subjectName: string;
    examName: string;
    marks: string;
    time: string;
  };
  questions: Question[];
  createdAt: number;
}

const STORAGE_KEY = 'smartQuestionBank';
const HEADER_STORAGE_KEY = 'smartQuestionHeader';
const SAVED_PAPERS_KEY = 'smartSavedPapers';
const API_KEYS_KEY = 'smartApiKeys';

export default function App() {
  // State
  const [questions, setQuestions] = useState<Question[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse questions", e);
      }
    }
    return [];
  });

  const [formData, setFormData] = useState(() => {
    const saved = localStorage.getItem(HEADER_STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse header data", e);
      }
    }
    return {
      className: '',
      subjectName: '',
      examName: '',
      marks: '',
      time: ''
    };
  });

  const [savedPapers, setSavedPapers] = useState<SavedPaper[]>(() => {
    const saved = localStorage.getItem(SAVED_PAPERS_KEY);
    return saved ? JSON.parse(saved) : [];
  });

  const [apiKeys, setApiKeys] = useState<string[]>(() => {
    const saved = localStorage.getItem(API_KEYS_KEY);
    return saved ? JSON.parse(saved) : [];
  });

  const [newQuestion, setNewQuestion] = useState<Question>({ q: '', a: '', b: '', c: '', d: '' });
  const [rawInput, setRawInput] = useState('');
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingQuestion, setEditingQuestion] = useState<Question>({ q: '', a: '', b: '', c: '', d: '' });
  
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<number | null>(null);
  
  // New Modals
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showLoadModal, setShowLoadModal] = useState(false);
  const [paperNameInput, setPaperNameInput] = useState('');
  const [apiKeyInput, setApiKeyInput] = useState('');
  
  const [activeTab, setActiveTab] = useState<'create' | 'bank' | 'preview' | 'settings'>('create');
  const [apiKeyToDelete, setApiKeyToDelete] = useState<number | null>(null);
  const [lastSavedTime, setLastSavedTime] = useState<string>('');
  const [showCustomizePanel, setShowCustomizePanel] = useState(false);
  const [isNavVisible, setIsNavVisible] = useState(true);
  const lastScrollY = useRef(0);
  
  const [printSettings, setPrintSettings] = useState({
    fontSize: 14.5,
    lineSpacing: 1.48,
    questionGap: 0.9,
    columnCount: 2,
    headerSize: 1.4,
    instituteFontSize: 24,
    optionGap: 0.1,
    optionFontSize: 14.5
  });

  // Joyride State
  const [runTour, setRunTour] = useState(false);
  const [tourSteps] = useState([
    {
      target: '.tour-step-1',
      content: 'এখানে আপনার পরীক্ষার সাধারণ তথ্য (শ্রেণী, বিষয়, সময় ইত্যাদি) দিন।',
      disableBeacon: true,
    },
    {
      target: '.tour-step-2',
      content: 'এখানে অগোছালো প্রশ্ন পেস্ট করে AI এর মাধ্যমে এক ক্লিকে সাজিয়ে নিতে পারেন!',
    },
    {
      target: '.tour-step-3',
      content: 'ম্যানুয়ালি প্রশ্ন যোগ করতে এখানে টাইপ করুন।',
    },
    {
      target: '.tour-step-4',
      content: 'আপনার তৈরি করা সব প্রশ্ন এখানে দেখতে পাবেন।',
    },
    {
      target: '.tour-step-5',
      content: 'প্রশ্নপত্র প্রিন্ট করতে বা কাস্টমাইজ করতে এখানে ক্লিক করুন।',
    },
    {
      target: '.tour-step-6',
      content: 'AI ফিচার ব্যবহার করতে এখানে আপনার Gemini API Key সেট করুন।',
    }
  ]);

  useEffect(() => {
    const hasSeenTour = localStorage.getItem('hasSeenTour');
    if (!hasSeenTour) {
      setRunTour(true);
    }
  }, []);

  const handleJoyrideCallback = (data: any) => {
    const { status } = data;
    const finishedStatuses: string[] = ['finished', 'skipped'];
    if (finishedStatuses.includes(status)) {
      setRunTour(false);
      localStorage.setItem('hasSeenTour', 'true');
    }
  };

  // Scroll listener for auto-hide navbar
  useEffect(() => {
    const handleScroll = () => {
      if (window.innerWidth >= 768) {
        setIsNavVisible(true);
        return;
      }
      const currentScrollY = window.scrollY;
      if (currentScrollY > lastScrollY.current && currentScrollY > 50) {
        setIsNavVisible(false);
      } else {
        setIsNavVisible(true);
      }
      lastScrollY.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Persistence Effects
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(questions));
    setLastSavedTime(new Date().toLocaleTimeString('bn-BD'));
  }, [questions]);

  useEffect(() => {
    localStorage.setItem(HEADER_STORAGE_KEY, JSON.stringify(formData));
    setLastSavedTime(new Date().toLocaleTimeString('bn-BD'));
  }, [formData]);

  useEffect(() => {
    localStorage.setItem(SAVED_PAPERS_KEY, JSON.stringify(savedPapers));
  }, [savedPapers]);

  useEffect(() => {
    localStorage.setItem(API_KEYS_KEY, JSON.stringify(apiKeys));
  }, [apiKeys]);

  // Validation
  const validateHeader = () => {
    const { className, subjectName, examName, marks, time } = formData;
    if (!className || !subjectName || !examName || !marks || !time) {
      toast.error('অনুগ্রহ করে উপরের সব তথ্য (শ্রেণী, বিষয়, ইত্যাদি) পূরণ করুন।');
      return false;
    }
    return true;
  };

  // Handlers
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleNewQuestionChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    const keyMap: Record<string, keyof Question> = {
      'qtext': 'q',
      'opt1': 'a',
      'opt2': 'b',
      'opt3': 'c',
      'opt4': 'd'
    };
    const key = keyMap[id];
    if (key) {
      setNewQuestion(prev => ({ ...prev, [key]: value }));
    }
  };

  const addQuestion = () => {
    if (!validateHeader()) return;

    const { q, a, b, c, d } = newQuestion;
    if (q && a && b && c && d) {
      setQuestions(prev => [...prev, { q, a, b, c, d }]);
      setNewQuestion({ q: '', a: '', b: '', c: '', d: '' });
      setRawInput('');
      toast.success('প্রশ্ন সফলভাবে যোগ হয়েছে!');
    } else {
      toast.error('সব ঘর পূরণ করুন!');
    }
  };

  const createNewQuestionSet = () => {
    if (questions.length > 0) {
      // Auto-save the current set
      const autoName = `${formData.className || 'Class'} - ${formData.subjectName || 'Subject'} - ${formData.examName || 'Exam'} (${new Date().toLocaleDateString('bn-BD')})`;
      const newPaper: SavedPaper = {
        id: Date.now().toString(),
        name: autoName,
        formData: { ...formData },
        questions: [...questions],
        createdAt: Date.now()
      };
      setSavedPapers(prev => [newPaper, ...prev]);
      toast.success(`অটো-সেভ করা হয়েছে: ${autoName}`);
    }
    
    // Clear questions but retain formData for the new set
    setQuestions([]);
    toast.success('নতুন প্রশ্ন সেট তৈরি করা হয়েছে! পূর্বের তথ্য রাখা হয়েছে।', { icon: 'ℹ️' });
  };

  const savePaper = () => {
    if (!paperNameInput.trim()) {
      toast.error('অনুগ্রহ করে প্রশ্নপত্রের একটি নাম দিন।');
      return;
    }
    
    const existing = savedPapers.find(p => p.name.toLowerCase() === paperNameInput.trim().toLowerCase());
    if (existing) {
      toast.error('এই নামের একটি প্রশ্নপত্র ইতিমধ্যে সেভ করা আছে। দয়া করে অন্য নাম দিন।');
      return;
    }
    
    const newPaper: SavedPaper = {
      id: Date.now().toString(),
      name: paperNameInput.trim(),
      formData,
      questions,
      createdAt: Date.now()
    };

    setSavedPapers(prev => [newPaper, ...prev]);
    setShowSaveModal(false);
    setPaperNameInput('');
    toast.success('প্রশ্নপত্র সফলভাবে সেভ করা হয়েছে!');
  };

  const loadPaper = (paper: SavedPaper) => {
    if (questions.length > 0 && !window.confirm("বর্তমান প্রশ্নপত্রটি মুছে যাবে। আপনি কি নিশ্চিত?")) {
      return;
    }
    setFormData(paper.formData);
    setQuestions(paper.questions);
    setShowLoadModal(false);
    toast.success(`"${paper.name}" লোড করা হয়েছে!`);
  };

  const deleteSavedPaper = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm("আপনি কি নিশ্চিতভাবে এই সেভ করা ফাইলটি মুছে ফেলতে চান?")) {
      setSavedPapers(prev => prev.filter(p => p.id !== id));
      toast.success('ফাইল মুছে ফেলা হয়েছে।', { icon: '🗑️' });
    }
  };

  const addApiKey = () => {
    if (apiKeyInput.trim()) {
      setApiKeys(prev => [...prev, apiKeyInput.trim()]);
      setApiKeyInput('');
      toast.success('API Key যোগ করা হয়েছে!');
    }
  };

  const confirmDeleteApiKey = (index: number) => {
    setApiKeyToDelete(index);
  };

  const executeDeleteApiKey = () => {
    if (apiKeyToDelete !== null) {
      setApiKeys(prev => prev.filter((_, i) => i !== apiKeyToDelete));
      setApiKeyToDelete(null);
      toast.success('API Key মুছে ফেলা হয়েছে।', { icon: '🗑️' });
    }
  };

  const deleteQuestion = (index: number) => {
    confirmDelete(index);
  };

  const confirmDelete = (index: number) => {
    setShowDeleteConfirm(index);
  };

  const executeDelete = () => {
    if (showDeleteConfirm !== null) {
        setQuestions(prev => prev.filter((_, i) => i !== showDeleteConfirm));
        setShowDeleteConfirm(null);
        toast.success('প্রশ্ন সফলভাবে মুছে ফেলা হয়েছে!', { icon: '🗑️' });
    }
  };

  const cancelDelete = () => {
    setShowDeleteConfirm(null);
  };

  const openEditModal = (index: number) => {
    setEditingIndex(index);
    setEditingQuestion({ ...questions[index] });
    setShowEditModal(true);
  };

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    const keyMap: Record<string, keyof Question> = {
      'editQtext': 'q',
      'editOpt1': 'a',
      'editOpt2': 'b',
      'editOpt3': 'c',
      'editOpt4': 'd'
    };
    const key = keyMap[id];
    if (key) {
      setEditingQuestion(prev => ({ ...prev, [key]: value }));
    }
  };

  const updateQuestion = () => {
    if (editingIndex !== null) {
      const { q, a, b, c, d } = editingQuestion;
      if (q && a && b && c && d) {
        const updatedQuestions = [...questions];
        updatedQuestions[editingIndex] = editingQuestion;
        setQuestions(updatedQuestions);
        setShowEditModal(false);
        toast.success('প্রশ্ন সফলভাবে আপডেট হয়েছে!');
      } else {
        toast.error('সব ঘর পূরণ করুন!');
      }
    }
  };

  const handlePrint = () => {
    if (!validateHeader()) return;
    window.print();
  };

  // AI Integration
  const handleAIParse = async () => {
    if (!validateHeader()) return;

    if (!rawInput.trim()) {
        toast.error('অনুগ্রহ করে টেক্সট বক্সে প্রশ্ন পেস্ট করুন।');
        return;
    }
    
    // API Key Rotation Strategy
    const allKeys = [process.env.GEMINI_API_KEY, ...apiKeys].filter(Boolean) as string[];
    
    if (allKeys.length === 0) {
        toast.error('কোনো API Key পাওয়া যায়নি। সেটিংসে গিয়ে Key যোগ করুন।');
        return;
    }

    // Pick a random key to distribute load
    const randomKey = allKeys[Math.floor(Math.random() * allKeys.length)];

    setIsProcessingAI(true);
    try {
        const ai = new GoogleGenAI({ apiKey: randomKey });
        
        const prompt = `
            Parse the following text into a list of multiple choice question objects.
            The text might contain multiple questions. Extract each question and its 4 options.
            If options are not clearly labeled, infer them or generate plausible ones if the text implies a question.
            
            Return ONLY a JSON array of objects with this structure:
            [
              {
                  "q": "The question text",
                  "a": "Option A",
                  "b": "Option B",
                  "c": "Option C",
                  "d": "Option D"
              }
            ]
            
            Text to parse:
            ${rawInput}
        `;

        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: prompt,
        });
        const responseText = response.text || "";
        
        const jsonString = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
        let parsed = JSON.parse(jsonString);

        if (!Array.isArray(parsed)) {
            parsed = [parsed];
        }

        const validQuestions = parsed.filter((item: any) => item.q && item.a && item.b && item.c && item.d);

        if (validQuestions.length > 0) {
            setQuestions(prev => [...prev, ...validQuestions]);
            setRawInput('');
            toast.success(`${validQuestions.length} টি প্রশ্ন সফলভাবে যোগ করা হয়েছে!`);
        } else {
            toast.error('কোনো বৈধ প্রশ্ন পাওয়া যায়নি।');
        }

    } catch (error) {
        console.error("AI Parse Error:", error);
        toast.error('AI প্রসেসিং এ সমস্যা হয়েছে। অন্য API Key চেষ্টা করুন বা পরে আবার চেষ্টা করুন।');
    } finally {
        setIsProcessingAI(false);
    }
  };

  return (
    <>
      <Joyride
        steps={tourSteps}
        run={runTour}
        continuous={true}
        showProgress={true}
        showSkipButton={true}
        callback={handleJoyrideCallback}
        styles={{
          options: {
            primaryColor: '#2563eb',
            zIndex: 10000,
          }
        }}
        locale={{
          back: 'পেছনে',
          close: 'বন্ধ',
          last: 'শেষ',
          next: 'পরবর্তী',
          skip: 'এড়িয়ে যান'
        }}
      />
      <Toaster 
        position="top-center" 
        toastOptions={{
          style: {
            borderRadius: '12px',
            background: '#333',
            color: '#fff',
            fontSize: '14px',
            padding: '12px 16px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.15)'
          },
          success: {
            iconTheme: {
              primary: '#10b981',
              secondary: '#fff',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }} 
      />

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm !== null && (
        <>
            <div className="modal-backdrop fade show"></div>
            <div className="modal fade show" style={{ display: 'block' }} tabIndex={-1}>
                <div className="modal-dialog modal-dialog-centered">
                    <div className="modal-content">
                        <div className="modal-header bg-danger text-white">
                            <h5 className="modal-title">সতর্কতা</h5>
                        </div>
                        <div className="modal-body">
                            <p>আপনি কি নিশ্চিতভাবে এই প্রশ্নটি মুছে ফেলতে চান?</p>
                        </div>
                        <div className="modal-footer">
                            <button type="button" className="btn btn-secondary" onClick={cancelDelete}>না</button>
                            <button type="button" className="btn btn-danger" onClick={executeDelete}>হ্যাঁ, মুছুন</button>
                        </div>
                    </div>
                </div>
            </div>
        </>
      )}

      {/* API Key Delete Confirmation Modal */}
      {apiKeyToDelete !== null && (
        <>
            <div className="modal-backdrop fade show" style={{ zIndex: 1050 }}></div>
            <div className="modal fade show" style={{ display: 'block', zIndex: 1055 }} tabIndex={-1}>
                <div className="modal-dialog modal-dialog-centered">
                    <div className="modal-content border-danger">
                        <div className="modal-header bg-danger text-white">
                            <h5 className="modal-title"><AlertTriangle size={20} className="me-2 text-warning" /> সতর্কতা</h5>
                        </div>
                        <div className="modal-body">
                            <p className="fw-bold text-danger">আপনি কি নিশ্চিতভাবে এই API Key টি মুছে ফেলতে চান?</p>
                            <p className="text-muted small">এই অ্যাকশনটি বাতিল করা যাবে না।</p>
                        </div>
                        <div className="modal-footer">
                            <button type="button" className="btn btn-secondary" onClick={() => setApiKeyToDelete(null)}>বাতিল</button>
                            <button type="button" className="btn btn-danger" onClick={executeDeleteApiKey}>হ্যাঁ, মুছুন</button>
                        </div>
                    </div>
                </div>
            </div>
        </>
      )}

      {/* Settings Modal */}
      {showSettingsModal && (
        <>
          <div className="modal-backdrop fade show"></div>
          <div className="modal fade show" style={{ display: 'block' }} tabIndex={-1}>
            <div className="modal-dialog">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">সেটিংস (API Keys)</h5>
                  <button type="button" className="btn-close" onClick={() => setShowSettingsModal(false)}></button>
                </div>
                <div className="modal-body">
                  <p className="text-muted small">AI Limit এড়াতে এখানে অতিরিক্ত Gemini API Key যোগ করতে পারেন। সিস্টেম অটোমেটিকলি এগুলো ব্যবহার করবে।</p>
                  <div className="input-group mb-3">
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="Paste API Key here" 
                      value={apiKeyInput}
                      onChange={(e) => setApiKeyInput(e.target.value)}
                    />
                    <button className="btn btn-primary" onClick={addApiKey}>Add</button>
                  </div>
                  <ul className="list-group">
                    {apiKeys.map((key, index) => (
                      <li key={index} className="list-group-item d-flex justify-content-between align-items-center">
                        <span className="text-truncate" style={{maxWidth: '300px'}}>{key.substring(0, 8)}...{key.substring(key.length - 4)}</span>
                        <button className="btn btn-sm btn-outline-danger" onClick={() => confirmDeleteApiKey(index)}>&times;</button>
                      </li>
                    ))}
                    {apiKeys.length === 0 && <li className="list-group-item text-center text-muted">কোনো অতিরিক্ত Key নেই</li>}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Save Paper Modal */}
      {showSaveModal && (
        <>
          <div className="modal-backdrop fade show"></div>
          <div className="modal fade show" style={{ display: 'block' }} tabIndex={-1}>
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">প্রশ্নপত্র সেভ করুন</h5>
                  <button type="button" className="btn-close" onClick={() => setShowSaveModal(false)}></button>
                </div>
                <div className="modal-body">
                  <label className="form-label">প্রশ্নপত্রের নাম</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="যেমন: Class 9 Biology Final"
                    value={paperNameInput}
                    onChange={(e) => setPaperNameInput(e.target.value)}
                  />
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-primary" onClick={savePaper}>সেভ করুন</button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Load Paper Modal */}
      {showLoadModal && (
        <>
          <div className="modal-backdrop fade show"></div>
          <div className="modal fade show" style={{ display: 'block' }} tabIndex={-1}>
            <div className="modal-dialog modal-lg">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">সেভ করা প্রশ্নপত্র</h5>
                  <button type="button" className="btn-close" onClick={() => setShowLoadModal(false)}></button>
                </div>
                <div className="modal-body">
                  {savedPapers.length === 0 ? (
                    <p className="text-center text-muted py-4">কোনো সেভ করা প্রশ্নপত্র নেই।</p>
                  ) : (
                    <div className="list-group">
                      {savedPapers.map((paper) => (
                        <button 
                          key={paper.id} 
                          className="list-group-item list-group-item-action d-flex justify-content-between align-items-center"
                          onClick={() => loadPaper(paper)}
                        >
                          <div>
                            <div className="fw-bold">{paper.name}</div>
                            <small className="text-muted">
                              {paper.formData.className} | {paper.formData.subjectName} | {paper.questions.length} প্রশ্ন
                            </small>
                          </div>
                          <span className="btn btn-sm btn-outline-danger" onClick={(e) => deleteSavedPaper(paper.id, e)}>
                            <Trash2 size={16} />
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Navigation Bar */}
      <nav className={`app-nav ${!isNavVisible ? 'nav-hidden' : ''}`}>
        <div className="nav-container">
          <button className={`nav-item ${activeTab === 'create' ? 'active' : ''}`} onClick={() => setActiveTab('create')}>
            <PlusSquare size={20} />
            <span>তৈরি করুন</span>
          </button>
          <button className={`nav-item tour-step-4 ${activeTab === 'bank' ? 'active' : ''}`} onClick={() => setActiveTab('bank')}>
            <Library size={20} />
            <span>প্রশ্ন ব্যাংক</span>
            {questions.length > 0 && <span className="badge bg-primary rounded-pill position-absolute top-0 start-50 translate-middle-x mt-1" style={{fontSize: '0.6rem'}}>{questions.length}</span>}
          </button>
          <button className={`nav-item tour-step-5 ${activeTab === 'preview' ? 'active' : ''}`} onClick={() => setActiveTab('preview')}>
            <FileText size={20} />
            <span>প্রিভিউ</span>
          </button>
          <button className={`nav-item tour-step-6 ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab('settings')}>
            <Settings size={20} />
            <span>সেটিংস</span>
          </button>
        </div>
      </nav>

      <div className="main-content">
      {/* Create Section */}
      <div className={`section-container ${activeTab === 'create' ? 'active' : ''}`}>
      {/* Control Panel */}
      <div className="container mt-4 control-panel">
        <div className="d-flex justify-content-between align-items-center mb-3">
            <div>
              <h4 className="mb-0">স্মার্ট প্রশ্নপত্র তৈরি করুন</h4>
              {lastSavedTime && <small className="text-success" style={{fontSize: '0.75rem'}}><CloudCog size={14} className="d-inline mb-1" /> অটো-ড্রাফট: {lastSavedTime}</small>}
            </div>
            <div>
                <button className="btn btn-sm btn-outline-primary" onClick={() => setShowSaveModal(true)} title="Save">
                    <Save size={16} className="me-1" /> সেভ
                </button>
            </div>
        </div>

        <div className="row g-3 tour-step-1">
          <div className="col-md-3">
            <span className="input-label">শ্রেণী <span className="text-danger">*</span></span>
            <input id="className" className={`form-control ${!formData.className ? 'border-warning' : ''}`} placeholder="যেমন: নবম" value={formData.className} onChange={handleInputChange} required />
          </div>
          <div className="col-md-3">
            <span className="input-label">বিষয় <span className="text-danger">*</span></span>
            <input id="subjectName" className={`form-control ${!formData.subjectName ? 'border-warning' : ''}`} placeholder="যেমন: জীববিজ্ঞান" value={formData.subjectName} onChange={handleInputChange} required />
          </div>
          <div className="col-md-3">
            <span className="input-label">পরীক্ষার ধরণ <span className="text-danger">*</span></span>
            <input id="examName" className={`form-control ${!formData.examName ? 'border-warning' : ''}`} placeholder="যেমন: মডেল টেস্ট" value={formData.examName} onChange={handleInputChange} required />
          </div>
          <div className="col-md-3">
            <span className="input-label">পূর্ণমান <span className="text-danger">*</span></span>
            <input id="marks" className={`form-control ${!formData.marks ? 'border-warning' : ''}`} placeholder="যেমন: ২৫" value={formData.marks} onChange={handleInputChange} required />
          </div>
          <div className="col-md-3">
            <span className="input-label">সময় <span className="text-danger">*</span></span>
            <input id="time" className={`form-control ${!formData.time ? 'border-warning' : ''}`} placeholder="যেমন: ২৫ মিনিট" value={formData.time} onChange={handleInputChange} required />
          </div>
        </div>

        <hr className="my-3" />

        {/* AI Smart Paste Section */}
        <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-100 tour-step-2">
            <h6 className="mb-2 text-blue-800 flex items-center gap-2">
                <Sparkles size={16} /> স্মার্ট প্রশ্ন জেনারেটর (AI)
            </h6>
            <div className="mb-2">
                <textarea 
                    className="form-control" 
                    rows={6} 
                    placeholder="এখানে অগোছালো প্রশ্ন পেস্ট করুন (যেমন: 'বাংলাদেশের রাজধানী কি? ক. ঢাকা খ. চট্টগ্রাম...') এবং AI বাটনে ক্লিক করুন।"
                    value={rawInput}
                    onChange={(e) => setRawInput(e.target.value)}
                ></textarea>
            </div>
            <button 
                className="btn btn-primary w-auto" 
                onClick={handleAIParse}
                disabled={isProcessingAI}
            >
                {isProcessingAI ? (
                    <span><span className="spinner-border spinner-border-sm me-2"></span>প্রসেসিং...</span>
                ) : (
                    <span className="d-flex align-items-center gap-2"><Sparkles size={16} /> অটো-ফরম্যাট করুন</span>
                )}
            </button>
        </div>

        <h6 className="mb-2 tour-step-3">প্রশ্ন যোগ করুন / সম্পাদনা করুন</h6>

        <textarea id="qtext" className="form-control mb-2" rows={2} placeholder="প্রশ্ন লিখুন..." value={newQuestion.q} onChange={handleNewQuestionChange}></textarea>

        <div className="row g-2">
          <div className="col-md-6">
            <span className="input-label">বিকল্প ক)</span>
            <input id="opt1" className="form-control" placeholder="বিকল্প ক)" value={newQuestion.a} onChange={handleNewQuestionChange} />
          </div>
          <div className="col-md-6">
            <span className="input-label">বিকল্প খ)</span>
            <input id="opt2" className="form-control" placeholder="বিকল্প খ)" value={newQuestion.b} onChange={handleNewQuestionChange} />
          </div>
          <div className="col-md-6">
            <span className="input-label">বিকল্প গ)</span>
            <input id="opt3" className="form-control" placeholder="বিকল্প গ)" value={newQuestion.c} onChange={handleNewQuestionChange} />
          </div>
          <div className="col-md-6">
            <span className="input-label">বিকল্প ঘ)</span>
            <input id="opt4" className="form-control" placeholder="বিকল্প ঘ)" value={newQuestion.d} onChange={handleNewQuestionChange} />
          </div>
        </div>

        <div className="mt-3 action-button-group">
          <button className="btn btn-success px-3 d-flex align-items-center gap-2" onClick={addQuestion}><Plus size={16} /> প্রশ্ন যোগ করুন</button>
          <button className="btn btn-danger px-3 d-flex align-items-center gap-2" onClick={createNewQuestionSet}><FileText size={16} /> নতুন প্রশ্ন সেট</button>
        </div>
      </div>

      </div>

      {/* Bank Section */}
      <div className={`section-container ${activeTab === 'bank' ? 'active' : ''}`}>
      {/* Question Bank Section */}
      <div className="container question-bank mt-4">
        <h5 className="d-flex align-items-center gap-2"><Library size={20} /> প্রশ্ন ব্যাংক (মোট প্রশ্ন: <span id="totalQuestions">{questions.length}</span>)</h5>
        <div className="question-table">
          <table className="table table-bordered table-hover">
            <thead>
              <tr>
                <th>#</th>
                <th>প্রশ্ন</th>
                <th>বিকল্প ক)</th>
                <th>বিকল্প খ)</th>
                <th>বিকল্প গ)</th>
                <th>বিকল্প ঘ)</th>
                <th>অ্যাকশন</th>
              </tr>
            </thead>
            <tbody>
              {questions.map((item, index) => (
                <tr key={index}>
                  <td>{index + 1}</td>
                  <td>{item.q.substring(0, 30)}{item.q.length > 30 ? '...' : ''}</td>
                  <td>{item.a.substring(0, 15)}{item.a.length > 15 ? '...' : ''}</td>
                  <td>{item.b.substring(0, 15)}{item.b.length > 15 ? '...' : ''}</td>
                  <td>{item.c.substring(0, 15)}{item.c.length > 15 ? '...' : ''}</td>
                  <td>{item.d.substring(0, 15)}{item.d.length > 15 ? '...' : ''}</td>
                  <td className="action-btns">
                    <button className="btn btn-sm btn-primary" onClick={() => openEditModal(index)} title="সম্পাদনা">
                      <Edit3 size={16} />
                    </button>
                    <button className="btn btn-sm btn-danger" onClick={() => deleteQuestion(index)} title="মুছুন">
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      </div>

      {/* Edit Modal */}
      {showEditModal && (
        <>
          <div className="modal-backdrop fade show"></div>
          <div className="modal fade show" style={{ display: 'block' }} tabIndex={-1}>
            <div className="modal-dialog modal-lg">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">প্রশ্ন সম্পাদনা করুন</h5>
                  <button type="button" className="btn-close" onClick={() => setShowEditModal(false)}></button>
                </div>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label">প্রশ্ন</label>
                    <textarea id="editQtext" className="form-control" rows={2} value={editingQuestion.q} onChange={handleEditChange}></textarea>
                  </div>
                  <div className="row g-2">
                    <div className="col-md-6">
                      <label className="form-label">বিকল্প ক)</label>
                      <input id="editOpt1" className="form-control" value={editingQuestion.a} onChange={handleEditChange} />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">বিকল্প খ)</label>
                      <input id="editOpt2" className="form-control" value={editingQuestion.b} onChange={handleEditChange} />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">বিকল্প গ)</label>
                      <input id="editOpt3" className="form-control" value={editingQuestion.c} onChange={handleEditChange} />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">বিকল্প ঘ)</label>
                      <input id="editOpt4" className="form-control" value={editingQuestion.d} onChange={handleEditChange} />
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowEditModal(false)}>বাতিল</button>
                  <button type="button" className="btn btn-primary" onClick={updateQuestion}>আপডেট করুন</button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Preview Section */}
      <div className={`section-container ${activeTab === 'preview' ? 'active' : ''}`}>
      <div className="container mt-4 mb-2 text-center d-flex justify-content-center gap-2 flex-wrap">
          <button className="btn btn-primary px-4 d-flex align-items-center gap-2" onClick={() => setActiveTab('create')}><Edit3 size={16} /> এডিট করুন</button>
          <button className="btn btn-outline-secondary px-4 d-flex align-items-center gap-2" onClick={() => setShowCustomizePanel(!showCustomizePanel)}><SlidersHorizontal size={16} /> কাস্টমাইজ</button>
          <button className="btn btn-dark px-4 d-flex align-items-center gap-2" onClick={handlePrint}><Printer size={16} /> প্রিন্ট / PDF</button>
      </div>
      
      {/* Customize Panel */}
      {showCustomizePanel && (
        <div className="container mb-4">
          <div className="card shadow-sm border-0" style={{ borderRadius: '16px', background: 'rgba(255, 255, 255, 0.9)', backdropFilter: 'blur(10px)' }}>
            <div className="card-body">
              <h6 className="card-title text-primary mb-3 d-flex align-items-center gap-2"><Palette size={16} /> প্রিন্ট সেটিং কাস্টমাইজ করুন</h6>
              <div className="row g-3">
                <div className="col-md-3 col-6">
                  <label className="form-label" style={{fontSize: '12px'}}>প্রতিষ্ঠানের ফন্ট সাইজ ({printSettings.instituteFontSize}px)</label>
                  <input type="range" className="form-range" min="16" max="40" step="1" value={printSettings.instituteFontSize} onChange={(e) => setPrintSettings({...printSettings, instituteFontSize: parseFloat(e.target.value)})} />
                </div>
                <div className="col-md-3 col-6">
                  <label className="form-label" style={{fontSize: '12px'}}>হেডার ফন্ট সাইজ ({printSettings.headerSize}rem)</label>
                  <input type="range" className="form-range" min="0.8" max="2" step="0.1" value={printSettings.headerSize} onChange={(e) => setPrintSettings({...printSettings, headerSize: parseFloat(e.target.value)})} />
                </div>
                <div className="col-md-3 col-6">
                  <label className="form-label" style={{fontSize: '12px'}}>প্রশ্নের ফন্ট সাইজ ({printSettings.fontSize}px)</label>
                  <input type="range" className="form-range" min="10" max="24" step="0.5" value={printSettings.fontSize} onChange={(e) => setPrintSettings({...printSettings, fontSize: parseFloat(e.target.value)})} />
                </div>
                <div className="col-md-3 col-6">
                  <label className="form-label" style={{fontSize: '12px'}}>অপশনের ফন্ট সাইজ ({printSettings.optionFontSize}px)</label>
                  <input type="range" className="form-range" min="10" max="24" step="0.5" value={printSettings.optionFontSize} onChange={(e) => setPrintSettings({...printSettings, optionFontSize: parseFloat(e.target.value)})} />
                </div>
                <div className="col-md-3 col-6">
                  <label className="form-label" style={{fontSize: '12px'}}>লাইনের দূরত্ব ({printSettings.lineSpacing})</label>
                  <input type="range" className="form-range" min="1" max="2.5" step="0.05" value={printSettings.lineSpacing} onChange={(e) => setPrintSettings({...printSettings, lineSpacing: parseFloat(e.target.value)})} />
                </div>
                <div className="col-md-3 col-6">
                  <label className="form-label" style={{fontSize: '12px'}}>প্রশ্নের মাঝে গ্যাপ ({printSettings.questionGap}rem)</label>
                  <input type="range" className="form-range" min="0.2" max="2" step="0.1" value={printSettings.questionGap} onChange={(e) => setPrintSettings({...printSettings, questionGap: parseFloat(e.target.value)})} />
                </div>
                <div className="col-md-3 col-6">
                  <label className="form-label" style={{fontSize: '12px'}}>অপশনের মাঝে গ্যাপ ({printSettings.optionGap}rem)</label>
                  <input type="range" className="form-range" min="0" max="1" step="0.05" value={printSettings.optionGap} onChange={(e) => setPrintSettings({...printSettings, optionGap: parseFloat(e.target.value)})} />
                </div>
                <div className="col-md-3 col-6">
                  <label className="form-label" style={{fontSize: '12px'}}>কলাম সংখ্যা</label>
                  <select className="form-select form-select-sm" value={printSettings.columnCount} onChange={(e) => setPrintSettings({...printSettings, columnCount: parseInt(e.target.value)})}>
                    <option value={1}>১ কলাম</option>
                    <option value={2}>২ কলাম</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Paper Container */}
      <div id="papersContainer">
        <div className="paper" id="mainPaper" style={{ fontSize: `${printSettings.fontSize}px`, lineHeight: printSettings.lineSpacing }}>
          <div className="row mb-2">
            <div className="col-8">
              <div className="paper-header text-center">
                <h4 style={{ fontSize: `${printSettings.instituteFontSize}px`, fontFamily: "'Li MAK Sylhet Unicode', 'Noto Sans Bengali', sans-serif" }}>নাজির উদ্দীন মডেল কোচিং সেন্টার</h4>
                <small style={{ fontSize: `${printSettings.headerSize * 0.7}rem` }}>ডাংগী, বালিয়াডাংগী, ঠাকুরগাঁও</small>
                <div id="showExam" className="fw-bold mt-1" style={{ fontSize: `${printSettings.headerSize * 0.9}rem` }}>{formData.examName}</div>
                <div className="mt-1" style={{ fontSize: `${printSettings.headerSize * 0.8}rem` }}>
                  শ্রেণী: <b id="showClass">{formData.className}</b> &nbsp;|&nbsp;
                  বিষয়: <b id="showSubject">{formData.subjectName}</b>
                </div>
                <div style={{ fontSize: `${printSettings.headerSize * 0.8}rem` }}>
                  পূর্ণমান: <b id="showMarks">{formData.marks}</b> &nbsp;|&nbsp;
                  সময়: <b id="showTime">{formData.time}</b>
                </div>
              </div>
            </div>

            <div className="col-4">
              <div className="side-box">
                প্রাপ্ত নম্বরঃ ________________<br /><br />
                নামঃ _________________________<br /><br />
                রোল নংঃ ______________________
              </div>
            </div>
          </div>

          <hr style={{ borderTop: '1.5px solid #333', margin: '10px 0' }} />

          <div id="questionArea" className="question-container" style={{ columnCount: printSettings.columnCount }}>
            {questions.length === 0 ? (
               <div className="text-center text-muted">কোনো প্রশ্ন নেই। অনুগ্রহ করে প্রশ্ন যোগ করুন।</div>
            ) : (
              questions.map((item, index) => (
                <div className="question" key={index} style={{ marginBottom: `${printSettings.questionGap}rem` }}>
                  <b>{index + 1}. {item.q}</b>
                  <div className="option" style={{ marginBottom: `${printSettings.optionGap}rem`, fontSize: `${printSettings.optionFontSize}px` }}>Ⓐ {item.a}</div>
                  <div className="option" style={{ marginBottom: `${printSettings.optionGap}rem`, fontSize: `${printSettings.optionFontSize}px` }}>Ⓑ {item.b}</div>
                  <div className="option" style={{ marginBottom: `${printSettings.optionGap}rem`, fontSize: `${printSettings.optionFontSize}px` }}>Ⓒ {item.c}</div>
                  <div className="option" style={{ marginBottom: `${printSettings.optionGap}rem`, fontSize: `${printSettings.optionFontSize}px` }}>Ⓓ {item.d}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
      </div>

      {/* Settings Section */}
      <div className={`section-container ${activeTab === 'settings' ? 'active' : ''}`}>
        <div className="container mt-4">
          <div className="card shadow-sm border-0 mb-4" style={{ borderRadius: '16px' }}>
            <div className="card-body">
              <h5 className="card-title text-primary mb-4 d-flex align-items-center gap-2"><FolderOpen size={20} /> সেভ করা প্রশ্নপত্র (Load)</h5>
              {savedPapers.length === 0 ? (
                <div className="text-center text-muted py-4">কোনো সেভ করা প্রশ্নপত্র নেই।</div>
              ) : (
                <div className="list-group">
                  {savedPapers.map(paper => (
                    <div key={paper.id} className="list-group-item list-group-item-action d-flex justify-content-between align-items-center" style={{ borderRadius: '10px', marginBottom: '8px', border: '1px solid #e2e8f0' }}>
                      <div onClick={() => loadPaper(paper)} style={{ cursor: 'pointer', flex: 1 }}>
                        <h6 className="mb-1 fw-bold">{paper.name}</h6>
                        <small className="text-muted">
                          {new Date(paper.createdAt).toLocaleString('bn-BD')} | প্রশ্ন: {paper.questions.length}টি
                        </small>
                      </div>
                      <button className="btn btn-sm btn-outline-danger" onClick={(e) => deleteSavedPaper(paper.id, e)}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="card shadow-sm border-0 mb-4" style={{ borderRadius: '16px' }}>
            <div className="card-body">
              <h5 className="card-title text-primary mb-4 d-flex align-items-center gap-2"><Info size={20} /> অ্যাপ সম্পর্কে</h5>
              <div className="mb-4">
                <p><strong>স্মার্ট প্রশ্নপত্র জেনারেটর</strong> হলো একটি AI-চালিত টুল যা শিক্ষকদের খুব সহজেই প্রশ্নপত্র তৈরি করতে সাহায্য করে।</p>
                <ul className="list-unstyled">
                  <li className="mb-2"><span className="text-primary me-2">✓</span> অগোছালো টেক্সট থেকে এক ক্লিকে সাজানো প্রশ্ন তৈরি।</li>
                  <li className="mb-2"><span className="text-primary me-2">✓</span> প্রশ্নপত্র সেভ করে রাখা এবং পরবর্তীতে এডিট করা।</li>
                  <li className="mb-2"><span className="text-primary me-2">✓</span> প্রিন্ট করার আগে ফন্ট সাইজ, গ্যাপ এবং লেআউট কাস্টমাইজ করা।</li>
                </ul>
              </div>
              
              <h6 className="fw-bold text-dark mt-4 mb-3">কিভাবে Gemini API Key সেট করবেন?</h6>
              <ol className="small text-muted ps-3">
                <li className="mb-2">প্রথমে <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer">Google AI Studio</a> তে যান।</li>
                <li className="mb-2">আপনার Google অ্যাকাউন্ট দিয়ে লগইন করুন।</li>
                <li className="mb-2">"Create API Key" বাটনে ক্লিক করুন।</li>
                <li className="mb-2">তৈরি হওয়া Key টি কপি করে নিচের বক্সে পেস্ট করুন এবং "যোগ করুন" এ ক্লিক করুন।</li>
                <li>একাধিক Key যোগ করতে পারেন, যাতে একটির লিমিট শেষ হলে অন্যটি কাজ করে।</li>
              </ol>
            </div>
          </div>

          <div className="card shadow-sm border-0" style={{ borderRadius: '16px' }}>
            <div className="card-body">
              <h5 className="card-title text-primary mb-4 d-flex align-items-center gap-2"><Key size={20} /> API Key সেটিংস</h5>
              <div className="input-group mb-4">
                <input type="password" className="form-control" placeholder="নতুন API Key প্রবেশ করান" value={apiKeyInput} onChange={(e) => setApiKeyInput(e.target.value)} />
                <button className="btn btn-primary" onClick={addApiKey}>যোগ করুন</button>
              </div>

              <h6 className="mb-3">সংরক্ষিত API Keys:</h6>
              {apiKeys.length === 0 ? (
                <div className="text-muted small">কোনো API Key সংরক্ষিত নেই।</div>
              ) : (
                <ul className="list-group">
                  {apiKeys.map((key, index) => (
                    <li key={index} className="list-group-item d-flex justify-content-between align-items-center" style={{ borderRadius: '10px', marginBottom: '8px', border: '1px solid #e2e8f0' }}>
                      <span className="font-monospace text-muted">
                        {key.substring(0, 8)}...{key.substring(key.length - 4)}
                      </span>
                      {apiKeyToDelete === index ? (
                        <div className="d-flex gap-2">
                          <button className="btn btn-sm btn-danger" onClick={executeDeleteApiKey}>হ্যাঁ, মুছুন</button>
                          <button className="btn btn-sm btn-secondary" onClick={() => setApiKeyToDelete(null)}>না</button>
                        </div>
                      ) : (
                        <button className="btn btn-sm btn-outline-danger" onClick={() => confirmDeleteApiKey(index)}>
                          <Trash2 size={16} />
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
              <div className="alert alert-info mt-4 mb-0 d-flex align-items-center gap-2" style={{ borderRadius: '12px', fontSize: '13px' }}>
                <Info size={16} className="flex-shrink-0" />
                API Key আপনার ব্রাউজারেই সংরক্ষিত থাকে। এটি অন্য কোথাও পাঠানো হয় না।
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>
    </>
  );
}
