import { useEffect, useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { 
  Terminal, 
  Check, 
  Copy, 
  Eraser, 
  Sparkles, 
  Play, 
  Trash,
  Key,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { LANGUAGES, executeCode } from "@/lib/codeRunner.service";

// Formatting helper function (Prettier-like indentation adjustment)
function formatCode(code) {
  if (!code) return "";
  const lines = code.split("\n");
  let indentLevel = 0;
  const formatted = [];

  for (let line of lines) {
    let trimmed = line.trim();

    if (trimmed.startsWith("}") || trimmed.startsWith("]")) {
      indentLevel = Math.max(0, indentLevel - 1);
    }

    const indent = "  ".repeat(indentLevel);
    formatted.push(trimmed ? indent + trimmed : "");

    if (trimmed.endsWith("{") || trimmed.endsWith("[") || 
        trimmed.endsWith("{,") || trimmed.endsWith("[,") ||
        trimmed.endsWith("{;") || trimmed.endsWith("[;")) {
      indentLevel++;
    }
  }

  return formatted.join("\n");
}

export default function PracticeScratchpad({ slug }) {
  // Localized states
  const [scratchpadCopied, setScratchpadCopied] = useState(false);
  const [scratchpadFontSize, setScratchpadFontSize] = useState(() => localStorage.getItem("scratchpad_font_size_pref") || "xs");

  // Language & Execution states
  const [selectedLanguage, setSelectedLanguage] = useState(() => {
    return localStorage.getItem(`scratchpad_lang_${slug}`) || "javascript";
  });
  
  const [scratchpadText, setScratchpadText] = useState(() => {
    const savedText = localStorage.getItem(`scratchpad_${slug}`);
    if (savedText !== null) return savedText;
    // Load default boilerplate if new
    const initialLang = localStorage.getItem(`scratchpad_lang_${slug}`) || "javascript";
    const conf = LANGUAGES.find(l => l.id === initialLang);
    return conf ? conf.boilerplate : "";
  });

  // Token configuration state (optional Glot.io execution)
  const [apiToken, setApiToken] = useState(() => {
    return localStorage.getItem("glot_token") || "";
  });
  const [showTokenInput, setShowTokenInput] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [tokenSaved, setTokenSaved] = useState(false);

  const [consoleOutputs, setConsoleOutputs] = useState(null);
  const [isRunning, setIsRunning] = useState(false);

  // Terminal resizing states
  const [consoleHeight, setConsoleHeight] = useState(() => {
    const saved = localStorage.getItem("scratchpad_console_height_pref");
    return saved ? parseInt(saved, 10) : 176;
  });
  const [isResizingConsole, setIsResizingConsole] = useState(false);
  const [showConsole, setShowConsole] = useState(() => {
    const saved = localStorage.getItem("scratchpad_show_console");
    return saved !== "false";
  });

  const consoleHeightRef = useRef(consoleHeight);
  const tokenRef = useRef(null);

  // Sync states with localStorage
  useEffect(() => {
    localStorage.setItem(`scratchpad_${slug}`, scratchpadText);
  }, [scratchpadText, slug]);

  useEffect(() => {
    localStorage.setItem("scratchpad_show_console", showConsole.toString());
  }, [showConsole]);

  useEffect(() => {
    localStorage.setItem("scratchpad_font_size_pref", scratchpadFontSize);
  }, [scratchpadFontSize]);

  useEffect(() => {
    localStorage.setItem(`scratchpad_lang_${slug}`, selectedLanguage);
  }, [selectedLanguage, slug]);

  useEffect(() => {
    localStorage.setItem("glot_token", apiToken);
  }, [apiToken]);

  useEffect(() => {
    consoleHeightRef.current = consoleHeight;
  }, [consoleHeight]);

  // Click outside listener for token popover
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (tokenRef.current && !tokenRef.current.contains(e.target)) {
        setShowTokenInput(false);
      }
    };
    if (showTokenInput) {
      document.addEventListener("mousedown", handleOutsideClick);
    }
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [showTokenInput]);

  // Console resize drag tracking
  const startResizeConsole = useCallback((e) => {
    e.preventDefault();
    setIsResizingConsole(true);
  }, []);

  useEffect(() => {
    if (!isResizingConsole) return;

    const handleMouseMove = (e) => {
      const consoleElement = document.getElementById("scratchpad-console");
      if (consoleElement) {
        const rect = consoleElement.getBoundingClientRect();
        // Console height increases as clientY moves upwards relative to bottom boundary
        const newHeight = Math.max(100, Math.min(380, rect.bottom - e.clientY));
        setConsoleHeight(newHeight);
      }
    };

    const handleMouseUp = () => {
      setIsResizingConsole(false);
      localStorage.setItem("scratchpad_console_height_pref", consoleHeightRef.current.toString());
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    document.body.style.cursor = "row-resize";
    document.body.style.userSelect = "none";

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizingConsole]);

  // Copy code to clipboard handler
  const copyScratchpad = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(scratchpadText);
      setScratchpadCopied(true);
      setTimeout(() => setScratchpadCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy scratchpad text: ", err);
    }
  }, [scratchpadText]);

  // Clear editor content handler
  const clearScratchpad = useCallback(() => {
    if (window.confirm("Are you sure you want to clear your scratchpad?")) {
      setScratchpadText("");
    }
  }, []);

  // Language change handler (loads boilerplate if empty or matching old boilerplate)
  const handleLanguageChange = (langId) => {
    setSelectedLanguage(langId);
    const currentConf = LANGUAGES.find(l => l.id === selectedLanguage);
    const currentBoilerplate = currentConf ? currentConf.boilerplate : "";
    const newConf = LANGUAGES.find(l => l.id === langId);
    const newBoilerplate = newConf ? newConf.boilerplate : "";

    if (!scratchpadText.trim() || scratchpadText.trim() === currentBoilerplate.trim()) {
      setScratchpadText(newBoilerplate);
    }
  };

  // Run Code logic using Wandbox API
  const handleRunCode = async () => {
    if (isRunning) return;
    setIsRunning(true);
    setConsoleOutputs({ status: "running", stdout: "", stderr: "", error: "" });

    try {
      const result = await executeCode(selectedLanguage, scratchpadText, apiToken);
      setConsoleOutputs(result);
    } catch (err) {
      setConsoleOutputs({
        stdout: "",
        stderr: "",
        error: err.message || "Failed to execute code."
      });
    } finally {
      setIsRunning(false);
    }
  };

  const handleClearConsole = () => {
    setConsoleOutputs(null);
  };

  // Textarea and Line numbers scrolling sync
  const textareaRef = useRef(null);
  const lineNumbersRef = useRef(null);

  const handleScroll = useCallback(() => {
    if (textareaRef.current && lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  }, []);

  // Calculate line numbers list
  const lineCount = scratchpadText.split("\n").length || 1;
  const lineNumbers = Array.from({ length: lineCount }, (_, i) => i + 1);

  const fontSizeStyle = scratchpadFontSize === "xs" ? "12px" : scratchpadFontSize === "sm" ? "14px" : "16px";
  const lineHeightStyle = "22px";

  return (
    <div className="border border-border/40 rounded-3xl overflow-hidden bg-card shadow-premium p-6 md:p-8 space-y-4 flex flex-col h-[750px] max-h-[calc(100vh-10rem)] sticky top-32 self-start z-20 animate-scale-in">
      <div className="flex items-center justify-between border-b border-border/50 pb-4 shrink-0">
        <div className="flex items-center gap-2">
          <Terminal className="h-5 w-5 text-primary animate-pulse" />
          <h3 className="font-extrabold text-lg animate-fade-in">Practice Scratchpad</h3>
        </div>
        <div className="flex gap-2">
          {/* Copy button */}
          <Button
            size="sm"
            variant="outline"
            onClick={copyScratchpad}
            className={`gap-1.5 h-8 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer ${
              scratchpadCopied ? "border-emerald-500/50 text-emerald-500 bg-emerald-500/5 hover:bg-emerald-500/5" : ""
            }`}
            title="Copy Scratchpad Content"
          >
            {scratchpadCopied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
            <span className="text-xs">{scratchpadCopied ? "Copied!" : "Copy"}</span>
          </Button>
          
          {/* Clear button */}
          <Button
            size="sm"
            variant="outline"
            onClick={clearScratchpad}
            disabled={!scratchpadText}
            className="gap-1.5 h-8 text-muted-foreground hover:text-destructive hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
            title="Clear Scratchpad Content"
          >
            <Eraser className="h-3.5 w-3.5" />
            <span className="text-xs">Clear</span>
          </Button>
        </div>
      </div>

      {/* Editor Toolbar (Language selector, Font size, & Format controls) */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-muted/20 p-2 rounded-2xl border border-border/40 text-[11px] shrink-0">
        {/* Left Side: Configuration Options */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Custom styled Language select dropdown */}
          <div className="relative flex items-center shrink-0">
            <select
              value={selectedLanguage}
              onChange={(e) => handleLanguageChange(e.target.value)}
              className="appearance-none bg-card border border-border/50 text-[10px] font-bold uppercase rounded-xl pl-3 pr-8 h-8 outline-none focus:ring-1 focus:ring-primary text-foreground cursor-pointer shadow-sm transition-all"
            >
              {LANGUAGES.map((lang) => (
                <option key={lang.id} value={lang.id}>
                  {lang.name}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          </div>

          {/* Font size switcher */}
          <div className="flex gap-1 bg-card border border-border/50 rounded-xl p-0.5 select-none shrink-0 h-8 items-center">
            {["xs", "sm", "base"].map((sz) => (
              <button
                key={sz}
                onClick={() => setScratchpadFontSize(sz)}
                className={`px-2.5 h-full text-[10px] font-bold rounded-lg uppercase transition-all cursor-pointer flex items-center justify-center ${
                  scratchpadFontSize === sz
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                title={`Font Size: ${sz === "xs" ? "12px" : sz === "sm" ? "14px" : "16px"}`}
              >
                {sz}
              </button>
            ))}
          </div>
        </div>

        {/* Right Side: Execution Controls */}
        <div className="flex items-center gap-2 flex-wrap ml-auto lg:ml-0">
          {/* Format button */}
          <Button
            size="sm"
            variant="outline"
            onClick={() => setScratchpadText(formatCode(scratchpadText))}
            className="gap-1.5 h-8 text-xs font-semibold px-3 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer bg-card border border-border/50 shrink-0"
            title="Format Code"
          >
            <Sparkles className="h-3.5 w-3.5 text-amber-500" />
            <span>Format</span>
          </Button>

          {/* Token Config button popover */}
          <div className="relative" ref={tokenRef}>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowTokenInput(!showTokenInput)}
              className={`gap-1.5 h-8 text-xs font-semibold px-3 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer bg-card border shrink-0 ${
                showTokenInput ? "border-primary text-primary bg-primary/5" : "border-border/50"
              }`}
              title="Configure Glot.io API Token"
            >
              <Key className="h-3.5 w-3.5 text-primary" />
              <span>Token</span>
            </Button>
            
            {showTokenInput && (
              <div className="absolute right-0 top-full mt-2 w-72 p-4 rounded-2xl border border-border/50 bg-card shadow-xl z-50 animate-scale-in text-foreground">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase tracking-wider font-extrabold text-muted-foreground">Glot.io API Token</span>
                    <button 
                      onClick={() => {
                        setShowTokenInput(false);
                        setTokenSaved(false);
                      }}
                      className="text-muted-foreground hover:text-foreground text-[10px] font-bold cursor-pointer"
                    >
                      Close
                    </button>
                  </div>
                  
                  <div className="text-[11px] text-muted-foreground leading-relaxed">
                    By default, the scratchpad runs code for free on <strong>Wandbox</strong>. To compile via <strong>Glot.io</strong> instead, paste your token below:
                  </div>

                  <div className="flex gap-2 items-center">
                    <div className="relative flex-1">
                      <input
                        type={showToken ? "text" : "password"}
                        value={apiToken}
                        onChange={(e) => {
                          setApiToken(e.target.value);
                          setTokenSaved(false);
                        }}
                        placeholder="Optional API Token..."
                        className="w-full bg-muted/40 border border-border/50 text-xs rounded-xl pl-3 pr-8 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
                      />
                      <button
                        type="button"
                        onClick={() => setShowToken(!showToken)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                      >
                        {showToken ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                    <button
                      onClick={() => {
                        localStorage.setItem("glot_token", apiToken);
                        setTokenSaved(true);
                        setTimeout(() => {
                          setShowTokenInput(false);
                          setTokenSaved(false);
                        }, 1000);
                      }}
                      className="bg-primary text-primary-foreground text-xs font-semibold px-3 py-1.5 rounded-xl hover:opacity-90 active:scale-[0.98] transition-all cursor-pointer flex items-center gap-1"
                    >
                      {tokenSaved ? <Check className="h-3.5 w-3.5" /> : null}
                      {tokenSaved ? "Saved" : "Save"}
                    </button>
                  </div>

                  <div className="text-[10px] text-primary pt-1 border-t border-border/20">
                    <a 
                      href="https://glot.io/account/token" 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="hover:underline flex items-center gap-1 font-bold"
                    >
                      Visit Glot.io Account Settings ↗
                    </a>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Run Code button */}
          <Button
            size="sm"
            onClick={handleRunCode}
            disabled={isRunning || !scratchpadText}
            className={`gap-1.5 h-8 text-xs font-bold px-4 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer shrink-0 ${
              isRunning ? "bg-muted text-muted-foreground" : "bg-emerald-600 hover:bg-emerald-500 text-white"
            }`}
            title="Execute Code on Wandbox/Glot.io"
          >
            <Play className={`h-3.5 w-3.5 text-white ${isRunning ? "animate-spin" : ""}`} />
            <span>{isRunning ? "Running..." : "Run"}</span>
          </Button>
        </div>
      </div>
      
      {/* Code Editor Container */}
      <div className="flex-1 flex overflow-hidden rounded-2xl bg-muted/30 border border-border/60 relative min-h-[160px]">
        {/* Line numbers display */}
        <div 
          ref={lineNumbersRef}
          className="w-10 text-right pr-2 select-none text-muted-foreground/30 font-mono py-4 overflow-hidden border-r border-border/10 bg-muted/10 shrink-0 text-xs"
          style={{ fontSize: fontSizeStyle, lineHeight: lineHeightStyle }}
        >
          {lineNumbers.map((num) => (
            <div key={num} style={{ height: lineHeightStyle }}>
              {num}
            </div>
          ))}
        </div>

        {/* Editor input textarea */}
        <textarea
          ref={textareaRef}
          value={scratchpadText}
          onChange={(e) => setScratchpadText(e.target.value)}
          onScroll={handleScroll}
          placeholder="// Paste some code from the note here to practice, edit, or modify..."
          wrap="off"
          className="flex-1 p-4 pl-3 bg-transparent font-mono resize-none focus:outline-none placeholder:text-muted-foreground/30 text-foreground overflow-auto overscroll-contain"
          style={{ fontSize: fontSizeStyle, lineHeight: lineHeightStyle }}
        />
      </div>

      {/* Console Output Terminal */}
      <div 
        id="scratchpad-console"
        style={{ height: showConsole ? `${consoleHeight}px` : "36px" }}
        className="border border-border/40 rounded-2xl overflow-hidden bg-[#07070c] flex flex-col shrink-0 relative pt-1.5 transition-all duration-150 ease-in-out"
      >
        {/* Resize handle for console panel */}
        {showConsole && (
          <div
            onMouseDown={startResizeConsole}
            className="h-1.5 w-full cursor-row-resize absolute top-0 left-0 hover:bg-primary/30 active:bg-primary/50 transition-all z-30"
            title="Drag to resize console"
          />
        )}

        <div className="flex items-center justify-between border-b border-border/30 bg-[#0d0d16] px-4 py-1.5 shrink-0 select-none h-8">
          <span className="text-[10px] uppercase tracking-wider font-extrabold text-muted-foreground flex items-center gap-1.5">
            <span className={`h-2 w-2 rounded-full ${isRunning ? "bg-amber-500 animate-pulse" : consoleOutputs ? "bg-emerald-500" : "bg-muted-foreground/40"}`} />
            Console Output
          </span>
          <div className="flex items-center gap-2">
            {consoleOutputs && showConsole && (
              <button
                onClick={handleClearConsole}
                className="text-[10px] text-muted-foreground hover:text-rose-400 font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                title="Clear Console Output"
              >
                <Trash className="h-3 w-3" />
                Clear
              </button>
            )}
            <button
              onClick={() => setShowConsole(!showConsole)}
              className="text-muted-foreground hover:text-foreground p-0.5 rounded hover:bg-muted/30 transition-all cursor-pointer"
              title={showConsole ? "Collapse Console" : "Expand Console"}
            >
              {showConsole ? (
                <ChevronDown className="h-3.5 w-3.5" />
              ) : (
                <ChevronUp className="h-3.5 w-3.5" />
              )}
            </button>
          </div>
        </div>

        {showConsole && (
          <div className="flex-1 p-4 overflow-auto font-mono text-xs space-y-1 scrollbar-thin overscroll-contain">
            {isRunning ? (
              <div className="text-amber-500/70 animate-pulse">// Compiling and executing code on sandboxed server...</div>
            ) : !consoleOutputs ? (
              <div className="text-muted-foreground/30 font-sans italic select-none">// Output will appear here after clicking "Run"...</div>
            ) : (
              <>
                {consoleOutputs.stdout && (
                  <pre className="text-emerald-400 whitespace-pre-wrap">{consoleOutputs.stdout}</pre>
                )}
                {consoleOutputs.stderr && (
                  <pre className="text-rose-400 whitespace-pre-wrap">{consoleOutputs.stderr}</pre>
                )}
                {consoleOutputs.error && (
                  <pre className="text-amber-400 whitespace-pre-wrap font-bold">{consoleOutputs.error}</pre>
                )}
                {!consoleOutputs.stdout && !consoleOutputs.stderr && !consoleOutputs.error && (
                  <div className="text-muted-foreground/50 italic">// Code executed successfully with no output.</div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
