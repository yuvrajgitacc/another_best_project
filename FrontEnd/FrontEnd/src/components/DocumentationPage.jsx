import React from 'react';
import { motion } from 'framer-motion';
import Footer from './Footer';
import './DocumentationPage.css';

const navLinks = [
  { group: "Essentials", links: ["Getting Started", "API Overview", "Authentication"] },
  { group: "Endpoints", links: ["Session API", "Upload API", "Candidate API"] },
  { group: "Resources", links: ["Examples", "Code Snippets"] }
];

const scrollToSection = (id) => {
  const element = document.getElementById(id.toLowerCase().replace(/\s+/g, '-'));
  if (element) {
    const y = element.getBoundingClientRect().top + window.scrollY - 100;
    window.scrollTo({ top: y, behavior: 'smooth' });
  }
};

const DocumentationPage = ({ onStart, onNavigate }) => {
  return (
    <main>
      <div className="docs-page-wrapper">
        {/* Sidebar Navigation */}
        <aside className="docs-sidebar">
          {navLinks.map((section, idx) => (
            <div key={idx} className="docs-nav-group">
              <div className="docs-nav-title">{section.group}</div>
              <div className="docs-nav-links">
                {section.links.map(link => (
                  <button 
                    key={link} 
                    className="docs-nav-link"
                    onClick={() => scrollToSection(link)}
                  >
                    {link}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </aside>

        {/* Main Content */}
        <div className="docs-main">
          
          <motion.div 
            className="docs-header"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h1>Vishleshan API Documentation</h1>
            <p>Complete reference for developers integrating Vishleshan Lite's AI-powered recruitment engine into their applications.</p>
          </motion.div>

          {/* Section: Getting Started */}
          <section id="getting-started" className="docs-section">
            <h2>Getting Started</h2>
            <p>Welcome to the Vishleshan API. Using our RESTful API, you can programmatically create hiring sessions, upload bulk resumes, and retrieve AI-parsed candidate ranking lists directly into your ATS.</p>
            <h3>Prerequisites</h3>
            <p>Before you begin, ensure you have signed up for a Business or Enterprise account to access API capabilities. You will need your unique API key generated from the dashboard.</p>
          </section>

          {/* Section: API Overview */}
          <section id="api-overview" className="docs-section">
            <h2>API Overview</h2>
            <p>The API is organized around standard REST principles. Our API has predictable, resource-oriented URLs, returns JSON-encoded responses, and uses standard HTTP response codes.</p>
            <p><strong>Base URL:</strong> <code>https://api.vishleshan.io/v1</code></p>
          </section>

          {/* Section: Authentication */}
          <section id="authentication" className="docs-section">
            <h2>Authentication</h2>
            <p>Authenticate your API requests by including your API key in the Authorization header. Do not share your API key in publicly accessible areas.</p>
            <div className="mock-code-block">
              <pre>
<span className="code-comment">// Authenticate via HTTP Header</span><br/>
Authorization: Bearer <span className="code-string">YOUR_API_KEY_HERE</span>
              </pre>
            </div>
          </section>

          {/* Section: Session API */}
          <section id="session-api" className="docs-section">
            <h2>Create Session API</h2>
            <p>A "Session" represents a unique job opening. You must create a session before uploading resumes to establish the context for AI scoring.</p>
            
            <div className="mock-code-block">
              <pre>
<span className="code-keyword">POST</span> /sessions<br/><br/>
<span className="code-comment">// Request Body</span><br/>
&#123;<br/>
  <span className="code-string">"title"</span>: <span className="code-string">"Senior React Developer"</span>,<br/>
  <span className="code-string">"job_description"</span>: <span className="code-string">"Detailed job description text..."</span>,<br/>
  <span className="code-string">"required_skills"</span>: [<span className="code-string">"React"</span>, <span className="code-string">"Redux"</span>, <span className="code-string">"TypeScript"</span>]<br/>
&#125;
              </pre>
            </div>
            
            <table className="param-table">
              <thead>
                <tr><th>Parameter</th><th>Type</th><th>Description</th></tr>
              </thead>
              <tbody>
                <tr><td>title</td><td>String</td><td>The name of the job title.</td></tr>
                <tr><td>job_description</td><td>String</td><td>Raw text describing the job context.</td></tr>
                <tr><td>required_skills</td><td>Array</td><td>Explicit keywords the AI must weigh heavily.</td></tr>
              </tbody>
            </table>
          </section>

          {/* Section: Upload API */}
          <section id="upload-api" className="docs-section">
            <h2>Resume Upload API</h2>
            <p>Upload a batch of resumes to a specific session ID. Supports PDF and DOCX formats.</p>
            <div className="mock-code-block">
              <pre>
<span className="code-keyword">POST</span> /sessions/<span className="code-string">&#123;session_id&#125;</span>/upload<br/><br/>
<span className="code-comment">// Form-Data</span><br/>
files: [resume1.pdf, resume2.docx]
              </pre>
            </div>
          </section>

          {/* Section: Candidate API */}
          <section id="candidate-api" className="docs-section">
            <h2>Candidate API</h2>
            <p>Retrieve the parsed data and AI matching scores for all candidates within a session.</p>
            <div className="mock-code-block">
              <pre>
<span className="code-keyword">GET</span> /sessions/<span className="code-string">&#123;session_id&#125;</span>/candidates<br/>
              </pre>
            </div>
          </section>

          {/* Section: Examples */}
          <section id="examples" className="docs-section">
            <h2>Examples</h2>
            <p>A full workflow example showing the flow from session creation to score retrieval.</p>
            <div className="mock-code-block">
              <pre>
<span className="code-comment">// 1. Create Session</span><br/>
<span className="code-keyword">const</span> session = <span className="code-keyword">await</span> <span className="code-func">createSession</span>(jobDetails);<br/><br/>
<span className="code-comment">// 2. Upload Files</span><br/>
<span className="code-keyword">await</span> <span className="code-func">uploadResumes</span>(session.id, folderFiles);<br/><br/>
<span className="code-comment">// 3. Get Ranked Results</span><br/>
<span className="code-keyword">const</span> rankings = <span className="code-keyword">await</span> <span className="code-func">getCandidates</span>(session.id, &#123; sortBy: 'match_score' &#125;);
              </pre>
            </div>
          </section>

          {/* Section: Code Snippets */}
          <section id="code-snippets" className="docs-section">
            <h2>Code Snippets</h2>
            <p>Ready to use snippets in Python for quick integration.</p>
            <div className="mock-code-block">
              <pre>
<span className="code-keyword">import</span> requests<br/><br/>
headers = &#123;<span className="code-string">'Authorization'</span>: <span className="code-string">'Bearer YOUR_KEY'</span>&#125;<br/>
response = requests.<span className="code-func">post</span>(<span className="code-string">'https://api.vishleshan.io/v1/sessions'</span>, headers=headers, json=jobData)<br/>
<span className="code-func">print</span>(response.<span className="code-func">json</span>())
              </pre>
            </div>
          </section>

        </div>
      </div>
      <Footer onNavigate={onNavigate} />
    </main>
  );
};

export default DocumentationPage;
