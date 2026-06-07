export const LANGUAGES = [
  {
    id: "javascript",
    name: "JavaScript",
    glotLang: "javascript",
    glotFile: "main.js",
    compiler: "nodejs-20.17.0",
    boilerplate: `// Practice JavaScript\nconsole.log("Hello, JavaScript!");\n\nconst greet = (name) => \`Welcome, \${name}!\`;\nconsole.log(greet("Developer"));\n`
  },
  {
    id: "python",
    name: "Python",
    glotLang: "python",
    glotFile: "main.py",
    compiler: "cpython-3.14.0",
    boilerplate: `# Practice Python\ndef greet(name):\n    return f"Welcome, {name}!"\n\nprint("Hello, Python!")\nprint(greet("Developer"))\n`
  },
  {
    id: "cpp",
    name: "C++",
    glotLang: "cpp",
    glotFile: "main.cpp",
    compiler: "gcc-13.2.0",
    boilerplate: `// Practice C++\n#include <iostream>\n#include <string>\n\nstd::string greet(std::string name) {\n    return "Welcome, " + name + "!";\n}\n\nint main() {\n    std::cout << "Hello, C++!" << std::endl;\n    std::cout << greet("Developer") << std::endl;\n    return 0;\n}\n`
  },
  {
    id: "java",
    name: "Java",
    glotLang: "java",
    glotFile: "Main.java",
    compiler: "openjdk-jdk-22+36",
    boilerplate: `// Practice Java\nclass Main {\n    public static String greet(String name) {\n        return "Welcome, " + name + "!";\n    }\n\n    public static void main(String[] args) {\n        System.out.println("Hello, Java!");\n        System.out.println(greet("Developer"));\n    }\n}\n`
  }
];

async function executeGlotCode(languageId, code, token) {
  const langConfig = LANGUAGES.find((l) => l.id === languageId);
  if (!langConfig) {
    throw new Error(`Unsupported language: ${languageId}`);
  }

  try {
    const response = await fetch(`https://corsproxy.io/?url=https://run.glot.io/languages/${langConfig.glotLang}/latest`, {
      method: "POST",
      headers: {
        "Authorization": `Token ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        files: [
          {
            name: langConfig.glotFile,
            content: code
          }
        ]
      })
    });

    if (response.status === 401) {
      return {
        stdout: "",
        stderr: "",
        error: "Unauthorized: Invalid Glot.io API Token. Please check your token settings."
      };
    }

    if (!response.ok) {
      const errorText = await response.text();
      return {
        stdout: "",
        stderr: "",
        error: `HTTP Error ${response.status}: ${errorText || response.statusText}`
      };
    }

    const data = await response.json();
    return {
      stdout: data.stdout || "",
      stderr: data.stderr || "",
      error: data.error || ""
    };
  } catch (err) {
    console.error("Glot.io compilation failed:", err);
    return {
      stdout: "",
      stderr: "",
      error: `Network error: ${err.message || "Failed to reach compilation server."}`
    };
  }
}

async function executeWandboxCode(languageId, code) {
  const langConfig = LANGUAGES.find((l) => l.id === languageId);
  if (!langConfig) {
    throw new Error(`Unsupported language: ${languageId}`);
  }

  // Wandbox compiles Java in a file named "prog.java".
  // A public class named "Main" will fail compilation because the class name must match the filename.
  // We strip "public" from "public class Main" to compile successfully.
  let finalCode = code;
  if (languageId === "java") {
    finalCode = code.replace(/\bpublic\s+class\b/g, "class");
  }

  try {
    const response = await fetch("https://corsproxy.io/?url=https://wandbox.org/api/compile.json", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        compiler: langConfig.compiler,
        code: finalCode
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        stdout: "",
        stderr: "",
        error: `HTTP Error ${response.status}: ${errorText || response.statusText}`
      };
    }

    const data = await response.json();
    return {
      stdout: data.program_output || "",
      stderr: data.program_error || "",
      error: data.compiler_error || data.compiler_message || ""
    };
  } catch (err) {
    console.error("Wandbox compilation failed:", err);
    return {
      stdout: "",
      stderr: "",
      error: `Network error: ${err.message || "Failed to reach compilation server."}`
    };
  }
}

export async function executeCode(languageId, code, token) {
  if (token && token.trim()) {
    const glotResult = await executeGlotCode(languageId, code, token.trim());

    // Check if Glot.io hit a DNS error, Cloudflare error, or network timeout/failure
    const isGlotUnavailable = 
      glotResult.error && (
        glotResult.error.includes("530") ||
        glotResult.error.includes("1016") ||
        glotResult.error.includes("DNS") ||
        glotResult.error.includes("Network error") ||
        glotResult.error.toLowerCase().includes("failed to fetch")
      );

    if (isGlotUnavailable) {
      const wandboxResult = await executeWandboxCode(languageId, code);
      const fallbackWarning = "// Note: Glot.io compiler is currently offline (DNS/Network Error). Automatically fell back to free Wandbox compiler.";
      return {
        stdout: wandboxResult.stdout,
        stderr: wandboxResult.stderr,
        error: wandboxResult.error 
          ? `${wandboxResult.error}\n\n${fallbackWarning}` 
          : fallbackWarning
      };
    }
    return glotResult;
  }
  return executeWandboxCode(languageId, code);
}
