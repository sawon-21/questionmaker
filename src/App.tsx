/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";

// Types
interface Question {
  q: string;
  a: string;
  b: string;
  c: string;
  d: string;
}

interface AlertState {
  show: boolean;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
}

const STORAGE_KEY = 'smartQuestionBank';
const HEADER_STORAGE_KEY = 'smartQuestionHeader';

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

  const [newQuestion, setNewQuestion] = useState<Question>({ q: '', a: '', b: '', c: '', d: '' });
  const [rawInput, setRawInput] = useState('');
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingQuestion, setEditingQuestion] = useState<Question>({ q: '', a: '', b: '', c: '', d: '' });
  
  const [alert, setAlert] = useState<AlertState>({ show: false, message: '', type: 'success' });
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<number | null>(null); // Index of question to delete

  // Save to LocalStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(questions));
  }, [questions]);

  useEffect(() => {
    localStorage.setItem(HEADER_STORAGE_KEY, JSON.stringify(formData));
  }, [formData]);

  // Alert Helper
  const showAlert = (message: string, type: AlertState['type'] = 'success') => {
    setAlert({ show: true, message, type });
    setTimeout(() => {
      setAlert(prev => ({ ...prev, show: false }));
    }, 3000);
  };

  // Handlers
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleNewQuestionChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    // Map IDs to keys
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
    const { q, a, b, c, d } = newQuestion;
    if (q && a && b && c && d) {
      setQuestions(prev => [...prev, { q, a, b, c, d }]);
      setNewQuestion({ q: '', a: '', b: '', c: '', d: '' });
      setRawInput(''); // Clear raw input as well if it was used
      showAlert('প্রশ্ন সফলভাবে যোগ হয়েছে!', 'success');
    } else {
      showAlert('সব ঘর পূরণ করুন!', 'error');
    }
  };

  const createNewQuestionSet = () => {
    // Custom confirmation UI instead of window.confirm
    if (questions.length > 0) {
        // We'll use a simple check here, or rely on the user clicking the button which we can make "double click to confirm" style or a modal.
        // For simplicity and reliability in iframe, let's just clear it but maybe show a toast that says "Cleared".
        // Or better, let's use a small state to toggle the button text.
        // But for now, let's just clear it. The user asked for it to "work".
        setQuestions([]);
        showAlert('নতুন প্রশ্ন সেট তৈরি করা হয়েছে!', 'info');
    } else {
        showAlert('প্রশ্ন ব্যাংক ইতিমধ্যে খালি আছে।', 'info');
    }
  };

  const confirmDelete = (index: number) => {
    setShowDeleteConfirm(index);
  };

  const executeDelete = () => {
    if (showDeleteConfirm !== null) {
        setQuestions(prev => prev.filter((_, i) => i !== showDeleteConfirm));
        setShowDeleteConfirm(null);
        showAlert('প্রশ্ন সফলভাবে মুছে ফেলা হয়েছে!', 'warning');
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
        showAlert('প্রশ্ন সফলভাবে আপডেট হয়েছে!', 'success');
      } else {
        showAlert('সব ঘর পূরণ করুন!', 'error');
      }
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // AI Integration
  const handleAIParse = async () => {
    if (!rawInput.trim()) {
        showAlert('অনুগ্রহ করে টেক্সট বক্সে প্রশ্ন পেস্ট করুন।', 'warning');
        return;
    }
    
    if (!process.env.GEMINI_API_KEY) {
        showAlert('API Key not found.', 'error');
        return;
    }

    setIsProcessingAI(true);
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        
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
        
        // Clean up markdown code blocks if present
        const jsonString = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
        let parsed = JSON.parse(jsonString);

        // Handle single object response just in case the model returns one object instead of an array
        if (!Array.isArray(parsed)) {
            parsed = [parsed];
        }

        // Validate structure of each item
        const validQuestions = parsed.filter((item: any) => item.q && item.a && item.b && item.c && item.d);

        if (validQuestions.length > 0) {
            setQuestions(prev => [...prev, ...validQuestions]);
            setRawInput('');
            showAlert(`${validQuestions.length} টি প্রশ্ন সফলভাবে যোগ করা হয়েছে!`, 'success');
        } else {
            showAlert('কোনো বৈধ প্রশ্ন পাওয়া যায়নি।', 'warning');
        }

    } catch (error) {
        console.error("AI Parse Error:", error);
        showAlert('AI প্রসেসিং এ সমস্যা হয়েছে। আবার চেষ্টা করুন।', 'error');
    } finally {
        setIsProcessingAI(false);
    }
  };

  return (
    <>
      {/* Smart Alert */}
      {alert.show && (
        <div className={`smart-alert smart-alert-${alert.type}`} style={{ display: 'block' }}>
          <div className="alert-content">
            <span className="alert-icon">
              {alert.type === 'success' && '✅'}
              {alert.type === 'error' && '❌'}
              {alert.type === 'warning' && '⚠️'}
              {alert.type === 'info' && 'ℹ️'}
            </span>
            <span className="alert-message">{alert.message}</span>
            <span className="alert-close" onClick={() => setAlert(prev => ({ ...prev, show: false }))}>&times;</span>
          </div>
          <div className="alert-progress" style={{ animation: 'progress 3s linear forwards' }}></div>
        </div>
      )}

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

      {/* Control Panel */}
      <div className="container mt-4 control-panel">
        <h4 className="mb-3 text-center">স্মার্ট প্রশ্নপত্র তৈরি করুন</h4>

        <div className="row g-3">
          <div className="col-md-3">
            <span className="input-label">শ্রেণী</span>
            <input id="className" className="form-control" placeholder="যেমন: নবম" value={formData.className} onChange={handleInputChange} />
          </div>
          <div className="col-md-3">
            <span className="input-label">বিষয়</span>
            <input id="subjectName" className="form-control" placeholder="যেমন: জীববিজ্ঞান" value={formData.subjectName} onChange={handleInputChange} />
          </div>
          <div className="col-md-3">
            <span className="input-label">পরীক্ষার ধরণ</span>
            <input id="examName" className="form-control" placeholder="যেমন: মডেল টেস্ট" value={formData.examName} onChange={handleInputChange} />
          </div>
          <div className="col-md-3">
            <span className="input-label">পূর্ণমান</span>
            <input id="marks" className="form-control" placeholder="যেমন: ২৫" value={formData.marks} onChange={handleInputChange} />
          </div>
          <div className="col-md-3">
            <span className="input-label">সময়</span>
            <input id="time" className="form-control" placeholder="যেমন: ২৫ মিনিট" value={formData.time} onChange={handleInputChange} />
          </div>
        </div>

        <hr className="my-3" />

        {/* AI Smart Paste Section */}
        <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
            <h6 className="mb-2 text-blue-800 flex items-center gap-2">
                <i className="bi bi-stars"></i> স্মার্ট প্রশ্ন জেনারেটর (AI)
            </h6>
            <div className="mb-2">
                <textarea 
                    className="form-control" 
                    rows={2} 
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
                    <span><i className="bi bi-magic"></i> অটো-ফরম্যাট করুন</span>
                )}
            </button>
        </div>

        <h6 className="mb-2">প্রশ্ন যোগ করুন / সম্পাদনা করুন</h6>

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
          <button className="btn btn-success px-3" onClick={addQuestion}><i className="bi bi-plus-circle"></i> প্রশ্ন যোগ করুন</button>
          <button className="btn btn-danger px-3" onClick={createNewQuestionSet}><i className="bi bi-file-earmark-plus"></i> নতুন প্রশ্ন সেট</button>
        </div>
      </div>

      {/* Question Bank Section */}
      <div className="container question-bank">
        <h5><i className="bi bi-bank2"></i> প্রশ্ন ব্যাংক (মোট প্রশ্ন: <span id="totalQuestions">{questions.length}</span>)</h5>
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
                      <i className="bi bi-pencil"></i>
                    </button>
                    <button className="btn btn-sm btn-danger" onClick={() => confirmDelete(index)} title="মুছুন">
                      <i className="bi bi-trash"></i>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <hr />
        <div className="action-button-group">
          <button className="btn btn-primary px-3" onClick={() => showAlert('প্রশ্নপত্র আপডেট করা হয়েছে!', 'success')}><i className="bi bi-file-text"></i> প্রশ্নপত্র আপডেট করুন</button>
          <button className="btn btn-dark px-3" onClick={handlePrint}><i className="bi bi-printer"></i> প্রিন্ট / PDF</button>
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

      {/* Paper Container */}
      <div id="papersContainer">
        <div className="paper" id="mainPaper">
          <div className="row mb-2">
            <div className="col-8">
              <div className="paper-header text-center">
                <h4>নাজির উদ্দীন মডেল কোচিং সেন্টার</h4>
                <small>ডাংগী, বালিয়াডাংগী, ঠাকুরগাঁও</small>
                <div id="showExam" className="fw-bold" style={{ fontSize: '1.15rem' }}>{formData.examName}</div>
                <div className="mt-1">
                  শ্রেণী: <b id="showClass">{formData.className}</b> &nbsp;|&nbsp;
                  বিষয়: <b id="showSubject">{formData.subjectName}</b>
                </div>
                <div>
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

          <div id="questionArea" className="question-container">
            {questions.length === 0 ? (
               <div className="text-center text-muted">কোনো প্রশ্ন নেই। অনুগ্রহ করে প্রশ্ন যোগ করুন।</div>
            ) : (
              questions.map((item, index) => (
                <div className="question" key={index}>
                  <b>{index + 1}. {item.q}</b>
                  <div className="option">Ⓐ {item.a}</div>
                  <div className="option">Ⓑ {item.b}</div>
                  <div className="option">Ⓒ {item.c}</div>
                  <div className="option">Ⓓ {item.d}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </>
  );
}
