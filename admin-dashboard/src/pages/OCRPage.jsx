import { useState } from 'react';
import { ocr } from '../services/api';

export default function OCRPage() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [createdNeed, setCreatedNeed] = useState(null);

  function handleFile(e) {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
      setPreview(URL.createObjectURL(f));
      setResult(null);
      setCreatedNeed(null);
      setError(null);
    }
  }

  function handleDrop(e) {
    e.preventDefault();
    e.currentTarget.classList.remove('dragover');
    const f = e.dataTransfer.files?.[0];
    if (f && f.type.startsWith('image/')) {
      setFile(f);
      setPreview(URL.createObjectURL(f));
      setResult(null);
      setCreatedNeed(null);
      setError(null);
    }
  }

  // Step 1: Extract only (preview before creating)
  async function handleExtract() {
    if (!file) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await ocr.extract(file);
      setResult(res);
      // Check if extraction actually failed
      if (!res.raw_text && res.confidence === 0) {
        setError('AI could not extract text. This may be due to API rate limits or image quality. Try again in a minute.');
      }
    } catch (err) {
      const msg = err.message || 'Unknown error';
      if (msg.includes('429') || msg.includes('quota') || msg.includes('rate')) {
        setError('⚠️ Gemini API rate limit reached. Wait 1-2 minutes and try again.');
      } else {
        setError('OCR failed: ' + msg);
      }
    }
    setLoading(false);
  }

  // Step 2: One-click Extract + Create Need with auto-geocoding
  async function handleExtractAndCreate() {
    if (!file) return;
    setLoading(true);
    setError(null);
    setCreatedNeed(null);
    try {
      const res = await ocr.extractAndCreate(file, 0, 0); // 0,0 = let backend geocode
      setCreatedNeed(res);
    } catch (err) {
      const msg = err.message || 'Unknown error';
      if (msg.includes('429') || msg.includes('quota') || msg.includes('rate')) {
        setError('⚠️ Gemini API rate limit reached. Wait 1-2 minutes and try again.');
      } else {
        setError('Extract & Create failed: ' + msg);
      }
    }
    setLoading(false);
  }

  function reset() {
    setFile(null);
    setPreview(null);
    setResult(null);
    setCreatedNeed(null);
    setError(null);
  }

  const catIcons = { medical: '🏥', food: '🍚', shelter: '🏠', water: '💧', rescue: '🚨', education: '📚', clothing: '👕', sanitation: '🧹', other: '📋' };

  return (
    <>
      <div className="page-header">
        <div><h2>📷 OCR Scanner</h2><div className="subtitle">Upload paper surveys → AI extracts data → Auto-creates need with location</div></div>
        {(result || createdNeed || error) && (
          <button className="btn btn-outline" onClick={reset}>🔄 Scan Another</button>
        )}
      </div>

      <div className="page-body">
        {/* Error Banner */}
        {error && (
          <div style={{
            padding: '14px 20px', marginBottom: '20px', borderRadius: '10px',
            background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)',
            color: '#EF4444', fontSize: '14px', fontWeight: 500,
          }}>
            {error}
          </div>
        )}

        {/* Success Banner */}
        {createdNeed && (
          <div style={{
            padding: '16px 20px', marginBottom: '20px', borderRadius: '10px',
            background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)',
            color: '#10B981',
          }}>
            <div style={{ fontWeight: 700, fontSize: '16px', marginBottom: '8px' }}>✅ Need Created Successfully!</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '13px', color: 'var(--text-primary)' }}>
              <div><strong>Title:</strong> {createdNeed.title}</div>
              <div><strong>Category:</strong> {catIcons[createdNeed.category]} {createdNeed.category}</div>
              {createdNeed.ocr_raw_text && <div><strong>Source:</strong> 🌐 Multilingual OCR → English</div>}
              <div><strong>Urgency:</strong> {'🔴'.repeat(createdNeed.urgency)}{'⚪'.repeat(5 - createdNeed.urgency)} ({createdNeed.urgency}/5)</div>
              <div><strong>People:</strong> {createdNeed.people_affected}</div>
              <div><strong>Address:</strong> {createdNeed.address || '—'}</div>
              <div><strong>Location:</strong> {createdNeed.latitude?.toFixed(4)}, {createdNeed.longitude?.toFixed(4)}</div>
            </div>
            <div style={{ marginTop: '8px', fontSize: '12px', color: 'var(--text-muted)' }}>
              View it in Need Tracker or Live Map →
            </div>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          {/* Upload Zone */}
          <div>
            <div className="upload-zone"
              onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add('dragover'); }}
              onDragLeave={e => e.currentTarget.classList.remove('dragover')}
              onDrop={handleDrop}
              onClick={() => document.getElementById('ocr-file-input').click()}>
              <input type="file" id="ocr-file-input" accept="image/*" hidden onChange={handleFile} />
              {preview ? (
                <img src={preview} alt="Preview" style={{ maxWidth: '100%', maxHeight: '300px', borderRadius: '8px' }} />
              ) : (
                <>
                  <div className="upload-icon">📄</div>
                  <p style={{ fontWeight: 600, marginBottom: '4px' }}>Drop an image here or click to upload</p>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Supports: JPG, PNG, WebP (max 10MB)</p>
                </>
              )}
            </div>

            {file && !createdNeed && (
              <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
                <button className="btn btn-outline btn-lg" onClick={handleExtract} disabled={loading}
                  style={{ flex: 1 }}>
                  {loading ? '🔄 Processing...' : '👁️ Preview Extract'}
                </button>
                <button className="btn btn-primary btn-lg" onClick={handleExtractAndCreate} disabled={loading}
                  style={{ flex: 1 }}>
                  {loading ? '🔄 Processing...' : '🚀 Extract & Create Need'}
                </button>
              </div>
            )}
          </div>

          {/* Results */}
          <div>
            {result && (
              <>
                {/* Confidence */}
                <div className="card" style={{ marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '24px' }}>
                      {result.confidence >= 0.8 ? '✅' : result.confidence >= 0.5 ? '⚠️' : '❌'}
                    </span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700 }}>Confidence: {Math.round(result.confidence * 100)}%</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        {result.confidence >= 0.8 ? 'High quality extraction' :
                         result.confidence >= 0.5 ? 'Moderate — review data' :
                         result.confidence > 0 ? 'Low confidence — verify carefully' :
                         'Extraction failed — API limit or poor image quality'}
                      </div>
                    </div>
                    {result.original_language && (
                      <div style={{ padding: '4px 10px', background: 'rgba(168,85,247,0.15)', borderRadius: '8px', fontSize: '12px', color: '#A855F7', fontWeight: 600 }}>
                        🌐 {result.original_language}
                      </div>
                    )}
                  </div>
                </div>

                {/* Raw Text */}
                <div className="card" style={{ marginBottom: '16px' }}>
                  <div className="card-header"><span className="card-title">Extracted Text</span></div>
                  <pre style={{ fontSize: '12px', whiteSpace: 'pre-wrap', color: 'var(--text-secondary)', maxHeight: '200px', overflow: 'auto' }}>
                    {result.raw_text || 'No text extracted — check image quality or API limits'}
                  </pre>
                </div>

                {/* Structured Data */}
                {result.structured_data && (
                  <div className="card" style={{ marginBottom: '16px' }}>
                    <div className="card-header"><span className="card-title">🧠 AI-Structured Data</span></div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
                      <div><strong>Title:</strong> {result.structured_data.title}</div>
                      <div><strong>Category:</strong> {catIcons[result.structured_data.category]} <span className="badge badge-open">{result.structured_data.category}</span></div>
                      <div><strong>Urgency:</strong> {result.structured_data.urgency}/5</div>
                      <div><strong>Location:</strong> {result.structured_data.location_text || '—'}</div>
                      <div><strong>People Affected:</strong> {result.structured_data.people_affected}</div>
                      {result.structured_data.key_issues?.length > 0 && (
                        <div><strong>Key Issues:</strong> {result.structured_data.key_issues.join(', ')}</div>
                      )}
                      <div style={{ marginTop: '4px', color: 'var(--text-muted)', fontSize: '12px' }}>
                        {result.structured_data.description}
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* How it works */}
            {!result && !createdNeed && (
              <div className="card">
                <div className="card-header"><span className="card-title">How It Works</span></div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div>📄 <strong>Upload</strong> — Take a photo of a paper survey or field report</div>
                  <div>🤖 <strong>AI Extract</strong> — Gemini Vision reads the handwriting and extracts structured data</div>
                  <div>🌍 <strong>Auto-Locate</strong> — Location text is auto-geocoded to real coordinates</div>
                  <div>📍 <strong>Map Pin</strong> — Need appears on the Live Map at the correct location</div>
                  <div>🤝 <strong>Match</strong> — Smart Matching finds nearby volunteers</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
